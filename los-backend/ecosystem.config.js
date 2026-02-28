module.exports = {
  apps: [
    /**
     * ===============================
     * 🚀 API CLUSTER WORKERS
     * ===============================
     */
    {
      name: 'los-backend-api',
      script: './dist/main.js',

      // Run 3 API workers (balanced for 15GB RAM)
      instances: 2,
      exec_mode: 'cluster',

      // Allow up to 4GB heap per worker
      node_args: '--max_old_space_size=4096 --max-http-header-size=100000',

      env: {
        NODE_ENV: 'production',
        ENABLE_CRON_JOBS: 'false',
      },

      // Restart only if worker exceeds 3GB
      max_memory_restart: '3G',

      autorestart: true,
      watch: false,

      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Graceful shutdown
      listen_timeout: 15000,
      kill_timeout: 15000,
    },

    /**
     * ===============================
     * 🕒 DEDICATED CRON WORKER
     * ===============================
     */
    {
      name: 'los-backend-cron-worker',
      script: './dist/main.js',

      instances: 1,
      exec_mode: 'fork',

      // 3GB heap for batch jobs / fraud scans
      node_args: '--max_old_space_size=3072 --max-http-header-size=100000',

      env: {
        NODE_ENV: 'production',
        ENABLE_CRON_JOBS: 'true',
        CRON_WORKER: 'true',
      },

      // Restart only if exceeds 2GB
      max_memory_restart: '2G',

      autorestart: true,
      watch: false,

      error_file: 'logs/cron-worker-error.log',
      out_file: 'logs/cron-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      listen_timeout: 15000,
      kill_timeout: 15000,
    },
  ],
};