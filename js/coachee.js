// Telas e ações do coachee: Hoje · Minha jornada · Quem eu sou · Minha evolução · Na prática · Comunidade.

const R = Regras;
const P = () => R.paradas(S.u, C.D, hoje());
const nomeCoach = () => S.u.coachNome || 'seu coach';
const proxEncontro = () => C.encontros.find(e => e.data >= hoje()) || null;
const metaAtual = () => R.meta(C.L, C.D);
const lembreteMeta = (txt = 'Sua meta') => { const m = metaAtual(); return m ? `<div class="meta-mini"><span class="rotulinho ouro-tx">${txt}</span><span>${esc(m.meta)}</span></div>` : ''; };
const nomeParada = p => `Parada ${p.n} · ${p.n * 3} meses`;
const LOCK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-label="bloqueado"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

function comentario(alvo) {
  const c = C.D.comentarios[alvo]; if (!c) return '';
  return `<div class="coment">${av({ nome: nomeCoach() }, '', 'width:32px;height:32px;')}<div><div class="rotulinho ouro-tx">Comentário de ${esc(nomeCoach())}</div><div style="margin-top:3px">${esc(c.texto)}</div></div></div>`;
}

/* ---------- gravação: progresso, insígnias e resumo ---------- */
async function salvarProgresso(itemId, dados) {
  const id = `${S.u.id}_${itemId}`; const atual = C.D.progresso[itemId] || { coacheeId: S.u.id, itemId };
  const novo = { ...atual, ...dados, coacheeId: S.u.id, itemId };
  await col('progresso').salvar(id, novo); C.D.progresso[itemId] = novo;
}

// Depois de cada tela: guarda insígnias novas, celebra (uma vez) e atualiza o resumo usado por coach e administrador.
let celebrando = false;
async function posRenderCoachee() {
  document.querySelectorAll('audio[data-msg]').forEach(a => { a.onplay = () => marcarOuvida(a.dataset.msg); });
  const h = hoje(); const ins = R.insignias(C.L, C.D, S.u, h); const novas = ins.filter(i => i.nova);
  if (novas.length && !celebrando) {
    const primeiraVez = !C.D.insignias.id;
    const ganhas = { ...(C.D.insignias.ganhas || {}) }; novas.forEach(i => { ganhas[i.id] = h; });
    C.D.insignias = { id: S.u.id, coacheeId: S.u.id, ganhas };
    col('insignias').salvar(S.u.id, { coacheeId: S.u.id, ganhas }).catch(falha);
    // RN-13: na primeira carga as conquistas antigas são só registradas, sem festa.
    if (!primeiraVez) { celebrando = true; setTimeout(() => celebrar(novas), 400); }
  }
  const prox = R.proximo(C.L, C.D);
  const resumo = { pct: R.pct(C.L, C.D), trilha: prox ? prox.t.n : 'fim', atrasadas: C.D.acoes.filter(a => R.atrasada(a, h)).length, semanas: R.sequencia(C.L, C.D, S.u, h) };
  if (JSON.stringify(resumo) !== JSON.stringify(S.u.resumo || {})) { S.u.resumo = resumo; col('usuarios').salvar(S.u.id, { resumo }).catch(falha); }
}

function celebrar(novas) {
  const trilha = novas.find(i => CONTEUDO.TRILHA_FEITA[i.id]);
  const [tit, txt] = trilha ? CONTEUDO.TRILHA_FEITA[trilha.id] : [novas[0].t, novas[0].d + '.'];
  const g = (trilha || novas[0]).g; const outras = novas.filter(i => i !== (trilha || novas[0]));
  const m = $('#modal');
  m.innerHTML = `<div class="celebra"><div class="raios">${Array.from({ length: 12 }, (_, k) => `<i style="--r:${k * 30}deg"></i>`).join('')}</div>
    <div class="medalha">${esc(g)}</div><div class="rotulinho ouro-tx">${trilha ? 'Trilha concluída' : 'Nova insígnia'}</div>
    <h2>${esc(tit)}</h2><p>${esc(txt)}</p>
    ${outras.length ? `<p style="margin-top:-10px">Você também ganhou: ${outras.map(i => `<b class="ouro-tx">${esc(i.t)}</b>`).join(', ')}.</p>` : ''}
    <button class="bt bt-ouro" data-fechar autofocus>Continuar</button></div>`;
  m.querySelector('[data-fechar]').onclick = () => m.close();
  m.onclose = () => { celebrando = false; m.onclose = null; };
  m.showModal();
}

async function marcarOuvida(msgId) {
  if (C.ouvidas.has(msgId)) return; C.ouvidas.add(msgId);
  await col('ouvidas').salvar(`${msgId}_${S.u.id}`, { msgId, coacheeId: S.u.id, data: hoje() });
}

/* ---------- mapa da jornada (RF-14) ---------- */
function mapa() {
  const L = C.L, D = C.D; const a = R.proximo(L, D); const feitos = L.filter(i => R.feito(D, i.id)).length;
  const trilhas = Object.values(C.trilhas).sort((x, y) => x.ordem - y.ordem);
  return `<div class="card" style="margin-bottom:16px">
    <div class="mapa-wrap"><div class="mapa" role="img" aria-label="Mapa da jornada: ${feitos} de ${L.length} itens concluídos${a ? `, você está em ${esc(a.titulo)}` : ''}">
      ${trilhas.map(t => { const its = L.filter(i => i.t.id === t.id); if (!its.length) return ''; const f = its.filter(i => R.feito(D, i.id)).length; const st = R.statusTrilha(L, D, t.id);
        return `<div class="seg ${st}" style="flex:${its.length} 1 0">
          <div class="trilho" style="--p:${st === 'feito' ? 100 : Math.round((f + (st === 'atual' ? .5 : 0)) / its.length * 100)}%">${its.map(it => { const aqui = a && a.id === it.id;
            return `<span class="pt ${R.feito(D, it.id) ? 'ok' : aqui ? 'agora' : ''}">${aqui ? `<span class="eu-mapa">${av(S.u)}</span>` : ''}</span>`; }).join('')}</div>
          <div class="rot"><b>Trilha ${esc(t.n)}</b><small>${esc(t.titulo)}</small></div></div>`; }).join('')}
      <div class="seg-fim"><div class="trilho"><span class="pt fim ${a ? '' : 'ok'}">★</span></div><div class="rot"><b>Certificado</b></div></div>
    </div></div>
    <div class="mapa-leg">${a ? `<span>Você está aqui: <b class="ouro-tx">Trilha ${esc(a.t.n)} · ${esc(a.titulo)}</b></span><span class="mu num">${feitos} de ${L.length} · faltam ${L.length - feitos} para o certificado</span>` : '<b class="ouro-tx">Jornada completa. Parabéns!</b>'}</div>
  </div>`;
}

function mensagemSemana() {
  const m = C.mensagens[0];
  if (!m) return `<div class="card"><h3>Mensagem da semana</h3><p class="mu" style="margin:0">A primeira mensagem de ${esc(nomeCoach())} chega em breve.</p></div>`;
  const audio = urlSegura(m.audio);
  return `<div class="card"><h3>Mensagem da semana de ${esc(nomeCoach())} <span class="mu acao num" style="font-size:12px;font-weight:500">para toda a turma · ${brc(m.data)}</span></h3>
    ${audio ? `<audio controls preload="none" src="${esc(audio)}" data-msg="${esc(m.id)}"></audio>` : '<p class="mu" style="margin:0;font-size:12.5px">Áudio ainda não anexado.</p>'}
    <b style="display:block;margin-top:10px">${esc(m.titulo)}</b><p class="mu" style="margin:4px 0 0;font-size:13px">${esc(m.texto)}</p></div>`;
}

function perguntaSemana() {
  const q = C.perguntas[0];
  if (!q) return `<div class="card"><h3>Pergunta da semana</h3><p class="mu" style="margin:0">A pergunta desta semana ainda não foi publicada.</p></div>`;
  const r = C.D.respostas[q.id];
  return `<div class="card"><h3>Pergunta da semana</h3>
    <div style="font-family:var(--f-display);font-size:22px;font-weight:600;line-height:1.2;margin-bottom:10px">${esc(q.texto)}</div>
    ${r ? `<div style="padding:10px 12px;background:var(--raised);border-radius:8px">"${esc(r.texto)}"</div><p class="mu" style="font-size:12.5px;margin:8px 0 0">Enviada a ${esc(nomeCoach())}. Só vocês dois leem.</p>${comentario('pergunta:' + q.id)}`
      : `<form id="form-pergunta" data-id="${esc(q.id)}"><textarea class="campo" id="pergunta-resp" rows="3" placeholder="Escreva com calma. Só o seu coach lê." aria-label="Sua resposta"></textarea><button class="bt bt-ouro bt-sm" type="submit">Enviar ao meu coach</button></form>`}</div>`;
}

