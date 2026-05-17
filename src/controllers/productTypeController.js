const ProductType = require('../models/ProductType')
const Product = require('../models/Product')
const mongoose = require('mongoose')

/**
 * 规范化 detailType：仅 0|1 有效，否则视为 0（抗体，兼容存量）
 * @param {*} raw
 * @returns {0|1}
 */
function normalizeDetailType(raw) {
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10)
  if (n === 0 || n === 1) return n
  return 0
}

/**
 * 序列化类型节点（树或列表）：hasDetails 为 false 时不包含 detailType
 * @param {object} type - Mongoose 文档或 plain object
 * @returns {{ id: number, label: string, parentId: number|null, hasDetails: boolean, detailType?: 0|1 }}
 */
function serializeProductTypeBase(type) {
  const hasDetails = !!type.hasDetails
  const o = {
    id: type.id,
    label: type.label,
    parentId: type.parentId,
    hasDetails
  }
  if (hasDetails) {
    o.detailType = normalizeDetailType(type.detailType)
  }
  return o
}

/**
 * 单条类型 API 响应（含时间戳）
 * @param {object} type
 */
function serializeProductTypeForResponse(type) {
  return {
    ...serializeProductTypeBase(type),
    createdAt: type.createdAt,
    updatedAt: type.updatedAt
  }
}

/**
 * 从请求体解析 detailType；未传或空串返回 undefined（表示未提交该字段）
 * @param {*} raw
 * @returns {0|1|undefined|'invalid'}
 */
function parseDetailTypeInput(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  if (typeof raw === 'boolean') return 'invalid'
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10)
  if (n === 0 || n === 1) return n
  return 'invalid'
}

/**
 * 构建树形结构（与 productController 共用）
 * @param {Array} types - 所有类型数组
 * @returns {Array} 树形结构数组
 */
function buildTypeTree(types) {
  const typeMap = new Map()
  const rootTypes = []

  types.forEach((type) => {
    typeMap.set(type.id, {
      ...serializeProductTypeBase(type),
      children: []
    })
  })

  types.forEach((type) => {
    const typeNode = typeMap.get(type.id)
    if (type.parentId === null || type.parentId === undefined) {
      rootTypes.push(typeNode)
    } else {
      const parent = typeMap.get(type.parentId)
      if (parent) {
        parent.children.push(typeNode)
      } else {
        rootTypes.push(typeNode)
      }
    }
  })

  return rootTypes
}

