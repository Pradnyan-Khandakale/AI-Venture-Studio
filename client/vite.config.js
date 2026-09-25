import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function freePort5000() {
  try {
    const out = execSync("netstat -ano -p tcp | findstr :5000", { encoding: "utf8" });
    for (const line of out.split("\n")) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && !isNaN(Number(pid)) && pid !== "0") {
        try { execSync(`taskkill /F /PID ${pid}`); } catch (_) {}
      }
    }
  } catch (_) {}
}

function backendRunner() {
  return {
    name: "backend-runner",
    configureServer() {
      freePort5000();
      spawn("node", ["src/index.js"], {
        cwd: path.resolve(__dirname, "../server"),
        stdio: "inherit"
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), backendRunner()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000"
    }
  }
});


