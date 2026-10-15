// Núcleo da plataforma: estado, carregamento dos dados, casca (menu lateral), login, modais e eventos.
// As telas de cada perfil ficam em coachee.js, coach.js e admin.js e se registram em VIEWS.

const VIEWS = { coachee: {}, coach: {}, admin: {} };
const ACOES = {};   // clique em [data-acao]
const FORMS = {};   // envio de <form id>
const MUDA = {};    // change em campos com [data-muda]

// S = estado da tela; C = dados carregados do banco.
const S = { u: null, modo: null, pronto: false, view: 'painel', p: null, aba: 'geral', busca: '', filtro: 'todos', buscaMat: '', resp: {}, simAreas: false, emailLogin: '' };
const C = { cfg: {}, trilhas: {}, itens: {}, L: [], mensagens: [], perguntas: [], encontros: [], materiais: [], fornecedores: [] };

/* ===================== Utilidades ===================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const br = iso => { if (!iso) return '—'; const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const brc = iso => { if (!iso) return '—'; const [, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}`; };
const caixaData = iso => { const [, m, d] = iso.split('-'); return `<div class="data"><b class="num">${d}</b><small>${MES[+m - 1]}</small></div>`; };
const iniciais = n => String(n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const hoje = () => Regras.hoje();
const hojeExtenso = () => { const d = new Date(); return `${SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const urlSegura = u => /^(https?:|data:(image|audio|application\/pdf))/i.test(String(u || '')) ? u : '';
const primeiroNome = n => String(n || '').split(' ')[0];

// Avatar: foto quando houver, senão as iniciais (RF-05).
function av(u, cls = '', estilo = '') {
  const f = u && urlSegura(u.foto);
  return f ? `<span class="av ${cls}" style="${estilo}background:url('${esc(f)}') center/cover;color:transparent" role="img" aria-label="Foto de ${esc(u.nome)}">${esc(iniciais(u.nome))}</span>`
    : `<span class="av ${cls}" style="${estilo}">${esc(iniciais(u && u.nome))}</span>`;
}

// Vídeo do YouTube ("não listado") tocado dentro da plataforma.
function ytId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
function video(url, legenda, dur) {
  const id = ytId(url);
  if (id) return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1" title="${esc(legenda)}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
  return `<div class="video"><div class="aviso-video"><div class="play" role="img" aria-label="Vídeo" style="margin:0 auto 12px"></div>O vídeo desta aula ainda não foi publicado.</div><div class="rodape"><span>${esc(legenda)}</span>${dur ? `<span class="num">${dur} min</span>` : ''}</div></div>`;
}

// Aviso no topo da tela: verde (ok), amarelo (algo a corrigir) ou vermelho (erro).
// Com uma janela aberta, o aviso vai para dentro dela, senão ficaria escondido atrás.
const PEDE_CORRECAO = /^(Informe|Escreva|Preencha|Dê |Faltam|Use |Cole|Diga|Descreva|Escolha|Marque|Você não pode|Coachee não pode|Os links|Configure|Pare|Cada ação|Cadastre|Responda|Conte|Este navegador|No modo demonstração)/;
function toast(msg, tipo, detalhe = '') {
  const t = $('#toast'); tipo = tipo || (PEDE_CORRECAO.test(msg) ? 'aviso' : 'ok');
  const m = $('#modal'); (m.open ? m : document.body).appendChild(t);
  t.className = `toast ${tipo}`; t.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  t.innerHTML = `<span class="ic" aria-hidden="true">${tipo === 'ok' ? '✓' : '!'}</span><div class="tx-aviso"><b>${esc(msg)}</b>${detalhe ? `<div class="det">${detalhe}</div>` : ''}</div><button type="button" class="x" aria-label="Fechar aviso">×</button>`;
  t.querySelector('button').onclick = () => t.classList.remove('on');
  requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), tipo === 'ok' && !detalhe ? 5000 : 9000);
}
// Erros do Firebase em inglês viram uma explicação em português.
function mensagemErro(e) {
  const cod = (e && e.code) || ''; const msg = (e && e.message) || '';
  if (cod === 'permission-denied' || /insufficient permissions/i.test(msg))
    return 'Sem permissão para esta ação no banco de dados. Se a plataforma acabou de ganhar uma função nova, o administrador precisa publicar as regras atualizadas do Firebase (Firestore → Regras → Publicar).';
  if (cod === 'unavailable' || /offline|network/i.test(msg)) return 'Sem conexão com o banco de dados. Confira a internet e tente de novo.';
  return msg || 'Algo deu errado. Tente de novo.';
}
const falha = e => { console.error(e); toast(mensagemErro(e), 'erro'); };
// Ao fechar a janela, o aviso volta para a página e continua visível.
$('#modal').addEventListener('close', () => document.body.appendChild($('#toast')));

// Modal com formulário. aoSalvar pode ser assíncrona; devolver false mantém o modal aberto.
function abrirModal(titulo, corpo, botao, aoSalvar, opcoes = {}) {
  const m = $('#modal');
  m.innerHTML = `<form method="dialog" id="form-modal"><div class="modal-cab"><h2>${titulo}</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></div><div class="modal-corpo">${corpo}</div>${botao ? `<div class="modal-pe">${opcoes.semCancelar ? '' : `<button type="button" class="bt bt-fantasma" data-fechar>${opcoes.cancelar || 'Cancelar'}</button>`}<button class="bt bt-ouro" type="submit">${botao}</button></div>` : ''}</form>`;
  m.querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => m.close());
  m.oncancel = opcoes.obrigatorio ? e => e.preventDefault() : null;
  $('#form-modal').onsubmit = async e => {
    e.preventDefault();
    const bt = m.querySelector('button[type=submit]'); if (bt) bt.disabled = true;
    try { if (await aoSalvar() !== false) m.close(); } catch (er) { falha(er); } finally { if (bt) bt.disabled = false; }
  };
  m.showModal();
}
const confirmar = (titulo, texto, botao, fn) => abrirModal(titulo, `<p style="margin:0">${texto}</p>`, botao, fn);
const valor = id => { const c = document.getElementById(id); return c ? c.value.trim() : ''; };

/* ===================== Áudio guardado no banco ===================== */
// Sem Cloudinary, o áudio da mensagem da semana fica no próprio Firestore, em pedaços de até 700 mil
// caracteres (cada documento aceita até 1 MB). A mensagem guarda a referência "firestore:<id>:<pedaços>".
const AUDIO_FS = 'firestore:';
const AUDIO_MAX = 5e6;
const audiosCache = {};
const blobBase64 = b => new Promise((ok, erro) => { const l = new FileReader(); l.onload = () => ok(String(l.result).split(',')[1]); l.onerror = erro; l.readAsDataURL(b); });
// Grava um arquivo em pedaços (documentos <id>_0, <id>_1…) e devolve quantos pedaços foram usados.
async function guardarPartes(colecao, blob, id, extra = {}) {
  const b64 = await blobBase64(blob); const T = 700000; const n = Math.ceil(b64.length / T);
  for (let i = 0; i < n; i++) await col(colecao).salvar(`${id}_${i}`, { ...extra, i, n, tipo: blob.type || 'application/octet-stream', parte: b64.slice(i * T, (i + 1) * T) });
  return n;
}
// Junta os pedaços de volta em um endereço local (blob:) que o navegador abre.
async function montarPartes(colecao, id, n, erro) {
  const partes = await Promise.all(Array.from({ length: +n }, (_, i) => col(colecao).obter(`${id}_${i}`)));
  if (partes.some(p => !p)) throw new Error(erro);
  const bin = atob(partes.map(p => p.parte).join('')); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: partes[0].tipo }));
}
async function guardarAudio(blob, id) {
  const n = await guardarPartes('audios', blob.type ? blob : new Blob([blob], { type: 'audio/webm' }), id, { msgId: id });
  return `${AUDIO_FS}${id}:${n}`;
}
// Player da mensagem: link direto (Cloudinary ou demonstração) ou botão que monta o áudio guardado no banco.
function playerAudio(m) {
  const a = String(m.audio || '');
  if (a.startsWith(AUDIO_FS)) return `<button class="bt bt-linha" data-acao="ouvir-fs" data-ref="${esc(a)}" data-msg="${esc(m.id)}">▶ Ouvir a mensagem${m.dur ? ` · ${esc(m.dur)}` : ''}</button>`;
  const u = urlSegura(a);
  return u ? `<audio controls preload="none" src="${esc(u)}" data-msg="${esc(m.id)}"></audio>` : '';
}
ACOES['ouvir-fs'] = async t => {
  const [id, n] = t.dataset.ref.slice(AUDIO_FS.length).split(':');
  t.disabled = true; t.textContent = 'Carregando o áudio…';
  try {
    if (!audiosCache[id]) audiosCache[id] = await montarPartes('audios', id, n, 'O áudio desta mensagem não foi encontrado.');
    const a = document.createElement('audio'); a.controls = true; a.src = audiosCache[id]; a.dataset.msg = t.dataset.msg;
    if (S.modo === 'coachee' && typeof marcarOuvida === 'function') a.onplay = () => marcarOuvida(t.dataset.msg);
    t.replaceWith(a); a.play().catch(() => {});
  } catch (e) { t.disabled = false; t.textContent = '▶ Ouvir a mensagem'; throw e; }
};

