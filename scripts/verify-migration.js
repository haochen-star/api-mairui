const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// 导入模型
const ProductType = require('../src/models/ProductType');
const Product = require('../src/models/Product');

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mairui';

/**
 * 验证数据迁移结果
 */
async function verifyMigration() {
  try {
    console.log('========================================');
    console.log('验证数据迁移结果');
    console.log('========================================\n');

    console.log('开始连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功\n');

    // 1. 验证 ProductType 数据
    console.log('1. 验证 ProductType 数据...');
    const productTypes = await ProductType.find({}).sort({ id: 1 });
    console.log(`   ✓ 找到 ${productTypes.length} 个产品类型`);

    // 检查是否有父类型和子类型
    const parentTypes = productTypes.filter(t => !t.parentId);
    const childTypes = productTypes.filter(t => t.parentId);
    console.log(`   ✓ 父类型: ${parentTypes.length} 个`);
    console.log(`   ✓ 子类型: ${childTypes.length} 个`);

    // 检查 id 是否连续且唯一
    const ids = productTypes.map(t => t.id).sort((a, b) => a - b);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.log('   ✗ 错误: 存在重复的 id');
      return false;
    }
    console.log('   ✓ ID 唯一性检查通过');

    // 2. 验证并清理 Product 数据
    console.log('\n2. 验证并清理 Product 数据...');
    const products = await Product.find({});
    console.log(`   ✓ 找到 ${products.length} 个产品`);

    // 获取有效的 ProductType ID
    const typeIds = new Set(productTypes.map(t => t.id));
    let deletedCount = 0;
    const deletedProducts = [];

    // 检查并删除 type 字段为字符串的产品
    const productsWithStringType = products.filter(p => typeof p.type === 'string');
    if (productsWithStringType.length > 0) {
      console.log(`   ⚠ 发现 ${productsWithStringType.length} 个产品的 type 字段仍然是字符串，将删除...`);
      for (const product of productsWithStringType) {
        try {
          await Product.deleteOne({ _id: product._id });
          deletedCount++;
          deletedProducts.push({
            id: product.id,
            productNo: product.productNo,
            cnName: product.cnName,
            type: product.type,
            reason: 'type 字段是字符串'
          });
          console.log(`     - 删除产品 ${product.id} (${product.productNo || 'N/A'}): type = "${product.type}"`);
        } catch (error) {
          console.error(`     ✗ 删除产品失败 ${product.id}:`, error.message);
        }
      }
    }

    // 检查并删除 type 字段无效的产品
    const productsWithInvalidType = products.filter(p => {
      // 跳过已经删除的字符串类型产品
      if (typeof p.type === 'string') return false;
      // 检查数字类型是否有效
      return !typeIds.has(p.type);
    });

    if (productsWithInvalidType.length > 0) {
      console.log(`   ⚠ 发现 ${productsWithInvalidType.length} 个产品的 type 字段无效，将删除...`);
      for (const product of productsWithInvalidType) {
        try {
          await Product.deleteOne({ _id: product._id });
          deletedCount++;
          deletedProducts.push({
            id: product.id,
            productNo: product.productNo,
            cnName: product.cnName,
            type: product.type,
            reason: 'type 字段不对应有效的 ProductType'
          });
          console.log(`     - 删除产品 ${product.id} (${product.productNo || 'N/A'}): type = ${product.type} (不存在)`);
        } catch (error) {
          console.error(`     ✗ 删除产品失败 ${product.id}:`, error.message);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`\n   ✓ 已删除 ${deletedCount} 个无效产品`);
    } else {
      console.log('   ✓ 所有产品的 type 字段都有效');
    }

    // 重新查询剩余产品，验证清理结果
    const remainingProducts = await Product.find({});
    console.log(`   ✓ 剩余有效产品: ${remainingProducts.length} 个`);

    // 验证剩余产品的 type 字段
    const invalidRemaining = remainingProducts.filter(p => {
      if (typeof p.type !== 'number') return true;
      return !typeIds.has(p.type);
    });

    if (invalidRemaining.length > 0) {
      console.log(`   ✗ 错误: 仍有 ${invalidRemaining.length} 个产品的 type 字段无效`);
      return false;
    }
    console.log('   ✓ 所有剩余产品的 type 字段都有效');

    // 3. 验证树形结构
    console.log('\n3. 验证树形结构...');
    const tree = buildTree(productTypes);
    console.log(`   ✓ 树形结构构建成功，共 ${tree.length} 个根节点`);
    
    // 检查每个父类型是否有正确的子类型
    let treeValid = true;
    for (const parent of parentTypes) {
      const children = productTypes.filter(t => t.parentId === parent.id);
      const treeChildren = tree.find(t => t.id === parent.id)?.children || [];
      if (children.length !== treeChildren.length) {
        console.log(`   ✗ 错误: 父类型 ${parent.label} (ID: ${parent.id}) 的子类型数量不匹配`);
        treeValid = false;
      }
    }
    if (!treeValid) {
      return false;
    }
    console.log('   ✓ 树形结构验证通过');

    console.log('\n========================================');
    console.log('✓ 所有验证通过！');
    console.log('========================================');
    return true;
  } catch (error) {
    console.error('\n✗ 验证失败:', error);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

/**
 * 构建树形结构
 */
function buildTree(types) {
  const typeMap = new Map();
  const rootTypes = [];

  types.forEach(type => {
    typeMap.set(type.id, {
      id: type.id,
      label: type.label,
      parentId: type.parentId,
      hasDetails: type.hasDetails,
      children: []
    });
  });

  types.forEach(type => {
    const typeNode = typeMap.get(type.id);
    if (type.parentId === null || type.parentId === undefined) {
      rootTypes.push(typeNode);
    } else {
      const parent = typeMap.get(type.parentId);
      if (parent) {
        parent.children.push(typeNode);
      }
    }
  });

  return rootTypes;
}

// 运行验证
if (require.main === module) {
  verifyMigration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyMigration };

