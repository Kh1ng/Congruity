import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const staged = args.includes("--staged");

const diffArgs = staged ? ["--cached"] : ["HEAD"];
const cmd = [
  "git",
  "diff",
  "--name-only",
  "--diff-filter=ACMRTUXB",
  ...diffArgs,
  "--",
  "*.js",
  "*.jsx",
].join(" ");

let output = "";
try {
  output = execSync(cmd, { encoding: "utf8" }).trim();
} catch {
  output = "";
}

const files = output
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => !file.includes("node_modules"));

if (!files.length) {
  console.log("No changed JS/JSX files to lint.");
  process.exit(0);
}

const eslintCmd = ["npx", "eslint", "--max-warnings=0", "--", ...files].join(" ");
execSync(eslintCmd, { stdio: "inherit" });
