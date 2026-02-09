import { defineConfig, loadEnv } from "vite";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    server: {
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
    resolve: {
      alias: {
        buffer: "buffer",
        stream: "stream-browserify",
        crypto: "crypto-browserify",
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
  };
});
