const path = require('path');

/**
 * 获取当前版本目录名称
 * 从环境变量 VERSION_DIR 或当前工作目录推断
 */
const getVersionDir = () => {
  // 如果设置了 VERSION_DIR 环境变量，使用它
  if (process.env.VERSION_DIR) {
    return process.env.VERSION_DIR;
  }
  // 否则从当前工作目录推断（支持 v1, v2, current 等）
  const cwd = process.cwd();
  const match = cwd.match(/\/(v\d+|current)\//);
  return match ? match[1] : 'default';
};

/**
 * 获取 .env 文件路径
 * 优先级：1. ENV_FILE 环境变量  2. 项目目录下的 .env
 */
const getEnvFilePath = () => {
  // 如果设置了 ENV_FILE 环境变量，使用它（服务器上可以设置共享的 .env）
  if (process.env.ENV_FILE) {
    return process.env.ENV_FILE;
  }
  // 否则使用项目目录下的 .env（本地开发或默认情况）
  return path.resolve(__dirname, '.env');
};

const versionDir = getVersionDir();
const logBaseDir = '/var/log/pm2/api-mairui'; // 统一的日志基础目录
const logDir = path.join(logBaseDir, versionDir);
const sharedEnvPath = getEnvFilePath();

module.exports = {
  apps: [
    {
      name: 'api-mairui',
      script: './src/app.js',
      instances: 1, // 实例数量，1 为单实例，'max' 为 CPU 核心数
      exec_mode: 'fork', // 执行模式：fork（单实例）或 cluster（集群）
      // watch: false, // 生产环境建议关闭文件监听
      autorestart: true, // 自动重启
      max_restarts: 10, // 最大重启次数
      min_uptime: '10s', // 最小运行时间，少于此时长视为异常重启
      max_memory_restart: '500M', // 内存超过限制时自动重启
      // 使用绝对路径，按版本分目录，确保切换版本时日志不丢失
      error_file: path.join(logDir, 'pm2-error.log'),
      out_file: path.join(logDir, 'pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z', // 日志日期格式
      merge_logs: true, // 合并日志
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 3000,
        // 指定共享的 .env 文件路径
        ENV_FILE: sharedEnvPath,
        // 记录当前版本目录
        VERSION_DIR: versionDir,
      },
      // env_development: {
      //   NODE_ENV: 'development',
      //   PORT: 3000,
      //   ENV_FILE: sharedEnvPath,
      //   VERSION_DIR: versionDir,
      // },
    }
  ]
}
