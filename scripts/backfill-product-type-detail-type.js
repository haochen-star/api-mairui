/**
 * 一次性：将 hasDetails 为 true 但 detailType 缺失或非 0/1 的产品类型订正为 detailType: 0（抗体）
 *
 * 用法（在 api-mairui 目录下）：
 *   npm run migrate:product-type-detail-type
 */

const mongoose = require('mongoose')
const path = require('path')

require('dotenv').config({
  path: path.join(__dirname, '../.env')
})

const ProductType = require('../src/models/ProductType')

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI 未配置')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  const filter = {
    hasDetails: true,
    $or: [
      { detailType: { $exists: false } },
      { detailType: null },
      { detailType: { $nin: [0, 1] } }
    ]
  }

  const result = await ProductType.updateMany(filter, { $set: { detailType: 0 } })

  console.log(
    `匹配 ${result.matchedCount} 条，修改 ${result.modifiedCount} 条（detailType -> 0）`
  )

  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
