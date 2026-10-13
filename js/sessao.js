/* ===================== Sessão individual (1:1) com agenda do coach (RN-12) ===================== */
// O coach abre horários na "Minha agenda" (coleção horarios). O coachee escolhe um horário livre,
// conta o assunto e vai para o pagamento: o horário fica reservado para ele. Quando o administrador
// confirma o pagamento, a sessão fica agendada; se cancelar, o horário volta a ficar livre.

const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const diaSemana = iso => DIAS_SEM[new Date(iso + 'T12:00:00').getDay()];
const quandoSessao = x => `${diaSemana(x.data)}, ${brc(x.data)} às ${x.hora}`;
const ordemHorario = (a, b) => (a.data + a.hora).localeCompare(b.data + b.hora);
const IC_SESSAO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2"/></svg>';
const PEDIDO_ST = { aguardando: 'aguardando pagamento', pago: 'pago, aguardando o horário', agendado: 'confirmada', cancelado: 'cancelado' };
const precoSessao = () => doCoach('precoSessao') ? `R$ ${esc(doCoach('precoSessao'))}` : 'valor informado no pagamento';

// Horários livres do coach a partir de agora (hoje, só os que ainda não passaram).
function horariosLivres() {
  const h = hoje(); const agora = new Date().toTimeString().slice(0, 5);
  return (C.horarios || []).filter(x => x.status === 'livre' && (x.data > h || (x.data === h && x.hora > agora))).sort(ordemHorario);
}
// Todas as sessões em aberto do coachee (aguardando pagamento, pagas ou confirmadas que ainda não passaram),
// da mais próxima para a mais distante. Pedidos sem horário escolhido ficam no fim.
const pedidosAtivos = () => (C.pedidos || []).filter(p => p.status === 'aguardando' || p.status === 'pago' || (p.status === 'agendado' && (!p.quando || p.quando >= hoje())))
  .sort((a, b) => ((a.quando || '9999') + (a.hora || '')).localeCompare((b.quando || '9999') + (b.hora || '')));
// Link da chamada: o definido pelo coach para esta sessão; senão, a sala fixa das sessões (Meus ajustes).
const linkSessao = p => urlSegura(p.link || doCoach('salaSessao'));
// "Adicionar à agenda": abre o Google Agenda já com data, hora, duração e o link da chamada.
function linkAgendaGoogle(p) {
  if (!p.quando || !p.hora) return '';
  const ini = new Date(`${p.quando}T${p.hora}:00`); const fim = new Date(ini.getTime() + (+doCoach('duracaoSessao') || 60) * 60000);
  const f = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `Sessão individual com ${nomeCoach()}`, dates: `${f(ini)}/${f(fim)}`, ctz: 'America/Sao_Paulo', details: `${p.motivo || ''}${linkSessao(p) ? `\n\nLink da chamada: ${linkSessao(p)}` : ''}`, location: linkSessao(p) || 'Online' });
  return `https://calendar.google.com/calendar/render?${q}`;
}
function acoesSessao(p) {
  if (p.status === 'aguardando') return urlSegura(doCoach('pagSessao')) ? `<a class="bt bt-ouro bt-sm" href="${esc(urlSegura(doCoach('pagSessao')))}" target="_blank" rel="noopener">Concluir o pagamento</a>` : '';
  if (p.status !== 'agendado') return '<small class="mu sm-nota">O horário é confirmado por ' + esc(primeiroNome(nomeCoach())) + ' em breve.</small>';
  const link = linkSessao(p); const ag = linkAgendaGoogle(p);
  return `${link ? `<a class="bt bt-ouro bt-sm" href="${esc(link)}" target="_blank" rel="noopener">${IC_VIDEO}Entrar na sessão</a>` : `<small class="mu sm-nota">O link da chamada aparece aqui assim que ${esc(primeiroNome(nomeCoach()))} definir.</small>`}
    ${ag ? `<a class="bt bt-linha bt-sm" href="${esc(ag)}" target="_blank" rel="noopener">Adicionar à agenda</a>` : ''}`;
}
const IC_VIDEO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h12v10H3zM15 10l6-3v10l-6-3"/></svg>';
const cartaoMinhaSessao = p => `<div class="card ouro sessao-minha"><span class="sf-ic">${IC_SESSAO}</span><div class="tx"><div class="pp-rot">Sua sessão · ${PEDIDO_ST[p.status] || esc(p.status)}</div><b style="font-size:18px">${esc(p.horario)}</b><small class="mu">"${esc(p.motivo)}"</small></div>
    <div class="sm-acoes">${acoesSessao(p)}</div></div>`;

