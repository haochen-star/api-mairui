# 连接问题排查指南

## 问题：API 服务连接线上服务器（MongoDB Atlas）失败

### 常见原因

1. **IP 白名单问题**（最常见）
   - 本地 IP 地址变化，不在 MongoDB Atlas 白名单中
   - 防火墙阻止连接

2. **网络连接问题**
   - 网络不稳定
   - DNS 解析失败

3. **配置问题**
   - 环境变量配置错误
   - 连接字符串格式错误

## 排查步骤

### 步骤 1: 运行诊断脚本

```bash
cd api-mairui
node scripts/check-connection.js
```

这个脚本会：
- 检查环境变量配置
- 显示当前公网 IP
- 测试 MongoDB 连接
- 提供详细的错误信息和建议

### 步骤 2: 检查当前 IP 地址

**方法 1: 使用诊断脚本（推荐）**
```bash
node scripts/check-connection.js
```

**方法 2: 手动查看**
访问以下任一网站查看你的公网 IP：
- https://www.ipify.org
- https://ipinfo.io
- https://whatismyipaddress.com

### 步骤 3: 更新 MongoDB Atlas IP 白名单

1. **登录 MongoDB Atlas**
   - 访问 https://cloud.mongodb.com
   - 登录你的账户

2. **进入 Network Access 页面**
   - 点击左侧菜单的 "Network Access"
   - 或直接访问：https://cloud.mongodb.com/v2#/security/network/list

3. **添加 IP 地址**
   - 点击 "Add IP Address" 按钮
   - 选择以下方式之一：
     - **添加当前 IP**：点击 "Add Current IP Address"（推荐）
     - **手动添加**：输入你的公网 IP 地址
     - **允许所有 IP**：输入 `0.0.0.0/0`（仅用于开发环境，生产环境不推荐）

4. **保存更改**
   - 点击 "Confirm" 保存
   - 等待几分钟让更改生效

### 步骤 4: 验证连接

运行诊断脚本验证连接是否成功：

```bash
node scripts/check-connection.js
```

如果连接成功，你会看到：
```
✅ MongoDB 连接成功！
   服务器地址: cluster0.xxxxx.mongodb.net
   数据库名称: your_database_name
```

## 常见错误及解决方案

### 错误 1: "MongoServerError: IP not whitelisted"

**原因**: IP 地址不在白名单中

**解决方案**:
1. 获取当前公网 IP（使用诊断脚本或访问 ipify.org）
2. 在 MongoDB Atlas 的 Network Access 中添加该 IP
3. 等待 1-2 分钟让更改生效
4. 重新运行 API 服务

### 错误 2: "MongoServerError: Authentication failed"

**原因**: 用户名或密码错误

**解决方案**:
1. 检查 `.env` 文件中的 `MONGODB_URI`
2. 确认用户名和密码正确
3. 如果忘记密码，在 MongoDB Atlas 中重置数据库用户密码

### 错误 3: "getaddrinfo ENOTFOUND" 或连接超时

**原因**: 网络问题或服务器地址错误

**解决方案**:
1. 检查网络连接
2. 确认 MongoDB Atlas 集群地址正确
3. 检查防火墙设置
4. 尝试使用 VPN 或更换网络

### 错误 4: "MONGODB_URI 环境变量未配置"

**原因**: `.env` 文件不存在或配置缺失

**解决方案**:
1. 确认 `api-mairui` 目录下有 `.env` 文件
2. 检查 `.env` 文件中是否有 `MONGODB_URI` 配置
3. 参考 `.env.example` 文件创建正确的配置

## 快速修复：允许所有 IP（仅开发环境）

如果频繁更换网络环境，可以临时允许所有 IP 访问：

1. 登录 MongoDB Atlas
2. 进入 Network Access
3. 点击 "Add IP Address"
4. 输入 `0.0.0.0/0`
5. 添加注释 "Allow all IPs for development"
6. 点击 "Confirm"

**⚠️ 警告**: 生产环境请勿使用此设置，存在安全风险！

## 预防措施

1. **使用固定 IP 或 VPN**
   - 如果可能，使用固定 IP 地址
   - 或使用 VPN 服务保持 IP 稳定

2. **定期检查 IP 白名单**
   - 如果 IP 经常变化，考虑使用 `0.0.0.0/0`（仅开发环境）

3. **使用环境变量管理配置**
   - 确保 `.env` 文件正确配置
   - 不要将 `.env` 文件提交到 Git

4. **监控连接状态**
   - 定期运行诊断脚本检查连接
   - 设置日志记录连接错误

## 获取帮助

如果以上方法都无法解决问题：

1. 检查 MongoDB Atlas 服务状态：https://status.mongodb.com/
2. 查看 MongoDB Atlas 文档：https://docs.atlas.mongodb.com/
3. 联系 MongoDB Atlas 支持