/* ===================== Arquivos guardados no banco ===================== */
// Sem Cloudinary, PDFs e outros arquivos da biblioteca ficam no Firestore (coleção "arquivos"), em pedaços,
// com o mesmo limite de 5 MB do áudio. O material guarda a referência "arquivo:<id>:<pedaços>:<nome>".
const ARQ_FS = 'arquivo:';
const ARQ_MAX = 5e6;
const arquivosCache = {};
const ehArquivoFs = u => String(u || '').startsWith(ARQ_FS);
const lerRefArquivo = ref => { const [id, n, ...nome] = String(ref).slice(ARQ_FS.length).split(':'); return { id, n: +n, nome: decodeURIComponent(nome.join(':') || 'arquivo') }; };
async function guardarArquivo(arquivo) {
  if (arquivo.size > ARQ_MAX) throw new Error(`Este arquivo tem ${(arquivo.size / 1e6).toFixed(1).replace('.', ',')} MB e o limite é 5 MB. Para arquivos maiores, coloque o arquivo no Google Drive (compartilhado com "qualquer pessoa com o link") e cole o link no campo.`);
  const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const n = await guardarPartes('arquivos', arquivo, id, { arqId: id, nome: arquivo.name, dono: S.u.id });
  return `${ARQ_FS}${id}:${n}:${encodeURIComponent(arquivo.name)}`;
}
async function apagarArquivo(ref) {
  if (!ehArquivoFs(ref)) return; const { id, n } = lerRefArquivo(ref);
  await Promise.all(Array.from({ length: n }, (_, i) => col('arquivos').remover(`${id}_${i}`))).catch(() => {});
}
// Botão ou link para abrir um material: arquivo guardado no banco ou link comum (Drive, Cloudinary…).
function botaoMaterial(m, rotulo = 'Abrir') {
  if (ehArquivoFs(m.url)) return `<button class="bt bt-fantasma bt-sm" data-acao="abrir-arquivo" data-ref="${esc(m.url)}">${rotulo}</button>`;
  const u = urlSegura(m.url); return u ? `<a class="bt bt-fantasma bt-sm" href="${esc(u)}" target="_blank" rel="noopener">${rotulo}</a>` : '';
}
ACOES['abrir-arquivo'] = async t => {
  const { id, n, nome } = lerRefArquivo(t.dataset.ref);
  // A aba é aberta já no clique (antes de baixar), senão o navegador a bloqueia como pop-up.
  const aba = window.open('', '_blank'); if (aba) aba.document.write('<p style="font-family:sans-serif">Abrindo o arquivo…</p>');
  const txt = t.textContent; t.disabled = true; t.textContent = 'Carregando…';
  try {
    if (!arquivosCache[id]) arquivosCache[id] = await montarPartes('arquivos', id, n, 'Este arquivo não foi encontrado. Peça ao coach para enviá-lo de novo.');
    if (aba) aba.location.href = arquivosCache[id];
    else { const a = document.createElement('a'); a.href = arquivosCache[id]; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }
  } catch (e) { if (aba) aba.close(); throw e; } finally { t.disabled = false; t.textContent = txt; }
};

