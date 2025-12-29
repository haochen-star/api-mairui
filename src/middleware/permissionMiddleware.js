/**
 * 权限检查中间件
 * 用于检查用户是否有权限操作目标用户
 */

/**
 * 权限等级映射
 */
const ROLE_HIERARCHY = {
  super_admin: 3,
  admin: 2,
  sales: 1
};

/**
 * 检查当前用户是否有权限操作目标用户
 * @param {Object} currentUser - 当前登录用户（从 req.user 获取）
 * @param {Object} targetUser - 目标用户（从数据库查询）
 * @param {String} action - 操作类型：'create', 'update', 'delete'
 * @returns {Object} { allowed: boolean, message: string }
 */
const checkPermission = (currentUser, targetUser, action = 'update') => {
  // 如果没有当前用户信息，拒绝访问
  if (!currentUser || !currentUser.role) {
    return {
      allowed: false,
      message: '未授权访问'
    };
  }

  const currentRole = currentUser.role;
  const currentRoleLevel = ROLE_HIERARCHY[currentRole] || 0;

  // 销售人员无管理权限
  if (currentRole === 'sales') {
    return {
      allowed: false,
      message: '销售人员无用户管理权限'
    };
  }

  // 创建操作
  if (action === 'create') {
    // 超级管理员可以创建管理员和销售人员
    if (currentRole === 'super_admin') {
      // 检查要创建的用户角色
      const targetRole = targetUser?.role || targetUser;
      if (targetRole === 'super_admin') {
        return {
          allowed: false,
          message: '不能通过 API 创建超级管理员，请通过数据库手动创建'
        };
      }
      return {
        allowed: true,
        message: '允许创建'
      };
    }
    // 管理员只能创建销售人员
    if (currentRole === 'admin') {
      const targetRole = targetUser?.role || targetUser;
      if (targetRole === 'sales') {
        return {
          allowed: true,
          message: '允许创建'
        };
      }
      return {
        allowed: false,
        message: '管理员只能创建销售人员'
      };
    }
  }

  // 更新和删除操作需要目标用户信息
  if (!targetUser || !targetUser.role) {
    return {
      allowed: false,
      message: '目标用户不存在或信息不完整'
    };
  }

  const targetRole = targetUser.role;
  const targetRoleLevel = ROLE_HIERARCHY[targetRole] || 0;

  // 不能操作自己（删除操作）
  if (action === 'delete' && currentUser.userId === targetUser.id) {
    return {
      allowed: false,
      message: '不能删除自己'
    };
  }

  // 超级管理员不能通过 API 操作其他超级管理员
  if (currentRole === 'super_admin' && targetRole === 'super_admin') {
    return {
      allowed: false,
      message: '不能通过 API 操作其他超级管理员，请通过数据库手动操作'
    };
  }

  // 管理员不能操作管理员和超级管理员
  if (currentRole === 'admin') {
    if (targetRole === 'admin' || targetRole === 'super_admin') {
      return {
        allowed: false,
        message: '管理员只能操作销售人员'
      };
    }
  }

  // 检查权限等级：只能操作权限等级低于自己的用户
  if (targetRoleLevel >= currentRoleLevel) {
    return {
      allowed: false,
      message: '权限不足，无法操作该用户'
    };
  }

  return {
    allowed: true,
    message: '允许操作'
  };
};

/**
 * 权限检查中间件工厂函数
 * @param {String} action - 操作类型：'create', 'update', 'delete'
 * @param {Function} getUserFn - 获取目标用户的函数，接收 req 参数，返回 Promise<User>
 * @returns {Function} Express 中间件
 */
const requirePermission = (action, getUserFn = null) => {
  return async (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: '未授权访问，请先登录'
        });
      }

      let targetUser = null;

      // 如果是创建操作，从请求体中获取角色信息
      if (action === 'create') {
        const { role } = req.body;
        targetUser = role || 'sales'; // 默认为销售人员
      } else {
        // 更新和删除操作，需要从数据库获取目标用户
        if (getUserFn) {
          targetUser = await getUserFn(req);
        } else {
          // 默认从路由参数中获取用户 ID
          const { id } = req.params;
          if (!id) {
            return res.status(400).json({
              success: false,
              message: '缺少用户 ID 参数'
            });
          }

          const User = require('../models/User');
          const userId = parseInt(id, 10);
          if (isNaN(userId)) {
            return res.status(400).json({
              success: false,
              message: '无效的用户 ID'
            });
          }

          targetUser = await User.findOne({ id: userId });
          if (!targetUser) {
            return res.status(404).json({
              success: false,
              message: '目标用户不存在'
            });
          }
        }
      }

      // 检查权限
      const permission = checkPermission(currentUser, targetUser, action);

      if (!permission.allowed) {
        return res.status(403).json({
          success: false,
          message: permission.message
        });
      }

      // 将目标用户信息添加到请求对象中，供后续使用
      if (targetUser && typeof targetUser === 'object') {
        req.targetUser = targetUser;
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '权限检查失败',
        error: error.message
      });
    }
  };
};

module.exports = {
  checkPermission,
  requirePermission
};

