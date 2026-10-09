// Camada de dados: a mesma interface para o Firebase (produção) e para o modo demonstração (localStorage).
// Coleções descritas na seção 7.1 do documento de requisitos; regras de acesso em firestore.rules.

const Dados = (() => {
  const cfg = window.FIREBASE_CONFIG;
  const base = cfg && window.firebase ? firebaseDados(cfg) : demoDados();

  // Envio de arquivos (áudio, foto, PDF) direto do navegador para o Cloudinary, sem servidor.
  // Sem Cloudinary configurado: imagens viram uma versão reduzida guardada no próprio documento;
  // áudios e PDFs só funcionam no modo demonstração.
  base.enviarArquivo = async (arquivo, pasta, cloud) => {
    if (cloud && cloud.nome && cloud.preset) {
      const f = new FormData();
      f.append('file', arquivo); f.append('upload_preset', cloud.preset); f.append('folder', `programa/${pasta}`);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud.nome)}/auto/upload`, { method: 'POST', body: f });
      if (!r.ok) throw new Error('Não foi possível enviar o arquivo. Confira o Cloudinary em Ajustes.');
      return (await r.json()).secure_url;
    }
    if (arquivo.type.startsWith('image/')) return reduzirImagem(arquivo, 320);
    if (!base.demo) throw new Error('Para enviar áudios e arquivos, configure o Cloudinary em Ajustes.');
    if (arquivo.size > 3e6) throw new Error('No modo demonstração, use arquivos de até 3 MB.');
    return lerComoUrl(arquivo);
  };

  // E-mails de aviso pelo EmailJS (plano gratuito: 200 por mês). Sem configuração, não envia e avisa quem chamou.
  base.enviarEmail = async (emailjs, modelo, params) => {
    if (!emailjs || !emailjs.servico || !emailjs.chave || !modelo) return false;
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: emailjs.servico, template_id: modelo, user_id: emailjs.chave, template_params: params })
    });
    return r.ok;
  };

  return base;

  function lerComoUrl(arquivo) {
    return new Promise((ok, erro) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = erro; l.readAsDataURL(arquivo); });
  }
  async function reduzirImagem(arquivo, lado) {
    const url = await lerComoUrl(arquivo);
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const k = Math.min(1, lado / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  }

  function firebaseDados(cfg) {
    firebase.initializeApp(cfg);
    const auth = firebase.auth();
    const fs = firebase.firestore();
    // Testes locais com o Firebase Emulator Suite (window.FIREBASE_EMULADOR = true em config.js).
    const emulador = app => { if (window.FIREBASE_EMULADOR) app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); };
    if (window.FIREBASE_EMULADOR) { emulador(firebase.app()); fs.useEmulator('127.0.0.1', 8080); }

    const col = nome => ({
      async listar(campo, valor) {
        let q = fs.collection(nome);
        if (campo !== undefined) q = q.where(campo, '==', valor);
        const s = await q.get();
        return s.docs.map(d => ({ id: d.id, ...d.data() }));
      },
      async obter(id) {
        const d = await fs.collection(nome).doc(id).get();
        return d.exists ? { id: d.id, ...d.data() } : null;
      },
      salvar: (id, dados) => fs.collection(nome).doc(id).set(dados, { merge: true }),
      adicionar: async dados => (await fs.collection(nome).add(dados)).id,
      remover: id => fs.collection(nome).doc(id).delete()
    });

    const traduzir = e => {
      const m = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'E-mail ou senha incorretos.', 'auth/invalid-email': 'E-mail inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
        'auth/email-already-in-use': 'Já existe um acesso com esse e-mail.', 'auth/network-request-failed': 'Sem conexão com a internet.'
      };
      return new Error(m[e.code] || e.message);
    };

    return {
      demo: false,
      col,
      aoMudarSessao(cb) {
        auth.onAuthStateChanged(async u => {
          if (!u) return cb(null);
          const perfil = await col('usuarios').obter(u.uid).catch(() => null);
          cb(perfil || { id: u.uid, email: u.email, semCadastro: true });
        });
      },
      async entrar(email, senha, lembrar) {
        await auth.setPersistence(lembrar ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
        try { await auth.signInWithEmailAndPassword(email.trim(), senha); } catch (e) { throw traduzir(e); }
      },
      sair: () => auth.signOut(),
      async redefinirSenha(email) { try { await auth.sendPasswordResetEmail(email.trim()); } catch (e) { throw traduzir(e); } },
      // Cria o login numa instância secundária (para não derrubar a sessão de quem cadastra)
      // e envia o e-mail do Firebase para a pessoa criar a própria senha (RF-02).
      async criarAcesso(dados) {
        let sec = firebase.apps.find(a => a.name === 'secundario');
        if (!sec) { sec = firebase.initializeApp(cfg, 'secundario'); emulador(sec); }
        const senhaTemp = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join('-') + 'Aa1!';
        let cred;
        try { cred = await sec.auth().createUserWithEmailAndPassword(dados.email.trim(), senhaTemp); } catch (e) { throw traduzir(e); }
        await sec.auth().signOut();
        await col('usuarios').salvar(cred.user.uid, { ...dados, email: dados.email.trim().toLowerCase() });
        await auth.sendPasswordResetEmail(dados.email.trim());
        return cred.user.uid;
      }
    };
  }

  function demoDados() {
    const CHAVE = 'plataforma-coachees-demo-v2';
    let memoria = null;
    const ler = () => {
      if (memoria) return memoria;
      try { memoria = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { memoria = null; }
      if (!memoria) { memoria = SementeDemo(); gravar(); }
      return memoria;
    };
    const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(memoria)); } catch (e) { /* segue só em memória */ } };
    const novoId = () => Math.random().toString(36).slice(2, 10);
    const tabela = nome => (ler().colecoes[nome] ||= {});
    const copia = o => JSON.parse(JSON.stringify(o));
    let ouvinte = null;

    const col = nome => ({
      async listar(campo, valor) {
        return Object.entries(tabela(nome)).map(([id, d]) => ({ id, ...copia(d) }))
          .filter(d => campo === undefined || (d[campo] ?? null) === valor);
      },
      async obter(id) { const d = tabela(nome)[id]; return d ? { id, ...copia(d) } : null; },
      async salvar(id, dados) { tabela(nome)[id] = { ...tabela(nome)[id], ...copia(dados) }; gravar(); },
      async adicionar(dados) { const id = novoId(); tabela(nome)[id] = copia(dados); gravar(); return id; },
      async remover(id) { delete tabela(nome)[id]; gravar(); }
    });

    const avisar = () => {
      const id = ler().sessao;
      const u = id && tabela('usuarios')[id];
      ouvinte && ouvinte(u ? { id, ...copia(u) } : null);
    };

    return {
      demo: true,
      col,
      aoMudarSessao(cb) { ouvinte = cb; avisar(); },
      async entrar(email) {
        const achado = Object.entries(tabela('usuarios')).find(([, u]) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!achado) throw new Error('E-mail não cadastrado na demonstração.');
        ler().sessao = achado[0]; gravar(); avisar();
      },
      async sair() { ler().sessao = null; gravar(); avisar(); },
      async redefinirSenha() {},
      async criarAcesso(dados) {
        if (Object.values(tabela('usuarios')).some(u => u.email.toLowerCase() === dados.email.trim().toLowerCase())) throw new Error('Já existe um acesso com esse e-mail.');
        const id = novoId(); await col('usuarios').salvar(id, { ...dados, email: dados.email.trim().toLowerCase() }); return id;
      },
      reiniciar() { memoria = SementeDemo(); gravar(); avisar(); }
    };
  }
})();
