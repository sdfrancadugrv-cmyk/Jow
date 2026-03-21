export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function webSearch(query: string): Promise<string> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 5,
        search_depth: "advanced",
        include_answer: true,
      }),
    });

    const data = await res.json();

    if (data.answer) return `Resposta direta: ${data.answer}\n\nFontes:\n${data.results?.map((r: SearchResult) => `- ${r.title}: ${r.content.substring(0, 200)}`).join("\n") ?? ""}`;

    if (data.results?.length > 0) {
      return data.results
        .map((r: SearchResult) => `**${r.title}**\n${r.content.substring(0, 300)}`)
        .join("\n\n");
    }

    return "Nenhum resultado encontrado.";
  } catch (err) {
    console.error("[WebSearch]", err);
    return "Erro ao buscar na internet.";
  }
}

// Detecta se a pergunta precisa de busca na internet
export function needsWebSearch(query: string): boolean {
  const q = query.toLowerCase();
  const triggers = [
    "pesquisa", "busca", "procura", "pesquisar", "buscar",
    "atual", "hoje", "agora", "recente", "último", "ultima", "novidade",
    "notícia", "noticia", "preço", "preco", "valor", "quanto custa",
    "como fazer", "o que é", "quem é", "onde fica", "quando foi",
    "melhor", "recomenda", "indicação", "tutorial", "aprende",
    "2024", "2025", "2026", "lançamento", "lancamento",
  ];
  return triggers.some((t) => q.includes(t));
}
