const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    index: true
  },
  label: {
    type: String,
    required: [true, '类型标签不能为空'],
    trim: true
  },
  parentId: {
    type: Number,
    default: null,
    index: true,
    ref: 'ProductType'
  },
  hasDetails: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 在保存前生成整数 id
productTypeSchema.pre('save', async function(next) {
  // 更新 updatedAt
  this.updatedAt = new Date();
  
  // 如果是新文档且没有 id，则生成递增的整数 id
  if (this.isNew && !this.id) {
    try {
      const ProductType = this.constructor;
      // 只查找有 id 字段且 id 为数字的类型，按 id 降序排列
      const lastType = await ProductType.findOne({ 
        id: { $exists: true, $ne: null, $type: 'number' } 
      }).sort({ id: -1 }).exec();
      
      // 如果存在类型且有有效的 id，id 为最大值 + 1，否则从 1 开始
      if (lastType && typeof lastType.id === 'number' && !isNaN(lastType.id)) {
        this.id = lastType.id + 1;
      } else {
        this.id = 1;
      }
      
      console.log('生成新的产品类型 ID:', this.id); // 调试日志
    } catch (error) {
      console.error('生成 ID 时出错:', error); // 调试日志
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('ProductType', productTypeSchema);