/* ===================== Encontros ===================== */
// Próximos primeiro, do mais próximo para o mais distante; depois os que já aconteceram, do mais recente para o mais antigo.
function listaEncontros(item, vazio = 'Nenhum encontro ainda.') {
  const h = hoje(); const prox = C.encontros.filter(e => e.data >= h); const pass = C.encontros.filter(e => e.data < h).reverse();
  if (!prox.length && !pass.length) return `<div class="vazio">${vazio}</div>`;
  const titulo = t => `<div class="rotulinho" style="margin:14px 0 2px">${t}</div>`;
  return (prox.length ? titulo('Próximos') + prox.map(item).join('') : '') + (pass.length ? titulo('Já aconteceram') + pass.map(item).join('') : '');
}

/* ===================== Carregamento ===================== */
const col = n => Dados.col(n);
const porId = (lista) => Object.fromEntries(lista.map(x => [x.id, x]));
const recente = (a, b) => (b.data || '').localeCompare(a.data || '');

async function carregarConteudo() {
  const [cfg, cert, trilhas, itens, mensagens, perguntas, encontros, materiais, fornecedores] = await Promise.all([
    col('config').obter('programa'), col('config').obter('certificado'), col('trilhas').listar(), col('itens').listar(), col('mensagens').listar(),
    col('perguntas').listar(), col('encontros').listar(), col('materiais').listar(), col('fornecedores').listar()]);
  C.cfg = cfg || {}; C.cert = cert || {};
  C.trilhas = porId(trilhas); C.itens = porId(itens);
  // Liderança (contratada à parte): marcada aqui também para bancos instalados antes dessa regra.
  const tp = C.trilhas[CONTEUDO.TRILHA_A_PARTE];
  if (tp) { tp.aParte = true; tp.liberada = !!(S.u && S.u.lideranca); }
  C.L = Regras.lista(C.trilhas, C.itens);
  C.mensagens = mensagens.sort(recente); C.perguntas = perguntas.sort(recente);
  C.encontros = encontros.sort((a, b) => a.data.localeCompare(b.data));
  C.materiais = materiais.sort((a, b) => a.titulo.localeCompare(b.titulo)); C.fornecedores = fornecedores;
}

