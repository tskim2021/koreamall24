// Application secrets are loaded from the untracked .env by server/_core/index.ts.
module.exports = {
  apps: [{
    name: "koreamall24",
    cwd: __dirname,
    script: "./dist/index.js",
    instances: 1,
    exec_mode: "fork",
    env: { NODE_ENV: "production", PORT: 3000 },
    autorestart: true,
    watch: false,
    time: true,
  }],
};
