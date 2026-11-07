import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/WhiteLabelApps.jsx", import.meta.url), "utf8");
const viteConfig = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("WhiteLabelApps importa React para compatibilidade com JSX clássico", () => {
  assert.match(source, /import\s+React\s*,\s*\{[^}]*\}\s+from\s+["']react["']/);
  assert.match(source, /export\s+default\s+function\s+WhiteLabelApps/);
});

test("Vite utiliza plugin React e runtime JSX automático", () => {
  assert.match(viteConfig, /import\s+react\s+from\s+["']@vitejs\/plugin-react["']/);
  assert.match(viteConfig, /plugins\s*:\s*\[react\(\)\]/);
  assert.ok(packageJson.devDependencies?.["@vitejs/plugin-react"]);
});
