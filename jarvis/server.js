require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── CLIENTES DE IA ───────────────────────────────────────────────────────────
const claude = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // só para TTS

// ─── SESSÕES AUTENTICADAS ─────────────────────────────────────────────────────
const sessoes = new Set();

function gerarToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function autenticado(req) {
  const token = req.headers['x-session-token'];
  return token && sessoes.has(token);
}

// Login
app.post('/login', (req, res) => {
  const { senha } = req.body;
  const senhaCorreta = (process.env.SENHA_ACESSO || '').replace(/^"|"$/g, '').trim();
  console.log(`[LOGIN] tentativa recebida: "${senha}" | esperado: "${senhaCorreta}"`);
  if (senha === senhaCorreta) {
    const token = gerarToken();
    sessoes.add(token);
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ ok: false, mensagem: 'Senha incorreta.' });
  }
});

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ─── FERRAMENTAS QUE O KADOSH PODE USAR ──────────────────────────────────────

const tools = [
  {
    name: 'criar_arquivo',
    description: 'Cria ou sobrescreve um arquivo no projeto Kadosh',
    input_schema: {
      type: 'object',
      properties: {
        caminho: { type: 'string', description: 'Caminho relativo ao projeto. Ex: src/app/teste/page.tsx' },
        conteudo: { type: 'string', description: 'Conteúdo completo do arquivo' }
      },
      required: ['caminho', 'conteudo']
    }
  },
  {
    name: 'ler_arquivo',
    description: 'Lê o conteúdo de um arquivo do projeto',
    input_schema: {
      type: 'object',
      properties: {
        caminho: { type: 'string', description: 'Caminho relativo ao projeto' }
      },
      required: ['caminho']
    }
  },
  {
    name: 'editar_arquivo',
    description: 'Substitui um trecho específico de um arquivo',
    input_schema: {
      type: 'object',
      properties: {
        caminho: { type: 'string' },
        buscar: { type: 'string', description: 'Texto exato a ser substituído' },
        substituir: { type: 'string', description: 'Novo texto' }
      },
      required: ['caminho', 'buscar', 'substituir']
    }
  },
  {
    name: 'executar_comando',
    description: 'Executa um comando no terminal dentro do projeto',
    input_schema: {
      type: 'object',
      properties: {
        comando: { type: 'string', description: 'Comando a executar. Ex: npm install, git status, git add .' }
      },
      required: ['comando']
    }
  },
  {
    name: 'listar_arquivos',
    description: 'Lista os arquivos de um diretório do projeto',
    input_schema: {
      type: 'object',
      properties: {
        diretorio: { type: 'string', description: 'Diretório relativo ao projeto. Use . para a raiz' }
      },
      required: ['diretorio']
    }
  },
  {
    name: 'pesquisar_web',
    description: 'Pesquisa informações na internet usando Tavily',
    input_schema: {
      type: 'object',
      properties: {
        consulta: { type: 'string', description: 'O que pesquisar' }
      },
      required: ['consulta']
    }
  },
  {
    name: 'abrir_url',
    description: 'Abre uma URL no navegador padrão do computador. Use para abrir YouTube, sites, etc.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL completa a abrir. Ex: https://youtube.com/results?search_query=blues' }
      },
      required: ['url']
    }
  }
];

// ─── EXECUTAR FERRAMENTAS ─────────────────────────────────────────────────────

async function executarFerramenta(nome, args) {
  console.log(`[FERRAMENTA] ${nome}:`, args);

  function resolvePath(caminho) {
    if (!caminho) return PROJECT_ROOT;
    if (path.isAbsolute(caminho)) return caminho;
    return path.join(PROJECT_ROOT, caminho);
  }

  if (nome === 'criar_arquivo') {
    const fullPath = resolvePath(args.caminho);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, args.conteudo, 'utf8');
    return `Arquivo criado com sucesso: ${fullPath}`;
  }

  if (nome === 'ler_arquivo') {
    const fullPath = resolvePath(args.caminho);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.substring(0, 8000);
    } catch {
      return `Arquivo não encontrado: ${fullPath}`;
    }
  }

  if (nome === 'editar_arquivo') {
    const fullPath = resolvePath(args.caminho);
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes(args.buscar)) {
        return `Trecho não encontrado no arquivo ${fullPath}`;
      }
      content = content.replace(args.buscar, args.substituir);
      fs.writeFileSync(fullPath, content, 'utf8');
      return `Arquivo editado com sucesso: ${fullPath}`;
    } catch (e) {
      return `Erro ao editar ${fullPath}: ${e.message}`;
    }
  }

  if (nome === 'executar_comando') {
    return new Promise((resolve) => {
      exec(args.comando, { cwd: PROJECT_ROOT, timeout: 60000, shell: true }, (err, stdout, stderr) => {
        const output = (stdout + stderr).trim();
        resolve(output || (err ? `Erro: ${err.message}` : 'Comando executado com sucesso'));
      });
    });
  }

  if (nome === 'listar_arquivos') {
    const fullPath = resolvePath(args.diretorio);
    try {
      const items = fs.readdirSync(fullPath, { withFileTypes: true });
      return items
        .filter(i => !i.name.startsWith('.') && i.name !== 'node_modules')
        .map(i => `${i.isDirectory() ? '[pasta]' : '[arquivo]'} ${i.name}`)
        .join('\n');
    } catch {
      return `Diretório não encontrado: ${fullPath}`;
    }
  }

  if (nome === 'abrir_url') {
    return new Promise((resolve) => {
      exec(`start "" "${args.url}"`, { shell: true }, (err) => {
        resolve(err ? `Erro ao abrir: ${err.message}` : `Abrindo: ${args.url}`);
      });
    });
  }

  if (nome === 'pesquisar_web') {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: args.consulta,
          max_results: 5
        })
      });
      const data = await response.json();
      const results = data.results?.map(r => `${r.title}: ${r.content}`).join('\n\n') || 'Sem resultados';
      return results.substring(0, 4000);
    } catch (e) {
      return `Erro na pesquisa: ${e.message}`;
    }
  }

  return 'Ferramenta desconhecida';
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você se chama KADOSH. Nunca diga que é Jarvis, nunca use outro nome. Seu nome é KADOSH e somente KADOSH.

