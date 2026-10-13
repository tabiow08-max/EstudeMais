import type { PlanRequest, PlanResponse, ReviewRequest, ReviewResponse } from "./types";

export class AIUnavailableError extends Error {}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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

export async function aiStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return false;
    return Boolean((await res.json()).ai);
  } catch {
    return false;
  }
}

export const generatePlan = (req: PlanRequest) => post<PlanResponse>("/api/plan", req);
export const generateReview = (req: ReviewRequest) => post<ReviewResponse>("/api/review", req);
