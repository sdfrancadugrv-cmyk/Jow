import { neon } from "@neondatabase/serverless";

function sql() {
  return neon(process.env.DATABASE_URL!);
}

async function ensureSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS sites (
      slug TEXT PRIMARY KEY,
      nicho TEXT NOT NULL DEFAULT '',
      nome TEXT NOT NULL DEFAULT '',
      html TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      prompt_voz TEXT NOT NULL DEFAULT '',
      produto_tipo TEXT NOT NULL DEFAULT 'basico',
      admin_senha TEXT NOT NULL DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT ''
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
      site_slug TEXT NOT NULL,
      nome TEXT NOT NULL DEFAULT '',
      preco TEXT NOT NULL DEFAULT '',
      foto_url TEXT NOT NULL DEFAULT '',
      descricao TEXT NOT NULL DEFAULT '',
      categoria TEXT NOT NULL DEFAULT ''
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS artigos (
      id TEXT PRIMARY KEY,
      site_slug TEXT NOT NULL,
      titulo TEXT NOT NULL DEFAULT '',
      conteudo TEXT NOT NULL DEFAULT '',
      publicado BOOLEAN NOT NULL DEFAULT false,
      criado_em TEXT NOT NULL DEFAULT ''
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      site_slug TEXT NOT NULL,
      mensagem TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'aberto',
      criado_em TEXT NOT NULL DEFAULT '',
      resposta TEXT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS midias (
      id TEXT PRIMARY KEY,
      site_slug TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'imagem',
      url TEXT NOT NULL DEFAULT '',
      url_embed TEXT NOT NULL DEFAULT '',
      url_thumb TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      posicao INTEGER NOT NULL DEFAULT 0,
      ativo BOOLEAN NOT NULL DEFAULT true
    )
  `;
}

export type ProdutoTipo = "basico" | "pro";

export type Site = {
  slug: string;
  nicho: string;
  nome: string;
  html: string;
  whatsapp: string;
  prompt_voz: string;
  produto_tipo: ProdutoTipo;
  admin_senha: string;
  criado_em: string;
};

export type Produto = {
  id: string;
  site_slug: string;
  nome: string;
  preco: string;
  foto_url: string;
  descricao: string;
  categoria: string;
};

export type Artigo = {
  id: string;
  site_slug: string;
  titulo: string;
  conteudo: string;
  publicado: boolean;
  criado_em: string;
};

export type Ticket = {
  id: string;
  site_slug: string;
  mensagem: string;
  status: "aberto" | "respondido" | "resolvido";
  criado_em: string;
  resposta?: string;
};

export type Midia = {
  id: string;
  site_slug: string;
  tipo: "imagem" | "youtube" | "gdrive" | "video";
  url: string;
  url_embed: string;
  url_thumb: string;
  label: string;
  posicao: number;
  ativo: boolean;
};

export async function getSites(): Promise<Site[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM sites ORDER BY criado_em DESC`;
  return rows as unknown as Site[];
}

export async function getSite(slug: string): Promise<Site | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM sites WHERE slug = ${slug} LIMIT 1`;
  return (rows[0] as unknown as Site) ?? null;
}

export async function createSite(site: Site): Promise<Site> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO sites (slug, nicho, nome, html, whatsapp, prompt_voz, produto_tipo, admin_senha, criado_em)
    VALUES (${site.slug}, ${site.nicho}, ${site.nome}, ${site.html}, ${site.whatsapp}, ${site.prompt_voz}, ${site.produto_tipo}, ${site.admin_senha}, ${site.criado_em})
    ON CONFLICT (slug) DO UPDATE SET
      nicho = EXCLUDED.nicho,
      nome = EXCLUDED.nome,
      html = EXCLUDED.html,
      whatsapp = EXCLUDED.whatsapp,
      prompt_voz = EXCLUDED.prompt_voz,
      produto_tipo = EXCLUDED.produto_tipo,
      admin_senha = EXCLUDED.admin_senha,
      criado_em = EXCLUDED.criado_em
  `;
  return site;
}

export async function updateSite(slug: string, updates: Partial<Site>): Promise<Site | null> {
  await ensureSchema();
  const db = sql();
  const fields = Object.entries(updates).filter(([k]) => k !== "slug");
  if (fields.length === 0) return getSite(slug);
  // Build SET clause dynamically isn't ideal with neon tagged templates, so use individual updates
  const current = await getSite(slug);
  if (!current) return null;
  const merged = { ...current, ...updates };
  await db`
    UPDATE sites SET
      nicho = ${merged.nicho},
      nome = ${merged.nome},
      html = ${merged.html},
      whatsapp = ${merged.whatsapp},
      prompt_voz = ${merged.prompt_voz},
      produto_tipo = ${merged.produto_tipo},
      admin_senha = ${merged.admin_senha},
      criado_em = ${merged.criado_em}
    WHERE slug = ${slug}
  `;
  return merged;
}

