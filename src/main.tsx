import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StoreProvider } from "./lib/store";
import "./styles.css";

declare const __ARTIFACT__: boolean;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);

// app instalado: funciona sem internet e pede ao navegador para não apagar os dados
if (!__ARTIFACT__ && "serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
  navigator.storage?.persist?.().catch(() => {});
}
