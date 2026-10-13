import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, Lightbulb, Sparkles, X } from "lucide-react";
import { review, isDue } from "../lib/srs";
import { useStore } from "../lib/store";
import type { SubjectId } from "../lib/types";
import { SubjectTag } from "../components/ui";

/** Sessão de revisão de flashcards (cards vencidos primeiro). */
export function Review({ subject, topic, onClose }: { subject?: SubjectId; topic?: string; onClose: () => void }) {
  const { state, updateCard } = useStore();

  // a fila é fixada ao abrir, para não "pular" quando os cards mudam de caixa
  const [queue] = useState(() => {
    const pool = state.cards.filter((c) => (!subject || c.subject === subject) && (!topic || c.topic === topic));
    const due = pool.filter(isDue);
    return (due.length ? due : pool).map((c) => c.id);
  });
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const cards = useMemo(() => new Map(state.cards.map((c) => [c.id, c])), [state.cards]);
  const card = cards.get(queue[i]);
  const finished = i >= queue.length;
  const right = Object.values(answers).filter(Boolean).length;

  function answer(knew: boolean) {
    if (!card) return;
    if (card.id in answers) return next();
    updateCard(review(card, knew));
    setAnswers((a) => ({ ...a, [card.id]: knew }));
    setFlipped(true);
  }
  function next() {
    setFlipped(false);
    setI((x) => x + 1);
  }
  function prev() {
    setFlipped(false);
    setI((x) => Math.max(0, x - 1));
  }

  if (!queue.length) {
    return (
      <div className="app">
        <div className="screen full">
          <Header onClose={onClose} label="" />
          <p className="sub center">Nenhum card aqui ainda.</p>
        </div>
      </div>
    );
  }

  if (finished || !card) {
    return (
      <div className="app">
        <div className="screen full" style={{ justifyContent: "center" }}>
          <div className="stack center" style={{ alignItems: "center" }}>
            <Sparkles size={32} />
            <h1>Revisão concluída</h1>
            <p className="sub">
              Você sabia {right} de {Object.keys(answers).length} cards. Os que você errou voltam amanhã; os que acertou,
              mais pra frente.
            </p>
          </div>
          <button className="btn" onClick={onClose}>Voltar</button>
        </div>
      </div>
    );
  }

  const answered = card.id in answers;

  return (
    <div className="app">
      <div className="screen full">
        <Header onClose={onClose} label={`${i + 1}/${queue.length}`} />

        <div className={`flash ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
          <div className="flash-inner">
            <div className="flash-face">
              <SubjectTag subject={card.subject} />
              <p className="flash-text">{card.front}</p>
              <span className="muted row" style={{ gap: 6 }}>
                ✳ Toque para ver a resposta
              </span>
            </div>
            <div className="flash-face back">
              <SubjectTag subject={card.subject} />
              <p className="flash-text" style={{ fontSize: 17 }}>{card.back}</p>
              {answered ? (
                <div className="notice row" style={{ width: "100%", background: answers[card.id] ? "var(--ok-tint)" : "var(--bad-tint)" }}>
                  <span className="check on" style={{ background: answers[card.id] ? "var(--ok)" : "var(--bad)", borderColor: "transparent" }}>
                    {answers[card.id] ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  </span>
                  <div style={{ textAlign: "left" }}>
                    <b style={{ fontWeight: 500, color: "var(--ink)" }}>{answers[card.id] ? "Mandou bem!" : "Sem problemas"}</b>
                    <p className="muted">{answers[card.id] ? "Esse card volta daqui a alguns dias." : "Esse card volta hoje de novo."}</p>
                  </div>
                </div>
              ) : (
                <span className="muted">{card.topic}</span>
              )}
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "center", gap: 28 }}>
          <button className="round" onClick={prev} disabled={i === 0} aria-label="Anterior"><ChevronLeft size={20} /></button>
          <button className="round big" onClick={() => setFlipped((f) => !f)} aria-label="Virar card"><ArrowLeftRight size={20} /></button>
          <button className="round" onClick={next} aria-label="Próximo"><ChevronRight size={20} /></button>
        </div>

        <div className="row between" style={{ marginTop: "auto" }}>
          <button className="btn secondary small" onClick={() => answer(true)}>
            <Lightbulb size={16} /> Saber
          </button>
          <button className="btn secondary small" onClick={() => answer(false)}>
            Não sei <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <div className="topbar">
      <button className="icon-btn plain" onClick={onClose} aria-label="Fechar"><X size={22} /></button>
      <span className="muted">{label}</span>
      <span style={{ width: 40 }} />
    </div>
  );
}
