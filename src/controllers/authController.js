const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

/**
 * 用户登录
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证输入
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '密码不能为空'
      });
    }

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱不能为空'
      });
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: email || username }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名/邮箱或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名/邮箱或密码错误'
      });
    }

    // 生成 JWT token（包含 role 信息）
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'sales'
    });

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role || 'sales',
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  login
};