Você é o assistente pessoal de desenvolvimento de Alessandro.

Alessandro é o criador do Kadosh (kadosh-ai.vercel.app), uma IA por voz multi-função.
Você tem acesso total ao projeto em: ${PROJECT_ROOT}

SUAS CAPACIDADES:
- Criar, editar e ler qualquer arquivo em qualquer lugar do computador (use caminhos absolutos como C:\\Users\\lenovo\\Desktop\\...)
- Executar qualquer comando no terminal
- Abrir sites e YouTube no navegador
- Pesquisar informações na internet
- Controlar o computador de Alessandro via comandos

ACESSO A ARQUIVOS:
- Para arquivos do projeto use caminhos relativos: ex. src/app/page.tsx
- Para qualquer outro lugar do computador use o caminho completo com barras duplas
- A pasta do projeto fica em: ${PROJECT_ROOT}
- A pasta do usuário fica em: C:\\Users\\lenovo
- A área de trabalho fica em: C:\\Users\\lenovo\\Desktop

ARQUIVOS IMPORTANTES DO ALESSANDRO:
- Resumo do projeto Kadosh: C:\\Users\\lenovo\\Desktop\\Projeto Kadosh\\Kadosh\\Resumo Kadosh.txt
- APIs do Kadosh: C:\\Users\\lenovo\\Desktop\\Projeto Kadosh\\Kadosh\\Apis kadosh.txt
- Pasta principal do projeto: C:\\Users\\lenovo\\Desktop\\Projeto Kadosh\\Kadosh\\Jow

MAPEAMENTO DE PÁGINAS — entenda qualquer variação do nome:
- aluno / painel do aluno / área do aluno / admin do aluno / administrador do aluno / dashboard do aluno / página do aluno → src/app/aluno/page.tsx
- landing / home / página inicial / página principal / site / apresentação / tela inicial → src/app/page.tsx
- login / entrar / acesso / tela de login → src/app/login/page.tsx
- assinar / planos / assinatura / comprar plano / página de venda → src/app/assinar/[slug]/page.tsx
- painel do prestador / dashboard prestador / área do prestador / admin prestador → src/app/provider/dashboard/page.tsx
- cadastro prestador / login prestador / entrar como prestador / registro prestador → src/app/provider/login/page.tsx
- pagamento prestador / assinar prestador / plano prestador → src/app/provider/subscribe/page.tsx
- busca de serviços / serviços / procurar profissional / encontrar profissional → src/app/services/new/page.tsx
- contratar / hire / contratar profissional → src/app/services/hire/[providerId]/page.tsx
- webhook / pagamento / mercado pago → src/app/api/mercadopago/webhook/route.ts
- chat landing / kadosh voz / conversa landing → src/app/api/landing-chat/route.ts

REGRA: Se Alessandro falar qualquer coisa parecida com esses nomes, entenda e ache o arquivo. Se ainda não tiver certeza, use listar_arquivos em src/app para encontrar. NUNCA peça o caminho para Alessandro — ele é leigo e não sabe caminhos.

ABRIR SITES E YOUTUBE:
- Para abrir YouTube com música, use abrir_url com: https://www.youtube.com/results?search_query=nome+da+musica
- Para abrir qualquer site use abrir_url

