const Product = require('../models/Product')
const ProductType = require('../models/ProductType')
const mongoose = require('mongoose')

/**
 * 格式化产品返回数据，统一处理 details 字段
 * @param {Object} product - Product 对象
 * @returns {Object} 格式化后的产品对象
 */
const formatProductResponse = (product) => {
  const formatted = {
    id: product.id,
    productNo: product.productNo,
    cnName: product.cnName,
    productSpec: product.productSpec || '',
    price: product.price || '',
    type: product.type,
    createdAt: product.createdAt,
    details: product.details || null
  }
  return formatted
}

/**
 * 构建树形结构
 * @param {Array} types - 所有类型数组
 * @returns {Array} 树形结构数组
 */
function buildTree(types) {
  const typeMap = new Map()
  const rootTypes = []

  // 创建类型映射
  types.forEach((type) => {
    typeMap.set(type.id, {
      id: type.id,
      label: type.label,
      parentId: type.parentId,
      hasDetails: type.hasDetails,
      children: []
    })
  })

  // 构建树形结构
  types.forEach((type) => {
    const typeNode = typeMap.get(type.id)
    if (type.parentId === null || type.parentId === undefined) {
      // 根节点
      rootTypes.push(typeNode)
    } else {
      // 子节点
      const parent = typeMap.get(type.parentId)
      if (parent) {
        parent.children.push(typeNode)
      } else {
        // 如果找不到父节点，也作为根节点处理
        rootTypes.push(typeNode)
      }
    }
  })

  return rootTypes
}

