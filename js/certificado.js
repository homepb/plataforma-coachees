/* ===================== Certificado (RF-26) ===================== */
// O certificado é gerado na hora, para cada coachee, a partir do modelo que o coach configura
// (config/certificado). O desenho é o Modelo Clássico escolhido no Claude Design (marfim e dourado).
// No texto, {nome}, {programa}, {inicio}, {fim} e {horas} são trocados pelos dados do coachee.

const CERT_TEXTO = 'concluiu o {programa} – Plano Master, percorrendo as trilhas de Autoconhecimento, Planejamento estratégico, Desenvolvimento de competências comportamentais e Liderança, de {inicio} a {fim}.';
const CERT_PADRAO = { titulo: 'Certificado de Conclusão', texto: CERT_TEXTO, horas: '', cidade: '', cor: '', cargo: 'Coach responsável', assinaturas: {} };
const CERT_COR = '#B8914A';
const certCfg = () => ({ ...CERT_PADRAO, ...(C.cert || {}) });

// Data de conclusão: o último item concluído da jornada.
const fimJornada = D => Object.values(D.progresso).filter(p => p && p.ok && p.data).map(p => p.data).sort().pop() || hoje();
// Código curto e estável por coachee, para conferência.
function codigoCert(u, fim) {
  let h = 0; for (const ch of u.id + fim) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `AP-${fim.slice(0, 4)}-${h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}
function dataExtenso(iso) {
  const m = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [a, mm, d] = iso.slice(0, 10).split('-'); return `${+d} de ${m[+mm - 1]} de ${a}`;
}

// Monta o certificado de u. D é o progresso dele; cfg permite pré-visualizar antes de salvar.
function htmlCertificado(u, D, cfg = certCfg()) {
  const fim = D ? fimJornada(D) : hoje(); const coachId = u.coachId || S.u.id;
  const coachNome = u.coachNome || S.u.nome;
  const troca = { nome: u.nome, programa: nomePrograma(), inicio: br(u.inicio), fim: br(fim), horas: cfg.horas || '—' };
  const texto = esc(cfg.texto || CERT_TEXTO).replace(/\{(nome|programa|inicio|fim|horas)\}/g, (_, k) => esc(troca[k]));
  const horas = cfg.horas && !/\{horas\}/.test(cfg.texto || '') ? `<p class="ct-horas">Carga horária: ${esc(cfg.horas)} horas</p>` : '';
  const ass = (cfg.assinaturas || {})[coachId];
  const assinatura = ass ? `<img class="ct-ass-img" src="${esc(ass)}" alt="Assinatura de ${esc(coachNome)}">` : `<span class="ct-ass-manuscrita">${esc(coachNome.split(' ')[0])}</span>`;
  const local = `${cfg.cidade ? esc(cfg.cidade) + ', ' : ''}${dataExtenso(fim)}`;
  const cor = cfg.cor || CERT_COR;
  const codigo = codigoCert(u, fim);
  const blocoAss = `<div class="ct-ass">${assinatura}<i></i><b>${esc(coachNome)}</b><small>${esc(cfg.cargo || 'Coach responsável')}</small></div>`;
  return `<div class="ct-moldura"><div class="ct-folha ct-classico" style="--ct-cor:${esc(cor)}"><div class="ct-b1"><div class="ct-b2">
    <div class="ct-sobre"><i></i>${esc(nomePrograma())}<i></i></div>
    <h2 class="ct-titulo">${esc(cfg.titulo)}</h2><p class="ct-cert">Certificamos que</p><div class="ct-nome">${esc(u.nome)}</div><i class="ct-traco"></i>
    <p class="ct-texto">${texto}</p>${horas}<div class="ct-espaco"></div>
    <div class="ct-rodape">${blocoAss}
      <div class="ct-selo" aria-hidden="true"><div><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z"/></svg><span>MASTER</span></div></div>
      <div class="ct-ass ct-local"><span class="ct-ass-texto">${local}</span><i></i><b>Local e data</b><small>Código de verificação: ${codigo}</small></div></div>
  </div></div></div></div>`;
}

const certExemplo = () => ({ id: 'exemplo', nome: 'Nome do Coachee', inicio: R.somaDias(hoje(), -365), coachId: S.u.id, coachNome: S.u.nome });
const concluiu = c => !R.proximo(C.L, c.D);

/* ----- Coachee: o próprio certificado ----- */
VIEWS.coachee.certificado = () => {
  if (R.proximo(C.L, C.D)) return `<div class="card"><p>O certificado é liberado ao concluir as quatro trilhas.</p><button class="bt bt-linha" data-ir="jornada">Voltar</button></div>`;
  return `<div class="topo"><div><div class="sobre">Jornada concluída</div><h1>Certificado</h1></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="bt bt-ouro" data-acao="imprimir-cert">Salvar em PDF</button><button class="bt bt-fantasma" data-ir="jornada">← Minha jornada</button></div></div>
  ${htmlCertificado(S.u, C.D)}
  <p class="mu nao-imprimir" style="font-size:12.5px;text-align:center;margin-top:12px">Na janela de impressão, escolha "Salvar como PDF", papel A4 e orientação paisagem.</p>`;
};

/* ----- Coach: configurar o modelo e emitir os certificados ----- */
VIEWS.coach.certificado = () => {
  const cfg = S.certRascunho || certCfg(); const minhaAss = (cfg.assinaturas || {})[S.u.id];
  const carteira = (C.carteira || []).slice().sort((a, b) => a.u.nome.localeCompare(b.u.nome));
  const ver = S.p && daCarteira(S.p); const alvo = ver ? ver.u : certExemplo();
  return `<div class="topo"><div><div class="sobre">Gerado automaticamente para cada coachee que conclui as quatro trilhas</div><h1>Certificado</h1></div></div>
  <div class="ct-config">
    <form class="card" id="form-cert">
      <h3>Modelo Clássico</h3>
      <label class="rotulo" for="ct-titulo">Título</label><input class="campo" id="ct-titulo" data-muda="cert-previa" value="${esc(cfg.titulo)}">
      <label class="rotulo" for="ct-texto">Texto</label><textarea class="campo" id="ct-texto" rows="5" data-muda="cert-previa">${esc(cfg.texto)}</textarea>
      <p class="mu" style="font-size:12px;margin:-6px 0 12px">Preenchidos sozinhos para cada coachee: <code>{nome}</code> <code>{programa}</code> <code>{inicio}</code> <code>{fim}</code> <code>{horas}</code></p>
      <div class="duas"><div><label class="rotulo" for="ct-horas">Carga horária (horas)</label><input class="campo" id="ct-horas" type="number" min="0" data-muda="cert-previa" value="${esc(cfg.horas)}" placeholder="Opcional"></div>
        <div><label class="rotulo" for="ct-cidade">Cidade</label><input class="campo" id="ct-cidade" data-muda="cert-previa" value="${esc(cfg.cidade)}" placeholder="Opcional"></div></div>
      <div class="duas"><div><label class="rotulo" for="ct-cargo">Cargo abaixo da assinatura</label><input class="campo" id="ct-cargo" data-muda="cert-previa" value="${esc(cfg.cargo)}"></div>
        <div><label class="rotulo" for="ct-cor">Cor de destaque</label><input class="campo" id="ct-cor" type="color" data-muda="cert-previa" value="${esc(cfg.cor || CERT_COR)}"></div></div>
      <span class="rotulo">Sua assinatura</span>
      <div class="gravador"><label class="bt bt-linha bt-sm" for="ct-ass">${minhaAss ? 'Trocar imagem da assinatura' : 'Enviar imagem da assinatura'}</label><input type="file" accept="image/*" id="ct-ass" data-muda="cert-assinatura" hidden>
        ${minhaAss ? '<button type="button" class="bt bt-fantasma bt-sm" data-acao="cert-sem-ass">Usar assinatura escrita</button>' : ''}
        <span class="mu" style="font-size:12.5px">${minhaAss ? '✓ Assinatura enviada' : 'Sem imagem, seu nome aparece em letra cursiva.'}</span></div>
      <p class="mu" style="font-size:12px;margin:0 0 14px">Dica: assine em papel branco, fotografe de perto e envie. Uma imagem PNG com fundo transparente fica ainda melhor.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="bt bt-fantasma" data-acao="cert-padrao">Voltar ao padrão</button><button class="bt bt-ouro" type="submit">Salvar modelo</button></div>
    </form>
    <div>
      <div class="card" id="ct-previa" style="margin-bottom:16px"><h3>Pré-visualização <span class="chip acao">${ver ? esc(ver.u.nome) : 'exemplo'}</span></h3>${htmlCertificado(alvo, ver ? ver.D : null, cfg)}
        ${ver && concluiu(ver) ? `<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="bt bt-ouro bt-sm" data-acao="imprimir-cert">Salvar em PDF</button></div>` : ''}</div>
      <div class="card"><h3>Certificados da sua carteira</h3><div class="lista">
        ${carteira.length ? carteira.map(c => { const ok = concluiu(c); return `<div class="item"><div class="tx"><b>${esc(c.u.nome)}</b><small>${ok ? `Concluiu em ${br(fimJornada(c.D))} · certificado liberado` : `${R.pct(C.L, c.D)}% da jornada · liberado ao concluir`}</small></div>
          <button class="bt ${ok ? 'bt-linha' : 'bt-fantasma'} bt-sm" data-ir="certificado" data-p="${c.u.id}">${ok ? 'Abrir certificado' : 'Pré-visualizar'}</button></div>`; }).join('') : '<div class="vazio">Nenhum coachee na sua carteira.</div>'}
      </div></div>
    </div>
  </div>`;
};

function lerFormCert() {
  const base = S.certRascunho || certCfg();
  return { ...base, titulo: valor('ct-titulo') || CERT_PADRAO.titulo, texto: valor('ct-texto') || CERT_TEXTO, horas: valor('ct-horas'), cidade: valor('ct-cidade'), cargo: valor('ct-cargo'), cor: valor('ct-cor') || CERT_COR };
}
// A pré-visualização acompanha o formulário sem salvar.
// Só a folha da prévia é redesenhada, para não atrapalhar quem está digitando no formulário.
MUDA['cert-previa'] = () => {
  S.certRascunho = lerFormCert(); const folha = document.querySelector('#ct-previa .ct-moldura'); if (!folha) return;
  const ver = S.p && daCarteira(S.p);
  folha.outerHTML = htmlCertificado(ver ? ver.u : certExemplo(), ver ? ver.D : null, S.certRascunho);
};
MUDA['cert-assinatura'] = async t => {
  const f = t.files && t.files[0]; if (!f) return;
  if (!f.type.startsWith('image/')) { toast('Envie uma imagem (PNG ou JPG).', 'aviso'); return; }
  const url = await Dados.enviarArquivo(f, 'assinaturas', C.cfg.cloudinary);
  const r = lerFormCert(); S.certRascunho = { ...r, assinaturas: { ...(r.assinaturas || {}), [S.u.id]: url } };
  toast('Assinatura carregada. Clique em "Salvar modelo" para usar nos certificados.'); render();
};
Object.assign(ACOES, {
  // Imprime só o certificado (cópia solta no body), em A4 deitado.
  'imprimir-cert'() {
    const cert = document.querySelector('.ct-moldura'); if (!cert) return;
    const caixa = document.createElement('div'); caixa.id = 'ct-print'; caixa.appendChild(cert.cloneNode(true));
    document.body.appendChild(caixa); document.body.classList.add('imprimindo-cert');
    const limpar = () => { caixa.remove(); document.body.classList.remove('imprimindo-cert'); window.removeEventListener('afterprint', limpar); };
    window.addEventListener('afterprint', limpar); window.print(); setTimeout(() => { if (!matchMedia('print').matches) limpar(); }, 1000);
  },
  'cert-sem-ass'() { const r = lerFormCert(); const a = { ...(r.assinaturas || {}) }; delete a[S.u.id]; S.certRascunho = { ...r, assinaturas: a }; render(); },
  'cert-padrao'() { const r = lerFormCert(); S.certRascunho = { ...CERT_PADRAO, assinaturas: r.assinaturas || {} }; render(); }
});
FORMS['form-cert'] = async () => {
  const d = lerFormCert();
  // Só a assinatura de quem salva muda; as dos outros coaches ficam como estão.
  const atuais = { ...((C.cert || {}).assinaturas || {}) }; const minha = (d.assinaturas || {})[S.u.id];
  atuais[S.u.id] = minha || ''; // vazio (e não apagado): o Firestore mescla o mapa
  const doc = { ...d, assinaturas: atuais, atualizadoEm: hoje(), atualizadoPor: S.u.id };
  await col('config').salvar('certificado', doc); C.cert = doc; S.certRascunho = null;
  toast('Modelo do certificado salvo. Ele já vale para todos os certificados, inclusive os já liberados.'); render();
};
