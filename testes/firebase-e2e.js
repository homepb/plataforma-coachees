// Teste de ponta a ponta contra o Firebase Emulator Suite (Auth + Firestore com as regras reais).
// Uso: npx firebase emulators:exec --only auth,firestore --project demo-coachees "node testes/firebase-e2e.js"
// Percorre o ciclo completo: administrador instala o conteúdo e cria coach e coachee; o coachee faz a jornada;
// o coach comenta e publica; o administrador confirma pagamentos. Falha se alguma regra negar uma operação.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const RAIZ = path.resolve(__dirname, '..');
const PROJ = 'demo-coachees';
const SDK = path.dirname(require.resolve('firebase/package.json'));
const PORTA = 5055;
const CONFIG = `window.FIREBASE_CONFIG = { apiKey: 'chave-de-teste', authDomain: '${PROJ}.firebaseapp.com', projectId: '${PROJ}' }; window.FIREBASE_EMULADOR = true;`;

let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas++; console.log(`  ${cond ? '✓' : '✗'} ${msg}`); };

// Servidor estático simples (o Auth não funciona em file://).
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/js/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(CONFIG); }
  const arq = path.join(RAIZ, url === '/' ? 'index.html' : url);
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' }); fs.createReadStream(arq).pipe(res);
});

async function criarAdmin() {
  const r = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@teste.com', password: 'Teste123!' }) });
  const { localId } = await r.json();
  const campos = { nome: { stringValue: 'Administração' }, email: { stringValue: 'admin@teste.com' }, papel: { stringValue: 'admin' }, ativo: { booleanValue: true } };
  await fetch(`http://127.0.0.1:8080/v1/projects/${PROJ}/databases/(default)/documents/usuarios/${localId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ fields: campos }) });
}
// Define a senha de quem recebeu o e-mail "criar senha", usando o código guardado pelo emulador.
async function definirSenha(email, senha) {
  const { oobCodes } = await (await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJ}/oobCodes`)).json();
  const c = oobCodes.filter(o => o.email === email && o.requestType === 'PASSWORD_RESET').pop();
  const r = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: c.oobCode, newPassword: senha }) });
  return r.ok;
}

