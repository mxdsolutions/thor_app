#!/usr/bin/env node
/**
 * Run Next dev from web_admin directory so the app router resolves correctly
 * when the monorepo root or Cursor workspace is the parent folder.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webAdminRoot = path.resolve(__dirname, "..");

process.chdir(webAdminRoot);

const child = spawn(
  "npx",
  ["next", "dev", "--turbopack", "--port", "8005", "--hostname", "127.0.0.1"],
  {
    stdio: "inherit",
    shell: true,
    cwd: webAdminRoot,
    env: { ...process.env, FORCE_COLOR: "1" },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
