const express = require('express');
const router = express.Router();
const { test, testDbConnection } = require('../controllers/testController');

/**
 * @route   GET /api/test
 * @desc    测试接口 - 基础 GET 请求
 * @access  Public
 * @example GET /api/test
 * @example GET /api/test?name=张三&age=20
 */
router.get('/', test);

/**
 * @route   GET /api/test/db
 * @desc    测试数据库连接状态
 * @access  Public
 * @example GET /api/test/db
 */
router.get('/db', testDbConnection);

module.exports = router;

