// Telas e ações do administrador: Como estamos · Pessoas · Time de coaches · Planos · Novas entradas · Ajustes.
// O administrador cuida do negócio: não lê respostas, meta nem diagnósticos (só o resumo numérico em usuarios.resumo).

const coaches = () => (C.usuarios || []).filter(u => u.papel === 'coach' && u.ativo !== false);
const coachees = () => (C.usuarios || []).filter(u => u.papel === 'coachee');
const ativos = () => coachees().filter(u => u.ativo !== false && (!u.fim || u.fim >= hoje()));
const nomeDe = id => ((C.usuarios || []).find(u => u.id === id) || {}).nome || '—';
const TIPO = { coachee: 'Coachee', coach: 'Coach', admin: 'Administrador' };
const chipVenda = st => ({ pago: '<span class="chip ok">pago</span>', pendente: '<span class="chip warn">aguardando</span>', expirado: '<span class="chip bad">expirado</span>' })[st] || '';
const PRODUTO = { master: 'Plano Master', sessao: 'Sessão individual', renovacao: 'Renovação Master' };

/* ===================== Como estamos (RF-60) ===================== */
VIEWS.admin.painel = () => {
  const h = hoje(); const at = ativos();
  const novos = coachees().filter(u => u.inicio && R.dias(u.inicio, h) <= 30 && u.inicio <= h).length;
  const renov = at.filter(u => u.fim && R.dias(h, u.fim) <= 30).length;
  const parados = at.filter(u => !u.ultimoAcesso || R.dias(u.ultimoAcesso, h) > 7).length;
  const trilhas = ['I', 'II', 'III', 'IV'];
  return `
  <div class="topo"><div><div class="sobre">${MESES[new Date().getMonth()].replace(/^./, c => c.toUpperCase())} de ${new Date().getFullYear()}</div><h1>Como estamos</h1><div class="sub">Pessoas no programa, time de coaches e novas entradas.</div></div>
    <button class="bt bt-ouro" data-acao="pessoa">+ Nova pessoa</button></div>
  <div class="grade g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="v num">${at.length}</div><div class="l">coachees ativos no plano Master</div></div>
    <div class="card kpi"><div class="v num">${novos}</div><div class="l">novos nos últimos 30 dias</div></div>
    <div class="card kpi"><div class="v num">${renov}</div><div class="l">${renov === 1 ? 'renovação vencendo' : 'renovações vencendo'} em 30 dias</div></div>
    <div class="card kpi"><div class="v num">${parados}</div><div class="l">coachees sem acessar há mais de 7 dias</div></div>
  </div>
  <div class="grade g-21">
    <div class="card"><h3>Novas entradas <button class="bt bt-fantasma bt-sm acao" data-ir="entradas">Ver todas</button></h3><div class="lista">
      ${C.vendas.slice(0, 5).map(v => `<div class="item">${caixaData(v.data)}<div class="tx"><b>${esc(v.nome)}</b><small>${PRODUTO[v.produto] || esc(v.produto)} · ${esc(v.forma || '')}</small></div>${chipVenda(v.status)}</div>`).join('') || '<div class="vazio">Nenhuma venda registrada.</div>'}
    </div></div>
    <div class="card"><h3>Coachees por coach</h3>
      ${coaches().map(co => { const n = at.filter(c => c.coachId === co.id).length; return `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>${esc(co.nome)}</b><span class="mu num" style="font-size:12.5px">${plural(n, 'coachee', 'coachees')}</span></div><div class="barra"><b style="width:${at.length ? n / at.length * 100 : 0}%"></b></div></div>`; }).join('') || '<div class="vazio">Nenhum coach cadastrado.</div>'}
      <div class="sep"></div><h3>Coachees por trilha</h3>
      ${trilhas.map(n => { const q = at.filter(c => (c.resumo && c.resumo.trilha || 'I') === n).length; return `<div class="item" style="padding:7px 0"><span class="chip ouro" style="width:42px;justify-content:center">${n}</span><div class="tx"><div class="barra"><b style="width:${at.length ? q / at.length * 100 : 0}%"></b></div></div><span class="num mu" style="font-size:12.5px;width:90px;text-align:right">${plural(q, 'coachee', 'coachees')}</span></div>`; }).join('')}
      <small class="mu">Concluíram a jornada: ${at.filter(c => c.resumo && c.resumo.trilha === 'fim').length}</small>
    </div>
  </div>`;
};

