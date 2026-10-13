import { useMemo, useState } from "react";
import { ChevronRight, ListChecks, Plus, Search } from "lucide-react";
import { SUBJECT_IDS, SUBJECTS } from "../data/subjects";
import { isDue } from "../lib/srs";
import { useStore } from "../lib/store";
import type { SubjectId } from "../lib/types";
import { SubjectIcon } from "../components/ui";
import type { Nav } from "../App";

export function Flashcards({ nav }: { nav: Nav }) {
  const { state } = useStore();
  const [view, setView] = useState<"cards" | "simulados">("cards");
  const [filter, setFilter] = useState<SubjectId | "todas">("todas");
  const [q, setQ] = useState("");

  const subjects = useMemo(() => {
    const present = SUBJECT_IDS.filter((s) => state.cards.some((c) => c.subject === s));
    return present.map((s) => {
      const cards = state.cards.filter((c) => c.subject === s);
      const topics = [...new Set(cards.map((c) => c.topic))];
      return { subject: s, count: cards.length, due: cards.filter(isDue).length, topics };
    });
  }, [state.cards]);

  const term = q.trim().toLowerCase();
  const visible = subjects
    .filter((s) => filter === "todas" || s.subject === filter)
    .filter((s) => !term || SUBJECTS[s.subject].name.toLowerCase().includes(term) || s.topics.some((t) => t.toLowerCase().includes(term)));

  return (
    <div className="screen">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Flashcards</h1>
          <p className="sub">
            Revise de forma inteligente
            <br />e fixe o conteúdo.
          </p>
        </div>
        <button className="icon-btn" onClick={() => nav.openStudied()} aria-label="Criar flashcards">
          <Plus size={20} />
        </button>
      </div>

      <div className="segmented">
        <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>Cards</button>
        <button className={view === "simulados" ? "on" : ""} onClick={() => setView("simulados")}>Simuladinhos</button>
      </div>

      {view === "cards" && (
        <>
          <label className="search">
            <Search size={16} />
            <input placeholder="Buscar flashcards…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {subjects.length > 0 && (
            <div className="chips">
              <button className={`chip ${filter === "todas" ? "on" : ""}`} onClick={() => setFilter("todas")}>Todas</button>
              {subjects.map((s) => (
                <button key={s.subject} className={`chip ${filter === s.subject ? "on" : ""}`} onClick={() => setFilter(s.subject)}>
                  {SUBJECTS[s.subject].name}
                </button>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <div className="list">
              {visible.map((s) => (
                <button key={s.subject} className="list-item" onClick={() => nav.openDeck(s.subject)}>
                  <SubjectIcon subject={s.subject} />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{SUBJECTS[s.subject].name}</div>
                    <div className="muted">
                      {s.count} cards{s.due ? ` · ${s.due} para hoje` : ""}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--ink-3)" />
                </button>
              ))}
            </div>
          ) : (
            <Empty onCreate={() => nav.openStudied()} />
          )}

          {filter !== "todas" && (
            <div className="stack">
              <h3>Temas</h3>
              <div className="list">
                {subjects
                  .find((s) => s.subject === filter)
                  ?.topics.map((t) => (
                    <button key={t} className="list-item" onClick={() => nav.openDeck(filter, t)}>
                      <span className="grow">{t}</span>
                      <ChevronRight size={16} color="var(--ink-3)" />
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {view === "simulados" && (
        state.quizzes.length ? (
          <div className="list">
            {state.quizzes.map((quiz) => (
              <button key={quiz.id} className="list-item" onClick={() => nav.openQuiz(quiz.id)}>
                <SubjectIcon subject={quiz.subject} size={38} />
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{quiz.topic}</div>
                  <div className="muted">
                    {quiz.questions.length} questões ·{" "}
                    {quiz.score != null ? `acertou ${quiz.score}/${quiz.questions.length}` : "não feito"}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--ink-3)" />
              </button>
            ))}
          </div>
        ) : (
          <Empty onCreate={() => nav.openStudied()} />
        )
      )}
    </div>
  );
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="soft stack center" style={{ alignItems: "center", padding: 28 }}>
      <ListChecks size={28} color="var(--ink-3)" />
      <p className="sub">
        Ainda não há nada aqui. Depois de estudar um tema, toque em <b>Estudei</b> e a IA cria flashcards e um simuladinho para você.
      </p>
      <button className="btn small" onClick={onCreate}>
        <Plus size={16} /> Criar agora
      </button>
    </div>
  );
}