/**
 * 获取产品类型列表
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getProductTypes = async (req, res) => {
  try {
    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 查询所有类型
    const types = await ProductType.find({}).sort({ id: 1 }).exec()

    // 构建树形结构
    const tree = buildTree(types)

    res.status(200).json({
      success: true,
      message: '获取产品类型列表成功！',
      data: {
        types: tree
      }
    })
  } catch (error) {
    console.error('获取产品类型列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 创建产品
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const createProduct = async (req, res) => {
  try {
    const { type, productNo, cnName, productSpec, price, details } = req.body

    // 验证必填字段
    if (!productNo) {
      return res.status(400).json({
        success: false,
        message: '货号不能为空'
      })
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 验证类型是否存在
    const typeId = parseInt(type, 10)
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的产品类型 ID'
      })
    }

    const productType = await ProductType.findOne({ id: typeId })
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: '产品类型不存在'
      })
    }

    // 统一使用 Product 模型创建
    const productData = {
      productNo,
      cnName: cnName || undefined,
      productSpec: productSpec || undefined,
      // 价格字段支持特殊格式字符串（如：50UL|1300,100UL|2300），确保完整保存
      price:
        price !== undefined && price !== null
          ? String(price).trim()
          : undefined,
      type: typeId,
      details: productType.hasDetails ? details || null : null
    }

    const newProduct = new Product(productData)
    const savedProduct = await newProduct.save()

    res.status(201).json({
      success: true,
      message: '产品创建成功！',
      data: {
        product: formatProductResponse(savedProduct)
      }
    })
  } catch (error) {
    console.error('创建产品错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    // 处理验证错误
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.message
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 转义正则表达式特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegex(str) {
  if (!str) return str
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/**
 * 获取产品列表（支持分页和过滤）
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getProducts = async (req, res) => {
  try {
    const { type, page = 1, pagesize = 10, cnName } = req.query

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 分页参数
    const pageNum = parseInt(page, 10) || 1
    const pageSize = parseInt(pagesize, 10) || 10
    const skip = (pageNum - 1) * pageSize

    // 转义搜索关键词中的特殊字符
    const escapedCnName = cnName ? escapeRegex(cnName) : null

    // 统一使用 Product 查询
    const query = {}

    // 如果指定了 type，添加类型过滤
    if (type) {
      const typeId = parseInt(type, 10)
      if (!isNaN(typeId)) {
        query.type = typeId
      } else {
        return res.status(400).json({
          success: false,
          message: '无效的产品类型 ID'
        })
      }
    }

    // 如果提供了 cnName，添加模糊匹配
    if (escapedCnName) {
      query.cnName = { $regex: escapedCnName, $options: 'i' }
    }

    // 查询总数
    total = await Product.countDocuments(query)

    // 查询数据
    const foundProducts = await Product.find(query)
      .sort({ id: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec()

    // 格式化返回数据
    products = foundProducts.map((product) => formatProductResponse(product))

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize)

    res.status(200).json({
      success: true,
      message: '获取产品列表成功！',
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          pagesize: pageSize,
          totalPages
        }
      }
    })
  } catch (error) {
    console.error('获取产品列表错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库查询失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 根据 id 或 productNo（货号）获取单个产品
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 判断是数字 ID 还是货号（productNo）
    const productId = parseInt(id, 10)
    let product

    if (!isNaN(productId)) {
      // 如果是数字，按 ID 查询
      product = await Product.findOne({ id: productId })
    } else {
      // 如果不是数字，按货号查询
      product = await Product.findOne({ productNo: id })
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的产品信息',
        data: {
          identifier: id,
          info: '请检查产品 ID 或货号是否正确'
        }
      })
    }

    res.status(200).json({
      success: true,
      message: '获取产品信息成功！',
      data: {
        product: formatProductResponse(product)
      }
    })
  } catch (error) {
    console.error('获取产品错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库查询失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 更新产品
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { type, productNo, cnName, productSpec, price, details } = req.body

    // 验证必填字段
    if (!productNo) {
      return res.status(400).json({
        success: false,
        message: '货号不能为空'
      })
    }

    // 验证 id 是否为数字
    const productId = parseInt(id, 10)
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: '无效的产品 ID，必须是整数',
        data: {
          providedId: id
        }
      })
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 统一使用 Product 查询和更新
    const product = await Product.findOne({ id: productId })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的产品信息',
        data: {
          id: productId,
          info: '请检查产品 ID 是否正确'
        }
      })
    }

    // 构建更新数据
    const updateData = {
      productNo
    }

    // 只更新提供的字段
    if (type !== undefined) {
      const typeId = parseInt(type, 10)
      if (isNaN(typeId)) {
        return res.status(400).json({
          success: false,
          message: '无效的产品类型 ID'
        })
      }

      // 验证类型是否存在
      const productType = await ProductType.findOne({ id: typeId })
      if (!productType) {
        return res.status(404).json({
          success: false,
          message: '产品类型不存在'
        })
      }

      updateData.type = typeId

      // 根据类型的 hasDetails 字段决定是否更新 details
      if (productType.hasDetails && details !== undefined) {
        updateData.details = details
      } else if (!productType.hasDetails) {
        // 如果类型不需要 details，清空 details
        updateData.details = null
      }
    } else if (details !== undefined) {
      // 如果只更新 details，需要检查当前类型是否需要 details
      const currentType = await ProductType.findOne({ id: product.type })
      if (currentType && currentType.hasDetails) {
        updateData.details = details
      } else {
        return res.status(400).json({
          success: false,
          message: '当前产品类型不支持 details 字段'
        })
      }
    }

    if (cnName !== undefined) updateData.cnName = cnName
    if (productSpec !== undefined) updateData.productSpec = productSpec
    if (price !== undefined) updateData.price = price

    const updatedProduct = await Product.findOneAndUpdate(
      { id: productId },
      updateData,
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      message: '产品更新成功！',
      data: {
        product: formatProductResponse(updatedProduct)
      }
    })
  } catch (error) {
    console.error('更新产品错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    // 处理验证错误
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.message
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 删除产品
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    // 验证 id 是否为数字
    const productId = parseInt(id, 10)
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: '无效的产品 ID，必须是整数',
        data: {
          providedId: id
        }
      })
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 先查找产品，确认是否存在
    const product = await Product.findOne({ id: productId })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的产品信息',
        data: {
          id: productId,
          info: '请检查产品 ID 是否正确'
        }
      })
    }

    // 删除产品
    await Product.deleteOne({ id: productId })

    res.status(200).json({
      success: true,
      message: '产品删除成功！',
      data: {
        deletedProduct: {
          id: product.id,
          productNo: product.productNo,
          cnName: product.cnName,
          type: product.type
        }
      }
    })
  } catch (error) {
    console.error('删除产品错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 批量删除产品
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body

    // 验证请求体
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请求体必须包含非空的产品 ID 数组'
      })
    }

    // 验证所有 ID 都是数字
    const productIds = ids
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id))
    if (productIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: '所有产品 ID 必须是整数',
        data: {
          providedIds: ids,
          validIds: productIds
        }
      })
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 批量删除产品
    const deleteResult = await Product.deleteMany({ id: { $in: productIds } })

    res.status(200).json({
      success: true,
      message: `成功删除 ${deleteResult.deletedCount} 个产品`,
      data: {
        deletedCount: deleteResult.deletedCount,
        deletedIds: productIds,
        requestedCount: productIds.length
      }
    })
  } catch (error) {
    console.error('批量删除产品错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 批量创建产品
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const bulkCreateProducts = async (req, res) => {
  try {
    const products = req.body.products

    // 验证请求体
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请求体必须包含非空的产品数组'
      })
    }

    // 检查数据库连接状态
    const dbStatus = mongoose.connection.readyState
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接',
        data: {
          dbStatus: dbStatus,
          info: '请先确保数据库连接正常'
        }
      })
    }

    // 预分配 ID：先查询最后一个产品的 id，避免并发冲突
    const lastProduct = await Product.findOne({
      id: { $exists: true, $ne: null, $type: 'number' }
    })
      .sort({ id: -1 })
      .exec()

    let nextId = 1
    if (
      lastProduct &&
      typeof lastProduct.id === 'number' &&
      !isNaN(lastProduct.id)
    ) {
      nextId = lastProduct.id + 1
    }

    // 存储成功创建的产品和失败的信息
    const createdProducts = []
    const errors = []

    // 顺序处理所有产品创建，避免 ID 冲突
    for (let index = 0; index < products.length; index++) {
      const productData = products[index]
      try {
        const { type, productNo, cnName, productSpec, price, details } =
          productData

        // 验证必填字段
        if (!productNo) {
          throw new Error(`第 ${index + 1} 个产品缺少货号`)
        }

        // 验证类型
        const typeId = parseInt(type, 10)
        if (isNaN(typeId)) {
          throw new Error(`第 ${index + 1} 个产品类型 ID 无效`)
        }

        // 查询类型信息
        const productType = await ProductType.findOne({ id: typeId })
        if (!productType) {
          throw new Error(`第 ${index + 1} 个产品的类型不存在`)
        }

        // 统一使用 Product 模型创建，预分配唯一 id
        const newProductData = {
          id: nextId + index, // 预分配唯一 id，避免并发冲突
          productNo,
          cnName: cnName || undefined,
          productSpec: productSpec || undefined,
          // 确保价格字段正确保存，即使为空字符串也保存
          price:
            price !== undefined && price !== null ? String(price).trim() : '',
          type: typeId,
          details: productType.hasDetails ? details || null : null
        }

        const newProduct = new Product(newProductData)
        const savedProduct = await newProduct.save()

        createdProducts.push(formatProductResponse(savedProduct))
      } catch (error) {
        errors.push({
          index,
          product: productData,
          error: error.message
        })
      }
    }

    // 构造响应
    const responseData = {
      success: true,
      message: `成功创建 ${createdProducts.length} 个产品`,
      data: {
        products: createdProducts
      }
    }

    // 如果有错误，添加错误信息到响应中
    if (errors.length > 0) {
      responseData.message += `，${errors.length} 个产品创建失败`
      responseData.errors = errors
    }

    res.status(201).json(responseData)
  } catch (error) {
    console.error('批量创建产品错误:', error)

    // 处理数据库错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: error.message,
        dbInfo: '请检查 MongoDB 连接配置'
      })
    }

    // 处理验证错误
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.message
      })
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

module.exports = {
  getProductTypes,
  createProduct,
  bulkCreateProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts
}