/* ===================== Hoje ===================== */
VIEWS.coachee.painel = () => {
  const L = C.L, D = C.D, h = hoje(); const prox = R.proximo(L, D); const m = metaAtual();
  const pend = D.acoes.filter(a => !a.ok).slice(0, 6);
  const diarias = D.rotinas.filter(r => r.freq === 'diaria');
  const seq = R.sequencia(L, D, S.u, h); const pp = R.proximaParada(P());
  const enc = C.encontros.filter(e => e.data >= h).slice(0, 2);
  return `
  <div class="topo"><div style="display:flex;gap:18px;align-items:center"><label class="foto-perfil" title="${S.u.foto ? 'Trocar a foto' : 'Adicionar sua foto'}">${av(S.u)}<input type="file" accept="image/*" data-muda="foto" hidden><span class="cam">${S.u.foto ? 'trocar' : '+ foto'}</span></label>
    <div><div class="sobre">Hoje · ${hojeExtenso()}</div><h1>Olá, ${esc(primeiroNome(S.u.nome))}</h1><div class="sub">${prox ? `Trilha ${esc(prox.t.n)} · ${esc(prox.t.titulo)}` : 'Jornada completa'}</div></div></div>
    ${botaoWhats()}</div>

  ${m ? `<div class="card meta-card" style="margin-bottom:16px">
    <div class="rotulinho ouro-tx">Minha meta para 2027</div><div class="meta-txt">${esc(m.meta)}</div>
    <div class="meta-pq"><span><b>Por que importa:</b> ${esc(m.porque)}</span><span><b>Como vou saber:</b> ${esc(m.indicador)}</span></div>
    <button class="bt bt-fantasma bt-sm" data-ir="item" data-p="${m.id}" style="margin-top:12px">Rever minha meta</button></div>`
  : `<div class="card ouro" style="margin-bottom:16px"><div class="rotulinho ouro-tx">Minha meta para 2027</div><p style="margin:6px 0 12px">Sua meta ainda não está escrita. Ela é o centro de toda a sua jornada.</p>${(() => { const pm = L.find(i => i.chave === 'meta'); return pm && R.acessivel(L, D, pm) ? `<button class="bt bt-ouro" data-ir="item" data-p="${pm.id}">Escrever minha meta</button>` : '<span class="mu" style="font-size:12.5px">Você escreve a sua meta no passo 3 da Trilha II.</span>'; })()}</div>`}
  <div class="grade g2" style="margin-bottom:16px">${mensagemSemana()}${perguntaSemana()}</div>
  ${mapa()}
  ${prox ? `<div class="card ouro" style="margin-bottom:16px"><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:220px"><div class="rotulinho ouro-tx">Continue de onde parou</div>
        <div style="font-family:var(--f-display);font-size:26px;font-weight:600;margin:4px 0">${esc(prox.titulo)}</div>
        <div class="mu">Trilha ${esc(prox.t.n)} · ${esc(prox.t.titulo)} · ${prox.tipo === 'aula' ? `aula · ${prox.dur || 15} min` : `passo ${prox.k + 1} de ${prox.total}`}</div></div>
      <button class="bt bt-ouro" data-ir="item" data-p="${prox.id}">${prox.tipo === 'aula' ? 'Assistir agora' : 'Continuar'}</button></div></div>` : ''}
  <div class="card" style="margin-bottom:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:200px"><div class="rotulinho ouro-tx">Você está em movimento</div><div style="font-weight:700;font-size:16px;margin-top:4px;display:flex;align-items:center"><span class="chama num">${seq}</span>${plural(seq, 'semana seguida', 'semanas seguidas')} em movimento</div>
      <div class="mu" style="font-size:12.5px;margin-top:4px">${plural(L.filter(i => R.feito(D, i.id)).length, 'passo ou aula', 'passos e aulas')} e ${plural(D.acoes.filter(a => a.ok).length, 'ação feita', 'ações feitas')} desde ${brc(S.u.inicio)}.${pp ? ` Próxima parada para olhar para trás: ${brc(pp.data)}.` : ''}</div></div>
    <button class="bt bt-linha" data-ir="evolucao">Ver minha evolução</button></div>
  <div class="grade g2">
    <div class="card"><h3>Próximos encontros <button class="bt bt-fantasma bt-sm acao" data-ir="comunidade">Ver todos</button></h3>
      <div class="lista">${enc.length ? enc.map(e => `<div class="item">${caixaData(e.data)}<div class="tx"><b>${e.tipo === 'convidado' ? 'Aula com convidado' : 'Mentoria em grupo'}</b><small>${esc(e.titulo)} · ${esc(e.hora || '')}</small></div>${urlSegura(e.link) ? `<a class="bt bt-linha bt-sm" href="${esc(e.link)}" target="_blank" rel="noopener">Entrar na sala</a>` : '<span class="chip ouro">ao vivo</span>'}</div>`).join('') : '<div class="vazio">Nenhum encontro agendado.</div>'}</div></div>
    <div class="card"><h3>Para fazer <button class="bt bt-fantasma bt-sm acao" data-ir="pratica">Na prática</button></h3>
      <div class="lista">
        ${pend.map(a => `<div class="item"><input type="checkbox" class="ck" data-muda="acao" data-id="${a.id}" aria-label="Concluir: ${esc(a.oque)}"><div class="tx"><b>${esc(a.oque)}</b><small>${esc(a.quem)} · até ${brc(a.prazo)}</small></div>${R.atrasada(a, h) ? '<span class="chip bad">atrasada</span>' : ''}</div>`).join('')}
        ${diarias.map(r => { const ok = (r.marcas || []).includes(h); return `<div class="item"><input type="checkbox" class="ck" data-muda="rotina" data-id="${r.id}" data-dia="${h}" ${ok ? 'checked' : ''} aria-label="Rotina: ${esc(r.titulo)}"><div class="tx"><b class="${ok ? 'feita' : ''}">${esc(r.titulo)}</b><small>Rotina diária</small></div></div>`; }).join('')}
        ${!pend.length && !diarias.length ? '<div class="vazio">Nada pendente. Cadastre ações e rotinas em Na prática.</div>' : ''}
      </div></div>
  </div>`;
};

/* ===================== Minha jornada ===================== */
VIEWS.coachee.jornada = () => {
  const L = C.L, D = C.D; const a = R.proximo(L, D);
  const trilhas = Object.values(C.trilhas).sort((x, y) => x.ordem - y.ordem);
  return `
  <div class="topo"><div><div class="sobre">Sua jornada de carreira</div><h1>Minha jornada</h1><div class="sub">A Trilha II segue passo a passo. As outras ficam abertas: a ordem é só uma sugestão.</div></div></div>
  ${mapa()}
  <div class="grade">
    ${trilhas.map(t => { const its = L.filter(i => i.t.id === t.id); const st = R.statusTrilha(L, D, t.id); const f = its.filter(i => R.feito(D, i.id)).length;
      return `<section class="card modulo ${a && a.t.id === t.id ? 'ouro' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="n">TRILHA ${esc(t.n)}</span>${st === 'feito' ? '<span class="chip ok">concluída</span>' : st === 'atual' ? '<span class="chip ouro">em andamento</span>' : t.sequencial ? '<span class="chip">passo a passo</span>' : '<span class="chip">aberta · ordem sugerida</span>'}</div>
        <h4>${esc(t.titulo)}${t.sequencial ? ` <span class="chip ouro" style="vertical-align:middle">${its.length} passos da jornada</span>` : t.coach ? ' <span class="chip ouro" style="vertical-align:middle">aulas do coach</span>' : ''}</h4><div class="desc">${esc(t.descricao)}</div>
        <div style="display:flex;align-items:center;gap:10px"><div class="barra" style="flex:1"><b style="width:${its.length ? f / its.length * 100 : 0}%"></b></div><span class="mu num" style="font-size:12px">${f}/${its.length}</span></div>
        <div>${its.length ? its.map(it => { const ok = R.feito(D, it.id); const ab = R.acessivel(L, D, it); const at = a && a.id === it.id;
          return `<div class="aula"><span class="st ${ok ? 'ok' : ''}">${ok ? '✓' : ab ? it.k + 1 : LOCK}</span>
            <span style="flex:1;min-width:0">${ab ? `<button class="titulo" data-ir="item" data-p="${it.id}">${esc(it.titulo)}</button>` : esc(it.titulo)}<br><small class="mu">${it.tipo === 'aula' ? `${t.coach ? `Aula com ${esc(nomeCoach())}` : 'Aula em vídeo'} · ${it.dur || 15} min` : `Passo ${it.k + 1} de ${it.total} · ${esc(it.sub || '')}`}</small></span>
            ${ok ? '<span class="chip ok">Concluída</span>' : at ? '<span class="chip ouro">Próximo</span>' : ab ? '<span class="chip">Disponível</span>' : '<span class="chip">Bloqueada</span>'}</div>`; }).join('') : '<div class="vazio">As aulas desta trilha serão publicadas em breve.</div>'}</div>
        ${t.assessments ? `<div class="sep"></div><div class="rotulinho ouro-tx" style="margin-bottom:4px">Quem eu sou · seus assessments</div>
          ${['disc', 'ie', 'a360'].map(k => { const hs = R.historico(D, k); const u = hs[hs.length - 1]; return `<div class="aula"><span class="st ${u ? 'ok' : ''}">${u ? '✓' : ''}</span><span style="flex:1;min-width:0"><b>${esc(CONTEUDO.ASSESS[k].nome)}</b><br><small class="mu">${u ? `Feito em ${brc(u.data)} · refaz na próxima parada` : 'Pendente'}</small></span><button class="bt ${u ? 'bt-linha' : 'bt-ouro'} bt-sm" data-ir="quem">${u ? 'Ver' : 'Fazer'}</button></div>`; }).join('')}` : ''}
      </section>`; }).join('')}
    <div class="card ${a ? '' : 'ouro'}" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><div class="rotulinho ouro-tx">Certificado de conclusão</div><div class="mu">${a ? 'Liberado ao concluir as quatro trilhas.' : 'Parabéns! Você concluiu o programa.'}</div></div>${a ? `<span class="cadeado">${LOCK} Bloqueado</span>` : '<button class="bt bt-ouro" data-ir="certificado">Ver certificado</button>'}</div>
    <div class="extra-sessao"><span>Quer aprofundar algum ponto da jornada com ${esc(nomeCoach())}?</span><button class="link-discreto" data-acao="sessao">Comprar sessão individual</button></div>
    ${C.pedidos.length ? `<div class="extra-sessao"><span>Seu último pedido de sessão: ${({ aguardando: 'aguardando pagamento', pago: 'pago, aguardando o horário', agendado: 'agendado', cancelado: 'cancelado' })[C.pedidos[0].status] || esc(C.pedidos[0].status)} · ${brc(C.pedidos[0].data)}</span></div>` : ''}
  </div>`;
};

