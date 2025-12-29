module.exports = {
  apps: [
    {
      name: 'api-fuyou',
      script: './src/app.js',
      instances: 1, // 实例数量，1 为单实例，'max' 为 CPU 核心数
      exec_mode: 'fork', // 执行模式：fork（单实例）或 cluster（集群）
      // watch: false, // 生产环境建议关闭文件监听
      autorestart: true, // 自动重启
      max_restarts: 10, // 最大重启次数
      min_uptime: '10s', // 最小运行时间，少于此时长视为异常重启
      max_memory_restart: '500M', // 内存超过限制时自动重启
      error_file: './logs/pm2-error.log', // 错误日志路径
      out_file: './logs/pm2-out.log', // 输出日志路径
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z', // 日志日期格式
      merge_logs: true, // 合并日志
      // env: {
      //   NODE_ENV: 'production',
      //   PORT: 3000, // 默认端口
      // },
      // env_development: {
      //   NODE_ENV: 'development',
      //   PORT: 3000,
      // },
    },
  ],
}
