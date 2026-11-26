const fs = require("node:fs");
const path = require("node:path");

/**
 * Loads the app's .env without printing secrets. PM2 passes these values to the
 * Next.js process; PORT can be changed per server so Awarely can coexist with
 * other apps (the default 3000 is often already taken on shared VPSs).
 */
function loadEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const env = loadEnv(path.join(__dirname, ".env"));

module.exports = {
  apps: [
    {
      name: "awarely",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      interpreter: "node",
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
        PORT: env.PORT || "3000",
        HOSTNAME: env.HOSTNAME || "127.0.0.1",
        ...env,
      },
    },
  ],
};
