import { AREA_WEIGHTS, courseArea, SUBJECTS } from "../data/subjects";
import { SYLLABUS } from "../data/syllabus";
import type { Goal, PlanResponse, Priority, SubjectId } from "./types";

/**
 * Planejador por regras, usado quando a IA não está disponível.
 * Prioriza pela incidência histórica × peso da matéria para o curso e
 * corta os temas menos cobrados quando o tempo é curto.
 */
export function offlinePlan(goal: Goal, totalHours: number): PlanResponse {
  const area = courseArea(goal.curso);
  const weights = AREA_WEIGHTS[area];
  const isEnem = /enem/i.test(goal.vestibular);

  const candidates = (Object.keys(SYLLABUS) as SubjectId[])
    .filter((s) => !(s === "ingles" && !isEnem && area !== "humanas"))
    .flatMap((subject) =>
      SYLLABUS[subject].map((t) => ({
        subject,
        title: t.title,
        incidence: t.incidence,
        score: t.incidence * (weights[subject] ?? 1),
      })),
    )
    .sort((a, b) => b.score - a.score);

  // horas por tema conforme o score (2–5h); só entra o que cabe
  const budget = totalHours * 0.85;
  const chosen: PlanResponse["topics"] = [];
  let used = 0;
  for (const c of candidates) {
    const hours = c.score >= 110 ? 5 : c.score >= 80 ? 4 : c.score >= 55 ? 3 : 2;
    if (used + hours > budget && chosen.length >= 6) continue;
    used += hours;
    const priority: Priority = c.score >= 80 ? "alta" : c.score >= 55 ? "media" : "baixa";
    chosen.push({
      subject: c.subject,
      title: c.title,
      incidence: c.incidence,
      priority,
      hours,
      reason:
        priority === "alta"
          ? `Muito cobrado e importante para ${goal.curso}.`
          : priority === "media"
            ? "Aparece com frequência nas provas."
            : "Menor incidência — estude se sobrar tempo.",
    });
  }

  const topSubjects = Object.entries(weights)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([s]) => SUBJECTS[s as SubjectId].name);

  return {
    summary:
      `Plano gerado offline para ${goal.vestibular} — ${goal.curso}. ` +
      `Com ~${totalHours}h disponíveis, foco em ${topSubjects.join(", ")} e nos temas de maior incidência. ` +
      `Configure a IA para um plano mais personalizado.`,
    topics: chosen,
  };
}
