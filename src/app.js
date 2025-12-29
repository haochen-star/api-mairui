const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/test');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');

// 连接数据库
connectDB();

// 创建 Express 应用
const app = express();

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json({ limit: '10mb' })); // 解析 JSON 请求体，增加大小限制到 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // 解析 URL 编码的请求体，增加大小限制到 10MB

// 路由配置
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/product', productRoutes);
app.use('/api/user', userRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '蜉蝣后端 API 服务运行中',
    version: '1.0.0'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;

