/**
 * 测试控制器
 * 用于学习和测试 API
 */

/**
 * 测试 GET 接口
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const test = (req, res) => {
  try {
    // 获取查询参数（URL 中的 ?key=value）
    const queryParams = req.query;
    
    // 获取请求头信息
    const headers = req.headers;
    
    // 返回测试数据
    res.status(200).json({
      success: true,
      message: '测试接口调用成功！',
      data: {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        queryParams: queryParams,
        headers: {
          'user-agent': headers['user-agent'],
          'content-type': headers['content-type']
        },
        info: '这是一个测试接口，用于学习和测试 API 功能'
      }
    });
  } catch (error) {
    console.error('测试接口错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

/**
 * 测试数据库连接状态
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const testDbConnection = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: '未连接',
      1: '已连接',
      2: '正在连接',
      3: '正在断开连接'
    };
    
    // 尝试执行一个简单的数据库查询来验证连接
    let dbTestResult = null;
    if (dbStatus === 1) {
      try {
        const User = require('../models/User');
        const userCount = await User.countDocuments();
        dbTestResult = {
          connected: true,
          userCount: userCount,
          message: '数据库连接正常，可以执行查询'
        };
      } catch (queryError) {
        dbTestResult = {
          connected: true,
          queryError: queryError.message,
          message: '数据库已连接，但查询失败'
        };
      }
    }
    
    res.status(200).json({
      success: true,
      message: '数据库连接状态检查完成',
      data: {
        dbStatus: dbStatusText[dbStatus] || '未知',
        dbStatusCode: dbStatus,
        connectionHost: mongoose.connection.host || '未连接',
        connectionName: mongoose.connection.name || '未连接',
        dbTest: dbTestResult
      }
    });
  } catch (error) {
    console.error('数据库连接测试错误:', error);
    res.status(500).json({
      success: false,
      message: '检查数据库连接时出错',
      error: error.message
    });
  }
};

module.exports = {
  test,
  testDbConnection
};

