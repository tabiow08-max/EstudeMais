import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // caminhos relativos: o app funciona em qualquer endereço (ex.: GitHub Pages em /EstudeMais/)
  base: "./",
  plugins: [react()],
  define: { __ARTIFACT__: "false" },
  server: {
    host: true,
    proxy: { "/api": "http://localhost:8787" },
  },
});