(async () => {
  await new Promise(r => servidor.listen(PORTA, r));
  await criarAdmin();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) erros.push(m.text()); });
  await p.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ path: path.join(SDK, path.basename(new URL(r.request().url()).pathname)), contentType: 'text/javascript' }));
  await p.goto(`http://localhost:${PORTA}/`);

  const espera = ms => p.waitForTimeout(ms);
  const texto = () => p.$eval('#raiz', e => e.innerText);
  const ir = async (v, id) => { await p.evaluate(([v, id]) => ir(v, id), [v, id || null]); await espera(200); };
  const salvarModal = async () => { await p.click('#form-modal button[type=submit]'); await espera(900); };
  const entrar = async (email, senha) => {
    if (await p.$('.app')) { await p.evaluate(() => Dados.sair()); await espera(600); }
    await p.waitForSelector('#form-login');
    await p.fill('#login-email', email); await p.fill('#login-senha', senha); await p.click('#form-login button[type=submit]');
    await p.waitForSelector('.app, #aceite, .bloqueio', { timeout: 15000 }); await espera(800);
  };

  console.log('\n== administrador ==');
  await entrar('admin@teste.com', 'Teste123!');
  ok((await texto()).includes('Como estamos'), 'administrador entra com e-mail e senha');
  await ir('ajustes'); await p.click('[data-acao="instalar"]'); await espera(2500);
  ok(await p.evaluate(() => C.L.length === 20), 'conteúdo inicial instalado (20 itens)');
  await p.fill('#aj-wa', 'https://chat.whatsapp.com/teste'); await p.click('#form-ajustes button[type=submit]'); await espera(600);
  await ir('coaches'); await p.click('[data-acao="pessoa"][data-papel="coach"]');
  await p.fill('#pe-nome', 'Vinicius'); await p.fill('#pe-email', 'vinicius@teste.com'); await salvarModal(); await espera(800);
  ok(await p.evaluate(() => C.usuarios.some(u => u.email === 'vinicius@teste.com' && u.papel === 'coach')), 'coach criado (login + cadastro + e-mail de senha)');
  await ir('pessoas'); await p.click('.topo [data-acao="pessoa"]');
  await p.fill('#pe-nome', 'Ana Souza'); await p.fill('#pe-email', 'ana@teste.com'); await salvarModal(); await espera(800);
  ok(await p.evaluate(() => C.usuarios.some(u => u.email === 'ana@teste.com' && u.coachNome === 'Vinicius')), 'coachee criada com o coach responsável');
  ok(await p.evaluate(() => S.u.email === 'admin@teste.com'), 'criar acessos não derruba a sessão do administrador');
  await ir('entradas'); await p.click('[data-acao="venda"]'); await p.fill('#vd-n', 'Rafael Nunes'); await p.fill('#vd-e', 'rafael@teste.com'); await salvarModal();
  await p.click('[data-acao="confirmar-venda"]'); await salvarModal(); await espera(800);
  ok(await p.evaluate(() => C.vendas[0].status === 'pago' && C.usuarios.some(u => u.email === 'rafael@teste.com')), 'confirmar pagamento cria o acesso do cliente');

  ok(await definirSenha('ana@teste.com', 'Ana12345!'), 'coachee cria a senha pelo link do e-mail');
  ok(await definirSenha('vinicius@teste.com', 'Vini1234!'), 'coach cria a senha pelo link do e-mail');

  console.log('\n== coachee ==');
  await entrar('ana@teste.com', 'Ana12345!');
  ok(!!(await p.$('#aceite')), 'primeiro acesso pede o aceite dos termos');
  await p.check('#aceite', { force: true }); await salvarModal();
  ok((await texto()).includes('Olá, Ana'), 'coachee vê o Hoje');
  await p.setInputFiles('[data-muda="foto"]', { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqGeoBwAEfQGAxk9RYgAAAABJRU5ErkJggg==', 'base64') });
  await espera(1200);
  ok(await p.evaluate(() => !!S.u.foto), 'foto de perfil salva');
  await ir('item', 'a11'); await p.click('[data-acao="assistida"]'); await espera(800);
  await ir('item', 'e1'); for (let k = 0; k < 12; k++) await p.fill(`#ps-${k}`, String((k % 10) + 1));
  await p.click('#form-passo button[type=submit]'); await espera(1000);
  ok(await p.evaluate(() => Regras.feito(C.D, 'e1')), 'passo 1 (12 áreas) concluído');
  await ir('item', 'e2'); await p.fill('#ps-0', 'Decido rápido'); await p.fill('#ps-1', 'Centralizo'); await p.fill('#ps-2', 'Expansão'); await p.fill('#ps-3', 'Concorrência');
  await p.click('#form-passo button[type=submit]'); await espera(1000);
  await ir('item', 'e3'); await p.fill('#ps-0', 'Ser diretora regional até 2027'); await p.fill('#ps-1', 'Promoção oficial'); await p.fill('#ps-2', 'Crescer e cuidar da família');
  await p.click('#form-passo button[type=submit]'); await espera(1200);
  if (await p.$('.celebra')) await p.click('.celebra [data-fechar]');
  ok(await p.evaluate(() => !!Regras.meta(C.L, C.D)), 'meta escrita no passo 3');
  await ir('pratica'); await p.click('[data-acao="nova-acao"]'); await p.fill('#na-o', 'Reunião semanal com a equipe'); await p.check('#na-m', { force: true }); await salvarModal();
  await p.click('[data-acao="nova-rotina"]'); await p.fill('#nr-t', 'Revisar prioridades'); await salvarModal();
  await p.click('[data-muda="rotina"]:not([disabled])'); await espera(600);
  ok(await p.evaluate(() => C.D.acoes.length === 1 && C.D.rotinas[0].marcas.length === 1), 'ação e rotina gravadas');
  await ir('evolucao'); await p.fill('#vitoria', 'Primeira conversa de feedback'); await p.click('#form-vitoria button'); await espera(1200);
  if (await p.$('.celebra')) await p.click('.celebra [data-fechar]');
  await ir('quem'); await p.click('[data-ir="questionario"][data-p="ie"]'); await espera(200);
  for (let i = 0; i < 10; i++) await p.check(`input[name="q${i}"][value="4"]`, { force: true });
  await p.click('#form-quest button[type=submit]'); await espera(1000);
  ok(await p.evaluate(() => C.D.assessments.length === 1), 'assessment de inteligência emocional gravado');
  await ir('jornada'); await p.click('[data-acao="sessao"]'); await p.fill('#ss-m', 'Destravar a delegação'); await salvarModal();
  ok(await p.evaluate(() => C.pedidos.length === 1), 'pedido de sessão avulsa gravado');

  console.log('\n== coach ==');
  await entrar('vinicius@teste.com', 'Vini1234!');
  ok(await p.evaluate(() => C.carteira.map(c => c.u.email).sort().join() === 'ana@teste.com,rafael@teste.com'), 'coach vê a própria carteira (Ana e Rafael)');
  ok((await texto()).includes('Pediu uma sessão individual'), 'pedido de sessão em "Precisam de você"');
  await ir('ficha', (await p.evaluate(() => C.carteira[0].u.id)));
  for (const a of ['geral', 'acao', 'evolucao', 'assess', 'respostas']) { await p.click(`[data-aba="${a}"]`); await espera(200); }
  await p.click('[data-acao="comentar"][data-alvo="e3"]'); await p.fill('#cm-t', 'Meta clara. Vamos juntos.'); await salvarModal();
  await p.click('[data-aba="geral"]'); await p.click('[data-acao="anotacao"]'); await p.fill('#an-t', 'Perfil executor.'); await salvarModal();
  ok(await p.evaluate(() => C.anotacao.texto === 'Perfil executor.'), 'anotação privada salva');
  await ir('encontros'); ok((await texto()).includes('Reunião semanal com a equipe'), 'ação na pauta da mentoria');
  await p.click('.topo [data-acao="encontro"]'); await p.fill('#en-tit', 'Delegação'); await p.fill('#en-d', '2030-01-10'); await salvarModal();
  await ir('ensino'); await p.click('.topo [data-acao="mensagem"]'); await p.fill('#ms-t', 'Delegar não é perder o controle'); await salvarModal();
  await p.click('button[data-acao="pergunta"]'); await p.fill('#pq-t', 'O que você vai delegar?'); await salvarModal();
  await p.click('[data-acao="aula"][data-id="a12"]'); await p.fill('#au-v', 'https://youtu.be/dQw4w9WgXcQ'); await salvarModal();
  ok(await p.evaluate(() => C.mensagens.length === 1 && C.perguntas.length === 1 && C.itens.a12.video), 'coach publica mensagem, pergunta e vídeo');

  console.log('\n== coachee de novo ==');
  await entrar('ana@teste.com', 'Ana12345!');
  ok((await texto()).includes('Delegar não é perder o controle'), 'coachee vê a mensagem da semana');
  await p.fill('#pergunta-resp', 'O relatório mensal.'); await p.click('#form-pergunta button'); await espera(800);
  await ir('item', 'e3'); ok((await texto()).includes('Meta clara. Vamos juntos.'), 'coachee vê o comentário do coach');
  await ir('item', 'a12'); ok(!!(await p.$('.video iframe')), 'aula com vídeo do YouTube dentro da plataforma');

  console.log('\n== administrador de novo ==');
  await entrar('admin@teste.com', 'Teste123!');
  await ir('entradas'); await p.click('[data-acao="confirmar-sessao"]'); await espera(1000);
  ok(await p.evaluate(() => C.pedidos[0].status === 'pago'), 'administrador confirma o pagamento da sessão');
  ok(await p.evaluate(() => { const a = C.usuarios.find(u => u.email === 'ana@teste.com'); return a.resumo && a.resumo.pct > 0; }), 'resumo do progresso chega ao administrador');

  ok(erros.length === 0, 'nenhum erro nem permissão negada' + (erros.length ? ': ' + erros.join(' | ') : ''));
  await b.close(); servidor.close();
  console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
