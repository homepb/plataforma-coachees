// Núcleo da plataforma: estado, carregamento dos dados, casca (menu lateral), login, modais e eventos.
// As telas de cada perfil ficam em coachee.js, coach.js e admin.js e se registram em VIEWS.

const VIEWS = { coachee: {}, coach: {}, admin: {} };
const ACOES = {};   // clique em [data-acao]
const FORMS = {};   // envio de <form id>
const MUDA = {};    // change em campos com [data-muda]

// S = estado da tela; C = dados carregados do banco.
const S = { u: null, pronto: false, view: 'painel', p: null, aba: 'geral', busca: '', filtro: 'todos', buscaMat: '', resp: {}, simAreas: false, emailLogin: '' };
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

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }
const falha = e => { console.error(e); toast(e && e.message ? e.message : 'Algo deu errado. Tente de novo.'); };

// Modal com formulário. aoSalvar pode ser assíncrona; devolver false mantém o modal aberto.
function abrirModal(titulo, corpo, botao, aoSalvar, opcoes = {}) {
  const m = $('#modal');
  m.innerHTML = `<form method="dialog" id="form-modal"><div class="modal-cab"><h2>${titulo}</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></div><div class="modal-corpo">${corpo}</div>${botao ? `<div class="modal-pe"><button type="button" class="bt bt-fantasma" data-fechar>${opcoes.cancelar || 'Cancelar'}</button><button class="bt bt-ouro" type="submit">${botao}</button></div>` : ''}</form>`;
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

/* ===================== Carregamento ===================== */
const col = n => Dados.col(n);
const porId = (lista) => Object.fromEntries(lista.map(x => [x.id, x]));
const recente = (a, b) => (b.data || '').localeCompare(a.data || '');

async function carregarConteudo() {
  const [cfg, trilhas, itens, mensagens, perguntas, encontros, materiais, fornecedores] = await Promise.all([
    col('config').obter('programa'), col('trilhas').listar(), col('itens').listar(), col('mensagens').listar(),
    col('perguntas').listar(), col('encontros').listar(), col('materiais').listar(), col('fornecedores').listar()]);
  C.cfg = cfg || {};
  C.trilhas = porId(trilhas); C.itens = porId(itens);
  C.L = Regras.lista(C.trilhas, C.itens);
  C.mensagens = mensagens.sort(recente); C.perguntas = perguntas.sort(recente);
  C.encontros = encontros.sort((a, b) => a.data.localeCompare(b.data));
  C.materiais = materiais.sort((a, b) => a.titulo.localeCompare(b.titulo)); C.fornecedores = fornecedores;
}

// Tudo o que é de um coachee (usado pelo próprio coachee e pelo coach responsável).
async function carregarCoachee(id) {
  const q = n => col(n).listar('coacheeId', id);
  const [progresso, acoes, rotinas, assessments, vitorias, paradas, comentarios, respostas, insig] = await Promise.all([
    q('progresso'), q('acoes'), q('rotinas'), q('assessments'), q('vitorias'), q('paradas'), q('comentarios'), q('respostas'), col('insignias').obter(id)]);
  return {
    progresso: Object.fromEntries(progresso.map(p => [p.itemId, p])),
    acoes: acoes.sort((a, b) => (a.ok - b.ok) || (a.prazo || '').localeCompare(b.prazo || '')),
    rotinas, assessments, vitorias,
    paradas: Object.fromEntries(paradas.map(p => [p.n, p])),
    comentarios: Object.fromEntries(comentarios.map(c => [c.alvo, c])),
    respostas: Object.fromEntries(respostas.map(r => [r.perguntaId, r])),
    insignias: insig || { ganhas: {} }
  };
}

async function carregar() {
  await carregarConteudo();
  const u = S.u;
  if (u.papel === 'coachee') {
    C.D = await carregarCoachee(u.id);
    C.ouvidas = new Set((await col('ouvidas').listar('coacheeId', u.id)).map(o => o.msgId));
    C.pedidos = (await col('pedidos').listar('coacheeId', u.id)).sort(recente);
    C.inscrito = !!(await col('inscricoes').obter(u.id));
  }
  if (u.papel === 'coach') await carregarCarteira();
  if (u.papel === 'admin') {
    const [usuarios, vendas, pedidos] = await Promise.all([col('usuarios').listar(), col('vendas').listar(), col('pedidos').listar()]);
    C.usuarios = usuarios; C.vendas = vendas.sort(recente); C.pedidos = pedidos.sort(recente);
  }
}

async function carregarCarteira() {
  const pessoas = (await col('usuarios').listar('coachId', S.u.id)).filter(p => p.papel === 'coachee');
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
  coachee: [['painel', 'Hoje'], ['jornada', 'Minha jornada'], ['quem', 'Quem eu sou'], ['evolucao', 'Minha evolução'], ['pratica', 'Na prática'], ['comunidade', 'Comunidade']],
  coach: [['painel', 'Hoje'], ['pessoas', 'Minhas pessoas'], ['encontros', 'Encontros em grupo'], ['ensino', 'O que eu ensino']],
  admin: [['painel', 'Como estamos'], ['pessoas', 'Pessoas'], ['coaches', 'Time de coaches'], ['planos', 'Planos'], ['entradas', 'Novas entradas'], ['ajustes', 'Ajustes']]
};
const ATIVO = { coachee: { item: 'jornada', questionario: 'quem', certificado: 'jornada' }, coach: { ficha: 'pessoas' }, admin: {} };
const IC = {
  painel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  jornada: '<path d="M4 5h16v11H4zM8 20h8M12 16v4"/><path d="M10 8.5v4l3.5-2z"/>',
  pratica: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  encontros: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  quem: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  comunidade: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
  ensino: '<path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"/>',
  coaches: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
  planos: '<path d="M3 7h18v12H3zM3 11h18M7 15h4"/>',
  entradas: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  evolucao: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const PAPEL = { coachee: 'Coachee · Plano Master', coach: 'Coach', admin: 'Administrador' };
const nomePrograma = () => C.cfg.nome || 'Programa de Alta Performance';
const botaoWhats = (cls = '') => C.cfg.whatsapp ? `<a class="bt bt-wa ${cls}" href="${esc(urlSegura(C.cfg.whatsapp))}" target="_blank" rel="noopener">Falar no grupo do WhatsApp</a>` : '';

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
  const papel = S.u.papel; const nav = NAV[papel];
  const view = VIEWS[papel][S.view] ? S.view : 'painel';
  const ativo = ATIVO[papel][view] || view;
  let conteudo;
  try { conteudo = VIEWS[papel][view](); } catch (e) { console.error(e); conteudo = `<div class="card"><b>Não foi possível abrir esta tela.</b><p class="mu">${esc(e.message)}</p></div>`; }
  const alertas = papel === 'coachee' ? C.D.acoes.filter(a => Regras.atrasada(a, hoje())).length : 0;
  r.innerHTML = `
  <div class="app">
    <aside class="lado">
      <div class="marca"><small>${esc(nomePrograma().split(' ').slice(0, -2).join(' ') || 'Programa de')}</small><b>${esc(nomePrograma().split(' ').slice(-2).join(' '))}</b></div>
      <nav class="nav" aria-label="Menu principal">
        ${nav.map(([k, l]) => `<button data-ir="${k}" ${ativo === k ? 'aria-current="page"' : ''}>${svg(k)}${l}${k === 'pratica' && alertas ? `<span class="cont num">${alertas}</span>` : ''}</button>`).join('')}
      </nav>
      ${papel === 'coachee' && C.cfg.whatsapp ? `<div class="atalhos">${botaoWhats('bt-sm')}</div>` : ''}
      <div class="eu">${av(S.u)}<div><b>${esc(S.u.nome)}</b><small>${PAPEL[papel]}</small></div><button data-acao="sair" title="Sair">Sair</button></div>
    </aside>
    <main class="palco">
      ${Dados.demo ? faixaDemo() : ''}
      ${conteudo}
    </main>
  </div>`;
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
  if (u.papel === 'coachee' && u.fim && u.fim < hoje()) {
    const link = urlSegura(C.cfg.pagMaster);
    return caixa('Seu ciclo terminou', `Seu acesso ao plano Master foi até ${br(u.fim)}. Tudo o que você construiu continua guardado: renove para seguir de onde parou.`,
      `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px">${link ? `<a class="bt bt-ouro" href="${esc(link)}" target="_blank" rel="noopener">Renovar o plano</a>` : ''}${botaoWhats()}</div>`);
  }
  return '';
}

// RF-06: aceite do termo de uso e do aviso de privacidade no primeiro acesso.
function pedirTermos() {
  const T = CONTEUDO.TERMOS;
  if (!S.u || S.u.papel !== 'coachee' || (S.u.termos && S.u.termos.versao === T.versao)) return;
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
  S.u = u; S.pronto = false; render();
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