// Cartão do Hoje: a sessão marcada ou um convite com o próximo horário livre.
function cartaoSessaoHoje() {
  const ps = pedidosAtivos(); const p = ps[0];
  if (p) return `<div class="card sessao-faixa"><span class="sf-ic">${IC_SESSAO}</span><div class="tx"><small class="mu">${ps.length > 1 ? `Suas ${ps.length} sessões individuais com ${esc(nomeCoach())} · a próxima` : `Sua sessão individual com ${esc(nomeCoach())}`} · ${PEDIDO_ST[p.status] || esc(p.status)}</small><b>${esc(p.horario)}${ps.length > 1 ? ` <span class="mu" style="font-weight:500">+ ${ps.length - 1}</span>` : ''}</b></div><button class="link-discreto" data-ir="sessao">Ver ${ps.length > 1 ? 'todas' : 'detalhes'}</button></div>`;
  const prox = horariosLivres()[0];
  return `<div class="card sessao-faixa"><span class="sf-ic">${IC_SESSAO}</span><div class="tx"><small class="mu">Sessão individual com ${esc(nomeCoach())} · ${esc(doCoach('duracaoSessao') || 60)} min</small><b>${prox ? `Próximo horário livre: ${quandoSessao(prox)}` : 'Converse a sós com o seu coach'}</b></div><button class="bt bt-linha bt-sm" data-ir="sessao">${prox ? 'Ver horários' : 'Saiba mais'}</button></div>`;
}
// Convite discreto dentro de aulas e passos, no momento em que a pessoa pode travar.
const conviteSessao = () => `<div class="convite-sessao">${IC_SESSAO}<span>Travou neste ponto? Converse a sós com ${esc(nomeCoach())}.</span><button class="link-discreto" data-ir="sessao">Marcar uma sessão 1:1</button></div>`;

