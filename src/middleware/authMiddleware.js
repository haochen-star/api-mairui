const { verifyToken } = require('../utils/jwt');

/**
 * JWT 认证中间件
 * 从请求头中提取 token 并验证
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express next 函数
 */
const authMiddleware = (req, res, next) => {
  try {
    // 从请求头中获取 Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证 token，请先登录'
      });
    }
    
    // 提取 token（格式：Bearer <token>）
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token 格式错误，请使用格式：Authorization: Bearer <token>'
      });
    }
    
    // 验证 token
    const decoded = verifyToken(token);
    
    // 将用户信息添加到请求对象中
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Token 无效或已过期，请重新登录'
    });
  }
};

module.exports = authMiddleware;

