import { AREA_WEIGHTS, courseArea, SUBJECT_IDS, SUBJECTS } from "../data/subjects";
import { SYLLABUS } from "../data/syllabus";
import type { Goal, PlanResponse, PlanTopic, Priority, SubjectId } from "./types";

type Topic = PlanResponse["topics"][number];

/** Matérias cobradas na prova. O curso nunca tira matéria do plano, só muda o peso. */
export function requiredSubjects(vestibular: string): SubjectId[] {
  if (/\bita\b/i.test(vestibular)) return ["matematica", "fisica", "quimica", "portugues", "ingles", "redacao"];
  return [...SUBJECT_IDS];
}

function weightOf(goal: Goal, subject: SubjectId): number {
  return AREA_WEIGHTS[courseArea(goal.curso)][subject] ?? 1;
}

function toTopic(goal: Goal, subject: SubjectId, title: string, incidence: number): Topic & { score: number } {
  const score = incidence * weightOf(goal, subject);
  const priority: Priority = score >= 80 ? "alta" : score >= 55 ? "media" : "baixa";
  return {
    subject,
    title,
    incidence,
    priority,
    hours: score >= 110 ? 5 : score >= 80 ? 4 : score >= 55 ? 3 : 2,
    score,
    reason:
      priority === "alta"
        ? `Muito cobrado e importante para ${goal.curso}.`
        : priority === "media"
          ? "Aparece com frequência nas provas."
          : "Cai menos, mas garante pontos nessa matéria.",
  };
}

/**
 * Planejador por regras, usado quando a IA não está disponível.
 * Primeiro garante os temas mais cobrados de TODAS as matérias da prova;
 * depois usa o tempo que sobra nos temas de maior incidência × peso do curso.
 */
export function offlinePlan(goal: Goal, totalHours: number): PlanResponse {
  const budget = totalHours * 0.85;
  const subjects = requiredSubjects(goal.vestibular);
  const bySubject = subjects.map((s) =>
    [...SYLLABUS[s]].sort((a, b) => b.incidence - a.incidence).map((t) => toTopic(goal, s, t.title, t.incidence)),
  );

  const chosen: (Topic & { score: number })[] = [];
  let used = 0;

  // 1) base: os temas mais cobrados de cada matéria (2 por matéria, ou 1 se o tempo for curto)
  const base = budget >= subjects.length * 6 ? 2 : 1;
  for (let round = 0; round < base; round++) {
    for (const list of bySubject) {
      const t = list.shift();
      if (!t) continue;
      if (budget < subjects.length * 3) t.hours = Math.min(t.hours, 2); // tempo curto: aulas enxutas
      chosen.push(t);
      used += t.hours;
    }
  }

  // 2) o tempo restante vai para os temas de maior incidência × peso do curso
  const rest = bySubject.flat().sort((a, b) => b.score - a.score);
  for (const t of rest) {
    if (used + t.hours > budget) continue;
    chosen.push(t);
    used += t.hours;
  }

  const topSubjects = Object.entries(AREA_WEIGHTS[courseArea(goal.curso)])
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([s]) => SUBJECTS[s as SubjectId].name);

  return {
    summary:
      `Plano para ${goal.vestibular} — ${goal.curso}, com todas as ${subjects.length} matérias da prova. ` +
      `Com ~${totalHours}h disponíveis, ${topSubjects.join(", ")} recebem mais tempo por pesarem mais no seu curso.`,
    topics: chosen.map(({ score: _score, ...t }) => t),
  };
}

/**
 * Garante que o plano da IA cubra todas as matérias da prova: se alguma
 * ficou de fora, entram os temas mais cobrados dela.
 */
export function fillMissingSubjects<T extends Topic | PlanTopic>(goal: Goal, topics: T[]): Topic[] {
  const present = new Set(topics.map((t) => t.subject));
  const extra: Topic[] = [];
  for (const s of requiredSubjects(goal.vestibular)) {
    if (present.has(s)) continue;
    const top = [...SYLLABUS[s]].sort((a, b) => b.incidence - a.incidence).slice(0, 2);
    for (const t of top) {
      const { score: _score, ...topic } = toTopic(goal, s, t.title, t.incidence);
      extra.push({ ...topic, hours: Math.min(topic.hours, 3) });
    }
  }
  return [...topics, ...extra];
}
