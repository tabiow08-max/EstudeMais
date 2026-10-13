import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../lib/store";
import { SubjectTag } from "../components/ui";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizScreen({ quizId, onClose }: { quizId: string; onClose: () => void }) {
  const { state, saveQuiz } = useStore();
  const quiz = state.quizzes.find((q) => q.id === quizId);
  const [answers, setAnswers] = useState<number[]>([]);
  const [i, setI] = useState(0);

  if (!quiz) return null;
  const q = quiz.questions[i];
  const picked = answers[i];
  const done = i >= quiz.questions.length;
  const score = answers.filter((a, idx) => a === quiz.questions[idx]?.answerIndex).length;

  function pick(opt: number) {
    if (picked != null) return;
    const next = [...answers];
    next[i] = opt;
    setAnswers(next);
    if (next.filter((x) => x != null).length === quiz!.questions.length) {
      const s = next.filter((a, idx) => a === quiz!.questions[idx].answerIndex).length;
      saveQuiz({ ...quiz!, answers: next, score: s });
    }
  }

  return (
    <div className="app">
      <div className="screen full">
        <div className="topbar">
          <button className="icon-btn plain" onClick={onClose} aria-label="Fechar"><X size={22} /></button>
          <span className="muted">{done ? "Resultado" : `${i + 1}/${quiz.questions.length}`}</span>
          <span style={{ width: 40 }} />
        </div>
        <div className="progress"><div style={{ width: `${(Math.min(i, quiz.questions.length) / quiz.questions.length) * 100}%`, background: "var(--ink)" }} /></div>

        {done ? (
          <div className="stack center" style={{ alignItems: "center", marginTop: 24 }}>
            <SubjectTag subject={quiz.subject} />
            <div className="stat-num" style={{ fontSize: 48 }}>{score}/{quiz.questions.length}</div>
            <p className="sub">
              {score === quiz.questions.length
                ? "Gabaritou! Esse tema está dominado."
                : score >= quiz.questions.length / 2
                  ? "Bom resultado! Revise as explicações das que errou."
                  : "Vale revisar esse tema — os flashcards ajudam bastante."}
            </p>
            <button className="btn" onClick={onClose}>Concluir</button>
            <button className="btn secondary" onClick={() => { setAnswers([]); setI(0); }}>Refazer</button>
          </div>
        ) : (
          <>
            <div className="stack" style={{ gap: 10 }}>
              <SubjectTag subject={quiz.subject} />
              <p style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{q.question}</p>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {q.options.map((opt, idx) => {
                const cls = picked == null ? "" : idx === q.answerIndex ? "right" : idx === picked ? "wrong" : "";
                return (
                  <button key={idx} className={`option ${cls}`} onClick={() => pick(idx)}>
                    <span className="letter">{LETTERS[idx]}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {picked != null && (
              <>
                <div className={`notice ${picked === q.answerIndex ? "" : "error"}`} style={picked === q.answerIndex ? { background: "var(--ok-tint)", color: "var(--ink)" } : undefined}>
                  <b>{picked === q.answerIndex ? "Correta! " : `Resposta: ${LETTERS[q.answerIndex]}. `}</b>
                  {q.explanation}
                </div>
                <button className="btn" onClick={() => setI(i + 1)}>
                  {i + 1 < quiz.questions.length ? "Próxima" : "Ver resultado"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
