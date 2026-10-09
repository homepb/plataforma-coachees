# Plataforma para Coachees

Plataforma do programa de desenvolvimento de carreira do Vinicius: os coachees assistem às aulas, fazem os 8 passos da jornada e os assessments, cadastram o próprio plano de ação e acompanham a evolução. O coach acompanha a carteira e publica o conteúdo; o administrador cuida de pessoas, planos e vendas.

Base: documento de requisitos v1.1 e o protótipo navegável aprovado.

## Como ver agora (modo demonstração)

Abra o `index.html` no navegador (dois cliques no arquivo já funcionam). Sem credenciais do Firebase, a plataforma roda em **modo demonstração**, com dados de exemplo guardados só naquele navegador. Na tela de login, escolha Ana (coachee), Vinicius (coach) ou Administração. Qualquer senha serve. A faixa no topo troca de perfil e reinicia os dados.

## Arquitetura (tudo gratuito)

| Parte | Ferramenta |
|---|---|
| Site | HTML, CSS e JavaScript, sem etapa de compilação, no Firebase Hosting |
| Login | Firebase Authentication (e-mail e senha; o e-mail para criar a senha sai pelo Firebase) |
| Banco de dados | Cloud Firestore, plano Spark, com as regras de acesso em `firestore.rules` |
| Vídeos | YouTube, como "Não listado", tocando dentro da plataforma |
| Áudios, fotos e PDFs | Cloudinary (envio direto do navegador) |
| Avisos por e-mail | EmailJS (200 por mês no plano gratuito) |
| Pagamentos | Link de pagamento (Mercado Pago, Asaas ou PagBank) e confirmação manual em "Novas entradas" |

```
index.html            casca da página
css/estilo.css        tema preto e dourado
js/config.js          credenciais do Firebase (null = modo demonstração)
js/conteudo.js        trilhas, passos, questionários e textos do programa
js/regras.js          regras de negócio (sequência, paradas, insígnias, alertas)
js/dados.js           acesso aos dados: Firebase ou demonstração
js/app.js             login, menu, navegação e utilidades
js/coachee.js         telas do coachee
js/coach.js           telas do coach
js/admin.js           telas do administrador
js/semente-demo.js    dados de exemplo da demonstração
firestore.rules       quem pode ler e gravar o quê
testes/               testes automáticos
```

## Colocar no ar

1. **Firebase.** Em [console.firebase.google.com](https://console.firebase.google.com), crie dois projetos no plano gratuito (Spark): um de testes e um de produção. Em cada um:
   - Authentication → Método de login → ative **E-mail/senha**.
   - Firestore Database → criar banco em **modo de produção**, região `southamerica-east1` (São Paulo).
   - Configurações do projeto → Seus apps → **Web** → copie o objeto de configuração para `js/config.js`.
2. **Publicar.** Instale o Firebase CLI (`npm i -g firebase-tools`), copie `.firebaserc.exemplo` para `.firebaserc` com os IDs dos projetos e rode:
   ```
   firebase login
   firebase use testes
   firebase deploy --only hosting,firestore
   ```
3. **Primeiro administrador.** Em Authentication → Usuários, adicione o e-mail e a senha do administrador e copie o **UID**. No Firestore, crie a coleção `usuarios` com um documento cujo ID é esse UID e os campos `nome` (texto), `email` (texto), `papel` = `admin` (texto) e `ativo` = `true` (booleano).
4. **Conteúdo.** Entre como administrador, abra **Ajustes** e clique em **Instalar conteúdo inicial**. Preencha os links (WhatsApp, DISC, sala da mentoria) e o evento anual.
5. **Pessoas.** Em **Time de coaches**, cadastre o Vinicius. Depois cadastre os coachees em **Pessoas** (ou pela confirmação de pagamento em **Novas entradas**). Cada pessoa recebe o e-mail do Firebase para criar a senha.
6. **Cloudinary** (para áudios da mensagem da semana, fotos e PDFs). Crie a conta gratuita. Em Settings → Upload → Upload presets, crie um preset **Unsigned** com pasta `programa`, formatos permitidos `mp3, m4a, webm, ogg, wav, jpg, png, pdf` e tamanho máximo de 20 MB. Informe o *cloud name* e o nome do preset em **Ajustes**.
7. **EmailJS** (opcional, para boas-vindas e avisos). Crie a conta gratuita, conecte o e-mail do programa e crie dois modelos: boas-vindas (variáveis `to_name`, `to_email`, `plano`, `data_fim`, `link_whatsapp`, `link_plataforma`) e aviso (`to_name`, `to_email`, `assunto`, `mensagem`). Informe os IDs em **Ajustes**. Sem EmailJS, o botão "Avisar" copia o texto para colar no grupo do WhatsApp.
8. **Domínio próprio** (opcional): Hosting → Adicionar domínio personalizado.

Depois de aprovar no projeto de testes, repita os passos 2 a 8 com `firebase use producao`.

## Trocar o conteúdo provisório

Os campos dos passos 4 a 7, as perguntas de inteligência emocional e do autodiagnóstico 360º, a fórmula do resultado e os títulos das aulas são **provisórios**. Quando chegarem os formulários reais, edite `js/conteudo.js` (e a fórmula em `Regras.resultadoQuest`, em `js/regras.js`), publique de novo e clique em **Ajustes → Atualizar conteúdo do programa**. As aulas e os vídeos já publicados pelo coach são mantidos.

O termo de uso e o aviso de privacidade (`CONTEUDO.TERMOS`) são um rascunho para revisão jurídica. Ao trocar o texto, mude também a `versao`: todos aceitam de novo no próximo acesso.

## Testes

```
npm install
npm run test:regras                          # regras de negócio
npm run test:e2e                             # telas dos três perfis, no computador e no celular (modo demonstração)
npx firebase emulators:exec --only firestore --project demo-coachees "node --test testes/firestore.rules.test.js"
npx firebase emulators:exec --only auth,firestore --project demo-coachees "node testes/firebase-e2e.js"
```

Os dois últimos usam o emulador do Firebase (precisa de Java e de `npm i -D firebase-tools @firebase/rules-unit-testing firebase`). O último percorre o ciclo completo com login real e as regras de segurança: o administrador cria o coach e o coachee, o coachee faz a jornada, o coach comenta e publica, o administrador confirma os pagamentos.
