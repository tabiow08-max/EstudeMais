import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock, Layers, Target } from "lucide-react";
import { SUBJECT_IDS, SUBJECTS } from "../data/subjects";
import { daysBetween, today, toMinutes } from "../lib/dates";
import { useStore } from "../lib/store";
import type { SubjectId } from "../lib/types";
import { SubjectIcon } from "../components/ui";

type Tab = "geral" | "flashcards" | "tempo";

export function Stats({ onBack }: { onBack?: () => void }) {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("geral");

  const data = useMemo(() => {
    const seen = state.cards.reduce((s, c) => s + c.seen, 0);
    const correct = state.cards.reduce((s, c) => s + c.correct, 0);
    const doneBlocks = state.blocks.filter((b) => b.done);
    const minutes = doneBlocks.reduce((s, b) => s + toMinutes(b.end) - toMinutes(b.start), 0);
    const pastBlocks = state.blocks.filter((b) => b.date <= today());

    // desempenho = acertos em flashcards + simuladinhos, por matéria
    const perSubject = SUBJECT_IDS.map((s) => {
      const cards = state.cards.filter((c) => c.subject === s);
      const quizzes = state.quizzes.filter((q) => q.subject === s && q.score != null);
      const hits = cards.reduce((a, c) => a + c.correct, 0) + quizzes.reduce((a, q) => a + (q.score ?? 0), 0);
      const total = cards.reduce((a, c) => a + c.seen, 0) + quizzes.reduce((a, q) => a + q.questions.length, 0);
      const blocks = doneBlocks.filter((b) => b.subject === s);
      const mins = blocks.reduce((a, b) => a + toMinutes(b.end) - toMinutes(b.start), 0);
      return { subject: s, pct: total ? Math.round((hits / total) * 100) : null, total, cards: cards.length, mins };
    });

    return {
      accuracy: seen ? Math.round((correct / seen) * 100) : null,
      days: state.studyDays.length,
      hours: Math.round(minutes / 6) / 10,
      adherence: pastBlocks.length ? Math.round((pastBlocks.filter((b) => b.done).length / pastBlocks.length) * 100) : null,
      cardsTotal: state.cards.length,
      cardsMastered: state.cards.filter((c) => c.box >= 3).length,
      reviews: seen,
      quizzes: state.quizzes.filter((q) => q.score != null).length,
      perSubject,
      daysLeft: state.goal ? Math.max(0, daysBetween(today(), state.goal.endDate)) : null,
    };
  }, [state]);

  return (
    <div className="screen">
      <div className="row">
        {onBack && (
          <button className="icon-btn plain" onClick={onBack} aria-label="Voltar"><ArrowLeft size={22} /></button>
        )}
        <h1>Estatísticas</h1>
      </div>

      <div className="segmented">
        {(["geral", "flashcards", "tempo"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "geral" ? "Geral" : t === "flashcards" ? "Flashcards" : "Tempo"}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <>
          <div className="grid-2">
            <StatCard icon={<Target size={18} />} value={data.accuracy != null ? `${data.accuracy}%` : "—"} label="acerto nos flashcards" />
            <StatCard icon={<CalendarDays size={18} />} value={String(data.days)} label="dias de estudo" />
            <StatCard icon={<Clock size={18} />} value={data.adherence != null ? `${data.adherence}%` : "—"} label="do cronograma cumprido" />
            <StatCard icon={<Layers size={18} />} value={data.daysLeft != null ? String(data.daysLeft) : "—"} label="dias até a prova" />
          </div>
          <Bars
            title="Desempenho por matéria"
            rows={data.perSubject.filter((r) => r.pct != null).map((r) => ({ subject: r.subject, value: r.pct!, label: `${r.pct}%` }))}
            max={100}
            empty="Revise flashcards ou faça simuladinhos para ver seu desempenho."
          />
        </>
      )}

      {tab === "flashcards" && (
        <>
          <div className="grid-2">
            <StatCard icon={<Layers size={18} />} value={String(data.cardsTotal)} label="cards criados" />
            <StatCard icon={<Target size={18} />} value={String(data.cardsMastered)} label="cards dominados" />
            <StatCard icon={<CalendarDays size={18} />} value={String(data.reviews)} label="revisões feitas" />
            <StatCard icon={<Clock size={18} />} value={String(data.quizzes)} label="simuladinhos feitos" />
          </div>
          <Bars
            title="Cards por matéria"
            rows={data.perSubject.filter((r) => r.cards).map((r) => ({ subject: r.subject, value: r.cards, label: String(r.cards) }))}
            max={Math.max(1, ...data.perSubject.map((r) => r.cards))}
            empty="Nenhum card ainda."
          />
        </>
      )}

      {tab === "tempo" && (
        <>
          <div className="grid-2">
            <StatCard icon={<Clock size={18} />} value={`${data.hours}h`} label="estudadas no cronograma" />
            <StatCard icon={<CalendarDays size={18} />} value={String(data.days)} label="dias de estudo" />
          </div>
          <Bars
            title="Horas por matéria"
            rows={data.perSubject.filter((r) => r.mins).map((r) => ({ subject: r.subject, value: r.mins, label: `${Math.round(r.mins / 6) / 10}h` }))}
            max={Math.max(1, ...data.perSubject.map((r) => r.mins))}
            empty="Marque as aulas do cronograma como concluídas para acompanhar seu tempo."
          />
        </>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <span style={{ color: "var(--ink-2)" }}>{icon}</span>
      <span className="stat-num">{value}</span>
      <span className="muted">{label}</span>
    </div>
  );
}

function Bars({ title, rows, max, empty }: {
  title: string; rows: { subject: SubjectId; value: number; label: string }[]; max: number; empty: string;
}) {
  return (
    <div className="stack">
      <h3>{title}</h3>
      {rows.length ? (
        rows.map((r) => (
          <div key={r.subject} className="row">
            <SubjectIcon subject={r.subject} size={28} />
            <div className="grow stack" style={{ gap: 6 }}>
              <span style={{ fontSize: 14 }}>{SUBJECTS[r.subject].name}</span>
              <div className="progress">
                <div style={{ width: `${(r.value / max) * 100}%`, background: SUBJECTS[r.subject].color }} />
              </div>
            </div>
            <span className="muted" style={{ minWidth: 40, textAlign: "right" }}>{r.label}</span>
          </div>
        ))
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}
