import type { ReactNode } from "react";
import {
  Atom, BookOpen, Calculator, FlaskConical, Globe2, Languages, Leaf, Library,
  PenLine, ScrollText, Users, Brain, X,
} from "lucide-react";
import { SUBJECTS } from "../data/subjects";
import type { Priority, SubjectId } from "../lib/types";

const ICONS: Record<SubjectId, typeof Leaf> = {
  biologia: Leaf,
  quimica: FlaskConical,
  fisica: Atom,
  matematica: Calculator,
  historia: BookOpen,
  geografia: Globe2,
  portugues: ScrollText,
  literatura: Library,
  redacao: PenLine,
  filosofia: Brain,
  sociologia: Users,
  ingles: Languages,
};

export function SubjectIcon({ subject, size = 44 }: { subject: SubjectId; size?: number }) {
  const Icon = ICONS[subject];
  const m = SUBJECTS[subject];
  return (
    <span className="subject-icon" style={{ background: m.tint, color: m.color, width: size, height: size }}>
      <Icon size={size * 0.45} strokeWidth={1.8} />
    </span>
  );
}

export function SubjectTag({ subject }: { subject: SubjectId }) {
  const m = SUBJECTS[subject];
  return (
    <span className="badge" style={{ background: m.tint, color: m.color }}>
      {m.name}
    </span>
  );
}

const PRIORITY_LABEL: Record<Priority, string> = { alta: "Prioridade alta", media: "Média", baixa: "Baixa" };

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge ${priority}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row between">
          <h2>{title}</h2>
          <button className="icon-btn plain" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="stack" style={{ alignItems: "center", padding: "32px 0" }}>
      <div className="spinner" />
      <p className="sub center">{text}</p>
    </div>
  );
}
