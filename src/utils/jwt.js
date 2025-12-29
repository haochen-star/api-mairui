const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * 生成 JWT token
 * @param {Object} payload - 要编码到 token 中的数据
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

/**
 * 验证 JWT token
 * @param {String} token - 要验证的 token
 * @returns {Object} 解码后的 token 数据
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token 无效或已过期');
  }
};

module.exports = {
  generateToken,
  verifyToken
};

