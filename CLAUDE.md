# Plataforma para Coachees - Vinicius

## Contexto
Plataforma para os coachees (clientes de coaching) do Vinicius.

## Escopo
Documento de requisitos v1.1 (reunião de 08/10/2026): plano único Master (anual), quatro trilhas (Trilha II = 8 passos em sequência),
assessments refeitos a cada parada trimestral, plano de ação cadastrado pelo próprio coachee, três perfis (coachee, coach, administrador).

## Arquitetura
- Site estático (HTML, CSS, JavaScript em scripts clássicos, sem compilação) + Firebase Spark (Auth, Firestore, Hosting).
- Vídeos no YouTube (não listados), arquivos no Cloudinary, e-mails pelo EmailJS. Sem Cloud Functions.
- `js/config.js` com `null` = modo demonstração (localStorage). Toda leitura e gravação passa por `Dados` (js/dados.js).
- Regras de negócio puras em `js/regras.js`; conteúdo provisório em `js/conteudo.js`.
- O administrador não lê o conteúdo do coaching (regras em firestore.rules).

## Testes
- `npm run test:regras`, `npm run test:e2e`, `npm run test:seguranca`, `npm run test:firebase` (os dois últimos com emulador e Java).

## Convenções
- Idioma da interface, do código comentado e das mensagens de commit: português (Brasil).
