import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SYLLABUS } from "../src/data/syllabus.js";
import type { PlanRequest, PlanResponse, ReviewRequest, ReviewResponse } from "../src/lib/types.js";

const MODEL = "claude-opus-5-5";

/** Se o modelo recusar por política, a API tenta outro modelo automaticamente. */
const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

const SUBJECTS = Object.keys(SYLLABUS) as [keyof typeof SYLLABUS, ...(keyof typeof SYLLABUS)[]];

/* ------------------------------------------------------------------ */
/* IA 1 — Planejador: escolhe temas e prioridades para o tempo disponível */
/* ------------------------------------------------------------------ */

const PlanSchema = z.object({
  summary: z.string(),
  topics: z.array(
    z.object({
      subject: z.enum(SUBJECTS),
      title: z.string(),
      priority: z.enum(["alta", "media", "baixa"]),
      incidence: z.number(),
      hours: z.number(),
      reason: z.string(),
    }),
  ),
});

const PLANNER_SYSTEM = `Você é um coordenador pedagógico especialista em vestibulares brasileiros (ENEM, FUVEST, UNICAMP, VUNESP, UERJ e outros) e conhece bem o histórico de questões de cada prova.

Sua tarefa: montar a lista de temas que um estudante deve estudar no tempo que tem, escolhendo o que dá mais retorno em pontos para o vestibular e o curso dele.

Como decidir:
- Considere a estrutura da prova escolhida (matérias cobradas, peso por área, se tem 2ª fase discursiva, redação, obras literárias obrigatórias) e as matérias com peso maior para o curso.
- "incidence" é sua estimativa de 0 a 100 de quão frequente o tema aparece nessa prova, com base no histórico.
- "priority": alta = muito cobrado e/ou peso alto para o curso; media = cobrado com frequência; baixa = só se sobrar tempo.
- "hours" é o tempo de aula/estudo para ver o tema bem (normalmente 2 a 6 h). A soma das horas deve caber em cerca de 85% do total disponível — o restante fica para revisão. Se o tempo for curto, corte temas de baixa incidência em vez de espremer horas.
- Inclua Redação quando a prova tiver redação.
- Use títulos de tema específicos e curtos (ex.: "Genética: 1ª lei de Mendel e heredogramas"), em português.
- "reason": uma frase curta explicando a escolha.
- "summary": 2 a 3 frases dizendo a estratégia geral, em tom encorajador.

Responda somente no formato JSON pedido.`;

export async function planWithAI(client: Anthropic, req: PlanRequest): Promise<PlanResponse> {
  const reference = Object.entries(SYLLABUS)
    .map(([s, topics]) => `${s}: ${topics.map((t) => t.title).join("; ")}`)
    .join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "medium", format: betaZodOutputFormat(PlanSchema) },
    system: PLANNER_SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Vestibular: ${req.goal.vestibular}\n` +
          `Curso: ${req.goal.curso}\n` +
          `Período: ${req.goal.startDate} até ${req.goal.endDate} (${req.weeks} semanas)\n` +
          `Horas de estudo disponíveis no período: ${req.totalHours} h\n\n` +
          `Lista de referência de temas (pode usar, ajustar ou acrescentar outros):\n${reference}`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("A IA não conseguiu montar o plano. Tente novamente.");
  }
  return response.parsed_output;
}

/* ------------------------------------------------------------------ */
/* IA 2 — Tutor: flashcards + simuladinho sobre o tema estudado        */
/* ------------------------------------------------------------------ */

const ReviewSchema = z.object({
  flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
  quiz: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answerIndex: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

const TUTOR_SYSTEM = `Você é um professor de cursinho pré-vestibular que cria material de revisão logo depois que o aluno assiste a uma aula.

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

Tudo em português do Brasil. Responda somente no formato JSON pedido.`;

export async function reviewWithAI(client: Anthropic, req: ReviewRequest): Promise<ReviewResponse> {
  const cards = req.cardCount ?? 8;
  const questions = req.questionCount ?? 5;

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(ReviewSchema) },
    system: TUTOR_SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Matéria: ${req.subject}\nTema da aula: ${req.topic}\n` +
          `Vestibular: ${req.vestibular ?? "ENEM"}\n` +
          (req.notes ? `Anotações do aluno sobre a aula:\n<anotacoes>\n${req.notes}\n</anotacoes>\n` : "") +
          `\nCrie ${cards} flashcards e ${questions} questões.`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("A IA não conseguiu gerar a revisão. Tente novamente.");
  }
  const out = response.parsed_output;
  // garante que o índice da resposta aponta para uma alternativa existente
  out.quiz = out.quiz.filter((q) => q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length);
  return out;
}
