import { useState } from "react";
import { getApiKey, setApiKey, testApiKey } from "../lib/api";

/** Campo para colar a chave da API, testar e salvar neste aparelho. */
export function ApiKeyForm({ onSaved, onRemoved }: { onSaved?: () => void; onRemoved?: () => void }) {
  const [key, setKey] = useState(getApiKey());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  async function save() {
    const k = key.trim();
    setTesting(true);
    setMsg(null);
    try {
      await testApiKey(k);
      setApiKey(k);
      setMsg({ ok: true, text: "Chave funcionando. A IA está ligada!" });
      onSaved?.();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="apikey">Chave da API da Anthropic</label>
        <input
          id="apikey"
          className="input"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </div>
      <p className="muted">
        Crie a chave em{" "}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
          console.anthropic.com
        </a>{" "}
        e cole aqui. Ela fica guardada só neste aparelho.
      </p>
      {msg && <div className={`notice ${msg.ok ? "" : "error"}`}>{msg.text}</div>}
      <div className="row">
        <button className="btn" disabled={!key.trim().startsWith("sk-") || testing} onClick={save}>
          {testing ? "Testando…" : "Salvar e testar"}
        </button>
        {getApiKey() && (
          <button
            className="btn secondary small"
            onClick={() => {
              setApiKey("");
              setKey("");
              setMsg(null);
              onRemoved?.();
            }}
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
