#!/usr/bin/env node
/**
 * Copies public/ and .next/static into the standalone output so PM2 can run
 * `.next/standalone/server.js` without Docker.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error(
    "Missing .next/standalone. Run `npm run build` before preparing the standalone bundle."
  );
  process.exit(1);
}

const publicSource = path.join(root, "public");
const publicTarget = path.join(standalone, "public");
if (fs.existsSync(publicSource)) {
  fs.rmSync(publicTarget, { recursive: true, force: true });
  fs.cpSync(publicSource, publicTarget, { recursive: true });
}

const staticSource = path.join(root, ".next", "static");
const staticTarget = path.join(standalone, ".next", "static");
fs.rmSync(staticTarget, { recursive: true, force: true });
fs.cpSync(staticSource, staticTarget, { recursive: true });

console.log("Standalone assets prepared:");
console.log("  public ->", publicTarget);
console.log("  static ->", staticTarget);
