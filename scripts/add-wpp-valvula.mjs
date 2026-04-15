import { readFileSync, writeFileSync } from "fs";

const db = JSON.parse(readFileSync("./data/db.json", "utf-8"));
const site = db.sites.find(s => s.slug === "valvula");

if (!site) { console.log("❌ Site valvula não encontrado"); process.exit(1); }

const botao = `
<!-- BOTÃO WHATSAPP TOPO -->
<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#25D366;padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.2)">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  <a href="https://wa.me/5553999516012?text=ola+quero+falar+com+um+tecnico+e+diminuir+a+conta+de+agua" target="_blank" style="color:white;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px">
    Falar com Técnico
  </a>
</div>
<style>
  @keyframes piscar { 0%,100%{opacity:1} 50%{opacity:0.6} }
  body { padding-top: 52px !important; }
</style>`;

// Remove botão antigo se existir e adiciona novo logo após <body>
let html = site.html;
html = html.replace(/<!-- BOTÃO WHATSAPP TOPO -->[\s\S]*?<\/style>/g, "");

if (html.includes("<body")) {
  html = html.replace(/<body([^>]*)>/, `<body$1>${botao}`);
} else {
  html = botao + html;
}

site.html = html;
writeFileSync("./data/db.json", JSON.stringify(db, null, 2));
console.log("✅ Botão WhatsApp adicionado ao topo do site /valvula");
