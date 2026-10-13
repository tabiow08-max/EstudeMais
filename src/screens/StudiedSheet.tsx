import { useState } from "react";
import { Layers, ListChecks, Sparkles } from "lucide-react";
import { SUBJECT_IDS, SUBJECTS } from "../data/subjects";
import { AIUnavailableError, generateReview } from "../lib/api";
import { today } from "../lib/dates";
import { uid, useStore } from "../lib/store";
import type { Flashcard, Quiz, StudyBlock, SubjectId } from "../lib/types";
import { Loading, Sheet } from "../components/ui";

export type StudiedSeed = Pick<StudyBlock, "subject" | "title"> & Partial<StudyBlock>;

interface Props {
  block?: StudiedSeed;
  onClose: () => void;
  onOpenDeck: (subject: SubjectId, topic: string) => void;
  onOpenQuiz: (quizId: string) => void;
}

/** "Estudei!" — a IA tutora gera flashcards e um simuladinho do tema da aula. */
export function StudiedSheet({ block, onClose, onOpenDeck, onOpenQuiz }: Props) {
  const { state, addStudyMaterial, toggleBlock, markStudied } = useStore();
  const [subject, setSubject] = useState<SubjectId>(block?.subject ?? "biologia");
  const [topic, setTopic] = useState(block?.title.replace(/^Revisão: /, "") ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ cards: number; quizId: string } | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateReview({
        subject,
        topic: topic.trim(),
        notes: notes.trim() || undefined,
        vestibular: state.goal?.vestibular,
      });
      const now = new Date().toISOString();
      const cards: Flashcard[] = res.flashcards.map((c) => ({
        id: uid(), subject, topic: topic.trim(), front: c.front, back: c.back,
        box: 0, due: today(), seen: 0, correct: 0, createdAt: now,
      }));
      const quiz: Quiz = { id: uid(), subject, topic: topic.trim(), questions: res.quiz, createdAt: now };
      addStudyMaterial(cards, quiz);
      if (block?.id && !block.done) toggleBlock(block.id);
      else markStudied();
      setResult({ cards: cards.length, quizId: quiz.id });
    } catch (e) {
      setError(
        e instanceof AIUnavailableError
          ? "A IA não está configurada. Adicione a ANTHROPIC_API_KEY no servidor (veja o README) para gerar flashcards e simulados."
          : (e as Error).message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="Estudei!" onClose={onClose}>
      {loading && <Loading text="Criando flashcards e um simuladinho sobre o que você estudou…" />}

      {!loading && result && (
        <div className="stack">
          <div className="soft">
            <h3>Prontinho ✨</h3>
            <p className="sub" style={{ marginTop: 6 }}>
              {result.cards} flashcards e um simuladinho sobre <b>{topic}</b> foram criados.
            </p>
          </div>
          <button className="btn" onClick={() => onOpenDeck(subject, topic.trim())}>
            <Layers size={18} /> Revisar flashcards
          </button>
          <button className="btn secondary" onClick={() => onOpenQuiz(result.quizId)}>
            <ListChecks size={18} /> Fazer o simuladinho
          </button>
        </div>
      )}

      {!loading && !result && (
        <>
          <p className="sub">Conte o que você estudou e a IA cria a revisão na hora.</p>
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
            <label htmlFor="tema">Tema da aula</label>
            <input id="tema" className="input" placeholder="Ex.: Lipídios e suas funções" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="notas">O que você viu? (opcional)</label>
            <textarea
              id="notas"
              className="input"
              placeholder="Cole suas anotações ou os pontos principais da aula — a revisão fica mais parecida com o que você estudou."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <div className="notice error">{error}</div>}
          <button className="btn" disabled={topic.trim().length < 2} onClick={run}>
            <Sparkles size={18} /> Gerar flashcards e simuladinho
          </button>
          {block?.id && !block.done && (
            <button
              className="btn secondary"
              onClick={() => {
                toggleBlock(block.id!);
                onClose();
              }}
            >
              Só marcar como estudado
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
