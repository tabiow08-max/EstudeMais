import type { PlanRequest, PlanResponse, ReviewRequest, ReviewResponse } from "./types";
import {
  cleanPlan, cleanReview, PLAN_FORMAT, PLANNER_SYSTEM, plannerUserMessage,
  REVIEW_FORMAT, TUTOR_SYSTEM, tutorUserMessage,
} from "./prompts";

export class AIUnavailableError extends Error {}

/* ---------- Dentro do Claude (página publicada): IA via capacidade `sample` ---------- */

type SampleJson = (input: string, opts?: { modelTier?: string; cache?: boolean }) => Promise<unknown>;
type SampleFn = { json: SampleJson };

interface ClaudeHost {
  use(name: string): Promise<unknown>;
}

function host(): ClaudeHost | undefined {
  return (window as unknown as { claude?: ClaudeHost }).claude;
}

export const insideClaude = () => typeof host()?.use === "function";

let samplePromise: Promise<SampleFn | null> | null = null;
function getSample() {
  samplePromise ??= host()!.use("sample").then((s) => (s as SampleFn) ?? null).catch(() => null);
  return samplePromise;
}

const HIDE = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
let sampleDenied = false;

async function askClaude(prompt: string, modelTier: "default" | "complex"): Promise<unknown> {
  const sample = sampleDenied ? null : await getSample();
  if (!sample) throw new AIUnavailableError("A IA não está disponível nesta visualização.");
  try {
    return await sample.json(prompt, { modelTier, cache: false });
  } catch (e) {
    const code = (e as { code?: string }).code ?? "upstream_error";
    if (HIDE.includes(code)) {
      sampleDenied = true;
      throw new AIUnavailableError("O uso do Claude não foi permitido nesta página.");
    }
    if (code === "rate_limited") throw new Error("Muitos pedidos ao Claude agora. Espere um pouco e tente de novo.");
    if (code === "session_expired") throw new Error("Sua sessão expirou. Entre de novo no Claude.");
    if (code === "invalid_json") throw new Error("A IA respondeu num formato inesperado. Tente de novo.");
    if (code === "refused") throw new Error("A IA não quis responder esse pedido. Tente descrever o tema de outro jeito.");
    throw new Error("Não foi possível falar com a IA agora. Tente de novo.");
  }
}

/* ---------- Rodando localmente: servidor próprio com ANTHROPIC_API_KEY ---------- */

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new AIUnavailableError("Servidor da IA fora do ar.");
  }
  if (res.status === 503 || res.status === 404) {
    throw new AIUnavailableError("IA não configurada (falta ANTHROPIC_API_KEY no servidor).");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data as T;
}

/* ---------- API usada pelas telas ---------- */

export async function aiStatus(): Promise<boolean> {
  if (insideClaude()) return !sampleDenied && (await getSample()) != null;
  try {
    const res = await fetch("/api/health");
    return res.ok && Boolean((await res.json()).ai);
  } catch {
    return false;
  }
}

export async function generatePlan(req: PlanRequest): Promise<PlanResponse> {
  if (!insideClaude()) return post<PlanResponse>("/api/plan", req);
  const raw = await askClaude(`${PLANNER_SYSTEM}\n\n${plannerUserMessage(req)}\n\n${PLAN_FORMAT}`, "complex");
  return cleanPlan(raw);
}

export async function generateReview(req: ReviewRequest): Promise<ReviewResponse> {
  if (!insideClaude()) return post<ReviewResponse>("/api/review", req);
  const raw = await askClaude(`${TUTOR_SYSTEM}\n\n${tutorUserMessage(req)}\n\n${REVIEW_FORMAT}`, "default");
  return cleanReview(raw);
}