REGRAS OBRIGATÓRIAS PARA CRIAR PÁGINAS:
- Páginas ficam SEMPRE em: src/app/[nome-curto]/page.tsx — use nomes curtos sem acento. Ex: "aluno", "professor", "vendedor"
- NUNCA use nomes longos como "administrador-do-aluno" — use só "aluno"
- A PRIMEIRA linha do arquivo page.tsx DEVE SER SEMPRE: "use client";
- NUNCA importe React diretamente. Use: import { useState, useEffect } from "react";
- APIs ficam SEMPRE em: src/app/api/[nome]/route.ts
- NUNCA crie arquivos fora da pasta do projeto
- Após criar uma página, use abrir_url para abrir http://localhost:3000/[nome] no navegador
- O Next.js atualiza automaticamente — Alessandro vê a mudança em tempo real

COMO SE COMPORTAR:
- Seja direto e ágil — Alessandro é leigo em programação, explique em linguagem simples
- Antes de fazer algo, diga brevemente o que vai fazer
- Após concluir, confirme o que foi feito em 1-2 frases E abra a página no navegador
- Respostas curtas para fala — máximo 3 frases
- Não use asteriscos, markdown ou formatação especial nas respostas faladas
- Se precisar fazer várias etapas, faça tudo de uma vez e resuma no final

PROJETO KADOSH:
- Stack: Next.js 14 + TypeScript + PostgreSQL Neon + Prisma
- Pagamentos: Mercado Pago (PIX + Cartão Bricks)
- WhatsApp: Z-API
- IA: Claude (Anthropic) + TTS OpenAI
- Deploy: Vercel (push no main = deploy automático)
- Branch: main`;

// ─── HISTÓRICO DA CONVERSA ────────────────────────────────────────────────────

let historico = [];

// ─── ENDPOINT PRINCIPAL ───────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  if (!autenticado(req)) {
    return res.status(401).json({ erro: 'não autorizado' });
  }
  try {
    const { mensagem } = req.body;

    // Ping de verificação de sessão
    if (mensagem === '__ping__') {
      return res.json({ ok: true });
    }

    // Saudação de ativação
    if (mensagem === 'SYSTEM_ATIVAR') {
      const hoje = new Date().toISOString().slice(0, 10);
      const arquivoSaudacao = path.join(__dirname, '.ultima-saudacao');

      let ultimaData = '';
      try { ultimaData = fs.readFileSync(arquivoSaudacao, 'utf8').trim(); } catch {}

      let texto;
      if (ultimaData !== hoje) {
        fs.writeFileSync(arquivoSaudacao, hoje, 'utf8');
        const hora = new Date().getHours();
        const saudacao = hora >= 5 && hora < 12 ? 'Bom dia'
                       : hora >= 12 && hora < 18 ? 'Boa tarde'
                       : 'Boa noite';
        texto = `${saudacao}, senhor Alessandro. No que eu te ajudo hoje?`;
      } else {
        texto = 'Estou ouvindo, senhor.';
      }

      const tts = await openai.audio.speech.create({ model: 'tts-1', voice: 'onyx', input: texto });
      const audio = Buffer.from(await tts.arrayBuffer()).toString('base64');
      return res.json({ texto, audio });
    }

    console.log(`[VOCÊ] ${mensagem}`);
    historico.push({ role: 'user', content: mensagem });

    // Loop de ferramentas com Claude
    let messages = [...historico.slice(-20)];

    let response = await claude.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages
    });

    // Loop enquanto Claude quiser usar ferramentas
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      // Adiciona resposta do Claude ao histórico de messages
      messages.push({ role: 'assistant', content: response.content });

      // Executa as ferramentas
      const toolResults = [];
      for (const toolBlock of toolUseBlocks) {
        const resultado = await executarFerramenta(toolBlock.name, toolBlock.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: String(resultado)
        });
      }

      messages.push({ role: 'user', content: toolResults });

      // Chama Claude novamente com os resultados
      response = await claude.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages
      });
    }

    // Extrai o texto final
    const textBlock = response.content.find(b => b.type === 'text');
    const texto = textBlock ? textBlock.text : '';

    historico.push({ role: 'assistant', content: texto });
    console.log(`[KADOSH] ${texto}`);

    // TTS — voz do Kadosh (ainda usando OpenAI para áudio)
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: texto.substring(0, 4096)
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString('base64');

    res.json({ texto, audio: audioBase64 });
  } catch (e) {
    console.error('[ERRO]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ─── LIMPAR HISTÓRICO ─────────────────────────────────────────────────────────

app.post('/limpar', (req, res) => {
  historico = [];
  res.json({ ok: true });
});

// ─── INICIAR ──────────────────────────────────────────────────────────────────

const PORT = 3333;
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════╗');
  console.log('║      KADOSH  está ativo        ║');
  console.log(`║   http://localhost:${PORT}          ║`);
  console.log('╚════════════════════════════════╝');
  console.log('');
  console.log('Abra http://localhost:3333 no navegador');
  console.log('Diga "hope" para ativar');
  console.log('Diga "cessa kadosh" para pausar');
  console.log('');
});
