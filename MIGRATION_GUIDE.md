# 产品数据迁移指南

## 概述

本指南说明如何将主站（fuyou）中的产品数据迁移到 MongoDB 数据库中。

## 创建的文件

1. **AntibodyProduct 模型** (`src/models/AntibodyProduct.js`)
   - 用于存储抗体产品的详细信息
   - 包含所有抗体产品相关字段

2. **数据提取脚本** (`scripts/extract-data-to-json.js`)
   - 将 Vue store 文件（ES6 模块）转换为 JSON 格式
   - 支持提取 `productData.js` 和 `prodectData3.js`

3. **数据迁移脚本** (`scripts/migrate-products.js`)
   - 将 JSON 数据导入到 MongoDB
   - 自动去重、验证数据
   - 显示迁移统计信息

## 使用步骤

### 前置条件

1. 确保 MongoDB 已启动
2. 检查 `.env` 文件中的数据库连接配置：
   ```env
   MONGODB_URI=mongodb://localhost:27017/fuyou
   ```

### 步骤 1: 提取数据为 JSON

运行数据提取脚本，将 Vue store 文件转换为 JSON：

```bash
cd api-fuyou
npm run extract:data
```

这会在 `fuyou/src/store/modules/` 目录下生成：
- `productData.json` - 包含 ELISA试剂盒和酪酰胺试剂盒数据
- `prodectData3.json` - 包含抗体产品数据

**注意**: 如果自动提取失败，可以手动创建 JSON 文件。格式如下：

```json
{
  "data1": [
    {
      "货号": "FY-03156H1",
      "中文名称": "产品名称",
      "规格": "96T",
      "价格": 1500
    }
  ],
  "data2": [...]
}
```

### 步骤 2: 运行数据迁移

确保 JSON 文件已生成，然后运行迁移脚本：

```bash
npm run migrate:products
```

迁移过程会：
- 检查数据是否已存在（根据货号去重）
- 验证必填字段
- 显示迁移进度
- 输出统计信息

## 数据映射

### Product 模型

| 原字段 | 目标字段 | 类型 | 说明 |
|--------|---------|------|------|
| 货号 | productNo | String | 必填 |
| 中文名称 | cnName | String | |
| 规格 | productSpec | String | |
| 价格 | price | String | 转换为字符串 |
| - | type | String | data1→ELISA Kit, data2→Tyramide TSA Kit |

### AntibodyProduct 模型

所有字段都会映射到对应的英文字段名，详见模型定义。主要字段包括：

- `productNo` - 产品货号
- `productName` - 产品名称
- `category` - 二级分类
- `geneName` - 基因名称
- `proteinName` - 蛋白名称
- `recommendedApplication` - 推荐应用
- `reactiveSpecies` - 反应种属
- 等等...

## 迁移统计

迁移完成后会显示：

```
迁移完成！
成功迁移: 2335 个产品
跳过: 0 个产品（已存在）
错误: 0 个产品

产品类型统计:
  ELISA Kit: 2000 个
  Tyramide TSA Kit: 335 个
  抗体产品: 3 个
```

## 常见问题

### 1. 提取脚本失败

**问题**: `extract-data-to-json.js` 无法解析 Vue store 文件

**解决**: 
- 手动创建 JSON 文件
- 或者使用在线工具将 JavaScript 对象转换为 JSON

### 2. 数据库连接失败

**问题**: 无法连接到 MongoDB

**解决**:
- 检查 MongoDB 是否已启动
- 检查 `.env` 文件中的连接字符串
- 确认数据库名称和权限

### 3. 数据重复

**问题**: 迁移时提示数据已存在

**解决**: 
- 这是正常现象，脚本会自动跳过已存在的数据
- 如果想重新导入，先清空数据库或删除现有数据

### 4. 内存不足

**问题**: 迁移大量数据时内存溢出

**解决**:
- 分批迁移数据
- 增加 Node.js 内存限制: `node --max-old-space-size=4096 scripts/migrate-products.js`

## 备份建议

在迁移前，建议备份数据库：

```bash
# 使用 mongodump
mongodump --uri="mongodb://localhost:27017/fuyou" --out=./backup
```

## 后续步骤

迁移完成后：

1. 验证数据：检查数据库中的产品数量是否正确
2. 测试 API：确保产品接口正常工作
3. 更新前端：将前端改为从 API 获取数据，而不是使用本地 store

## 技术支持

如遇到问题，请检查：
1. 脚本输出的错误信息
2. MongoDB 日志
3. Node.js 控制台输出

