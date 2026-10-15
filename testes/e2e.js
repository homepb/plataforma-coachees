// Teste de ponta a ponta no modo demonstração, com Playwright (computador e celular).
// Uso: node testes/e2e.js   (variável PLAYWRIGHT_PATH aponta para o módulo, se não estiver no projeto)
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?demo';
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
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|ERR_NAME|net::|Já existe um acesso/.test(m.text())) erros.push(m.text()); });
    p.on('dialog', d => d.accept());
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
    const entrar = async email => { await p.evaluate(e => Dados.sair().then(() => Dados.entrar(e)), email); await p.waitForTimeout(500); };
    const ir = async (v, id) => { await p.evaluate(([v, id]) => ir(v, id), [v, id || null]); await p.waitForTimeout(150); };
    const texto = async () => p.$eval('.palco', e => e.innerText);
    const transborda = async () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const foto = async n => { if (SAIDA && nome === 'computador') await p.screenshot({ path: path.join(SAIDA, n + '.png'), fullPage: true }); };
    const modalSalvar = async () => { await p.click('#form-modal button[type=submit]'); await p.waitForTimeout(250); };
    // Fecha a mensagem de confirmação de cadastro e devolve o texto dela.
    // Depois de salvar, a janela fecha e o aviso de sucesso aparece no topo da página.
    const confirmacao = async () => { await p.waitForTimeout(150); return p.evaluate(() => !$('#modal').open && $('#toast').classList.contains('on') && document.body.contains($('#toast')) && $('#toast').parentElement === document.body ? $('#toast').innerText : ''); };

    // ---------- login ----------
    ok(await p.$('#form-login'), 'tela de login aparece');
    await p.click('[data-email="ana@demo.com"]'); await p.click('#form-login button[type=submit]'); await p.waitForTimeout(600);
    ok(/(Bom dia|Boa tarde|Boa noite), Ana/.test(await texto()), 'coachee entra e vê o Hoje');
    // Parada aberta: o Hoje avisa no topo (início simulado para a Parada 1 estar aberta).
    const iniAna = await p.evaluate(() => { const i = S.u.inicio; S.u.inicio = Regras.somaDias(Regras.somaMeses(hoje(), -3), 3); render(); return i; });
    ok(await p.$('.parada-hoje [data-acao="ir-parada"]') && (await texto()).includes('Parada 1'), 'Hoje avisa que a parada abriu');
    await p.click('.parada-hoje [data-acao="ir-parada"]'); await p.waitForTimeout(200);
    ok(!!(await p.$('#form-parada')), 'botão leva ao formulário da parada');
    await p.evaluate(i => { S.u.inicio = i; ir('painel'); }, iniAna);
    ok(await p.$('.proximo-passo [data-ir="item"]') && await p.$eval('.proximo-passo', e => e.getBoundingClientRect().top < window.innerHeight), 'próximo passo no topo do Hoje, visível sem rolar');
    ok(await p.$$eval('.palco .bt-ouro', b => b.length) === 1, 'Hoje com um só botão principal');
    if (nome === 'celular') ok(await p.$('.nav-baixo [data-acao="menu-mais"]') && await p.$eval('.nav-baixo', e => getComputedStyle(e).position === 'fixed'), 'celular: menu fixo embaixo com Mais');
    await foto('coachee-hoje');
    // Meta escrita pelo "Hoje" sem liberar a Trilha II (progresso restaurado depois).
    const progAntes = await p.evaluate(() => JSON.stringify(C.D.progresso));
    await p.evaluate(() => { const pm = C.L.find(i => i.chave === 'meta'); C.D.progresso = {}; render(); });
    await p.click('[data-acao="escrever-meta"]'); await p.fill('#mt-0', 'Meta antecipada'); await p.fill('#mt-1', 'Indicador'); await p.fill('#mt-2', 'Porque'); await modalSalvar();
    ok((await texto()).includes('Meta antecipada') && await p.evaluate(() => { const pm = C.L.find(i => i.chave === 'meta'); return !R.feito(C.D, pm.id) && !R.acessivel(C.L, C.D, pm); }), 'coachee escreve a meta pelo Hoje sem liberar a Trilha II');
    await p.evaluate(async j => { const pm = C.L.find(i => i.chave === 'meta'); await Dados.col('progresso').remover(`${S.u.id}_${pm.id}`); C.D.progresso = JSON.parse(j); const v = C.D.progresso[pm.id]; if (v) await Dados.col('progresso').salvar(`${S.u.id}_${pm.id}`, v); render(); }, progAntes);

    // ---------- coachee ----------
    // Encontros: próximos do mais perto para o mais longe, depois os que já aconteceram (mais recente primeiro).
    await ir('comunidade');
    ok(await p.evaluate(() => {
      const h = hoje();
      const prox = C.encontros.filter(e => e.data >= h).map(e => e.data); const pass = C.encontros.filter(e => e.data < h).map(e => e.data).reverse();
      const esperado = [...prox, ...pass].map(d => C.encontros.find(e => e.data === d).titulo);
      const lista = [...document.querySelectorAll('.card')].find(c => c.querySelector('h3') && c.querySelector('h3').textContent.startsWith('Encontros e gravações'));
      const titulos = [...lista.querySelectorAll('.item .tx b')].map(b => b.textContent);
      return prox.length > 1 && prox.every((d, i) => !i || prox[i - 1] <= d) && JSON.stringify(titulos) === JSON.stringify(esperado) && lista.textContent.indexOf('Próximos') < lista.textContent.indexOf('Já aconteceram');
    }), 'encontros do mais próximo para o mais distante, depois os passados');
    ok(!(await texto()).includes('Fornecedores'), 'Comunidade sem a seção de fornecedores');
    await ir('jornada');
    ok((await texto()).includes('contratada à parte') && await p.evaluate(() => { const lid = C.L.filter(i => i.t.aParte); return lid.length > 0 && lid.every(i => !Regras.acessivel(C.L, C.D, i)); }), 'Trilha de Liderança bloqueada (contratada à parte)');
    ok(await p.evaluate(() => Regras.nucleo(C.L).length === 16), 'certificado conta só as Trilhas I a III');
    await ir('painel'); ok(/dias? seguidos? em movimento/.test(await texto()), 'Hoje mostra dias seguidos em movimento');
    ok(await p.$('.nav-grupo, .nav-baixo') !== null, 'acesso ao Grupo Mentoria no menu');
    await ir('quem'); await p.click('[data-ir="relatorio"]'); await p.waitForTimeout(200);
    ok((await texto()).includes('Relatório dos assessments') && await p.$('.relatorio .rel-tab') && await p.$('[data-acao="imprimir-relatorio"]'), 'relatório dos assessments para ver e salvar em PDF');
    await ir('comunidade');
    ok(!!(await p.$('#grupo-mentoria a.bt-wa[href^="https://chat.whatsapp.com"]')) && (await p.textContent('#grupo-mentoria')).includes('Falar no Grupo Mentoria'), 'Comunidade tem o botão do Grupo Mentoria no WhatsApp');
    for (const v of ['painel', 'jornada', 'quem', 'evolucao', 'pratica', 'comunidade']) {
      await ir(v); ok(!(await texto()).includes('Não foi possível abrir'), `coachee: ${v} abre`);
      if (nome === 'celular') ok(!(await transborda()), `coachee: ${v} sem rolagem lateral`);
    }
    await ir('jornada'); await foto('coachee-jornada');
    if (nome === 'computador') {
      const avatar = await p.evaluate(() => { const w = document.querySelector('.mapa-wrap').getBoundingClientRect(); const a = document.querySelector('.eu-mapa').getBoundingClientRect(); return a.top >= w.top; });
      ok(avatar, 'avatar do mapa inteiro dentro da faixa (sem corte)');
    } else ok(await p.$('.mapa-v .mv-passo.atual [data-ir="item"]'), 'celular: jornada vertical com o passo atual e Continuar');
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
    await ir('pratica'); await p.click('[data-acao="nova-acao"]'); await p.fill('#na-o', 'Testar a nova pauta da reunião');
    ok(await p.inputValue('#na-p') === '', 'nova ação começa sem prazo');
    await modalSalvar(); ok(await p.$('#modal[open]') && (await p.textContent('#toast')).includes('Defina até quando'), 'nova ação sem prazo pede o prazo');
    await p.click('#form-modal [data-acao="prazo-rapido"][data-d="15"]');
    ok(await p.inputValue('#na-p') === await p.evaluate(() => Regras.somaDias(hoje(), 15)), 'atalho "15 dias" preenche o prazo');
    await modalSalvar();
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
    // A Ana da demonstração já fez a inteligência emocional: o teste refaz a partir do zero.
    await p.evaluate(() => { C.D.assessments = C.D.assessments.filter(a => a.tipo !== 'ie'); });
    await ir('quem'); ok(!(await texto()).includes('Autodiagnóstico 360'), 'autodiagnóstico 360º não aparece mais');
    await p.click('[data-ir="questionario"][data-p="ie"]'); await p.waitForTimeout(150);
    for (let i = 0; i < 10; i++) await p.check(`input[name="q${i}"][value="${(i % 5) + 1}"]`, { force: true });
    await p.click('#form-quest button[type=submit]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => C.D.assessments.some(a => a.tipo === 'ie')), 'inteligência emocional registrada');
    ok((await texto()).includes('Refazer na parada') && await p.$eval('[aria-describedby="libera-ie"]', b => b.disabled), 'assessment volta a bloquear até a próxima parada');
    await ir('painel'); ok((await texto()).includes('Próximo horário livre'), 'Hoje mostra o próximo horário livre do coach');
    await p.click('.sessao-faixa [data-ir="sessao"]'); await p.waitForTimeout(200);
    ok(await p.$$eval('.agenda-dia .hora', b => b.length) >= 3, 'Sessão 1:1 mostra a agenda com horários livres');
    const hid = await p.$eval('.agenda-dia .hora', b => b.dataset.id); await p.click(`.hora[data-id="${hid}"]`); await p.waitForTimeout(150);
    await p.fill('#ss-m', 'Preparar a conversa com a diretoria'); await p.click('#form-sessao button[type=submit]'); await p.waitForTimeout(300);
    ok(await p.evaluate(h => C.horarios.find(x => x.id === h).status === 'reservado' && C.pedidos[0].horarioId === h, hid) && !(await p.$(`.hora[data-id="${hid}"]`)), 'coachee reserva o horário (sai da lista de livres)');
    // Segunda reserva: as duas sessões continuam aparecendo.
    await p.click('.agenda-dia .hora'); await p.fill('#ss-m', 'Revisar o plano de ação'); await p.click('#form-sessao button[type=submit]'); await p.waitForTimeout(300);
    ok(await p.$$eval('.minhas-sessoes .sessao-minha', c => c.length) === 2 && (await texto()).includes('Preparar a conversa com a diretoria') && (await texto()).includes('Revisar o plano de ação'), 'duas sessões reservadas aparecem juntas');
    await p.evaluate(() => { const x = C.pedidos[0]; x._st = x.status; x.status = 'agendado'; x.link = 'https://meet.google.com/abc-defg-hij'; render(); });
    ok(await p.$('.sm-acoes a[href="https://meet.google.com/abc-defg-hij"]') && await p.$('.sm-acoes a[href^="https://calendar.google.com/calendar/render"]'), 'sessão confirmada mostra Entrar na sessão e Adicionar à agenda');
    await p.evaluate(() => { const x = C.pedidos[0]; x.status = x._st; delete x._st; delete x.link; render(); });
    ok(await p.evaluate(() => C.pedidos.length === 2), 'pedidos de sessão individual registrados');
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
    await ir('encontros'); await p.click('[data-acao="avisar-encontro"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => $('#modal').open && /(Mentoria em grupo|Aula com convidado)/.test($('#av-texto').value) && !!document.querySelector('[data-acao="whats-aviso"]')), 'Avisar mostra o texto pronto, com copiar e WhatsApp');
    await p.click('#form-modal button[type=submit]'); await p.waitForTimeout(150);
    await ir('pessoas'); await p.click('[data-acao="novo-coachee"]'); await p.fill('#nc-nome', 'Marcos Novo'); await p.fill('#nc-email', 'marcos@demo.com'); await modalSalvar();
    ok((await confirmacao()).includes('cadastrado(a) com sucesso'), 'janela fecha e aviso de sucesso aparece no topo (coach)');
    ok((await texto()).includes('Marcos Novo') && await p.evaluate(() => daCarteira(C.carteira.find(c => c.u.email === 'marcos@demo.com').u.id).u.coachId === 'vinicius'), 'coach cadastra coachee na própria carteira');
    ok(await p.$eval('[data-acao="trocar-modo"]', b => b.textContent === 'Trocar para Administrador' && b.offsetParent !== null), 'coach com acesso de administrador vê a troca de perfil (menu do usuário)');
    await p.click('[data-acao="trocar-modo"]'); await p.waitForTimeout(400);
    ok((await texto()).includes('Como estamos'), 'coach troca para Administrador');
    await p.click('[data-acao="trocar-modo"]'); await p.waitForTimeout(400);
    ok((await texto()).includes('pessoas em acompanhamento'), 'e volta para Coach');
    await ir('pessoas');
    await p.click(`[data-acao="remover-coachee"][data-id="${await p.evaluate(() => C.carteira.find(c => c.u.email === 'marcos@demo.com').u.id)}"]`); await modalSalvar();
    ok(!(await texto()).includes('Marcos Novo') && await p.evaluate(() => Dados.col('usuarios').listar('email', 'marcos@demo.com').then(l => l[0].ativo === false)), 'coach remove coachee da carteira (acesso desativado)');
    await ir('ficha', 'ana');
    for (const a of ['geral', 'acao', 'evolucao', 'assess', 'respostas']) { await p.click(`[data-aba="${a}"]`); await p.waitForTimeout(120); ok(!(await texto()).includes('Não foi possível'), `ficha: aba ${a}`); }
    await p.click('[data-acao="comentar"][data-alvo="a31"]'); await p.fill('#cm-t', 'Ótimo começo, Ana.'); await modalSalvar();
    ok(await p.evaluate(() => daCarteira('ana').D.comentarios.a31.texto === 'Ótimo começo, Ana.'), 'coach comenta a resposta');
    await ir('ficha', 'ana'); await p.click('[data-aba="assess"]'); await p.waitForTimeout(150);
    await p.click('[data-acao="anexar-pdf-assess"][data-k="ie"]'); await p.setInputFiles('#pa-arq', { name: 'ie-ana.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') }); await modalSalvar(); await p.waitForTimeout(200);
    ok(await p.evaluate(() => daCarteira('ana').D.relatorios[0].tipo === 'ie') && !!(await p.$('.pdf-card .bt-ouro')), 'coach anexa o PDF da inteligência emocional na ficha');
    await ir('painel'); await p.evaluate(() => { const c = daCarteira('ana'); c.u._ini = c.u.inicio; c.u.inicio = Regras.somaDias(Regras.somaMeses(hoje(), -3), 3); render(); });
    ok((await texto()).includes('Parada 1 aberta') && !!(await p.$('[data-acao="avisar-parada"][data-c="ana"]')), 'coach vê a parada aberta em Precisam de você, com Avisar');
    ok(await p.evaluate(async () => { C.cfg.emailjs = { servico: 's', chave: 'k', modeloAviso: 'm' }; const orig = Dados.enviarEmail; const env = []; Dados.enviarEmail = async (e, m, prm) => { env.push(prm); return true; };
      const n1 = await avisarParadasAbertas(); const n2 = await avisarParadasAbertas(); Dados.enviarEmail = orig; C.cfg.emailjs = {};
      return n1 >= 1 && n2 === 0 && env.some(x => x.to_email === 'ana@demo.com' && /Parada 1/.test(x.assunto)) && !!daCarteira('ana').D.avisos.parada_1; }), 'e-mail da parada sai uma vez só para quem está com ela aberta');
    await p.evaluate(() => { const c = daCarteira('ana'); c.u.inicio = c.u._ini; delete c.u._ini; render(); });
    await ir('meus'); await p.fill('#mc-wa', 'https://chat.whatsapp.com/grupoVinicius'); await p.fill('#mc-preco', '450'); await p.fill('#mc-apres', 'Coach de carreira há 12 anos.');
    await p.click('#form-meus button[type=submit]'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => Dados.col('coaches').obter('vinicius').then(c => c.whatsapp === 'https://chat.whatsapp.com/grupoVinicius' && c.precoSessao === '450')), 'coach salva os próprios ajustes (grupo e preço da sessão)');
    await ir('agenda'); ok((await texto()).includes('reservado') && (await texto()).includes('Preparar a conversa com a diretoria'), 'coach vê na agenda o horário reservado e o assunto');
    const antes = await p.evaluate(() => C.horarios.length);
    await p.fill('#hr-h', '9h, 15:30'); await p.selectOption('#hr-r', '2'); await p.click('#form-horario button[type=submit]'); await p.waitForTimeout(300);
    ok(await p.evaluate(n => C.horarios.length === n + 4 && C.horarios.some(x => x.hora === '09:00') && C.horarios.some(x => x.hora === '15:30'), antes), 'coach abre horários repetindo por semanas');
    await ir('ensino'); await p.click('.topo [data-acao="aula"]'); await p.fill('#au-t', 'Reuniões que geram decisão'); await p.fill('#au-v', 'https://youtu.be/dQw4w9WgXcQ'); await modalSalvar();
    ok(await p.evaluate(() => Object.values(C.itens).some(i => i.titulo === 'Reuniões que geram decisão')), 'coach publica aula com link do YouTube');
    // ---------- certificado (Modelo Clássico) ----------
    await ir('certificado'); ok((await texto()).includes('Nome do Coachee') && await p.$('.ct-classico'), 'coach vê a prévia do certificado');
    await p.fill('#ct-titulo', 'Certificado de Excelência'); await p.fill('#ct-horas', '48'); await p.dispatchEvent('#ct-horas', 'change'); await p.waitForTimeout(150);
    ok((await p.textContent('.ct-folha')).includes('Certificado de Excelência'), 'prévia acompanha o formulário antes de salvar');
    await p.click('#form-cert button[type=submit]'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => Dados.col('config').obter('certificado').then(c => c.titulo === 'Certificado de Excelência' && c.horas === '48')), 'coach salva o modelo do certificado');
    const progAna = await p.evaluate(() => JSON.stringify(daCarteira('ana').D.progresso));
    await p.evaluate(() => { const D = daCarteira('ana').D; C.L.forEach(i => { D.progresso[i.id] = { ...(D.progresso[i.id] || {}), ok: true, data: D.progresso[i.id]?.data || hoje() }; }); });
    await ir('certificado', 'ana'); const ct = await p.textContent('.ct-folha');
    ok(ct.includes('Ana Souza') && ct.includes('Carga horária: 48 horas') && /AP-\d{4}-[A-Z0-9]{6}/.test(ct) && !!(await p.$('[data-acao="imprimir-cert"]')), 'certificado gerado com os dados do coachee');
    await p.evaluate(j => { daCarteira('ana').D.progresso = JSON.parse(j); }, progAna); await ir('ensino');
    await p.click('.topo [data-acao="mensagem"]'); ok((await p.textContent('#modal')).includes('no máximo 20 minutos'), 'tela de gravação avisa o limite de 20 minutos'); await p.fill('#ms-t', 'Uma conversa difícil por semana'); await modalSalvar();
    ok(await p.evaluate(() => C.mensagens[0].titulo === 'Uma conversa difícil por semana'), 'coach publica mensagem da semana');
    await p.click('button[data-acao="pergunta"]'); await p.fill('#pq-t', 'O que você vai delegar esta semana?'); await modalSalvar();
    await p.click('[data-acao="mover"][data-d="1"]:not([disabled])'); await p.waitForTimeout(200);
    ok(!(await texto()).includes('Não foi possível'), 'reordenar aulas');
    await foto('coach-ensino');

    // ---------- coachee vê o que o coach publicou ----------
    await entrar('ana@demo.com'); await p.waitForTimeout(300);
    if (await p.$('.celebra')) await p.click('.celebra [data-fechar]');
    ok((await texto()).includes('Uma conversa difícil por semana'), 'coachee vê a nova mensagem da semana');
    await ir('comunidade'); ok(!!(await p.$('#grupo-mentoria a[href="https://chat.whatsapp.com/grupoVinicius"]')), 'coachee usa o grupo definido pelo próprio coach');
    await ir('sessao'); ok((await texto()).includes('R$ 450') && (await texto()).includes('Coach de carreira há 12 anos.'), 'Sessão 1:1 mostra o preço e a apresentação do coach');
    await ir('quem'); ok(!!(await p.$('.pdf-card .bt-ouro')) && (await texto()).includes('Resultado da inteligência emocional'), 'coachee vê o cartão do PDF com o botão Abrir PDF');
    await ir('item', 'a31'); ok((await texto()).includes('Ótimo começo, Ana.'), 'coachee vê o comentário do coach');

    // ---------- administrador ----------
    await entrar('admin@demo.com');
    ok((await texto()).includes('Como estamos'), 'administrador entra');
    for (const v of ['painel', 'pessoas', 'planos', 'entradas', 'ajustes']) {
      await ir(v); ok(!(await texto()).includes('Não foi possível abrir'), `admin: ${v} abre`);
      if (nome === 'celular') ok(!(await transborda()), `admin: ${v} sem rolagem lateral`);
    }
    await ir('pessoas'); await p.click('.topo [data-acao="pessoa"]');
    const visivel = () => p.$eval('#pe-so-coachee', e => !e.hidden);
    ok(await visivel() && await p.$eval('#pe-linha-admin', e => e.hidden), 'coachee: aparecem coach responsável e início, e nunca a opção de administrador');
    await p.selectOption('#pe-papel', 'coach');
    ok(!(await visivel()) && await p.$eval('#pe-linha-admin', e => !e.hidden), 'coach: sem coach responsável, com opção de administrador');
    await p.selectOption('#pe-papel', 'admin');
    ok(await p.$eval('#pe-linha-admin', e => e.hidden), 'administrador: sem a opção extra de administrador');
    await p.selectOption('#pe-papel', 'coachee');
    await p.fill('#pe-nome', 'Laura Teste'); await p.fill('#pe-email', 'laura@demo.com'); await modalSalvar();
    ok((await confirmacao()).includes('cadastrado(a) com sucesso') && await p.evaluate(() => S.view === 'pessoas'), 'janela fecha, volta para Pessoas e aviso de sucesso (administrador)');
    await p.click('.topo [data-acao="pessoa"]'); await p.fill('#pe-nome', 'Repetida'); await p.fill('#pe-email', 'laura@demo.com'); await modalSalvar();
    ok(await p.evaluate(() => $('#modal').open && $('#toast').parentElement === $('#modal') && $('#toast').classList.contains('erro')), 'erro aparece em vermelho por cima da janela (e-mail repetido)');
    await p.click('#form-modal [data-fechar]'); await p.waitForTimeout(150);
    ok(!(await p.$(`[data-acao="excluir-pessoa"][data-id="${await p.evaluate(() => S.u.id)}"]`)), 'administrador não vê "Excluir" no próprio cadastro');
    await p.click('[data-acao="excluir-pessoa"][data-id="vinicius"]'); await p.waitForTimeout(150);
    ok((await p.$eval('#modal', m => m.innerText)).includes('Não dá para excluir'), 'coach com carteira não pode ser excluído');
    await modalSalvar();
    await p.click('[data-acao="excluir-pessoa"][data-id="carla"]'); await modalSalvar();
    ok(await p.evaluate(() => !C.usuarios.some(u => u.id === 'carla')) && !(await texto()).includes('carla@demo.com'), 'administrador exclui uma pessoa');
    ok(await p.evaluate(() => C.usuarios.some(u => u.email === 'laura@demo.com' && u.fim)), 'nova coachee criada com fim do acesso');
    await ir('entradas'); await p.click('[data-acao="confirmar-venda"]'); await modalSalvar(); await confirmacao();
    ok(await p.evaluate(() => C.usuarios.some(u => u.email === 'rafael@demo.com') && C.vendas.find(v => v.email === 'rafael@demo.com').status === 'pago'), 'confirmar pagamento cria o acesso');
    await p.click('[data-acao="confirmar-sessao"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => C.pedidos.some(q => q.status === 'agendado') && Dados.col('horarios').obter(C.pedidos.find(q => q.status === 'agendado').horarioId).then(x => x.status === 'confirmado')), 'confirmar pagamento agenda a sessão no horário reservado');
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
