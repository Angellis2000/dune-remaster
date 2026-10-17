import { defineConfig } from "vite";

// base "./" — чтобы собранную игру можно было открыть из любой папки или со статического хостинга
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
});
