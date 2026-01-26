# 使用 Node.js 18 版本
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 先复制 package.json 和 package-lock.json
# 这样只有当这些文件更新时才会重新执行 npm install（利用 Docker 层缓存）
COPY package.json package-lock.json ./

# 安装依赖（生产环境依赖）
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 暴露端口（默认3000，可通过环境变量修改）
EXPOSE 3000

# 启动应用
CMD ["node", "src/app.js"]

