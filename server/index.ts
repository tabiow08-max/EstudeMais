import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { planWithAI, reviewWithAI } from "../src/lib/claudeDirect.js";

const app = express();
app.use(express.json({ limit: "200kb" }));

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

const SubjectId = z.enum([
  "biologia", "quimica", "fisica", "matematica", "historia", "geografia",
  "portugues", "literatura", "redacao", "filosofia", "sociologia", "ingles",
]);

const PlanBody = z.object({
  goal: z.object({
    vestibular: z.string().min(1).max(80),
    curso: z.string().min(1).max(80),
    startDate: z.string(),
    endDate: z.string(),
  }),
  totalHours: z.number().positive().max(5000),
  weeks: z.number().positive().max(260),
});

const ReviewBody = z.object({
  subject: SubjectId,
  topic: z.string().min(2).max(300),
  vestibular: z.string().max(80).optional(),
  notes: z.string().max(4000).optional(),
  cardCount: z.number().int().min(3).max(20).optional(),
  questionCount: z.number().int().min(3).max(10).optional(),
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: hasKey });
});

app.post("/api/plan", async (req, res) => {
  if (!client) return res.status(503).json({ error: "IA não configurada." });
  const body = PlanBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Dados inválidos." });
  try {
    res.json(await planWithAI(client, body.data));
  } catch (err) {
    handleError(err, res);
  }
});

app.post("/api/review", async (req, res) => {
  if (!client) return res.status(503).json({ error: "IA não configurada." });
  const body = ReviewBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Dados inválidos." });
  try {
    res.json(await reviewWithAI(client, body.data));
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err: unknown, res: express.Response) {
  console.error(err);
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Muitas requisições à IA. Tente de novo em instantes." });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return res.status(503).json({ error: "Chave da API inválida." });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return res.status(502).json({ error: "Não foi possível falar com a IA." });
  }
  const message = err instanceof Error ? err.message : "Erro inesperado.";
  return res.status(500).json({ error: message });
}

// Em produção, o mesmo servidor entrega o app compilado.
if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`EstudeMais API em http://localhost:${port} — IA ${hasKey ? "ativa" : "desligada (sem ANTHROPIC_API_KEY)"}`);
});
