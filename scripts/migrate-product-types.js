const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// 导入模型
const ProductType = require('../src/models/ProductType');
const Product = require('../src/models/Product');

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mairui';

// 原始产品类型数据（从 productController.js 中提取）
const ORIGINAL_PRODUCT_TYPES = [
  {
    label: 'ELISA试剂盒',
    value: 'elisa_kit',
    hasDetails: false,
    children: [
      { label: '猪 ELISA科研试剂盒', value: 'elisa_kit_pig' },
      { label: '大鼠 ELISA科研试剂盒', value: 'elisa_kit_rat' },
      { label: '小鼠 ELISA科研试剂盒', value: 'elisa_kit_mouse' },
      { label: '猫 ELISA科研试剂盒', value: 'elisa_kit_cat' },
      { label: '牛 ELISA科研试剂盒', value: 'elisa_kit_cattle' },
      { label: '山羊/绵羊 ELISA科研试剂盒', value: 'elisa_kit_goat_sheep' },
      { label: '鸡 ELISA科研试剂盒', value: 'elisa_kit_chicken' },
      { label: '兔 ELISA科研试剂盒', value: 'elisa_kit_rabbit' },
      { label: '鱼 ELISA科研试剂盒', value: 'elisa_kit_fish' },
      { label: '犬 ELISA科研试剂盒', value: 'elisa_kit_dog' },
      { label: '农残 ELISA科研试剂盒 (竞争法)', value: 'elisa_kit_pesticide_residue' },
      { label: '昆虫 ELISA科研试剂盒', value: 'elisa_kit_insect' },
      { label: '其它 ELISA科研试剂盒 (马/豚鼠/鸭)', value: 'elisa_kit_other' },
      { label: '人 ELISA科研试剂盒', value: 'elisa_kit_human' }
    ]
  },
  { label: '重组兔单克隆抗体', value: 'research_test_reagent', hasDetails: true },
  { label: 'TSA荧光多标试剂盒', value: 'tyramide_tsa_kit', hasDetails: false }
  // 注意：'其他' 类型不再需要，已移除
];

/**
 * 迁移产品类型数据
 */
async function migrateProductTypes() {
  try {
    console.log('开始连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    // 检查是否已经迁移过
    const existingTypes = await ProductType.countDocuments();
    if (existingTypes > 0) {
      console.log(`\n警告: 数据库中已存在 ${existingTypes} 个产品类型`);
      console.log('如果继续，将跳过已存在的类型');
    }

    // 创建映射表：oldValue -> newId
    const valueToIdMap = new Map();
    let typeIdCounter = 1;

    // 先创建父类型
    console.log('\n开始创建父类型...');
    for (const parentType of ORIGINAL_PRODUCT_TYPES) {
      // 跳过 'other' 类型（根据计划，不需要迁移）
      if (parentType.value === 'other') {
        console.log(`跳过类型: ${parentType.label} (${parentType.value})`);
        continue;
      }

      // 检查是否已存在
      const existing = await ProductType.findOne({ label: parentType.label });
      if (existing) {
        console.log(`类型已存在: ${parentType.label} (ID: ${existing.id})`);
        valueToIdMap.set(parentType.value, existing.id);
        continue;
      }

      // 创建父类型
      const parentTypeDoc = new ProductType({
        id: typeIdCounter++,
        label: parentType.label,
        parentId: null,
        hasDetails: parentType.hasDetails || false
      });

      await parentTypeDoc.save();
      valueToIdMap.set(parentType.value, parentTypeDoc.id);
      console.log(`创建父类型: ${parentType.label} (ID: ${parentTypeDoc.id}, value: ${parentType.value})`);

      // 创建子类型
      if (parentType.children && parentType.children.length > 0) {
        console.log(`  创建 ${parentType.children.length} 个子类型...`);
        for (const childType of parentType.children) {
          // 检查是否已存在
          const existingChild = await ProductType.findOne({ label: childType.label });
          if (existingChild) {
            console.log(`    子类型已存在: ${childType.label} (ID: ${existingChild.id})`);
            valueToIdMap.set(childType.value, existingChild.id);
            continue;
          }

          const childTypeDoc = new ProductType({
            id: typeIdCounter++,
            label: childType.label,
            parentId: parentTypeDoc.id,
            hasDetails: false
          });

          await childTypeDoc.save();
          valueToIdMap.set(childType.value, childTypeDoc.id);
          console.log(`    创建子类型: ${childType.label} (ID: ${childTypeDoc.id}, value: ${childType.value})`);
        }
      }
    }

    console.log('\n产品类型迁移完成！');
    console.log('\n映射表:');
    valueToIdMap.forEach((id, value) => {
      console.log(`  ${value} -> ${id}`);
    });

    return valueToIdMap;
  } catch (error) {
    console.error('迁移产品类型失败:', error);
    throw error;
  }
}

/**
 * 迁移产品数据：将 type 字段从 value 改为 id
 */
async function migrateProducts(valueToIdMap) {
  try {
    console.log('\n开始迁移产品数据...');

    // 查询所有产品
    const products = await Product.find({});
    console.log(`找到 ${products.length} 个产品`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const product of products) {
      try {
        // 如果 type 已经是数字，跳过
        if (typeof product.type === 'number') {
          skippedCount++;
          continue;
        }

        // 查找对应的新 ID
        const newId = valueToIdMap.get(product.type);
        if (!newId) {
          console.warn(`警告: 产品 ${product.id} (${product.productNo}) 的类型 "${product.type}" 没有对应的映射`);
          errorCount++;
          errors.push({
            productId: product.id,
            productNo: product.productNo,
            oldType: product.type,
            error: '类型映射不存在'
          });
          continue;
        }

        // 更新产品类型
        product.type = newId;
        await product.save();
        migratedCount++;

        if (migratedCount % 100 === 0) {
          console.log(`已迁移 ${migratedCount} 个产品...`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          productId: product.id,
          productNo: product.productNo,
          oldType: product.type,
          error: error.message
        });
        console.error(`迁移产品失败 ${product.id} (${product.productNo}):`, error.message);
      }
    }

    console.log('\n产品数据迁移完成！');
    console.log(`成功迁移: ${migratedCount} 个`);
    console.log(`跳过（已是数字）: ${skippedCount} 个`);
    console.log(`失败: ${errorCount} 个`);

    if (errors.length > 0) {
      console.log('\n错误详情:');
      errors.forEach(err => {
        console.log(`  产品 ${err.productId} (${err.productNo}): ${err.oldType} -> ${err.error}`);
      });
    }

    return {
      migratedCount,
      skippedCount,
      errorCount,
      errors
    };
  } catch (error) {
    console.error('迁移产品数据失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('========================================');
    console.log('产品类型数据迁移脚本');
    console.log('========================================\n');

    // 迁移产品类型
    const valueToIdMap = await migrateProductTypes();

    // 迁移产品数据
    const result = await migrateProducts(valueToIdMap);

    console.log('\n========================================');
    console.log('迁移完成！');
    console.log('========================================');
    console.log(`产品类型: ${valueToIdMap.size} 个`);
    console.log(`产品迁移: ${result.migratedCount} 个成功, ${result.skippedCount} 个跳过, ${result.errorCount} 个失败`);

    process.exit(0);
  } catch (error) {
    console.error('\n迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

// 运行迁移
if (require.main === module) {
  main();
}

module.exports = {
  migrateProductTypes,
  migrateProducts
};

