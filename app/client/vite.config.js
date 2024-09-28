// vite.config.js
import { defineConfig } from "vite";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    viteReact(),
    nodePolyfills({
      // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
      include: ["path"],
      // To exclude specific polyfills, add them to this list. Note: if include is provided, this has no effect
      exclude: [
        "http", // Excludes the polyfill for `http` and `node:http`.
      ],
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true,
      },
      // Override the default polyfills for specific modules.
      overrides: {
        // Since `fs` is not supported in browsers, we can use the `memfs` package to polyfill it.
        fs: "memfs",
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
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
});
