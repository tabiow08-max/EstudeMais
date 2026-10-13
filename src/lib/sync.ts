import { SUBJECT_IDS } from "../data/subjects";
import { buildSchedule } from "./scheduler";
import type { AppState, Flashcard, Quiz, StudyBlock } from "./types";

/**
 * Salvamento na conta do Claude (capacidade `db`), quando o app roda como
 * página publicada. Cada pessoa tem uma área privada `data/users/<id>/`.
 *
 * Documentos:
 *  - core: perfil, objetivo, disponibilidade, plano, aulas concluídas, estudos avulsos
 *  - cards_<matéria>, quizzes_<matéria>: flashcards e simuladinhos
 * O cronograma não é salvo inteiro: é recalculado a partir do plano.
 */

type Doc = Record<string, unknown>;

interface DocRef {
  set(data: Doc): Promise<void>;
}
interface Collection {
  doc(id: string): DocRef;
  get(): Promise<{ docs: { id: string; data(): Doc | undefined }[] }>;
}
interface DB {
  collection(path: string): Collection;
}
interface UserCap {
  id(): Promise<string | null>;
}

export function splitState(s: AppState): Record<string, Doc> {
  const regenerated = (b: StudyBlock) => b.kind !== "livre" && (!s.goal || b.date >= s.goal.startDate);
  const docs: Record<string, Doc> = {
    core: {
      profile: s.profile,
      goal: s.goal ?? null,
      windows: s.windows,
      plan: s.plan ?? null,
      done: s.blocks.filter((b) => b.done && regenerated(b)).map((b) => b.id),
      extraBlocks: s.blocks.filter((b) => !regenerated(b)),
      studyDays: s.studyDays,
    },
  };
  for (const subj of SUBJECT_IDS) {
    docs[`cards_${subj}`] = { cards: s.cards.filter((c) => c.subject === subj) };
    docs[`quizzes_${subj}`] = { quizzes: s.quizzes.filter((q) => q.subject === subj) };
  }
  return docs;
}

export function joinState(docs: Record<string, Doc>, base: AppState): AppState {
  const core = (docs.core ?? {}) as Partial<{
    profile: AppState["profile"]; goal: AppState["goal"] | null; windows: AppState["windows"];
    plan: AppState["plan"] | null; done: string[]; extraBlocks: StudyBlock[]; studyDays: string[];
  }>;
  const goal = core.goal ?? undefined;
  const plan = core.plan ?? undefined;
  const windows = core.windows ?? [];
  const done = new Set(core.done ?? []);
  const generated = goal && plan ? buildSchedule(plan.topics, windows, goal.startDate, goal.endDate) : [];
  const blocks = [...(core.extraBlocks ?? []), ...generated.map((b) => ({ ...b, done: done.has(b.id) }))].sort((a, b) =>
    (a.date + a.start).localeCompare(b.date + b.start),
  );
  const cards: Flashcard[] = [];
  const quizzes: Quiz[] = [];
  for (const [id, d] of Object.entries(docs)) {
    if (id.startsWith("cards_")) cards.push(...((d.cards as Flashcard[]) ?? []));
    if (id.startsWith("quizzes_")) quizzes.push(...((d.quizzes as Quiz[]) ?? []));
  }
  cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  quizzes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    profile: core.profile ?? base.profile,
    goal,
    windows,
    plan,
    blocks,
    cards,
    quizzes,
    studyDays: core.studyDays ?? [],
  };
}

export interface CloudSync {
  /** Estado salvo na conta, ou null se ainda não há nada salvo. */
  initial: AppState | null;
  save(state: AppState): void;
}

/** Conecta ao armazenamento da conta; null quando o app não roda dentro do Claude. */
export async function connectCloud(base: AppState, onError: (msg: string) => void): Promise<CloudSync | null> {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  if (typeof claude?.use !== "function") return null;
  const [db, user] = (await Promise.all([claude.use("db"), claude.use("user")])) as [DB | null, UserCap | null];
  if (!db || !user) return null;
  const uid = await user.id().catch(() => null);
  if (!uid) return null;

  const col = db.collection(`data/users/${uid}`);
  const snap = await col.get();
  const loaded: Record<string, Doc> = {};
  for (const d of snap.docs) {
    const data = d.data();
    if (data) loaded[d.id] = data;
  }

  // o que já está salvo, para só escrever documentos que mudaram
  const saved = new Map<string, string>(Object.entries(loaded).map(([k, v]) => [k, JSON.stringify(v)]));
  const chains = new Map<string, Promise<void>>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: AppState | null = null;

  function flush() {
    if (!pending) return;
    const docs = splitState(pending);
    pending = null;
    for (const [id, body] of Object.entries(docs)) {
      const json = JSON.stringify(body);
      if (saved.get(id) === json) continue;
      // documento vazio que nunca existiu não precisa ser criado
      if (!saved.has(id) && id !== "core" && json.endsWith(":[]}")) continue;
      saved.set(id, json);
      const prev = chains.get(id) ?? Promise.resolve();
      chains.set(
        id,
        prev.then(() =>
          col
            .doc(id)
            .set(body)
            .catch((e: { code?: string }) => {
              saved.delete(id);
              onError(
                e.code === "quota_exceeded"
                  ? "O espaço de armazenamento acabou. Apague simulados antigos para continuar salvando."
                  : "Não foi possível salvar na sua conta agora. Suas mudanças ficam neste aparelho.",
              );
            }),
        ),
      );
    }
  }

  return {
    initial: Object.keys(loaded).length ? joinState(loaded, base) : null,
    save(state) {
      pending = state;
      clearTimeout(timer);
      timer = setTimeout(flush, 800);
    },
  };
}
