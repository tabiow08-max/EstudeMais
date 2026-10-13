import type { SubjectId } from "../lib/types";

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  color: string; // cor principal (barras, pontos)
  tint: string; // fundo suave
}

export const SUBJECTS: Record<SubjectId, SubjectMeta> = {
  biologia: { id: "biologia", name: "Biologia", color: "#6fa46f", tint: "#e3eedf" },
  quimica: { id: "quimica", name: "Química", color: "#a885e0", tint: "#ece4f7" },
  fisica: { id: "fisica", name: "Física", color: "#7aa7e6", tint: "#e1ebf8" },
  matematica: { id: "matematica", name: "Matemática", color: "#e57f8e", tint: "#f8e1e4" },
  historia: { id: "historia", name: "História", color: "#efa363", tint: "#f9e8d9" },
  geografia: { id: "geografia", name: "Geografia", color: "#57b8b2", tint: "#dcefed" },
  portugues: { id: "portugues", name: "Português", color: "#c9a24a", tint: "#f4ecd6" },
  literatura: { id: "literatura", name: "Literatura", color: "#b0806a", tint: "#f0e4de" },
  redacao: { id: "redacao", name: "Redação", color: "#e78fa8", tint: "#f9e3ea" },
  filosofia: { id: "filosofia", name: "Filosofia", color: "#8a93b8", tint: "#e6e8f1" },
  sociologia: { id: "sociologia", name: "Sociologia", color: "#7fae9a", tint: "#e2efe9" },
  ingles: { id: "ingles", name: "Inglês", color: "#6c9fb8", tint: "#dfecf2" },
};

export const SUBJECT_IDS = Object.keys(SUBJECTS) as SubjectId[];

export const VESTIBULARES = [
  "ENEM",
  "FUVEST (USP)",
  "UNICAMP",
  "VUNESP (UNESP)",
  "UERJ",
  "UFPR",
  "UFRGS",
  "UnB",
  "UFSC",
  "Santa Casa",
  "Albert Einstein",
  "ITA",
  "Outro",
];

export const CURSOS = [
  "Medicina",
  "Biomedicina",
  "Enfermagem",
  "Odontologia",
  "Farmácia",
  "Nutrição",
  "Psicologia",
  "Veterinária",
  "Biologia",
  "Engenharia",
  "Ciência da Computação",
  "Arquitetura",
  "Direito",
  "Administração",
  "Economia",
  "Jornalismo",
  "Relações Internacionais",
  "Pedagogia",
  "Letras",
  "História",
  "Outro",
];

/** Área predominante do curso — usada para dar mais peso às matérias-chave. */
export function courseArea(curso: string): "biologicas" | "exatas" | "humanas" {
  const c = curso.toLowerCase();
  if (/(medic|biomed|enferm|odonto|farm|nutri|veter|biolog|fisio|psico)/.test(c)) return "biologicas";
  if (/(engenh|comput|arquit|matem|fisic|quimic|sistemas|estat|econ)/.test(c)) return "exatas";
  return "humanas";
}

export const AREA_WEIGHTS: Record<ReturnType<typeof courseArea>, Partial<Record<SubjectId, number>>> = {
  biologicas: { biologia: 1.6, quimica: 1.5, fisica: 1.1, matematica: 1.1 },
  exatas: { matematica: 1.7, fisica: 1.5, quimica: 1.2 },
  humanas: { historia: 1.4, geografia: 1.3, portugues: 1.3, redacao: 1.3, filosofia: 1.2, sociologia: 1.2 },
};