// Tudo o que é de um coachee (usado pelo próprio coachee e pelo coach responsável).
// Leitura de um recurso novo: se as regras do banco ainda não foram atualizadas (permissão negada),
// a plataforma segue funcionando sem ele, em vez de travar o carregamento inteiro.
const opcional = (promessa, padrao = []) => promessa.catch(e => { console.warn('Leitura opcional indisponível:', e && e.message); return padrao; });

async function carregarCoachee(id) {
  const q = n => col(n).listar('coacheeId', id);
  const [progresso, acoes, rotinas, assessments, vitorias, paradas, comentarios, respostas, insig, relatorios, avisos] = await Promise.all([
    q('progresso'), q('acoes'), q('rotinas'), q('assessments'), q('vitorias'), q('paradas'), q('comentarios'), q('respostas'), col('insignias').obter(id), opcional(q('relatorios')), opcional(q('avisos'))]);
  return {
    progresso: Object.fromEntries(progresso.map(p => [p.itemId, p])),
    acoes: acoes.sort((a, b) => (a.ok - b.ok) || (a.prazo || '').localeCompare(b.prazo || '')),
    rotinas, assessments, vitorias,
    paradas: Object.fromEntries(paradas.map(p => [p.n, p])),
    comentarios: Object.fromEntries(comentarios.map(c => [c.alvo, c])),
    respostas: Object.fromEntries(respostas.map(r => [r.perguntaId, r])),
    insignias: insig || { ganhas: {} },
    // PDFs dos resultados dos assessments, enviados pelo coach (o mais recente primeiro).
    // Lembretes já enviados ao coachee (ex.: parada_1), para não repetir o e-mail.
    avisos: Object.fromEntries(avisos.map(a => [`${a.tipo}_${a.n}`, a])),
    relatorios: relatorios.sort((a, b) => (b.criado || b.data || '').localeCompare(a.criado || a.data || ''))
  };
}

// Perfis da pessoa: o principal (papel) e, para coach marcado, também o de administrador. Coachee nunca é administrador.
const modos = u => (u.admin && u.papel === 'coach') ? ['coach', 'admin'] : [u.papel];
const lerModo = u => { try { const m = localStorage.getItem('modo-' + u.id); return modos(u).includes(m) ? m : u.papel; } catch (e) { return u.papel; } };
const gravarModo = (u, m) => { try { localStorage.setItem('modo-' + u.id, m); } catch (e) { /* só nesta visita */ } };

async function carregar() {
  await carregarConteudo();
  const u = S.u; const modo = S.modo || u.papel;
  if (modo === 'coachee') {
    C.D = await carregarCoachee(u.id);
    C.ouvidas = new Set((await col('ouvidas').listar('coacheeId', u.id)).map(o => o.msgId));
    C.pedidos = (await col('pedidos').listar('coacheeId', u.id)).sort(recente);
    C.inscrito = !!(await col('inscricoes').obter(u.id));
    C.horarios = u.coachId ? await opcional(col('horarios').listar('coachId', u.coachId)) : [];
    C.perfilCoach = u.coachId ? await opcional(col('coaches').obter(u.coachId), null) : null;
  }
  if (modo === 'coach') { await carregarCarteira(); C.horarios = await opcional(col('horarios').listar('coachId', u.id)); C.perfilCoach = await opcional(col('coaches').obter(u.id), null);
    setTimeout(() => avisarParadasAbertas().catch(e => console.warn('Lembrete da parada:', e && e.message)), 0); }
  if (modo === 'admin') {
    const [usuarios, vendas, pedidos] = await Promise.all([col('usuarios').listar(), col('vendas').listar(), col('pedidos').listar()]);
    C.usuarios = usuarios; C.vendas = vendas.sort(recente); C.pedidos = pedidos.sort(recente);
    C.coaches = await opcional(col('coaches').listar()); C.perfilCoach = null;
  }
}

async function carregarCarteira() {
  const pessoas = (await col('usuarios').listar('coachId', S.u.id)).filter(p => p.papel === 'coachee' && p.ativo !== false);
  C.carteira = await Promise.all(pessoas.map(async p => ({ u: p, D: await carregarCoachee(p.id) })));
  C.carteira.sort((a, b) => a.u.nome.localeCompare(b.u.nome));
  const ids = new Set(pessoas.map(p => p.id));
  const porCoachee = async n => (await Promise.all(pessoas.map(p => col(n).listar('coacheeId', p.id)))).flat();
  const [pedidos, ouvidas] = await Promise.all([porCoachee('pedidos'), col('ouvidas').listar()]);
  C.pedidos = pedidos.sort(recente);
  C.ouvidasCarteira = ouvidas.filter(o => ids.has(o.coacheeId));
}
const daCarteira = id => (C.carteira || []).find(c => c.u.id === id);

