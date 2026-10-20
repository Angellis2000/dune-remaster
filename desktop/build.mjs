// Сборка бета-exe: веб-игра (vite build) → desktop/app → electron-builder (один переносной exe в desktop/release).
// Запуск: cd desktop && npm install && npm run build
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, "..", "web");
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

run("npx tsc --noEmit", web);
run("npx vite build --emptyOutDir", web);
const app = path.join(here, "app");
if (existsSync(app)) rmSync(app, { recursive: true, force: true });
cpSync(path.join(web, "dist"), app, { recursive: true });
run("npx electron-builder --win portable --x64", here);
console.log("Готово: desktop/release/");
