# 数据迁移脚本说明

## 概述

这些脚本用于将主站（fuyou）中的产品数据迁移到 MongoDB 数据库中。

## 文件说明

- `extract-data-to-json.js`: 将 Vue store 文件（ES6 模块）转换为 JSON 格式
- `migrate-products.js`: 将 JSON 数据迁移到 MongoDB

## 使用步骤

### 步骤 1: 提取数据为 JSON

由于 Vue store 文件是 ES6 模块格式，需要先转换为 JSON：

```bash
npm run extract:data
```

这会将以下文件转换为 JSON：
- `fuyou/src/store/modules/productData.js` → `productData.json`
- `fuyou/src/store/modules/prodectData3.js` → `prodectData3.json`

**注意**: 如果自动提取失败，可以手动创建 JSON 文件：

1. 打开 Vue store 文件
2. 复制 `data1`, `data2`, `data` 数组的内容
3. 创建对应的 JSON 文件，格式如下：

```json
{
  "data1": [...],
  "data2": [...]
}
```

### 步骤 2: 运行迁移脚本

确保 MongoDB 已启动，并且 `.env` 文件中配置了正确的数据库连接：

```bash
npm run migrate:products
```

## 数据映射

### Product 模型（ELISA试剂盒、酪酰胺试剂盒）

- `货号` → `productNo`
- `中文名称` → `cnName`
- `规格` → `productSpec`
- `价格` → `price` (转换为字符串)
- `type`: 
  - data1 → `ELISA Kit`
  - data2 → `Tyramide TSA Kit`

### AntibodyProduct 模型（抗体产品）

所有字段都会映射到对应的英文字段名，详见 `AntibodyProduct.js` 模型定义。

## 注意事项

1. **去重**: 脚本会根据 `productNo` 检查是否已存在，避免重复导入
2. **数据验证**: 缺少必填字段（如货号）的数据会被跳过
3. **错误处理**: 迁移过程中的错误会被记录，但不会中断整个迁移过程
4. **备份**: 建议在迁移前备份数据库

## 迁移统计

迁移完成后会显示：
- 成功迁移的产品数量
- 跳过的产品数量（已存在）
- 错误的产品数量
- 各类型产品的统计信息

