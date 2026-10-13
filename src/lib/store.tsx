import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppState, Flashcard, Quiz, StudyBlock } from "./types";
import { today } from "./dates";
import { connectCloud, type CloudSync } from "./sync";

const KEY = "estudemais:v1";

const INITIAL: AppState = {
  profile: { name: "", quote: "Sonhe, planeje, estude, conquiste." },
  windows: [],
  blocks: [],
  cards: [],
  quizzes: [],
  studyDays: [],
};

function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    /* armazenamento indisponível — começa vazio */
  }
  return INITIAL;
}

interface Store {
  state: AppState;
  /** false enquanto busca os dados salvos na conta. */
  ready: boolean;
  syncError: string | null;
  set: (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
  toggleBlock: (id: string) => void;
  addBlock: (block: StudyBlock) => void;
  updateCard: (card: Flashcard) => void;
  addStudyMaterial: (cards: Flashcard[], quiz: Quiz) => void;
  saveQuiz: (quiz: Quiz) => void;
  markStudied: () => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadLocal);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const cloud = useRef<CloudSync | null>(null);
  const loadedFromCloud = useRef(false);

  // conecta uma vez ao armazenamento da conta (quando roda dentro do Claude)
  useEffect(() => {
    let alive = true;
    connectCloud(INITIAL, setSyncError)
      .then((c) => {
        if (!alive) return;
        cloud.current = c;
        if (c?.initial) {
          loadedFromCloud.current = true;
          setState(c.initial);
        } else if (c) {
          // primeira vez com a conta: envia o que já existe neste aparelho
          setState((s) => {
            c.save(s);
            return s;
          });
        }
      })
      .catch(() => setSyncError("Não foi possível carregar seus dados da conta. Usando os dados deste aparelho."))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora — o app continua funcionando em memória */
    }
    if (ready && cloud.current) {
      if (loadedFromCloud.current) loadedFromCloud.current = false; // não regrava o que acabou de chegar
      else cloud.current.save(state);
    }
  }, [state, ready]);

  const set = useCallback<Store["set"]>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const withStudyDay = (s: AppState) => (s.studyDays.includes(today()) ? s.studyDays : [...s.studyDays, today()]);

  const store = useMemo<Store>(
    () => ({
      state,
      ready,
      syncError,
      set,
      toggleBlock: (id) =>
        setState((s) => {
          const blocks = s.blocks.map((b) => (b.id === id ? { ...b, done: !b.done } : b));
          const nowDone = blocks.find((b) => b.id === id)?.done;
          return { ...s, blocks, studyDays: nowDone ? withStudyDay(s) : s.studyDays };
        }),
      addBlock: (block) =>
        setState((s) => ({
          ...s,
          blocks: [...s.blocks, block].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
        })),
      updateCard: (card) =>
        setState((s) => ({
          ...s,
          cards: s.cards.map((c) => (c.id === card.id ? card : c)),
          studyDays: withStudyDay(s),
        })),
      addStudyMaterial: (cards, quiz) =>
        setState((s) => ({ ...s, cards: [...cards, ...s.cards], quizzes: [quiz, ...s.quizzes] })),
      saveQuiz: (quiz) =>
        setState((s) => ({
          ...s,
          quizzes: s.quizzes.map((q) => (q.id === quiz.id ? quiz : q)),
          studyDays: withStudyDay(s),
        })),
      markStudied: () => setState((s) => ({ ...s, studyDays: withStudyDay(s) })),
      reset: () => setState((s) => ({ ...INITIAL, profile: { ...INITIAL.profile, quote: s.profile.quote } })),
    }),
    [state, ready, syncError, set],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do StoreProvider");
  return s;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
