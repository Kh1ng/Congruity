/// <reference types="vitest" />
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { normalizeTauriViteEnvResponse } from "./scripts/tauri-vite-env-fix.js";

function tauriDefineSanitizer() {
  const macroDefineKeyPattern = /^__.*__$/;
  const simpleBareWordPattern = /^[A-Za-z0-9_]+$/;
  const sanitizeDefines = (defineMap = {}) => {
    for (const [key, value] of Object.entries({ ...defineMap })) {
      // Some tooling (observed with Tauri dev) injects define keys as already-quoted
      // string literals, e.g. "\"random-key\"". Vite's /@vite/env serializer then
      // double-quotes them and produces invalid JS: {""random-key"": ''}.
      if (typeof key === "string" && key.startsWith('"') && key.endsWith('"')) {
        try {
          const normalizedKey = JSON.parse(key);
          if (typeof normalizedKey === "string" && normalizedKey.length > 0) {
            defineMap[normalizedKey] = value;
            delete defineMap[key];
          }
        } catch {
          // Ignore malformed quoted keys and leave them unchanged.
        }
      }

      if (typeof value !== "string") continue;
      if (!macroDefineKeyPattern.test(key)) continue;

      // Tauri may inject runtime keys as raw strings into Vite define. If a key
      // lands here unquoted, Vite's generated /@vite/env module becomes invalid JS.
      if (simpleBareWordPattern.test(value)) {
        defineMap[key] = JSON.stringify(value);
      }
    }

    if (process.env.DEBUG_VITE_DEFINES === "1") {
      const suspicious = Object.entries(defineMap)
        .filter(
          ([key, value]) =>
            (typeof value === "string" && simpleBareWordPattern.test(value)) ||
            (typeof key === "string" && key.startsWith('"') && key.endsWith('"')),
        )
        .map(([key, value]) => ({ key, value }));
      // eslint-disable-next-line no-console
      console.log("[vite-config] suspicious bareword define values", suspicious);
    }
  };

  return {
    name: "tauri-define-sanitizer",
    configResolved(config) {
      sanitizeDefines(config.define);
    },
    configureServer(server) {
      sanitizeDefines(server.config.define);

      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/@vite/env")) {
          next();
          return;
        }

        let body = "";
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);

        res.write = (chunk, ...args) => {
          if (chunk) {
            body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
            return true;
          }
          return originalWrite(chunk, ...args);
        };

        res.end = (chunk, ...args) => {
          if (chunk) {
            body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
          }

          body = normalizeTauriViteEnvResponse(body);

          return originalEnd(body, ...args);
        };

        next();
      });
    },
  };
}

export default defineConfig(() => {
  const certPath = path.resolve(__dirname, ".cert/dev-cert.pem");
  const keyPath = path.resolve(__dirname, ".cert/dev-key.pem");
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);
  const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  const tauriOriginPattern = /^(tauri:\/\/localhost|https?:\/\/tauri\.localhost)$/;

  return {
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      cors: {
        origin(origin, callback) {
          // Allow same-origin/no-origin requests plus local browser + Tauri dev webview origins.
          if (
            !origin ||
            localhostOriginPattern.test(origin) ||
            tauriOriginPattern.test(origin)
          ) {
            callback(null, true);
            return;
          }
          callback(new Error(`Blocked by Vite dev CORS: ${origin}`));
        },
      },
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
    plugins: [tauriDefineSanitizer(), viteReact()],
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
      __WS_TOKEN__: "''", // Mock WebSocket token for Supabase Realtime
      global: "globalThis",
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
