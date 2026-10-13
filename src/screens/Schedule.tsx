import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { SUBJECT_IDS, SUBJECTS } from "../data/subjects";
import {
  addDays, fromISO, MONTHS, prettyDate, startOfWeek, toISO, today, WEEKDAYS_SHORT,
} from "../lib/dates";
import { uid, useStore } from "../lib/store";
import type { StudyBlock, SubjectId } from "../lib/types";
import { Sheet } from "../components/ui";
import type { Nav } from "../App";

type View = "mes" | "semana" | "lista";

export function Schedule({ nav }: { nav: Nav }) {
  const { state, toggleBlock } = useStore();
  const [view, setView] = useState<View>("mes");
  const [selected, setSelected] = useState(today());
  const [month, setMonth] = useState(() => {
    const d = fromISO(today());
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [adding, setAdding] = useState(false);

  const byDate = useMemo(() => {
    const m = new Map<string, StudyBlock[]>();
    for (const b of state.blocks) {
      if (!m.has(b.date)) m.set(b.date, []);
      m.get(b.date)!.push(b);
    }
    return m;
  }, [state.blocks]);

  const cells = useMemo(() => {
    const first = toISO(month);
    const start = addDays(first, -month.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const dayBlocks = byDate.get(selected) ?? [];
  const weekStart = startOfWeek(selected);

  return (
    <div className="screen">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Cronograma de Estudos</h1>
        <p className="sub">Organize seu tempo e mantenha o foco.</p>
      </div>

      <div className="segmented">
        {(["mes", "semana", "lista"] as View[]).map((v) => (
          <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
            {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Lista"}
          </button>
        ))}
      </div>

      {view === "mes" && (
        <>
          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <button className="icon-btn plain" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <h3>{MONTHS[month.getMonth()]} {month.getFullYear()}</h3>
              <button className="icon-btn plain" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="cal">
              {WEEKDAYS_SHORT.map((d, i) => <span key={i} className="wd">{d}</span>)}
              {cells.map((iso) => {
                const d = fromISO(iso);
                const blocks = byDate.get(iso) ?? [];
                const subjects = [...new Set(blocks.map((b) => b.subject))].slice(0, 3);
                return (
                  <button
                    key={iso}
                    className={`${iso === selected ? "sel" : ""} ${iso === today() ? "today" : ""} ${d.getMonth() !== month.getMonth() ? "out" : ""}`}
                    onClick={() => setSelected(iso)}
                  >
                    <span className="n">{d.getDate()}</span>
                    <span className="dots">
                      {subjects.map((s) => <span key={s} style={{ background: SUBJECTS[s].color }} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <DayList
            title={selected === today() ? `Hoje, ${fromISO(selected).getDate()} de ${MONTHS[fromISO(selected).getMonth()]}` : prettyDate(selected)}
            blocks={dayBlocks}
            onToggle={toggleBlock}
            onStudied={nav.openStudied}
          />
        </>
      )}

      {view === "semana" && (
        <>
          <div className="row between">
            <button className="icon-btn plain" onClick={() => setSelected(addDays(selected, -7))} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
            <span className="muted">
              {fromISO(weekStart).getDate()}/{fromISO(weekStart).getMonth() + 1} – {fromISO(addDays(weekStart, 6)).getDate()}/{fromISO(addDays(weekStart, 6)).getMonth() + 1}
            </span>
            <button className="icon-btn plain" onClick={() => setSelected(addDays(selected, 7))} aria-label="Próxima semana"><ChevronRight size={18} /></button>
          </div>
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
            .filter((d) => byDate.has(d))
            .map((d) => (
              <WeekDay key={d} date={d} blocks={byDate.get(d)!} onStudied={nav.openStudied} />
            ))}
          {!Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).some((d) => byDate.has(d)) && (
            <p className="muted">Sem estudos nesta semana.</p>
          )}
        </>
      )}

      {view === "lista" && (
        <UpcomingList blocks={state.blocks} onToggle={toggleBlock} onStudied={nav.openStudied} />
      )}

      <button className="btn" onClick={() => setAdding(true)}>
        <Plus size={18} /> Adicionar estudo
      </button>

      {adding && <AddBlockSheet date={selected} onClose={() => setAdding(false)} />}
    </div>
  );
}

function DayList({ title, blocks, onToggle, onStudied }: {
  title: string; blocks: StudyBlock[]; onToggle: (id: string) => void; onStudied: (b: StudyBlock) => void;
}) {
  return (
    <div className="stack">
      <h3>{title}</h3>
      {blocks.length ? (
        <div className="stack" style={{ gap: 0 }}>
          {blocks.map((b) => (
            <div key={b.id} className="row" style={{ padding: "10px 0" }}>
              <span className="bar-left" style={{ background: SUBJECTS[b.subject].color }} />
              <button className="grow" style={{ textAlign: "left" }} onClick={() => onStudied(b)}>
                <div className="row" style={{ gap: 14 }}>
                  <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 96 }}>{b.start} - {b.end}</span>
                  <span className="muted" style={{ fontSize: 14 }}>{SUBJECTS[b.subject].name}</span>
                </div>
                <p className="muted" style={{ marginTop: 2 }}>{b.title}</p>
              </button>
              <button className={`check ${b.done ? "on" : ""}`} onClick={() => onToggle(b.id)} aria-label="Concluir">
                {b.done && <Check size={13} strokeWidth={3} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum estudo neste dia.</p>
      )}
    </div>
  );
}

function WeekDay({ date, blocks, onStudied }: { date: string; blocks: StudyBlock[]; onStudied: (b: StudyBlock) => void }) {
  const d = fromISO(date);
  const [name] = prettyDate(date).split(" · ");
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p>
        <b style={{ fontWeight: 600 }}>{name}</b>
        <span className="muted"> · {d.getDate()} de {MONTHS[d.getMonth()]}</span>
      </p>
      {blocks.map((b) => (
        <button
          key={b.id}
          className="row"
          onClick={() => onStudied(b)}
          style={{
            background: SUBJECTS[b.subject].tint, borderRadius: 14, padding: "12px 14px", textAlign: "left",
            borderLeft: `4px solid ${SUBJECTS[b.subject].color}`, opacity: b.done ? 0.6 : 1, color: "#2b2a27",
          }}
        >
          <div className="grow">
            <div style={{ fontWeight: 500 }}>{SUBJECTS[b.subject].name}</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>{b.start} - {b.end} · {b.title}</div>
          </div>
          {b.done && <Check size={16} />}
        </button>
      ))}
    </div>
  );
}

function UpcomingList({ blocks, onToggle, onStudied }: {
  blocks: StudyBlock[]; onToggle: (id: string) => void; onStudied: (b: StudyBlock) => void;
}) {
  const [limit, setLimit] = useState(30);
  const upcoming = blocks.filter((b) => b.date >= today());
  const overdue = blocks.filter((b) => b.date < today() && !b.done);
  return (
    <div className="stack">
      {overdue.length > 0 && (
        <div className="notice">
          <b>{overdue.length} aulas atrasadas.</b> Marque as que você já viu ou refaça o plano em Perfil → Meu plano.
        </div>
      )}
      <div className="list">
        {upcoming.slice(0, limit).map((b) => (
          <div key={b.id} className="list-item">
            <span className="dot" style={{ background: SUBJECTS[b.subject].color }} />
            <button className="grow" style={{ textAlign: "left" }} onClick={() => onStudied(b)}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{b.title}</div>
              <div className="muted">{prettyDate(b.date)} · {b.start}</div>
            </button>
            <button className={`check ${b.done ? "on" : ""}`} onClick={() => onToggle(b.id)} aria-label="Concluir">
              {b.done && <Check size={13} strokeWidth={3} />}
            </button>
          </div>
        ))}
        {!upcoming.length && (
          <p className="list-item muted">
            <Sparkles size={16} /> Nada agendado.
          </p>
        )}
      </div>
      {upcoming.length > limit && (
        <button className="btn secondary" onClick={() => setLimit(limit + 30)}>Mostrar mais</button>
      )}
    </div>
  );
}

function AddBlockSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { addBlock } = useStore();
  const [d, setD] = useState(date);
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("20:00");
  const [subject, setSubject] = useState<SubjectId>("biologia");
  const [title, setTitle] = useState("");

  return (
    <Sheet title="Adicionar estudo" onClose={onClose}>
      <div className="field">
        <label>Matéria</label>
        <div className="chips">
          {SUBJECT_IDS.map((s) => (
            <button key={s} className={`chip ${subject === s ? "on" : ""}`} onClick={() => setSubject(s)}>
              {SUBJECTS[s].name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="t">Tema</label>
        <input id="t" className="input" placeholder="Ex.: Revisão de sistemas" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="d">Dia</label>
        <input id="d" type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="s">Início</label>
          <input id="s" type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e">Fim</label>
          <input id="e" type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <button
        className="btn"
        disabled={!title.trim() || start >= end}
        onClick={() => {
          addBlock({ id: uid(), date: d, start, end, subject, title: title.trim(), kind: "livre", done: false });
          onClose();
        }}
      >
        Adicionar
      </button>
    </Sheet>
  );
}
