// Gera uma página única (HTML com CSS e JS embutidos) para publicar o app
// como Artifact no claude.ai. React vem do CDN; o resto vai no próprio HTML.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tmp = path.join(root, "dist-artifact", ".tmp");
const outFile = path.join(root, "dist-artifact", "estudemais.html");

await rm(tmp, { recursive: true, force: true });
await build({
  root,
  configFile: false,
  logLevel: "warn",
  plugins: [react({ jsxRuntime: "classic" })],
  define: { __ARTIFACT__: "true" },
  build: {
    outDir: tmp,
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: path.join(root, "src/main.tsx"),
      external: ["react", "react-dom", "react-dom/client"],
      output: {
        format: "iife",
        entryFileNames: "app.js",
        assetFileNames: "[name][extname]",
        globals: { react: "React", "react-dom": "ReactDOM", "react-dom/client": "ReactDOM" },
      },
    },
  },
});

const files = await readdir(tmp);
const js = await readFile(path.join(tmp, "app.js"), "utf8");
const cssFile = files.find((f) => f.endsWith(".css"));
const css = cssFile ? await readFile(path.join(tmp, cssFile), "utf8") : "";
if (/require\(|from\s*"react\/jsx-runtime"/.test(js)) throw new Error("bundle ainda importa módulos externos");

const html = `<title>EstudeMais</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
`;

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, html);
await rm(tmp, { recursive: true, force: true });
console.log(`ok: ${path.relative(root, outFile)} (${Math.round(html.length / 1024)} KB)`);
