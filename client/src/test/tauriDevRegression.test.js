import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeTauriViteEnvResponse } from "../../scripts/tauri-vite-env-fix.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoClientRoot = path.resolve(__dirname, "..", "..");

describe("Tauri dev env regression", () => {
  it("normalizes malformed /@vite/env double-quoted random define key", () => {
    const input = [
      "const context = (() => {})();",
      'const defines = {""4_wkYE8cIqZ1"": \'\', "global": globalThis};',
      "Object.keys(defines).forEach((key) => key);",
    ].join("\n");

    const output = normalizeTauriViteEnvResponse(input);

    expect(output).not.toContain('{""4_wkYE8cIqZ1"":');
    expect(output).toContain('const defines = {"global": globalThis};');
    expect(output).toContain("defines[String.fromCharCode(");
    expect(output).toContain(")] = '';");
  });

  it("leaves non-env scripts unchanged", () => {
    const input = "console.log('ok')";
    expect(normalizeTauriViteEnvResponse(input)).toBe(input);
  });
});

describe("Tauri dev configuration regression", () => {
  it("uses built-in Tauri dev server instead of Vite devUrl", () => {
    const tauriConfigPath = path.join(
      repoClientRoot,
      "src-tauri",
      "tauri.conf.json",
    );
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));

    expect(tauriConfig.build.frontendDist).toBe("../dist");
    expect(tauriConfig.build.devUrl).toBeNull();
    expect(tauriConfig.build.beforeDevCommand).toBe("npm run build -- --watch");
    expect(tauriConfig.build.beforeBuildCommand).toBe("npm run build");
  });
});
