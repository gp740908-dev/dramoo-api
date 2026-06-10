// ecosystem.config.js
// PM2 Process Manager Configuration

module.exports = {
  apps: [
    {
      name: 'dramoo-api',
      script: 'src/app.js',
      instances: 2,                    // Gunakan 2 CPU core
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '5s',
    },
    {
      name: 'dramoo-bot',
      script: 'src/bot.js',
      instances: 1,                    // Bot harus 1 instance saja
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '150M',
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      restart_delay: 5000,
      max_restarts: 5,
    },
  ],
};
