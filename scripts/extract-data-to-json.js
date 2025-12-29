const fs = require('fs');
const path = require('path');
const vm = require('vm');

/**
 * 从 Vue store 文件中提取数据并转换为 JSON
 * 使用 eval 方法（仅用于数据迁移）
 */
function extractDataFromVueStore(filePath, outputPath) {
  try {
    console.log(`正在读取文件: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 创建一个安全的上下文来执行代码
    const context = {
      module: { exports: {} },
      exports: {},
      console: console,
      require: require
    };
    
    // 提取 export default 的内容
    // 将 ES6 模块转换为可执行的代码
    let executableCode = content;
    
    // 替换 export default
    executableCode = executableCode.replace(/export\s+default\s+/, 'module.exports = ');
    
    // 执行代码获取数据
    try {
      vm.createContext(context);
      vm.runInContext(executableCode, context);
      
      const storeModule = context.module.exports;
      const result = {};
      
      // 获取 state 数据
      let stateData = null;
      if (typeof storeModule === 'function') {
        // 如果是函数，执行它
        stateData = storeModule().state();
      } else if (storeModule && storeModule.state) {
        if (typeof storeModule.state === 'function') {
          stateData = storeModule.state();
        } else {
          stateData = storeModule.state;
        }
      }
      
      if (!stateData) {
        throw new Error('无法获取 state 数据');
      }
      
      // 提取 data1, data2, data
      if (stateData.data1) {
        result.data1 = stateData.data1;
        console.log(`提取 data1: ${result.data1.length} 条记录`);
      }
      
      if (stateData.data2) {
        result.data2 = stateData.data2;
        console.log(`提取 data2: ${result.data2.length} 条记录`);
      }
      
      if (stateData.data) {
        result.data = stateData.data;
        console.log(`提取 data: ${result.data.length} 条记录`);
      }
      
      // 保存为 JSON
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`数据已保存到: ${outputPath}`);
      
      return result;
    } catch (evalError) {
      console.warn('使用 eval 方法失败，尝试正则表达式提取:', evalError.message);
      return extractUsingRegex(content, outputPath);
    }
  } catch (error) {
    console.error(`提取数据失败: ${error.message}`);
    throw error;
  }
}

/**
 * 使用正则表达式提取数据（备用方法）
 */
function extractUsingRegex(content, outputPath) {
  const result = {};
  
  // 提取 data1
  const data1Match = content.match(/data1:\s*\[([\s\S]*?)\](?=\s*,\s*data2|$)/);
  if (data1Match) {
    try {
      // 使用 eval 解析（仅用于数据迁移）
      const data1Code = `[${data1Match[1]}]`;
      result.data1 = eval(`(${data1Code})`);
      console.log(`提取 data1: ${result.data1.length} 条记录`);
    } catch (error) {
      console.warn('解析 data1 失败:', error.message);
    }
  }
  
  // 提取 data2
  const data2Match = content.match(/data2:\s*\[([\s\S]*?)\](?=\s*,\s*data|$)/);
  if (data2Match) {
    try {
      const data2Code = `[${data2Match[1]}]`;
      result.data2 = eval(`(${data2Code})`);
      console.log(`提取 data2: ${result.data2.length} 条记录`);
    } catch (error) {
      console.warn('解析 data2 失败:', error.message);
    }
  }
  
  // 提取 data
  const dataMatch = content.match(/data:\s*\[([\s\S]*?)\](?=\s*\]\s*\)|$)/);
  if (dataMatch) {
    try {
      const dataCode = `[${dataMatch[1]}]`;
      result.data = eval(`(${dataCode})`);
      console.log(`提取 data: ${result.data.length} 条记录`);
    } catch (error) {
      console.warn('解析 data 失败:', error.message);
    }
  }
  
  if (Object.keys(result).length > 0) {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`数据已保存到: ${outputPath}`);
  }
  
  return result;
}


/**
 * 主函数
 */
function main() {
  const basePath = path.join(__dirname, '../../fuyou/src/store/modules');
  
  // 提取 productData.js
  const productDataPath = path.join(basePath, 'productData.js');
  const productDataOutputPath = path.join(basePath, 'productData.json');
  
  if (fs.existsSync(productDataPath)) {
    console.log('\n=== 提取 productData.js ===');
    try {
      extractDataFromVueStore(productDataPath, productDataOutputPath);
    } catch (error) {
      console.error('提取 productData.js 失败:', error.message);
      console.log('提示: 如果自动提取失败，可以手动将数据转换为 JSON 格式');
    }
  } else {
    console.log(`文件不存在: ${productDataPath}`);
  }
  
  // 提取 prodectData3.js
  const antibodyDataPath = path.join(basePath, 'prodectData3.js');
  const antibodyDataOutputPath = path.join(basePath, 'prodectData3.json');
  
  if (fs.existsSync(antibodyDataPath)) {
    console.log('\n=== 提取 prodectData3.js ===');
    try {
      extractDataFromVueStore(antibodyDataPath, antibodyDataOutputPath);
    } catch (error) {
      console.error('提取 prodectData3.js 失败:', error.message);
      console.log('提示: 如果自动提取失败，可以手动将数据转换为 JSON 格式');
    }
  } else {
    console.log(`文件不存在: ${antibodyDataPath}`);
  }
  
  console.log('\n数据提取完成！');
  console.log('现在可以运行迁移脚本: npm run migrate:products');
}

if (require.main === module) {
  main();
}

module.exports = { extractDataFromVueStore };

