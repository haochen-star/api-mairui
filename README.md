# api-fuyou

蜉蝣后端 API 服务

基于 Express 框架搭建的后端架构，使用 MongoDB Atlas 作为数据库，JWT 进行身份认证。

## 技术栈

- **框架**: Express.js
- **数据库**: MongoDB (Atlas)
- **ORM**: Mongoose
- **认证**: JWT (JSON Web Token)
- **密码加密**: bcryptjs

## 项目结构

```
api-fuyou/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB 连接配置
│   ├── models/
│   │   └── User.js              # 用户模型
│   ├── routes/
│   │   └── auth.js              # 认证路由
│   ├── controllers/
│   │   └── authController.js    # 认证控制器
│   ├── utils/
│   │   └── jwt.js               # JWT 工具函数
│   └── app.js                   # Express 应用入口
├── .env                         # 环境变量文件
├── .env.example                 # 环境变量示例
├── .gitignore                   # Git 忽略文件
├── package.json                 # 项目依赖配置
└── README.md                    # 项目说明
```

## 安装步骤

1. 克隆项目（如果适用）
```bash
git clone <repository-url>
cd api-fuyou
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的配置
```

**环境变量配置说明：**

- **MONGODB_URI**（必填）：MongoDB 连接字符串
  - MongoDB Atlas 格式：`mongodb+srv://用户名:密码@集群地址/数据库名?retryWrites=true&w=majority`
  - 本地 MongoDB 格式：`mongodb://localhost:27017/数据库名`
  - 示例：`mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/fuyou_db?retryWrites=true&w=majority`

- **JWT_SECRET**（必填）：JWT 签名密钥
  - 生产环境请使用强随机字符串
  - 可以使用 Node.js 生成：`require('crypto').randomBytes(64).toString('hex')`

- **PORT**（可选）：服务器端口，默认 3000

- **JWT_EXPIRE**（可选）：JWT 过期时间，默认 7d（7天）

4. 启动服务器
```bash
# 开发模式（使用 nodemon 自动重启）
npm run dev

# 生产模式
npm start
```

## API 接口

### 测试接口

**GET** `/api/test`

基础测试接口，用于学习和测试 API 功能。

请求示例：
```bash
# 基础请求
GET http://localhost:3000/api/test

# 带查询参数
GET http://localhost:3000/api/test?name=张三&age=20
```

响应示例：
```json
{
  "success": true,
  "message": "测试接口调用成功！",
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "method": "GET",
    "path": "/api/test",
    "queryParams": {
      "name": "张三",
      "age": "20"
    },
    "headers": {
      "user-agent": "...",
      "content-type": "application/json"
    },
    "info": "这是一个测试接口，用于学习和测试 API 功能"
  }
}
```

**GET** `/api/test/:id`

带路径参数的测试接口。

请求示例：
```bash
GET http://localhost:3000/api/test/123
GET http://localhost:3000/api/test/user-001
```

响应示例：
```json
{
  "success": true,
  "message": "带参数的测试接口调用成功！",
  "data": {
    "id": "123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/test/123",
    "info": "这个接口演示了如何从 URL 路径中获取参数"
  }
}
```

### 登录接口

**POST** `/api/auth/login`

请求体：
```json
{
  "username": "用户名",  // 或使用 email
  "email": "user@example.com",  // 或使用 username
  "password": "密码"
}
```

响应示例：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "username": "用户名",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

错误响应：
```json
{
  "success": false,
  "message": "用户名/邮箱或密码错误"
}
```

## 环境变量说明

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| MONGODB_URI | MongoDB 连接字符串（支持 Atlas 和本地） | 是 | - |
| JWT_SECRET | JWT 签名密钥 | 是 | - |
| JWT_EXPIRE | JWT 过期时间 | 否 | 7d |
| PORT | 服务器端口 | 否 | 3000 |
| NODE_ENV | 运行环境 | 否 | development |

**MongoDB 连接字符串格式：**
- **MongoDB Atlas**：`mongodb+srv://用户名:密码@集群地址/数据库名?retryWrites=true&w=majority`
- **本地 MongoDB**：`mongodb://localhost:27017/数据库名`
- 所有配置都通过 `.env` 文件中的 `MONGODB_URI` 环境变量进行管理

## 开发说明

- 登录接口支持使用用户名或邮箱进行登录
- 密码使用 bcryptjs 进行加密存储
- JWT token 默认有效期为 7 天
- 后续接口可以继续添加到 `src/routes/` 目录下

## 许可证

ISC
