import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, ClipboardList, Heart, LogOut, Pencil, Settings, Wifi, WifiOff } from "lucide-react";
import { SUBJECTS } from "../data/subjects";
import { aiMode, aiStatus } from "../lib/api";
import { ApiKeyForm } from "../components/ApiKeyForm";
import { prettyDate } from "../lib/dates";
import { useStore } from "../lib/store";
import type { SubjectId } from "../lib/types";
import { PriorityBadge, Sheet, SubjectIcon } from "../components/ui";
import type { Nav } from "../App";

export function Profile({ nav }: { nav: Nav }) {
  const { state, reset } = useStore();
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<"materias" | "config" | "reset" | null>(null);
  const [liked, setLiked] = useState(false);

  return (
    <div className="screen">
      <div className="row">
        <span className="avatar">{(state.profile.name || "?")[0].toUpperCase()}</span>
        <div className="grow">
          <h2>{state.profile.name || "Estudante"}</h2>
          <p className="muted">{state.goal ? `${state.goal.curso} · ${state.goal.vestibular}` : "Sem objetivo definido"}</p>
        </div>
        <button className="icon-btn plain" onClick={() => setEditing(true)} aria-label="Editar perfil"><Pencil size={18} /></button>
      </div>

      <div className="soft stack center" style={{ alignItems: "center", padding: 22 }}>
        <p style={{ fontFamily: "var(--serif)", fontSize: 16 }}>“{state.profile.quote}”</p>
        <button onClick={() => setLiked(!liked)} aria-label="Curtir">
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="list">
        <MenuItem icon={<ClipboardList size={18} />} label="Meu plano de estudos" onClick={nav.openPlan} />
        <MenuItem icon={<BookOpen size={18} />} label="Minhas matérias" onClick={() => setSheet("materias")} />
        <MenuItem icon={<Settings size={18} />} label="Configurações" onClick={() => setSheet("config")} />
        <MenuItem
          icon={<LogOut size={18} />}
          label="Apagar dados e recomeçar"
          onClick={() => setSheet("reset")}
        />
      </div>

      {editing && <EditProfile onClose={() => setEditing(false)} />}
      {sheet === "materias" && <SubjectsSheet onClose={() => setSheet(null)} />}
      {sheet === "config" && <ConfigSheet onClose={() => setSheet(null)} />}
      {sheet === "reset" && (
        <Sheet title="Apagar tudo?" onClose={() => setSheet(null)}>
          <p className="sub">Isso apaga seu plano, cronograma, flashcards e simuladinhos. Não dá para desfazer.</p>
          <button className="btn" style={{ background: "var(--bad)", color: "#fff" }} onClick={() => { reset(); setSheet(null); }}>
            Apagar e recomeçar
          </button>
          <button className="btn secondary" onClick={() => setSheet(null)}>Cancelar</button>
        </Sheet>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="list-item" onClick={onClick}>
      <span className="icon-btn" style={{ width: 36, height: 36 }}>{icon}</span>
      <span className="grow">{label}</span>
      <ChevronRight size={18} color="var(--ink-3)" />
    </button>
  );
}

function EditProfile({ onClose }: { onClose: () => void }) {
  const { state, set } = useStore();
  const [name, setName] = useState(state.profile.name);
  const [quote, setQuote] = useState(state.profile.quote);
  return (
    <Sheet title="Editar perfil" onClose={onClose}>
      <div className="field">
        <label htmlFor="n">Nome</label>
        <input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="q">Frase de motivação</label>
        <input id="q" className="input" value={quote} onChange={(e) => setQuote(e.target.value)} />
      </div>
      <button className="btn" onClick={() => { set({ profile: { name: name.trim(), quote: quote.trim() } }); onClose(); }}>
        Salvar
      </button>
    </Sheet>
  );
}

function SubjectsSheet({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const subjects = [...new Set(state.plan?.topics.map((t) => t.subject) ?? [])] as SubjectId[];
  return (
    <Sheet title="Minhas matérias" onClose={onClose}>
      {subjects.length ? (
        <div className="list">
          {subjects.map((s) => {
            const topics = state.plan!.topics.filter((t) => t.subject === s);
            const blocks = state.blocks.filter((b) => b.subject === s);
            const done = blocks.filter((b) => b.done).length;
            return (
              <div key={s} className="list-item">
                <SubjectIcon subject={s} size={38} />
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{SUBJECTS[s].name}</div>
                  <div className="muted">{topics.length} temas · {done}/{blocks.length} aulas feitas</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">Gere um plano para ver suas matérias.</p>
      )}
    </Sheet>
  );
}

function ConfigSheet({ onClose }: { onClose: () => void }) {
  const { state, set } = useStore();
  const mode = aiMode();
  const [ai, setAi] = useState<boolean | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  useEffect(() => {
    aiStatus().then(setAi);
  }, []);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `estudemais-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setBackupMsg("Cópia salva na pasta de downloads.");
  }

  async function importBackup(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.cards) || !Array.isArray(data.blocks)) throw new Error();
      set(data);
      setBackupMsg("Dados restaurados.");
    } catch {
      setBackupMsg("Esse arquivo não é uma cópia de segurança do EstudeMais.");
    }
  }

  return (
    <Sheet title="Configurações" onClose={onClose}>
      <div className="card row">
        {ai ? <Wifi size={20} /> : <WifiOff size={20} />}
        <div className="grow">
          <b style={{ fontWeight: 500 }}>Inteligência artificial</b>
          <p className="muted">
            {ai == null ? "Verificando…" : ai ? "Ligada: planos, flashcards e simuladinhos com IA." : "Desligada: usando o modo offline."}
          </p>
        </div>
      </div>

      {mode === "claude" && ai === false && (
        <p className="notice">
          Quando o app pedir permissão para usar o Claude, toque em permitir. Se você recusou, recarregue a página
          para ver o pedido de novo.
        </p>
      )}

      {mode !== "claude" && mode !== "servidor" && (
        <ApiKeyForm onSaved={() => setAi(true)} onRemoved={() => setAi(false)} />
      )}

      {mode === "servidor" && ai === false && (
        <p className="notice">
          Para ligar a IA, crie um arquivo <code>.env</code> na pasta do projeto com <code>ANTHROPIC_API_KEY=sua-chave</code> e
          reinicie o servidor. Veja o README.
        </p>
      )}

      {mode === "claude" ? (
        <p className="muted">Seus dados ficam salvos na sua conta do Claude, só para você, e aparecem em qualquer aparelho.</p>
      ) : (
        <div className="stack">
          <h3>Cópia de segurança</h3>
          <p className="muted">
            Seus dados ficam guardados neste aparelho. Salve uma cópia de vez em quando para não perder nada se limpar o
            navegador ou trocar de aparelho.
          </p>
          <div className="row">
            <button className="btn secondary small" onClick={exportBackup}>Salvar cópia</button>
            <label className="btn secondary small" htmlFor="restore">Restaurar cópia</label>
            <input
              id="restore"
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
            />
          </div>
          {backupMsg && <p className="notice">{backupMsg}</p>}
        </div>
      )}
    </Sheet>
  );
}

/** Tela "Meu plano": temas escolhidos pela IA, prioridades e progresso. */
export function PlanView({ onBack, onRedo }: { onBack: () => void; onRedo: () => void }) {
  const { state } = useStore();
  const plan = state.plan;
  return (
    <div className="app">
      <div className="screen full">
        <div className="row">
          <button className="icon-btn plain" onClick={onBack} aria-label="Voltar"><ArrowLeft size={22} /></button>
          <h1>Meu plano</h1>
        </div>
        {state.goal && (
          <div className="soft stack" style={{ gap: 6 }}>
            <b style={{ fontWeight: 500 }}>{state.goal.vestibular} · {state.goal.curso}</b>
            <p className="muted">De {prettyDate(state.goal.startDate)} até {prettyDate(state.goal.endDate)}</p>
          </div>
        )}
        {plan ? (
          <>
            <p className="sub">{plan.summary}</p>
            <div className="list">
              {plan.topics.map((t) => {
                const blocks = state.blocks.filter((b) => b.topicId === t.id && b.kind === "aula");
                const done = blocks.filter((b) => b.done).length;
                return (
                  <div key={t.id} className="list-item" style={{ alignItems: "flex-start" }}>
                    <SubjectIcon subject={t.subject} size={36} />
                    <div className="grow stack" style={{ gap: 4 }}>
                      <span style={{ fontWeight: 500 }}>{t.title}</span>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <PriorityBadge priority={t.priority} />
                        <span className="muted">incidência {Math.round(t.incidence)}% · {done}/{blocks.length} aulas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="muted">Nenhum plano ainda.</p>
        )}
        <button className="btn" onClick={onRedo}>Refazer plano</button>
      </div>
    </div>
  );
}
