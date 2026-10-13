export type SubjectId =
  | "biologia"
  | "quimica"
  | "fisica"
  | "matematica"
  | "historia"
  | "geografia"
  | "portugues"
  | "literatura"
  | "redacao"
  | "filosofia"
  | "sociologia"
  | "ingles";

export type Priority = "alta" | "media" | "baixa";

export interface Goal {
  vestibular: string;
  curso: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/** Janela de estudo de um dia da semana (0 = domingo … 6 = sábado). */
export interface DayWindow {
  day: number;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface PlanTopic {
  id: string;
  subject: SubjectId;
  title: string;
  priority: Priority;
  /** Estimativa de incidência na prova, 0–100. */
  incidence: number;
  hours: number;
  reason: string;
}

export interface Plan {
  createdAt: string;
  source: "ia" | "offline";
  summary: string;
  topics: PlanTopic[];
}

export interface StudyBlock {
  id: string;
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
  subject: SubjectId;
  topicId?: string;
  title: string;
  kind: "aula" | "revisao" | "redacao" | "livre";
  done: boolean;
}

export interface Flashcard {
  id: string;
  subject: SubjectId;
  topic: string;
  front: string;
  back: string;
  /** Caixa de Leitner (0–4). Quanto maior, mais espaçada a revisão. */
  box: number;
  due: string; // YYYY-MM-DD
  seen: number;
  correct: number;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  subject: SubjectId;
  topic: string;
  questions: QuizQuestion[];
  createdAt: string;
  answers?: number[];
  score?: number;
}

export interface Profile {
  name: string;
  quote: string;
}

export interface AppState {
  profile: Profile;
  goal?: Goal;
  windows: DayWindow[];
  plan?: Plan;
  blocks: StudyBlock[];
  cards: Flashcard[];
  quizzes: Quiz[];
  /** Datas (YYYY-MM-DD) em que houve algum estudo registrado. */
  studyDays: string[];
}

/* ---- Contratos da API ---- */

export interface PlanRequest {
  goal: Goal;
  totalHours: number;
  weeks: number;
}

export interface PlanResponse {
  summary: string;
  topics: Omit<PlanTopic, "id">[];
}

export interface ReviewRequest {
  subject: SubjectId;
  topic: string;
  vestibular?: string;
  notes?: string;
  cardCount?: number;
  questionCount?: number;
}

export interface ReviewResponse {
  flashcards: { front: string; back: string }[];
  quiz: QuizQuestion[];
}
