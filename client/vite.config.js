import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function freePort5000() {
  if (process.platform !== "win32") return;
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
      if (process.env.VITE_DISABLE_AUTO_BACKEND === "true") return;
      freePort5000();
      try {
        spawn("node", ["src/index.js"], {
          cwd: path.resolve(__dirname, "../server"),
          stdio: "inherit"
        });
      } catch (_) {}
    }
  };
}

export default defineConfig({
  plugins: [react(), backendRunner()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts-vendor";
          }
          if (id.includes("react-flow-renderer")) {
            return "flow-vendor";
          }
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("\\react\\")) {
            return "react-vendor";
          }
          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000"
    }
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000"
    }
  }
});