/**
 * 获取产品类型列表（支持树形结构）
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
    const tree = buildTypeTree(types)

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
 * 根据 ID 获取单个产品类型
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getProductTypeById = async (req, res) => {
  try {
    const { id } = req.params

    // 验证 ID
    const typeId = parseInt(id, 10)
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的类型 ID'
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

    const type = await ProductType.findOne({ id: typeId })

    if (!type) {
      return res.status(404).json({
        success: false,
        message: '产品类型不存在'
      })
    }

    res.status(200).json({
      success: true,
      message: '获取产品类型成功！',
      data: {
        type: serializeProductTypeForResponse(type)
      }
    })
  } catch (error) {
    console.error('获取产品类型错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 创建产品类型
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const createProductType = async (req, res) => {
  try {
    const { label, parentId, hasDetails, detailType } = req.body

    // 验证必填字段
    if (!label || label.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '类型标签不能为空'
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

    // 如果提供了 parentId，验证父类型是否存在
    let finalParentId = null
    if (parentId !== undefined && parentId !== null && parentId !== '') {
      const parentIdNum = parseInt(parentId, 10)
      if (isNaN(parentIdNum)) {
        return res.status(400).json({
          success: false,
          message: '无效的父类型 ID'
        })
      }

      const parentType = await ProductType.findOne({ id: parentIdNum })
      if (!parentType) {
        return res.status(404).json({
          success: false,
          message: '父类型不存在'
        })
      }

      finalParentId = parentIdNum
    }

    const finalHasDetails = hasDetails === true
    let finalDetailType
    if (finalHasDetails) {
      const parsed = parseDetailTypeInput(detailType)
      if (parsed === 'invalid') {
        return res.status(400).json({
          success: false,
          message: 'detailType 必须为 0（抗体）或 1（TSA）'
        })
      }
      finalDetailType = parsed === undefined ? 0 : parsed
    }

    // 创建类型
    const newType = new ProductType({
      label: label.trim(),
      parentId: finalParentId,
      hasDetails: finalHasDetails,
      detailType: finalHasDetails ? finalDetailType : undefined
    })

    const savedType = await newType.save()

    res.status(201).json({
      success: true,
      message: '产品类型创建成功！',
      data: {
        type: serializeProductTypeForResponse(savedType)
      }
    })
  } catch (error) {
    console.error('创建产品类型错误:', error)

    // 处理唯一性约束错误
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '类型 ID 已存在',
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
 * 更新产品类型
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const updateProductType = async (req, res) => {
  try {
    const { id } = req.params
    const { label, parentId, hasDetails, detailType } = req.body

    // 验证 ID
    const typeId = parseInt(id, 10)
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的类型 ID'
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

    // 查找类型
    const type = await ProductType.findOne({ id: typeId })
    if (!type) {
      return res.status(404).json({
        success: false,
        message: '产品类型不存在'
      })
    }

    // 更新字段
    const updateData = {}
    if (label !== undefined) {
      if (label.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '类型标签不能为空'
        })
      }
      updateData.label = label.trim()
    }

    if (parentId !== undefined) {
      if (parentId === null || parentId === '' || parentId === undefined) {
        // 将子分类提升为一级分类
        updateData.parentId = null
      } else {
        // 验证父类型是否存在
        const parentIdNum = parseInt(parentId, 10)
        if (isNaN(parentIdNum)) {
          return res.status(400).json({
            success: false,
            message: '无效的父类型 ID'
          })
        }

        // 不能将自己设置为父类型
        if (parentIdNum === typeId) {
          return res.status(400).json({
            success: false,
            message: '不能将自己设置为父类型'
          })
        }

        const parentType = await ProductType.findOne({ id: parentIdNum })
        if (!parentType) {
          return res.status(404).json({
            success: false,
            message: '父类型不存在'
          })
        }

        updateData.parentId = parentIdNum
      }
    }

    if (hasDetails !== undefined) {
      updateData.hasDetails = hasDetails === true
    }

    // 更新类型
    Object.assign(type, updateData)
    type.updatedAt = new Date()

    const hd = !!type.hasDetails
    if (!hd) {
      type.set('detailType', undefined)
    } else {
      if (Object.prototype.hasOwnProperty.call(req.body, 'detailType')) {
        const parsed = parseDetailTypeInput(detailType)
        if (parsed === 'invalid') {
          return res.status(400).json({
            success: false,
            message: 'detailType 必须为 0（抗体）或 1（TSA）'
          })
        }
        type.detailType = parsed === undefined ? 0 : parsed
      } else if (hasDetails !== undefined && hasDetails === true) {
        const cur = type.detailType
        if (cur !== 0 && cur !== 1) {
          type.detailType = 0
        }
      }
    }

    const savedType = await type.save()

    res.status(200).json({
      success: true,
      message: '产品类型更新成功！',
      data: {
        type: serializeProductTypeForResponse(savedType)
      }
    })
  } catch (error) {
    console.error('更新产品类型错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 获取产品类型下的产品数量
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const getProductCount = async (req, res) => {
  try {
    const { id } = req.params

    // 验证 ID
    const typeId = parseInt(id, 10)
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的类型 ID'
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

    // 查找类型
    const type = await ProductType.findOne({ id: typeId })
    if (!type) {
      return res.status(404).json({
        success: false,
        message: '产品类型不存在'
      })
    }

    // 查询产品数量
    const productCount = await Product.countDocuments({ type: typeId })

    res.status(200).json({
      success: true,
      message: '获取产品数量成功',
      data: {
        typeId: typeId,
        typeLabel: type.label,
        productCount: productCount
      }
    })
  } catch (error) {
    console.error('获取产品数量错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

/**
 * 删除产品类型
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const deleteProductType = async (req, res) => {
  try {
    const { id } = req.params
    const { force } = req.query // 是否强制删除（同时删除关联产品）

    // 验证 ID
    const typeId = parseInt(id, 10)
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的类型 ID'
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

    // 查找类型
    const type = await ProductType.findOne({ id: typeId })
    if (!type) {
      return res.status(404).json({
        success: false,
        message: '产品类型不存在'
      })
    }

    // 检查是否有产品使用该类型
    const productCount = await Product.countDocuments({ type: typeId })

    if (productCount > 0) {
      // 如果有产品使用
      if (force === 'true') {
        // 强制删除：同时删除关联产品
        await Product.deleteMany({ type: typeId })
        await ProductType.deleteOne({ id: typeId })

        res.status(200).json({
          success: true,
          message: `产品类型及 ${productCount} 个关联产品已删除`,
          data: {
            deletedProducts: productCount
          }
        })
      } else {
        // 返回产品数量，由前端询问用户
        return res.status(400).json({
          success: false,
          message: '该类型下存在产品，无法删除',
          data: {
            productCount: productCount,
            hasProducts: true
          }
        })
      }
    } else {
      // 没有产品使用，直接删除
      await ProductType.deleteOne({ id: typeId })

      res.status(200).json({
        success: true,
        message: '产品类型删除成功！',
        data: {
          deletedProducts: 0
        }
      })
    }
  } catch (error) {
    console.error('删除产品类型错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

module.exports = {
  getProductTypes,
  getProductTypeById,
  createProductType,
  updateProductType,
  getProductCount,
  deleteProductType,
  buildTypeTree,
  serializeProductTypeBase,
  serializeProductTypeForResponse,
  normalizeDetailType
}
