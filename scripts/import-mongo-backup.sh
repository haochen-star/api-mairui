#!/bin/bash

# ========================
# MongoDB 备份数据导入脚本
# ========================
# 用途：将服务器上的 MongoDB 备份数据导入到 Docker 容器中
# 使用方法：./import-mongo-backup.sh

# ========================
# 配置参数
# ========================
MONGODB_CONTAINER="${MONGODB_CONTAINER:-mongodb}"  # MongoDB 容器名称
BACKUP_DIR="${BACKUP_DIR:-~/mongo_backup/fuyou_test}"  # 备份数据目录
MONGODB_URI="${MONGODB_URI:-mongodb://haochen-star:sun28500869@127.0.0.1:27017/fuyou_test?authSource=admin}"  # MongoDB 连接字符串
DATABASE_NAME="${DATABASE_NAME:-fuyou_test}"  # 数据库名称

# ========================
# 颜色输出
# ========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================
# 检查函数
# ========================
check_docker_container() {
  echo -e "${YELLOW}🔍 检查 Docker 容器...${NC}"
  if ! docker ps | grep -q "$MONGODB_CONTAINER"; then
    echo -e "${RED}❌ MongoDB 容器 '$MONGODB_CONTAINER' 未运行${NC}"
    echo -e "${YELLOW}提示：请先启动 MongoDB 容器${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ MongoDB 容器运行中${NC}"
}

check_backup_dir() {
  echo -e "${YELLOW}🔍 检查备份数据目录...${NC}"
  if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ 备份目录不存在：$BACKUP_DIR${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ 备份目录存在：$BACKUP_DIR${NC}"
  
  # 检查备份格式
  if [ -f "$BACKUP_DIR/metadata.json" ] || [ -n "$(find "$BACKUP_DIR" -name "*.bson" 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ 检测到 mongodump 格式备份（.bson 文件）${NC}"
    BACKUP_FORMAT="mongodump"
  elif [ -n "$(find "$BACKUP_DIR" -name "*.json" 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ 检测到 JSON 格式备份${NC}"
    BACKUP_FORMAT="json"
  else
    echo -e "${YELLOW}⚠️  无法确定备份格式，将尝试 mongodump 格式${NC}"
    BACKUP_FORMAT="mongodump"
  fi
}

# ========================
# 导入函数
# ========================
import_mongodump() {
  echo -e "${YELLOW}📦 开始导入 mongodump 格式备份...${NC}"
  
  # 将备份目录复制到容器内
  echo -e "${YELLOW}📤 复制备份数据到容器...${NC}"
  docker cp "$BACKUP_DIR" "$MONGODB_CONTAINER:/tmp/mongo_backup"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 复制备份数据失败${NC}"
    exit 1
  fi
  
  # 使用 mongorestore 导入
  echo -e "${YELLOW}🔄 正在导入数据...${NC}"
  docker exec "$MONGODB_CONTAINER" mongorestore \
    --uri="$MONGODB_URI" \
    --drop \
    /tmp/mongo_backup/$(basename "$BACKUP_DIR")
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据导入成功${NC}"
    
    # 清理容器内的临时文件
    echo -e "${YELLOW}🧹 清理临时文件...${NC}"
    docker exec "$MONGODB_CONTAINER" rm -rf /tmp/mongo_backup
    
    # 验证导入结果
    echo -e "${YELLOW}🔍 验证导入结果...${NC}"
    docker exec "$MONGODB_CONTAINER" mongosh "$MONGODB_URI" --eval "db.getCollectionNames()"
  else
    echo -e "${RED}❌ 数据导入失败${NC}"
    exit 1
  fi
}

import_json() {
  echo -e "${YELLOW}📦 开始导入 JSON 格式备份...${NC}"
  echo -e "${YELLOW}⚠️  JSON 格式需要逐个集合导入${NC}"
  
  # 将备份目录复制到容器内
  echo -e "${YELLOW}📤 复制备份数据到容器...${NC}"
  docker cp "$BACKUP_DIR" "$MONGODB_CONTAINER:/tmp/mongo_backup"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 复制备份数据失败${NC}"
    exit 1
  fi
  
  # 查找所有 JSON 文件并导入
  echo -e "${YELLOW}🔄 正在导入数据...${NC}"
  for json_file in "$BACKUP_DIR"/*.json; do
    if [ -f "$json_file" ]; then
      collection_name=$(basename "$json_file" .json)
      echo -e "${YELLOW}  导入集合: $collection_name${NC}"
      
      docker exec "$MONGODB_CONTAINER" mongoimport \
        --uri="$MONGODB_URI" \
        --collection="$collection_name" \
        --file="/tmp/mongo_backup/$(basename "$json_file")" \
        --drop
      
      if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 导入集合 $collection_name 失败${NC}"
      else
        echo -e "${GREEN}✅ 导入集合 $collection_name 成功${NC}"
      fi
    fi
  done
  
  # 清理容器内的临时文件
  echo -e "${YELLOW}🧹 清理临时文件...${NC}"
  docker exec "$MONGODB_CONTAINER" rm -rf /tmp/mongo_backup
  
  echo -e "${GREEN}✅ JSON 数据导入完成${NC}"
}

# ========================
# 主流程
# ========================
main() {
  echo "==============================="
  echo "🚀 MongoDB 备份数据导入工具"
  echo "==============================="
  echo ""
  echo "配置信息："
  echo "  - 容器名称: $MONGODB_CONTAINER"
  echo "  - 备份目录: $BACKUP_DIR"
  echo "  - 数据库名称: $DATABASE_NAME"
  echo ""
  
  # 安全确认
  read -p "确认要导入备份数据吗？这将覆盖现有数据！(输入 'yes' 继续): " confirm
  if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}❌ 操作已取消${NC}"
    exit 0
  fi
  
  echo ""
  
  # 执行检查
  check_docker_container
  check_backup_dir
  
  echo ""
  echo "==============================="
  echo "📥 开始导入数据"
  echo "==============================="
  
  # 根据备份格式选择导入方法
  if [ "$BACKUP_FORMAT" = "mongodump" ]; then
    import_mongodump
  else
    import_json
  fi
  
  echo ""
  echo "==============================="
  echo "🎉 导入完成"
  echo "==============================="
}

# 运行主流程
main

