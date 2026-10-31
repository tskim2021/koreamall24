
module.exports = {
  apps: [{
    name: 'cocokusuri',
    script: '/var/www/cocokusuri/app/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 3002 },
    error_file: '/var/www/cocokusuri/logs/error.log',
    out_file: '/var/www/cocokusuri/logs/out.log'
  }]
};

