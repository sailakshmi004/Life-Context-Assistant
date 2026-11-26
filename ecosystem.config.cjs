/**
 * PM2 process definition for native VPS deployment (Nginx + Node).
 *
 * Run from the repository root:
 *   pm2 start ecosystem.config.cjs
 *
 * Keep instances at 1: the login rate limiter and notification sync lock are
 * process-local. Nginx is the public entry point; the app listens on loopback.
 */
module.exports = {
  apps: [
    {
      name: "awarely",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      interpreter: "node",
      interpreter_args: "--env-file=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 5000,
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