/* ===================== Item: aula ou passo ===================== */
function campoHtml(id, c, v, leitura) {
  const vv = esc(v ?? '');
  if (c.tipo === 'area') return `<textarea class="campo" id="${id}" rows="3" ${leitura ? 'readonly' : ''}>${vv}</textarea>`;
  return `<input class="campo" id="${id}" type="${c.tipo === 'numero' ? 'number' : c.tipo === 'data' ? 'date' : 'text'}" ${c.tipo === 'numero' ? 'min="0" max="10"' : ''} value="${vv}" ${leitura ? 'readonly' : ''}>`;
}
const exemplo = (c, mostrar) => c.exemplo && mostrar ? `<details class="exemplo"><summary>Ver exemplo</summary><span>${esc(c.tipo === 'data' ? br(c.exemplo) : c.exemplo).replace(/\n/g, '<br>')}</span></details>` : '';

function corpoPasso(it) {
  const D = C.D; const pr = D.progresso[it.id]; const ok = R.feito(D, it.id); const r = (pr && pr.respostas) || {};
  const editar = !ok || S.editando === it.id; const leitura = !editar;
  const rodape = editar ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:4px">${ok ? '<button type="button" class="bt bt-fantasma" data-acao="cancelar-edicao">Cancelar</button>' : '<span></span>'}<button class="bt bt-ouro" type="submit">${ok ? 'Salvar alterações' : 'Concluir passo'}</button></div>`
    : `<button type="button" class="bt bt-fantasma bt-sm" data-acao="editar-passo" data-id="${it.id}" style="margin-top:6px">Rever minhas respostas</button>`;
  const chip = ok ? `<span class="chip ok acao">concluído em ${brc(pr.data)}</span>` : '';

  if (it.chave === 'areas') {
    if (leitura) {
      const v = CONTEUDO.AREAS.map((a, k) => [a, +r[k]]); const baixas = v.slice().sort((x, y) => x[1] - y[1]).slice(0, 3);
      return `<div class="card"><h3>Suas notas de 0 a 10 ${chip}</h3><div class="areas">${v.map(([a, n]) => `<div class="lin"><span>${esc(a)}</span><div class="barra"><b style="width:${n * 10}%"></b></div><span class="num" style="text-align:right">${n}</span></div>`).join('')}</div>
        <div class="sep"></div><p class="mu" style="margin:0">Áreas com nota mais baixa: ${baixas.map(([a]) => `<b class="ouro-tx">${esc(a)}</b>`).join(', ')}.</p>${rodape}</div>`;
    }
    return `<form class="card" id="form-passo" data-id="${it.id}"><h3>Dê uma nota de 0 a 10 para cada área ${chip}</h3><p class="mu" style="margin:-4px 0 12px;font-size:13px">0 = muito insatisfeito · 10 = plenamente satisfeito. Responda pelo que é hoje, não pelo que gostaria.</p>
      <div class="duas">${CONTEUDO.AREAS.map((a, k) => `<div><label class="rotulo" for="ps-${k}">${esc(a)}</label><input class="campo num" id="ps-${k}" type="number" min="0" max="10" value="${esc(r[k] ?? '')}"></div>`).join('')}</div>${rodape}</form>`;
  }
  if (it.chave === 'swot' && leitura) {
    return `<div class="card"><h3>Sua análise ${chip}</h3><div class="swot">${it.campos.map((c, k) => `<div class="q"><div class="rotulinho ouro-tx">${esc(c.rotulo)}</div><ul>${String(r[k] || '').split('\n').filter(Boolean).map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('')}</div>${rodape}</div>`;
  }
  if (it.chave === 'plano' && editar && !ok) {
    const linhas = (r.acoes && r.acoes.length ? r.acoes : [{}, {}, {}]);
    return `<form class="card" id="form-passo" data-id="${it.id}"><h3>Monte o seu plano de ação</h3>
      <p class="mu" style="margin:-4px 0 12px;font-size:13px">Ações pequenas, com responsável e prazo. Elas vão direto para "Na prática", onde você acompanha e marca como feitas.</p>
      <details class="exemplo" style="margin-bottom:10px"><summary>Ver exemplo</summary><span>Conversar com o diretor sobre o piloto · eu · até 20/10<br>Escolher o sucessor e combinar o plano de formação · eu · até 30/10</span></details>
      <div id="linhas-plano">${linhas.map((l, k) => linhaPlano(k, l)).join('')}</div>
      <button type="button" class="bt bt-fantasma bt-sm" data-acao="linha-plano" style="margin-bottom:14px">+ Outra ação</button>
      ${(it.campos || []).map((c, k) => `<div><label class="rotulo" for="ps-${k}">${esc(c.rotulo)}</label>${exemplo(c, true)}${campoHtml('ps-' + k, c, r[k], false)}</div>`).join('')}${rodape}</form>`;
  }
  if (it.chave === 'plano' && ok) {
    return `<div class="card"><h3>Seu plano de ação ${chip}</h3><div class="lista">${(r.acoes || []).map(a => `<div class="item"><div class="tx"><b>${esc(a.oque)}</b><small>${esc(a.quem)} · até ${br(a.prazo)}</small></div></div>`).join('')}</div>
      ${(it.campos || []).map((c, k) => `<div class="sep"></div><small class="mu">${esc(c.rotulo)}</small><div>${esc(r[k] || '')}</div>`).join('')}
      <div class="sep"></div><p class="mu" style="margin:0;font-size:12.5px">As ações estão em <button class="link-discreto" data-ir="pratica">Na prática</button>, onde você pode editar, incluir novas e marcar como feitas.</p></div>`;
  }
  const cs = it.campos || [];
  return `<form class="card" id="form-passo" data-id="${it.id}"><h3>${ok && leitura ? 'Suas respostas' : 'Responda para concluir o passo'} ${chip}</h3>
    ${cs.map((c, k) => `<div><label class="rotulo" for="ps-${k}">${esc(c.rotulo)}</label>${exemplo(c, editar)}${campoHtml('ps-' + k, c, r[k], leitura)}</div>`).join('')}
    ${!cs.length ? '<p class="mu">O formulário deste passo será publicado em breve.</p>' : ''}${cs.length ? rodape : ''}</form>`;
}
const linhaPlano = (k, l = {}) => `<div class="linha-acao" data-linha="${k}"><input class="campo" placeholder="O que muda" aria-label="Ação ${k + 1}: o que muda" value="${esc(l.oque || '')}"><input class="campo" placeholder="Quem faz" aria-label="Ação ${k + 1}: quem faz" value="${esc(l.quem || primeiroNome(S.u.nome))}"><input class="campo" type="date" aria-label="Ação ${k + 1}: até quando" value="${esc(l.prazo || '')}"><button type="button" class="x" data-acao="tirar-linha" aria-label="Remover ação ${k + 1}">×</button></div>`;

VIEWS.coachee.item = () => {
  const L = C.L, D = C.D; const i = L.findIndex(x => x.id === S.p); const it = L[i];
  if (!it || !R.acessivel(L, D, it)) return `<div class="card"><p>Este item ainda não está liberado.</p><button class="bt bt-linha" data-ir="jornada">Voltar para a jornada</button></div>`;
  const ant = L[i - 1], prox = L[i + 1];
  let corpo;
  if (it.tipo === 'aula') {
    const ok = R.feito(D, it.id); const pr = D.progresso[it.id]; const resp = pr && pr.respostas ? pr.respostas[0] : '';
    const mat = it.material && urlSegura(it.material.url) ? it.material : null;
    corpo = `<div class="grade g-21"><div>
        ${video(it.video, it.t.coach ? `Aula com ${nomeCoach()}` : 'Aula em vídeo', it.dur)}
        <div style="margin-top:14px"><button class="bt ${ok ? 'bt-linha' : 'bt-ouro'}" data-acao="assistida" data-id="${it.id}">${ok ? '✓ Aula assistida' : 'Marcar como assistida'}</button></div></div>
      <div class="card"><h3>Exercício</h3>
        ${it.exercicio ? `<p style="margin:0 0 12px">${esc(it.exercicio)}</p><form id="form-exercicio" data-id="${it.id}"><label class="rotulo" for="resp">Sua resposta</label>
          <textarea class="campo" id="resp" rows="5" placeholder="Escreva aqui. Só você e o seu coach leem.">${esc(resp || '')}</textarea><button class="bt bt-ouro" type="submit">Salvar resposta</button></form>`
          : '<p class="mu" style="margin:0">Esta aula não tem exercício. Assista e marque como assistida.</p>'}
        ${comentario(it.id)}
        ${mat ? `<div class="sep"></div><div class="rotulinho" style="margin-bottom:8px">Material de apoio</div><div class="item" style="padding:6px 0"><span class="chip">PDF</span><div class="tx">${esc(mat.titulo || 'Material da aula')}</div><a class="bt bt-fantasma bt-sm" href="${esc(mat.url)}" target="_blank" rel="noopener">Abrir</a></div>` : ''}
      </div></div>`;
  } else {
    corpo = `${it.k > 2 ? lembreteMeta() : ''}<div class="grade g-21"><div>${corpoPasso(it)}${comentario(it.id)}</div>
      <div class="card"><h3>${it.chave === 'plano' ? 'Aula: como preencher seu plano de ação' : 'Vídeo de orientação'}</h3>${video(it.video, it.chave === 'plano' ? 'Ações pequenas, com responsável e prazo' : 'Como fazer este passo', it.dur)}
        <p class="mu" style="font-size:12.5px;margin:12px 0 0">${it.chave === 'plano' ? 'Três apoios para você: esta aula, os exemplos em cada campo e a mentoria em grupo do mês, onde dá para levar o seu plano.' : 'Assista antes de responder. Cada campo tem um exemplo.'}</p></div></div>`;
  }
  const navAnt = ant ? `<button class="bt bt-fantasma" data-ir="item" data-p="${ant.id}">← Anterior</button>` : '<span></span>';
  const navProx = prox && R.acessivel(L, D, prox) ? `<button class="bt bt-fantasma" data-ir="item" data-p="${prox.id}">Próxima →</button>` : '<span></span>';
  return `
  <div class="topo"><div><div class="sobre">Trilha ${esc(it.t.n)} · ${esc(it.t.titulo)} · ${it.tipo === 'passo' ? `passo ${it.k + 1} de ${it.total}` : `${it.k + 1} de ${it.total}`}</div><h1>${esc(it.titulo)}</h1>${it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ''}</div>
    <button class="bt bt-fantasma" data-ir="jornada">← Toda a trilha</button></div>
  ${corpo}
  <div style="display:flex;justify-content:space-between;margin-top:14px">${navAnt}${navProx}</div>`;
};

function depoisDeConcluir(itemId) {
  const prox = R.proximo(C.L, C.D);
  if (!prox) { toast('Programa concluído. Parabéns!'); ir('jornada'); return; }
  const it = C.L.find(i => i.id === itemId);
  if (it && it.tipo === 'passo') { toast(`Passo concluído. Liberado: ${prox.titulo}.`); ir('item', prox.id); }
  else { toast(`Aula concluída. Próximo: ${prox.titulo}.`); render(); }
}

Object.assign(ACOES, {
  async assistida(t) {
    const id = t.dataset.id; const ok = !R.feito(C.D, id);
    await salvarProgresso(id, { ok, data: ok ? hoje() : null });
    if (ok) depoisDeConcluir(id); else { toast('Marcação removida.'); render(); }
  },
  'editar-passo'(t) { S.editando = t.dataset.id; render(); },
  'cancelar-edicao'() { S.editando = null; render(); },
  'linha-plano'() { const c = $('#linhas-plano'); c.insertAdjacentHTML('beforeend', linhaPlano(c.children.length)); c.lastElementChild.querySelector('input').focus(); },
  'tirar-linha'(t) { const l = t.closest('.linha-acao'); if ($('#linhas-plano').children.length > 1) l.remove(); else l.querySelectorAll('input').forEach(i => { if (i.type !== 'date') i.value = ''; }); }
});

FORMS['form-exercicio'] = async f => {
  const id = f.dataset.id; const v = valor('resp');
  if (!v) { toast('Escreva a sua resposta.'); return; }
  await salvarProgresso(id, { respostas: { 0: v }, respondidoEm: hoje() });
  toast('Resposta salva. Seu coach já pode ler.'); render();
};

FORMS['form-passo'] = async f => {
  const id = f.dataset.id; const it = C.L.find(i => i.id === id); const jaFeito = R.feito(C.D, id);
  const r = {};
  if (it.chave === 'areas') {
    for (let k = 0; k < CONTEUDO.AREAS.length; k++) {
      const v = valor('ps-' + k); const n = Number(v);
      if (v === '' || isNaN(n) || n < 0 || n > 10) { toast('Dê uma nota de 0 a 10 para cada área.'); document.getElementById('ps-' + k).focus(); return; }
      r[k] = n;
    }
  } else {
    (it.campos || []).forEach((c, k) => { r[k] = valor('ps-' + k); });
    if (Object.values(r).some(v => !v)) { toast('Preencha todos os campos para concluir o passo.'); return; }
  }
  let novas = [];
  if (it.chave === 'plano' && !jaFeito) {
    novas = [...f.querySelectorAll('.linha-acao')].map(l => { const [o, q, p] = l.querySelectorAll('input'); return { oque: o.value.trim(), quem: q.value.trim(), prazo: p.value }; }).filter(a => a.oque);
    if (!novas.length) { toast('Escreva pelo menos uma ação.'); return; }
    if (novas.some(a => !a.quem || !a.prazo)) { toast('Cada ação precisa de quem faz e até quando.'); return; }
    r.acoes = novas;
  }
  const antes = C.D.progresso[id];
  const extra = jaFeito && antes && antes.respostas ? { anteriores: [...(antes.anteriores || []), { data: antes.data, respostas: antes.respostas }] } : {};
  await salvarProgresso(id, { ok: true, data: jaFeito ? antes.data : hoje(), respostas: r, ...extra });
  // As ações do passo 8 entram no plano de ação (RF-40).
  for (const a of novas) {
    const dados = { coacheeId: S.u.id, ...a, ok: false, pauta: false, criada: hoje(), origem: id };
    const nid = await col('acoes').adicionar(dados); C.D.acoes.push({ id: nid, ...dados });
  }
  S.editando = null;
  if (jaFeito) { toast('Respostas atualizadas.'); render(); } else depoisDeConcluir(id);
};

FORMS['form-pergunta'] = async f => {
  const v = valor('pergunta-resp'); if (!v) { toast('Escreva a sua resposta.'); return; }
  const pid = f.dataset.id; const doc = { coacheeId: S.u.id, perguntaId: pid, texto: v, data: hoje() };
  await col('respostas').salvar(`${pid}_${S.u.id}`, doc); C.D.respostas[pid] = doc;
  toast('Resposta enviada ao seu coach.'); render();
};

MUDA.foto = async t => {
  const f = t.files && t.files[0]; if (!f) return;
  if (!f.type.startsWith('image/')) { toast('Escolha uma imagem.'); return; }
  toast('Enviando a foto…');
  const url = await Dados.enviarArquivo(f, 'fotos', C.cfg.cloudinary);
  await col('usuarios').salvar(S.u.id, { foto: url }); S.u.foto = url;
  toast('Foto atualizada. Ela aparece no mapa da sua jornada.'); render();
};

/* ===================== Certificado (RF-26) ===================== */
VIEWS.coachee.certificado = () => {
  if (R.proximo(C.L, C.D)) return `<div class="card"><p>O certificado é liberado ao concluir as quatro trilhas.</p><button class="bt bt-linha" data-ir="jornada">Voltar</button></div>`;
  const fim = Object.values(C.D.progresso).filter(p => p.ok && p.data).map(p => p.data).sort().pop() || hoje();
  return `<div class="topo"><div><div class="sobre">Jornada concluída</div><h1>Certificado</h1></div><div style="display:flex;gap:8px"><button class="bt bt-ouro" onclick="window.print()">Salvar em PDF</button><button class="bt bt-fantasma" data-ir="jornada">← Minha jornada</button></div></div>
  <div class="certificado">${av(S.u)}
    <div class="selo" style="justify-content:center;color:#8E6B2E"><i style="background:#8E6B2E"></i>${esc(nomePrograma())}<i style="background:#8E6B2E"></i></div>
    <h2>Certificado de conclusão</h2><p>Certificamos que</p><div class="nome">${esc(S.u.nome)}</div>
    <p>concluiu as quatro trilhas da jornada de desenvolvimento de carreira: Autoconhecimento, Planejamento estratégico, Desenvolvimento de competências comportamentais e Liderança.</p>
    <p class="num">${br(S.u.inicio)} a ${br(fim)}</p>
    <p style="margin-top:30px;font-family:var(--f-display);font-size:22px;font-style:italic">${esc(nomeCoach())}</p><p style="margin-top:-8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Coach responsável</p>
  </div>`;
};

/* ===================== Quem eu sou (RF-24, RF-28) ===================== */
function cartaoAssess(k, D, paraCoach, Pp) {
  const A = CONTEUDO.ASSESS[k]; const hs = R.historico(D, k); const u = hs[hs.length - 1]; const ant = hs[hs.length - 2];
  const lib = R.liberado(D, k, Pp); const pp = R.proximaParada(Pp);
  const DISC = CONTEUDO.DISC;
  const linhas = u ? Object.entries(u.r).map(([dim, v]) => { const v0 = ant ? ant.r[dim] : null; const d = v0 == null ? null : v - v0;
      const larg = k === 'disc' ? Math.min(v * 2, 100) : v; const larg0 = v0 == null ? null : (k === 'disc' ? Math.min(v0 * 2, 100) : v0);
      return `<div class="lin"><span>${esc(k === 'disc' ? DISC[dim][0] : dim)}</span><div style="display:grid;gap:3px">${larg0 != null ? `<div class="barra fina antes"><b style="width:${larg0}%"></b></div>` : ''}<div class="barra ${larg0 != null ? 'fina' : ''}"><b style="width:${larg}%"></b></div></div><span class="num">${v}%${d ? ` <small class="${d > 0 ? 'ouro-tx' : 'mu'}">${d > 0 ? '+' : ''}${d}</small>` : ''}</span></div>`; }).join('') : '';
  const ord = u && k === 'disc' ? Object.entries(u.r).sort((x, y) => y[1] - x[1]) : null;
  const titulo = ord ? `<div style="font-family:var(--f-display);font-size:24px;font-weight:600">${DISC[ord[0][0]][0]} <span class="mu" style="font-size:16px">com ${DISC[ord[1][0]][0]}</span></div>` : '';
  const disc = urlSegura(C.cfg.disc);
  let acao = '';
  if (!paraCoach) {
    const linkNbm = rot => disc ? `<a class="bt bt-linha bt-sm" href="${esc(disc)}" target="_blank" rel="noopener">${rot}</a>` : '';
    if (!u) acao = k === 'disc' ? `${linkNbm('Fazer o teste no NBM')} <button class="bt bt-ouro bt-sm" data-acao="registrar-disc">Registrar resultado</button>` : `<button class="bt bt-ouro bt-sm" data-ir="questionario" data-p="${k}">Responder agora · ${CONTEUDO.QUEST[k].minutos} min</button>`;
    else if (lib) acao = k === 'disc' ? `${linkNbm('Refazer no NBM')} <button class="bt bt-ouro bt-sm" data-acao="registrar-disc">Registrar novo resultado</button>` : `<button class="bt bt-ouro bt-sm" data-ir="questionario" data-p="${k}">Refazer agora</button>`;
    else acao = `<button class="bt bt-fantasma bt-sm" disabled>${pp ? `Refazer na parada ${pp.n} · abre ${brc(pp.abre)}` : 'Ciclo de reavaliações concluído'}</button>`;
  }
  const chip = !u ? '<span class="chip warn acao">pendente</span>' : lib ? '<span class="chip ouro acao">liberado para refazer</span>' : `<span class="chip ok acao">feito em ${brc(u.data)}</span>`;
  return `<div class="card ${lib && !paraCoach ? 'ouro' : ''}"><h3>${esc(A.nome)} ${chip}</h3>
    ${u ? `${titulo}${ant ? `<div class="comp-leg" style="margin:6px 0 8px"><span><i class="antes"></i>${br(ant.data)}</span><span><i class="depois"></i>${br(u.data)}</span></div>` : ''}<div class="disc" style="margin-top:8px">${linhas}</div>` : `<p class="mu" style="margin:0 0 10px">${esc(A.desc)}</p>`}
    ${ord && !paraCoach ? `<div class="sep"></div><div class="rotulinho" style="margin-bottom:4px">Leitura guiada</div><p style="margin:0 0 4px;font-size:13px">${esc(DISC[ord[0][0]][1])} ${esc(DISC[ord[0][0]][2])}</p>` : ''}
    <div class="sep"></div><small class="mu num">${hs.length ? `Feito em ${hs.map(x => brc(x.data)).join(' · ')}` : 'Ainda não feito'}</small>
    ${acao ? `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${acao}</div>` : ''}</div>`;
}

VIEWS.coachee.quem = () => {
  const Pp = P(); const pa = R.paradaAberta(Pp); const pp = R.proximaParada(Pp);
  return `
  <div class="topo"><div><div class="sobre">Seus assessments · parte da Trilha I · Autoconhecimento</div><h1>Quem eu sou</h1><div class="sub">Feitos na entrada e refeitos a cada 3 meses, junto com as paradas. Assim você vê como está mudando.</div></div></div>
  ${pa ? `<div class="card ouro" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><div class="rotulinho ouro-tx">${nomeParada(pa)} aberta</div><b>Refaça seus assessments até ${br(pa.data)}.</b> <span class="mu">Depois registre a parada em "Minha evolução".</span></div><button class="bt bt-linha bt-sm" data-ir="evolucao">Ir para a parada</button></div>`
    : pp ? `<div class="meta-mini"><span class="rotulinho ouro-tx">Próxima reavaliação</span><span>${nomeParada(pp)} · abre em ${br(pp.abre)}</span></div>` : ''}
  <div class="grade g3">${['disc', 'ie', 'a360'].map(k => cartaoAssess(k, C.D, false, Pp)).join('')}</div>`;
};

VIEWS.coachee.questionario = () => {
  const k = S.p; const q = CONTEUDO.QUEST[k];
  if (!q || !R.liberado(C.D, k, P())) return `<div class="card"><p>Este assessment não está liberado agora.</p><button class="bt bt-linha" data-ir="quem">Voltar</button></div>`;
  const reav = R.historico(C.D, k).length > 0;
  return `
  <div class="topo"><div><div class="sobre">Quem eu sou · ${reav ? 'reavaliação' : 'assessment de entrada'}</div><h1>${esc(q.nome)}</h1><div class="sub">1 = nunca · 5 = sempre. Responda pensando nas últimas 4 semanas.</div></div>
    <button class="bt bt-fantasma" data-ir="quem">← Quem eu sou</button></div>
  <form class="card" id="form-quest" data-k="${k}">
    ${q.dims.map(dim => `<div class="rotulinho ouro-tx" style="margin-top:8px">${esc(dim)}</div>
      ${q.perguntas.map((p, i) => [p, i]).filter(([p]) => p[0] === dim).map(([p, i]) => `
        <fieldset class="pergunta" style="border:0;margin:0;padding-inline:0"><legend style="padding:0">${i + 1}. ${esc(p[1])}</legend>
          <div class="escala">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="q${i}" value="${v}" data-muda="quest" ${S.resp[i] == v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div></fieldset>`).join('')}`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px">
      <span class="mu" id="quest-cont">${Object.keys(S.resp).length} de ${q.perguntas.length} respondidas</span>
      <button class="bt bt-ouro" type="submit">Ver meu resultado</button></div>
  </form>`;
};
MUDA.quest = t => { S.resp[t.name.slice(1)] = +t.value; const q = CONTEUDO.QUEST[S.p]; $('#quest-cont').textContent = `${Object.keys(S.resp).length} de ${q.perguntas.length} respondidas`; };

async function registrarAssessment(tipo, r) {
  const doc = { coacheeId: S.u.id, tipo, data: hoje(), criado: new Date().toISOString(), r };
  const id = await col('assessments').adicionar(doc); C.D.assessments.push({ id, ...doc });
}
FORMS['form-quest'] = async f => {
  const k = f.dataset.k; const q = CONTEUDO.QUEST[k];
  const falta = q.perguntas.length - Object.keys(S.resp).length;
  if (falta > 0) { toast(`Faltam ${plural(falta, 'afirmação', 'afirmações')}.`); return; }
  const reav = R.historico(C.D, k).length > 0;
  await registrarAssessment(k, R.resultadoQuest(q, S.resp)); S.resp = {};
  toast(reav ? 'Reavaliação registrada. Veja a comparação com a anterior.' : 'Assessment concluído.'); ir('quem');
};
ACOES['registrar-disc'] = () => {
  const DISC = CONTEUDO.DISC;
  abrirModal('Registrar resultado do DISC', `<p class="mu" style="margin:0 0 12px;font-size:13px">Copie as porcentagens do relatório do NBM.</p><div class="duas">${['D', 'I', 'S', 'C'].map(x => `<div><label class="rotulo" for="dc-${x}">${DISC[x][0]} (%)</label><input class="campo num" id="dc-${x}" type="number" min="0" max="100"></div>`).join('')}</div>`, 'Registrar', async () => {
    const r = {};
    for (const x of ['D', 'I', 'S', 'C']) { const v = valor('dc-' + x); const n = Number(v); if (v === '' || isNaN(n) || n < 0 || n > 100) { toast('Use valores de 0 a 100.'); return false; } r[x] = n; }
    await registrarAssessment('disc', r); toast('Resultado do DISC registrado.'); render();
  });
};

/* ===================== Minha evolução (RF-30 a RF-36) ===================== */
function antesDepois(Pp) {
  const ini = R.areasInicio(C.L, C.D);
  const reav = Object.values(C.D.paradas).filter(p => p.areas).sort((a, b) => b.n - a.n)[0];
  const datas = Pp.filter(p => p.areas).map(p => `na parada ${p.n} (${br(p.data)})`).join(' e ');
  if (!ini || !reav) return `<div class="card" style="margin-bottom:16px"><h3 style="margin-bottom:6px">Antes e depois · 12 áreas da vida</h3><p class="mu" style="margin:0">${ini ? `Você refaz as 12 áreas da vida ${datas} e vê aqui o quanto mudou desde o ponto de partida.` : 'O ponto de partida é o passo 1 da Trilha II. Depois, você refaz as 12 áreas nas paradas de 6 e 12 meses.'}</p></div>`;
  const depois = reav.areas; const soma = a => a.reduce((x, y) => x + y, 0); const dif = soma(depois) - soma(ini);
  return `<div class="card" style="margin-bottom:16px"><h3>Antes e depois · 12 áreas da vida <span class="chip ok acao">parada ${reav.n}</span></h3>
    <div class="comp-leg"><span><i class="antes"></i>Ponto de partida</span><span><i class="depois"></i>Parada ${reav.n} · ${br(reav.data)}</span><span class="ouro-tx" style="margin-left:auto;font-weight:700">${dif >= 0 ? '+' : ''}${dif} pontos no total</span></div>
    <div class="areas">${CONTEUDO.AREAS.map((a, k) => { const d = depois[k] - ini[k]; return `<div class="lin comp"><span>${esc(a)}</span><div><div class="barra fina antes"><b style="width:${ini[k] * 10}%"></b></div><div class="barra fina"><b style="width:${depois[k] * 10}%"></b></div></div><span class="num ${d > 0 ? 'ouro-tx' : ''}" style="text-align:right;font-weight:700">${d > 0 ? '+' + d : d === 0 ? '=' : d}</span></div>`; }).join('')}</div></div>`;
}

const CHIP_TIPO = { trilha: 'ouro', 'ação': 'ok', rotina: 'ok', 'vitória': 'ouro', 'início': '', parada: 'ouro', 'reflexão': '' };
function agruparRotinas(ev) {
  // Várias marcações de rotina no mesmo dia viram uma linha só.
  const out = []; const vistos = {};
  ev.forEach(e => { if (!e.rotina) return out.push(e); if (vistos[e.data]) { vistos[e.data].n++; return; } const x = { ...e, n: 1 }; vistos[e.data] = x; out.push(x); });
  return out.map(e => e.rotina && e.n > 1 ? { ...e, texto: `${e.n} rotinas marcadas no dia` } : e);
}

VIEWS.coachee.evolucao = () => {
  const L = C.L, D = C.D, h = hoje(); const Pp = P(); const aberta = R.paradaAberta(Pp);
  const ins = R.insignias(L, D, S.u, h); const sem = R.semanas(L, D, S.u, h); const seq = R.sequencia(L, D, S.u, h);
  const max = Math.max(...sem.map(s => s.n), 1);
  const feitos = L.filter(i => R.feito(D, i.id)).length, acoes = D.acoes.filter(a => a.ok).length;
  const caminho = agruparRotinas(R.percurso(L, D, S.u)).slice(0, 14);
  const respondida = p => CONTEUDO.PERGUNTAS_PARADA.map((q, k) => `<div class="item" style="align-items:flex-start;padding:9px 0"><div class="tx"><small>${esc(q)}</small><div style="margin-top:2px">${esc(p.respostas[k])}</div></div></div>`).join('');
  return `
  <div class="topo"><div><div class="sobre">Você está em movimento</div><h1>Minha evolução</h1><div class="sub">O que importa é o caminho. Cada passo, cada ação e cada semana de rotina contam.</div></div></div>
  ${lembreteMeta('Rumo à sua meta')}
  <div class="grade g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="v num">${Math.max(R.dias(S.u.inicio, h), 0)}</div><div class="l">dias de jornada desde ${brc(S.u.inicio)}</div></div>
    <div class="card kpi"><div class="v num">${feitos}</div><div class="l">passos e aulas concluídos</div></div>
    <div class="card kpi"><div class="v num">${acoes}</div><div class="l">${acoes === 1 ? 'ação colocada' : 'ações colocadas'} em prática</div></div>
    <div class="card kpi ouro"><div class="v num">${seq}</div><div class="l">semanas seguidas em movimento</div></div>
  </div>
  <div class="card" style="margin-bottom:16px"><h3>Insígnias <span class="mu acao num" style="font-size:12px;font-weight:500">${ins.filter(i => i.ok).length} de ${ins.length}</span></h3>
    ${[['pratica', 'Na prática · o que mais vale'], ['jornada', 'Na jornada']].map(([gr, rot]) => `<div class="rotulinho ${gr === 'pratica' ? 'ouro-tx' : ''}" style="margin:6px 0 4px">${rot}</div>
    <div class="insignias">${ins.filter(i => i.grupo === gr).map(i => `<div class="insig ${i.ok ? '' : 'nao'} ${gr === 'jornada' ? 'menor' : ''}" title="${esc(i.d)}"><span class="med">${i.ok ? esc(i.g) : '?'}</span><b>${esc(i.t)}</b><small>${esc(i.d)}</small></div>`).join('')}</div>`).join('')}
  </div>
  ${antesDepois(Pp)}
  <div class="grade g-21" style="margin-bottom:16px">
    <div class="card"><h3>Seu caminho até aqui</h3>
      <form id="form-vitoria" style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap"><input class="campo" id="vitoria" placeholder="Registrar uma pequena vitória de hoje" style="flex:1;min-width:200px;margin:0" aria-label="Pequena vitória"><button class="bt bt-ouro" type="submit">Registrar</button></form>
      <div class="lista feed">${caminho.map(e => `<div class="item" style="flex-wrap:wrap"><span class="ponto"></span><div class="tx"><b style="font-weight:600">${esc(e.texto)}</b><small class="num">${br(e.data)}</small></div><span class="chip ${CHIP_TIPO[e.tipo] || ''}">${e.tipo}</span>${e.id ? `<div style="flex-basis:100%">${comentario('vitoria:' + e.id)}</div>` : ''}</div>`).join('')}</div>
    </div>
    <div class="grade" style="align-content:start">
      <div class="card"><h3>Seu ritmo · últimas 8 semanas</h3>
        <div class="ritmo">${sem.map((s, i) => `<div class="${s.n ? '' : 'zero'} ${i === sem.length - 1 ? 'atual' : ''}"><span class="num">${s.n || ''}</span><i style="height:${s.n ? Math.max(s.n / max * 70, 8) : 4}px"></i><small>${brc(s.seg)}</small></div>`).join('')}</div>
        <p class="mu" style="font-size:12.5px;margin:12px 0 0">Você se moveu em ${sem.filter(s => s.n).length} das últimas 8 semanas${seq ? `, ${seq} delas seguidas` : ''}. Semana parada acontece; o importante é voltar.</p></div>
      <div class="card"><h3>Paradas para olhar para trás</h3>
        <div class="lista">${Pp.map(p => `<div class="item"><span class="st ${p.st === 'feito' ? 'ok' : ''}" style="width:22px;height:22px;border-radius:50%;border:1.5px solid ${p.st === 'aberto' ? 'var(--gold)' : '#5a554b'};display:grid;place-items:center;font-size:11px;flex-shrink:0;${p.st === 'feito' ? 'background:var(--gold);border-color:var(--gold);color:#17130B;font-weight:800' : ''}">${p.st === 'feito' ? '✓' : ''}</span><div class="tx"><b style="font-weight:600">${nomeParada(p)}</b><small class="num">${br(p.data)}</small></div>${p.st === 'feito' ? '<span class="chip ok">feita</span>' : p.st === 'aberto' ? '<span class="chip ouro">aberta</span>' : ''}</div>`).join('')}</div>
        <p class="mu" style="font-size:12.5px;margin:10px 0 0">A cada 3 meses, uma pausa para ver o quanto você já andou e refazer os seus assessments. A parada abre 7 dias antes da data.</p></div>
    </div>
  </div>
  ${aberta ? `<form class="card ouro" id="form-parada" data-n="${aberta.n}" style="margin-bottom:16px"><h3>${nomeParada(aberta)} <span class="mu acao num" style="font-size:12px;font-weight:500">${br(aberta.data)}</span></h3>
    <p class="mu" style="margin:-4px 0 14px">Olhe para os últimos 3 meses. Não precisa ser grande: conta tudo o que mudou.</p>
    <div class="rotulinho ouro-tx" style="margin-bottom:6px">Nesta parada, refaça também</div>
    <div class="lista" style="margin-bottom:14px">${['disc', 'ie', 'a360'].map(k => { const hs = R.historico(D, k); const u = hs[hs.length - 1]; const feito = u && u.data >= aberta.abre; return `<div class="item" style="padding:7px 0"><span style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${feito ? 'var(--gold)' : '#5a554b'};${feito ? 'background:var(--gold);color:#17130B;' : ''}display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0">${feito ? '✓' : ''}</span><div class="tx"><b style="font-weight:600">${esc(CONTEUDO.ASSESS[k].nome)}</b></div>${feito ? '<span class="chip ok">refeito</span>' : '<button type="button" class="bt bt-linha bt-sm" data-ir="quem">Refazer</button>'}</div>`; }).join('')}</div>
    ${CONTEUDO.PERGUNTAS_PARADA.map((q, k) => `<label class="rotulo" for="pd-${k}">${esc(q)}</label><textarea class="campo" id="pd-${k}" rows="3"></textarea>`).join('')}
    ${aberta.areas ? `<div class="rotulinho ouro-tx" style="margin:4px 0 8px">Refaça as 12 áreas da vida (0 a 10)</div><div class="duas">${CONTEUDO.AREAS.map((a, k) => `<div><label class="rotulo" for="pa-${k}">${esc(a)}</label><input class="campo num" id="pa-${k}" type="number" min="0" max="10"></div>`).join('')}</div>` : ''}
    <div style="display:flex;justify-content:flex-end"><button class="bt bt-ouro" type="submit">Registrar minha parada</button></div>
  </form>` : ''}
  <div class="grade">${Object.values(D.paradas).sort((a, b) => b.n - a.n).map(p => `<div class="card"><h3>Parada ${p.n} · ${p.n * 3} meses <span class="chip ok acao">${br(p.data)}</span></h3>${respondida(p)}${comentario('parada:' + p.n)}</div>`).join('')}</div>`;
};

FORMS['form-vitoria'] = async () => {
  const v = valor('vitoria'); if (!v) { toast('Escreva a sua vitória.'); return; }
  const doc = { coacheeId: S.u.id, texto: v, data: hoje() };
  const id = await col('vitorias').adicionar(doc); C.D.vitorias.push({ id, ...doc });
  toast('Vitória registrada. Isso também é movimento.'); render();
};
FORMS['form-parada'] = async f => {
  const n = +f.dataset.n; const p = P().find(x => x.n === n);
  const respostas = CONTEUDO.PERGUNTAS_PARADA.map((q, k) => valor('pd-' + k));
  if (respostas.some(v => !v)) { toast('Responda todas as perguntas para registrar.'); return; }
  let areas = null;
  if (p.areas) {
    areas = CONTEUDO.AREAS.map((a, k) => valor('pa-' + k));
    if (areas.some(v => v === '' || isNaN(+v) || +v < 0 || +v > 10)) { toast('Dê uma nota de 0 a 10 para cada área.'); return; }
    areas = areas.map(Number);
  }
  const doc = { coacheeId: S.u.id, n, data: hoje(), respostas, areas };
  await col('paradas').salvar(`${S.u.id}_${n}`, doc); C.D.paradas[n] = doc;
  toast('Parada registrada. Seu coach já pode ver.'); render();
};

/* ===================== Na prática (RF-40, RF-41, RF-45) ===================== */
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
VIEWS.coachee.pratica = () => {
  const D = C.D, h = hoje(); const seg = R.segunda(h); const semana = DIAS.map((d, i) => R.somaDias(seg, i));
  const pe = proxEncontro(); const aulaPlano = C.L.find(i => i.chave === 'plano');
  return `
  <div class="topo"><div><div class="sobre">Do plano para o dia a dia</div><h1>Na prática</h1><div class="sub">Suas ações e a sua rotina da semana.</div></div></div>
  ${lembreteMeta('Cada ação aproxima você da sua meta')}
  <div class="card" style="margin-bottom:16px"><h3>Plano de ação <button class="bt bt-linha bt-sm acao" data-acao="nova-acao">+ Nova ação</button></h3>
    <div class="apoios"><span class="rotulinho">Com dúvida no preenchimento?</span>
      ${aulaPlano ? `<button class="link-discreto" data-acao="aula-plano">1. Assista à aula "Como preencher seu plano de ação"</button>` : ''}
      <span>2. Use os exemplos de cada campo</span>
      <span>3. Leve a ação para a mentoria em grupo${pe ? ` de ${brc(pe.data)}` : ''}</span></div>
    ${D.acoes.length ? `<div class="tabela-wrap"><table>
      <thead><tr><th style="width:36px"></th><th>O que muda</th><th>Quem faz</th><th>Até quando</th><th>Mentoria</th><th></th></tr></thead>
      <tbody>${D.acoes.map(a => `<tr><td><input type="checkbox" class="ck" data-muda="acao" data-id="${a.id}" ${a.ok ? 'checked' : ''} aria-label="Concluir: ${esc(a.oque)}"></td><td class="${a.ok ? 'feita' : ''}"><b>${esc(a.oque)}</b></td><td>${esc(a.quem)}</td><td class="num">${br(a.prazo)} ${R.atrasada(a, h) ? '<span class="chip bad">atrasada</span>' : a.ok ? '<span class="chip ok">feita</span>' : ''}</td><td>${a.ok ? '' : `<button class="bt ${a.pauta ? 'bt-linha' : 'bt-fantasma'} bt-sm" data-acao="pauta" data-id="${a.id}">${a.pauta ? '✓ Na pauta' : 'Levar para a mentoria'}</button>`}</td><td style="text-align:right"><button class="bt bt-fantasma bt-sm" data-acao="editar-acao" data-id="${a.id}">Editar</button></td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="vazio">Nenhuma ação ainda. As ações do passo 8 da jornada entram aqui, e você pode cadastrar outras em "+ Nova ação".</div>'}</div>
  <div class="card"><h3>Planner · semana de ${brc(seg)} <button class="bt bt-linha bt-sm acao" data-acao="nova-rotina">+ Nova rotina</button></h3>
    <div class="tabela-wrap"><div class="planner">
      <div class="rotulinho">Rotina diária</div>${DIAS.map((d, i) => `<div class="dia ${semana[i] === h ? 'hoje' : ''}">${d}</div>`).join('')}
      ${D.rotinas.filter(r => r.freq === 'diaria').map(r => `<div style="display:flex;gap:6px;align-items:center">${esc(r.titulo)}<button class="x" style="font-size:16px" data-acao="tirar-rotina" data-id="${r.id}" aria-label="Remover rotina ${esc(r.titulo)}">×</button></div>${semana.map((d, i) => `<div class="cel"><input type="checkbox" class="ck" data-muda="rotina" data-id="${r.id}" data-dia="${d}" ${(r.marcas || []).includes(d) ? 'checked' : ''} ${d > h ? 'disabled' : ''} aria-label="${esc(r.titulo)}, ${DIAS[i]}"></div>`).join('')}`).join('')}
    </div></div>
    <div class="sep"></div><div class="rotulinho" style="margin-bottom:6px">Rotina semanal</div>
    ${D.rotinas.filter(r => r.freq === 'semanal').map(r => { const ok = (r.marcas || []).includes(seg); return `<div class="item"><input type="checkbox" class="ck" data-muda="rotina" data-id="${r.id}" data-dia="${seg}" ${ok ? 'checked' : ''} aria-label="${esc(r.titulo)}"><div class="tx"><b class="${ok ? 'feita' : ''}">${esc(r.titulo)}</b><small>Uma vez por semana</small></div><button class="x" style="font-size:16px" data-acao="tirar-rotina" data-id="${r.id}" aria-label="Remover rotina ${esc(r.titulo)}">×</button></div>`; }).join('') || '<div class="vazio">Nenhuma rotina semanal.</div>'}
  </div>`;
};

function modalAcao(a) {
  const novo = !a; a = a || { quem: primeiroNome(S.u.nome), prazo: R.somaDias(hoje(), 14) };
  abrirModal(novo ? 'Nova ação' : 'Editar ação', `<p class="mu" style="margin:0 0 12px;font-size:13px">Uma boa ação é pequena, tem um responsável e um prazo. Se ela parece grande, quebre em duas ou três.</p>
    <label class="rotulo" for="na-o">O que muda</label><details class="exemplo"><summary>Ver exemplo</summary><span>Em vez de "Melhorar a comunicação da equipe", escreva "Fazer reunião de 30 min com a equipe toda segunda, com pauta enviada na sexta".</span></details><input class="campo" id="na-o" value="${esc(a.oque || '')}" placeholder="Uma ação concreta, que dá para começar esta semana">
    <div class="duas"><div><label class="rotulo" for="na-q">Quem faz</label><input class="campo" id="na-q" value="${esc(a.quem || '')}"></div><div><label class="rotulo" for="na-p">Até quando</label><input class="campo" id="na-p" type="date" value="${esc(a.prazo || '')}"></div></div>
    <label style="display:flex;gap:10px;align-items:center;margin:2px 0 4px"><input type="checkbox" class="ck" id="na-m" ${a.pauta ? 'checked' : ''}> Quero discutir esta ação na mentoria em grupo</label>
    ${novo ? '' : '<div class="sep"></div><button type="button" class="link-discreto" data-acao="excluir-acao" data-id="' + a.id + '">Excluir esta ação</button>'}`,
  novo ? 'Adicionar' : 'Salvar', async () => {
    const dados = { oque: valor('na-o'), quem: valor('na-q'), prazo: valor('na-p'), pauta: $('#na-m').checked };
    if (!dados.oque) { toast('Descreva a ação.'); return false; }
    if (!dados.quem || !dados.prazo) { toast('Diga quem faz e até quando.'); return false; }
    if (novo) { const doc = { coacheeId: S.u.id, ...dados, ok: false, criada: hoje() }; const id = await col('acoes').adicionar(doc); C.D.acoes.push({ id, ...doc }); toast('Ação adicionada ao plano.'); }
    else { await col('acoes').salvar(a.id, dados); Object.assign(a, dados); toast('Ação atualizada.'); }
    render();
  });
}
const acao = id => C.D.acoes.find(a => a.id === id);
Object.assign(ACOES, {
  'nova-acao'() { modalAcao(null); },
  'editar-acao'(t) { modalAcao(acao(t.dataset.id)); },
  async 'excluir-acao'(t) { const a = acao(t.dataset.id); await col('acoes').remover(a.id); C.D.acoes = C.D.acoes.filter(x => x !== a); $('#modal').close(); toast('Ação excluída.'); render(); },
  async pauta(t) { const a = acao(t.dataset.id); a.pauta = !a.pauta; await col('acoes').salvar(a.id, { pauta: a.pauta }); toast(a.pauta ? 'Ação levada para a pauta da próxima mentoria em grupo.' : 'Ação retirada da pauta.'); render(); },
  'aula-plano'() {
    const it = C.L.find(i => i.chave === 'plano'); const m = $('#modal');
    m.innerHTML = `<div class="modal-cab"><h2>Como preencher seu plano de ação</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></div><div class="modal-corpo">${video(it.video, 'Ações pequenas, com responsável e prazo', it.dur)}<p class="mu" style="margin:12px 0 0;font-size:13px">Ações pequenas, com responsável e prazo. Se a ação parece grande, quebre em duas ou três.</p></div>`;
    m.querySelector('[data-fechar]').onclick = () => m.close(); m.showModal();
  },
  'nova-rotina'() {
    abrirModal('Nova rotina', `<label class="rotulo" for="nr-t">Rotina</label><input class="campo" id="nr-t" placeholder="Ex.: Revisar o caixa da semana"><label class="rotulo" for="nr-f">Frequência</label><select class="campo" id="nr-f"><option value="diaria">Diária</option><option value="semanal">Semanal</option></select>`, 'Adicionar', async () => {
      const titulo = valor('nr-t'); if (!titulo) { toast('Escreva a rotina.'); return false; }
      const doc = { coacheeId: S.u.id, titulo, freq: $('#nr-f').value, marcas: [] };
      const id = await col('rotinas').adicionar(doc); C.D.rotinas.push({ id, ...doc }); toast('Rotina adicionada ao planner.'); render();
    });
  },
  'tirar-rotina'(t) {
    const r = C.D.rotinas.find(x => x.id === t.dataset.id);
    confirmar('Remover rotina', `Remover "${esc(r.titulo)}" do planner? As marcações antigas deixam de contar.`, 'Remover', async () => { await col('rotinas').remover(r.id); C.D.rotinas = C.D.rotinas.filter(x => x !== r); render(); });
  }
});
MUDA.acao = async t => {
  const a = acao(t.dataset.id); a.ok = t.checked; a.okEm = a.ok ? hoje() : null;
  await col('acoes').salvar(a.id, { ok: a.ok, okEm: a.okEm }); toast(a.ok ? 'Ação concluída.' : 'Ação reaberta.'); render();
};
MUDA.rotina = async t => {
  const r = C.D.rotinas.find(x => x.id === t.dataset.id); const d = t.dataset.dia;
  const marcas = new Set(r.marcas || []); t.checked ? marcas.add(d) : marcas.delete(d);
  r.marcas = [...marcas].sort(); await col('rotinas').salvar(r.id, { marcas: r.marcas }); render();
};

/* ===================== Sessão individual avulsa (RF-27, RN-12) ===================== */
ACOES.sessao = () => {
  const preco = C.cfg.precoSessao ? `R$ ${esc(C.cfg.precoSessao)}` : 'Valor informado no link de pagamento';
  abrirModal('Comprar sessão individual', `
    <p style="margin:0 0 14px">Uma conversa de ${esc(C.cfg.duracaoSessao || 60)} minutos, só você e o seu coach, para destravar um ponto específico da sua jornada.</p>
    <div class="item" style="padding:10px 12px;margin-bottom:14px;background:var(--raised);border-radius:8px"><div class="tx"><b>Sessão avulsa · online</b><small>${preco}</small></div></div>
    <label class="rotulo" for="ss-m">Sobre o que você quer conversar?</label><textarea class="campo" id="ss-m" rows="3" placeholder="Ex.: estou travada para delegar e preciso de ajuda para montar a conversa com a equipe"></textarea>
    <label class="rotulo" for="ss-h">Melhores dias e horários</label><input class="campo" id="ss-h" placeholder="Ex.: terças e quintas de manhã">
    <p class="mu" style="font-size:12.5px;margin:0">O horário é uma preferência; ${esc(nomeCoach())} confirma depois do pagamento.</p>`,
  'Ir para o pagamento', async () => {
    const motivo = valor('ss-m'); if (!motivo) { $('#ss-m').focus(); toast('Conte em uma frase sobre o que você quer conversar.'); return false; }
    const doc = { coacheeId: S.u.id, nome: S.u.nome, email: S.u.email, motivo, horario: valor('ss-h') || 'A combinar', status: 'aguardando', data: hoje() };
    const id = await col('pedidos').adicionar(doc); C.pedidos.unshift({ id, ...doc });
    const link = urlSegura(C.cfg.pagSessao); if (link) window.open(link, '_blank', 'noopener');
    toast(link ? 'Pedido registrado. Conclua o pagamento na aba que abriu.' : 'Pedido registrado. A administração vai enviar o link de pagamento.'); render();
  });
};

/* ===================== Comunidade (RF-42, RF-43) ===================== */
VIEWS.coachee.comunidade = () => {
  const h = hoje(); const pe = proxEncontro(); const q = S.buscaMat.toLowerCase(); const ev = C.cfg.evento;
  const mats = C.materiais.filter(m => !q || [m.titulo, m.descricao, m.tags, m.tipo].join(' ').toLowerCase().includes(q));
  const forns = C.fornecedores.filter(f => !q || [f.titulo, f.area, f.descricao].join(' ').toLowerCase().includes(q));
  const inscrito = C.inscrito;
  return `
  <div class="topo"><div><div class="sobre">Aprender junto</div><h1>Comunidade</h1><div class="sub">Encontros em grupo, materiais, evento anual e a rede do programa.</div></div>${botaoWhats()}</div>
  ${pe ? `<div class="card ouro" style="margin-bottom:16px;display:flex;gap:18px;align-items:center;flex-wrap:wrap">${caixaData(pe.data)}<div style="flex:1;min-width:200px"><div class="rotulinho ouro-tx">Próxima ${pe.tipo === 'convidado' ? 'aula com convidado' : 'mentoria em grupo'}</div><div style="font-family:var(--f-display);font-size:26px;font-weight:600">${esc(pe.titulo)}</div><div class="mu">${br(pe.data)} às ${esc(pe.hora || '')}</div></div>${urlSegura(pe.link) ? `<a class="bt bt-ouro" href="${esc(pe.link)}" target="_blank" rel="noopener">Entrar na sala</a>` : ''}</div>` : ''}
  <div class="grade g-21" style="margin-bottom:16px">
    <div class="card"><h3>Encontros e gravações</h3><div class="lista">
      ${C.encontros.slice().reverse().map(e => `<div class="item">${caixaData(e.data)}<div class="tx"><b>${esc(e.titulo)}</b><small>${e.tipo === 'convidado' ? 'Aula com convidado' : 'Mentoria em grupo'} · ${esc(e.hora || '')}</small></div>${ytId(e.gravacao) ? `<button class="bt bt-linha bt-sm" data-acao="ver-gravacao" data-id="${e.id}">Ver gravação</button>` : e.data >= h ? '<span class="chip ouro">ao vivo</span>' : '<span class="chip">gravação em breve</span>'}</div>`).join('') || '<div class="vazio">Nenhum encontro ainda.</div>'}
    </div></div>
    ${ev && ev.titulo ? `<div class="card ouro"><h3>Evento presencial anual</h3>
      <div style="font-family:var(--f-display);font-size:26px;font-weight:600;line-height:1.1">${esc(ev.titulo)}</div>
      <p class="mu" style="margin:6px 0 14px">${ev.data ? br(ev.data) : 'Data a confirmar'} · ${esc(ev.local || 'local a confirmar')}<br>${esc(ev.descricao || '')}</p>
      ${inscrito ? '<span class="chip ok">Inscrição feita</span>' : '<button class="bt bt-ouro" data-acao="inscricao">Fazer inscrição</button>'}</div>` : ''}
  </div>
  <div class="ferramentas"><div class="busca"><input class="campo" id="busca-mat" placeholder="Buscar materiais e fornecedores" value="${esc(S.buscaMat)}" aria-label="Buscar">${svg('busca')}</div></div>
  <div class="card" style="margin-bottom:16px"><h3>Manuais, e-books e ferramentas <span class="mu acao num" style="font-size:12px;font-weight:500">${plural(mats.length, 'item', 'itens')}</span></h3>
    <div class="lista">${mats.length ? mats.map(m => `<div class="item"><span class="chip ouro" style="min-width:86px;justify-content:center">${esc(m.tipo)}</span><div class="tx"><b>${esc(m.titulo)}</b><small>${esc(m.descricao)}</small></div>${urlSegura(m.url) ? `<a class="bt bt-fantasma bt-sm" href="${esc(m.url)}" target="_blank" rel="noopener">Abrir</a>` : '<span class="chip">em breve</span>'}</div>`).join('') : '<div class="vazio">Nenhum material encontrado.</div>'}</div></div>
  <div class="card"><h3>Fornecedores e contatos indicados</h3>
    <div class="grade g4">${forns.length ? forns.map(f => `<div style="border:1px solid var(--line);border-radius:8px;padding:14px"><span class="chip">${esc(f.area)}</span><div style="font-weight:700;margin:8px 0 2px">${esc(f.titulo)}</div><div class="mu" style="font-size:12.5px">${esc(f.descricao)}</div>${f.contato ? `<div style="font-size:12.5px;margin-top:6px">${esc(f.contato)}</div>` : ''}</div>`).join('') : '<div class="vazio">Nenhum fornecedor encontrado.</div>'}</div></div>`;
};
Object.assign(ACOES, {
  'ver-gravacao'(t) {
    const e = C.encontros.find(x => x.id === t.dataset.id); const m = $('#modal');
    m.innerHTML = `<div class="modal-cab"><h2>${esc(e.titulo)}</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></div><div class="modal-corpo">${video(e.gravacao, e.titulo)}</div>`;
    m.style.width = 'min(860px,calc(100% - 32px))'; m.querySelector('[data-fechar]').onclick = () => m.close(); m.onclose = () => { m.style.width = ''; }; m.showModal();
  },
  async inscricao() {
    await col('inscricoes').salvar(S.u.id, { coacheeId: S.u.id, nome: S.u.nome, evento: C.cfg.evento.titulo, data: hoje() });
    C.inscrito = true; toast('Inscrição feita. A organização confirma os detalhes pelo grupo.'); render();
  }
});
