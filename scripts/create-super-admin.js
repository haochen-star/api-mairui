const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

/**
 * 创建超级管理员脚本
 * 使用方法：node scripts/create-super-admin.js
 */

async function createSuperAdmin() {
  try {
    // 检查环境变量
    if (!process.env.MONGODB_URI) {
      console.error('错误: MONGODB_URI 环境变量未配置');
      console.error('请在 .env 文件中设置 MONGODB_URI');
      process.exit(1);
    }

    // 连接数据库
    console.log('正在连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('数据库连接成功！');
    console.log(`数据库名称: ${mongoose.connection.name}`);

    // 从命令行参数或环境变量获取用户信息
    const args = process.argv.slice(2);
    let username, email, password;

    if (args.length >= 3) {
      // 从命令行参数获取
      username = args[0];
      email = args[1];
      password = args[2];
    } else {
      // 从环境变量获取（如果设置了）
      username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
      email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
      password = process.env.SUPER_ADMIN_PASSWORD;

      if (!password) {
        console.error('错误: 未提供密码');
        console.error('');
        console.error('使用方法:');
        console.error('  方式1: node scripts/create-super-admin.js <username> <email> <password>');
        console.error('  方式2: 在 .env 文件中设置 SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD');
        console.error('');
        console.error('示例:');
        console.error('  node scripts/create-super-admin.js admin admin@fuyou.com MySecurePass123');
        process.exit(1);
      }
    }

    // 验证输入
    if (username.length < 3 || username.length > 20) {
      console.error('错误: 用户名长度必须在 3-20 个字符之间');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('错误: 密码长度至少需要 6 个字符');
      process.exit(1);
    }

    // 检查用户名或邮箱是否已存在
    const existingUser = await User.findOne({
      $or: [
        { username: username },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      console.error('错误: 用户名或邮箱已存在');
      console.error(`  用户名: ${existingUser.username}`);
      console.error(`  邮箱: ${existingUser.email}`);
      console.error(`  角色: ${existingUser.role}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // 创建超级管理员
    console.log('\n正在创建超级管理员...');
    console.log(`  用户名: ${username}`);
    console.log(`  邮箱: ${email}`);
    console.log(`  角色: super_admin`);

    const superAdmin = new User({
      username: username,
      email: email.toLowerCase(),
      password: password, // 密码会自动加密（通过 User 模型的 pre-save hook）
      role: 'super_admin'
    });

    const savedUser = await superAdmin.save();

    console.log('\n✅ 超级管理员创建成功！');
    console.log('\n用户信息:');
    console.log(`  ID: ${savedUser.id}`);
    console.log(`  用户名: ${savedUser.username}`);
    console.log(`  邮箱: ${savedUser.email}`);
    console.log(`  角色: ${savedUser.role}`);
    console.log(`  创建时间: ${savedUser.createdAt}`);

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 创建超级管理员失败:');
    console.error(error.message);

    // 处理特定错误
    if (error.name === 'ValidationError') {
      console.error('\n验证错误:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}: ${error.errors[key].message}`);
      });
    } else if (error.code === 11000) {
      console.error('\n唯一性约束错误: 用户名或邮箱已存在');
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// 运行脚本
createSuperAdmin();

