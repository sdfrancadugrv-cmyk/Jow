import { NextRequest, NextResponse } from "next/server";
import { getMidias, createMidia, deleteMidia, reorderMidias, getSite, type Midia } from "@/lib/store";
import { randomUUID } from "crypto";

function detectTipo(url: string): Pick<Midia, "tipo" | "url_embed" | "url_thumb"> {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
  if (yt) {
    const id = yt[1];
    return { tipo: "youtube", url_embed: `https://www.youtube.com/embed/${id}`, url_thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
  }
  // Google Drive
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/\s]+)/);
  if (gd) {
    const id = gd[1];
    return { tipo: "gdrive", url_embed: `https://drive.google.com/file/d/${id}/preview`, url_thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w400` };
  }
  // Video
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return { tipo: "video", url_embed: url, url_thumb: "" };
  }
  // Imagem (default)
  return { tipo: "imagem", url_embed: url, url_thumb: url };
}

function parseHtmlImages(html: string): { url: string; label: string }[] {
  const found: { url: string; label: string }[] = [];
  const seen = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (!src.startsWith("data:") && src.length > 4 && !seen.has(src)) {
      seen.add(src);
      const label = src.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Imagem";
      found.push({ url: src, label });
    }
  }
  return found;
}

type Params = { params: Promise<{ slug: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { slug } = await params;
  const midias = await getMidias(slug);

  // Se não há mídias gerenciadas ainda, auto-descobre do HTML
  let descobertas: Midia[] = [];
  if (midias.length === 0) {
    const site = await getSite(slug);
    if (site?.html) {
      const imgs = parseHtmlImages(site.html);
      descobertas = imgs.map((img, i) => ({
        id: `descoberta_${i}`,
        site_slug: slug,
        ...detectTipo(img.url),
        url: img.url,
        label: img.label,
        posicao: i,
        ativo: true,
      }));
    }
  }

  return NextResponse.json({ midias, descobertas });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const body = await req.json();

  // Reorder: { action: "reorder", ids: string[] }
  if (body.action === "reorder") {
    await reorderMidias(slug, body.ids as string[]);
    return NextResponse.json({ ok: true });
  }

  // Bulk save (initial discovery): { action: "bulk", midias: Midia[] }
  if (body.action === "bulk") {
    const lista: Midia[] = body.midias ?? [];
    for (const m of lista) {
      await createMidia({ ...m, id: randomUUID(), site_slug: slug });
    }
    return NextResponse.json({ ok: true });
  }

  // Add single media
  const { url, label } = body as { url: string; label?: string };
  if (!url) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  const current = await getMidias(slug);
  const detected = detectTipo(url);
  const midia = await createMidia({
    id: randomUUID(),
    site_slug: slug,
    url,
    label: label || url.split("/").pop()?.replace(/\.[^.]+$/, "") || "Mídia",
    posicao: current.length,
    ativo: true,
    ...detected,
  });

  return NextResponse.json(midia, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  const ok = await deleteMidia(id);
  const remaining = await getMidias(slug);
  if (remaining.length > 0) {
    await reorderMidias(slug, remaining.map((m) => m.id));
  }
  return NextResponse.json({ ok });
}
