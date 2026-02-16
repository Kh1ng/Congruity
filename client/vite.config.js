/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "path";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const certPath = path.resolve(__dirname, ".cert/dev-cert.pem");
  const keyPath = path.resolve(__dirname, ".cert/dev-key.pem");
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

  return {
    server: {
      https: hasCerts
        ? {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          }
        : false,
      host: true,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    plugins: [
      viteReact(),
      nodePolyfills({
        include: ["path"],
        exclude: ["http"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        overrides: {
          fs: "memfs",
        },
        protocolImports: true,
      }),
    ],
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
    build: {
      entryPoints: ["src/index.js"],
      bundle: true,
      outfile: "dist/bundle.js",
      plugins: [
        polyfillNode({
          // Options (optional)
        }),
      ],
    },
    define: {
      "import.meta.env": env,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.js"],
      include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: "buffer",
        stream: "stream-browserify",
        crypto: "crypto-browserify",
      },
    },
  };
});
