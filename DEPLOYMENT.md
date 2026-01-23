# 部署说明文档

## 目录结构

线上服务器目录结构：
```
/var/www/backend-api/
├── .env                    # 共享的环境变量文件（所有版本共用）
├── v1/                     # 版本 1 目录
│   └── api-mairui/
├── v2/                     # 版本 2 目录
│   └── api-mairui/
└── current/                # 当前运行版本（软链接指向 v1 或 v2）
    └── api-mairui/
```

日志目录结构：
```
/var/log/pm2/api-mairui/
├── v1/                     # 版本 1 的日志
│   ├── pm2-error.log
│   └── pm2-out.log
├── v2/                     # 版本 2 的日志
│   ├── pm2-error.log
│   └── pm2-out.log
└── current/                # current 版本的日志
    ├── pm2-error.log
    └── pm2-out.log
```

## 环境变量管理

### 统一 .env 文件

所有版本共享同一个 `.env` 文件，位于 `/var/www/backend-api/.env`。

**优点：**
- 环境变量统一管理，无需在每个版本目录中维护
- 切换版本时不会丢失配置
- 修改配置只需更新一个文件

**配置步骤：**

1. 在服务器上创建共享的 `.env` 文件：
```bash
cd /var/www/backend-api
touch .env
chmod 600 .env  # 设置权限，仅所有者可读写
```

2. 编辑 `.env` 文件，添加所有必要的环境变量：
```bash
# MongoDB 配置
MONGODB_URI=mongodb://haochen-star:sun28500869@127.0.0.1:27017/fuyou_test?authSource=admin

# JWT 配置
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# 服务器配置
PORT=3000
NODE_ENV=production
```

3. PM2 会自动从 `/var/www/backend-api/.env` 读取环境变量（通过 `ENV_FILE` 环境变量指定）

## PM2 日志管理

### 日志目录结构

日志使用绝对路径存储，按版本分目录：
- 版本 1：`/var/log/pm2/api-mairui/v1/`
- 版本 2：`/var/log/pm2/api-mairui/v2/`
- current：`/var/log/pm2/api-mairui/current/`

**优点：**
- 切换版本时日志不会丢失
- 每个版本的日志独立存储，便于排查问题
- 日志路径固定，不会因为工作目录变化而改变

### 初始化日志目录

在首次部署时，创建日志目录：

```bash
sudo mkdir -p /var/log/pm2/api-mairui/{v1,v2,current}
sudo chown -R $USER:$USER /var/log/pm2/api-mairui
sudo chmod -R 755 /var/log/pm2/api-mairui
```

## 版本切换流程

### 1. 部署新版本

```bash
# 假设要部署到 v2
cd /var/www/backend-api/v2/api-mairui

# 拉取最新代码
git pull origin main

# 安装依赖（如果需要）
npm install --production

# 重启 PM2（会自动使用新的代码和共享的 .env）
pm2 restart ecosystem.config.js
```

### 2. 切换当前版本

```bash
cd /var/www/backend-api

# 将 current 软链接指向新版本
rm current
ln -s v2 current

# 重启 PM2（会使用 current 目录的代码）
cd current/api-mairui
pm2 restart ecosystem.config.js
```

### 3. 回滚到旧版本

```bash
cd /var/www/backend-api

# 将 current 软链接指向旧版本
rm current
ln -s v1 current

# 重启 PM2
cd current/api-mairui
pm2 restart ecosystem.config.js
```

## MongoDB 数据导入

### 使用导入脚本

1. 将备份数据放在服务器上（例如：`~/mongo_backup/fuyou_test`）

2. 运行导入脚本：
```bash
cd /var/www/backend-api/current/api-mairui
chmod +x scripts/import-mongo-backup.sh
./scripts/import-mongo-backup.sh
```

3. 或者手动导入：
```bash
# 复制备份到容器
docker cp ~/mongo_backup/fuyou_test mongodb:/tmp/backup

# 导入数据
docker exec mongodb mongorestore \
  --uri="mongodb://haochen-star:sun28500869@127.0.0.1:27017/fuyou_test?authSource=admin" \
  --drop \
  /tmp/backup/fuyou_test

# 清理临时文件
docker exec mongodb rm -rf /tmp/backup
```

### 环境变量配置

可以通过环境变量自定义导入参数：

```bash
export MONGODB_CONTAINER=mongodb
export BACKUP_DIR=~/mongo_backup/fuyou_test
export MONGODB_URI="mongodb://user:pass@127.0.0.1:27017/dbname?authSource=admin"
export DATABASE_NAME=fuyou_test

./scripts/import-mongo-backup.sh
```

## PM2 常用命令

```bash
# 启动服务
pm2 start ecosystem.config.js

# 重启服务
pm2 restart ecosystem.config.js

# 停止服务
pm2 stop ecosystem.config.js

# 查看服务状态
pm2 status

# 查看日志
pm2 logs api-mairui

# 查看错误日志
tail -f /var/log/pm2/api-mairui/current/pm2-error.log

# 查看输出日志
tail -f /var/log/pm2/api-mairui/current/pm2-out.log

# 查看所有日志（按版本）
pm2 logs --lines 100
```

## 故障排查

### 问题1：PM2 无法读取 .env 文件

**症状：** 应用启动失败，提示环境变量未配置

**解决方案：**
1. 检查 `/var/www/backend-api/.env` 文件是否存在
2. 检查文件权限：`ls -la /var/www/backend-api/.env`
3. 确认 `ENV_FILE` 环境变量正确设置

### 问题2：日志文件无法写入

**症状：** PM2 启动失败，提示日志文件无法创建

**解决方案：**
```bash
# 创建日志目录
sudo mkdir -p /var/log/pm2/api-mairui/{v1,v2,current}

# 设置权限
sudo chown -R $USER:$USER /var/log/pm2/api-mairui
sudo chmod -R 755 /var/log/pm2/api-mairui
```

### 问题3：切换版本后环境变量丢失

**症状：** 切换版本后应用无法连接数据库

**解决方案：**
1. 确认 `/var/www/backend-api/.env` 文件存在且内容正确
2. 检查 `ecosystem.config.js` 中的 `ENV_FILE` 配置
3. 重启 PM2：`pm2 restart ecosystem.config.js`

### 问题4：MongoDB 数据导入失败

**症状：** 导入脚本执行失败

**解决方案：**
1. 检查 MongoDB 容器是否运行：`docker ps | grep mongodb`
2. 检查备份数据目录是否存在
3. 检查 MongoDB 连接字符串是否正确
4. 查看容器日志：`docker logs mongodb`

## 最佳实践

1. **环境变量管理**
   - 始终使用 `/var/www/backend-api/.env` 作为唯一的环境变量源
   - 不要在每个版本目录中创建 `.env` 文件
   - 定期备份 `.env` 文件

2. **版本管理**
   - 使用 `v1`, `v2` 等目录存储不同版本
   - 使用 `current` 软链接指向当前运行版本
   - 保留至少一个旧版本以便快速回滚

3. **日志管理**
   - 定期清理旧日志文件
   - 使用日志轮转工具（如 `logrotate`）管理日志大小
   - 保留最近 7-30 天的日志用于排查问题

4. **数据备份**
   - 定期备份 MongoDB 数据
   - 备份文件命名包含日期：`fuyou_test_20240101`
   - 测试备份恢复流程确保备份可用

