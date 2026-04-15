import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createSite } from "@/lib/store";
import { randomBytes } from "crypto";

function slugify(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,40);
}
function gerarSenha() { return randomBytes(3).toString("hex"); }

function detectarNicho(t: string) {
  const s = t.toLowerCase();
  if (/carr[oa]|veícul|concession|automóv|sedan|suv|pick.?up|frota|revenda|moto/.test(s)) return "carros";
  if (/barbearia|barbeiro|barba/.test(s)) return "barbearia";
  if (/pizzaria|pizza/.test(s)) return "pizzaria";
  if (/restaurante|gastronomi/.test(s)) return "restaurante";
  if (/academia|fitness|musculação|crossfit/.test(s)) return "academia";
  if (/salão|beleza|estética|manicure/.test(s)) return "salao";
  if (/clínica|médico|saúde|dentista/.test(s)) return "clinica";
  if (/imobiliária|imóvel|apartamento|corretor/.test(s)) return "imobiliaria";
  return "generico";
}

// ─── TEMPLATE CARROS ─────────────────────────────────────────────────────────
function buildCarSite(nome: string, tagline: string, cidade: string): string {
  const fotos = [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=85&fit=crop",
    "https://images.unsplash.com/photo-1580274455191-1c62282b1542?w=800&q=85&fit=crop",
  ];
  const carros = [
    { nome:"Toyota Corolla XEi 2.0", ano:2023, km:"15.000 km", cambio:"Automático", comb:"Flex", preco:"R$ 142.900", parcela:"R$ 2.190/mês", cat:"sedan", badge:"DESTAQUE", badgeColor:"#7c3aed" },
    { nome:"Jeep Compass Limited", ano:2023, km:"8.500 km", cambio:"Automático", comb:"Flex", preco:"R$ 189.900", parcela:"R$ 2.890/mês", cat:"suv", badge:"NOVO", badgeColor:"#059669" },
    { nome:"Ferrari 488 GTB", ano:2020, km:"12.000 km", cambio:"Automático", comb:"Gasolina", preco:"R$ 1.890.000", parcela:"R$ 28.900/mês", cat:"esportivo", badge:"EXCLUSIVO", badgeColor:"#dc2626" },
    { nome:"BMW 320i Sport", ano:2022, km:"22.000 km", cambio:"Automático", comb:"Gasolina", preco:"R$ 249.900", parcela:"R$ 3.820/mês", cat:"sedan", badge:"DESTAQUE", badgeColor:"#7c3aed" },
    { nome:"Chevrolet Camaro SS", ano:2021, km:"18.000 km", cambio:"Manual", comb:"Gasolina", preco:"R$ 389.900", parcela:"R$ 5.960/mês", cat:"esportivo", badge:"OPORTUNIDADE", badgeColor:"#d97706" },
    { nome:"Ford Ranger XLT", ano:2022, km:"31.000 km", cambio:"Automático", comb:"Diesel", preco:"R$ 229.900", parcela:"R$ 3.510/mês", cat:"picape", badge:"NOVO", badgeColor:"#059669" },
    { nome:"Honda HR-V EXL", ano:2022, km:"19.000 km", cambio:"CVT", comb:"Flex", preco:"R$ 159.900", parcela:"R$ 2.440/mês", cat:"suv", badge:"DESTAQUE", badgeColor:"#7c3aed" },
    { nome:"Hyundai HB20 Diamond", ano:2023, km:"5.200 km", cambio:"Automático", comb:"Flex", preco:"R$ 89.900", parcela:"R$ 1.370/mês", cat:"hatch", badge:"NOVO", badgeColor:"#059669" },
  ];

  const cards = carros.map((c, i) => `
    <div class="card" data-cat="${c.cat}">
      <div class="card-img-wrap">
        <img src="${fotos[i]}" alt="${c.nome}" loading="lazy">
        <span class="badge" style="background:${c.badgeColor}">${c.badge}</span>
      </div>
      <div class="card-body">
        <h3>${c.nome}</h3>
        <div class="tags">
          <span>${c.ano}</span><span>${c.km}</span><span>${c.cambio}</span><span>${c.comb}</span>
        </div>
        <div class="preco">${c.preco}</div>
        <div class="parcela">${c.parcela}</div>
        <div class="card-btns">
          <button class="btn-detalhe" onclick="abrirModal(${i})">Ver Detalhes</button>
          <a class="btn-wpp" href="https://wa.me/5500000000000?text=Olá! Tenho interesse no ${c.nome} ${c.ano}" target="_blank">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
        </div>
      </div>
    </div>`).join("");

  const modais = carros.map((c, i) => `
    <div id="modal-${i}" class="modal-overlay" onclick="if(event.target===this)fecharModal(${i})">
      <div class="modal-box">
        <button class="modal-close" onclick="fecharModal(${i})">✕</button>
        <div class="modal-img-wrap"><img src="${fotos[i]}" alt="${c.nome}"></div>
        <div class="modal-content">
          <h2>${c.nome} ${c.ano}</h2>
          <div class="modal-preco">${c.preco}</div>
          <div class="specs-grid">
            <div class="spec"><span>Câmbio</span><strong>${c.cambio}</strong></div>
            <div class="spec"><span>Combustível</span><strong>${c.comb}</strong></div>
            <div class="spec"><span>Quilometragem</span><strong>${c.km}</strong></div>
            <div class="spec"><span>Ano</span><strong>${c.ano}</strong></div>
            <div class="spec"><span>Categoria</span><strong>${c.cat}</strong></div>
            <div class="spec"><span>Procedência</span><strong>Garantida</strong></div>
          </div>
          <div class="simulador">
            <h4>Simule seu financiamento</h4>
            <label>Entrada: <strong id="ent-val-${i}">R$ 20.000</strong></label>
            <input type="range" id="entrada-${i}" min="5000" max="100000" step="1000" value="20000" oninput="calcParcela(${i},${c.preco.replace(/\D/g,'')})">
            <label>Parcelas:
              <select id="meses-${i}" onchange="calcParcela(${i},${c.preco.replace(/\D/g,'')})">
                <option>12</option><option>24</option><option selected>36</option><option>48</option><option>60</option>
              </select>
            </label>
            <div class="parcela-result">Parcela estimada: <strong id="parc-${i}">calculando...</strong></div>
          </div>
          <div class="modal-btns">
            <a href="https://wa.me/5500000000000?text=Olá! Quero falar sobre o ${c.nome} ${c.ano}" target="_blank" class="btn-modal-wpp">💬 Falar com Vendedor</a>
            <a href="https://wa.me/5500000000000?text=Quero agendar um test drive do ${c.nome}" target="_blank" class="btn-modal-test">📅 Agendar Test Drive</a>
          </div>
        </div>
      </div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nome} — ${cidade}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#09090b;--surface:#18181b;--border:#27272a;--text:#fafafa;--muted:#a1a1aa;--accent:#7c3aed;--accent2:#6d28d9;--green:#059669;--radius:14px}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);overflow-x:hidden}
a{text-decoration:none;color:inherit}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:18px 40px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
nav.scrolled{background:rgba(9,9,11,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:12px 40px}
.nav-logo{font-family:'Poppins',sans-serif;font-size:22px;font-weight:900;background:linear-gradient(135deg,#a78bfa,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{color:var(--muted);font-size:14px;font-weight:500;transition:.2s}.nav-links a:hover{color:var(--text)}
.nav-cta{background:var(--accent);color:white;padding:10px 22px;border-radius:50px;font-size:14px;font-weight:700;transition:.3s}
.nav-cta:hover{background:var(--accent2);transform:scale(1.04)}
@media(max-width:768px){.nav-links{display:none}}

/* HERO */
.hero{min-height:100vh;background:linear-gradient(to bottom,rgba(0,0,0,.55) 0%,rgba(0,0,0,.75) 100%),url('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=90&fit=crop') center/cover no-repeat fixed;display:flex;align-items:center;justify-content:center;text-align:center;padding:120px 24px 80px}
.hero h1{font-family:'Poppins',sans-serif;font-size:clamp(38px,6vw,80px);font-weight:900;line-height:1.05;margin-bottom:20px}
.hero h1 span{background:linear-gradient(135deg,#a78bfa,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:clamp(16px,2vw,20px);color:rgba(255,255,255,.75);max-width:560px;margin:0 auto 36px;line-height:1.7}
.hero-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-main{background:var(--accent);color:white;padding:16px 36px;border-radius:50px;font-size:17px;font-weight:800;transition:.3s;box-shadow:0 8px 32px rgba(124,58,237,.4)}
.btn-main:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(124,58,237,.55)}
.btn-out{color:white;padding:16px 36px;border-radius:50px;font-size:17px;font-weight:700;border:2px solid rgba(255,255,255,.3);transition:.3s}
.btn-out:hover{background:rgba(255,255,255,.1)}
.hero-nums{display:flex;gap:48px;justify-content:center;margin-top:72px;flex-wrap:wrap}
.num{text-align:center}.num-val{font-family:'Poppins',sans-serif;font-size:48px;font-weight:900;background:linear-gradient(135deg,#a78bfa,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.num-label{color:rgba(255,255,255,.55);font-size:13px;margin-top:4px}

/* FILTROS */
.filtros-wrap{padding:56px 40px 16px;max-width:1200px;margin:0 auto}
.filtros{display:flex;gap:10px;flex-wrap:wrap}
.filtro-btn{padding:10px 22px;border-radius:50px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:14px;font-weight:600;cursor:pointer;transition:.2s}
.filtro-btn:hover,.filtro-btn.active{background:var(--accent);color:white;border-color:var(--accent)}

/* GRID CARROS */
.grid-section{padding:24px 40px 80px;max-width:1200px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:all .35s;opacity:1}
.card:hover{transform:translateY(-8px);box-shadow:0 24px 60px rgba(0,0,0,.4),0 0 0 1px var(--accent)}
.card-img-wrap{position:relative;overflow:hidden;height:200px}
.card-img-wrap img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.card:hover .card-img-wrap img{transform:scale(1.07)}
.badge{position:absolute;top:12px;left:12px;color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;letter-spacing:.5px}
.card-body{padding:20px}
.card-body h3{font-size:16px;font-weight:700;margin-bottom:10px}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.tags span{background:rgba(124,58,237,.15);color:#a78bfa;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px}
.preco{font-family:'Poppins',sans-serif;font-size:22px;font-weight:900;color:var(--accent);margin-bottom:4px}
.parcela{font-size:12px;color:var(--muted);margin-bottom:16px}
.card-btns{display:flex;gap:8px}
.btn-detalhe{flex:1;background:var(--accent);color:white;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s}
.btn-detalhe:hover{background:var(--accent2)}
.btn-wpp{width:42px;height:42px;background:#25D366;color:white;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s}
.btn-wpp:hover{background:#1ebe5a}
.card.hidden{display:none}

/* DIFERENCIAIS */
.diferenciais{background:linear-gradient(135deg,var(--accent2),var(--accent));padding:80px 40px}
.sec-title{font-family:'Poppins',sans-serif;font-size:clamp(26px,4vw,42px);font-weight:900;text-align:center;margin-bottom:12px}
.sec-sub{color:var(--muted);text-align:center;font-size:16px;margin-bottom:48px}
.diferenciais .sec-sub{color:rgba(255,255,255,.75)}
.dif-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;max-width:1000px;margin:0 auto}
.dif-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:var(--radius);padding:28px;text-align:center;backdrop-filter:blur(8px)}
.dif-icon{font-size:36px;margin-bottom:12px}
.dif-card h3{font-size:16px;font-weight:700;color:white;margin-bottom:8px}
.dif-card p{font-size:14px;color:rgba(255,255,255,.7);line-height:1.6}

/* DEPOIMENTOS */
.depo-section{padding:80px 40px;max-width:1100px;margin:0 auto}
.depo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.depo{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:.3s}
.depo:hover{border-color:var(--accent);transform:translateY(-4px)}
.depo-stars{color:#fbbf24;font-size:18px;margin-bottom:14px}
.depo-text{color:rgba(255,255,255,.8);font-size:15px;line-height:1.7;margin-bottom:20px}
.depo-name{font-weight:700;color:var(--text)}.depo-role{font-size:12px;color:var(--muted)}

/* CTA */
.cta-section{background:var(--surface);border-top:1px solid var(--border);padding:80px 40px;text-align:center}
.cta-section h2{font-family:'Poppins',sans-serif;font-size:clamp(28px,4vw,48px);font-weight:900;margin-bottom:16px}
.cta-section p{color:var(--muted);font-size:17px;margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto}
.btn-wpp-big{display:inline-flex;align-items:center;gap:12px;background:#25D366;color:white;padding:18px 44px;border-radius:50px;font-size:19px;font-weight:800;box-shadow:0 8px 32px rgba(37,211,102,.35);transition:.3s}
.btn-wpp-big:hover{transform:scale(1.05);box-shadow:0 12px 48px rgba(37,211,102,.5)}

/* MODAL */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;align-items:center;justify-content:center;padding:20px}
.modal-overlay.open{display:flex}
.modal-box{background:var(--surface);border:1px solid var(--border);border-radius:20px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;position:relative;display:grid;grid-template-columns:1fr 1fr;gap:0}
@media(max-width:640px){.modal-box{grid-template-columns:1fr}}
.modal-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;z-index:1;transition:.2s}
.modal-close:hover{background:rgba(255,255,255,.2)}
.modal-img-wrap img{width:100%;height:100%;object-fit:cover;border-radius:20px 0 0 20px;min-height:300px}
@media(max-width:640px){.modal-img-wrap img{border-radius:20px 20px 0 0;min-height:220px}}
.modal-content{padding:28px}
.modal-content h2{font-family:'Poppins',sans-serif;font-size:20px;font-weight:800;margin-bottom:6px}
.modal-preco{font-size:26px;font-weight:900;color:var(--accent);margin-bottom:20px}
.specs-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.spec{background:rgba(124,58,237,.1);border-radius:8px;padding:10px 12px}
.spec span{font-size:11px;color:var(--muted);display:block;margin-bottom:2px}
.spec strong{font-size:14px;color:var(--text)}
.simulador{background:rgba(255,255,255,.04);border-radius:12px;padding:16px;margin-bottom:20px}
.simulador h4{font-size:14px;font-weight:700;margin-bottom:12px;color:var(--accent)}
.simulador label{font-size:13px;color:var(--muted);display:block;margin-bottom:6px}
.simulador input[type=range]{width:100%;margin-bottom:12px;accent-color:var(--accent)}
.simulador select{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:8px;font-size:13px;margin-bottom:12px}
.parcela-result{font-size:15px;color:var(--text);font-weight:600}
.parcela-result strong{color:var(--accent);font-size:18px}
.modal-btns{display:flex;flex-direction:column;gap:10px}
.btn-modal-wpp{background:#25D366;color:white;padding:12px;border-radius:10px;text-align:center;font-weight:700;font-size:14px;transition:.2s}
.btn-modal-wpp:hover{background:#1ebe5a}
.btn-modal-test{background:rgba(124,58,237,.2);color:#a78bfa;padding:12px;border-radius:10px;text-align:center;font-weight:700;font-size:14px;border:1px solid rgba(124,58,237,.3);transition:.2s}
.btn-modal-test:hover{background:rgba(124,58,237,.35)}

/* WPP FLOAT */
@keyframes pulse-wpp{0%{box-shadow:0 0 0 0 rgba(37,211,102,.7)}70%{box-shadow:0 0 0 16px rgba(37,211,102,0)}100%{box-shadow:0 0 0 0 rgba(37,211,102,0)}}
.wpp-float{position:fixed;bottom:28px;right:28px;z-index:8000;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.wpp-tag{background:#1e293b;color:white;padding:7px 12px;border-radius:10px;font-size:12px;font-weight:700;white-space:nowrap}
.wpp-circle{width:62px;height:62px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;animation:pulse-wpp 2s infinite;transition:.2s}
.wpp-circle:hover{transform:scale(1.1)}
.wpp-circle svg{width:30px;height:30px;fill:white}

/* FOOTER */
footer{background:#000;border-top:1px solid var(--border);padding:28px 40px;text-align:center;color:var(--muted);font-size:13px}
footer strong{color:var(--text)}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
[data-a]{opacity:0}[data-a].vis{animation:fadeUp .65s ease forwards}
</style>
</head>
<body>

<nav id="nav">
  <div class="nav-logo">${nome}</div>
  <ul class="nav-links">
    <li><a href="#estoque">Estoque</a></li>
    <li><a href="#diferenciais">Por que nós?</a></li>
    <li><a href="#depoimentos">Clientes</a></li>
  </ul>
  <a href="#estoque" class="nav-cta">Ver Estoque</a>
</nav>

<section class="hero">
  <div>
    <h1 data-a>O Carro dos Seus<br><span>Sonhos Está Aqui</span></h1>
    <p data-a style="animation-delay:.1s">${tagline} — Estoque selecionado, financiamento fácil e procedência garantida em ${cidade}.</p>
    <div class="hero-btns" data-a style="animation-delay:.2s">
      <a href="#estoque" class="btn-main">Ver Estoque Completo</a>
      <a href="https://wa.me/5500000000000" target="_blank" class="btn-out">Falar no WhatsApp</a>
    </div>
    <div class="hero-nums" data-a style="animation-delay:.3s">
      <div class="num"><div class="num-val" data-count="847">0</div><div class="num-label">Veículos vendidos</div></div>
      <div class="num"><div class="num-val" data-count="12">0</div><div class="num-label">Anos no mercado</div></div>
      <div class="num"><div class="num-val" data-count="98">0</div><div class="num-label">% de satisfação</div></div>
    </div>
  </div>
</section>

<div class="filtros-wrap" id="estoque">
  <div class="filtros">
    <button class="filtro-btn active" data-filter="all">Todos</button>
    <button class="filtro-btn" data-filter="suv">SUVs</button>
    <button class="filtro-btn" data-filter="sedan">Sedans</button>
    <button class="filtro-btn" data-filter="hatch">Hatchbacks</button>
    <button class="filtro-btn" data-filter="esportivo">Esportivos</button>
    <button class="filtro-btn" data-filter="picape">Picapes</button>
  </div>
</div>

<div class="grid-section">
  <div class="grid">${cards}</div>
</div>

<section class="diferenciais" id="diferenciais">
  <h2 class="sec-title" data-a>Por que escolher a ${nome}?</h2>
  <p class="sec-sub" data-a>Transparência, qualidade e suporte do início ao fim</p>
  <div class="dif-grid">
    <div class="dif-card" data-a style="animation-delay:.1s"><div class="dif-icon">🛡️</div><h3>Procedência 100%</h3><p>Todos os veículos com histórico verificado e laudo cautelar.</p></div>
    <div class="dif-card" data-a style="animation-delay:.2s"><div class="dif-icon">💳</div><h3>Financiamento Fácil</h3><p>Parceria com os principais bancos. Aprovação rápida.</p></div>
    <div class="dif-card" data-a style="animation-delay:.3s"><div class="dif-icon">🔧</div><h3>Revisão Inclusa</h3><p>Revisão completa antes da entrega, sem custo adicional.</p></div>
    <div class="dif-card" data-a style="animation-delay:.4s"><div class="dif-icon">📞</div><h3>Suporte Pós-Venda</h3><p>Equipe dedicada para atender você após a compra.</p></div>
  </div>
</section>

<section class="depo-section" id="depoimentos">
  <h2 class="sec-title" data-a>O que nossos clientes dizem</h2>
  <p class="sec-sub" data-a>Histórias reais de quem realizou o sonho do carro novo</p>
  <div class="depo-grid">
    <div class="depo" data-a style="animation-delay:.1s">
      <div class="depo-stars">⭐⭐⭐⭐⭐</div>
      <p class="depo-text">"Atendimento impecável! Encontrei o carro ideal com financiamento aprovado na hora. Super recomendo a ${nome}!"</p>
      <div class="depo-name">Ricardo Almeida</div><div class="depo-role">Comprou um Corolla 2023</div>
    </div>
    <div class="depo" data-a style="animation-delay:.2s">
      <div class="depo-stars">⭐⭐⭐⭐⭐</div>
      <p class="depo-text">"Processo transparente do início ao fim. O carro chegou revisado e com documentação perfeita. Voltarei com certeza!"</p>
      <div class="depo-name">Fernanda Costa</div><div class="depo-role">Comprou um HR-V 2022</div>
    </div>
    <div class="depo" data-a style="animation-delay:.3s">
      <div class="depo-stars">⭐⭐⭐⭐⭐</div>
      <p class="depo-text">"Melhor experiência de compra de carro que já tive. Equipe profissional, preço justo e entrega rápida."</p>
      <div class="depo-name">Marcos Oliveira</div><div class="depo-role">Comprou uma Ranger 2022</div>
    </div>
  </div>
</section>

<section class="cta-section">
  <h2 data-a>Pronto para encontrar seu carro?</h2>
  <p data-a>Fale agora com nossa equipe e saia de carro hoje mesmo.</p>
  <a href="https://wa.me/5500000000000?text=Olá! Gostaria de saber mais sobre os veículos disponíveis." target="_blank" class="btn-wpp-big" data-a>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    Falar no WhatsApp
  </a>
</section>

<footer>
  <p><strong>${nome}</strong> — ${cidade} | Todos os direitos reservados © ${new Date().getFullYear()}</p>
</footer>

<div class="wpp-float">
  <div class="wpp-tag">💬 Atendimento</div>
  <a href="https://wa.me/5500000000000" target="_blank" class="wpp-circle">
    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </a>
</div>

${modais}

<script>
// Navbar scroll
window.addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('scrolled',scrollY>80));

// Filtros
document.querySelectorAll('.filtro-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filtro-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const f=btn.dataset.filter;
    document.querySelectorAll('.card').forEach(c=>{
      c.classList.toggle('hidden',f!=='all'&&c.dataset.cat!==f);
    });
  });
});

// Modal
function abrirModal(i){document.getElementById('modal-'+i).classList.add('open');calcParcela(i,null);document.body.style.overflow='hidden';}
function fecharModal(i){document.getElementById('modal-'+i).classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.open').forEach((_,i)=>fecharModal(i));});

// Simulador
const precos=[142900,189900,1890000,249900,389900,229900,159900,89900];
function calcParcela(i,_){
  const preco=precos[i];
  const ent=+document.getElementById('entrada-'+i).value;
  const meses=+document.getElementById('meses-'+i).value;
  const taxa=0.018;
  const parcela=(preco-ent)*(taxa/(1-Math.pow(1+taxa,-meses)));
  document.getElementById('ent-val-'+i).textContent='R$ '+ent.toLocaleString('pt-BR');
  document.getElementById('parc-'+i).textContent='R$ '+parcela.toFixed(2).replace('.',',').replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');
}

// Contadores
function countUp(el,target){let n=0;const step=Math.ceil(target/60);const t=setInterval(()=>{n=Math.min(n+step,target);el.textContent=n;if(n>=target)clearInterval(t);},20);}
const cObs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){countUp(e.target,+e.target.dataset.count);cObs.unobserve(e.target);}});},{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>cObs.observe(el));

// Scroll animations
const aObs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vis');aObs.unobserve(e.target);}});},{threshold:.12});
document.querySelectorAll('[data-a]').forEach(el=>aObs.observe(el));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior:'smooth'});}));
</script>
</body>
</html>`;
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages } = await req.json();
  const lastUserMsg = [...messages].reverse().find((m:{role:string})=>m.role==="user")?.content??"";

  const isSiteRequest = /site|criar|fazer|montar|desenvolver|quero um|preciso de um|gera|cria/.test(lastUserMsg.toLowerCase());

  if (!isSiteRequest) {
    const res = await openai.chat.completions.create({
      model:"gpt-4o", max_tokens:300,
      messages:[{role:"system",content:'Você é Vox. Responda: {"type":"message","message":"resposta"}'}, ...messages],
    });
    const t = res.choices[0]?.message?.content??"";
    try{const m=t.match(/\{[\s\S]*\}/);if(m)return NextResponse.json(JSON.parse(m[0]));}catch{}
    return NextResponse.json({type:"message",message:t});
  }

  const nicho = detectarNicho(lastUserMsg);

  if (nicho === "carros") {
    // GPT só gera nome e cidade
    const infoRes = await openai.chat.completions.create({
      model:"gpt-4o", max_tokens:120, temperature:0.9,
      messages:[{role:"user",content:`Baseado em "${lastUserMsg}", sugira um nome criativo para uma revenda de carros premium e uma cidade fictícia no Brasil. Responda SOMENTE JSON: {"nome":"Nome da Empresa","tagline":"slogan curto","cidade":"Cidade - UF"}`}],
    });
    let nome="Premium Motors", tagline="Os melhores carros com o melhor preço", cidade="São Paulo - SP";
    try {
      const raw = infoRes.choices[0]?.message?.content??"";
      const m = raw.match(/\{[\s\S]*\}/);
      if(m){const d=JSON.parse(m[0]);nome=d.nome||nome;tagline=d.tagline||tagline;cidade=d.cidade||cidade;}
    } catch {}

    const html = buildCarSite(nome, tagline, cidade);
    const slug = slugify(nome);
    const senha = gerarSenha();
    createSite({slug,nicho,nome,html,whatsapp:"",prompt_voz:lastUserMsg,produto_tipo:"basico",admin_senha:senha,criado_em:new Date().toISOString()});
    return NextResponse.json({type:"site",html,slug,nome,nicho,admin_senha:senha,message:`Site da ${nome} pronto! Veja o preview.`});
  }

  // Outros nichos — GPT gera HTML puro
  const prompts: Record<string,string> = {
    barbearia:`Crie site HTML completo para barbearia premium. SOMENTE HTML do DOCTYPE ao /html. Min 600 linhas. Fundo escuro, dourado. HERO: https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=90&fit=crop S1: https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=85&fit=crop S2: https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=85&fit=crop — Pedido: ${lastUserMsg}`,
    pizzaria:`Crie site HTML completo para pizzaria. SOMENTE HTML. Min 600 linhas. HERO: https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=90&fit=crop P1: https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85&fit=crop P2: https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85&fit=crop — Pedido: ${lastUserMsg}`,
    academia:`Crie site HTML completo para academia fitness. SOMENTE HTML. Min 600 linhas. HERO: https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=90&fit=crop G1: https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=85&fit=crop — Pedido: ${lastUserMsg}`,
  };
  const sysPrompt = prompts[nicho] ?? `Crie site HTML completo e profissional. SOMENTE HTML do DOCTYPE ao /html. Min 500 linhas. Use Google Fonts Inter. Fotos: https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=90&fit=crop — Pedido: ${lastUserMsg}`;

  const response = await openai.chat.completions.create({
    model:"gpt-4o", max_tokens:16000, temperature:0.7,
    messages:[{role:"system",content:sysPrompt},{role:"user",content:"Gere o HTML agora. Apenas o HTML, nada mais."}],
  });
  let html = response.choices[0]?.message?.content??"";
  const md = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if(md)html=md[1].trim();
  const start=html.toLowerCase().indexOf("<!doctype");
  if(start>0)html=html.slice(start);

  if(html.toLowerCase().includes("</html>")){
    const titleM=html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const nome=titleM?.[1]?.trim()||nicho;
    const slug=slugify(nome);
    const senha=gerarSenha();
    createSite({slug,nicho,nome,html,whatsapp:"",prompt_voz:lastUserMsg,produto_tipo:"basico",admin_senha:senha,criado_em:new Date().toISOString()});
    return NextResponse.json({type:"site",html,slug,nome,nicho,admin_senha:senha,message:"Site pronto!"});
  }
  return NextResponse.json({type:"message",message:"Não consegui gerar o site. Tente novamente."});
}