export async function getProdutos(slug: string): Promise<Produto[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM produtos WHERE site_slug = ${slug}`;
  return rows as unknown as Produto[];
}

export async function createProduto(p: Produto): Promise<Produto> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO produtos (id, site_slug, nome, preco, foto_url, descricao, categoria)
    VALUES (${p.id}, ${p.site_slug}, ${p.nome}, ${p.preco}, ${p.foto_url}, ${p.descricao}, ${p.categoria})
  `;
  return p;
}

export async function updateProduto(id: string, u: Partial<Produto>): Promise<Produto | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM produtos WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  const merged = { ...(rows[0] as unknown as Produto), ...u };
  await db`
    UPDATE produtos SET nome = ${merged.nome}, preco = ${merged.preco}, foto_url = ${merged.foto_url}, descricao = ${merged.descricao}, categoria = ${merged.categoria}
    WHERE id = ${id}
  `;
  return merged;
}

export async function deleteProduto(id: string): Promise<boolean> {
  await ensureSchema();
  const db = sql();
  const result = await db`DELETE FROM produtos WHERE id = ${id}`;
  return (result as unknown as { count: number }).count > 0;
}

export async function getArtigos(slug: string): Promise<Artigo[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM artigos WHERE site_slug = ${slug} ORDER BY criado_em DESC`;
  return rows as unknown as Artigo[];
}

export async function createArtigo(a: Artigo): Promise<Artigo> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO artigos (id, site_slug, titulo, conteudo, publicado, criado_em)
    VALUES (${a.id}, ${a.site_slug}, ${a.titulo}, ${a.conteudo}, ${a.publicado}, ${a.criado_em})
  `;
  return a;
}

export async function deleteArtigo(id: string): Promise<boolean> {
  await ensureSchema();
  const db = sql();
  const result = await db`DELETE FROM artigos WHERE id = ${id}`;
  return (result as unknown as { count: number }).count > 0;
}

export async function getTickets(slug: string): Promise<Ticket[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM tickets WHERE site_slug = ${slug} ORDER BY criado_em DESC`;
  return rows as unknown as Ticket[];
}

export async function getAllTickets(): Promise<Ticket[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM tickets ORDER BY criado_em DESC`;
  return rows as unknown as Ticket[];
}

export async function createTicket(t: Ticket): Promise<Ticket> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO tickets (id, site_slug, mensagem, status, criado_em, resposta)
    VALUES (${t.id}, ${t.site_slug}, ${t.mensagem}, ${t.status}, ${t.criado_em}, ${t.resposta ?? null})
  `;
  return t;
}

export async function updateTicket(id: string, u: Partial<Ticket>): Promise<Ticket | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM tickets WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  const merged = { ...(rows[0] as unknown as Ticket), ...u };
  await db`
    UPDATE tickets SET status = ${merged.status}, resposta = ${merged.resposta ?? null}
    WHERE id = ${id}
  `;
  return merged;
}

export async function getMidias(slug: string): Promise<Midia[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM midias WHERE site_slug = ${slug} ORDER BY posicao ASC`;
  return rows as unknown as Midia[];
}

export async function createMidia(m: Midia): Promise<Midia> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO midias (id, site_slug, tipo, url, url_embed, url_thumb, label, posicao, ativo)
    VALUES (${m.id}, ${m.site_slug}, ${m.tipo}, ${m.url}, ${m.url_embed}, ${m.url_thumb}, ${m.label}, ${m.posicao}, ${m.ativo})
  `;
  return m;
}

export async function deleteMidia(id: string): Promise<boolean> {
  await ensureSchema();
  const db = sql();
  const result = await db`DELETE FROM midias WHERE id = ${id}`;
  return (result as unknown as { count: number }).count > 0;
}

export async function reorderMidias(slug: string, orderedIds: string[]): Promise<void> {
  await ensureSchema();
  const db = sql();
  for (let i = 0; i < orderedIds.length; i++) {
    await db`UPDATE midias SET posicao = ${i} WHERE id = ${orderedIds[i]} AND site_slug = ${slug}`;
  }
}
