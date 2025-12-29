const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名不能超过20个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少需要6个字符']
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'sales'],
    default: 'sales',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 在保存前生成整数 id 和加密密码
userSchema.pre('save', async function(next) {
  // 如果是新文档且没有 id，则生成递增的整数 id
  if (this.isNew && !this.id) {
    try {
      const User = this.constructor;
      // 只查找有 id 字段且 id 为数字的用户，按 id 降序排列
      const lastUser = await User.findOne({ 
        id: { $exists: true, $ne: null, $type: 'number' } 
      }).sort({ id: -1 }).exec();
      
      // 如果存在用户且有有效的 id，id 为最大值 + 1，否则从 1 开始
      if (lastUser && typeof lastUser.id === 'number' && !isNaN(lastUser.id)) {
        this.id = lastUser.id + 1;
      } else {
        this.id = 1;
      }
      
      console.log('生成新的用户 ID:', this.id); // 调试日志
    } catch (error) {
      console.error('生成 ID 时出错:', error); // 调试日志
      return next(error);
    }
  }
  
  // 加密密码
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 比较密码的方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

