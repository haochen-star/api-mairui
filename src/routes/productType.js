const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getProductTypes,
  getProductTypeById,
  createProductType,
  updateProductType,
  getProductCount,
  deleteProductType
} = require('../controllers/productTypeController');

/**
 * @route   GET /api/product-type
 * @desc    获取产品类型列表（支持树形结构）
 * @access  Public (公开访问)
 * @example GET /api/product-type
 */
router.get('/', getProductTypes);

/**
 * @route   GET /api/product-type/:id/product-count
 * @desc    获取产品类型下的产品数量
 * @access  Private (需要登录 + 超级管理员或管理员权限)
 * @example GET /api/product-type/1/product-count
 */
router.get('/:id/product-count', authMiddleware, requireRole(['super_admin', 'admin']), getProductCount);

/**
 * @route   GET /api/product-type/:id
 * @desc    根据 ID 获取单个产品类型
 * @access  Public (公开访问)
 * @example GET /api/product-type/1
 */
router.get('/:id', getProductTypeById);

/**
 * @route   POST /api/product-type
 * @desc    创建产品类型
 * @access  Private (需要登录 + 超级管理员或管理员权限)
 * @example POST /api/product-type
 * 
 * 请求体：
 * {
 *   "label": "新类型",
 *   "parentId": 1,  // 可选，不提供则创建一级分类
 *   "hasDetails": false  // 可选，默认 false
 * }
 */
router.post('/', authMiddleware, requireRole(['super_admin', 'admin']), createProductType);

/**
 * @route   PUT /api/product-type/:id
 * @desc    更新产品类型
 * @access  Private (需要登录 + 超级管理员或管理员权限)
 * @example PUT /api/product-type/1
 * 
 * 请求体（所有字段可选）：
 * {
 *   "label": "更新后的类型",
 *   "parentId": 2,  // 可选，设置为 null 可将子分类提升为一级分类
 *   "hasDetails": true
 * }
 */
router.put('/:id', authMiddleware, requireRole(['super_admin', 'admin']), updateProductType);

/**
 * @route   DELETE /api/product-type/:id
 * @desc    删除产品类型
 * @access  Private (需要登录 + 超级管理员或管理员权限)
 * @example DELETE /api/product-type/1
 * @example DELETE /api/product-type/1?force=true  // 强制删除（同时删除关联产品）
 */
router.delete('/:id', authMiddleware, requireRole(['super_admin', 'admin']), deleteProductType);

module.exports = router;

