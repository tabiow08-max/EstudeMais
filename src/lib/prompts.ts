import { SYLLABUS } from "../data/syllabus";
import { SUBJECT_IDS } from "../data/subjects";
import type { PlanRequest, PlanResponse, Priority, ReviewRequest, ReviewResponse, SubjectId } from "./types";

/* IA 1 — Planejadora */

export const PLANNER_SYSTEM = `Você é um coordenador pedagógico especialista em vestibulares brasileiros (ENEM, FUVEST, UNICAMP, VUNESP, UERJ e outros) e conhece bem o histórico de questões de cada prova.

Sua tarefa: montar a lista de temas que um estudante deve estudar no tempo que tem, escolhendo o que dá mais retorno em pontos para o vestibular e o curso dele.

Como decidir:
- Considere a estrutura da prova escolhida (matérias cobradas, peso por área, se tem 2ª fase discursiva, redação, obras literárias obrigatórias) e as matérias com peso maior para o curso.
- "incidence" é sua estimativa de 0 a 100 de quão frequente o tema aparece nessa prova, com base no histórico.
- "priority": alta = muito cobrado e/ou peso alto para o curso; media = cobrado com frequência; baixa = só se sobrar tempo.
- "hours" é o tempo de aula/estudo para ver o tema bem (normalmente 2 a 6 h). A soma das horas deve caber em cerca de 85% do total disponível — o restante fica para revisão. Se o tempo for curto, corte temas de baixa incidência em vez de espremer horas.
- Inclua Redação quando a prova tiver redação.
- Use títulos de tema específicos e curtos (ex.: "Genética: 1ª lei de Mendel e heredogramas"), em português.
- "reason": uma frase curta explicando a escolha.
- "summary": 2 a 3 frases dizendo a estratégia geral, em tom encorajador.`;

export function plannerUserMessage(req: PlanRequest): string {
  const reference = Object.entries(SYLLABUS)
    .map(([s, topics]) => `${s}: ${topics.map((t) => t.title).join("; ")}`)
    .join("\n");
  return (
    `Vestibular: ${req.goal.vestibular}\n` +
    `Curso: ${req.goal.curso}\n` +
    `Período: ${req.goal.startDate} até ${req.goal.endDate} (${req.weeks} semanas)\n` +
    `Horas de estudo disponíveis no período: ${req.totalHours} h\n\n` +
    `Lista de referência de temas (pode usar, ajustar ou acrescentar outros):\n${reference}`
  );
}

export const PLAN_FORMAT =
  `Responda somente com um objeto JSON neste formato:\n` +
  `{"summary": string, "topics": [{"subject": um de ${JSON.stringify(SUBJECT_IDS)}, "title": string, ` +
  `"priority": "alta"|"media"|"baixa", "incidence": número 0-100, "hours": número, "reason": string}]}`;

/* IA 2 — Tutora */

export const TUTOR_SYSTEM = `Você é um professor de cursinho pré-vestibular que cria material de revisão logo depois que o aluno assiste a uma aula.

Flashcards:
- Cada card cobra UMA ideia importante, do jeito que costuma cair em prova.
- Frente: pergunta direta e curta. Verso: resposta completa em 1 a 3 frases, sem enrolação.
- Cubra os pontos mais cobrados do tema, do mais básico ao mais cobrado em prova.

Simuladinho:
- Questões de múltipla escolha no estilo do vestibular informado (para o ENEM, questões contextualizadas com situação-problema; para outros, no estilo da banca).
- Exatamente 5 alternativas por questão, só uma correta, e alternativas erradas plausíveis.
- "answerIndex" é o índice (0 a 4) da alternativa correta; varie a posição da correta entre as questões.
- "explanation": por que a correta está certa e qual o erro mais comum.
- Não escreva "A)", "B)" no texto das alternativas.

Tudo em português do Brasil.`;

export function tutorUserMessage(req: ReviewRequest): string {
  const cards = req.cardCount ?? 8;
  const questions = req.questionCount ?? 5;
  return (
    `Matéria: ${req.subject}\nTema da aula: ${req.topic}\n` +
    `Vestibular: ${req.vestibular ?? "ENEM"}\n` +
    (req.notes ? `Anotações do aluno sobre a aula:\n<anotacoes>\n${req.notes}\n</anotacoes>\n` : "") +
    `\nCrie ${cards} flashcards e ${questions} questões.`
  );
}

export const REVIEW_FORMAT =
  `Responda somente com um objeto JSON neste formato:\n` +
  `{"flashcards": [{"front": string, "back": string}], ` +
  `"quiz": [{"question": string, "options": [5 strings], "answerIndex": inteiro 0-4, "explanation": string}]}`;

/* Validação das respostas (a IA pode errar o formato) */

const PRIORITIES: Priority[] = ["alta", "media", "baixa"];
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown, def: number) => (typeof v === "number" && isFinite(v) ? v : Number(v) || def);

export function cleanPlan(raw: unknown): PlanResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const topics = (Array.isArray(o.topics) ? o.topics : [])
    .map((t: Record<string, unknown>) => ({
      subject: str(t?.subject) as SubjectId,
      title: str(t?.title),
      priority: (PRIORITIES.includes(t?.priority as Priority) ? t.priority : "media") as Priority,
      incidence: Math.max(0, Math.min(100, num(t?.incidence, 50))),
      hours: Math.max(1, Math.min(20, Math.round(num(t?.hours, 2)))),
      reason: str(t?.reason),
    }))
    .filter((t) => SUBJECT_IDS.includes(t.subject) && t.title);
  if (!topics.length) throw new Error("A IA não devolveu temas. Tente de novo.");
  return { summary: str(o.summary), topics };
}

export function cleanReview(raw: unknown): ReviewResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const flashcards = (Array.isArray(o.flashcards) ? o.flashcards : [])
    .map((c: Record<string, unknown>) => ({ front: str(c?.front), back: str(c?.back) }))
    .filter((c) => c.front && c.back);
  const quiz = (Array.isArray(o.quiz) ? o.quiz : [])
    .map((q: Record<string, unknown>) => ({
      question: str(q?.question),
      options: (Array.isArray(q?.options) ? q.options : []).map(str).filter(Boolean),
      answerIndex: Math.round(num(q?.answerIndex, -1)),
      explanation: str(q?.explanation),
    }))
    .filter((q) => q.question && q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length);
  if (!flashcards.length && !quiz.length) throw new Error("A IA não devolveu a revisão. Tente de novo.");
  return { flashcards, quiz };
}
