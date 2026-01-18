#!/bin/bash

# 验证数据迁移脚本
# 使用方法: ./verify.sh

echo "=========================================="
echo "产品类型重构 - 验证脚本"
echo "=========================================="
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在 api-mairui 目录下运行此脚本"
    exit 1
fi

# 运行验证脚本
echo "运行数据迁移验证..."
node scripts/verify-migration.js

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ 验证完成！"
    echo "=========================================="
    echo ""
    echo "请手动验证以下功能："
    echo "1. Admin - 产品类型管理 CRUD"
    echo "2. Admin - 产品创建/编辑（使用 id）"
    echo "3. Admin - 批量上传（自动识别返回 id）"
    echo "4. Site - 产品列表和筛选"
    echo ""
    exit 0
else
    echo ""
    echo "=========================================="
    echo "✗ 验证失败！"
    echo "=========================================="
    exit 1
fi

