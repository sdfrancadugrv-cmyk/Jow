import { create } from "zustand";

export type JowState = "idle" | "listening" | "thinking" | "speaking" | "error";

export type AgentName =
  | "analyst"
  | "architect"
  | "dev"
  | "qa"
  | "pm"
  | "ux"
  | "devops"
  | "data";

export interface Agent {
  name: AgentName;
  label: string;
  icon: string;
  color: string;
  active: boolean;
}

export interface ChatMessage {
  role: "user" | "jow";
  content: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface JowStore {
  state: JowState;
  activeAgents: AgentName[];
  conversation: ChatMessage[];
  history: HistoryMessage[]; // histórico para a API (persiste globalmente)
  isListening: boolean;
  isMuted: boolean;

  setState: (state: JowState) => void;
  setActiveAgents: (agents: AgentName[]) => void;
  addMessage: (role: "user" | "jow", content: string) => void;
  addHistory: (userMsg: string, jowMsg: string) => void;
  setListening: (listening: boolean) => void;
  setMuted: (muted: boolean) => void;
  loadHistory: (history: HistoryMessage[]) => void;
}

export const useJowStore = create<JowStore>((set) => ({
  state: "idle",
  activeAgents: [],
  conversation: [],
  history: [], // nunca limpa — memória infinita
  isListening: false,
  isMuted: false,

  setState: (state) => set({ state }),
  setActiveAgents: (agents) => set({ activeAgents: agents }),
  addMessage: (role, content) =>
    set((s) => ({ conversation: [...s.conversation, { role, content }] })),
  addHistory: (userMsg, jowMsg) =>
    set((s) => ({
      history: [
        ...s.history,
        { role: "user" as const, content: userMsg },
        { role: "assistant" as const, content: jowMsg },
      ],
    })),
  loadHistory: (history) => set({ history }),
  setListening: (isListening) => set({ isListening }),
  setMuted: (isMuted) => set({ isMuted }),
}));

export const AGENTS: Agent[] = [
  { name: "analyst",  label: "Analyst",   icon: "🔬", color: "#06B6D4", active: false },
  { name: "architect",label: "Architect", icon: "🏗️", color: "#F97316", active: false },
  { name: "dev",      label: "Dev",       icon: "💻", color: "#22C55E", active: false },
  { name: "qa",       label: "QA",        icon: "✅", color: "#EAB308", active: false },
  { name: "pm",       label: "PM",        icon: "📊", color: "#3B82F6", active: false },
  { name: "ux",       label: "UX",        icon: "🎨", color: "#EC4899", active: false },
  { name: "devops",   label: "DevOps",    icon: "⚙️", color: "#6B7280", active: false },
  { name: "data",     label: "Data",      icon: "🗄️", color: "#6366F1", active: false },
];
