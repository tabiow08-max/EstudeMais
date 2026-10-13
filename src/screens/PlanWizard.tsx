import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles, WifiOff } from "lucide-react";
import { CURSOS, VESTIBULARES } from "../data/subjects";
import { addMonths, daysBetween, today, WEEKDAYS_ABBR } from "../lib/dates";
import { AIUnavailableError, generatePlan } from "../lib/api";
import { fillMissingSubjects, offlinePlan } from "../lib/offlinePlanner";
import { buildSchedule, totalHours } from "../lib/scheduler";
import { uid, useStore } from "../lib/store";
import type { DayWindow, Goal, Plan } from "../lib/types";
import { Loading, PriorityBadge, SubjectIcon, SubjectTag } from "../components/ui";

const DEFAULT_WINDOWS: DayWindow[] = [1, 2, 3, 4, 5].map((day) => ({ day, start: "19:00", end: "22:00" }));
const PERIODS = [
  { label: "1 mês", months: 1 },
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
];

export function PlanWizard({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { state, set } = useStore();
  const needsName = !state.profile.name;
  const [step, setStep] = useState(needsName ? 0 : 1);
  const [name, setName] = useState(state.profile.name);
  const [goal, setGoal] = useState<Goal>(
    state.goal ?? { vestibular: "ENEM", curso: "Medicina", startDate: today(), endDate: addMonths(today(), 6) },
  );
  const [windows, setWindows] = useState<DayWindow[]>(state.windows.length ? state.windows : DEFAULT_WINDOWS);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hours = useMemo(() => totalHours(windows, goal.startDate, goal.endDate), [windows, goal]);
  const weeks = Math.max(1, Math.round(daysBetween(goal.startDate, goal.endDate) / 7));

  const toggleDay = (day: number) =>
    setWindows((w) =>
      w.some((x) => x.day === day)
        ? w.filter((x) => x.day !== day)
        : [...w, { day, start: w[0]?.start ?? "19:00", end: w[0]?.end ?? "21:00" }].sort((a, b) => a.day - b.day),
    );
  const setTime = (day: number, field: "start" | "end", value: string) =>
    setWindows((w) => w.map((x) => (x.day === day ? { ...x, [field]: value } : x)));

  async function generate() {
    setStep(4);
    setLoading(true);
    setError(null);
    try {
      const res = await generatePlan({ goal, totalHours: hours, weeks });
      setPlan({
        createdAt: new Date().toISOString(),
        source: "ia",
        summary: res.summary,
        topics: fillMissingSubjects(goal, res.topics).map((t) => ({ ...t, id: uid() })),
      });
    } catch (e) {
      const res = offlinePlan(goal, hours);
      setPlan({
        createdAt: new Date().toISOString(),
        source: "offline",
        summary: res.summary,
        topics: res.topics.map((t) => ({ ...t, id: uid() })),
      });
      if (!(e instanceof AIUnavailableError)) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!plan) return;
    // mantém blocos já concluídos no passado; o resto é recalculado
    const keep = state.blocks.filter((b) => b.done && b.date < goal.startDate);
    const blocks = buildSchedule(plan.topics, windows, goal.startDate, goal.endDate);
    set({ profile: { ...state.profile, name: name.trim() }, goal, windows, plan, blocks: [...keep, ...blocks] });
    onDone();
  }

  const back = () => (step > (needsName ? 0 : 1) ? setStep(step - 1) : onCancel?.());
  const validWindows = windows.length > 0 && windows.every((w) => w.start < w.end);

  return (
    <div className="app">
      <div className="screen full">
        <div className="topbar">
          {(step > (needsName ? 0 : 1) || onCancel) && step !== 4 ? (
            <button className="icon-btn plain" onClick={back} aria-label="Voltar">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <span />
          )}
          <span className="muted">EstudeMais</span>
          <span style={{ width: 40 }} />
        </div>
        <div className="steps">
          {[0, 1, 2, 3, 4].slice(needsName ? 0 : 1).map((i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="stack">
              <h1>Oi! Como podemos te chamar?</h1>
              <p className="sub">Vamos montar um plano de estudos feito para o seu objetivo.</p>
            </div>
            <input className="input" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="btn" disabled={!name.trim()} onClick={() => setStep(1)}>
              Continuar
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="stack">
              <h1>Qual é o seu objetivo?</h1>
              <p className="sub">A IA usa o vestibular e o curso para saber o que mais cai e o que pesa mais.</p>
            </div>
            <div className="field">
              <label>Vestibular</label>
              <div className="chips" style={{ flexWrap: "wrap" }}>
                {VESTIBULARES.map((v) => (
                  <button key={v} className={`chip ${goal.vestibular === v ? "on" : ""}`} onClick={() => setGoal({ ...goal, vestibular: v })}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="curso">Curso</label>
              <input
                id="curso"
                className="input"
                list="cursos"
                value={goal.curso}
                onChange={(e) => setGoal({ ...goal, curso: e.target.value })}
              />
              <datalist id="cursos">
                {CURSOS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <button className="btn" disabled={!goal.curso.trim()} onClick={() => setStep(2)}>
              Continuar
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="stack">
              <h1>Quanto tempo você tem?</h1>
              <p className="sub">Escolha um período ou a data da prova.</p>
            </div>
            <div className="grid-2">
              {PERIODS.map((p) => {
                const end = addMonths(goal.startDate, p.months);
                return (
                  <button key={p.label} className={`chip ${goal.endDate === end ? "on" : ""}`} style={{ padding: 14 }} onClick={() => setGoal({ ...goal, endDate: end })}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="ini">Começo</label>
                <input id="ini" type="date" className="input" value={goal.startDate} onChange={(e) => setGoal({ ...goal, startDate: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="fim">Data da prova</label>
                <input id="fim" type="date" className="input" value={goal.endDate} min={goal.startDate} onChange={(e) => setGoal({ ...goal, endDate: e.target.value })} />
              </div>
            </div>
            <p className="muted">{daysBetween(goal.startDate, goal.endDate)} dias · cerca de {weeks} semanas</p>
            <button className="btn" disabled={daysBetween(goal.startDate, goal.endDate) < 1} onClick={() => setStep(3)}>
              Continuar
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="stack">
              <h1>Quando você vai estudar?</h1>
              <p className="sub">Marque os dias e o horário de cada um. O cronograma é montado em aulas de 1 hora.</p>
            </div>
            <div className="days">
              {WEEKDAYS_ABBR.map((d, i) => (
                <button key={d} className={windows.some((w) => w.day === i) ? "on" : ""} onClick={() => toggleDay(i)}>
                  {d}
                </button>
              ))}
            </div>
            <div className="list">
              {windows.map((w) => (
                <div key={w.day} className="list-item">
                  <span style={{ width: 40, fontWeight: 500 }}>{WEEKDAYS_ABBR[w.day]}</span>
                  <input type="time" className="input" value={w.start} onChange={(e) => setTime(w.day, "start", e.target.value)} />
                  <span className="muted">até</span>
                  <input type="time" className="input" value={w.end} onChange={(e) => setTime(w.day, "end", e.target.value)} />
                </div>
              ))}
              {!windows.length && <p className="list-item muted">Escolha pelo menos um dia.</p>}
            </div>
            <div className="soft row">
              <div className="grow">
                <div className="stat-num" style={{ fontSize: 24 }}>{hours} h</div>
                <p className="muted">de estudo até a prova</p>
              </div>
              <div className="grow">
                <div className="stat-num" style={{ fontSize: 24 }}>{Math.round((hours / weeks) * 10) / 10} h</div>
                <p className="muted">por semana</p>
              </div>
            </div>
            <button className="btn" disabled={!validWindows || hours < 1} onClick={generate}>
              <Sparkles size={18} /> Gerar meu plano com IA
            </button>
          </>
        )}

        {step === 4 && (
          <>
            {loading && <Loading text="A IA está analisando o que mais cai no seu vestibular e escolhendo os temas…" />}
            {!loading && plan && (
              <>
                <div className="stack">
                  <h1>Seu plano está pronto</h1>
                  <p className="sub">{plan.summary}</p>
                </div>
                {plan.source === "offline" && (
                  <div className="notice row">
                    <WifiOff size={16} />
                    <span>
                      {error ? `A IA falhou (${error}). ` : "IA não configurada. "}
                      Usei o planejador offline com a incidência histórica dos temas.
                    </span>
                  </div>
                )}
                <div className="chips" style={{ flexWrap: "wrap" }}>
                  {[...new Set(plan.topics.map((t) => t.subject))].map((s) => (
                    <SubjectTag key={s} subject={s} />
                  ))}
                </div>
                <div className="row between">
                  <h3>{new Set(plan.topics.map((t) => t.subject)).size} matérias · {plan.topics.length} temas</h3>
                  <span className="muted">{plan.topics.reduce((s, t) => s + t.hours, 0)} h de aula + revisão</span>
                </div>
                <div className="list">
                  {plan.topics.map((t) => (
                    <div key={t.id} className="list-item" style={{ alignItems: "flex-start" }}>
                      <SubjectIcon subject={t.subject} size={36} />
                      <div className="grow stack" style={{ gap: 4 }}>
                        <span style={{ fontWeight: 500 }}>{t.title}</span>
                        <span className="muted">{t.reason}</span>
                        <div className="row" style={{ gap: 6 }}>
                          <PriorityBadge priority={t.priority} />
                          <span className="muted">{t.hours} h · incidência {Math.round(t.incidence)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn" onClick={confirm}>
                  Montar meu cronograma
                </button>
                <button className="btn secondary" onClick={generate}>
                  Gerar de novo
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
