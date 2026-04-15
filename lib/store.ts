import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

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

export type DB = {
  sites: Site[];
  produtos: Produto[];
  artigos: Artigo[];
  tickets: Ticket[];
};

const empty: DB = { sites: [], produtos: [], artigos: [], tickets: [] };

function readDB(): DB {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2)); return empty; }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DB;
  } catch { return empty; }
}

function writeDB(db: DB) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export const getSites = () => readDB().sites;
export const getSite = (slug: string) => readDB().sites.find((s) => s.slug === slug) ?? null;

export function createSite(site: Site): Site {
  const db = readDB();
  db.sites = db.sites.filter((s) => s.slug !== site.slug);
  db.sites.push(site);
  writeDB(db);
  return site;
}

export function updateSite(slug: string, updates: Partial<Site>): Site | null {
  const db = readDB();
  const i = db.sites.findIndex((s) => s.slug === slug);
  if (i === -1) return null;
  db.sites[i] = { ...db.sites[i], ...updates };
  writeDB(db);
  return db.sites[i];
}

export const getProdutos = (slug: string) => readDB().produtos.filter((p) => p.site_slug === slug);

export function createProduto(p: Produto): Produto {
  const db = readDB(); db.produtos.push(p); writeDB(db); return p;
}

export function updateProduto(id: string, u: Partial<Produto>): Produto | null {
  const db = readDB();
  const i = db.produtos.findIndex((p) => p.id === id);
  if (i === -1) return null;
  db.produtos[i] = { ...db.produtos[i], ...u };
  writeDB(db);
  return db.produtos[i];
}

export function deleteProduto(id: string): boolean {
  const db = readDB();
  const len = db.produtos.length;
  db.produtos = db.produtos.filter((p) => p.id !== id);
  if (db.produtos.length === len) return false;
  writeDB(db); return true;
}

export const getArtigos = (slug: string) => readDB().artigos.filter((a) => a.site_slug === slug);

export function createArtigo(a: Artigo): Artigo {
  const db = readDB(); db.artigos.push(a); writeDB(db); return a;
}

export function deleteArtigo(id: string): boolean {
  const db = readDB();
  const len = db.artigos.length;
  db.artigos = db.artigos.filter((a) => a.id !== id);
  if (db.artigos.length === len) return false;
  writeDB(db); return true;
}

export const getTickets = (slug: string) => readDB().tickets.filter((t) => t.site_slug === slug);
export const getAllTickets = () => readDB().tickets;

export function createTicket(t: Ticket): Ticket {
  const db = readDB(); db.tickets.push(t); writeDB(db); return t;
}

export function updateTicket(id: string, u: Partial<Ticket>): Ticket | null {
  const db = readDB();
  const i = db.tickets.findIndex((t) => t.id === id);
  if (i === -1) return null;
  db.tickets[i] = { ...db.tickets[i], ...u };
  writeDB(db);
  return db.tickets[i];
}
