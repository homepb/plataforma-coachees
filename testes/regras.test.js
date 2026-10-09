// Testes das regras de negócio (js/regras.js). Uso: node --test testes/regras.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/regras.js');
const CONTEUDO = require('../js/conteudo.js');

const L = R.lista(CONTEUDO.trilhas, CONTEUDO.itens);
const vazio = () => ({ progresso: {}, acoes: [], rotinas: [], assessments: [], vitorias: [], paradas: {}, comentarios: {}, respostas: {}, insignias: { ganhas: {} } });
const feito = (D, ids, data = '2026-09-01') => ids.forEach(id => { D.progresso[id] = { itemId: id, ok: true, data }; });
const u = { inicio: '2026-08-08', fim: R.fimDoAcesso('2026-08-08') };

test('plano anual: acesso vai até a véspera, 12 meses depois (RN-11)', () => {
  assert.equal(R.fimDoAcesso('2026-08-08'), '2027-08-07');
  assert.equal(R.fimDoAcesso('2026-01-31'), '2027-01-30');
  assert.equal(R.somaMeses('2026-01-31', 1), '2026-02-28');
});

test('ordem da jornada: Trilha I → IV, e o próximo é o primeiro não concluído (RN-02)', () => {
  assert.equal(L[0].id, 'a11'); assert.equal(L.length, 20);
  const D = vazio(); feito(D, ['a11', 'a12']);
  assert.equal(R.proximo(L, D).id, 'a13');
});

test('Trilha II é passo a passo; as outras ficam abertas (RN-01)', () => {
  const D = vazio(); const it = id => L.find(i => i.id === id);
  assert.equal(R.acessivel(L, D, it('e1')), true);
  assert.equal(R.acessivel(L, D, it('e2')), false);
  assert.equal(R.acessivel(L, D, it('a35')), true);
  feito(D, ['e1']); assert.equal(R.acessivel(L, D, it('e2')), true);
});

test('meta vem do passo 3 (RN-03)', () => {
  const D = vazio(); assert.equal(R.meta(L, D), null);
  D.progresso.e3 = { ok: true, respostas: { 0: 'Ser diretora', 1: 'Promoção', 2: 'Família' } };
  assert.deepEqual(R.meta(L, D), { id: 'e3', meta: 'Ser diretora', indicador: 'Promoção', porque: 'Família' });
});

test('paradas aos 3, 6, 9 e 12 meses, abrindo 7 dias antes (RN-06)', () => {
  const P = R.paradas(u, vazio(), '2026-11-01');
  assert.deepEqual(P.map(p => p.data), ['2026-11-08', '2027-02-08', '2027-05-08', '2027-08-07']);
  assert.equal(P[0].st, 'aberto'); assert.equal(P[1].st, 'futuro');
  assert.equal(R.paradas(u, vazio(), '2026-10-31')[0].st, 'futuro');
  assert.deepEqual(P.map(p => p.areas), [false, true, false, true]);
});

test('assessment bloqueia depois de feito e libera na parada (RN-15)', () => {
  const D = vazio();
  assert.equal(R.liberado(D, 'ie', R.paradas(u, D, '2026-08-20')), true);
  D.assessments.push({ tipo: 'ie', data: '2026-08-20', r: {} });
  assert.equal(R.liberado(D, 'ie', R.paradas(u, D, '2026-10-01')), false);
  assert.equal(R.liberado(D, 'ie', R.paradas(u, D, '2026-11-02')), true);
  D.assessments.push({ tipo: 'ie', data: '2026-11-03', r: {} });
  assert.equal(R.liberado(D, 'ie', R.paradas(u, D, '2026-11-04')), false);
});

test('semanas em movimento e sequência (RN-04)', () => {
  const D = vazio();
  D.vitorias.push({ data: '2026-09-21', texto: 'a' }, { data: '2026-09-29', texto: 'b' }, { data: '2026-10-05', texto: 'c' });
  // Semana atual (a partir de 05/10) tem atividade; as duas anteriores também.
  assert.equal(R.sequencia(L, D, u, '2026-10-07'), 3);
  // Semana atual ainda vazia não quebra a sequência.
  assert.equal(R.sequencia(L, D, u, '2026-10-12'), 3);
  assert.equal(R.sequencia(L, D, u, '2026-10-20'), 0);
  const s = R.semanas(L, D, u, '2026-10-07', 3);
  assert.deepEqual(s.map(x => x.n), [1, 1, 1]);
});

test('insígnias: conquistadas não se perdem e as novas são marcadas (RN-05)', () => {
  const D = vazio(); D.acoes.push({ ok: true, okEm: '2026-10-01' });
  let ins = R.insignias(L, D, u, '2026-10-07');
  assert.equal(ins.find(i => i.id === 'acao1').nova, true);
  D.insignias.ganhas = { acao1: '2026-10-01' }; D.acoes[0].ok = false;
  ins = R.insignias(L, D, u, '2026-10-07');
  assert.equal(ins.find(i => i.id === 'acao1').ok, true);
  assert.equal(ins.find(i => i.id === 'acao1').nova, false);
});

test('situação e "Precisam de você" na ordem certa (RN-08)', () => {
  const h = '2026-10-09';
  const base = { id: 'x', inicio: '2026-03-01', fim: '2027-02-28', ultimoAcesso: h };
  const D = vazio();
  assert.equal(R.situacao(base, D, h).st, 'ok');
  assert.equal(R.situacao({ ...base, ultimoAcesso: '2026-09-20' }, D, h).st, 'parado');
  assert.equal(R.situacao({ ...base, fim: '2026-10-30' }, D, h).st, 'renovar');
  assert.equal(R.situacao({ ...base, fim: '2026-10-01' }, D, h).st, 'vencido');
  const comAtraso = vazio(); comAtraso.acoes.push({ ok: false, prazo: '2026-10-01' });
  assert.equal(R.situacao(base, comAtraso, h).st, 'atencao');
  const lista = R.precisam([
    { u: { ...base, id: 'r', fim: '2026-10-30' }, D },
    { u: { ...base, id: 'p', ultimoAcesso: '2026-09-01' }, D },
    { u: { ...base, id: 'a' }, D: comAtraso }
  ], [{ coacheeId: 'z', status: 'pago' }], h);
  assert.deepEqual(lista.map(x => x.coacheeId), ['z', 'a', 'p', 'r']);
});

test('resultado do questionário: média por dimensão em 0–100%', () => {
  const q = CONTEUDO.QUEST.ie; const resp = {}; q.perguntas.forEach((p, i) => { resp[i] = 5; }); resp[0] = 1;
  const r = R.resultadoQuest(q, resp);
  assert.equal(r['Autoconsciência'], 50); assert.equal(r['Empatia'], 100);
});
