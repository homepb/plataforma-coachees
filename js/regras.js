// Regras de negócio (seção 5 do documento de requisitos). Funções puras: recebem os dados e devolvem o cálculo.
// Sem servidor, tudo é calculado no navegador quando a tela abre.
//
// D = dados de um coachee: { progresso:{itemId:doc}, acoes:[], rotinas:[], assessments:[], vitorias:[],
//      paradas:{n:doc}, comentarios:{alvo:doc}, respostas:{perguntaId:doc}, insignias:{ganhas:{}} }

const Regras = (() => {
  const z = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  const data = s => { const [a, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
  const hoje = () => iso(new Date());
  const somaDias = (s, n) => { const d = data(s); d.setDate(d.getDate() + n); return iso(d); };
  // Soma meses mantendo o dia; quando o mês não tem o dia (31/01 + 1 mês), cai no último dia do mês.
  const somaMeses = (s, n) => {
    const [a, m, d] = s.slice(0, 10).split('-').map(Number);
    const ult = new Date(a, m - 1 + n + 1, 0).getDate();
    return iso(new Date(a, m - 1 + n, Math.min(d, ult)));
  };
  const dias = (a, b) => Math.round((data(b) - data(a)) / 864e5);
  const segunda = s => { const d = data(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };

  // RN-11: plano anual. O acesso vai do início até a véspera do mesmo dia, 12 meses depois.
  const fimDoAcesso = (inicio, meses = 12) => somaDias(somaMeses(inicio, meses), -1);

  /* ---------- jornada ---------- */
  // Lista plana de itens na ordem Trilha I → IV, cada um com a sua trilha e posição.
  function lista(trilhas, itens) {
    const ts = Object.entries(trilhas).map(([id, t]) => ({ id, ...t })).sort((a, b) => a.ordem - b.ordem);
    return ts.flatMap(t => {
      const its = Object.entries(itens).filter(([, i]) => i.trilhaId === t.id && !i.oculto)
        .map(([id, i]) => ({ id, ...i })).sort((a, b) => a.ordem - b.ordem);
      return its.map((i, k) => ({ ...i, t, k, total: its.length }));
    });
  }
  const feito = (D, id) => !!(D.progresso[id] && D.progresso[id].ok);
  const proximo = (L, D) => L.find(i => !feito(D, i.id)) || null; // RN-02
  // RN-01: na trilha sequencial, um passo só abre quando os anteriores estão feitos.
  const acessivel = (L, D, item) => !item.t.sequencial || L.filter(i => i.t.id === item.t.id && i.k < item.k).every(i => feito(D, i.id));
  function statusTrilha(L, D, tid) {
    const its = L.filter(i => i.t.id === tid);
    if (its.length && its.every(i => feito(D, i.id))) return 'feito';
    const p = proximo(L, D);
    return (p && p.t.id === tid) || its.some(i => feito(D, i.id)) ? 'atual' : 'aberta';
  }
  const pct = (L, D) => L.length ? Math.round(L.filter(i => feito(D, i.id)).length / L.length * 100) : 0;

  // RN-03: a meta é a resposta do passo com chave 'meta'.
  function meta(L, D) {
    const p = L.find(i => i.chave === 'meta'); const r = p && D.progresso[p.id] && D.progresso[p.id].respostas;
    return r && r[0] ? { id: p.id, meta: r[0], indicador: r[1] || '', porque: r[2] || '' } : null;
  }
  // Notas das 12 áreas no passo 1 (ponto de partida).
  function areasInicio(L, D) {
    const p = L.find(i => i.chave === 'areas'); const r = p && D.progresso[p.id] && D.progresso[p.id].respostas;
    return r ? Object.keys(r).sort((a, b) => a - b).map(k => +r[k]) : null;
  }

  /* ---------- plano de ação ---------- */
  const atrasada = (a, h) => !a.ok && !!a.prazo && a.prazo < h;

  /* ---------- paradas (RN-06) e reavaliação (RN-15) ---------- */
  // Paradas aos 3, 6, 9 e 12 meses do início. Abre 7 dias antes e fica aberta até ser registrada.
  function paradas(u, D, h) {
    return [1, 2, 3, 4].map(n => {
      const dt = n === 4 ? fimDoAcesso(u.inicio) : somaMeses(u.inicio, n * 3);
      const abre = somaDias(dt, -7); const reg = D.paradas[n];
      return { n, data: dt, abre, areas: n % 2 === 0, reg: reg || null, st: reg ? 'feito' : h >= abre ? 'aberto' : 'futuro' };
    });
  }
  const paradaAberta = (P) => P.find(p => p.st === 'aberto') || null;
  const proximaParada = (P) => P.find(p => p.st !== 'feito') || null;
  const historico = (D, tipo) => D.assessments.filter(a => a.tipo === tipo).sort((a, b) => (a.data + (a.criado || '')).localeCompare(b.data + (b.criado || '')));
  // Liberado quando nunca foi feito, ou quando há parada aberta e o último resultado é anterior à abertura dela.
  function liberado(D, tipo, P) {
    const h = historico(D, tipo); const u = h[h.length - 1]; const pa = paradaAberta(P);
    return !u || !!(pa && u.data < pa.abre);
  }
  // Resultado de um questionário 1–5: média de cada dimensão convertida para 0–100 (fórmula provisória).
  function resultadoQuest(q, resp) {
    const r = {};
    q.dims.forEach(dim => {
      const vs = q.perguntas.map((p, i) => [p, i]).filter(([p]) => p[0] === dim).map(([, i]) => +resp[i]);
      r[dim] = Math.round((vs.reduce((a, b) => a + b, 0) / vs.length - 1) / 4 * 100);
    });
    return r;
  }

  /* ---------- movimento (RN-04) ---------- */
  // Tudo o que conta como movimento, com data e descrição, do mais recente para o mais antigo.
  function percurso(L, D, u) {
    const ev = [];
    const nome = id => (L.find(i => i.id === id) || {}).titulo || 'item da jornada';
    Object.values(D.progresso).filter(p => p.ok && p.data).forEach(p => {
      const it = L.find(i => i.id === p.itemId);
      ev.push({ data: p.data, tipo: 'trilha', texto: it && it.tipo === 'passo' ? `Concluiu o passo ${it.k + 1} da jornada: ${it.titulo}` : `Concluiu a aula ${nome(p.itemId)}` });
    });
    D.acoes.filter(a => a.ok && a.okEm).forEach(a => ev.push({ data: a.okEm, tipo: 'ação', texto: `Ação concluída: ${a.oque}` }));
    D.rotinas.forEach(r => (r.marcas || []).forEach(m => ev.push({ data: m, tipo: 'rotina', texto: `Rotina: ${r.titulo}`, rotina: true })));
    D.vitorias.forEach(v => ev.push({ data: v.data, tipo: 'vitória', texto: v.texto, id: v.id }));
    Object.values(D.respostas).forEach(r => ev.push({ data: r.data, tipo: 'reflexão', texto: 'Respondeu à pergunta da semana' }));
    D.assessments.forEach(a => ev.push({ data: a.data, tipo: 'reflexão', texto: `Registrou ${a.tipo === 'disc' ? 'o perfil DISC' : a.tipo === 'ie' ? 'o assessment de inteligência emocional' : 'o autodiagnóstico 360º'}` }));
    Object.values(D.paradas).forEach(p => ev.push({ data: p.data, tipo: 'parada', texto: `Registrou a parada ${p.n}` }));
    if (u && u.inicio) ev.push({ data: u.inicio, tipo: 'início', texto: 'Começou o programa', inicio: true });
    return ev.sort((a, b) => b.data.localeCompare(a.data));
  }
  // Atividades por semana (segunda a domingo), das últimas n semanas até a atual.
  function semanas(L, D, u, h, n = 8) {
    const ev = percurso(L, D, u).filter(e => !e.inicio);
    const atual = segunda(h);
    return Array.from({ length: n }, (_, k) => {
      const seg = somaDias(atual, -7 * (n - 1 - k)); const fim = somaDias(seg, 6);
      return { seg, n: ev.filter(e => e.data >= seg && e.data <= fim).length };
    });
  }
  // Semanas seguidas em movimento até a atual. A semana atual ainda vazia não quebra a sequência.
  function sequencia(L, D, u, h) {
    const s = semanas(L, D, u, h, 60);
    let i = s.length - 1; if (s[i].n === 0) i--;
    let c = 0; for (; i >= 0 && s[i].n > 0; i--) c++;
    return c;
  }

  /* ---------- insígnias (RN-05) ---------- */
  function insignias(L, D, u, h) {
    const acoes = D.acoes.filter(a => a.ok).length;
    const seq = sequencia(L, D, u, h);
    const vit = D.vitorias.length;
    const rotina5 = D.rotinas.some(r => r.freq === 'diaria' && Object.values((r.marcas || []).reduce((s, m) => { const k = segunda(m); s[k] = (s[k] || 0) + 1; return s; }, {})).some(x => x >= 5));
    const regs = Object.values(D.paradas);
    const tr = id => { const its = L.filter(i => i.t.id === id); return its.length > 0 && its.every(i => feito(D, i.id)); };
    const todas = [
      ['acao1', 'pratica', '1', 'Primeira ação', 'Concluiu a primeira ação do plano', acoes >= 1],
      ['acao3', 'pratica', '3', 'Plano em movimento', '3 ações do plano concluídas', acoes >= 3],
      ['acao10', 'pratica', '10', 'Execução consistente', '10 ações do plano concluídas', acoes >= 10],
      ['sem4', 'pratica', '4', 'Ritmo', '4 semanas seguidas em movimento', seq >= 4],
      ['sem12', 'pratica', '12', 'Constância', '12 semanas seguidas em movimento', seq >= 12],
      ['rotina', 'pratica', 'R', 'Rotina firme', 'Uma rotina diária feita em 5 dias da semana', rotina5],
      ['vit1', 'pratica', 'V', 'Primeira vitória', 'Registrou uma pequena vitória', vit >= 1],
      ['vit5', 'pratica', '5', 'Olhar para o que dá certo', '5 vitórias registradas', vit >= 5],
      ['parada1', 'pratica', '3m', 'Primeira parada', 'Olhou para trás aos 3 meses', regs.length >= 1],
      ['antesdepois', 'pratica', '±', 'Antes e depois', 'Refez as 12 áreas da vida', regs.some(p => p.areas)],
      ['meta', 'jornada', 'M', 'Meta escrita', 'Escreveu a sua meta para 2027', !!meta(L, D)],
      ['t1', 'jornada', 'I', 'Autoconhecimento', 'Concluiu a Trilha I', tr('t1')],
      ['t2', 'jornada', 'II', 'Plano no papel', 'Concluiu a Trilha II', tr('t2')],
      ['t3', 'jornada', 'III', 'Competências em ação', 'Concluiu a Trilha III', tr('t3')],
      ['t4', 'jornada', 'IV', 'Líder em formação', 'Concluiu a Trilha IV', tr('t4')]
    ];
    const ganhas = (D.insignias && D.insignias.ganhas) || {};
    // Uma insígnia, uma vez conquistada, não se perde.
    return todas.map(([id, grupo, g, t, d, ok]) => ({ id, grupo, g, t, d, ok: ok || !!ganhas[id], nova: ok && !ganhas[id] }));
  }

  /* ---------- situação do coachee e "Precisam de você" (RN-08) ---------- */
  function situacao(u, D, h) {
    if (u.fim && u.fim < h) return { st: 'vencido', nota: 'Acesso encerrado' };
    const sem = u.ultimoAcesso ? dias(u.ultimoAcesso, h) : null;
    if (u.fim && dias(h, u.fim) <= 30) return { st: 'renovar', nota: `Acesso termina em ${dias(h, u.fim)} dias` };
    if (sem === null && dias(u.inicio, h) <= 7) return { st: 'novo', nota: `Começou em ${u.inicio.slice(8, 10)}/${u.inicio.slice(5, 7)}` };
    if (sem === null || sem > 7) return { st: 'parado', nota: sem === null ? 'Ainda não acessou' : `Sem acessar há ${sem} dias` };
    const at = D ? D.acoes.filter(a => atrasada(a, h)).length : (u.resumo && u.resumo.atrasadas) || 0;
    if (at) return { st: 'atencao', nota: at === 1 ? '1 ação atrasada' : `${at} ações atrasadas` };
    if (dias(u.inicio, h) <= 14) return { st: 'novo', nota: `Começou em ${u.inicio.slice(8, 10)}/${u.inicio.slice(5, 7)}` };
    return { st: 'ok', nota: 'Em dia' };
  }
  const ORDEM_ATENCAO = { atencao: 1, parado: 2, renovar: 3 };
  function precisam(carteira, pedidos, h) {
    const lista = pedidos.filter(p => p.status === 'pago' || p.status === 'aguardando')
      .map(p => ({ tipo: 'pedido', ordem: 0, pedido: p, coacheeId: p.coacheeId }));
    carteira.forEach(c => {
      const s = situacao(c.u, c.D, h);
      if (ORDEM_ATENCAO[s.st]) lista.push({ tipo: 'situacao', ordem: ORDEM_ATENCAO[s.st], coacheeId: c.u.id, ...s });
    });
    return lista.sort((a, b) => a.ordem - b.ordem);
  }

  return { iso, hoje, somaDias, somaMeses, dias, segunda, fimDoAcesso, lista, feito, proximo, acessivel, statusTrilha, pct,
    meta, areasInicio, atrasada, paradas, paradaAberta, proximaParada, historico, liberado, resultadoQuest,
    percurso, semanas, sequencia, insignias, situacao, precisam };
})();

if (typeof module !== 'undefined') module.exports = Regras;
