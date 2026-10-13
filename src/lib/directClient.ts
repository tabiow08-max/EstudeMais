import Anthropic from "@anthropic-ai/sdk";
import { planWithAI, reviewWithAI } from "./claudeDirect";
import { cleanPlan, cleanReview } from "./prompts";
import type { PlanRequest, PlanResponse, ReviewRequest, ReviewResponse } from "./types";

/**
 * App instalado no aparelho: a IA é chamada direto do navegador com a
 * chave da API que a própria pessoa colou em Configurações. A chave fica
 * guardada só neste aparelho.
 */
function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

function friendly(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) return new Error("A chave da API está errada. Confira em Perfil → Configurações.");
  if (err instanceof Anthropic.PermissionDeniedError) return new Error("Essa chave não tem permissão para usar a IA.");
  if (err instanceof Anthropic.RateLimitError) return new Error("Muitos pedidos agora. Espere um minuto e tente de novo.");
  if (err instanceof Anthropic.BadRequestError && /credit|billing|balance/i.test(err.message)) {
    return new Error("Seus créditos da API acabaram. Adicione créditos em console.anthropic.com.");
  }
  if (err instanceof Anthropic.APIConnectionError) return new Error("Sem internet ou a IA não respondeu. Tente de novo.");
  if (err instanceof Anthropic.APIError) return new Error("A IA está com problema agora. Tente de novo em instantes.");
  return err instanceof Error ? err : new Error("Erro inesperado.");
}

export async function directPlan(apiKey: string, req: PlanRequest): Promise<PlanResponse> {
  try {
    return cleanPlan(await planWithAI(client(apiKey), req));
  } catch (e) {
    throw friendly(e);
  }
}

export async function directReview(apiKey: string, req: ReviewRequest): Promise<ReviewResponse> {
  try {
    return cleanReview(await reviewWithAI(client(apiKey), req));
  } catch (e) {
    throw friendly(e);
  }
}

/** Faz uma chamada mínima para conferir se a chave funciona. */
export async function testKey(apiKey: string): Promise<void> {
  try {
    await client(apiKey).models.retrieve("claude-opus-5-5");
  } catch (e) {
    throw friendly(e);
  }
}
