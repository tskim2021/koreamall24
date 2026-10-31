module.exports = {
  apps: [
    {
      name: "koreamall24",
      script: "./dist/index.js",
    cwd: "/opt/koreamall24",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/koreamall24-error.log",
      out_file: "/var/log/pm2/koreamall24-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
    },
  ],
};
