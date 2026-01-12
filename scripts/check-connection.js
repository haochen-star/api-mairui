/**
 * 连接诊断脚本
 * 用于排查 MongoDB 连接问题
 */

const mongoose = require('mongoose');
require('dotenv').config();
const https = require('https');
const http = require('http');

// 获取当前公网 IP
function getPublicIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.ip);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 测试 MongoDB 连接
async function testMongoConnection() {
  console.log('\n=== MongoDB 连接诊断 ===\n');
  
  // 1. 检查环境变量
  console.log('1. 检查环境变量配置...');
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI 未配置！');
    console.log('   请在 .env 文件中设置 MONGODB_URI');
    return;
  }
  console.log('✅ MONGODB_URI 已配置');
  
  // 隐藏密码显示连接字符串
  const maskedUri = process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@');
  console.log(`   连接字符串: ${maskedUri}`);
  
  // 2. 获取当前公网 IP
  console.log('\n2. 获取当前公网 IP...');
  try {
    const publicIP = await getPublicIP();
    console.log(`✅ 当前公网 IP: ${publicIP}`);
    console.log(`\n⚠️  请确保 MongoDB Atlas 的 IP 白名单中包含此 IP！`);
    console.log(`   如果 IP 不匹配，请在 MongoDB Atlas 中添加此 IP 到白名单`);
  } catch (error) {
    console.warn('⚠️  无法获取公网 IP:', error.message);
    console.log('   你可以手动访问 https://www.ipify.org 查看你的 IP');
  }
  
  // 3. 测试连接
  console.log('\n3. 测试 MongoDB 连接...');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5秒超时
    });
    
    console.log('✅ MongoDB 连接成功！');
    console.log(`   服务器地址: ${conn.connection.host}`);
    console.log(`   数据库名称: ${conn.connection.name}`);
    
    // 断开连接
    await mongoose.disconnect();
    console.log('\n✅ 连接测试完成');
  } catch (error) {
    console.error('\n❌ MongoDB 连接失败！');
    console.error(`   错误信息: ${error.message}`);
    
    // 常见错误提示
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 可能原因: 用户名或密码错误');
      console.error('   请检查 .env 文件中的 MONGODB_URI 用户名和密码');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 可能原因: 无法解析服务器地址');
      console.error('   请检查网络连接和 MongoDB Atlas 集群地址');
    } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
      console.error('\n💡 可能原因: 连接超时');
      console.error('   可能的原因：');
      console.error('   1. IP 地址不在 MongoDB Atlas 白名单中');
      console.error('   2. 防火墙阻止了连接');
      console.error('   3. 网络连接问题');
      console.error('\n   解决方案：');
      console.error('   1. 访问 MongoDB Atlas 控制台');
      console.error('   2. 进入 Network Access 页面');
      console.error('   3. 添加当前 IP 到白名单（或使用 0.0.0.0/0 允许所有 IP）');
    } else if (error.message.includes('IP')) {
      console.error('\n💡 可能原因: IP 地址被拒绝');
      console.error('   你的 IP 地址不在 MongoDB Atlas 白名单中');
      console.error('   请按照上面的步骤更新 IP 白名单');
    }
    
    process.exit(1);
  }
}

// 运行诊断
testMongoConnection().catch(console.error);