/* ----- Coachee: escolher o horário ----- */
VIEWS.coachee.sessao = () => {
  const livres = horariosLivres(); const ps = pedidosAtivos();
  const dias = []; livres.forEach(x => { const d = dias.find(y => y.data === x.data); if (d) d.hs.push(x); else dias.push({ data: x.data, hs: [x] }); });
  const sel = livres.find(x => x.id === S.horario);
  const passos = [['1', 'Escolha um horário', `da agenda de ${esc(primeiroNome(nomeCoach()))}`], ['2', 'Conte o assunto', 'e vá para o pagamento'], ['3', 'Pronto', 'a sessão é confirmada após o pagamento']];
  return `
  <div class="topo"><div><div class="sobre">Sessão individual</div><h1>Converse a sós com ${esc(nomeCoach())}</h1>
    <div class="sub">${esc(doCoach('duracaoSessao') || 60)} minutos, online, para destravar um ponto específico da sua jornada · ${precoSessao()}</div></div></div>
  ${ps.length ? `<div class="minhas-sessoes">${ps.length > 1 ? `<div class="rotulinho" style="margin-bottom:8px">Suas sessões marcadas (${ps.length})</div>` : ''}${ps.map(cartaoMinhaSessao).join('')}</div>` : ''}
  ${C.perfilCoach && (C.perfilCoach.apresentacao || C.perfilCoach.foto) ? `<div class="card coach-apres">${C.perfilCoach.foto ? `<img src="${esc(urlSegura(C.perfilCoach.foto))}" alt="">` : ''}<div><b>${esc(nomeCoach())}</b><p class="mu">${esc(C.perfilCoach.apresentacao || '')}</p></div></div>` : ''}
  <div class="sessao-passos">${passos.map(([n, t, s]) => `<div><span>${n}</span><b>${t}</b><small>${s}</small></div>`).join('')}</div>
  <div class="grade g-21" style="align-items:start">
    <div class="card"><h3>Horários disponíveis</h3>
      ${dias.length ? `<div class="agenda-dias">${dias.map(d => `<div class="agenda-dia"><div class="ad-data"><b>${diaSemana(d.data)}</b><span>${brc(d.data)}</span></div>
        <div class="ad-horas">${d.hs.map(x => `<button class="hora ${S.horario === x.id ? 'sel' : ''}" data-acao="escolher-horario" data-id="${x.id}" aria-pressed="${S.horario === x.id}">${x.hora}</button>`).join('')}</div></div>`).join('')}</div>`
        : `<p class="mu" style="margin:0 0 10px">${esc(primeiroNome(nomeCoach()))} ainda não abriu horários. Você pode deixar seu pedido com os melhores dias e horários, e ele confirma com você.</p>`}
    </div>
    <form class="card" id="form-sessao"><h3>${sel ? `Reservar ${quandoSessao(sel)}` : dias.length ? 'Escolha um horário ao lado' : 'Pedir uma sessão'}</h3>
      ${!dias.length ? '<label class="rotulo" for="ss-h">Melhores dias e horários</label><input class="campo" id="ss-h" placeholder="Ex.: terças e quintas de manhã">' : ''}
      <label class="rotulo" for="ss-m">Sobre o que você quer conversar?</label><textarea class="campo" id="ss-m" rows="4" placeholder="Ex.: estou travada para delegar e preciso de ajuda para montar a conversa com a equipe"></textarea>
      <button class="bt bt-ouro" type="submit" ${dias.length && !sel ? 'disabled' : ''} style="width:100%">${urlSegura(doCoach('pagSessao')) ? 'Reservar e ir para o pagamento' : 'Reservar horário'}</button>
      <p class="mu" style="font-size:12.5px;margin:10px 0 0">O horário fica reservado para você. A sessão é confirmada quando o pagamento for registrado.</p>
    </form>
  </div>`;
};
ACOES['escolher-horario'] = t => {
  S.horario = t.dataset.id; const m = valor('ss-m'); render(); if ($('#ss-m')) $('#ss-m').value = m;
  // No celular o formulário fica abaixo da agenda: leva a pessoa até ele.
  if (celular()) $('#form-sessao').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
FORMS['form-sessao'] = async () => {
  const motivo = valor('ss-m'); if (!motivo) { $('#ss-m').focus(); toast('Conte em uma frase sobre o que você quer conversar.'); return; }
  const livres = horariosLivres(); const x = livres.find(y => y.id === S.horario);
  if (livres.length && !x) { toast('Escolha um dos horários disponíveis.'); return; }
  const doc = { coacheeId: S.u.id, nome: S.u.nome, email: S.u.email, motivo, status: 'aguardando', data: hoje(), horario: x ? quandoSessao(x) : (valor('ss-h') || 'A combinar') };
  if (x) {
    // Reserva primeiro: se outra pessoa pegou o horário no mesmo instante, a regra do banco recusa.
    try { await col('horarios').salvar(x.id, { status: 'reservado', coacheeId: S.u.id, nome: S.u.nome }); }
    catch (e) { C.horarios = await col('horarios').listar('coachId', S.u.coachId); S.horario = null; render(); toast('Esse horário acabou de ser reservado por outra pessoa. Escolha outro.', 'aviso'); return; }
    Object.assign(x, { status: 'reservado', coacheeId: S.u.id }); Object.assign(doc, { horarioId: x.id, quando: x.data, hora: x.hora });
  }
  const id = await col('pedidos').adicionar(doc); C.pedidos.unshift({ id, ...doc }); S.horario = null;
  const link = urlSegura(doCoach('pagSessao')); if (link) window.open(link, '_blank', 'noopener');
  toast(x ? `Horário reservado: ${doc.horario}. ${link ? 'Conclua o pagamento na aba que abriu.' : 'A administração vai enviar o link de pagamento.'}` : 'Pedido registrado. Seu coach vai combinar o horário com você.'); render();
};

/* ----- Coach: abrir horários ----- */
VIEWS.coach.agenda = () => {
  const h = hoje(); const meus = (C.horarios || []).filter(x => x.data >= h).sort(ordemHorario);
  const pedidoDe = x => C.pedidos.find(p => p.horarioId === x.id && p.status !== 'cancelado');
  const dias = []; meus.forEach(x => { const d = dias.find(y => y.data === x.data); if (d) d.hs.push(x); else dias.push({ data: x.data, hs: [x] }); });
  const livres = meus.filter(x => x.status === 'livre').length;
  return `<div class="topo"><div><div class="sobre">Sessões individuais</div><h1>Minha agenda</h1><div class="sub">Abra os horários em que você atende. O coachee escolhe um deles, conta o assunto e paga.</div></div></div>
  <div class="grade g-21" style="align-items:start">
    <div class="card"><h3>Próximos horários <span class="mu acao num" style="font-size:12.5px;font-weight:500">${plural(livres, 'livre', 'livres')} · ${plural(meus.length - livres, 'reservado', 'reservados')}</span></h3>
      ${dias.length ? dias.map(d => `<div class="agenda-dia"><div class="ad-data"><b>${diaSemana(d.data)}</b><span>${brc(d.data)}</span></div><div class="ad-lista">${d.hs.map(x => { const p = pedidoDe(x);
        return x.status === 'livre' ? `<div class="ad-item"><span class="hora livre">${x.hora}</span><span class="mu">livre</span><button class="link-discreto" data-acao="remover-horario" data-id="${x.id}" aria-label="Remover ${x.hora} de ${brc(x.data)}">remover</button></div>`
          : `<div class="ad-item"><span class="hora ${x.status === 'confirmado' ? 'ok' : 'res'}">${x.hora}</span><span><b>${esc(x.nome || 'Coachee')}</b> · ${x.status === 'confirmado' ? 'confirmada' : 'aguardando pagamento'}${p ? `<br><small class="mu">"${esc(p.motivo)}"</small><br><small class="${linkSessao(p) ? 'ok-tx' : 'mu'}">${p.link ? 'Link próprio desta sessão' : doCoach('salaSessao') ? 'Usa a sua sala fixa das sessões' : 'Sem link da chamada'}</small>` : ''}</span>
            <span class="ad-bts">${p ? `<button class="link-discreto" data-acao="link-sessao" data-id="${p.id}">${p.link ? 'trocar link' : 'definir link'}</button>` : ''}<button class="link-discreto" data-acao="liberar-horario" data-id="${x.id}">cancelar reserva</button></span></div>`; }).join('')}</div></div>`).join('')
        : '<div class="vazio">Nenhum horário aberto. Adicione ao lado.</div>'}
    </div>
    <form class="card" id="form-horario"><h3>Abrir horários</h3>
      <div class="duas"><div><label class="rotulo" for="hr-d">Data</label><input class="campo" id="hr-d" type="date" min="${h}" value="${R.somaDias(h, 1)}"></div>
        <div><label class="rotulo" for="hr-h">Horários</label><input class="campo" id="hr-h" placeholder="09:00, 14:00, 18:30"></div></div>
      <label class="rotulo" for="hr-r">Repetir</label><select class="campo" id="hr-r"><option value="1">Só nesta data</option><option value="2">Por 2 semanas</option><option value="4">Por 4 semanas</option><option value="8">Por 8 semanas</option></select>
      <button class="bt bt-ouro" type="submit" style="width:100%">Abrir horários</button>
      <p class="mu" style="font-size:12.5px;margin:10px 0 0">Preço, duração e link de pagamento da sessão: <button type="button" class="link-discreto" data-ir="meus" style="color:var(--gold-2)">Meus ajustes</button> (${precoSessao()} · ${esc(doCoach('duracaoSessao') || 60)} min).</p>
    </form>
  </div>`;
};
FORMS['form-horario'] = async () => {
  const d = valor('hr-d'); const horas = valor('hr-h').split(/[,;\s]+/).filter(Boolean).map(x => x.replace(/^(\d)(:|h)/, '0$1$2').replace('h', ':').replace(/:$/, ':00'));
  if (!d || d < hoje()) { toast('Escolha uma data de hoje em diante.'); return; }
  if (!horas.length || horas.some(x => !/^([01]\d|2[0-3]):[0-5]\d$/.test(x))) { $('#hr-h').focus(); toast('Escreva os horários assim: 09:00, 14:00, 18:30.'); return; }
  const sem = +valor('hr-r') || 1; let n = 0;
  for (let k = 0; k < sem; k++) for (const hora of horas) {
    const data = R.somaDias(d, 7 * k);
    if ((C.horarios || []).some(x => x.data === data && x.hora === hora)) continue;
    const doc = { coachId: S.u.id, data, hora, status: 'livre' }; const id = await col('horarios').adicionar(doc); C.horarios.push({ id, ...doc }); n++;
  }
  toast(n ? `${plural(n, 'horário aberto', 'horários abertos')}. Seus coachees já podem reservar.` : 'Esses horários já estavam abertos.'); render();
};
Object.assign(ACOES, {
  async 'remover-horario'(t) { await col('horarios').remover(t.dataset.id); C.horarios = C.horarios.filter(x => x.id !== t.dataset.id); toast('Horário removido.'); render(); },
  'liberar-horario'(t) {
    const x = C.horarios.find(y => y.id === t.dataset.id);
    confirmar('Cancelar a reserva?', `A sessão de ${esc(x.nome || 'coachee')} em ${quandoSessao(x)} será cancelada e o horário volta a ficar livre. Combine com a pessoa antes, principalmente se ela já pagou.`, 'Cancelar reserva', async () => {
      await liberarHorario(x.id); toast('Reserva cancelada. O horário está livre de novo.'); render();
    });
  }
});
// Cancela o pedido ligado ao horário (se houver) e devolve o horário para a agenda.
async function liberarHorario(hid) {
  const p = (C.pedidos || []).find(q => q.horarioId === hid && q.status !== 'cancelado');
  if (p) { await col('pedidos').salvar(p.id, { status: 'cancelado' }); p.status = 'cancelado'; }
  await col('horarios').salvar(hid, { status: 'livre', coacheeId: '', nome: '' });
  const x = (C.horarios || []).find(y => y.id === hid); if (x) Object.assign(x, { status: 'livre', coacheeId: '', nome: '' });
}

// O coach define (ou troca) o link da chamada de uma sessão específica.
ACOES['link-sessao'] = t => {
  const p = C.pedidos.find(q => q.id === t.dataset.id); if (!p) return;
  abrirModal('Link da chamada', `<p class="mu" style="margin:0 0 12px;font-size:13px">Sessão de ${esc(p.nome || 'coachee')} · ${esc(p.horario)}. O link aparece para a pessoa no botão "Entrar na sessão" assim que a sessão estiver confirmada.</p>
    <label class="rotulo" for="ls-l">Link (Google Meet, Zoom, Teams…)</label><input class="campo" id="ls-l" value="${esc(p.link || '')}" placeholder="${esc(doCoach('salaSessao') || 'https://meet.google.com/…')}">
    <p class="mu" style="font-size:12px;margin:-4px 0 0">Em branco, usa a sua sala fixa das sessões (Meus ajustes).</p>`, 'Salvar link', async () => {
    const link = valor('ls-l'); if (link && !/^https:\/\//.test(link)) { toast('O link precisa começar com https://'); return false; }
    await col('pedidos').salvar(p.id, { link }); p.link = link; toast('Link da chamada salvo.'); render();
  });
};
