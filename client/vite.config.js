/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const certPath = path.resolve(__dirname, ".cert/dev-cert.pem");
  const keyPath = path.resolve(__dirname, ".cert/dev-key.pem");
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

  return {
    server: {
      host: "127.0.0.1",
      cors: false,
      https: hasCerts
        ? {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          }
        : false,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    plugins: [viteReact()],
    css: {
      postcss: "./postcss.config.js",
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        plugins: [],
      },
    },
    define: {
      "import.meta.env": env,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.js"],
      include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        thresholds: {
          statements: 50,
          lines: 50,
          functions: 50,
          branches: 40,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: "buffer",
      },
    },
  };
});