/* ===================== Pessoas (RF-61) ===================== */
VIEWS.admin.pessoas = () => {
  const h = hoje(); const q = S.busca.toLowerCase();
  const lista = (C.usuarios || []).filter(u => (S.filtro === 'todos' || u.papel === S.filtro) && (!q || (u.nome + u.email).toLowerCase().includes(q)))
    .sort((a, b) => a.papel.localeCompare(b.papel) || a.nome.localeCompare(b.nome));
  const situ = u => u.ativo === false ? '<span class="chip">desativado</span>' : u.papel !== 'coachee' ? '<span class="chip ok">ativo</span>' : chipSt(R.situacao(u, null, h).st);
  return `
  <div class="topo"><div><div class="sobre">Coachees, coaches e equipe</div><h1>Pessoas</h1></div><button class="bt bt-ouro" data-acao="pessoa">+ Nova pessoa</button></div>
  <div class="ferramentas">
    <div class="busca"><input class="campo" id="busca" placeholder="Buscar por nome ou e-mail" value="${esc(S.busca)}" aria-label="Buscar pessoa">${svg('busca')}</div>
    <select class="campo" data-muda="filtro" aria-label="Filtrar por tipo">${[['todos', 'Todos os tipos'], ['coachee', 'Coachees'], ['coach', 'Coaches'], ['admin', 'Administradores']].map(([v, l]) => `<option value="${v}" ${S.filtro === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <span class="mu num" style="font-size:12.5px">${plural(lista.length, 'pessoa', 'pessoas')}</span>
  </div>
  <div class="card" style="padding-top:6px"><div class="tabela-wrap"><table>
    <thead><tr><th>Nome</th><th>Tipo</th><th>Coach</th><th>Acesso até</th><th>Último acesso</th><th>Situação</th><th></th></tr></thead>
    <tbody>${lista.map(u => `<tr><td><div class="pessoa">${av(u, u.papel === 'coachee' ? '' : 'cinza')}<div><b>${esc(u.nome)}</b><small>${esc(u.email)}</small></div></div></td>
      <td><span class="chip ${u.papel === 'coach' ? 'ouro' : ''}">${TIPO[u.papel]}</span></td><td>${u.papel === 'coachee' ? esc(nomeDe(u.coachId)) : '—'}</td><td class="num">${u.fim ? br(u.fim) : '—'}</td>
      <td class="mu num">${u.ultimoAcesso ? br(u.ultimoAcesso) : 'nunca'}</td><td>${situ(u)}</td>
      <td style="text-align:right;white-space:nowrap"><button class="bt bt-fantasma bt-sm" data-acao="reenviar" data-id="${u.id}">Reenviar acesso</button> <button class="bt bt-fantasma bt-sm" data-acao="pessoa" data-id="${u.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="7" class="vazio">Ninguém encontrado.</td></tr>'}</tbody>
  </table></div></div>`;
};

// Cria o acesso (login + cadastro) e manda as boas-vindas (RF-02, RF-70).
async function criarPessoa(d) {
  const id = await Dados.criarAcesso(d);
  C.usuarios.push({ id, ...d, email: d.email.toLowerCase() });
  const ej = C.cfg.emailjs || {};
  if (d.papel === 'coachee' && ej.modeloBoasVindas) {
    await Dados.enviarEmail(ej, ej.modeloBoasVindas, { to_email: d.email, to_name: primeiroNome(d.nome), plano: 'Master', data_fim: br(d.fim), link_whatsapp: C.cfg.whatsapp || '', link_plataforma: location.origin + location.pathname }).catch(() => false);
  }
  return id;
}

ACOES.pessoa = t => {
  const id = t.dataset.id; const u = id ? C.usuarios.find(x => x.id === id) : { papel: t.dataset.papel || 'coachee', inicio: hoje(), ativo: true };
  const cs = coaches();
  abrirModal(id ? 'Editar pessoa' : 'Nova pessoa', `
    <label class="rotulo" for="pe-nome">Nome</label><input class="campo" id="pe-nome" value="${esc(u.nome || '')}" placeholder="Nome completo">
    <label class="rotulo" for="pe-email">E-mail</label><input class="campo" id="pe-email" type="email" value="${esc(u.email || '')}" ${id ? 'readonly' : ''} placeholder="nome@empresa.com.br">
    <div class="duas">
      <div><label class="rotulo" for="pe-papel">Tipo</label><select class="campo" id="pe-papel" ${id ? 'disabled' : ''}>${Object.entries(TIPO).map(([k, l]) => `<option value="${k}" ${u.papel === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label class="rotulo" for="pe-cargo">Cargo / empresa</label><input class="campo" id="pe-cargo" value="${esc(u.cargo || '')}"></div>
      <div><label class="rotulo" for="pe-coach">Coach responsável</label><select class="campo" id="pe-coach">${cs.map(c => `<option value="${c.id}" ${u.coachId === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div><label class="rotulo" for="pe-ini">Início</label><input class="campo" id="pe-ini" type="date" value="${esc(u.inicio || hoje())}"></div>
      ${id && u.papel === 'coachee' ? `<div><label class="rotulo" for="pe-fim">Acesso até</label><input class="campo" id="pe-fim" type="date" value="${esc(u.fim || '')}"></div>` : ''}
    </div>
    ${id ? `<label style="display:flex;gap:10px;align-items:center;margin:2px 0 10px"><input type="checkbox" class="ck" id="pe-ativo" ${u.ativo !== false ? 'checked' : ''}> Acesso ativo</label>
      ${u.papel === 'coachee' ? `<button type="button" class="bt bt-linha bt-sm" data-acao="renovar" data-id="${u.id}">Renovar por mais 12 meses</button>` : ''}`
    : '<p class="mu" style="font-size:12.5px;margin:0">Para coachees, o fim do acesso é calculado em 12 meses. A pessoa recebe um e-mail para criar a senha.</p>'}`,
  id ? 'Salvar' : 'Criar e enviar acesso', async () => {
    const nome = valor('pe-nome'), email = valor('pe-email'), papel = id ? u.papel : valor('pe-papel');
    if (!nome) { toast('Informe o nome.'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Informe um e-mail válido.'); return false; }
    const d = { nome, cargo: valor('pe-cargo') };
    if (papel === 'coachee') {
      const co = cs.find(c => c.id === valor('pe-coach')); if (!co) { toast('Cadastre um coach antes.'); return false; }
      Object.assign(d, { coachId: co.id, coachNome: co.nome, inicio: valor('pe-ini') || hoje() });
      d.fim = id ? (valor('pe-fim') || R.fimDoAcesso(d.inicio)) : R.fimDoAcesso(d.inicio);
    }
    if (id) {
      d.ativo = $('#pe-ativo').checked;
      await col('usuarios').salvar(id, d); Object.assign(u, d);
      // Coach renomeado: atualiza o nome mostrado aos coachees da carteira.
      if (papel === 'coach') await Promise.all(coachees().filter(c => c.coachId === id).map(c => { c.coachNome = nome; return col('usuarios').salvar(c.id, { coachNome: nome }); }));
      toast('Cadastro atualizado.');
    } else {
      await criarPessoa({ ...d, email, papel, ativo: true, criado: hoje() });
      toast(`Acesso criado. ${primeiroNome(nome)} recebe o e-mail para criar a senha.`);
    }
    render();
  });
};
Object.assign(ACOES, {
  async reenviar(t) { const u = C.usuarios.find(x => x.id === t.dataset.id); await Dados.redefinirSenha(u.email); toast(`E-mail de acesso reenviado para ${u.email}.`); },
  async renovar(t) {
    const u = C.usuarios.find(x => x.id === t.dataset.id);
    // RN-11: a renovação soma um novo prazo a partir do fim atual (ou de hoje, se já venceu).
    const base = u.fim && u.fim >= hoje() ? R.somaDias(u.fim, 1) : hoje();
    const fim = R.fimDoAcesso(base); await col('usuarios').salvar(u.id, { fim, ativo: true }); Object.assign(u, { fim, ativo: true });
    $('#modal').close(); toast(`Acesso renovado até ${br(fim)}.`); render();
  }
});

/* ===================== Time de coaches (RF-62) ===================== */
VIEWS.admin.coaches = () => {
  const h = hoje();
  return `
  <div class="topo"><div><div class="sobre">Quem acompanha</div><h1>Time de coaches</h1></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="bt bt-linha" data-acao="transferir">Transferir coachee</button><button class="bt bt-ouro" data-acao="pessoa" data-papel="coach">+ Novo coach</button></div></div>
  <div class="grade g2">
    ${coaches().map(co => { const cart = ativos().filter(c => c.coachId === co.id).map(c => ({ c, s: R.situacao(c, null, h) }));
      const emDia = cart.filter(x => x.s.st === 'ok' || x.s.st === 'novo').length;
      return `<div class="card"><div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">${av(co, '', 'width:48px;height:48px;font-size:15px;')}<div><div style="font-family:var(--f-display);font-size:24px;font-weight:600;line-height:1.1">${esc(co.nome)}</div><div class="mu">${esc(co.email)}</div></div></div>
        <div class="grade g3" style="gap:10px;margin-bottom:14px">
          <div><div class="rotulinho">Carteira</div><div class="num" style="font-size:22px;font-weight:800">${cart.length}</div></div>
          <div><div class="rotulinho">Em dia</div><div class="num" style="font-size:22px;font-weight:800">${emDia}</div></div>
          <div><div class="rotulinho">Atenção</div><div class="num" style="font-size:22px;font-weight:800">${cart.length - emDia}</div></div>
        </div>
        <div class="lista">${cart.map(({ c, s }) => `<div class="item">${av(c)}<div class="tx"><b>${esc(c.nome)}</b><small>${c.resumo ? `Trilha ${esc(c.resumo.trilha === 'fim' ? 'concluída' : c.resumo.trilha)} · ${c.resumo.pct}%` : 'Ainda não começou'}</small></div>${chipSt(s.st)}</div>`).join('') || '<div class="vazio">Nenhum coachee na carteira.</div>'}</div>
      </div>`; }).join('') || '<div class="card"><p class="mu">Nenhum coach cadastrado.</p></div>'}
  </div>`;
};
ACOES.transferir = () => {
  const cs = coaches();
  abrirModal('Transferir coachee', `<label class="rotulo" for="tr-c">Coachee</label><select class="campo" id="tr-c">${ativos().sort((a, b) => a.nome.localeCompare(b.nome)).map(c => `<option value="${c.id}">${esc(c.nome)} · hoje com ${esc(nomeDe(c.coachId))}</option>`).join('')}</select>
    <label class="rotulo" for="tr-n">Novo coach responsável</label><select class="campo" id="tr-n">${cs.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select>
    <p class="mu" style="font-size:12.5px;margin:0">O novo coach passa a ver o histórico, as respostas e a evolução do coachee. O anterior deixa de ver.</p>`, 'Transferir', async () => {
    const c = C.usuarios.find(x => x.id === valor('tr-c')); const co = cs.find(x => x.id === valor('tr-n'));
    if (!c || !co) return false;
    await col('usuarios').salvar(c.id, { coachId: co.id, coachNome: co.nome }); Object.assign(c, { coachId: co.id, coachNome: co.nome });
    toast(`${primeiroNome(c.nome)} agora é acompanhado(a) por ${co.nome}.`); render();
  });
};

/* ===================== Planos (RF-63) ===================== */
const MARCA_OK = '<span style="width:20px;height:20px;border-radius:50%;background:var(--gold);color:#17130B;display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0">✓</span>';
VIEWS.admin.planos = () => {
  const c = C.cfg;
  return `
  <div class="topo"><div><div class="sobre">Oferta</div><h1>Planos</h1><div class="sub">Um plano único, anual, para quem quer se desenvolver na carreira.</div></div></div>
  <form id="form-planos" class="grade g-21">
    <div class="card ouro">
      <h3>Plano Master <span class="chip ouro acao">${plural(ativos().length, 'coachee ativo', 'coachees ativos')}</span></h3>
      <div class="duas">
        <div><label class="rotulo">Prazo de acesso</label><input class="campo num" value="12 meses" readonly></div>
        <div><label class="rotulo" for="pl-preco">Preço (R$)</label><input class="campo" id="pl-preco" value="${esc(c.precoMaster || '')}" placeholder="A definir"></div>
      </div>
      <label class="rotulo" for="pl-link">Link de pagamento do Master</label><input class="campo" id="pl-link" value="${esc(c.pagMaster || '')}" placeholder="Link do Mercado Pago, Asaas ou PagBank">
      <p class="mu" style="font-size:12.5px;margin:-6px 0 14px">Usado também no convite de renovação, quando o acesso termina.</p>
      <button class="bt bt-ouro" type="submit">Salvar planos</button>
    </div>
    <div class="grade" style="align-content:start">
      <div class="card"><h3>O que o Master inclui</h3><div class="lista">
        <div class="item">${MARCA_OK}<div class="tx"><b>Plataforma</b><small>Trilhas, aulas, jornada, assessments e atividades</small></div></div>
        <div class="item">${MARCA_OK}<div class="tx"><b>Mentoria em grupo</b><small>Uma por mês, ao vivo, com gravação</small></div></div>
        <div class="item">${MARCA_OK}<div class="tx"><b>Grupo no WhatsApp</b><small>Dúvidas e pedidos de ajuda</small></div></div>
        <div class="item">${MARCA_OK}<div class="tx"><b>Paradas trimestrais e evento anual</b><small>4 paradas com reavaliação; encontro presencial</small></div></div>
      </div></div>
      <div class="card"><h3>Sessão individual avulsa</h3><p class="mu" style="margin:0 0 10px;font-size:13px">Comprada à parte pelo coachee, no fim de "Minha jornada".</p>
        <div class="duas"><div><label class="rotulo" for="pl-sp">Preço (R$)</label><input class="campo" id="pl-sp" value="${esc(c.precoSessao || '')}" placeholder="A definir"></div><div><label class="rotulo" for="pl-sd">Duração (min)</label><input class="campo num" id="pl-sd" type="number" value="${esc(c.duracaoSessao || 60)}"></div></div>
        <label class="rotulo" for="pl-sl">Link de pagamento da sessão</label><input class="campo" id="pl-sl" value="${esc(c.pagSessao || '')}" placeholder="https://…"></div>
    </div>
  </form>
  <div class="card" style="margin-top:16px"><h3>Regras de acesso</h3><div class="lista">
    <div class="item">${MARCA_OK}<div class="tx"><b>Bloquear o acesso ao fim do prazo</b><small>O coachee vê o convite para renovar; os dados ficam guardados.</small></div></div>
    <div class="item">${MARCA_OK}<div class="tx"><b>Paradas a cada 3 meses, com reavaliação</b><small>A parada abre 7 dias antes da data. Junto com ela, os assessments ficam liberados para refazer.</small></div></div>
    <div class="item">${MARCA_OK}<div class="tx"><b>Renovação 30 dias antes</b><small>O coachee aparece em "Precisam de você" do coach e em "renovações vencendo" aqui.</small></div></div>
    <div class="item">${MARCA_OK}<div class="tx"><b>Trilha II passo a passo; demais trilhas abertas</b><small>Na Trilha II cada passo libera o próximo. As Trilhas I, III e IV ficam abertas, com ordem sugerida.</small></div></div>
  </div></div>`;
};
FORMS['form-planos'] = async () => {
  const d = { precoMaster: valor('pl-preco'), pagMaster: valor('pl-link'), precoSessao: valor('pl-sp'), duracaoSessao: +valor('pl-sd') || 60, pagSessao: valor('pl-sl') };
  for (const k of ['pagMaster', 'pagSessao']) if (d[k] && !/^https:\/\//.test(d[k])) { toast('Os links de pagamento precisam começar com https://'); return; }
  await col('config').salvar('programa', d); Object.assign(C.cfg, d); toast('Planos salvos.');
};

/* ===================== Novas entradas (RF-64) ===================== */
VIEWS.admin.entradas = () => {
  const h = hoje(); const ult30 = R.somaDias(h, -30);
  const pedAbertos = C.pedidos.filter(p => p.status === 'aguardando');
  return `
  <div class="topo"><div><div class="sobre">Pagamento → boas-vindas</div><h1>Novas entradas</h1><div class="sub">O cliente paga pelo link de pagamento. Ao confirmar o pagamento aqui, a plataforma cria o acesso e envia o e-mail para criar a senha.</div></div>
    <button class="bt bt-ouro" data-acao="venda">+ Registrar venda</button></div>
  <div class="grade g3" style="margin-bottom:16px">
    <div class="card kpi"><div class="v num">${C.vendas.filter(v => v.status === 'pago' && v.data >= ult30).length}</div><div class="l">vendas confirmadas nos últimos 30 dias</div></div>
    <div class="card kpi"><div class="v num">${C.vendas.filter(v => v.status === 'pendente').length + pedAbertos.length}</div><div class="l">aguardando pagamento</div></div>
    <div class="card kpi"><div class="v num">${C.vendas.filter(v => v.status === 'expirado').length}</div><div class="l">${C.vendas.filter(v => v.status === 'expirado').length === 1 ? 'pagamento expirado' : 'pagamentos expirados'} para retomar</div></div>
  </div>
  ${pedAbertos.length ? `<div class="card ouro" style="margin-bottom:16px"><h3>Pedidos de sessão individual aguardando pagamento</h3><div class="lista">
    ${pedAbertos.map(p => `<div class="item">${caixaData(p.data)}<div class="tx"><b>${esc(p.nome || nomeDe(p.coacheeId))}</b><small>"${esc(p.motivo)}" · ${esc(p.horario)}</small></div><button class="bt bt-ouro bt-sm" data-acao="confirmar-sessao" data-id="${p.id}">Confirmar pagamento</button><button class="bt bt-fantasma bt-sm" data-acao="cancelar-sessao" data-id="${p.id}">Cancelar</button></div>`).join('')}
  </div></div>` : ''}
  <div class="card" style="padding-top:6px"><div class="tabela-wrap"><table>
    <thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Forma</th><th>Valor</th><th>Pagamento</th><th></th></tr></thead>
    <tbody>${C.vendas.map(v => `<tr><td class="num">${br(v.data)}</td><td><b>${esc(v.nome)}</b><br><small class="mu">${esc(v.email || '')}</small></td><td><span class="chip ${v.produto === 'sessao' ? '' : 'ouro'}">${PRODUTO[v.produto] || esc(v.produto)}</span></td><td>${esc(v.forma || '')}</td><td class="num">${v.valor ? `R$ ${esc(v.valor)}` : '—'}</td><td>${chipVenda(v.status)}${v.confirmadoEm ? `<br><small class="mu">confirmado em ${brc(v.confirmadoEm)}</small>` : ''}</td>
      <td style="text-align:right;white-space:nowrap">${v.status === 'pendente' ? `<button class="bt bt-ouro bt-sm" data-acao="confirmar-venda" data-id="${v.id}">Confirmar pagamento</button> <button class="bt bt-fantasma bt-sm" data-acao="expirar-venda" data-id="${v.id}">Expirou</button>` : v.status === 'expirado' ? `<button class="bt bt-linha bt-sm" data-acao="reabrir-venda" data-id="${v.id}">Reabrir</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="vazio">Nenhuma venda registrada.</td></tr>'}</tbody>
  </table></div></div>
  <p class="mu" style="font-size:12.5px;margin-top:12px">Sem servidor, a confirmação é manual: confira o pagamento no painel do provedor (Mercado Pago, Asaas ou PagBank) e clique em "Confirmar pagamento".</p>`;
};
Object.assign(ACOES, {
  venda() {
    abrirModal('Registrar venda', `<label class="rotulo" for="vd-n">Nome do cliente</label><input class="campo" id="vd-n">
      <label class="rotulo" for="vd-e">E-mail</label><input class="campo" id="vd-e" type="email">
      <div class="duas"><div><label class="rotulo" for="vd-p">Produto</label><select class="campo" id="vd-p"><option value="master">Plano Master</option><option value="renovacao">Renovação Master</option></select></div>
      <div><label class="rotulo" for="vd-f">Forma de pagamento</label><select class="campo" id="vd-f">${['Pix', 'Cartão', 'Cartão parcelado', 'Boleto'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div><label class="rotulo" for="vd-v">Valor (R$)</label><input class="campo" id="vd-v" value="${esc(C.cfg.precoMaster || '')}"></div></div>`, 'Registrar', async () => {
      const d = { nome: valor('vd-n'), email: valor('vd-e').toLowerCase(), produto: valor('vd-p'), forma: valor('vd-f'), valor: valor('vd-v'), status: 'pendente', data: hoje() };
      if (!d.nome || !/^\S+@\S+\.\S+$/.test(d.email)) { toast('Informe nome e e-mail válidos.'); return false; }
      const id = await col('vendas').adicionar(d); C.vendas.unshift({ id, ...d }); toast('Venda registrada como aguardando pagamento.'); render();
    });
  },
  'confirmar-venda'(t) {
    const v = C.vendas.find(x => x.id === t.dataset.id); const existente = coachees().find(u => u.email === v.email);
    const cs = coaches();
    abrirModal('Confirmar pagamento', `<p style="margin:0 0 12px">${esc(v.nome)} · ${PRODUTO[v.produto]}${v.valor ? ` · R$ ${esc(v.valor)}` : ''}</p>
      ${existente ? `<p class="mu" style="margin:0">Já existe um coachee com este e-mail. O acesso será renovado por mais 12 meses a partir de ${br(existente.fim && existente.fim >= hoje() ? R.somaDias(existente.fim, 1) : hoje())}.</p>`
      : `<label class="rotulo" for="cv-c">Coach responsável</label><select class="campo" id="cv-c">${cs.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select>
        <label class="rotulo" for="cv-i">Início do acesso</label><input class="campo" id="cv-i" type="date" value="${hoje()}">
        <p class="mu" style="font-size:12.5px;margin:0">A plataforma cria o login e ${esc(primeiroNome(v.nome))} recebe o e-mail para criar a senha.</p>`}`,
    existente ? 'Confirmar e renovar' : 'Confirmar e liberar acesso', async () => {
      let usuarioId;
      if (existente) {
        const base = existente.fim && existente.fim >= hoje() ? R.somaDias(existente.fim, 1) : hoje();
        const fim = R.fimDoAcesso(base); await col('usuarios').salvar(existente.id, { fim, ativo: true }); Object.assign(existente, { fim, ativo: true }); usuarioId = existente.id;
      } else {
        const co = cs.find(c => c.id === valor('cv-c')); if (!co) { toast('Cadastre um coach antes.'); return false; }
        const inicio = valor('cv-i') || hoje();
        usuarioId = await criarPessoa({ nome: v.nome, email: v.email, papel: 'coachee', coachId: co.id, coachNome: co.nome, inicio, fim: R.fimDoAcesso(inicio), ativo: true, criado: hoje() });
      }
      const d = { status: 'pago', confirmadoEm: hoje(), confirmadoPor: S.u.id, usuarioId };
      await col('vendas').salvar(v.id, d); Object.assign(v, d);
      toast(existente ? 'Pagamento confirmado e acesso renovado.' : `Pagamento confirmado. Acesso criado e e-mail enviado para ${v.email}.`); render();
    });
  },
  async 'expirar-venda'(t) { const v = C.vendas.find(x => x.id === t.dataset.id); await col('vendas').salvar(v.id, { status: 'expirado' }); v.status = 'expirado'; render(); },
  async 'reabrir-venda'(t) { const v = C.vendas.find(x => x.id === t.dataset.id); await col('vendas').salvar(v.id, { status: 'pendente' }); v.status = 'pendente'; render(); },
  async 'confirmar-sessao'(t) {
    const p = C.pedidos.find(x => x.id === t.dataset.id);
    await col('pedidos').salvar(p.id, { status: 'pago', pagoEm: hoje() }); p.status = 'pago';
    const v = { nome: p.nome || nomeDe(p.coacheeId), email: p.email || '', produto: 'sessao', forma: 'Link de pagamento', valor: C.cfg.precoSessao || '', status: 'pago', data: p.data, confirmadoEm: hoje(), confirmadoPor: S.u.id, pedidoId: p.id };
    const id = await col('vendas').adicionar(v); C.vendas.unshift({ id, ...v });
    toast('Pagamento confirmado. O pedido aparece no topo de "Precisam de você" do coach.'); render();
  },
  async 'cancelar-sessao'(t) { const p = C.pedidos.find(x => x.id === t.dataset.id); await col('pedidos').salvar(p.id, { status: 'cancelado' }); p.status = 'cancelado'; render(); }
});

/* ===================== Ajustes (RF-65) ===================== */
VIEWS.admin.ajustes = () => {
  const c = C.cfg; const cl = c.cloudinary || {}; const ej = c.emailjs || {}; const ev = c.evento || {};
  const temConteudo = Object.keys(C.trilhas).length > 0;
  const campo = (id, rot, v, ph = '', tipo = 'text') => `<label class="rotulo" for="${id}">${rot}</label><input class="campo" id="${id}" type="${tipo}" value="${esc(v || '')}" placeholder="${esc(ph)}">`;
  return `
  <div class="topo"><div><div class="sobre">Programa</div><h1>Ajustes</h1></div></div>
  ${!temConteudo ? `<div class="card ouro" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><div class="rotulinho ouro-tx">Primeiro passo</div><b>Instale o conteúdo inicial do programa</b><div class="mu" style="font-size:13px">Cria as quatro trilhas, os 8 passos da jornada e as aulas sugeridas. Depois o coach publica os vídeos em "O que eu ensino".</div></div><button class="bt bt-ouro" data-acao="instalar">Instalar conteúdo inicial</button></div>` : ''}
  <form id="form-ajustes">
  <div class="grade g2">
    <div class="card"><h3>Programa e links</h3>
      ${campo('aj-nome', 'Nome do programa', c.nome, 'Programa de Alta Performance')}
      ${campo('aj-wa', 'Convite do grupo no WhatsApp', c.whatsapp, 'https://chat.whatsapp.com/…')}
      ${campo('aj-disc', 'Link do teste DISC (NBM)', c.disc, 'https://…')}
      ${campo('aj-sala', 'Sala padrão da mentoria em grupo', c.sala, 'https://meet.google.com/…')}</div>
    <div class="card"><h3>Evento presencial anual</h3>
      ${campo('ev-t', 'Nome do evento', ev.titulo, 'Encontro Alta Performance 2027')}
      <div class="duas"><div>${campo('ev-d', 'Data', ev.data, '', 'date')}</div><div>${campo('ev-l', 'Local', ev.local, 'Cidade - UF')}</div></div>
      ${campo('ev-x', 'Descrição', ev.descricao, 'Um dia de imersão com todos os coachees.')}</div>
    <div class="card"><h3>Áudios, fotos e arquivos · Cloudinary <span class="chip ${cl.nome && cl.preset ? 'ok' : 'warn'} acao">${cl.nome && cl.preset ? 'configurado' : 'pendente'}</span></h3>
      <p class="mu" style="font-size:12.5px;margin:-4px 0 12px">Plano gratuito. Crie um "upload preset" do tipo <b>Unsigned</b>, limitado a áudio, imagem e PDF.</p>
      ${campo('cl-n', 'Cloud name', cl.nome, 'ex.: programa-ap')}${campo('cl-p', 'Upload preset (unsigned)', cl.preset, 'ex.: plataforma')}</div>
    <div class="card"><h3>E-mails de aviso · EmailJS <span class="chip ${ej.servico && ej.chave ? 'ok' : 'warn'} acao">${ej.servico && ej.chave ? 'configurado' : 'pendente'}</span></h3>
      <p class="mu" style="font-size:12.5px;margin:-4px 0 12px">Plano gratuito: 200 e-mails por mês. O e-mail para criar a senha sai pelo Firebase, fora dessa cota.</p>
      <div class="duas"><div>${campo('ej-s', 'Service ID', ej.servico)}</div><div>${campo('ej-k', 'Public key', ej.chave)}</div>
      <div>${campo('ej-b', 'Modelo de boas-vindas', ej.modeloBoasVindas, 'template_…')}</div><div>${campo('ej-a', 'Modelo de aviso', ej.modeloAviso, 'template_…')}</div></div>
      <p class="mu" style="font-size:12px;margin:0">Variáveis: {{to_name}}, {{to_email}}, {{plano}}, {{data_fim}}, {{link_whatsapp}}, {{link_plataforma}} (boas-vindas); {{assunto}} e {{mensagem}} (aviso).</p></div>
  </div>
  <div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="bt bt-ouro" type="submit">Salvar ajustes</button></div>
  </form>
  ${temConteudo ? `<div class="card" style="margin-top:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><b>Conteúdo do programa</b><div class="mu" style="font-size:13px">Atualiza os campos dos passos e inclui itens que faltarem, sem apagar as aulas e os vídeos já publicados.</div></div><button class="bt bt-linha bt-sm" data-acao="instalar">Atualizar conteúdo do programa</button></div>` : ''}`;
};
FORMS['form-ajustes'] = async () => {
  const d = {
    nome: valor('aj-nome') || 'Programa de Alta Performance', whatsapp: valor('aj-wa'), disc: valor('aj-disc'), sala: valor('aj-sala'),
    evento: { titulo: valor('ev-t'), data: valor('ev-d'), local: valor('ev-l'), descricao: valor('ev-x') },
    cloudinary: { nome: valor('cl-n'), preset: valor('cl-p') },
    emailjs: { servico: valor('ej-s'), chave: valor('ej-k'), modeloBoasVindas: valor('ej-b'), modeloAviso: valor('ej-a') }
  };
  for (const k of ['whatsapp', 'disc', 'sala']) if (d[k] && !/^https:\/\//.test(d[k])) { toast('Os links precisam começar com https://'); return; }
  await col('config').salvar('programa', d); Object.assign(C.cfg, d); toast('Ajustes salvos.'); render();
};
// Grava as trilhas e os passos do arquivo conteudo.js. Aulas existentes mantêm título, vídeo e ordem.
ACOES.instalar = async () => {
  const novos = []; let atualizados = 0;
  for (const [id, t] of Object.entries(CONTEUDO.trilhas)) if (!C.trilhas[id]) { await col('trilhas').salvar(id, t); C.trilhas[id] = { id, ...t }; novos.push(id); }
  for (const [id, it] of Object.entries(CONTEUDO.itens)) {
    if (!C.itens[id]) { await col('itens').salvar(id, it); C.itens[id] = { id, ...it }; novos.push(id); }
    else if (it.tipo === 'passo') { await col('itens').salvar(id, { campos: it.campos || null, chave: it.chave || null, sub: it.sub }); Object.assign(C.itens[id], { campos: it.campos, chave: it.chave }); atualizados++; }
  }
  if (!C.cfg.nome) { const base = { nome: 'Programa de Alta Performance', meses: 12, duracaoSessao: 60 }; await col('config').salvar('programa', base); Object.assign(C.cfg, base); }
  C.L = R.lista(C.trilhas, C.itens);
  toast(novos.length ? `Conteúdo instalado: ${plural(novos.length, 'item novo', 'itens novos')}.` : `Conteúdo já instalado. ${plural(atualizados, 'passo atualizado', 'passos atualizados')}.`); render();
};
