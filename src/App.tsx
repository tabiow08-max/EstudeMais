import { useState } from "react";
import { CalendarDays, Home as HomeIcon, Layers, User } from "lucide-react";
import { useStore } from "./lib/store";
import type { SubjectId } from "./lib/types";
import { Home } from "./screens/Home";
import { Flashcards } from "./screens/Flashcards";
import { Schedule } from "./screens/Schedule";
import { PlanView, Profile } from "./screens/Profile";
import { PlanWizard } from "./screens/PlanWizard";
import { Review } from "./screens/Review";
import { QuizScreen } from "./screens/QuizScreen";
import { Stats } from "./screens/Stats";
import { StudiedSheet, type StudiedSeed } from "./screens/StudiedSheet";

type Tab = "inicio" | "flashcards" | "cronograma" | "perfil";

type Overlay =
  | { kind: "deck"; subject?: SubjectId; topic?: string }
  | { kind: "quiz"; id: string }
  | { kind: "plan" }
  | { kind: "wizard" }
  | { kind: "stats" };

export interface Nav {
  tab: (t: Tab) => void;
  openStudied: (seed?: StudiedSeed) => void;
  openDeck: (subject?: SubjectId, topic?: string) => void;
  openQuiz: (id: string) => void;
  openPlan: () => void;
  openStats: () => void;
}

const TABS: { id: Tab; label: string; icon: typeof HomeIcon }[] = [
  { id: "inicio", label: "Início", icon: HomeIcon },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "cronograma", label: "Cronograma", icon: CalendarDays },
  { id: "perfil", label: "Perfil", icon: User },
];

export function App() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("inicio");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [studied, setStudied] = useState<{ seed?: StudiedSeed } | null>(null);

  const nav: Nav = {
    tab: (t) => { setOverlay(null); setTab(t); },
    openStudied: (seed) => setStudied({ seed }),
    openDeck: (subject, topic) => { setStudied(null); setOverlay({ kind: "deck", subject, topic }); },
    openQuiz: (id) => { setStudied(null); setOverlay({ kind: "quiz", id }); },
    openPlan: () => setOverlay({ kind: "plan" }),
    openStats: () => setOverlay({ kind: "stats" }),
  };

  // primeiro acesso → onboarding
  if (!state.goal) return <PlanWizard onDone={() => setTab("inicio")} />;

  const close = () => setOverlay(null);

  return (
    <>
      <div className="app">
        {tab === "inicio" && <Home nav={nav} />}
        {tab === "flashcards" && <Flashcards nav={nav} />}
        {tab === "cronograma" && <Schedule nav={nav} />}
        {tab === "perfil" && <Profile nav={nav} />}

        <nav className="tabbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => nav.tab(id)}>
              <Icon size={22} strokeWidth={tab === id ? 2.2 : 1.6} fill={tab === id ? "currentColor" : "none"} fillOpacity={0.15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {overlay && (
        <div className="overlay">
          {overlay.kind === "deck" && <Review subject={overlay.subject} topic={overlay.topic} onClose={close} />}
          {overlay.kind === "quiz" && <QuizScreen quizId={overlay.id} onClose={close} />}
          {overlay.kind === "plan" && <PlanView onBack={close} onRedo={() => setOverlay({ kind: "wizard" })} />}
          {overlay.kind === "wizard" && <PlanWizard onDone={() => { close(); nav.tab("cronograma"); }} onCancel={close} />}
          {overlay.kind === "stats" && (
            <div className="app"><Stats onBack={close} /></div>
          )}
        </div>
      )}

      {studied && (
        <StudiedSheet
          block={studied.seed}
          onClose={() => setStudied(null)}
          onOpenDeck={nav.openDeck}
          onOpenQuiz={nav.openQuiz}
        />
      )}
    </>
  );
}
