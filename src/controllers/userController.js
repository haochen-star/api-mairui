const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * 格式化用户返回数据，不包含密码字段
 * @param {Object} user - User 对象
 * @returns {Object} 格式化后的用户对象
 */
const formatUserResponse = (user) => {
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'sales',
    createdAt: user.createdAt
  };
};

/**
 * 获取用户列表
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, pagesize = 10, search, role } = req.query;
    
    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      });
    }

    // 构建查询条件
    const query = {};
    
    // 搜索条件（用户名或邮箱）
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 角色过滤
    if (role && ['super_admin', 'admin', 'sales'].includes(role)) {
      query.role = role;
    }

    // 权限过滤：根据当前用户角色，只能查看权限等级低于或等于自己的用户
    const currentUser = req.user;
    if (currentUser && currentUser.role) {
      const roleHierarchy = {
        super_admin: 3,
        admin: 2,
        sales: 1
      };
      const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
      
      // 如果当前用户不是超级管理员，只能查看权限等级低于自己的用户
      if (currentUser.role !== 'super_admin') {
        const allowedRoles = Object.keys(roleHierarchy).filter(
          r => roleHierarchy[r] < currentRoleLevel
        );
        if (allowedRoles.length > 0) {
          query.role = { $in: allowedRoles };
        } else {
          // 如果当前用户是销售人员，无权限查看其他用户
          return res.status(403).json({
            success: false,
            message: '销售人员无权限查看用户列表'
          });
        }
      }
    }

    // 分页参数
    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(pagesize, 10);
    const skip = (pageNum - 1) * pageSize;

    // 查询用户
    const users = await User.find(query)
      .select('-password') // 排除密码字段
      .sort({ id: -1 }) // 按 ID 降序排列
      .skip(skip)
      .limit(pageSize)
      .exec();

    // 获取总数
    const total = await User.countDocuments(query);

    // 格式化返回数据
    const formattedUsers = users.map(formatUserResponse);

    res.status(200).json({
      success: true,
      message: '获取用户列表成功！',
      data: {
        users: formattedUsers,
        pagination: {
          page: pageNum,
          pagesize: pageSize,
          total: total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库查询失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

/**
 * 根据 ID 获取单个用户信息
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证 ID
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户 ID，必须是整数'
      });
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      });
    }

    // 查询用户
    const user = await User.findOne({ id: userId }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的用户信息'
      });
    }

    // 权限检查：只能查看权限等级低于或等于自己的用户
    const currentUser = req.user;
    if (currentUser && currentUser.role) {
      const roleHierarchy = {
        super_admin: 3,
        admin: 2,
        sales: 1
      };
      const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
      const targetRoleLevel = roleHierarchy[user.role] || 0;
      
      if (currentUser.role !== 'super_admin' && targetRoleLevel >= currentRoleLevel) {
        return res.status(403).json({
          success: false,
          message: '权限不足，无法查看该用户信息'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: '获取用户信息成功！',
      data: {
        user: formatUserResponse(user)
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库查询失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

/**
 * 创建新用户
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const createUser = async (req, res) => {
  try {
    const { username, email, password, role = 'sales' } = req.body;
    
    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的用户信息（username, email, password）'
      });
    }

    // 验证角色
    if (role && !['super_admin', 'admin', 'sales'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色，必须是 super_admin、admin 或 sales'
      });
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      });
    }

    // 创建新用户（密码会自动加密，通过 User 模型的 pre-save hook）
    const newUser = new User({
      username,
      email,
      password,
      role
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: '用户创建成功！',
      data: {
        user: formatUserResponse(savedUser)
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      });
    }

    // 处理验证错误（如用户名或邮箱已存在）
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.message
      });
    }

    // 处理唯一性约束错误
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'username' ? '用户名' : '邮箱'}已存在`
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

/**
 * 更新用户信息
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role } = req.body;
    const currentUser = req.user;
    const targetUser = req.targetUser; // 从权限中间件获取

    // 验证 ID
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户 ID，必须是整数'
      });
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      });
    }

    // 不能修改自己的权限等级
    if (currentUser && currentUser.userId === userId && role && role !== targetUser.role) {
      return res.status(403).json({
        success: false,
        message: '不能修改自己的权限等级'
      });
    }

    // 验证角色（如果提供了）
    if (role && !['super_admin', 'admin', 'sales'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色，必须是 super_admin、admin 或 sales'
      });
    }

    // 构建更新对象
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password; // 密码会自动加密
    if (role) updateData.role = role;

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的字段'
      });
    }

    // 更新用户
    const updatedUser = await User.findOneAndUpdate(
      { id: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的用户信息'
      });
    }

    res.status(200).json({
      success: true,
      message: '用户更新成功！',
      data: {
        user: formatUserResponse(updatedUser)
      }
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      });
    }

    // 处理验证错误
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.message
      });
    }

    // 处理唯一性约束错误
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'username' ? '用户名' : '邮箱'}已存在`
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

/**
 * 删除用户
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = req.targetUser; // 从权限中间件获取

    // 验证 ID
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户 ID，必须是整数'
      });
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      });
    }

    // 删除用户
    const deletedUser = await User.findOneAndDelete({ id: userId });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的用户信息'
      });
    }

    res.status(200).json({
      success: true,
      message: '用户删除成功！',
      data: {
        deletedUser: formatUserResponse(deletedUser)
      }
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

