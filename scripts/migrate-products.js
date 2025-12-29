const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 导入模型
const Product = require('../src/models/Product');

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fuyou';

// 产品类型映射
const TYPE_MAPPING = {
  'data1': 'elisa_kit',  // ELISA试剂盒
  'data2': 'tyramide_tsa_kit',  // 酪酰胺多色荧光染色试剂盒
};

/**
 * 解析 Vue store 文件（简单的字符串解析）
 */
function parseVueStoreFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 提取 data1, data2 或 data 数组
    const data1Match = content.match(/data1:\s*\[([\s\S]*?)\](?=\s*,\s*data2|$)/);
    const data2Match = content.match(/data2:\s*\[([\s\S]*?)\](?=\s*,\s*data|$)/);
    const dataMatch = content.match(/data:\s*\[([\s\S]*?)\](?=\s*\]\s*\)|$)/);
    
    const result = {};
    
    if (data1Match) {
      result.data1 = parseArrayString(data1Match[1]);
    }
    
    if (data2Match) {
      result.data2 = parseArrayString(data2Match[1]);
    }
    
    if (dataMatch) {
      result.data = parseArrayString(dataMatch[1]);
    }
    
    return result;
  } catch (error) {
    console.error(`解析文件失败 ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 解析数组字符串（简单的 JSON 解析）
 */
function parseArrayString(str) {
  try {
    // 尝试直接解析为 JSON
    return JSON.parse(`[${str}]`);
  } catch (error) {
    // 如果失败，尝试手动解析（处理中文键名等）
    console.warn('JSON 解析失败，尝试手动解析...');
    return parseArrayManually(str);
  }
}

/**
 * 手动解析数组（处理中文键名等特殊情况）
 */
function parseArrayManually(str) {
  const items = [];
  let currentItem = {};
  let currentKey = '';
  let currentValue = '';
  let inString = false;
  let stringChar = '';
  let braceDepth = 0;
  
  // 这是一个简化的解析器，对于复杂情况可能需要更完善的实现
  // 如果手动解析也失败，建议将数据转换为标准 JSON 格式
  console.warn('手动解析可能不完整，建议使用标准 JSON 格式');
  return [];
}

/**
 * 映射产品数据到 Product 模型
 */
function mapProductData(item, type) {
  return {
    productNo: item.货号 || '',
    cnName: item.中文名称 || '',
    productSpec: item.规格 || '',
    price: String(item.价格 || ''),
    type: type
  };
}

/**
 * 迁移产品数据
 */
async function migrateProducts() {
  try {
    // 连接数据库
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    // 读取数据文件
    const productDataPath = path.join(__dirname, '../../fuyou/src/store/modules/productData.js');

    console.log('\n正在读取数据文件...');
    
    // 读取 productData.js
    let productData = null;
    if (fs.existsSync(productDataPath)) {
      const content = fs.readFileSync(productDataPath, 'utf-8');
      // 使用 eval 执行（注意：仅用于迁移脚本，生产环境不推荐）
      // 更安全的方式是将数据转换为 JSON 文件
      try {
        // 提取 export default 的内容
        const exportMatch = content.match(/export default\s+({[\s\S]*})/);
        if (exportMatch) {
          // 将 ES6 语法转换为可执行的代码
          const code = exportMatch[1]
            .replace(/state:\s*\(\)\s*=>\s*\(/g, 'state: () => (')
            .replace(/data1:/g, '"data1":')
            .replace(/data2:/g, '"data2":')
            .replace(/(\w+):/g, '"$1":')  // 将键名加引号
            .replace(/'/g, '"');  // 单引号转双引号
          
          // 使用 vm 模块安全执行
          const vm = require('vm');
          const context = { module: { exports: {} } };
          vm.createContext(context);
          
          // 或者直接使用 require（如果文件是 CommonJS）
          // 这里我们使用更简单的方法：直接解析文件内容
        }
      } catch (error) {
        console.error('解析 productData.js 失败:', error.message);
        console.log('提示: 请确保数据文件格式正确，或将其转换为 JSON 格式');
      }
    }

    // 由于 Vue store 文件是 ES6 模块，我们需要另一种方法
    // 方案：创建一个临时的数据提取脚本或使用 babel 转换
    console.log('\n注意: Vue store 文件是 ES6 模块，需要特殊处理');
    console.log('建议: 将数据文件转换为 JSON 格式，或使用数据提取脚本');
    
    // 这里我们提供一个替代方案：直接读取并解析
    // 但更推荐的方式是创建一个数据提取脚本先转换数据
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // 如果数据已经转换为 JSON，可以直接读取
    const productDataJsonPath = path.join(__dirname, '../../fuyou/src/store/modules/productData.json');

    // 检查是否有 JSON 格式的数据文件
    if (fs.existsSync(productDataJsonPath)) {
      console.log('\n发现 JSON 格式的数据文件，开始迁移...');
      const jsonData = JSON.parse(fs.readFileSync(productDataJsonPath, 'utf-8'));
      
      // 迁移 data1 (ELISA试剂盒)
      if (jsonData.data1 && Array.isArray(jsonData.data1)) {
        console.log(`\n开始迁移 ELISA试剂盒 (data1)... 共 ${jsonData.data1.length} 条`);
        for (const item of jsonData.data1) {
          try {
            if (!item.货号) {
              console.warn('跳过无效数据（缺少货号）');
              totalErrors++;
              continue;
            }

            const existing = await Product.findOne({ productNo: item.货号 });
            if (existing) {
              totalSkipped++;
              continue;
            }

            const product = new Product(mapProductData(item, TYPE_MAPPING['data1']));
            await product.save();
            totalMigrated++;
            
            if (totalMigrated % 100 === 0) {
              console.log(`已迁移 ${totalMigrated} 个产品...`);
            }
          } catch (error) {
            console.error(`迁移产品失败 ${item.货号}:`, error.message);
            totalErrors++;
          }
        }
      }

      // 迁移 data2 (酪酰胺多色荧光染色试剂盒)
      if (jsonData.data2 && Array.isArray(jsonData.data2)) {
        console.log(`\n开始迁移 酪酰胺多色荧光染色试剂盒 (data2)... 共 ${jsonData.data2.length} 条`);
        for (const item of jsonData.data2) {
          try {
            if (!item.货号) {
              console.warn('跳过无效数据（缺少货号）');
              totalErrors++;
              continue;
            }

            const existing = await Product.findOne({ productNo: item.货号 });
            if (existing) {
              totalSkipped++;
              continue;
            }

            const product = new Product(mapProductData(item, TYPE_MAPPING['data2']));
            await product.save();
            totalMigrated++;
            
            if (totalMigrated % 100 === 0) {
              console.log(`已迁移 ${totalMigrated} 个产品...`);
            }
          } catch (error) {
            console.error(`迁移产品失败 ${item.货号}:`, error.message);
            totalErrors++;
          }
        }
      }
    }

    console.log(`\n迁移完成！`);
    console.log(`成功迁移: ${totalMigrated} 个产品`);
    console.log(`跳过: ${totalSkipped} 个产品（已存在）`);
    console.log(`错误: ${totalErrors} 个产品`);

    // 统计各类型产品数量
    const productStats = await Product.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    console.log('\n产品类型统计:');
    productStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} 个`);
    });

  } catch (error) {
    console.error('迁移过程出错:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

// 运行迁移
if (require.main === module) {
  migrateProducts();
}

module.exports = { migrateProducts };

