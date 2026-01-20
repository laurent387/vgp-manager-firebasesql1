// PM2 Ecosystem Configuration
// Alternative to Docker for process management

module.exports = {
  apps: [
    {
      name: 'vgp-api',
      script: 'backend/server.ts',
      interpreter: 'bun',
      
      // Instances (cluster mode)
      instances: 'max', // or specific number like 2
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/vgp-api/error.log',
      out_file: '/var/log/vgp-api/out.log',
      merge_logs: true,
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      
      // Watch (disable in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Memory restart
      max_memory_restart: '500M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
