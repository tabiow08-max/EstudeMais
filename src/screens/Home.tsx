import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Check, ChevronRight, Layers, Search, Sparkles, Target } from "lucide-react";
import { SUBJECTS } from "../data/subjects";
import { fromISO, MONTHS_ABBR, today, WEEKDAYS_ABBR } from "../lib/dates";
import { isDue } from "../lib/srs";
import { useStore } from "../lib/store";
import type { StudyBlock } from "../lib/types";
import type { Nav } from "../App";

const MOTIVATION = [
  ["Você consegue!", "Pequenos avanços todos os dias levam a grandes resultados."],
  ["Constância vence talento", "Uma hora bem estudada hoje vale mais que cinco amanhã."],
  ["Revisar é aprender de novo", "Os flashcards de hoje são os pontos da prova."],
];

export function Home({ nav }: { nav: Nav }) {
  const { state, toggleBlock } = useStore();
  const [q, setQ] = useState("");
  const now = fromISO(today());
  const todays = state.blocks.filter((b) => b.date === today());
  const dueCards = state.cards.filter(isDue).length;
  const motivation = MOTIVATION[now.getDate() % MOTIVATION.length];

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return null;
    const topics = state.plan?.topics.filter((t) => `${t.title} ${SUBJECTS[t.subject].name}`.toLowerCase().includes(term)) ?? [];
    const cards = state.cards.filter((c) => `${c.front} ${c.topic}`.toLowerCase().includes(term));
    return { topics: topics.slice(0, 5), cards: cards.slice(0, 5) };
  }, [q, state.plan, state.cards]);

  return (
    <div className="screen">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>olá, {state.profile.name || "estudante"} ✳</h1>
          <p className="sub">
            Disciplina hoje,
            <br />o futuro que você quer amanhã.
          </p>
        </div>
        <div className="date-chip">
          {WEEKDAYS_ABBR[now.getDay()]}
          <br />
          {now.getDate()} {MONTHS_ABBR[now.getMonth()]}
        </div>
      </div>

      <label className="search">
        <Search size={16} />
        <input placeholder="Buscar matéria, flashcards…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {results && (
        <div className="list">
          {results.topics.map((t) => (
            <button key={t.id} className="list-item" onClick={() => nav.openStudied({ subject: t.subject, title: t.title })}>
              <span className="dot" style={{ background: SUBJECTS[t.subject].color }} />
              <span className="grow">{t.title}</span>
              <span className="muted">tema</span>
            </button>
          ))}
          {results.cards.map((c) => (
            <button key={c.id} className="list-item" onClick={() => nav.openDeck(c.subject, c.topic)}>
              <span className="dot" style={{ background: SUBJECTS[c.subject].color }} />
              <span className="grow">{c.front}</span>
              <span className="muted">card</span>
            </button>
          ))}
          {!results.topics.length && !results.cards.length && <p className="list-item muted">Nada encontrado.</p>}
        </div>
      )}

      <div className="quick">
        <button onClick={() => nav.tab("flashcards")}>
          <span className="tile"><Layers size={22} strokeWidth={1.6} /></span>Flashcards
        </button>
        <button onClick={() => nav.tab("cronograma")}>
          <span className="tile"><CalendarDays size={22} strokeWidth={1.6} /></span>Cronograma
        </button>
        <button onClick={() => nav.openPlan()}>
          <span className="tile"><Target size={22} strokeWidth={1.6} /></span>Meu plano
        </button>
        <button onClick={() => nav.openStats()}>
          <span className="tile"><BarChart3 size={22} strokeWidth={1.6} /></span>Estatísticas
        </button>
      </div>

      <div className="stack">
        <div className="section-head">
          <h2>Hoje</h2>
          <button className="link" onClick={() => nav.tab("cronograma")}>
            Ver tudo <ChevronRight size={14} />
          </button>
        </div>
        {todays.length ? (
          <div className="stack" style={{ gap: 0 }}>
            {todays.map((b) => (
              <TodayRow key={b.id} block={b} onToggle={() => toggleBlock(b.id)} onStudied={() => nav.openStudied(b)} />
            ))}
          </div>
        ) : (
          <p className="muted">Nada no cronograma para hoje. Aproveite para revisar seus flashcards!</p>
        )}
      </div>

      {dueCards > 0 && (
        <button className="card row" onClick={() => nav.openDeck()} style={{ textAlign: "left" }}>
          <span className="subject-icon" style={{ background: "var(--surface-2)" }}><Layers size={20} /></span>
          <div className="grow">
            <b style={{ fontWeight: 500 }}>{dueCards} flashcards para revisar</b>
            <p className="muted">A repetição espaçada escolheu os cards de hoje.</p>
          </div>
          <ChevronRight size={18} />
        </button>
      )}

      <button className="btn secondary" onClick={() => nav.openStudied()}>
        <Sparkles size={18} /> Estudei algo agora
      </button>

      <div className="soft row">
        <span className="subject-icon" style={{ background: "var(--surface)", borderRadius: "50%", color: "#6fa46f" }}>✳</span>
        <div className="grow">
          <h3>{motivation[0]}</h3>
          <p className="muted" style={{ marginTop: 4 }}>{motivation[1]}</p>
        </div>
      </div>
    </div>
  );
}

function TodayRow({ block, onToggle, onStudied }: { block: StudyBlock; onToggle: () => void; onStudied: () => void }) {
  const m = SUBJECTS[block.subject];
  return (
    <div className="row" style={{ padding: "12px 0", alignItems: "flex-start" }}>
      <span className="dot" style={{ background: m.color, marginTop: 4 }} />
      <button className="grow" style={{ textAlign: "left" }} onClick={onStudied}>
        <div className="row between">
          <span style={{ fontWeight: 500 }}>{m.name}</span>
          <span className="muted">{block.start} - {block.end}</span>
        </div>
        <p className="muted" style={{ marginTop: 2 }}>{block.title}</p>
      </button>
      <button className={`check ${block.done ? "on" : ""}`} onClick={onToggle} aria-label={block.done ? "Desmarcar" : "Marcar como estudado"}>
        {block.done && <Check size={13} strokeWidth={3} />}
      </button>
    </div>
  );
}
