import { readFileSync, writeFileSync } from "fs";

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HydroBlu — Economize até 50% na conta de água</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#f0f9ff;color:#1e293b;overflow-x:hidden}
:root{--blue:#0077cc;--blue-dark:#005fa3;--green:#22c55e;--wpp:#25D366}

/* NAVBAR */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);box-shadow:0 2px 20px rgba(0,119,204,0.12)}
.nav-logo{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:800;color:var(--blue)}
.nav-logo span{color:#0ea5e9}
.nav-cta{background:var(--green);color:white;border:none;padding:10px 20px;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:6px;transition:all .3s}
.nav-cta:hover{transform:scale(1.05);background:#16a34a}

/* HERO */
.hero{min-height:100vh;background:linear-gradient(135deg,#0c4a6e 0%,#0077cc 50%,#0ea5e9 100%);display:flex;align-items:center;justify-content:center;text-align:center;padding:100px 24px 60px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:white;padding:8px 18px;border-radius:50px;font-size:14px;font-weight:600;margin-bottom:24px;backdrop-filter:blur(10px)}
.hero h1{font-size:clamp(36px,6vw,72px);font-weight:900;color:white;line-height:1.1;margin-bottom:20px;text-shadow:0 2px 20px rgba(0,0,0,0.2)}
.hero h1 em{font-style:normal;color:#7dd3fc}
.hero p{font-size:clamp(17px,2.5vw,22px);color:rgba(255,255,255,0.88);max-width:600px;margin:0 auto 36px;line-height:1.6}
.hero-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-primary{background:var(--green);color:white;padding:16px 32px;border-radius:50px;font-size:18px;font-weight:800;text-decoration:none;display:flex;align-items:center;gap:10px;transition:all .3s;box-shadow:0 8px 30px rgba(34,197,94,0.4)}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(34,197,94,0.5)}
.btn-secondary{background:rgba(255,255,255,0.15);color:white;padding:16px 32px;border-radius:50px;font-size:18px;font-weight:700;text-decoration:none;border:2px solid rgba(255,255,255,0.4);backdrop-filter:blur(10px);transition:all .3s}
.btn-secondary:hover{background:rgba(255,255,255,0.25)}
.hero-stats{display:flex;gap:40px;justify-content:center;margin-top:56px;flex-wrap:wrap}
.stat{text-align:center;color:white}
.stat-num{font-size:42px;font-weight:900;color:#7dd3fc;line-height:1}
.stat-label{font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px}

/* COMO FUNCIONA */
.section{padding:80px 24px}
.container{max-width:1100px;margin:0 auto}
.section-title{text-align:center;font-size:clamp(28px,4vw,42px);font-weight:800;color:#0c4a6e;margin-bottom:12px}
.section-sub{text-align:center;color:#64748b;font-size:17px;margin-bottom:56px;max-width:600px;margin-left:auto;margin-right:auto}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:32px}
.step{background:white;border-radius:20px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(0,119,204,0.08);transition:all .4s;border:1px solid #e0f2fe}
.step:hover{transform:translateY(-8px);box-shadow:0 16px 48px rgba(0,119,204,0.15)}
.step-icon{width:72px;height:72px;background:linear-gradient(135deg,#0077cc,#0ea5e9);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px}
.step h3{font-size:18px;font-weight:700;color:#0c4a6e;margin-bottom:10px}
.step p{color:#64748b;font-size:15px;line-height:1.6}

/* ECONOMIA */
.economia{background:linear-gradient(135deg,#0c4a6e,#0077cc);padding:80px 24px;text-align:center}
.economia .section-title{color:white}
.economia .section-sub{color:rgba(255,255,255,0.8)}
.eco-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;max-width:900px;margin:0 auto}
.eco-card{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:28px 20px;text-align:center;backdrop-filter:blur(10px)}
.eco-antes{font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:4px}
.eco-valor-antes{font-size:22px;font-weight:700;color:rgba(255,255,255,0.5);text-decoration:line-through}
.eco-seta{font-size:28px;color:#4ade80;margin:8px 0}
.eco-depois{font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:4px}
.eco-valor-depois{font-size:36px;font-weight:900;color:#4ade80}
.eco-label{font-size:13px;color:rgba(255,255,255,0.7);margin-top:8px}

/* DEPOIMENTOS */
.depo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px}
.depo{background:white;border-radius:20px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0;transition:all .3s}
.depo:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(0,119,204,0.12)}
.depo-msg{background:#dcf8c6;border-radius:16px 16px 16px 4px;padding:16px 18px;margin-bottom:20px;font-size:15px;line-height:1.6;color:#1e293b;position:relative}
.depo-msg::before{content:'✓✓';position:absolute;bottom:8px;right:12px;color:#34d399;font-size:12px}
.depo-foot{display:flex;align-items:center;gap:12px}
.depo-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0077cc,#0ea5e9);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0}
.depo-name{font-weight:700;color:#0c4a6e;font-size:15px}
.depo-stars{color:#f59e0b;font-size:13px}

/* VIDEO */
.video-section{background:#f8fafc;padding:80px 24px;text-align:center}
.video-wrap{max-width:420px;margin:0 auto;border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(0,119,204,0.2)}
.video-wrap iframe{width:100%;aspect-ratio:9/16;display:block;border:none}

/* CTA FINAL */
.cta-final{background:linear-gradient(135deg,#052e16,#166534,#15803d);padding:80px 24px;text-align:center}
.cta-final h2{font-size:clamp(28px,4vw,48px);font-weight:900;color:white;margin-bottom:16px}
.cta-final p{font-size:18px;color:rgba(255,255,255,0.85);margin-bottom:40px;max-width:500px;margin-left:auto;margin-right:auto}
.cta-wpp{display:inline-flex;align-items:center;gap:12px;background:#25D366;color:white;padding:20px 44px;border-radius:50px;font-size:20px;font-weight:800;text-decoration:none;box-shadow:0 8px 40px rgba(37,211,102,0.5);transition:all .3s}
.cta-wpp:hover{transform:scale(1.06);box-shadow:0 12px 50px rgba(37,211,102,0.65)}

/* FOOTER */
footer{background:#0c4a6e;color:rgba(255,255,255,0.7);text-align:center;padding:24px;font-size:14px}
footer strong{color:white}

/* BOTÃO FLUTUANTE WHATSAPP PULSANTE */
@keyframes pulse-wpp{
  0%{box-shadow:0 0 0 0 rgba(37,211,102,0.7)}
  70%{box-shadow:0 0 0 18px rgba(37,211,102,0)}
  100%{box-shadow:0 0 0 0 rgba(37,211,102,0)}
}
@keyframes pulse-ring{
  0%{transform:scale(1);opacity:1}
  100%{transform:scale(1.8);opacity:0}
}
.wpp-float{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.wpp-label{background:#1e293b;color:white;padding:8px 14px;border-radius:12px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.25)}
.wpp-btn{width:64px;height:64px;background:var(--wpp);border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;animation:pulse-wpp 2s infinite;position:relative;transition:transform .2s}
.wpp-btn:hover{transform:scale(1.1)}
.wpp-btn svg{width:32px;height:32px;fill:white}
.wpp-ring{position:absolute;inset:-6px;border-radius:50%;border:3px solid rgba(37,211,102,0.5);animation:pulse-ring 2s infinite}

/* ANIMAÇÕES SCROLL */
@keyframes fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
[data-anim]{opacity:0;animation:fadeUp .7s ease forwards;animation-play-state:paused}
[data-anim].visible{animation-play-state:running}

@media(max-width:640px){
  .hero-stats{gap:24px}
  .stat-num{font-size:32px}
  .hero-btns{flex-direction:column;align-items:center}
}
</style>
</head>
<body>

<!-- NAVBAR -->
<nav>
  <div class="nav-logo">
    💧 <span>Hydro</span>Blu
  </div>
  <a href="https://wa.me/5553999516012?text=oi+gostaria+de+falar+com+um+tecnico+da+hidroblu" target="_blank" class="nav-cta">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    Falar com Técnico
  </a>
</nav>

<!-- HERO -->
<section class="hero">
  <div style="position:relative;z-index:1">
    <div class="hero-badge">💧 Tecnologia em economia de água</div>
    <h1>Economize até <em>50%</em><br>na sua conta de água</h1>
    <p>A válvula HydroBlu regula automaticamente a pressão da água, eliminando desperdícios sem você precisar fazer nada.</p>
    <div class="hero-btns">
      <a href="https://wa.me/5553999516012?text=oi+gostaria+de+falar+com+um+tecnico+da+hidroblu" target="_blank" class="btn-primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Quero economizar agora
      </a>
      <a href="#como-funciona" class="btn-secondary">Como funciona →</a>
    </div>
    <div class="hero-stats">
      <div class="stat"><div class="stat-num" data-count="50">0</div><div class="stat-label">% de economia média</div></div>
      <div class="stat"><div class="stat-num" data-count="1200">0</div><div class="stat-label">Clientes satisfeitos</div></div>
      <div class="stat"><div class="stat-num" data-count="8">0</div><div class="stat-label">Anos no mercado</div></div>
    </div>
  </div>
</section>

<!-- COMO FUNCIONA -->
<section class="section" id="como-funciona">
  <div class="container">
    <h2 class="section-title" data-anim>Como a HydroBlu funciona?</h2>
    <p class="section-sub">Instalação simples, resultado imediato. Sem obras, sem complicação.</p>
    <div class="steps">
      <div class="step" data-anim style="animation-delay:.1s">
        <div class="step-icon">🔧</div>
        <h3>Instalação rápida</h3>
        <p>Um técnico HydroBlu instala a válvula em menos de 1 hora, sem quebrar paredes ou interromper o fornecimento.</p>
      </div>
      <div class="step" data-anim style="animation-delay:.2s">
        <div class="step-icon">⚙️</div>
        <h3>Regulagem automática</h3>
        <p>A válvula monitora e regula a pressão da água 24h por dia, eliminando o desperdício causado pelo excesso de pressão.</p>
      </div>
      <div class="step" data-anim style="animation-delay:.3s">
        <div class="step-icon">💰</div>
        <h3>Economia na conta</h3>
        <p>Já no primeiro mês você vê a diferença na conta. Nossos clientes economizam em média 30% a 50% todo mês.</p>
      </div>
    </div>
  </div>
</section>

<!-- ECONOMIA REAL -->
<section class="economia">
  <div class="container">
    <h2 class="section-title" data-anim>Resultados reais dos nossos clientes</h2>
    <p class="section-sub" style="color:rgba(255,255,255,0.8)">Esses são os valores reais de contas de água antes e depois da HydroBlu</p>
    <div class="eco-cards">
      <div class="eco-card" data-anim style="animation-delay:.1s">
        <div class="eco-antes">Antes</div>
        <div class="eco-valor-antes">R$ 380,00</div>
        <div class="eco-seta">↓</div>
        <div class="eco-depois">Depois</div>
        <div class="eco-valor-depois">R$ 195,00</div>
        <div class="eco-label">Economia de R$ 185/mês</div>
      </div>
      <div class="eco-card" data-anim style="animation-delay:.2s">
        <div class="eco-antes">Antes</div>
        <div class="eco-valor-antes">R$ 220,00</div>
        <div class="eco-seta">↓</div>
        <div class="eco-depois">Depois</div>
        <div class="eco-valor-depois">R$ 110,00</div>
        <div class="eco-label">Economia de R$ 110/mês</div>
      </div>
      <div class="eco-card" data-anim style="animation-delay:.3s">
        <div class="eco-antes">Antes</div>
        <div class="eco-valor-antes">R$ 150,00</div>
        <div class="eco-seta">↓</div>
        <div class="eco-depois">Depois</div>
        <div class="eco-valor-depois">R$ 29,00</div>
        <div class="eco-label">Economia de R$ 121/mês</div>
      </div>
      <div class="eco-card" data-anim style="animation-delay:.4s">
        <div class="eco-antes">Antes</div>
        <div class="eco-valor-antes">R$ 230,00</div>
        <div class="eco-seta">↓</div>
        <div class="eco-depois">Depois</div>
        <div class="eco-valor-depois">R$ 166,00</div>
        <div class="eco-label">Condomínio — 50% em todos os blocos</div>
      </div>
    </div>
  </div>
</section>

<!-- DEPOIMENTOS -->
<section class="section" style="background:white">
  <div class="container">
    <h2 class="section-title" data-anim>O que nossos clientes dizem</h2>
    <p class="section-sub">Depoimentos reais de quem já instalou a HydroBlu</p>
    <div class="depo-grid">
      <div class="depo" data-anim style="animation-delay:.1s">
        <div class="depo-msg">Instalei a válvula HydroBlu e minha conta caiu de R$ 380,00 para R$ 195,00 este mês! Muito obrigado pelo resultado. 💙</div>
        <div class="depo-foot">
          <div class="depo-avatar">C</div>
          <div>
            <div class="depo-name">Cliente HydroBlu</div>
            <div class="depo-stars">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </div>
      <div class="depo" data-anim style="animation-delay:.2s">
        <div class="depo-msg">Minha conta de R$ 220,00 caiu para R$ 110,00. Incrível! 💧 Nem acreditei quando vi.</div>
        <div class="depo-foot">
          <div class="depo-avatar">M</div>
          <div>
            <div class="depo-name">Cliente HydroBlu</div>
            <div class="depo-stars">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </div>
      <div class="depo" data-anim style="animation-delay:.3s">
        <div class="depo-msg">Só pra avisar que a válvula funcionou demais! Minha conta baixou de R$ 150,00 para R$ 29,00! Nem acreditei quando vi. 🙌</div>
        <div class="depo-foot">
          <div class="depo-avatar">A</div>
          <div>
            <div class="depo-name">Cliente HydroBlu</div>
            <div class="depo-stars">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </div>
      <div class="depo" data-anim style="animation-delay:.4s">
        <div class="depo-msg">Acabei de conferir, a conta baixou de R$ 230,00 para R$ 166,00 este mês. Aqui no condomínio a redução foi de quase 50% em todos os blocos. Valeu muito a pena!</div>
        <div class="depo-foot">
          <div class="depo-avatar">R</div>
          <div>
            <div class="depo-name">Síndico de Condomínio</div>
            <div class="depo-stars">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- VÍDEO -->
<section class="video-section">
  <div class="container">
    <h2 class="section-title" data-anim>Veja a HydroBlu em ação</h2>
    <p class="section-sub">Assista como a instalação é simples e os resultados são reais</p>
    <div class="video-wrap" data-anim>
      <iframe src="https://www.youtube.com/embed/A76CCMtsKGo" allowfullscreen allow="autoplay; encrypted-media"></iframe>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="container">
    <h2 data-anim>Pronto para economizar?</h2>
    <p data-anim>Fale agora com um técnico HydroBlu e descubra quanto você pode economizar todo mês.</p>
    <a href="https://wa.me/5553999516012?text=oi+gostaria+de+falar+com+um+tecnico+da+hidroblu" target="_blank" class="cta-wpp" data-anim>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Falar com Técnico agora
    </a>
  </div>
</section>

<footer>
  <p>© 2025 <strong>HydroBlu</strong> — Tecnologia em economia de água. Todos os direitos reservados.</p>
</footer>

<!-- BOTÃO FLUTUANTE PULSANTE -->
<div class="wpp-float">
  <div class="wpp-label">💬 Falar com Técnico</div>
  <a href="https://wa.me/5553999516012?text=oi+gostaria+de+falar+com+um+tecnico+da+hidroblu" target="_blank" class="wpp-btn">
    <div class="wpp-ring"></div>
    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </a>
</div>

<script>
// Contadores animados
function animateCount(el, target) {
  let start = 0, duration = 2000, step = duration / target;
  let timer = setInterval(() => {
    start += Math.ceil(target / 80);
    if (start >= target) { el.textContent = target; clearInterval(timer); return; }
    el.textContent = start;
  }, step > 20 ? step : 20);
}
const counters = document.querySelectorAll('[data-count]');
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target, +e.target.dataset.count); counterObs.unobserve(e.target); }});
}, { threshold: 0.5 });
counters.forEach(c => counterObs.observe(c));

// Scroll animations
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }});
}, { threshold: 0.12 });
document.querySelectorAll('[data-anim]').forEach(el => obs.observe(el));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
});
</script>
</body>
</html>`;

const db = JSON.parse(readFileSync("./data/db.json", "utf-8"));
db.sites = db.sites.filter(s => s.slug !== "valvula");
db.sites.push({
  slug: "valvula",
  nicho: "hidraulica",
  nome: "HydroBlu",
  html,
  whatsapp: "5553999516012",
  prompt_voz: "site hidroblu valvula economizadora de agua",
  produto_tipo: "basico",
  admin_senha: "hb2025",
  criado_em: new Date().toISOString(),
});
writeFileSync("./data/db.json", JSON.stringify(db, null, 2));
console.log("✅ Site valvula adicionado ao db.json");
