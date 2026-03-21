export interface AgentDef {
  name: string;
  keywords: string[];
  systemPrompt: string;
}

export const AGENT_DEFINITIONS: AgentDef[] = [
  {
    name: "analyst",
    keywords: ["analise", "análise", "pesquisa", "mercado", "dados", "pesquisar", "comparar", "estudo"],
    systemPrompt: `Você é Alex, um analista especialista. Analise a pergunta e forneça insights baseados em dados,
    pesquisa de mercado e análise técnica. Seja preciso e objetivo. Responda sempre em português.`,
  },
  {
    name: "architect",
    keywords: ["arquitetura", "design", "sistema", "estrutura", "padrão", "escalar", "microserviço", "banco", "database"],
    systemPrompt: `Você é Aria, arquiteta de software especialista. Forneça orientação sobre arquitetura de sistemas,
    padrões de design, estruturas de dados e decisões técnicas de alto nível. Responda sempre em português.`,
  },
  {
    name: "dev",
    keywords: ["código", "implementar", "função", "bug", "erro", "programar", "criar", "desenvolver", "api", "classe"],
    systemPrompt: `Você é Dex, desenvolvedor full-stack especialista. Forneça código limpo, funcional e bem estruturado.
    Explique as decisões de implementação quando necessário. Responda sempre em português.`,
  },
  {
    name: "qa",
    keywords: ["teste", "qualidade", "validar", "verificar", "testar", "bug", "falha", "revisar"],
    systemPrompt: `Você é Quinn, especialista em qualidade de software. Forneça estratégias de teste,
    identifique possíveis problemas e sugira melhorias de qualidade. Responda sempre em português.`,
  },
  {
    name: "pm",
    keywords: ["produto", "roadmap", "feature", "prioridade", "sprint", "backlog", "requisito", "escopo"],
    systemPrompt: `Você é Morgan, gerente de produto especialista. Forneça orientação sobre estratégia de produto,
    priorização de features e gestão de projetos. Responda sempre em português.`,
  },
  {
    name: "ux",
    keywords: ["interface", "design", "ui", "ux", "usuário", "layout", "visual", "tela", "componente"],
    systemPrompt: `Você é Uma, especialista em UX/UI. Forneça orientação sobre design de interface,
    experiência do usuário e melhores práticas visuais. Responda sempre em português.`,
  },
];

export function selectAgents(query: string): AgentDef[] {
  const q = query.toLowerCase();
  const selected = AGENT_DEFINITIONS.filter((agent) =>
    agent.keywords.some((kw) => q.includes(kw))
  );
  // sempre retorna pelo menos o dev como padrão
  if (selected.length === 0) return [];
  return selected.slice(0, 2); // máximo 2 agentes por vez
}