/* ===================== Navegação e casca ===================== */
const NAV = {
  coachee: [['painel', 'Hoje'], ['jornada', 'Minha jornada'], ['quem', 'Quem eu sou'], ['evolucao', 'Minha evolução'], ['pratica', 'Na prática'], ['sessao', 'Sessão 1:1'], ['comunidade', 'Comunidade']],
  coach: [['painel', 'Hoje'], ['pessoas', 'Minhas pessoas'], ['encontros', 'Encontros em grupo'], ['ensino', 'O que eu ensino'], ['agenda', 'Minha agenda'], ['certificado', 'Certificado'], ['meus', 'Meus ajustes']],
  admin: [['painel', 'Como estamos'], ['pessoas', 'Pessoas'], ['planos', 'Planos'], ['entradas', 'Novas entradas'], ['ajustes', 'Ajustes']]
};
const ATIVO = { coachee: { item: 'jornada', questionario: 'quem', certificado: 'jornada', relatorio: 'quem' }, coach: { ficha: 'pessoas' }, admin: {} };
const IC = {
  painel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  jornada: '<path d="M4 5h16v11H4zM8 20h8M12 16v4"/><path d="M10 8.5v4l3.5-2z"/>',
  pratica: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  encontros: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  quem: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  comunidade: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
  ensino: '<path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"/>',
  planos: '<path d="M3 7h18v12H3zM3 11h18M7 15h4"/>',
  entradas: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  evolucao: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  certificado: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7.5 21l4.5-2.5 4.5 2.5-1.5-7.5"/>',
  sessao: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2"/>',
  agenda: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  meus: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const PAPEL = { coachee: 'Coachee · Plano Master', coach: 'Coach', admin: 'Administrador' };
const nomePrograma = () => C.cfg.nome || 'Programa de Alta Performance';
// Ajustes de cada coach (coleção coaches): grupo, sala, DISC, sessão 1:1, nome de exibição e apresentação.
// O que o coach não preencher vem do padrão do programa (Administrador → Ajustes e Planos).
const doCoach = k => (C.perfilCoach && C.perfilCoach[k]) || C.cfg[k] || '';
const botaoWhats = (cls = '') => doCoach('whatsapp') ? `<a class="bt bt-wa ${cls}" href="${esc(urlSegura(doCoach('whatsapp')))}" target="_blank" rel="noopener">Falar no Grupo Mentoria</a>` : '';
// Acesso discreto ao grupo no menu (o botão de destaque fica no cartão Grupo Mentoria, em Comunidade).
const IC_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>';
// Sempre visível para o coachee; sem o link cadastrado em Ajustes, avisa em vez de abrir.
const linkGrupo = () => urlSegura(doCoach('whatsapp')) ? `<a class="nav-grupo" href="${esc(urlSegura(doCoach('whatsapp')))}" target="_blank" rel="noopener">${IC_WA}Grupo Mentoria</a>`
  : `<button type="button" class="nav-grupo" data-acao="grupo-sem-link">${IC_WA}Grupo Mentoria</button>`;
ACOES['grupo-sem-link'] = () => toast('O link do Grupo Mentoria ainda não foi cadastrado. Avise o seu coach.', 'aviso');

// Celular: menu fixo embaixo com 4 telas principais e "Mais" (o resto, grupo, troca de perfil e sair).
const CELULAR = '(max-width:860px)';
const celular = () => window.matchMedia(CELULAR).matches;
window.matchMedia(CELULAR).addEventListener('change', () => { if (S.pronto && S.u) render(); });
const PRINCIPAIS = { coachee: ['painel', 'jornada', 'pratica', 'comunidade'], coach: ['painel', 'pessoas', 'encontros', 'ensino'], admin: ['painel', 'pessoas', 'planos', 'entradas'] };
const CURTO = { 'Minha jornada': 'Jornada', 'Na prática': 'Prática', 'Minhas pessoas': 'Pessoas', 'Encontros em grupo': 'Encontros', 'O que eu ensino': 'Ensino', 'Como estamos': 'Visão geral', 'Novas entradas': 'Entradas' };
const IC_MAIS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
function navBaixo(papel, ativo, alertas) {
  const prin = PRINCIPAIS[papel]; const nav = NAV[papel].filter(([k]) => prin.includes(k));
  const noMais = !prin.includes(ativo);
  return `<nav class="nav-baixo" aria-label="Menu principal">${nav.map(([k, l]) => `<button data-ir="${k}" ${ativo === k ? 'aria-current="page"' : ''}>${svg(k)}<span>${CURTO[l] || l}</span>${k === 'pratica' && alertas ? `<i class="cont num">${alertas}</i>` : ''}</button>`).join('')}
    <button data-acao="menu-mais" ${noMais ? 'aria-current="page"' : ''} aria-haspopup="dialog">${IC_MAIS}<span>Mais</span></button></nav>`;
}
const NOME_MODO = { coachee: 'Coachee', coach: 'Coach', admin: 'Administrador' };
// Quem tem dois perfis (coach e administrador) troca pelo menu do usuário.
const botoesTroca = (cls = '') => modos(S.u).filter(m => m !== S.modo).map(m => `<button class="${cls}" data-acao="trocar-modo" data-modo="${m}">Trocar para ${NOME_MODO[m]}</button>`).join('');
ACOES['menu-mais'] = () => {
  const papel = S.modo || S.u.papel; const resto = NAV[papel].filter(([k]) => !PRINCIPAIS[papel].includes(k));
  const m = $('#modal');
  m.innerHTML = `<div class="modal-cab"><h2>Mais</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></div>
    <div class="modal-corpo menu-mais">
      <div class="eu-mais">${av(S.u)}<div><b>${esc(S.u.nome)}</b><small>${PAPEL[papel]}</small></div></div>
      ${resto.map(([k, l]) => `<button class="item-mais" data-acao="ir-mais" data-v="${k}">${svg(k)}${l}</button>`).join('')}
      ${papel === 'coachee' ? linkGrupo() : ''}
      ${botoesTroca('item-mais troca')}
      <button class="item-mais" data-acao="sair">Sair</button>
    </div>`;
  m.querySelector('[data-fechar]').onclick = () => m.close(); m.showModal();
};
ACOES['ir-mais'] = t => { $('#modal').close(); ir(t.dataset.v); };

function ir(view, p = null) {
  S.view = view; S.p = p; S.busca = ''; S.filtro = 'todos';
  if (view === 'ficha') S.aba = 'geral';
  if (view === 'questionario') S.resp = {};
  render(); window.scrollTo(0, 0);
}

function render() {
  const r = $('#raiz');
  if (!S.pronto) { r.innerHTML = '<div class="carregando">Carregando…</div>'; return; }
  if (!S.u) { r.innerHTML = telaLogin(); return; }
  const bloqueio = telaBloqueio(); if (bloqueio) { r.innerHTML = bloqueio; return; }
  const papel = S.modo || S.u.papel; const nav = NAV[papel];
  const view = VIEWS[papel][S.view] ? S.view : 'painel';
  const ativo = ATIVO[papel][view] || view;
  let conteudo;
  try { conteudo = VIEWS[papel][view](); } catch (e) { console.error(e); conteudo = `<div class="card"><b>Não foi possível abrir esta tela.</b><p class="mu">${esc(e.message)}</p></div>`; }
  const alertas = papel === 'coachee' ? C.D.acoes.filter(a => Regras.atrasada(a, hoje())).length : 0;
  const cel = celular(); const vindoDoLogin = !r.querySelector('.app');
  r.innerHTML = `
  <div class="app">
    <aside class="lado">
      <div class="marca"><small>${esc(nomePrograma().split(' ').slice(0, -2).join(' ') || 'Programa de')}</small><b>${esc(nomePrograma().split(' ').slice(-2).join(' '))}</b></div>
      ${cel ? '' : `<nav class="nav" aria-label="Menu principal">
        ${nav.map(([k, l]) => `<button data-ir="${k}" ${ativo === k ? 'aria-current="page"' : ''}>${svg(k)}${l}${k === 'pratica' && alertas ? `<span class="cont num">${alertas}</span>` : ''}</button>`).join('')}
      </nav>`}
      ${papel === 'coachee' && !cel ? `<div class="atalhos">${linkGrupo()}</div>` : ''}
      ${cel ? `<div class="troca-cel">${botoesTroca('chip-troca')}</div>` : `<div class="eu">${av(S.u)}<div><b>${esc(S.u.nome)}</b><small>${PAPEL[papel]}</small>${botoesTroca('troca-eu')}</div><button data-acao="sair" title="Sair">Sair</button></div>`}
    </aside>
    <main class="palco">
      ${Dados.demo ? faixaDemo() : ''}
      ${conteudo}
    </main>
    ${cel ? navBaixo(papel, ativo, alertas) : ''}
  </div>`;
  if (vindoDoLogin) window.scrollTo(0, 0);
  if (papel === 'coachee') posRenderCoachee();
}

function faixaDemo() {
  return `<div class="faixa-demo nao-imprimir"><span>Modo demonstração: dados de exemplo guardados só neste navegador. Entrar como:</span>
    <div class="trocar">${[['ana@demo.com', 'Coachee'], ['vinicius@demo.com', 'Coach'], ['admin@demo.com', 'Administrador']].map(([e, l]) => `<button data-acao="demo-entrar" data-email="${e}" aria-pressed="${S.u && S.u.email === e}">${l}</button>`).join('')}<button data-acao="demo-reiniciar">Reiniciar dados</button></div></div>`;
}

/* ===================== Login e bloqueios ===================== */
function telaLogin() {
  const demo = Dados.demo;
  return `
  <div class="login">
    <section class="login-arte">
      <div>
        <div class="selo"><i></i>Desenvolvimento de carreira</div>
        <h1>${esc(nomePrograma().split(' ').slice(0, -2).join(' ') || 'Programa de')}<br><em>${esc(nomePrograma().split(' ').slice(-2).join(' '))}</em></h1>
        <p>Para quem quer crescer na carreira: uma jornada guiada com aulas, exercícios e mentorias em grupo, do autoconhecimento à liderança.</p>
        <div class="trilha"><span><b>I</b>Autoconhecimento</span><span><b>II</b>Planejamento estratégico</span><span><b>III</b>Competências comportamentais</span><span><b>IV</b>Liderança</span></div>
      </div>
      <p style="font-size:12px;color:var(--faint);position:relative;z-index:1">Mentoria em grupo mensal · Grupo exclusivo no WhatsApp</p>
    </section>
    <section class="login-form">
      <form class="login-box" id="form-login" novalidate>
        <h2>Entrar</h2>
        <div class="sub">Use o e-mail cadastrado na sua compra.</div>
        ${demo ? `<span class="rotulo">Demonstração: escolha um perfil</span>
        <div class="perfis" role="group" aria-label="Perfis de demonstração">
          ${[['ana@demo.com', 'AS', 'Ana Souza', 'Coachee · assiste às aulas e faz as atividades', ''], ['vinicius@demo.com', 'V', 'Vinicius', 'Coach · acompanha a carteira de coachees', ''], ['admin@demo.com', 'AD', 'Administração', 'Administrador · pessoas, planos e vendas', 'cinza']]
            .map(([e, ini, n, d, c]) => `<button type="button" class="perfil" data-acao="demo-perfil" data-email="${e}" aria-pressed="${S.emailLogin === e}"><span class="av ${c}">${ini}</span><span><b>${n}</b><small>${d}</small></span></button>`).join('')}
        </div>` : ''}
        <label class="rotulo" for="login-email">E-mail</label>
        <input class="campo" id="login-email" type="email" value="${esc(S.emailLogin)}" autocomplete="username" required>
        <label class="rotulo" for="login-senha">Senha</label>
        <input class="campo" id="login-senha" type="password" autocomplete="current-password" ${demo ? 'placeholder="Qualquer senha na demonstração"' : 'required'}>
        <div class="linha-login"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="ck" id="lembrar" checked> Manter conectado</label><a href="#" data-acao="esqueci">Esqueci minha senha</a></div>
        <button class="bt bt-ouro bt-bloco" type="submit">Entrar na plataforma</button>
        <div class="aviso-demo">Primeiro acesso? A senha é criada pelo link do e-mail de boas-vindas, enviado assim que o pagamento é confirmado.</div>
      </form>
    </section>
  </div>`;
}

function telaBloqueio() {
  const u = S.u;
  const caixa = (titulo, texto, extra = '') => `<div class="bloqueio"><div class="card"><div class="selo" style="justify-content:center"><i></i>${esc(nomePrograma())}<i></i></div><h2 style="font-family:var(--f-display);font-size:30px;font-weight:600;margin:16px 0 8px">${titulo}</h2><p class="mu">${texto}</p>${extra}<div style="margin-top:18px"><button class="bt bt-fantasma" data-acao="sair">Sair</button></div></div></div>`;
  if (u.semCadastro) return caixa('Acesso em preparação', 'Seu login existe, mas o cadastro ainda não foi concluído pela administração. Fale com o programa pelo grupo do WhatsApp.');
  if (u.ativo === false) return caixa('Acesso desativado', 'Seu acesso está desativado. Fale com a administração do programa.');
  // RN-11 / RF-07: ao fim do prazo, convite para renovar; os dados ficam guardados.
  if (S.modo === 'coachee' && u.fim && u.fim < hoje()) {
    const link = urlSegura(C.cfg.pagMaster);
    return caixa('Seu ciclo terminou', `Seu acesso ao plano Master foi até ${br(u.fim)}. Tudo o que você construiu continua guardado: renove para seguir de onde parou.`,
      `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px">${link ? `<a class="bt bt-ouro" href="${esc(link)}" target="_blank" rel="noopener">Renovar o plano</a>` : ''}${botaoWhats()}</div>`);
  }
  return '';
}

// RF-06: aceite do termo de uso e do aviso de privacidade no primeiro acesso.
function pedirTermos() {
  const T = CONTEUDO.TERMOS;
  if (!S.u || S.modo !== 'coachee' || (S.u.termos && S.u.termos.versao === T.versao)) return;
  abrirModal('Antes de começar', `<div class="termos">${T.html}</div>
    <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" class="ck" id="aceite"> <span>Li e aceito o termo de uso e o aviso de privacidade.</span></label>`,
  'Começar minha jornada', async () => {
    if (!$('#aceite').checked) { toast('Marque o aceite para continuar.'); return false; }
    const termos = { versao: T.versao, data: new Date().toISOString() };
    await col('usuarios').salvar(S.u.id, { termos }); S.u.termos = termos;
  }, { obrigatorio: true, cancelar: 'Agora não' });
  $('#modal').querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => ACOES.sair());
}

