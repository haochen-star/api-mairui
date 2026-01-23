const mongoose = require('mongoose');
const path = require('path');

// 如果指定了 ENV_FILE 环境变量，使用它；否则使用默认的 .env（项目根目录）
const envPath = process.env.ENV_FILE || path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

/**
 * 连接 MongoDB 数据库
 * 使用环境变量 MONGODB_URI 进行配置
 */
const connectDB = async () => {
  try {
    // 检查环境变量是否配置
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI 环境变量未配置，请在 .env 文件中设置');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
    console.log(`数据库名称: ${conn.connection.name}`);
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    console.error('请检查 .env 文件中的 MONGODB_URI 配置是否正确');
    process.exit(1);
  }
};

module.exports = connectDB;

