import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SYLLABUS } from "../data/syllabus";
import { PLANNER_SYSTEM, plannerUserMessage, TUTOR_SYSTEM, tutorUserMessage } from "./prompts";
import type { PlanRequest, PlanResponse, ReviewRequest, ReviewResponse } from "./types";

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


export async function planWithAI(client: Anthropic, req: PlanRequest): Promise<PlanResponse> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "medium", format: betaZodOutputFormat(PlanSchema) },
    system: PLANNER_SYSTEM + "\n\nResponda somente no formato JSON pedido.",
    messages: [
      {
        role: "user",
        content: plannerUserMessage(req),
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


export async function reviewWithAI(client: Anthropic, req: ReviewRequest): Promise<ReviewResponse> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(ReviewSchema) },
    system: TUTOR_SYSTEM + "\n\nResponda somente no formato JSON pedido.",
    messages: [
      {
        role: "user",
        content: tutorUserMessage(req),
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