async function iniciarSessao(u) {
  S.u = u; S.modo = u ? lerModo(u) : null; S.pronto = false; render();
  try {
    if (u && !u.semCadastro) {
      await carregar();
      if (u.ultimoAcesso !== hoje()) { await col('usuarios').salvar(u.id, { ultimoAcesso: hoje() }); u.ultimoAcesso = hoje(); }
    } else await carregarConteudo().catch(() => {});
  } catch (e) { falha(e); }
  S.view = 'painel'; S.p = null; S.pronto = true; render();
  pedirTermos();
}

/* ===================== Ações comuns ===================== */
Object.assign(ACOES, {
  async sair() { $('#modal').open && $('#modal').close(); await Dados.sair(); },
  async 'trocar-modo'(t) {
    if ($('#modal').open) $('#modal').close();
    S.modo = t.dataset.modo; gravarModo(S.u, S.modo); S.pronto = false; render();
    try { await carregar(); } catch (e) { falha(e); }
    S.view = 'painel'; S.p = null; S.pronto = true; render(); window.scrollTo(0, 0); pedirTermos();
  },
  'demo-perfil'(t) { S.emailLogin = t.dataset.email; render(); },
  async 'demo-entrar'(t) { await Dados.sair(); S.emailLogin = t.dataset.email; await Dados.entrar(t.dataset.email); },
  'demo-reiniciar'() { confirmar('Reiniciar a demonstração', 'Os dados de exemplo voltam ao estado inicial neste navegador.', 'Reiniciar', () => { Dados.reiniciar(); }); },
  async esqueci(t, e) {
    e.preventDefault(); const email = valor('login-email');
    if (!email) { toast('Escreva o seu e-mail no campo acima.'); $('#login-email').focus(); return; }
    await Dados.redefinirSenha(email); toast('Se o e-mail estiver cadastrado, o link para criar uma nova senha chega em instantes.');
  }
});

