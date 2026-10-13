import type { DayWindow, PlanTopic, Priority, StudyBlock, SubjectId } from "./types";
import { addDays, daysBetween, fromISO, fromMinutes, toMinutes } from "./dates";

const LESSON_MIN = 60; // duração padrão de uma aula
const MIN_BLOCK = 30; // sobra mínima para virar bloco

interface Slot {
  date: string;
  start: string;
  end: string;
  hours: number;
}

/** Quebra as janelas de estudo em blocos de ~1h ao longo de todo o período. */
export function buildSlots(windows: DayWindow[], startDate: string, endDate: string): Slot[] {
  const slots: Slot[] = [];
  const total = daysBetween(startDate, endDate);
  for (let i = 0; i <= total; i++) {
    const date = addDays(startDate, i);
    const dow = fromISO(date).getDay();
    for (const w of windows.filter((x) => x.day === dow)) {
      let t = toMinutes(w.start);
      const end = toMinutes(w.end);
      while (end - t >= MIN_BLOCK) {
        const len = Math.min(LESSON_MIN, end - t);
        // evita deixar um "resto" menor que 30 min
        const realLen = end - (t + len) < MIN_BLOCK ? end - t : len;
        slots.push({ date, start: fromMinutes(t), end: fromMinutes(t + realLen), hours: realLen / 60 });
        t += realLen;
      }
    }
  }
  return slots;
}

export function totalHours(windows: DayWindow[], startDate: string, endDate: string): number {
  return Math.round(buildSlots(windows, startDate, endDate).reduce((s, x) => s + x.hours, 0));
}

const PRIORITY_WEIGHT: Record<Priority, number> = { alta: 3, media: 2, baixa: 1 };

/**
 * Distribui os temas do plano nos horários disponíveis.
 *
 * - Temas de prioridade alta vêm primeiro; matérias são intercaladas para
 *   não repetir a mesma matéria em blocos seguidos.
 * - Redação recebe um bloco de prática por semana.
 * - Depois que todos os temas foram vistos, o tempo restante vira revisão dos
 *   temas prioritários (os de maior incidência voltam mais vezes).
 */
export function buildSchedule(
  topics: PlanTopic[],
  windows: DayWindow[],
  startDate: string,
  endDate: string,
): StudyBlock[] {
  const slots = buildSlots(windows, startDate, endDate);
  if (!slots.length || !topics.length) return [];

  const sorted = [...topics].sort(
    (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || b.incidence - a.incidence,
  );

  // Se não couber tudo, corta pelas horas proporcionalmente (mín. 1h por tema)
  const available = slots.reduce((s, x) => s + x.hours, 0);
  const essayTopics = sorted.filter((t) => t.subject === "redacao");
  const contentTopics = sorted.filter((t) => t.subject !== "redacao");
  const weeks = Math.max(1, Math.ceil(daysBetween(startDate, endDate) / 7));
  const essayBudget = essayTopics.length ? Math.min(weeks, available * 0.12) : 0;
  const contentAvailable = (available - essayBudget) * 0.85; // 15% reservado para revisão
  const wanted = contentTopics.reduce((s, t) => s + t.hours, 0);
  const scale = wanted > contentAvailable ? contentAvailable / wanted : 1;

  // fila de "unidades de aula" por matéria
  const queues = new Map<SubjectId, { topic: PlanTopic; remaining: number }[]>();
  for (const t of contentTopics) {
    const hours = Math.max(1, Math.round(t.hours * scale));
    if (!queues.has(t.subject)) queues.set(t.subject, []);
    queues.get(t.subject)!.push({ topic: t, remaining: hours });
  }

  const essayEvery = essayBudget > 0 ? Math.max(1, Math.floor(slots.length / essayBudget)) : Infinity;
  const blocks: StudyBlock[] = [];
  let last: SubjectId | undefined;
  let essayIdx = 0;
  const reviewPool = sorted.filter((t) => t.subject !== "redacao" && t.priority !== "baixa");
  let reviewIdx = 0;

  slots.forEach((slot, i) => {
    const id = `${slot.date}-${slot.start}`;
    const base = { id, date: slot.date, start: slot.start, end: slot.end, done: false };

    if (essayTopics.length && (i + 1) % essayEvery === 0) {
      const t = essayTopics[essayIdx++ % essayTopics.length];
      blocks.push({ ...base, subject: "redacao", topicId: t.id, title: t.title, kind: "redacao" });
      last = "redacao";
      return;
    }

    // escolhe a matéria com mais carga pendente ponderada pela prioridade, evitando repetir a anterior
    let best: SubjectId | undefined;
    let bestScore = -1;
    for (const [subject, q] of queues) {
      if (!q.length) continue;
      const head = q[0];
      const pending = q.reduce((s, x) => s + x.remaining, 0);
      let score = pending * PRIORITY_WEIGHT[head.topic.priority] + head.topic.incidence / 50;
      if (subject === last) score *= 0.25;
      if (score > bestScore) {
        bestScore = score;
        best = subject;
      }
    }

    if (best) {
      const q = queues.get(best)!;
      const head = q[0];
      blocks.push({ ...base, subject: best, topicId: head.topic.id, title: head.topic.title, kind: "aula" });
      head.remaining -= 1;
      if (head.remaining <= 0) q.shift();
      last = best;
      return;
    }

    // conteúdo acabou → revisão espaçada dos temas prioritários
    if (reviewPool.length) {
      let t = reviewPool[reviewIdx++ % reviewPool.length];
      if (t.subject === last && reviewPool.length > 1) t = reviewPool[reviewIdx++ % reviewPool.length];
      blocks.push({ ...base, subject: t.subject, topicId: t.id, title: `Revisão: ${t.title}`, kind: "revisao" });
      last = t.subject;
    }
  });

  return blocks;
}
