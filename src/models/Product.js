const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    index: true
  },
  productNo: {
    type: String,
    required: [true, '货号不能为空'],
    trim: true
  },
  cnName: {
    type: String,
    trim: true
  },
  productSpec: {
    type: String,
    trim: true
  },
  price: {
    type: String,
    trim: true
  },
  type: {
    type: Number,
    required: [true, '产品类型不能为空'],
    index: true,
    ref: 'ProductType' // 引用 ProductType 模型的 id
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 在保存前生成整数 id
productSchema.pre('save', async function(next) {
  // 如果是新文档且没有 id，则生成递增的整数 id
  if (this.isNew && !this.id) {
    try {
      const Product = this.constructor;
      // 只查找有 id 字段且 id 为数字的产品，按 id 降序排列
      const lastProduct = await Product.findOne({ 
        id: { $exists: true, $ne: null, $type: 'number' } 
      }).sort({ id: -1 }).exec();
      
      // 如果存在产品且有有效的 id，id 为最大值 + 1，否则从 1 开始
      if (lastProduct && typeof lastProduct.id === 'number' && !isNaN(lastProduct.id)) {
        this.id = lastProduct.id + 1;
      } else {
        this.id = 1;
      }
      
      console.log('生成新的产品 ID:', this.id); // 调试日志
    } catch (error) {
      console.error('生成 ID 时出错:', error); // 调试日志
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);