FORMS['form-login'] = async () => {
  const email = valor('login-email'); S.emailLogin = email;
  if (!email) { toast('Informe o seu e-mail.'); return; }
  await Dados.entrar(email, $('#login-senha').value, $('#lembrar').checked);
};

/* ===================== Eventos ===================== */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-ir],[data-acao],[data-aba]');
  if (!t || t.disabled) return;
  if (t.dataset.aba) { S.aba = t.dataset.aba; render(); return; }
  if (t.dataset.ir) { e.preventDefault(); ir(t.dataset.ir, t.dataset.p || null); return; }
  const fn = ACOES[t.dataset.acao];
  if (fn) { try { await fn(t, e); } catch (er) { falha(er); } }
});
document.addEventListener('change', async e => {
  const t = e.target; const fn = t.dataset && MUDA[t.dataset.muda];
  if (fn) { try { await fn(t, e); } catch (er) { falha(er); } }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'busca' || t.id === 'busca-mat') {
    S[t.id === 'busca' ? 'busca' : 'buscaMat'] = t.value;
    const pos = t.selectionStart; render(); const n = document.getElementById(t.id); n.focus(); n.setSelectionRange(pos, pos);
  }
});
document.addEventListener('submit', async e => {
  const f = e.target; if (f.id === 'form-modal') return;
  const fn = FORMS[f.id] || (f.dataset.form && FORMS[f.dataset.form]);
  if (!fn) return;
  e.preventDefault();
  const bt = f.querySelector('button[type=submit]'); if (bt) bt.disabled = true;
  try { await fn(f, e); } catch (er) { falha(er); } finally { if (bt && document.body.contains(bt)) bt.disabled = false; }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-ir], .item.clicavel')) { e.preventDefault(); e.target.click(); }
});

window.addEventListener('DOMContentLoaded', () => {
  render();
  Dados.aoMudarSessao(u => { if (u) iniciarSessao(u); else { S.u = null; S.pronto = true; carregarConteudo().catch(() => {}).finally(render); } });
});
