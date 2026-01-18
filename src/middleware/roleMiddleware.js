/**
 * 角色检查中间件
 * 用于检查用户是否有特定角色权限
 */

/**
 * 检查用户角色权限的中间件工厂函数
 * @param {Array<String>} allowedRoles - 允许的角色数组，如 ['super_admin', 'admin']
 * @returns {Function} Express 中间件
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: '未授权访问，请先登录'
        });
      }

      if (!currentUser.role) {
        return res.status(403).json({
          success: false,
          message: '用户角色信息不完整'
        });
      }

      // 检查用户角色是否在允许的角色列表中
      if (!allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足，需要以下角色之一：' + allowedRoles.join('、')
        });
      }

      next();
    } catch (error) {
      console.error('角色检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '角色检查失败',
        error: error.message
      });
    }
  };
};

module.exports = {
  requireRole
};

