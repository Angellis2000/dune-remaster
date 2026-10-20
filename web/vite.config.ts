import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Хеш всего, что влияет на сетевую симуляцию: движок, сеть, мир (src/net/build.ts → SIM_BUILD). */
function simBuild(): string {
  const root = fileURLToPath(new URL("./src/", import.meta.url));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".ts")) files.push(path);
    }
  };
  for (const part of ["engine", "net"]) walk(join(root, part));
  files.push(join(root, "game", "world.ts"));
  const hash = createHash("sha256");
  for (const f of files) hash.update(f.slice(root.length).split("\\").join("/")).update(readFileSync(f, "utf8").replace(/\r\n/g, "\n"));
  return hash.digest("hex").slice(0, 16);
}

// base "./" — чтобы собранную игру можно было открыть из любой папки или со статического хостинга
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
  define: { __SIM_BUILD__: JSON.stringify(simBuild()) },
});
