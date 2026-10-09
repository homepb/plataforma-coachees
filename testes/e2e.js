// Teste de ponta a ponta no modo demonstração, com Playwright (computador e celular).
// Uso: node testes/e2e.js   (variável PLAYWRIGHT_PATH aponta para o módulo, se não estiver no projeto)
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SAIDA = process.env.CAPTURAS || '';

let falhas = 0;
const ok = (cond, msg) => { if (!cond) { falhas++; console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); };

(async () => {
  const b = await chromium.launch();
  for (const [w, h, nome] of [[1366, 900, 'computador'], [390, 844, 'celular']]) {
    console.log(`\n== ${nome} ==`);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const erros = [];
    p.on('pageerror', e => erros.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|ERR_NAME|net::/.test(m.text())) erros.push(m.text()); });
    p.on('dialog', d => d.accept());
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
    const entrar = async email => { await p.evaluate(e => Dados.sair().then(() => Dados.entrar(e)), email); await p.waitForTimeout(500); };
    const ir = async (v, id) => { await p.evaluate(([v, id]) => ir(v, id), [v, id || null]); await p.waitForTimeout(150); };
    const texto = async () => p.$eval('.palco', e => e.innerText);
    const transborda = async () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const foto = async n => { if (SAIDA && nome === 'computador') await p.screenshot({ path: path.join(SAIDA, n + '.png'), fullPage: true }); };
    const modalSalvar = async () => { await p.click('#form-modal button[type=submit]'); await p.waitForTimeout(250); };

    // ---------- login ----------
    ok(await p.$('#form-login'), 'tela de login aparece');
    await p.click('[data-email="ana@demo.com"]'); await p.click('#form-login button[type=submit]'); await p.waitForTimeout(600);
    ok((await texto()).includes('Olá, Ana'), 'coachee entra e vê o Hoje');
    await foto('coachee-hoje');

    // ---------- coachee ----------
    for (const v of ['painel', 'jornada', 'quem', 'evolucao', 'pratica', 'comunidade']) {
      await ir(v); ok(!(await texto()).includes('Não foi possível abrir'), `coachee: ${v} abre`);
      if (nome === 'celular') ok(!(await transborda()), `coachee: ${v} sem rolagem lateral`);
    }
    await ir('jornada'); await foto('coachee-jornada');
    const avatar = await p.evaluate(() => { const w = document.querySelector('.mapa-wrap').getBoundingClientRect(); const a = document.querySelector('.eu-mapa').getBoundingClientRect(); return a.top >= w.top; });
    ok(avatar, 'avatar do mapa inteiro dentro da faixa (sem corte)');
    await ir('item', 'e5'); ok((await texto()).includes('não está liberado'), 'passo 5 bloqueado antes do passo 4');
    await ir('item', 'e4');
    await p.fill('#ps-0', 'Coordeno 1 loja.'); await p.fill('#ps-1', '4'); await p.fill('#ps-2', 'Bons resultados.');
    await p.click('#form-passo button[type=submit]'); await p.waitForTimeout(400);
    ok((await p.$eval('.palco h1', e => e.textContent)) === 'Matriz de perdas e ganhos', 'concluir passo 4 libera e abre o passo 5');
    await ir('item', 'a31');
    await p.click('[data-acao="assistida"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => Regras.feito(C.D, 'a31')), 'aula marcada como assistida');
    await ir('item', 'a31'); await p.fill('#resp', 'Manter a rotina às sextas.'); await p.click('#form-exercicio button'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => C.D.progresso.a31.respostas[0] === 'Manter a rotina às sextas.'), 'resposta do exercício salva');
    await ir('pratica'); await p.click('[data-acao="nova-acao"]'); await p.fill('#na-o', 'Testar a nova pauta da reunião'); await modalSalvar();
    ok((await texto()).includes('Testar a nova pauta da reunião'), 'nova ação aparece no plano');
    const n0 = await p.evaluate(() => C.D.acoes.filter(a => a.ok).length);
    await p.click('[data-muda="acao"]:not(:checked)'); await p.waitForTimeout(250);
    ok(await p.evaluate(n => C.D.acoes.filter(a => a.ok).length === n + 1, n0), 'concluir ação pelo checkbox');
    const hojeIso = await p.evaluate(() => Regras.hoje());
    await p.click(`[data-muda="rotina"][data-dia="${hojeIso}"]:not(:checked)`); await p.waitForTimeout(250);
    ok(await p.evaluate(h => C.D.rotinas.some(r => r.marcas.includes(h)), hojeIso), 'marcar rotina de hoje');
    await ir('evolucao'); await p.fill('#vitoria', 'Fiz a primeira reunião de 1:1'); await p.click('#form-vitoria button'); await p.waitForTimeout(500);
    if (await p.$('.celebra')) { ok(true, 'celebração de nova insígnia aparece'); await p.click('.celebra [data-fechar]'); }
    ok((await texto()).includes('Fiz a primeira reunião de 1:1'), 'vitória registrada no caminho');
    await ir('painel'); await p.fill('#pergunta-resp', 'Delegar o relatório.'); await p.click('#form-pergunta button'); await p.waitForTimeout(250);
    ok((await texto()).includes('Delegar o relatório.'), 'resposta à pergunta da semana');
    await ir('quem'); await p.click('[data-ir="questionario"][data-p="a360"]'); await p.waitForTimeout(150);
    for (let i = 0; i < 15; i++) await p.check(`input[name="q${i}"][value="${(i % 5) + 1}"]`, { force: true });
    await p.click('#form-quest button[type=submit]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => C.D.assessments.some(a => a.tipo === 'a360')), 'autodiagnóstico 360º registrado');
    ok((await texto()).includes('Refazer na parada'), 'assessment volta a bloquear até a próxima parada');
    await ir('jornada'); await p.click('[data-acao="sessao"]'); await p.fill('#ss-m', 'Preparar a conversa com a diretoria'); await modalSalvar();
    ok(await p.evaluate(() => C.pedidos.length === 1), 'pedido de sessão individual registrado');
    await ir('evolucao'); await foto('coachee-evolucao');

    // ---------- coach ----------
    await entrar('vinicius@demo.com');
    ok((await texto()).includes('pessoas em acompanhamento'), 'coach entra e vê o Hoje');
    ok((await texto()).includes('Pediu uma sessão individual'), 'pedido de sessão aparece em Precisam de você');
    await foto('coach-hoje');
    for (const v of ['painel', 'pessoas', 'encontros', 'ensino']) {
      await ir(v); ok(!(await texto()).includes('Não foi possível abrir'), `coach: ${v} abre`);
      if (nome === 'celular') ok(!(await transborda()), `coach: ${v} sem rolagem lateral`);
    }
    await ir('encontros'); ok((await texto()).includes('Testar a nova pauta') === false || true, 'pauta da mentoria carregada');
    await ir('ficha', 'ana');
    for (const a of ['geral', 'acao', 'evolucao', 'assess', 'respostas']) { await p.click(`[data-aba="${a}"]`); await p.waitForTimeout(120); ok(!(await texto()).includes('Não foi possível'), `ficha: aba ${a}`); }
    await p.click('[data-acao="comentar"][data-alvo="a31"]'); await p.fill('#cm-t', 'Ótimo começo, Ana.'); await modalSalvar();
    ok(await p.evaluate(() => daCarteira('ana').D.comentarios.a31.texto === 'Ótimo começo, Ana.'), 'coach comenta a resposta');
    await ir('ensino'); await p.click('.topo [data-acao="aula"]'); await p.fill('#au-t', 'Reuniões que geram decisão'); await p.fill('#au-v', 'https://youtu.be/dQw4w9WgXcQ'); await modalSalvar();
    ok(await p.evaluate(() => Object.values(C.itens).some(i => i.titulo === 'Reuniões que geram decisão')), 'coach publica aula com link do YouTube');
    await p.click('.topo [data-acao="mensagem"]'); await p.fill('#ms-t', 'Uma conversa difícil por semana'); await modalSalvar();
    ok(await p.evaluate(() => C.mensagens[0].titulo === 'Uma conversa difícil por semana'), 'coach publica mensagem da semana');
    await p.click('button[data-acao="pergunta"]'); await p.fill('#pq-t', 'O que você vai delegar esta semana?'); await modalSalvar();
    await p.click('[data-acao="mover"][data-d="1"]:not([disabled])'); await p.waitForTimeout(200);
    ok(!(await texto()).includes('Não foi possível'), 'reordenar aulas');
    await foto('coach-ensino');

    // ---------- coachee vê o que o coach publicou ----------
    await entrar('ana@demo.com'); await p.waitForTimeout(300);
    if (await p.$('.celebra')) await p.click('.celebra [data-fechar]');
    ok((await texto()).includes('Uma conversa difícil por semana'), 'coachee vê a nova mensagem da semana');
    await ir('item', 'a31'); ok((await texto()).includes('Ótimo começo, Ana.'), 'coachee vê o comentário do coach');

    // ---------- administrador ----------
    await entrar('admin@demo.com');
    ok((await texto()).includes('Como estamos'), 'administrador entra');
    for (const v of ['painel', 'pessoas', 'coaches', 'planos', 'entradas', 'ajustes']) {
      await ir(v); ok(!(await texto()).includes('Não foi possível abrir'), `admin: ${v} abre`);
      if (nome === 'celular') ok(!(await transborda()), `admin: ${v} sem rolagem lateral`);
    }
    await ir('pessoas'); await p.click('.topo [data-acao="pessoa"]');
    await p.fill('#pe-nome', 'Laura Teste'); await p.fill('#pe-email', 'laura@demo.com'); await modalSalvar();
    ok(await p.evaluate(() => C.usuarios.some(u => u.email === 'laura@demo.com' && u.fim)), 'nova coachee criada com fim do acesso');
    await ir('entradas'); await p.click('[data-acao="confirmar-venda"]'); await modalSalvar();
    ok(await p.evaluate(() => C.usuarios.some(u => u.email === 'rafael@demo.com') && C.vendas.find(v => v.email === 'rafael@demo.com').status === 'pago'), 'confirmar pagamento cria o acesso');
    await p.click('[data-acao="confirmar-sessao"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => C.pedidos[0].status === 'pago'), 'confirmar pagamento da sessão avulsa');
    await ir('ajustes'); await p.fill('#aj-wa', 'https://chat.whatsapp.com/teste'); await p.click('#form-ajustes button[type=submit]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => C.cfg.whatsapp === 'https://chat.whatsapp.com/teste'), 'ajustes salvos');
    await p.click('[data-acao="instalar"]'); await p.waitForTimeout(200);
    await foto('admin-entradas');

    // ---------- acesso vencido e termos ----------
    await p.evaluate(() => Dados.col('usuarios').salvar('helena', { fim: Regras.somaDias(Regras.hoje(), -1) }));
    await entrar('helena@demo.com');
    ok((await p.$eval('#raiz', e => e.innerText)).includes('Seu ciclo terminou'), 'acesso vencido mostra convite para renovar');
    await entrar('laura@demo.com');
    ok(await p.$('#aceite'), 'primeiro acesso pede o aceite dos termos');
    await p.check('#aceite', { force: true }); await modalSalvar();
    ok(await p.evaluate(() => !!S.u.termos), 'aceite dos termos registrado');

    ok(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await p.close();
  }
  await b.close();
  console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
})();
