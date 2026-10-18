import { defineConfig } from "vite";
import { fileURLToPath } from "url";

export default defineConfig({
  // GitHub Pages publica em /nome-do-repo/ -> defina VITE_BASE no build (ver DEPLOY.md)
  base: (globalThis as any).process?.env?.VITE_BASE || "/",
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared/src", import.meta.url)),
    },
  },
  server: {
    host: true, // permite que colegas na mesma rede acessem pelo IP da sua máquina
    port: 5173,
    fs: { allow: [".."] },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 2000,
  },
});
