const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProductTypes,
  createProduct,
  bulkCreateProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts
} = require('../controllers/productController');

/**
 * @route   GET /api/product/types
 * @desc    获取产品类型列表（公开访问）
 * @access  Public
 * @example GET /api/product/types
 */
router.get('/types', getProductTypes);

/**
 * @route   GET /api/product
 * @desc    获取产品列表（公开访问，支持分页和过滤）
 * @access  Public
 * @example GET /api/product?page=1&pagesize=10&type=elisa_kit&cnName=手机
 */
router.get('/', getProducts);

/**
 * @route   POST /api/product
 * @desc    创建产品（需要登录）
 * @access  Private
 * @example POST /api/product
 * 
 * 请求体：
 * {
 *   "type": "elisa_kit",
 *   "productNo": "P001",
 *   "cnName": "产品名称",
 *   "productSpec": "规格说明",
 *   "price": "100.00"
 * }
 */
router.post('/', authMiddleware, createProduct);

/**
 * @route   POST /api/product/batch/create
 * @desc    批量创建产品（需要登录）
 * @access  Private
 * @example POST /api/product/batch/create
 * 
 * 请求体：
 * {
 *   "products": [
 *     {
 *       "type": "ELISA Kit",
 *       "productNo": "P001",
 *       "cnName": "产品名称1",
 *       "productSpec": "规格说明1",
 *       "price": "100.00"
 *     },
 *     {
 *       "type": "ELISA Kit",
 *       "productNo": "P002",
 *       "cnName": "产品名称2",
 *       "productSpec": "规格说明2",
 *       "price": "200.00"
 *     }
 *   ]
 * }
 */
router.post('/batch/create', authMiddleware, bulkCreateProducts);

/**
 * @route   DELETE /api/product/batch/delete
 * @desc    批量删除产品（需要登录）
 * @access  Private
 * @example DELETE /api/product/batch/delete
 * 
 * 请求体：
 * {
 *   "ids": [1, 2, 3]
 * }
 */
router.delete('/batch/delete', authMiddleware, bulkDeleteProducts);

/**
 * @route   GET /api/product/:id
 * @desc    获取单个产品（公开访问）
 * @access  Public
 * @example GET /api/product/1
 */
router.get('/:id', getProductById);

/**
 * @route   PUT /api/product/:id
 * @desc    更新产品（需要登录）
 * @access  Private
 * @example PUT /api/product/1
 * 
 * 请求体：
 * {
 *   "type": "elisa_kit",
 *   "productNo": "P001",
 *   "cnName": "更新后的产品名称",
 *   "productSpec": "更新后的规格",
 *   "price": "150.00"
 * }
 */
router.put('/:id', authMiddleware, updateProduct);

/**
 * @route   DELETE /api/product/:id
 * @desc    删除产品（需要登录）
 * @access  Private
 * @example DELETE /api/product/1
 */
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;