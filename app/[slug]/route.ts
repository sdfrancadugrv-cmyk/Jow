import { NextRequest, NextResponse } from "next/server";
import { getSite } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = getSite(slug);

  if (!site) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Site não encontrado</title>
      <style>*{margin:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#f4f3f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
      .box{text-align:center;padding:48px;background:white;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
      h1{color:#7c3aed;font-size:28px;margin-bottom:12px}p{color:#78716c;margin-bottom:24px}
      a{display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:12px;text-decoration:none;font-weight:600}</style>
      </head><body><div class="box"><h1>Site não encontrado</h1><p>O endereço <strong>/${slug}</strong> não existe ainda.</p>
      <a href="/">← Criar um site com Vox</a></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const whatsappNum = (site.whatsapp || "").replace(/\D/g, "");
  const wppMsg = encodeURIComponent((site as any).whatsapp_message || "Olá! Vim pelo site e gostaria de mais informações.");
  const wppLabel = (site as any).whatsapp_label || "Falar pelo WhatsApp";
  const whatsappWidget = whatsappNum
    ? `<div id="wpp-topbar" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#25D366;padding:0;margin:0;box-shadow:0 2px 12px rgba(0,0,0,0.25)">
        <a href="https://wa.me/${whatsappNum}?text=${wppMsg}" target="_blank" rel="noopener"
           style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 20px;text-decoration:none;color:white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="flex-shrink:0;animation:wppPulse 1.8s ease-in-out infinite">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.3px">${wppLabel}</span>
        </a>
      </div>
      <style>
        @keyframes wppPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
        body{padding-top:52px!important}
      </style>`
    : "";

  const voiceWidget =
    site.produto_tipo === "pro"
      ? `
    <div id="vox-agent" style="position:fixed;bottom:${whatsappNum ? "100px" : "24px"};right:24px;z-index:9998;font-family:Inter,-apple-system,sans-serif">
      <button id="vox-toggle" title="Assistente virtual"
        style="width:58px;height:58px;background:#7c3aed;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(124,58,237,.4);transition:transform .2s"
        onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <div id="vox-panel" style="display:none;position:absolute;bottom:72px;right:0;width:310px;background:white;border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.16);overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:14px 16px;display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            </svg>
          </div>
          <div>
            <p style="color:white;font-weight:600;font-size:14px;margin:0;line-height:1.2">Assistente Virtual</p>
            <p style="color:rgba(255,255,255,.75);font-size:11px;margin:0">Fale ou escreva sua dúvida</p>
          </div>
        </div>
        <div id="vox-msgs" style="height:230px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px">
          <div style="background:#f4f3f0;border-radius:14px;border-bottom-left-radius:4px;padding:10px 13px;font-size:13px;color:#18181b;max-width:88%;line-height:1.45">
            Olá! Como posso te ajudar hoje? 😊
          </div>
        </div>
        <div style="padding:10px 12px;border-top:1px solid #e8e6e0;display:flex;gap:8px;align-items:center">
          <input id="vox-input" type="text" placeholder="Digite sua pergunta..."
            style="flex:1;padding:9px 12px;border:1px solid #e8e6e0;border-radius:10px;font-size:13px;outline:none;font-family:inherit;color:#18181b"
            onkeydown="if(event.key==='Enter')voxSend()"/>
          <button onclick="voxListen()" id="vox-mic-btn"
            style="width:38px;height:38px;background:#7c3aed;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            </svg>
          </button>
          <button onclick="voxSend()"
            style="width:38px;height:38px;background:#059669;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <script>
    (function(){
      var SLUG='${site.slug}',vMsgs=[],synth=window.speechSynthesis;
      document.getElementById('vox-toggle').onclick=function(){
        var p=document.getElementById('vox-panel');
        p.style.display=p.style.display==='none'?'block':'none';
      };
      function addMsg(t,r){
        var c=document.getElementById('vox-msgs'),d=document.createElement('div');
        d.style.cssText=r==='user'
          ?'background:#7c3aed;color:white;border-radius:14px;border-bottom-right-radius:4px;padding:9px 13px;font-size:13px;max-width:88%;align-self:flex-end;margin-left:auto;line-height:1.45'
          :'background:#f4f3f0;color:#18181b;border-radius:14px;border-bottom-left-radius:4px;padding:9px 13px;font-size:13px;max-width:88%;line-height:1.45';
        d.textContent=t;c.appendChild(d);c.scrollTop=c.scrollHeight;
      }
      async function speak(t){
        try{
          var r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t})});
          if(r.ok){var b=await r.blob(),u=URL.createObjectURL(b),a=new Audio(u);a.onended=function(){URL.revokeObjectURL(u);};a.play();return;}
        }catch(e){}
        if(synth){var ut=new SpeechSynthesisUtterance(t);ut.lang='pt-BR';synth.speak(ut);}
      }
      async function ask(t){
        vMsgs.push({role:'user',content:t});
        try{
          var r=await fetch('/api/voice-agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:vMsgs,siteSlug:SLUG})});
          var d=await r.json();
          vMsgs.push({role:'assistant',content:d.message});
          return d.message;
        }catch(e){return'Erro ao conectar. Tente novamente.';}
      }
      window.voxSend=async function(){
        var inp=document.getElementById('vox-input'),t=inp.value.trim();
        if(!t)return;inp.value='';addMsg(t,'user');
        addMsg('...','assistant');
        var reply=await ask(t);
        var c=document.getElementById('vox-msgs');
        c.removeChild(c.lastChild);
        addMsg(reply,'assistant');speak(reply);
      };
      window.voxListen=function(){
        var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(!SR){alert('Seu navegador não suporta reconhecimento de voz.');return;}
        var r=new SR();r.lang='pt-BR';r.continuous=false;r.interimResults=false;
        var btn=document.getElementById('vox-mic-btn');
        btn.style.background='#dc2626';
        r.onresult=function(e){document.getElementById('vox-input').value=e.results[0][0].transcript;window.voxSend();};
        r.onend=function(){btn.style.background='#7c3aed';};
        r.start();
      };
    })();
    </script>`
      : "";

  const adminBadge = `
    <a href="/${slug}/admin"
       style="position:fixed;top:16px;right:16px;z-index:10000;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(0,0,0,.65);color:white;border-radius:20px;font-size:12px;font-family:Inter,sans-serif;text-decoration:none;backdrop-filter:blur(8px);transition:background .2s"
       onmouseover="this.style.background='rgba(124,58,237,.9)'" onmouseout="this.style.background='rgba(0,0,0,.65)'" title="Painel Admin">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Admin
    </a>`;

  let html = site.html;
  const inject = adminBadge + whatsappWidget + voiceWidget;
  html = html.includes("</body>") ? html.replace("</body>", inject + "\n</body>") : html + inject;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
