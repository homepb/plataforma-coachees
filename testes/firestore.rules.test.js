// Testes das regras de segurança no emulador do Firestore.
// Uso: npx firebase emulators:exec --only firestore --project demo-coachees "node --test testes/firestore.rules.test.js"
const { test, before, after } = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

let env;
const db = uid => env.authenticatedContext(uid).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-coachees',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') }
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const f = ctx.firestore();
    const u = (id, d) => f.doc(`usuarios/${id}`).set(d);
    await u('admin', { nome: 'Adm', email: 'a@x', papel: 'admin' });
    await u('vini', { nome: 'Vinicius', email: 'v@x', papel: 'coach' });
    await u('mari', { nome: 'Mariana', email: 'm@x', papel: 'coach' });
    await u('ana', { nome: 'Ana', email: 'ana@x', papel: 'coachee', coachId: 'vini', inicio: '2026-08-08', fim: '2027-08-07' });
    await u('bruno', { nome: 'Bruno', email: 'b@x', papel: 'coachee', coachId: 'mari', inicio: '2026-06-02', fim: '2027-06-01' });
    await f.doc('progresso/ana_e1').set({ coacheeId: 'ana', itemId: 'e1', ok: true });
    await f.doc('progresso/bruno_e1').set({ coacheeId: 'bruno', itemId: 'e1', ok: true });
    await f.doc('anotacoes/ana').set({ coacheeId: 'ana', texto: 'privado' });
    await f.doc('vendas/v1').set({ nome: 'Rafael', status: 'pendente' });
    await f.doc('config/programa').set({ nome: 'Programa' });
    await f.doc('itens/a11').set({ titulo: 'Boas-vindas', trilhaId: 't1' });
  });
});
after(async () => { await env.cleanup(); });

const doCoachee = (uid, cid) => db(uid).collection('progresso').where('coacheeId', '==', cid).get();

test('coachee lê só os próprios dados', async () => {
  await assertSucceeds(doCoachee('ana', 'ana'));
  await assertFails(doCoachee('ana', 'bruno'));
});

test('coach lê só a própria carteira', async () => {
  await assertSucceeds(doCoachee('vini', 'ana'));
  await assertFails(doCoachee('vini', 'bruno'));
  await assertSucceeds(db('vini').collection('usuarios').where('coachId', '==', 'vini').get());
  await assertFails(db('vini').collection('usuarios').get());
});

test('administrador não lê o conteúdo do coaching, mas gerencia pessoas e vendas', async () => {
  await assertFails(doCoachee('admin', 'ana'));
  await assertFails(db('admin').doc('anotacoes/ana').get());
  await assertSucceeds(db('admin').collection('usuarios').get());
  await assertSucceeds(db('admin').doc('usuarios/novo').set({ nome: 'Novo', papel: 'coachee', coachId: 'vini' }));
  await assertSucceeds(db('admin').doc('vendas/v1').update({ status: 'pago' }));
  await assertFails(db('ana').doc('vendas/v1').get());
  await assertFails(db('vini').doc('vendas/v1').get());
});

test('coachee não muda o próprio perfil, prazo ou coach', async () => {
  await assertSucceeds(db('ana').doc('usuarios/ana').update({ foto: 'https://x/y.jpg', ultimoAcesso: '2026-10-09' }));
  await assertFails(db('ana').doc('usuarios/ana').update({ papel: 'admin' }));
  await assertFails(db('ana').doc('usuarios/ana').update({ fim: '2030-01-01' }));
  await assertFails(db('ana').doc('usuarios/ana').update({ coachId: 'mari' }));
  await assertFails(db('vini').doc('usuarios/novo2').set({ nome: 'X', papel: 'coachee' }));
});

test('anotações do coach são privadas', async () => {
  await assertFails(db('ana').doc('anotacoes/ana').get());
  await assertSucceeds(db('vini').doc('anotacoes/ana').get());
  await assertFails(db('mari').doc('anotacoes/ana').get());
});

test('comentários só pelo coach responsável', async () => {
  const c = { coacheeId: 'ana', alvo: 'e1', texto: 'ok' };
  await assertFails(db('ana').doc('comentarios/ana_e1').set(c));
  await assertFails(db('mari').doc('comentarios/ana_e1').set(c));
  await assertSucceeds(db('vini').doc('comentarios/ana_e1').set(c));
  await assertSucceeds(db('ana').collection('comentarios').where('coacheeId', '==', 'ana').get());
});

test('coachee grava os próprios registros e não os de outro', async () => {
  await assertSucceeds(db('ana').doc('progresso/ana_e2').set({ coacheeId: 'ana', itemId: 'e2', ok: true }));
  await assertFails(db('ana').doc('progresso/bruno_e2').set({ coacheeId: 'bruno', itemId: 'e2', ok: true }));
  await assertFails(db('ana').doc('progresso/bruno_e1').update({ ok: false }));
  await assertSucceeds(db('ana').doc('insignias/ana').get());
  await assertSucceeds(db('ana').doc('insignias/ana').set({ coacheeId: 'ana', ganhas: { meta: '2026-10-09' } }));
  await assertFails(db('ana').doc('insignias/bruno').set({ coacheeId: 'bruno', ganhas: {} }));
});

test('sessão avulsa: coachee pede, só o administrador confirma', async () => {
  await assertSucceeds(db('ana').doc('pedidos/p1').set({ coacheeId: 'ana', status: 'aguardando', motivo: 'x' }));
  await assertFails(db('ana').doc('pedidos/p2').set({ coacheeId: 'ana', status: 'pago', motivo: 'x' }));
  await assertFails(db('ana').doc('pedidos/p1').update({ status: 'pago' }));
  await assertSucceeds(db('admin').doc('pedidos/p1').update({ status: 'pago' }));
  await assertSucceeds(db('vini').doc('pedidos/p1').update({ status: 'agendado' }));
});

test('conteúdo: todos leem, só a equipe publica', async () => {
  await assertSucceeds(db('ana').doc('itens/a11').get());
  await assertFails(db('ana').doc('itens/a11').update({ titulo: 'x' }));
  await assertSucceeds(db('vini').doc('itens/a11').update({ video: 'https://youtu.be/abcdefghijk' }));
  await assertFails(db('vini').doc('config/programa').update({ nome: 'x' }));
  await assertSucceeds(db('admin').doc('config/programa').update({ nome: 'Programa Master' }));
  await assertFails(env.unauthenticatedContext().firestore().doc('itens/a11').get());
});

test('coach desativado perde o acesso', async () => {
  await env.withSecurityRulesDisabled(ctx => ctx.firestore().doc('usuarios/mari').update({ ativo: false }));
  await assertFails(doCoachee('mari', 'bruno'));
});
