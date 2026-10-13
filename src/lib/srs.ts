import type { Flashcard } from "./types";
import { addDays, today } from "./dates";

/** Intervalo (dias) de cada caixa de Leitner. */
const INTERVALS = [0, 1, 3, 7, 16];

export function review(card: Flashcard, knew: boolean): Flashcard {
  const box = knew ? Math.min(card.box + 1, INTERVALS.length - 1) : 0;
  return {
    ...card,
    box,
    due: addDays(today(), knew ? INTERVALS[box] : 0),
    seen: card.seen + 1,
    correct: card.correct + (knew ? 1 : 0),
  };
}

export function isDue(card: Flashcard): boolean {
  return card.due <= today();
}
