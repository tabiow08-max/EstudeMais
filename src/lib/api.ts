import type { PlanRequest, PlanResponse, ReviewRequest, ReviewResponse } from "./types";
import {
  cleanPlan, cleanReview, PLAN_FORMAT, PLANNER_SYSTEM, plannerUserMessage,
  REVIEW_FORMAT, TUTOR_SYSTEM, tutorUserMessage,
} from "./prompts";

/** true na versão publicada dentro do claude.ai (definido no build). */
declare const __ARTIFACT__: boolean;

export class AIUnavailableError extends Error {}

/*
 * O app pode rodar de três jeitos, e a IA segue o jeito:
 *  1. dentro do claude.ai (página publicada): usa o Claude da conta de quem abriu;
 *  2. instalado no aparelho: usa a chave da API salva em Configurações;
 *  3. no computador com `npm run dev`: usa o servidor local (chave no .env).
 */

/* ---------- Chave da API guardada no aparelho ---------- */

const KEY_STORAGE = "estudemais:apiKey";

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* sem armazenamento: a chave vale só nesta sessão */
  }
}

const isLocalServer = () => /^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)$/.test(location.hostname);

/* ---------- 1. Dentro do Claude: capacidade `sample` ---------- */

type SampleJson = (input: string, opts?: { modelTier?: string; cache?: boolean }) => Promise<unknown>;
type SampleFn = { json: SampleJson };

function host(): { use(name: string): Promise<unknown> } | undefined {
  return (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
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

/* ---------- 2. Instalado no aparelho: chave da API ---------- */

async function direct() {
  if (__ARTIFACT__) return null;
  return import("./directClient");
}

/* ---------- 3. Servidor local ---------- */

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

const NO_KEY = "Para a IA funcionar, cole sua chave da API em Perfil → Configurações.";

/* ---------- API usada pelas telas ---------- */

export type AIMode = "claude" | "chave" | "servidor" | "nenhum";

/** Como a IA funciona neste aparelho agora. */
export function aiMode(): AIMode {
  if (insideClaude()) return "claude";
  if (getApiKey()) return "chave";
  if (isLocalServer()) return "servidor";
  return "nenhum";
}

export async function aiStatus(): Promise<boolean> {
  switch (aiMode()) {
    case "claude":
      return !sampleDenied && (await getSample()) != null;
    case "chave":
      return true;
    case "servidor":
      try {
        const res = await fetch("/api/health");
        return res.ok && Boolean((await res.json()).ai);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export async function generatePlan(req: PlanRequest): Promise<PlanResponse> {
  const mode = aiMode();
  if (mode === "claude") {
    return cleanPlan(await askClaude(`${PLANNER_SYSTEM}\n\n${plannerUserMessage(req)}\n\n${PLAN_FORMAT}`, "complex"));
  }
  if (mode === "chave") return (await direct())!.directPlan(getApiKey(), req);
  if (mode === "servidor") return post<PlanResponse>("/api/plan", req);
  throw new AIUnavailableError(NO_KEY);
}

export async function generateReview(req: ReviewRequest): Promise<ReviewResponse> {
  const mode = aiMode();
  if (mode === "claude") {
    return cleanReview(await askClaude(`${TUTOR_SYSTEM}\n\n${tutorUserMessage(req)}\n\n${REVIEW_FORMAT}`, "default"));
  }
  if (mode === "chave") return (await direct())!.directReview(getApiKey(), req);
  if (mode === "servidor") return post<ReviewResponse>("/api/review", req);
  throw new AIUnavailableError(NO_KEY);
}

export async function testApiKey(key: string): Promise<void> {
  const d = await direct();
  if (!d) throw new Error("Indisponível nesta versão.");
  await d.testKey(key);
}
