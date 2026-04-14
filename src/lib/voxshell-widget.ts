/**
 * Gera o código HTML do widget de voz VoxShell
 * para ser embutido nos sites gerados.
 */
export function gerarWidget(agentId: string, whatsappPhone: string, agentName: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";
  const waNumber = whatsappPhone.replace(/\D/g, "");

  return `
<!-- VoxShell AI Widget -->
<style>
#vsx-fab{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:'Inter',system-ui,sans-serif}
#vsx-btn{width:60px;height:60px;border-radius:50%;background:#7c3aed;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(124,58,237,0.45);transition:transform .2s}
#vsx-btn:hover{transform:scale(1.08)}
#vsx-btn svg{width:26px;height:26px}
#vsx-panel{background:#111;border:1px solid #222;border-radius:20px;padding:0;width:320px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);display:none;flex-direction:column}
#vsx-panel.open{display:flex}
#vsx-header{background:#7c3aed;padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
#vsx-header p{color:#fff;font-size:14px;font-weight:700;margin:0}
#vsx-header span{color:rgba(255,255,255,.7);font-size:11px}
#vsx-close{background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:18px;line-height:1;padding:0}
#vsx-msgs{flex:1;max-height:220px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
#vsx-msgs::-webkit-scrollbar{width:3px}#vsx-msgs::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
.vsx-msg{padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.5;max-width:260px}
.vsx-msg.bot{background:#1a1a1a;color:#e8e8e8;border-bottom-left-radius:4px;align-self:flex-start}
.vsx-msg.user{background:#7c3aed;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
#vsx-controls{padding:14px;display:flex;flex-direction:column;align-items:center;gap:10px;border-top:1px solid #1e1e1e}
#vsx-voice{width:52px;height:52px;border-radius:50%;background:#7c3aed;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 0 rgba(124,58,237,.4);transition:all .2s}
#vsx-voice.listening{background:#ef4444;animation:vsx-pulse 1s infinite}
#vsx-voice.processing{opacity:.6;cursor:default}
#vsx-status{font-size:11px;color:#555;text-align:center}
#vsx-wa{display:flex;align-items:center;gap:6px;background:#25D366;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;width:100%;justify-content:center}
#vsx-wa svg{width:16px;height:16px}
@keyframes vsx-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}
@keyframes vsx-wave{0%,100%{height:6px}50%{height:16px}}
.vsx-bar{width:3px;border-radius:2px;background:#fff;animation:vsx-wave .7s ease-in-out infinite}
</style>

<div id="vsx-fab">
  <div id="vsx-panel">
    <div id="vsx-header">
      <div><p>${agentName}</p><span>Atendente virtual</span></div>
      <button id="vsx-close">✕</button>
    </div>
    <div id="vsx-msgs">
      <div class="vsx-msg bot">Olá! Sou o atendente virtual. Como posso te ajudar hoje?</div>
    </div>
    <div id="vsx-controls">
      <div id="vsx-status">Segure para falar</div>
      <button id="vsx-voice" title="Segure para falar">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        </svg>
      </button>
      <a id="vsx-wa" href="https://wa.me/${waNumber}?text=Olá! Vim do site e gostaria de continuar o atendimento." target="_blank">
        <svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        Continuar pelo WhatsApp
      </a>
    </div>
  </div>
  <button id="vsx-btn" title="Falar com atendente">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    </svg>
  </button>
</div>

<script>
(function(){
  var AGENT_ID="${agentId}";
  var API_URL="${appUrl}/api/public/agent/"+AGENT_ID;
  var msgs=[];
  var recorder=null,chunks=[],stream=null,listening=false,busy=false;

  var btn=document.getElementById('vsx-btn');
  var panel=document.getElementById('vsx-panel');
  var closeBtn=document.getElementById('vsx-close');
  var voiceBtn=document.getElementById('vsx-voice');
  var status=document.getElementById('vsx-status');
  var msgsEl=document.getElementById('vsx-msgs');

  btn.onclick=function(){panel.classList.toggle('open')};
  closeBtn.onclick=function(){panel.classList.remove('open')};

  function addMsg(text,role){
    var d=document.createElement('div');
    d.className='vsx-msg '+(role==='user'?'user':'bot');
    d.textContent=text;
    msgsEl.appendChild(d);
    msgsEl.scrollTop=msgsEl.scrollHeight;
  }

  function playAudio(src){
    return new Promise(function(res){
      var a=new Audio(src);
      a.onended=res;a.onerror=res;
      a.play().catch(res);
    });
  }

  function setStatus(s,cls){
    status.textContent=s;
    voiceBtn.className=cls||'';
  }

  voiceBtn.onpointerdown=async function(){
    if(busy||listening)return;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      chunks=[];
      recorder=new MediaRecorder(stream,{mimeType:'audio/webm'});
      recorder.ondataavailable=function(e){if(e.data.size>0)chunks.push(e.data)};
      recorder.onstop=async function(){
        stream.getTracks().forEach(function(t){t.stop()});
        var blob=new Blob(chunks,{type:'audio/webm'});
        if(blob.size<1500){setStatus('Segure para falar');listening=false;busy=false;return;}
        busy=true;setStatus('Pensando...',);voiceBtn.className='processing';
        try{
          var form=new FormData();
          form.append('audio',blob,'audio.webm');
          form.append('messages',JSON.stringify(msgs));
          var res=await fetch(API_URL,{method:'POST',body:form});
          var data=await res.json();
          addMsg(data.userMessage,'user');
          addMsg(data.message,'bot');
          msgs=data.messages||msgs;
          if(data.audio){await playAudio(data.audio);}
        }catch(e){addMsg('Erro ao conectar. Tente novamente.','bot');}
        setStatus('Segure para falar');voiceBtn.className='';busy=false;listening=false;
      };
      recorder.start(100);
      listening=true;setStatus('Gravando... solte para enviar','listening');
    }catch(e){setStatus('Microfone bloqueado.');}
  };

  voiceBtn.onpointerup=voiceBtn.onpointerleave=voiceBtn.onpointercancel=function(){
    if(recorder&&recorder.state==='recording')recorder.stop();
    listening=false;
  };
})();
</script>
<!-- Fim VoxShell Widget -->`;
}
