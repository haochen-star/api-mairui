const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

/**
 * @route   GET /api/user
 * @desc    获取用户列表（支持分页、搜索、权限过滤）
 * @access  Private (需要认证)
 * @example GET /api/user
 * @example GET /api/user?page=1&pagesize=10&search=test&role=admin
 */
router.get('/', authMiddleware, getUsers);

/**
 * @route   GET /api/user/:id
 * @desc    根据 ID 获取单个用户信息
 * @access  Private (需要认证)
 * @example GET /api/user/1
 */
router.get('/:id', authMiddleware, getUserById);

/**
 * @route   POST /api/user
 * @desc    创建新用户
 * @access  Private (需要认证 + 权限检查)
 * @example POST /api/user
 * 
 * 请求体：
 * {
 *   "username": "newuser",
 *   "email": "newuser@example.com",
 *   "password": "123456",
 *   "role": "sales"
 * }
 */
router.post('/', authMiddleware, requirePermission('create'), createUser);

/**
 * @route   PUT /api/user/:id
 * @desc    更新用户信息
 * @access  Private (需要认证 + 权限检查)
 * @example PUT /api/user/1
 * 
 * 请求体（所有字段可选）：
 * {
 *   "username": "updateduser",
 *   "email": "updated@example.com",
 *   "password": "newpassword",
 *   "role": "admin"
 * }
 */
router.put('/:id', authMiddleware, requirePermission('update'), updateUser);

/**
 * @route   DELETE /api/user/:id
 * @desc    删除用户
 * @access  Private (需要认证 + 权限检查)
 * @example DELETE /api/user/1
 */
router.delete('/:id', authMiddleware, requirePermission('delete'), deleteUser);

module.exports = router;

