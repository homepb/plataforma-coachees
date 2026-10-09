// Telas e ações do coach: Hoje · Minhas pessoas · Encontros em grupo · O que eu ensino.

const STATUS = { ok: ['ok', 'Em dia'], atencao: ['warn', 'Atenção'], parado: ['bad', 'Parado'], novo: ['ouro', 'Novo'], renovar: ['warn', 'Renovação'], vencido: ['bad', 'Encerrado'] };
const chipSt = st => `<span class="chip ${STATUS[st][0]}"><span class="p"></span>${STATUS[st][1]}</span>`;
const quando = d => { const n = R.dias(d, hoje()); return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`; };
const tituloItem = id => (C.L.find(i => i.id === id) || {}).titulo || id;

// Avisos por e-mail (EmailJS). Sem EmailJS configurado, o coach copia o texto e manda no grupo do WhatsApp.
async function avisar(pessoas, assunto, mensagem) {
  const ej = C.cfg.emailjs || {};
  if (!ej.servico || !ej.modeloAviso) {
    try { await navigator.clipboard.writeText(`${assunto}\n\n${mensagem}`); toast('E-mail não configurado: o aviso foi copiado. Cole no grupo do WhatsApp.'); } catch (e) { toast('Configure o EmailJS em Ajustes para enviar avisos por e-mail.'); }
    return;
  }
  let n = 0;
  for (const p of pessoas) { if (await Dados.enviarEmail(ej, ej.modeloAviso, { to_email: p.email, to_name: primeiroNome(p.nome), assunto, mensagem })) n++; }
  toast(`Aviso enviado por e-mail para ${plural(n, 'pessoa', 'pessoas')}.`);
}

// Respostas recentes (14 dias) que ainda não têm comentário do coach.
function respostasNovas() {
  const lim = R.somaDias(hoje(), -14); const out = [];
  (C.carteira || []).forEach(({ u, D }) => {
    Object.values(D.progresso).forEach(p => {
      const it = C.L.find(i => i.id === p.itemId); if (!it || D.comentarios[p.itemId]) return;
      const d = p.respondidoEm || p.data; if (!d || d < lim) return;
      if (it.tipo === 'aula' && p.respostas && p.respostas[0]) out.push({ u, alvo: it.id, data: d, titulo: it.titulo, texto: p.respostas[0] });
      if (it.tipo === 'passo' && p.ok) out.push({ u, alvo: it.id, data: d, titulo: `Passo ${it.k + 1}: ${it.titulo}`, texto: it.chave === 'meta' ? p.respostas[0] : 'Passo concluído. Veja as respostas na ficha.' });
    });
    Object.values(D.respostas).forEach(r => { if (r.data >= lim && !D.comentarios['pergunta:' + r.perguntaId]) out.push({ u, alvo: 'pergunta:' + r.perguntaId, data: r.data, titulo: 'Pergunta da semana', texto: r.texto }); });
    D.vitorias.forEach(v => { if (v.data >= lim && !D.comentarios['vitoria:' + v.id]) out.push({ u, alvo: 'vitoria:' + v.id, data: v.data, titulo: 'Pequena vitória', texto: v.texto }); });
    Object.values(D.paradas).forEach(p => { if (p.data >= lim && !D.comentarios['parada:' + p.n]) out.push({ u, alvo: 'parada:' + p.n, data: p.data, titulo: `Parada ${p.n}`, texto: p.respostas[2] }); });
  });
  return out.sort(recente);
}

/* ===================== Hoje ===================== */
VIEWS.coach.painel = () => {
  const h = hoje(); const cart = C.carteira || [];
  const prec = R.precisam(cart, C.pedidos, h); const novas = respostasNovas();
  const media = cart.length ? Math.round(cart.reduce((s, c) => s + R.pct(C.L, c.D), 0) / cart.length) : 0;
  const pe = C.encontros.find(e => e.data >= h); const m = C.mensagens[0]; const q = C.perguntas[0];
  const ouviram = m ? C.ouvidasCarteira.filter(o => o.msgId === m.id).length : 0;
  const respQ = q ? cart.filter(c => c.D.respostas[q.id]) : [];
  return `
  <div class="topo"><div><div class="sobre">Hoje · ${hojeExtenso()}</div><h1>${new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(primeiroNome(S.u.nome))}</h1><div class="sub">${plural(cart.length, 'pessoa', 'pessoas')} em acompanhamento</div></div>
    <button class="bt bt-ouro" data-acao="encontro">+ Agendar mentoria</button></div>
  <div class="grade g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="v num">${novas.length}</div><div class="l">respostas novas para comentar</div></div>
    <div class="card kpi"><div class="v num">${new Set(prec.map(p => p.coacheeId)).size}</div><div class="l">pessoas precisando de você</div></div>
    <div class="card kpi"><div class="v num">${media}<small>%</small></div><div class="l">progresso médio na jornada</div></div>
    <div class="card kpi"><div class="v num">${pe ? R.dias(h, pe.data) : '—'}<small>${pe ? 'dias' : ''}</small></div><div class="l">${pe ? 'para a próxima mentoria em grupo' : 'nenhuma mentoria agendada'}</div></div>
  </div>
  <div class="grade g-21">
    <div class="card"><h3>Precisam de você</h3>
      <p class="mu" style="font-size:12.5px;margin:-4px 0 6px">Montado automaticamente: pedidos de sessão, ações atrasadas, dias sem acesso e renovação próxima.</p><div class="lista">
      ${prec.map(x => { const c = daCarteira(x.coacheeId); if (!c) return ''; return x.tipo === 'pedido'
        ? `<div class="item clicavel" tabindex="0" data-ir="ficha" data-p="${c.u.id}">${av(c.u)}<div class="tx"><b>${esc(c.u.nome)}</b><small>Pediu uma sessão individual (${x.pedido.status === 'pago' ? 'pago' : 'aguardando pagamento'}): "${esc(x.pedido.motivo)}" · ${esc(x.pedido.horario)}</small></div><span class="chip ouro"><span class="p"></span>Pediu sessão</span></div>`
        : `<div class="item clicavel" tabindex="0" data-ir="ficha" data-p="${c.u.id}">${av(c.u)}<div class="tx"><b>${esc(c.u.nome)}</b><small>${esc(x.nota)}</small></div>${chipSt(x.st)}</div>`; }).join('') || '<div class="vazio">Ninguém precisando de atenção agora.</div>'}
    </div>
    <div class="sep"></div>
    <h3 style="margin-top:4px">Respostas novas</h3>
    <div class="lista">${novas.slice(0, 8).map(n => `<div class="item" style="align-items:flex-start">${av(n.u)}<div class="tx"><b>${esc(n.u.nome)} · ${esc(n.titulo)}</b><small>"${esc(String(n.texto).slice(0, 160))}"</small></div><button class="bt bt-linha bt-sm" data-acao="comentar" data-c="${n.u.id}" data-alvo="${esc(n.alvo)}">Comentar</button></div>`).join('') || '<div class="vazio">Tudo comentado.</div>'}</div></div>
    <div class="card"><h3>Próximos encontros <button class="bt bt-fantasma bt-sm acao" data-ir="encontros">Ver todos</button></h3><div class="lista">
      ${C.encontros.filter(e => e.data >= h).slice(0, 3).map(e => `<div class="item">${caixaData(e.data)}<div class="tx"><b>${e.tipo === 'convidado' ? 'Aula com convidado' : 'Mentoria em grupo'}</b><small>${esc(e.hora || '')} · ${esc(e.titulo)}</small></div><button class="bt bt-linha bt-sm" data-acao="avisar-encontro" data-id="${e.id}">Avisar</button></div>`).join('') || '<div class="vazio">Nenhum encontro agendado.</div>'}
    </div>
    <div class="sep"></div>
    <h3>Sua presença esta semana <button class="bt bt-fantasma bt-sm acao" data-ir="ensino">Gerenciar</button></h3>
    <div class="item" style="align-items:flex-start"><div class="tx"><b>${m ? `Mensagem: ${esc(m.titulo)}` : 'Nenhuma mensagem publicada'}</b><small>${m ? `Publicada em ${brc(m.data)} · ouvida por ${ouviram} de ${cart.length} da sua carteira` : 'Grave a primeira mensagem da semana.'}</small></div><button class="bt bt-linha bt-sm" data-acao="mensagem">Nova</button></div>
    <div class="item" style="align-items:flex-start"><div class="tx"><b>${q ? `Pergunta: ${esc(q.texto)}` : 'Nenhuma pergunta publicada'}</b><small>${q ? plural(respQ.length, 'resposta', 'respostas') : ''}</small>
      ${respQ.slice(0, 3).map(c => `<div style="margin-top:6px;padding:8px 10px;background:var(--raised);border-radius:8px;font-size:12.5px"><b>${esc(c.u.nome)}:</b> ${esc(c.D.respostas[q.id].texto)}</div>`).join('')}</div><button class="bt bt-linha bt-sm" data-acao="pergunta">Nova</button></div>
    </div>
  </div>`;
};

/* ===================== Minhas pessoas (RF-51) ===================== */
VIEWS.coach.pessoas = () => {
  const h = hoje(); const q = S.busca.toLowerCase();
  const lista = (C.carteira || []).map(c => ({ ...c, s: R.situacao(c.u, c.D, h), prox: R.proximo(C.L, c.D) }))
    .filter(c => (S.filtro === 'todos' || c.s.st === S.filtro) && (!q || c.u.nome.toLowerCase().includes(q)));
  return `
  <div class="topo"><div><div class="sobre">Quem você acompanha</div><h1>Minhas pessoas</h1></div></div>
  <div class="ferramentas">
    <div class="busca"><input class="campo" id="busca" placeholder="Buscar por nome" value="${esc(S.busca)}" aria-label="Buscar coachee">${svg('busca')}</div>
    <select class="campo" data-muda="filtro" aria-label="Filtrar por situação">${[['todos', 'Todas as situações'], ['ok', 'Em dia'], ['atencao', 'Atenção'], ['parado', 'Parados'], ['renovar', 'Renovação'], ['novo', 'Novos']].map(([v, l]) => `<option value="${v}" ${S.filtro === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
  </div>
  <div class="card" style="padding-top:6px"><div class="tabela-wrap"><table>
    <thead><tr><th>Coachee</th><th>Acesso até</th><th>Trilha</th><th style="width:170px">Progresso</th><th>Último acesso</th><th>Situação</th></tr></thead>
    <tbody>${lista.map(c => { const p = R.pct(C.L, c.D); return `<tr class="clicavel" tabindex="0" data-ir="ficha" data-p="${c.u.id}">
      <td><div class="pessoa">${av(c.u)}<div><b>${esc(c.u.nome)}</b><small>${esc(c.u.cargo || '')}</small></div></div></td>
      <td class="num mu">${br(c.u.fim)}</td><td>${c.prox ? `Trilha ${esc(c.prox.t.n)}` : 'Concluída'}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="barra" style="flex:1"><b style="width:${p}%"></b></div><span class="num mu" style="font-size:12px">${p}%</span></div></td>
      <td class="mu">${c.u.ultimoAcesso ? quando(c.u.ultimoAcesso) : 'ainda não acessou'}</td><td>${chipSt(c.s.st)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="vazio">Nenhum coachee com esse filtro.</td></tr>'}</tbody>
  </table></div></div>`;
};
MUDA.filtro = t => { S.filtro = t.value; render(); };

/* ===================== Ficha do coachee (RF-52, RF-53) ===================== */
const botaoComentar = (cid, alvo, D) => `<button class="bt bt-linha bt-sm" data-acao="comentar" data-c="${cid}" data-alvo="${esc(alvo)}">${D.comentarios[alvo] ? 'Editar comentário' : 'Comentar'}</button>`;
const seuComentario = (D, alvo) => D.comentarios[alvo] ? `<div style="margin-top:6px;font-size:12.5px"><span class="ouro-tx">Seu comentário:</span> ${esc(D.comentarios[alvo].texto)}</div>` : '';

VIEWS.coach.ficha = () => {
  const c = daCarteira(S.p); if (!c) return '<div class="card">Coachee não encontrado na sua carteira.</div>';
  const { u, D } = c; const h = hoje(); const s = R.situacao(u, D, h); const Pp = R.paradas(u, D, h);
  if (!C.anotacao || C.anotacao.id !== u.id) {
    C.anotacao = { id: u.id, texto: '' };
    col('anotacoes').obter(u.id).then(d => { if (d && C.anotacao.id === u.id) { C.anotacao.texto = d.texto; render(); } }).catch(falha);
  }
  const prox = R.proximo(C.L, D); const pc = R.pct(C.L, D); const m = R.meta(C.L, D);
  const abas = [['geral', 'Visão geral'], ['acao', 'Plano de ação'], ['evolucao', 'Evolução'], ['assess', 'Assessments'], ['respostas', 'Respostas']];
  let corpo = '';
  if (S.aba === 'geral') {
    const ult7 = R.somaDias(h, -6); const diarias = D.rotinas.filter(r => r.freq === 'diaria');
    const rot = diarias.length ? Math.round(diarias.reduce((n, r) => n + (r.marcas || []).filter(d => d >= ult7 && d <= h).length, 0) / (diarias.length * 7) * 100) : null;
    const disc = R.historico(D, 'disc').pop();
    const ped = C.pedidos.filter(p => p.coacheeId === u.id && p.status !== 'agendado' && p.status !== 'cancelado');
    corpo = `
    ${ped.map(p => `<div class="card ouro" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><div class="rotulinho ouro-tx">Pedido de sessão individual · ${p.status === 'pago' ? 'pago' : 'aguardando pagamento'}</div><b>"${esc(p.motivo)}"</b><div class="mu" style="font-size:12.5px">Preferência: ${esc(p.horario)} · pedido em ${br(p.data)}</div></div>${p.status === 'pago' ? `<button class="bt bt-ouro bt-sm" data-acao="agendar-sessao" data-id="${p.id}">Marcar como agendada</button>` : ''}</div>`).join('')}
    <div class="grade g4" style="margin-bottom:16px">
      <div class="card kpi"><div class="v num">${pc}<small>%</small></div><div class="l">${prox ? `Trilha ${esc(prox.t.n)} em andamento` : 'Jornada concluída'}</div><div class="barra" style="margin-top:10px"><b style="width:${pc}%"></b></div></div>
      <div class="card kpi"><div class="v num">${R.sequencia(C.L, D, u, h)}</div><div class="l">semanas seguidas em movimento</div></div>
      <div class="card kpi"><div class="v num">${D.acoes.filter(a => !a.ok).length}</div><div class="l">ações em aberto ${D.acoes.some(a => R.atrasada(a, h)) ? `<span class="chip bad">${D.acoes.filter(a => R.atrasada(a, h)).length} atrasada(s)</span>` : ''}</div></div>
      <div class="card kpi"><div class="v num">${rot === null ? '—' : rot}<small>${rot === null ? '' : '%'}</small></div><div class="l">das rotinas diárias feitas nos últimos 7 dias</div></div>
    </div>
    ${m ? `<div class="card meta-card" style="margin-bottom:16px"><div class="rotulinho ouro-tx">Meta para 2027</div><div class="meta-txt" style="font-size:24px">${esc(m.meta)}</div><div class="meta-pq"><span><b>Por que importa:</b> ${esc(m.porque)}</span><span><b>Como vai saber:</b> ${esc(m.indicador)}</span></div></div>` : ''}
    <div class="grade g2">
      <div class="card"><h3>Acompanhamento</h3><div class="lista">
        <div class="item"><div class="tx"><b>Perfil DISC</b><small>${disc ? (() => { const o = Object.entries(disc.r).sort((a, b) => b[1] - a[1]); return `${CONTEUDO.DISC[o[0][0]][0]} com ${CONTEUDO.DISC[o[1][0]][0]}`; })() : 'Teste ainda não registrado'}</small></div></div>
        <div class="item"><div class="tx"><b>Próximo item</b><small>${prox ? esc(prox.titulo) : 'Jornada concluída'}</small></div></div>
        <div class="item"><div class="tx"><b>Último acesso</b><small>${u.ultimoAcesso ? `${br(u.ultimoAcesso)} (${quando(u.ultimoAcesso)})` : 'Ainda não acessou'}</small></div>${s.st === 'parado' ? `<button class="bt bt-fantasma bt-sm" data-acao="lembrar" data-c="${u.id}">Lembrar</button>` : ''}</div>
      </div></div>
      <div class="card"><h3>Plano e acesso</h3><div class="lista">
        <div class="item"><div class="tx"><b>Plano Master</b><small>12 meses · plataforma, mentoria em grupo mensal e grupo no WhatsApp</small></div></div>
        <div class="item"><div class="tx"><b>Período</b><small class="num">${br(u.inicio)} a ${br(u.fim)}</small></div>${chipSt(s.st === 'renovar' || s.st === 'vencido' ? s.st : 'ok')}</div>
        <div class="item" style="align-items:flex-start"><div class="tx"><b>Anotações do coach</b><small style="white-space:pre-wrap">${esc(C.anotacao.texto) || 'Sem anotações. Só os coaches veem.'}</small></div><button class="bt bt-fantasma bt-sm" data-acao="anotacao" data-c="${u.id}">Editar</button></div>
      </div></div>
    </div>`;
  }
  if (S.aba === 'acao') corpo = `
    <div class="card"><h3>Plano de ação do coachee</h3>
      ${D.acoes.length ? `<div class="tabela-wrap"><table><thead><tr><th>O que muda</th><th>Quem faz</th><th>Até quando</th><th>Situação</th><th>Mentoria</th></tr></thead>
      <tbody>${D.acoes.map(a => `<tr><td class="${a.ok ? 'feita' : ''}"><b>${esc(a.oque)}</b></td><td>${esc(a.quem)}</td><td class="num">${br(a.prazo)}</td><td>${a.ok ? '<span class="chip ok">feita</span>' : R.atrasada(a, h) ? '<span class="chip bad">atrasada</span>' : '<span class="chip">em aberto</span>'}</td><td>${a.pauta && !a.ok ? '<span class="chip ouro">na pauta</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma ação cadastrada ainda.</div>'}
      <div class="sep"></div><p class="mu" style="font-size:12.5px;margin:0">O plano de ação é montado pelo coachee no passo 8 da jornada e em Na prática. Você orienta pela aula, pelos exemplos e nas mentorias em grupo.</p>
    </div>`;
  if (S.aba === 'evolucao') {
    const ins = R.insignias(C.L, D, u, h).filter(i => i.ok);
    const cam = R.percurso(C.L, D, u).filter(e => !e.rotina).slice(0, 10);
    corpo = `
    <div class="card" style="margin-bottom:16px"><h3>Insígnias e ritmo <span class="mu acao num" style="font-size:12px;font-weight:500">${ins.length} de 15 · ${R.sequencia(C.L, D, u, h)} semanas seguidas</span></h3>${ins.length ? `<div class="insignias">${ins.map(i => `<div class="insig"><span class="med">${esc(i.g)}</span><b>${esc(i.t)}</b></div>`).join('')}</div>` : '<div class="vazio">Nenhuma insígnia ainda.</div>'}</div>
    <div class="card" style="margin-bottom:16px"><h3>Paradas trimestrais</h3><div class="lista">
      ${Pp.map(p => `<div class="item" style="align-items:flex-start">${caixaData(p.data)}<div class="tx"><b>Parada ${p.n} · ${p.n * 3} meses</b>${p.reg ? CONTEUDO.PERGUNTAS_PARADA.map((q, k) => `<small style="display:block"><span class="mu">${esc(q)}</span> ${esc(p.reg.respostas[k])}</small>`).join('') + seuComentario(D, 'parada:' + p.n) : `<small>${p.st === 'aberto' ? 'Aberta, aguardando o registro do coachee' : `Abre em ${br(p.abre)}`}</small>`}</div>${p.reg ? botaoComentar(u.id, 'parada:' + p.n, D) : p.st === 'aberto' ? `<button class="bt bt-fantasma bt-sm" data-acao="lembrar" data-c="${u.id}">Lembrar</button>` : ''}</div>`).join('')}
    </div></div>
    <div class="card"><h3>Caminho recente</h3><div class="lista">${cam.map(e => `<div class="item" style="align-items:flex-start"><div class="tx"><b style="font-weight:600">${esc(e.texto)}</b><small class="num">${br(e.data)}</small>${e.id ? seuComentario(D, 'vitoria:' + e.id) : ''}</div><span class="chip">${e.tipo}</span>${e.id ? `<button class="bt bt-fantasma bt-sm" data-acao="comentar" data-c="${u.id}" data-alvo="vitoria:${e.id}">${D.comentarios['vitoria:' + e.id] ? 'Editar' : 'Reconhecer'}</button>` : ''}</div>`).join('')}</div></div>`;
  }
  if (S.aba === 'assess') corpo = `<div class="grade g3">${['disc', 'ie', 'a360'].map(k => cartaoAssess(k, D, true, Pp)).join('')}</div>
    <p class="mu" style="font-size:12.5px;margin-top:10px">Os assessments são refeitos a cada parada trimestral. Quando houver mais de um resultado, a comparação aparece aqui.</p>`;
  if (S.aba === 'respostas') {
    const itens = C.L.filter(i => D.progresso[i.id] && (i.tipo === 'passo' ? D.progresso[i.id].ok : D.progresso[i.id].respostas));
    const mostra = (it, r) => {
      if (it.chave === 'areas') return CONTEUDO.AREAS.map((a, k) => `${esc(a)}: <b>${esc(r[k])}</b>`).join(' · ');
      if (it.chave === 'plano') return (r.acoes || []).map(a => `• ${esc(a.oque)} (${esc(a.quem)}, até ${br(a.prazo)})`).join('<br>') + ((it.campos || []).length ? `<br>${esc(r[0] || '')}` : '');
      if (it.tipo === 'aula') return `"${esc(r[0])}"`;
      return (it.campos || []).map((c, k) => `<span class="mu">${esc(c.rotulo)}</span><br>${esc(r[k] || '').replace(/\n/g, '<br>')}`).join('<br>');
    };
    const perg = C.perguntas.filter(q => D.respostas[q.id]);
    corpo = `<div class="card"><h3>Respostas dos exercícios e passos</h3><div class="lista">
      ${itens.map(it => `<div class="item" style="align-items:flex-start"><span class="chip ouro">Trilha ${esc(it.t.n)}</span><div class="tx"><b>${esc(it.titulo)}</b><small>${esc(it.exercicio || it.sub || '')}</small><div style="margin-top:6px;padding:10px 12px;background:var(--raised);border-radius:8px;font-size:13px">${mostra(it, D.progresso[it.id].respostas || {})}</div>${seuComentario(D, it.id)}</div>${botaoComentar(u.id, it.id, D)}</div>`).join('') || '<div class="vazio">Nenhuma resposta ainda.</div>'}
      </div></div>
      <div class="card" style="margin-top:16px"><h3>Pergunta da semana</h3><div class="lista">
      ${perg.map(q => `<div class="item" style="align-items:flex-start"><div class="tx"><b>${esc(q.texto)}</b><div style="margin-top:6px;padding:10px 12px;background:var(--raised);border-radius:8px;font-size:13px">"${esc(D.respostas[q.id].texto)}"</div>${seuComentario(D, 'pergunta:' + q.id)}</div>${botaoComentar(u.id, 'pergunta:' + q.id, D)}</div>`).join('') || '<div class="vazio">Nenhuma resposta à pergunta da semana ainda.</div>'}</div></div>`;
  }
  return `
  <div class="topo"><div style="display:flex;gap:14px;align-items:center">${av(u, '', 'width:52px;height:52px;font-size:16px;')}<div><div class="sobre">${esc(u.cargo || 'Coachee')}</div><h1>${esc(u.nome)}</h1></div></div>
    <div style="display:flex;gap:8px;align-items:center">${chipSt(s.st)}<button class="bt bt-fantasma" data-ir="pessoas">← Minhas pessoas</button></div></div>
  <div class="abas" role="tablist">${abas.map(([k, l]) => `<button role="tab" data-aba="${k}" aria-selected="${S.aba === k}">${l}</button>`).join('')}</div>
  ${corpo}`;
};

Object.assign(ACOES, {
  comentar(t) {
    const c = daCarteira(t.dataset.c); const alvo = t.dataset.alvo; const atual = c.D.comentarios[alvo];
    const rotulo = alvo.startsWith('pergunta:') ? 'Pergunta da semana' : alvo.startsWith('vitoria:') ? 'Pequena vitória' : alvo.startsWith('parada:') ? `Parada ${alvo.split(':')[1]}` : tituloItem(alvo);
    abrirModal(alvo.startsWith('vitoria:') ? 'Reconhecer a vitória' : 'Comentar a resposta', `<p class="mu" style="margin:0 0 10px">${esc(c.u.nome)} · ${esc(rotulo)}</p><label class="rotulo" for="cm-t">Seu comentário</label><textarea class="campo" id="cm-t" rows="4">${esc(atual ? atual.texto : '')}</textarea>`, 'Enviar comentário', async () => {
      const texto = valor('cm-t'); if (!texto) { toast('Escreva o comentário.'); return false; }
      const doc = { coacheeId: c.u.id, alvo, texto, data: hoje(), autorId: S.u.id };
      await col('comentarios').salvar(`${c.u.id}_${alvo}`, doc); c.D.comentarios[alvo] = doc;
      toast(`Comentário enviado. ${primeiroNome(c.u.nome)} vê junto da resposta.`); render();
    });
  },
  anotacao(t) {
    const c = daCarteira(t.dataset.c);
    abrirModal('Anotações do coach', `<p class="mu" style="margin:0 0 10px;font-size:13px">Privadas: só os coaches veem. ${esc(c.u.nome)} não tem acesso.</p><textarea class="campo" id="an-t" rows="8">${esc(C.anotacao.texto)}</textarea>`, 'Salvar', async () => {
      const texto = valor('an-t'); await col('anotacoes').salvar(c.u.id, { coacheeId: c.u.id, texto, data: hoje() }); C.anotacao = { id: c.u.id, texto }; toast('Anotação salva.'); render();
    });
  },
  lembrar(t) {
    const c = daCarteira(t.dataset.c);
    avisar([c.u], `${primeiroNome(c.u.nome)}, sua jornada está esperando`, `Oi, ${primeiroNome(c.u.nome)}! Passando para lembrar da sua jornada no ${nomePrograma()}. Que tal dar um passo hoje? ${location.origin}${location.pathname}`);
  },
  async 'agendar-sessao'(t) { const p = C.pedidos.find(x => x.id === t.dataset.id); await col('pedidos').salvar(p.id, { status: 'agendado' }); p.status = 'agendado'; toast('Sessão marcada como agendada.'); render(); }
});

/* ===================== Encontros em grupo (RF-54) ===================== */
VIEWS.coach.encontros = () => {
  const h = hoje(); const pe = C.encontros.find(e => e.data >= h);
  const pauta = (C.carteira || []).flatMap(c => c.D.acoes.filter(a => a.pauta && !a.ok).map(a => ({ c, a })));
  return `
  <div class="topo"><div><div class="sobre">Mentorias e convidados</div><h1>Encontros em grupo</h1></div><button class="bt bt-ouro" data-acao="encontro">+ Agendar mentoria</button></div>
  <div class="card ouro" style="margin-bottom:16px"><h3>Pauta da próxima mentoria${pe ? ` · ${brc(pe.data)}` : ''} <span class="mu acao" style="font-size:12px;font-weight:500">ações que os coachees querem discutir</span></h3><div class="lista">
    ${pauta.map(({ c, a }) => `<div class="item"><div class="tx"><b>${esc(a.oque)}</b><small>${esc(c.u.nome)} · ${esc(a.quem)} · até ${brc(a.prazo)}</small></div></div>`).join('') || '<div class="vazio">Nenhuma ação na pauta ainda.</div>'}
  </div></div>
  <div class="card"><h3>Calendário</h3><div class="lista">
    ${C.encontros.slice().reverse().map(e => `<div class="item">${caixaData(e.data)}<div class="tx"><b>${esc(e.titulo)}</b><small>${e.tipo === 'convidado' ? 'Aula com convidado' : 'Mentoria em grupo'} · ${esc(e.hora || '')} · todos os coachees</small></div>
      ${e.data < h ? (ytId(e.gravacao) ? '<span class="chip ok">gravação publicada</span>' : '<span class="chip warn">sem gravação</span>') : `<button class="bt bt-linha bt-sm" data-acao="avisar-encontro" data-id="${e.id}">Avisar</button>`}
      <button class="bt bt-fantasma bt-sm" data-acao="encontro" data-id="${e.id}">Editar</button></div>`).join('') || '<div class="vazio">Nenhum encontro agendado.</div>'}
  </div>
  <div class="sep"></div><p class="mu" style="font-size:12.5px;margin:0">Depois do encontro, abra "Editar" e cole o link da gravação no YouTube (não listado). Ela aparece na Comunidade de todos os coachees.</p></div>`;
};
Object.assign(ACOES, {
  encontro(t) {
    const e = C.encontros.find(x => x.id === t.dataset.id) || { tipo: 'mentoria', hora: '19:00', link: C.cfg.sala || '', data: '' };
    abrirModal(e.id ? 'Editar encontro' : 'Agendar mentoria', `<label class="rotulo" for="en-tipo">Tipo</label><select class="campo" id="en-tipo"><option value="mentoria" ${e.tipo === 'mentoria' ? 'selected' : ''}>Mentoria em grupo</option><option value="convidado" ${e.tipo === 'convidado' ? 'selected' : ''}>Aula com convidado</option></select>
      <label class="rotulo" for="en-tit">Tema</label><input class="campo" id="en-tit" value="${esc(e.titulo || '')}" placeholder="Ex.: Reuniões que geram decisão">
      <div class="duas"><div><label class="rotulo" for="en-d">Data</label><input class="campo" id="en-d" type="date" value="${esc(e.data)}"></div><div><label class="rotulo" for="en-h">Horário</label><input class="campo" id="en-h" type="time" value="${esc(e.hora)}"></div></div>
      <label class="rotulo" for="en-l">Link da sala</label><input class="campo" id="en-l" value="${esc(e.link || '')}" placeholder="https://meet.google.com/…">
      <label class="rotulo" for="en-g">Link da gravação no YouTube (depois do encontro)</label><input class="campo" id="en-g" value="${esc(e.gravacao || '')}" placeholder="https://youtu.be/…">
      ${e.id ? `<button type="button" class="link-discreto" data-acao="excluir-encontro" data-id="${e.id}">Excluir este encontro</button>` : ''}`,
    e.id ? 'Salvar' : 'Agendar', async () => {
      const d = { tipo: valor('en-tipo'), titulo: valor('en-tit'), data: valor('en-d'), hora: valor('en-h'), link: valor('en-l'), gravacao: valor('en-g') };
      if (!d.titulo || !d.data) { toast('Informe o tema e a data.'); return false; }
      if (d.gravacao && !ytId(d.gravacao)) { toast('O link da gravação precisa ser do YouTube.'); return false; }
      if (e.id) { await col('encontros').salvar(e.id, d); Object.assign(e, d); } else { const id = await col('encontros').adicionar(d); C.encontros.push({ id, ...d }); }
      C.encontros.sort((a, b) => a.data.localeCompare(b.data));
      toast(e.id ? 'Encontro atualizado.' : 'Encontro agendado. Ele já aparece para todos os coachees.'); render();
    });
  },
  async 'excluir-encontro'(t) { await col('encontros').remover(t.dataset.id); C.encontros = C.encontros.filter(e => e.id !== t.dataset.id); $('#modal').close(); toast('Encontro excluído.'); render(); },
  'avisar-encontro'(t) {
    const e = C.encontros.find(x => x.id === t.dataset.id);
    avisar((C.carteira || []).map(c => c.u), `${e.tipo === 'convidado' ? 'Aula com convidado' : 'Mentoria em grupo'}: ${e.titulo}`,
      `${br(e.data)} às ${e.hora}. ${e.titulo}.${e.link ? ` Sala: ${e.link}` : ''}`);
  }
});

/* ===================== O que eu ensino (RF-55 a RF-58) ===================== */
VIEWS.coach.ensino = () => {
  const m = C.mensagens[0]; const q = C.perguntas[0];
  const ids = new Set((C.carteira || []).map(c => c.u.id)); const total = ids.size;
  const ouvida = id => C.ouvidasCarteira.filter(o => o.msgId === id).length;
  const respQ = q ? (C.carteira || []).filter(c => c.D.respostas[q.id]) : [];
  const trilhas = Object.values(C.trilhas).sort((a, b) => a.ordem - b.ordem);
  return `
  <div class="topo"><div><div class="sobre">Tudo o que você publica aqui vale para todos os coachees</div><h1>O que eu ensino</h1></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="bt bt-linha" data-acao="mensagem">+ Mensagem da semana</button><button class="bt bt-ouro" data-acao="aula">+ Nova aula</button></div></div>
  <div class="grade g2" style="margin-bottom:16px">
    <div class="card"><h3>Mensagem da semana <span class="chip ouro acao">vai para todos</span></h3>
      ${m ? `${urlSegura(m.audio) ? `<audio controls preload="none" src="${esc(m.audio)}"></audio>` : '<p class="mu" style="font-size:12.5px;margin:0">Sem áudio anexado.</p>'}
      <b style="display:block;margin-top:10px">${esc(m.titulo)}</b><p class="mu" style="margin:4px 0 6px;font-size:13px">${esc(m.texto)}</p>
      <small class="mu num">Publicada em ${brc(m.data)} · ouvida por ${ouvida(m.id)} de ${total} da sua carteira</small>` : '<p class="mu">Nenhuma mensagem publicada ainda.</p>'}
      ${C.mensagens.length > 1 ? `<div class="sep"></div><div class="rotulinho" style="margin-bottom:4px">Mensagens anteriores</div>
      <div class="lista">${C.mensagens.slice(1, 6).map(x => `<div class="item" style="padding:8px 0"><span class="chip">${esc(x.dur || '—')}</span><div class="tx"><b style="font-weight:600">${esc(x.titulo)}</b><small class="num">${brc(x.data)} · ouvida por ${ouvida(x.id)}</small></div></div>`).join('')}</div>` : ''}
      <button class="bt bt-linha bt-sm" data-acao="mensagem" style="margin-top:10px">+ Gravar ou enviar nova mensagem</button></div>
    <div class="card"><h3>Pergunta da semana <span class="chip ouro acao">vai para todos</span></h3>
      ${q ? `<div style="font-family:var(--f-display);font-size:22px;font-weight:600;line-height:1.2;margin-bottom:8px">${esc(q.texto)}</div>
      <small class="mu num">${plural(respQ.length, 'resposta', 'respostas')} da sua carteira. Cada resposta é vista só pelo coach responsável.</small>
      <div class="lista" style="margin-top:6px">${respQ.map(c => `<div class="item" style="align-items:flex-start;padding:8px 0"><div class="tx"><b style="font-weight:600">${esc(c.u.nome)}</b><small>${esc(c.D.respostas[q.id].texto)}</small></div>${botaoComentar(c.u.id, 'pergunta:' + q.id, c.D)}</div>`).join('')}</div>` : '<p class="mu">Nenhuma pergunta publicada ainda.</p>'}
      <button class="bt bt-linha bt-sm" data-acao="pergunta" style="margin-top:10px">+ Nova pergunta</button></div>
  </div>
  <div class="grade g2">
    ${trilhas.map(t => { const its = Object.entries(C.itens).map(([id, i]) => ({ id, ...i })).filter(i => i.trilhaId === t.id).sort((a, b) => a.ordem - b.ordem);
      return `<div class="card"><h3>Trilha ${esc(t.n)} · ${esc(t.titulo)} ${t.sequencial ? '' : `<button class="bt bt-fantasma bt-sm acao" data-acao="aula" data-trilha="${t.id}">+ Aula</button>`}</h3>
      ${its.map((it, i) => `<div class="aula"><span class="ordem">${t.sequencial ? '' : `<button data-acao="mover" data-id="${it.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button data-acao="mover" data-id="${it.id}" data-d="1" ${i === its.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>`}</span><span style="flex:1;min-width:0">${esc(it.titulo)}${it.oculto ? ' <span class="chip">oculta</span>' : ''}<br><small class="mu">${ytId(it.video) ? 'vídeo publicado' : 'sem vídeo'}${it.exercicio ? ' · com exercício' : ''}</small></span><span class="chip ${it.tipo === 'passo' ? 'ouro' : ''}">${it.tipo === 'passo' ? 'passo da jornada' : 'aula'}</span><button class="bt bt-fantasma bt-sm" data-acao="aula" data-id="${it.id}">Editar</button></div>`).join('') || '<div class="vazio">Nenhuma aula ainda.</div>'}
    </div>`; }).join('')}
  </div>
  <div class="card" style="margin-top:16px"><h3>Biblioteca <button class="bt bt-linha bt-sm acao" data-acao="material">+ Material</button></h3>
    <div class="lista">${C.materiais.map(m => `<div class="item"><span class="chip ouro" style="min-width:86px;justify-content:center">${esc(m.tipo)}</span><div class="tx"><b>${esc(m.titulo)}</b><small>${esc(m.descricao)}</small></div>${urlSegura(m.url) ? '' : '<span class="chip warn">sem arquivo</span>'}<button class="bt bt-fantasma bt-sm" data-acao="material" data-id="${m.id}">Editar</button></div>`).join('') || '<div class="vazio">Nenhum material.</div>'}</div></div>
  <div class="card" style="margin-top:16px"><h3>Fornecedores e contatos indicados <button class="bt bt-linha bt-sm acao" data-acao="fornecedor">+ Fornecedor</button></h3>
    <div class="lista">${C.fornecedores.map(f => `<div class="item"><span class="chip">${esc(f.area)}</span><div class="tx"><b>${esc(f.titulo)}</b><small>${esc(f.descricao)}</small></div><button class="bt bt-fantasma bt-sm" data-acao="fornecedor" data-id="${f.id}">Editar</button></div>`).join('') || '<div class="vazio">Nenhum fornecedor.</div>'}</div></div>`;
};

// Gravador de áudio do navegador (MediaRecorder): o coach grava sem instalar nada.
const Gravador = { rec: null, partes: [], blob: null, inicio: 0, seg: 0 };
function htmlGravador() {
  return `<span class="rotulo">Áudio</span><div class="gravador">
    <button type="button" class="bt bt-linha bt-sm" data-acao="gravar" id="bt-gravar">● Gravar agora</button>
    <label class="bt bt-fantasma bt-sm" for="arq-audio">Enviar arquivo de áudio</label><input type="file" accept="audio/*" id="arq-audio" data-muda="arq-audio" hidden>
    <span class="mu" id="estado-audio" style="font-size:12.5px"></span></div><div id="previa-audio"></div>`;
}
const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function previaAudio(blob) { Gravador.blob = blob; const url = URL.createObjectURL(blob); $('#previa-audio').innerHTML = `<audio controls src="${url}"></audio>`; }
Object.assign(ACOES, {
  async gravar(t) {
    if (Gravador.rec && Gravador.rec.state === 'recording') { Gravador.rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Este navegador não grava áudio. Envie um arquivo.'); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    Gravador.partes = []; Gravador.rec = new MediaRecorder(stream); Gravador.inicio = Date.now();
    Gravador.rec.ondataavailable = e => Gravador.partes.push(e.data);
    Gravador.rec.onstop = () => {
      stream.getTracks().forEach(tr => tr.stop()); Gravador.seg = (Date.now() - Gravador.inicio) / 1000;
      previaAudio(new Blob(Gravador.partes, { type: Gravador.rec.mimeType || 'audio/webm' }));
      t.textContent = '● Gravar de novo'; $('#estado-audio').textContent = `Gravado · ${fmtDur(Gravador.seg)}`;
    };
    Gravador.rec.start(); t.textContent = '■ Parar'; $('#estado-audio').innerHTML = '<span class="gravando">Gravando…</span>';
  },
  mensagem() {
    Gravador.blob = null; Gravador.seg = 0;
    abrirModal('Mensagem da semana', `<p class="mu" style="margin:0 0 12px;font-size:13px">A mensagem vai para o "Hoje" de todos os coachees.</p>${htmlGravador()}
      <label class="rotulo" for="ms-t">Título</label><input class="campo" id="ms-t" placeholder="Ex.: Uma conversa difícil por semana">
      <label class="rotulo" for="ms-x">Texto (resumo ou transcrição)</label><textarea class="campo" id="ms-x" rows="4" placeholder="O que você quer que eles levem desta semana"></textarea>`,
    'Publicar para todos', async () => {
      const titulo = valor('ms-t'); if (!titulo) { $('#ms-t').focus(); toast('Dê um título para a mensagem.'); return false; }
      if (Gravador.rec && Gravador.rec.state === 'recording') { toast('Pare a gravação antes de publicar.'); return false; }
      let audio = '';
      if (Gravador.blob) { toast('Enviando o áudio…'); audio = await Dados.enviarArquivo(new File([Gravador.blob], 'mensagem.webm', { type: Gravador.blob.type || 'audio/webm' }), 'mensagens', C.cfg.cloudinary); }
      const doc = { titulo, texto: valor('ms-x') || 'Ouça a mensagem desta semana.', audio, dur: Gravador.seg ? fmtDur(Gravador.seg) : '', data: hoje(), autorId: S.u.id };
      const id = await col('mensagens').adicionar(doc); C.mensagens.unshift({ id, ...doc });
      toast('Mensagem publicada. Ela já aparece no "Hoje" de todos os coachees.'); render();
    });
  },
  pergunta() {
    abrirModal('Pergunta da semana', '<label class="rotulo" for="pq-t">Pergunta para reflexão</label><textarea class="campo" id="pq-t" rows="3" placeholder="Ex.: Que decisão você vem adiando?"></textarea>', 'Publicar', async () => {
      const texto = valor('pq-t'); if (!texto) { toast('Escreva a pergunta.'); return false; }
      const doc = { texto, data: hoje(), autorId: S.u.id }; const id = await col('perguntas').adicionar(doc); C.perguntas.unshift({ id, ...doc });
      toast('Pergunta publicada para todos os coachees.'); render();
    });
  }
});
MUDA['arq-audio'] = t => {
  const f = t.files && t.files[0]; if (!f) return;
  const a = new Audio(URL.createObjectURL(f)); a.onloadedmetadata = () => { Gravador.seg = isFinite(a.duration) ? a.duration : 0; $('#estado-audio').textContent = `✓ ${f.name}${Gravador.seg ? ` · ${fmtDur(Gravador.seg)}` : ''}`; };
  previaAudio(f);
};

// Publicar e editar aulas e passos (RF-57): o vídeo é um link do YouTube enviado como "Não listado".
ACOES.aula = t => {
  const id = t.dataset.id; const it = id ? { id, ...C.itens[id] } : { tipo: 'aula', trilhaId: t.dataset.trilha || 't1', dur: 15 };
  const trilhas = Object.entries(C.trilhas).filter(([, x]) => !x.sequencial).sort((a, b) => a[1].ordem - b[1].ordem);
  const passo = it.tipo === 'passo';
  abrirModal(id ? (passo ? 'Editar passo da jornada' : 'Editar aula') : 'Nova aula', `
    ${passo ? `<p class="mu" style="margin:0 0 12px;font-size:13px">Os campos do formulário dos passos fazem parte do programa. Aqui você publica o vídeo de orientação.</p>` : `<label class="rotulo" for="au-tr">Trilha</label><select class="campo" id="au-tr">${trilhas.map(([tid, x]) => `<option value="${tid}" ${tid === it.trilhaId ? 'selected' : ''}>Trilha ${esc(x.n)} · ${esc(x.titulo)}</option>`).join('')}</select>`}
    <label class="rotulo" for="au-t">Título</label><input class="campo" id="au-t" value="${esc(it.titulo || '')}" ${passo ? 'readonly' : ''} placeholder="Ex.: Como conduzir uma reunião de resultados">
    <label class="rotulo" for="au-v">Link do vídeo no YouTube</label>
    <p class="mu" style="font-size:12.5px;margin:-2px 0 6px">Envie o vídeo no YouTube como <b>Não listado</b> e cole o link aqui. Ele toca dentro da plataforma.</p>
    <input class="campo" id="au-v" value="${esc(it.video || '')}" placeholder="https://youtu.be/…">
    <div class="duas"><div><label class="rotulo" for="au-d">Duração (min)</label><input class="campo num" id="au-d" type="number" min="1" value="${esc(it.dur || 15)}"></div><div></div></div>
    ${passo ? '' : `<label class="rotulo" for="au-e">Exercício (opcional)</label><textarea class="campo" id="au-e" rows="3" placeholder="Pergunta para o coachee responder depois da aula">${esc(it.exercicio || '')}</textarea>
    <label class="rotulo" for="au-m">Material de apoio (link ou PDF, opcional)</label><div class="envio"><input class="campo" id="au-m" style="margin:0;flex:1" value="${esc(it.material && it.material.url || '')}" placeholder="https://…"><label class="bt bt-fantasma bt-sm" for="au-mf">Enviar PDF</label><input type="file" id="au-mf" accept="application/pdf" data-muda="arquivo-link" data-alvo="au-m" hidden></div>
    ${id ? `<label style="display:flex;gap:10px;align-items:center;margin:8px 0"><input type="checkbox" class="ck" id="au-o" ${it.oculto ? 'checked' : ''}> Ocultar esta aula dos coachees</label>` : ''}`}`,
  id ? 'Salvar' : 'Publicar aula', async () => {
    const titulo = valor('au-t'); const video = valor('au-v');
    if (!titulo) { toast('Dê um título para a aula.'); return false; }
    if (video && !ytId(video)) { $('#au-v').focus(); toast('Cole o link do vídeo no YouTube (não listado).'); return false; }
    const d = { video, dur: +valor('au-d') || 15 };
    if (!passo) {
      Object.assign(d, { titulo, trilhaId: valor('au-tr'), exercicio: valor('au-e'), material: valor('au-m') ? { titulo: 'Material da aula', url: valor('au-m') } : null, oculto: !!($('#au-o') && $('#au-o').checked) });
      if (!id || d.trilhaId !== it.trilhaId) d.ordem = Math.max(0, ...Object.values(C.itens).filter(x => x.trilhaId === d.trilhaId).map(x => x.ordem)) + 1;
    }
    if (id) { await col('itens').salvar(id, d); Object.assign(C.itens[id], d); }
    else { const nid = await col('itens').adicionar({ tipo: 'aula', ...d }); C.itens[nid] = { id: nid, tipo: 'aula', ...d }; }
    C.L = R.lista(C.trilhas, C.itens);
    toast(id ? 'Alterações salvas.' : 'Aula publicada. Já aparece para todos os coachees.'); render();
  });
};
ACOES.mover = async t => {
  const it = C.itens[t.dataset.id]; const irmaos = Object.values(C.itens).filter(x => x.trilhaId === it.trilhaId).sort((a, b) => a.ordem - b.ordem);
  const i = irmaos.indexOf(it); const outro = irmaos[i + +t.dataset.d]; if (!outro) return;
  // Renumera a trilha inteira para evitar empates de ordem.
  const nova = irmaos.slice(); nova[i] = outro; nova[i + +t.dataset.d] = it;
  await Promise.all(nova.map((x, k) => { x.ordem = k + 1; return col('itens').salvar(x.id, { ordem: k + 1 }); }));
  C.L = R.lista(C.trilhas, C.itens); render();
};
MUDA['arquivo-link'] = async t => {
  const f = t.files && t.files[0]; if (!f) return; toast('Enviando o arquivo…');
  const url = await Dados.enviarArquivo(f, 'materiais', C.cfg.cloudinary); document.getElementById(t.dataset.alvo).value = url; toast('Arquivo enviado.');
};

function modalSimples(colecao, lista, id, titulo, campos, msg) {
  const x = lista.find(i => i.id === id) || {};
  abrirModal(id ? `Editar ${titulo}` : `Novo ${titulo}`, campos(x) + (id ? `<div class="sep"></div><button type="button" class="link-discreto" data-acao="excluir-simples" data-col="${colecao}" data-id="${id}">Excluir</button>` : ''), 'Salvar', async () => {
    const d = Object.fromEntries([...$('#modal').querySelectorAll('[data-k]')].map(c => [c.dataset.k, c.value.trim()]));
    if (!d.titulo) { toast('Informe o título.'); return false; }
    if (id) { await col(colecao).salvar(id, d); Object.assign(x, d); } else { const nid = await col(colecao).adicionar(d); lista.push({ id: nid, ...d }); }
    toast(msg); render();
  });
}
Object.assign(ACOES, {
  material(t) {
    modalSimples('materiais', C.materiais, t.dataset.id, 'material', m => `<label class="rotulo" for="mt-t">Título</label><input class="campo" id="mt-t" data-k="titulo" value="${esc(m.titulo || '')}">
      <label class="rotulo" for="mt-tp">Tipo</label><select class="campo" id="mt-tp" data-k="tipo">${['Manual', 'E-book', 'Ferramenta'].map(x => `<option ${m.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <label class="rotulo" for="mt-d">Descrição</label><input class="campo" id="mt-d" data-k="descricao" value="${esc(m.descricao || '')}">
      <label class="rotulo" for="mt-u">Arquivo ou link</label><div class="envio"><input class="campo" id="mt-u" data-k="url" style="margin:0;flex:1" value="${esc(m.url || '')}" placeholder="https://…"><label class="bt bt-fantasma bt-sm" for="mt-f">Enviar arquivo</label><input type="file" id="mt-f" data-muda="arquivo-link" data-alvo="mt-u" hidden></div>
      <label class="rotulo" for="mt-g">Palavras para a busca</label><input class="campo" id="mt-g" data-k="tags" value="${esc(m.tags || '')}">`, 'Material salvo na biblioteca.');
  },
  fornecedor(t) {
    modalSimples('fornecedores', C.fornecedores, t.dataset.id, 'fornecedor', f => `<label class="rotulo" for="fo-a">Área</label><input class="campo" id="fo-a" data-k="area" value="${esc(f.area || '')}" placeholder="Ex.: Contabilidade">
      <label class="rotulo" for="fo-t">Nome</label><input class="campo" id="fo-t" data-k="titulo" value="${esc(f.titulo || '')}">
      <label class="rotulo" for="fo-d">Descrição</label><input class="campo" id="fo-d" data-k="descricao" value="${esc(f.descricao || '')}">
      <label class="rotulo" for="fo-c">Contato</label><input class="campo" id="fo-c" data-k="contato" value="${esc(f.contato || '')}">`, 'Fornecedor salvo.');
  },
  async 'excluir-simples'(t) {
    const nome = t.dataset.col; await col(nome).remover(t.dataset.id);
    const k = nome === 'materiais' ? 'materiais' : 'fornecedores'; C[k] = C[k].filter(x => x.id !== t.dataset.id);
    $('#modal').close(); toast('Excluído.'); render();
  }
});
