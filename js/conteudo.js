// Conteúdo inicial do programa.
// O administrador grava este conteúdo no banco em Ajustes > "Instalar conteúdo inicial"; no modo demonstração ele é usado direto.
// PROVISÓRIO: títulos das aulas, campos dos passos 4 a 7 e as perguntas dos questionários.
// Trocar pelos formulários reais (8 passos, inteligência emocional e autodiagnóstico 360º) assim que chegarem.

const CONTEUDO = (() => {
  // Campos: [rótulo, tipo ('texto' | 'area' | 'numero' | 'data'), exemplo]
  const campos = l => l.map(([rotulo, tipo, exemplo]) => ({ rotulo, tipo, exemplo }));

  const AREAS = ['Saúde e disposição', 'Desenvolvimento intelectual', 'Equilíbrio emocional', 'Realização e propósito',
    'Recursos financeiros', 'Contribuição social', 'Família', 'Relacionamento amoroso', 'Vida social',
    'Diversão e lazer', 'Plenitude e felicidade', 'Espiritualidade'];

  const trilhas = {
    t1: { n: 'I', ordem: 1, titulo: 'Autoconhecimento', descricao: 'Quem você é hoje: seu perfil DISC, sua inteligência emocional e o que te move na carreira.', assessments: true },
    t2: { n: 'II', ordem: 2, titulo: 'Planejamento estratégico', descricao: 'Os 8 passos da jornada, do raio-x da sua vida ao plano de ação. Cada passo libera o próximo.', sequencial: true },
    t3: { n: 'III', ordem: 3, titulo: 'Desenvolvimento de competências comportamentais', descricao: 'As competências que sustentam o plano: disciplina, foco, gestão do tempo e comunicação.' },
    t4: { n: 'IV', ordem: 4, titulo: 'Liderança', descricao: 'Aulas dadas pelo seu coach sobre liderar pessoas, delegar e formar a equipe.', coach: true }
  };

  const aula = (trilhaId, ordem, titulo, exercicio = '') => ({ trilhaId, ordem, tipo: 'aula', titulo, video: '', dur: 15, exercicio, material: null });
  const passo = (ordem, titulo, sub, extra) => ({ trilhaId: 't2', ordem, tipo: 'passo', titulo, sub, video: '', dur: 5, ...extra });

  const itens = {
    a11: aula('t1', 1, 'Boas-vindas: como aproveitar o programa'),
    a12: aula('t1', 2, 'DISC: seu perfil comportamental', 'Qual é o seu perfil predominante e em que situação ele mais ajuda e mais atrapalha você?'),
    a13: aula('t1', 3, 'Inteligência emocional: o que me tira do eixo', 'Liste 3 situações da última semana em que você reagiu no impulso. O que disparou cada uma?'),

    e1: passo(1, 'As 12 áreas da vida', 'O raio-x completo da sua vida', { chave: 'areas' }),
    e2: passo(2, 'Análise SWOT', 'Sua leitura estratégica atual', { chave: 'swot', campos: campos([
      ['Forças', 'area', 'Decido rápido\nConheço bem o mercado\nA equipe confia em mim'],
      ['Fraquezas', 'area', 'Centralizo tarefas\nPouca rotina de feedback'],
      ['Oportunidades', 'area', 'Expansão da empresa para outra região\nNovo sistema de gestão'],
      ['Ameaças', 'area', 'Concorrente com preço mais baixo\nRisco de perder pessoas-chave']]) }),
    e3: passo(3, 'Meta', 'Onde você quer chegar em 2027', { chave: 'meta', campos: campos([
      ['Qual é a sua meta para 2027?', 'area', 'Ser promovida a gerente regional até dez/2027, liderando 3 lojas.'],
      ['Como você vai saber que chegou lá?', 'texto', 'Promoção oficializada e equipe regional montada.'],
      ['Por que isso é importante para você?', 'area', 'Quero liderar algo maior e dar mais estabilidade para a minha família.']]) }),
    e4: passo(4, 'Estado atual', 'A distância real entre você e a sua meta', { campos: campos([
      ['Onde você está hoje em relação à meta?', 'area', 'Coordeno 1 loja; nunca liderei outros líderes.'],
      ['De 0 a 10, quão perto você está?', 'numero', '4'],
      ['O que já está a seu favor?', 'area', 'Resultados acima da média e boa relação com a diretoria.']]) }),
    e5: passo(5, 'Matriz de perdas e ganhos', 'O que continuar como está já está te custando', { campos: campos([
      ['O que eu ganho se mudar?', 'area', 'Crescimento, salário maior, reconhecimento.'],
      ['O que eu perco se mudar?', 'area', 'Conforto da rotina atual e parte do meu tempo livre no começo.'],
      ['O que eu ganho se continuar como está?', 'area', 'Previsibilidade e menos pressão.'],
      ['O que eu perco se continuar como está?', 'area', 'A vaga regional, que vai abrir em 2027.']]) }),
    e6: passo(6, 'Opções', 'Os caminhos possíveis a partir de onde você está', { campos: campos([
      ['Opção 1', 'texto', 'Pedir para liderar o projeto piloto de expansão.'],
      ['Opção 2', 'texto', 'Fazer uma pós em gestão de varejo.'],
      ['Opção 3', 'texto', 'Formar um sucessor na minha loja atual.'],
      ['Qual opção você escolhe e por quê?', 'area', 'A 1 e a 3 juntas: mostram resultado e liberam o meu tempo.']]) }),
    e7: passo(7, 'Matriz de formulação de metas', 'Suas metas, formuladas para funcionar', { campos: campos([
      ['Meta formulada', 'area', 'Até dez/2027, ser gerente regional de 3 lojas, com sucessor formado na loja atual.'],
      ['Indicador de sucesso', 'texto', 'Promoção formalizada pelo RH.'],
      ['Prazo', 'data', '2027-12-15'],
      ['Recursos necessários', 'area', 'Apoio do diretor, 2h por semana para formar o sucessor.']]) }),
    e8: passo(8, 'Plano de ação', 'Seu passo a passo prático para 2027', { chave: 'plano', dur: 15, campos: campos([
      ['Como você vai acompanhar o plano?', 'area', 'Revisar o plano toda sexta e levar dúvidas para a mentoria do mês.']]) }),

    a31: aula('t3', 1, 'Disciplina: rotina que se sustenta', 'Monte sua rotina no planner e marque por 7 dias. O que foi mais difícil manter?'),
    a32: aula('t3', 2, 'Foco e concentração'),
    a33: aula('t3', 3, 'Vencendo a procrastinação', 'Qual tarefa você vem adiando? Qual é o primeiro passo de 10 minutos?'),
    a34: aula('t3', 4, 'Gestão do tempo e prioridades', 'Quais são as 3 prioridades que vão mover a sua carreira nos próximos 90 dias?'),
    a35: aula('t3', 5, 'Comunicação assertiva', 'Descreva uma conversa em que você vai aplicar a técnica da aula.'),

    a41: aula('t4', 1, 'O papel do líder'),
    a42: aula('t4', 2, 'Delegação que funciona', 'O que você vai delegar este mês, para quem e com que prazo?'),
    a43: aula('t4', 3, 'Feedback e conversas difíceis', 'Planeje uma conversa de feedback usando o roteiro da aula.'),
    a44: aula('t4', 4, 'Formando sucessores')
  };

  // Questionários respondidos na plataforma: [dimensão, afirmação]. Escala de 1 (nunca) a 5 (sempre).
  // Resultado provisório: média de cada dimensão convertida para 0 a 100%. Trocar pela fórmula do cliente.
  const QUEST = {
    ie: { nome: 'Inteligência emocional', minutos: 6, desc: '10 afirmações sobre como você percebe e conduz as suas emoções.',
      dims: ['Autoconsciência', 'Autogestão', 'Automotivação', 'Empatia', 'Habilidades sociais'],
      perguntas: [
        ['Autoconsciência', 'Percebo rapidamente quando uma emoção começa a me tirar do eixo.'],
        ['Autoconsciência', 'Sei quais situações costumam me irritar ou me desmotivar.'],
        ['Autogestão', 'Consigo pausar antes de reagir em uma conversa difícil.'],
        ['Autogestão', 'Mantenho a calma quando um prazo aperta.'],
        ['Automotivação', 'Retomo rápido depois de um resultado ruim.'],
        ['Automotivação', 'Sei o que me move na carreira, mesmo em semanas difíceis.'],
        ['Empatia', 'Percebo como a equipe está antes de cobrar resultado.'],
        ['Empatia', 'Escuto até o fim antes de dar a minha opinião.'],
        ['Habilidades sociais', 'Consigo dar um feedback difícil sem romper a relação.'],
        ['Habilidades sociais', 'Resolvo conflitos na equipe sem precisar impor.']] },
    a360: { nome: 'Autodiagnóstico 360º', minutos: 10, desc: '15 afirmações sobre eficiência, maturidade de gestão e comportamento.',
      dims: ['Eficiência', 'Maturidade', 'Comportamento'],
      perguntas: [
        ['Eficiência', 'Planejo minha semana com prioridades claras antes de começar.'],
        ['Eficiência', 'Concluo as tarefas importantes dentro do prazo.'],
        ['Eficiência', 'Delego com clareza sobre o que, quem e até quando.'],
        ['Eficiência', 'Minhas reuniões terminam com decisões e responsáveis.'],
        ['Eficiência', 'Protejo tempo na agenda para trabalho estratégico.'],
        ['Maturidade', 'Tenho indicadores claros para acompanhar a equipe.'],
        ['Maturidade', 'Dou feedback regular e específico para cada pessoa.'],
        ['Maturidade', 'A equipe sabe quais são as metas e como contribui.'],
        ['Maturidade', 'Decido com base em dados, não só em intuição.'],
        ['Maturidade', 'As rotinas principais estão documentadas.'],
        ['Comportamento', 'Mantenho a calma e a clareza sob pressão.'],
        ['Comportamento', 'Escuto opiniões diferentes antes de decidir.'],
        ['Comportamento', 'Reconheço meus erros e aprendo com eles.'],
        ['Comportamento', 'Comunico expectativas de forma direta e respeitosa.'],
        ['Comportamento', 'Cuido da minha energia e do equilíbrio pessoal.']] }
  };

  const ASSESS = {
    disc: { nome: 'Perfil DISC', desc: 'Teste no site do NBM; o resultado fica registrado aqui.' },
    ie: { nome: QUEST.ie.nome, desc: QUEST.ie.desc },
    a360: { nome: QUEST.a360.nome, desc: QUEST.a360.desc }
  };

  const DISC = {
    D: ['Dominância', 'Foco em resultado, decide rápido e assume desafios.', 'Cuidado com impaciência e com atropelar a escuta da equipe.'],
    I: ['Influência', 'Comunica bem, engaja e cria relacionamentos.', 'Cuidado com dispersão e com o acompanhamento do que foi combinado.'],
    S: ['Estabilidade', 'Constante, cooperativo e bom ouvinte.', 'Cuidado com resistência a mudanças e dificuldade de dizer não.'],
    C: ['Conformidade', 'Preciso, analítico e exigente com qualidade.', 'Cuidado com perfeccionismo e com demorar a decidir.']
  };

  const PERGUNTAS_PARADA = [
    'O que já está diferente em você?',
    'Do que você se orgulha neste período?',
    'O que te aproximou da sua meta?',
    'Para onde você quer se mover nos próximos 3 meses?'
  ];

  const TRILHA_FEITA = {
    t1: ['Trilha I concluída', 'Você sabe mais sobre quem você é. Agora é hora de transformar isso em plano.'],
    t2: ['Trilha II concluída', 'Seu plano está no papel. A partir daqui, ele vira comportamento.'],
    t3: ['Trilha III concluída', 'As competências que sustentam o seu plano já fazem parte da sua rotina.'],
    t4: ['Jornada concluída', 'Você percorreu as quatro trilhas. Seu certificado está liberado.']
  };

  // RASCUNHO para revisão jurídica antes de ir para os coachees.
  const TERMOS = {
    versao: '2026-10-rascunho',
    html: `<h4>Termo de uso</h4>
      <p>Esta plataforma é de uso pessoal e intransferível do participante do programa, durante o prazo do plano contratado. O conteúdo (aulas, materiais e gravações) é protegido por direitos autorais e não pode ser copiado, gravado ou compartilhado fora da plataforma.</p>
      <h4>Aviso de privacidade</h4>
      <p>Usamos seu nome, e-mail e foto para identificar você na plataforma. Suas respostas, sua meta, seus assessments e seu plano de ação são confidenciais: só você e o seu coach responsável têm acesso. A administração do programa vê apenas dados de cadastro, de acesso e números gerais.</p>
      <p>Os dados ficam guardados no Google Firebase. Você pode pedir a qualquer momento uma cópia ou a exclusão dos seus dados pelo grupo do programa ou com o seu coach.</p>
      <p class="mu">Texto provisório, a ser revisado antes do lançamento.</p>`
  };

  return { AREAS, trilhas, itens, QUEST, ASSESS, DISC, PERGUNTAS_PARADA, TRILHA_FEITA, TERMOS };
})();

if (typeof module !== 'undefined') module.exports = CONTEUDO;
