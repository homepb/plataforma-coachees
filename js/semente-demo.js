// Dados de exemplo do modo demonstração (sem Firebase). As datas são relativas ao dia de hoje.
function SementeDemo() {
  const R = Regras;
  const h = R.hoje();
  const dia = n => R.somaDias(h, n);

  const usuarios = {
    admin: { nome: 'Administração', email: 'admin@demo.com', papel: 'admin', ativo: true },
    vinicius: { nome: 'Vinicius', email: 'vinicius@demo.com', papel: 'coach', ativo: true },
    mariana: { nome: 'Mariana Costa', email: 'mariana@demo.com', papel: 'coach', ativo: true }
  };
  const coachee = (id, nome, cargo, coachId, inicioDesloc, acessoDesloc, extra = {}) => {
    const inicio = dia(inicioDesloc);
    usuarios[id] = { nome, email: `${id}@demo.com`, papel: 'coachee', cargo, coachId, coachNome: usuarios[coachId].nome, inicio, fim: R.fimDoAcesso(inicio), ativo: true,
      ultimoAcesso: acessoDesloc === null ? null : dia(acessoDesloc), termos: { versao: CONTEUDO.TERMOS.versao, data: dia(inicioDesloc) }, ...extra };
  };
  coachee('ana', 'Ana Souza', 'Diretora comercial', 'vinicius', -61, -1);
  coachee('bruno', 'Bruno Lima', 'Gerente de operações', 'vinicius', -128, 0);
  coachee('carla', 'Carla Mendes', 'Sócia, clínica odontológica', 'vinicius', -37, -12);
  coachee('diego', 'Diego Rocha', 'CEO, indústria moveleira', 'vinicius', -271, 0);
  coachee('gustavo', 'Gustavo Pereira', 'Sócio, transportadora', 'vinicius', -3, null);
  coachee('helena', 'Helena Martins', 'Gerente de loja', 'vinicius', -346, -4);
  coachee('igor', 'Igor Batista', 'Supervisor de produção', 'mariana', -85, 0);

  const colecoes = { usuarios, progresso: {}, acoes: {}, rotinas: {}, assessments: {}, vitorias: {}, paradas: {}, comentarios: {}, respostas: {}, insignias: {}, ouvidas: {}, anotacoes: {} };
  const prog = (cid, itemId, desloc, respostas) => { colecoes.progresso[`${cid}_${itemId}`] = { coacheeId: cid, itemId, ok: true, data: dia(desloc), ...(respostas ? { respostas } : {}) }; };
  const coment = (cid, alvo, texto, desloc) => { colecoes.comentarios[`${cid}_${alvo}`] = { coacheeId: cid, alvo, texto, data: dia(desloc), autorId: 'vinicius' }; };

  // Ana: Trilha I feita, passos 1 a 3 da Trilha II feitos.
  prog('ana', 'a11', -60);
  prog('ana', 'a12', -52, { 0: 'Dominância. Ajuda a decidir rápido; atrapalha quando atropelo a equipe.' });
  prog('ana', 'a13', -7, { 0: 'Cobranças de prazo da diretoria; atrasos da equipe; reunião sem pauta.' });
  prog('ana', 'e1', -50, Object.fromEntries([6, 8, 5, 7, 7, 4, 6, 7, 4, 3, 6, 5].map((v, k) => [k, v])));
  prog('ana', 'e2', -43, { 0: 'Decido rápido\nConheço bem o mercado\nA equipe confia em mim', 1: 'Centralizo tarefas\nPouca rotina de feedback\nAgenda sem espaço estratégico', 2: 'Expansão para a região da Serra\nNovo sistema de gestão na empresa', 3: 'Concorrente com preço mais baixo\nRisco de perder pessoas-chave' });
  prog('ana', 'e3', -35, { 0: 'Ser promovida a diretora regional até dezembro de 2027, liderando a expansão para a Serra.', 1: 'Promoção oficializada e equipe regional montada com 3 coordenadores.', 2: 'Quero provar para mim que consigo liderar algo maior e dar mais estabilidade para a minha família.' });
  coment('ana', 'e1', 'Ana, repare que lazer e vida social estão baixos ao mesmo tempo. Liderar mais exige energia: vamos cuidar disso no seu plano.', -49);
  coment('ana', 'e3', 'Meta clara, com prazo e indicador. Gostei do seu porquê: ele vai te segurar nas semanas difíceis.', -34);
  coment('ana', 'a12', 'Dominância com Influência é um ótimo perfil para expansão. O cuidado é a escuta: a equipe precisa de espaço para errar e aprender.', -51);

  Object.assign(colecoes.acoes, {
    d1: { coacheeId: 'ana', oque: 'Definir 3 indicadores do setor', quem: 'Ana', prazo: dia(-2), ok: false, pauta: false, criada: dia(-14) },
    d2: { coacheeId: 'ana', oque: 'Delegar o fechamento do relatório mensal', quem: 'Carlos (equipe)', prazo: dia(4), ok: false, pauta: true, criada: dia(-14) },
    d3: { coacheeId: 'ana', oque: 'Reunião semanal de 30 min com pauta fixa', quem: 'Ana', prazo: dia(-8), ok: true, okEm: dia(-9), pauta: false, criada: dia(-21) },
    d4: { coacheeId: 'bruno', oque: 'Melhorar a produtividade da equipe', quem: 'Bruno', prazo: dia(22), ok: false, pauta: true, criada: dia(-5) },
    d5: { coacheeId: 'diego', oque: 'Contratar um gerente financeiro', quem: 'Diego', prazo: dia(30), ok: false, pauta: true, criada: dia(-10) }
  });
  const seg = R.segunda(h);
  const marcas = ns => ns.map(n => R.somaDias(seg, n)).filter(d => d <= h);
  Object.assign(colecoes.rotinas, {
    r1: { coacheeId: 'ana', titulo: 'Revisar as 3 prioridades do dia', freq: 'diaria', marcas: [...marcas([0, 1, 2]), dia(-9), dia(-16), dia(-23), dia(-30), dia(-37), dia(-44)] },
    r2: { coacheeId: 'ana', titulo: 'Bloquear 1h de trabalho estratégico', freq: 'diaria', marcas: marcas([0, 2]) },
    r3: { coacheeId: 'ana', titulo: 'Reunião 1:1 com cada liderado', freq: 'semanal', marcas: [] }
  });
  Object.assign(colecoes.assessments, {
    s1: { coacheeId: 'ana', tipo: 'disc', data: dia(-51), r: { D: 38, I: 27, S: 15, C: 20 } },
    s2: { coacheeId: 'ana', tipo: 'ie', data: dia(-50), r: { 'Autoconsciência': 63, 'Autogestão': 38, 'Automotivação': 75, 'Empatia': 50, 'Habilidades sociais': 50 } },
    s3: { coacheeId: 'bruno', tipo: 'disc', data: dia(-120), r: { D: 22, I: 18, S: 30, C: 30 } }
  });
  colecoes.vitorias.v1 = { coacheeId: 'ana', texto: 'Conversei com a equipe sobre metas pela primeira vez', data: dia(-26) };

  // Bruno e Diego mais adiantados; Carla parada; Helena perto da renovação.
  ['a11', 'a12', 'a13', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'a31', 'a32'].forEach((id, k) => prog('bruno', id, -120 + k * 8));
  prog('bruno', 'a33', 0, { 0: 'Fechar o orçamento anual. Primeiro passo: separar os números de 2025.' });
  ['a11', 'a12', 'a13', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'a31', 'a32', 'a33', 'a34', 'a35', 'a41', 'a42'].forEach((id, k) => prog('diego', id, -260 + k * 12));
  prog('carla', 'a11', -36);
  ['a11', 'a12', 'a13', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'a31'].forEach((id, k) => prog('helena', id, -330 + k * 20));
  ['a11', 'a12', 'a13', 'e1', 'e2'].forEach((id, k) => prog('igor', id, -80 + k * 10));
  colecoes.paradas.bruno_1 = { coacheeId: 'bruno', n: 1, data: dia(-37), respostas: ['Delego mais e confiro menos.', 'Montei o ritual de indicadores.', 'Ter a meta escrita na parede.', 'Formar dois líderes de turno.'], areas: null };

  const conteudo = { trilhas: CONTEUDO.trilhas, itens: CONTEUDO.itens };
  const mensagens = {
    m1: { titulo: 'Bem-vindos à jornada', texto: 'Uma jornada de 12 meses começa com uma decisão: aparecer toda semana.', audio: '', dur: '3:05', data: dia(-17) },
    m2: { titulo: 'Sua meta precisa caber na sua agenda', texto: 'Olhe a sua semana: onde está o tempo da sua meta?', audio: '', dur: '1:48', data: dia(-10) },
    m3: { titulo: 'Delegar não é perder o controle', texto: 'Esta semana, escolha uma tarefa que só você faz e ensine alguém a fazer. Não precisa ser perfeito: o objetivo é você ganhar tempo para o que leva à sua meta.', audio: '', dur: '2:14', data: dia(-3) }
  };
  const perguntas = { p1: { texto: 'Que decisão você vem adiando, e o que ela já está te custando?', data: dia(-3) } };
  colecoes.respostas.p1_bruno = { coacheeId: 'bruno', perguntaId: 'p1', texto: 'Conversar com um líder que não entrega. Está custando a confiança do resto da equipe.', data: dia(-2) };
  colecoes.respostas.p1_diego = { coacheeId: 'diego', perguntaId: 'p1', texto: 'Contratar um gerente financeiro. Estou gastando minhas manhãs com planilha.', data: dia(-1) };
  ['bruno', 'diego', 'helena', 'igor'].forEach(c => { colecoes.ouvidas[`m3_${c}`] = { msgId: 'm3', coacheeId: c, data: dia(-2) }; });

  const encontros = {
    g1: { tipo: 'mentoria', titulo: 'Indicadores da equipe', data: dia(-14), hora: '19:00', link: 'https://meet.google.com/', gravacao: '' },
    g2: { tipo: 'mentoria', titulo: 'Delegação sem perder o controle', data: dia(14), hora: '19:00', link: 'https://meet.google.com/' },
    g3: { tipo: 'convidado', titulo: 'Vendas consultivas para gestores', data: dia(28), hora: '19:00', link: 'https://meet.google.com/' }
  };
  const materiais = {
    mt1: { titulo: 'Manual de reuniões produtivas', tipo: 'Manual', descricao: 'Modelo de pauta, papéis e ata.', url: '', tags: 'reunião pauta ata' },
    mt2: { titulo: 'Delegação em 5 passos', tipo: 'E-book', descricao: 'Como delegar sem perder o controle.', url: '', tags: 'delegação equipe' },
    mt3: { titulo: 'Planilha de indicadores da equipe', tipo: 'Ferramenta', descricao: 'Acompanhe metas e resultados por pessoa.', url: '', tags: 'indicadores metas planilha' },
    mt4: { titulo: 'Guia de leitura dos perfis DISC', tipo: 'Manual', descricao: 'Como cada perfil decide, comunica e reage.', url: '', tags: 'disc perfil comportamento' }
  };
  const fornecedores = {
    f1: { area: 'Contabilidade', titulo: 'Escritório contábil parceiro', descricao: 'Indicação para empresas de serviço e comércio.', contato: '' },
    f2: { area: 'Jurídico', titulo: 'Advocacia trabalhista parceira', descricao: 'Contratos, rotinas de RH e prevenção de passivo.', contato: '' },
    f3: { area: 'Marketing', titulo: 'Agência de marketing digital', descricao: 'Campanhas, redes sociais e site.', contato: '' }
  };
  const config = { programa: {
    nome: 'Programa de Alta Performance', whatsapp: 'https://chat.whatsapp.com/', disc: '', sala: 'https://meet.google.com/',
    pagMaster: '', pagSessao: '', precoMaster: '', precoSessao: '', duracaoSessao: 60, meses: 12,
    evento: { titulo: 'Encontro Alta Performance 2027', data: dia(100), local: 'Local a confirmar', descricao: 'Um dia de imersão com todos os coachees.' },
    cloudinary: { nome: '', preset: '' }, emailjs: { servico: '', chave: '', modeloBoasVindas: '', modeloAviso: '' }
  } };
  const vendas = {
    v1: { nome: 'Rafael Nunes', email: 'rafael@demo.com', produto: 'master', forma: 'Cartão em 12×', status: 'pendente', data: dia(-1) },
    v2: { nome: 'Gustavo Pereira', email: 'gustavo@demo.com', produto: 'master', forma: 'Pix', status: 'pago', data: dia(-3), usuarioId: 'gustavo' },
    v3: { nome: 'Paula Moreira', email: 'paula@demo.com', produto: 'master', forma: 'Boleto', status: 'expirado', data: dia(-16) }
  };

  return { sessao: null, colecoes: { ...colecoes, ...conteudo, mensagens, perguntas, encontros, materiais, fornecedores, config, vendas, pedidos: {}, inscricoes: {} } };
}
