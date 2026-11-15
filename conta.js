// ===== Conta do cliente (cadastro, login, "Sua conta") — Supabase =====
// A chave abaixo é a chave PÚBLICA (publishable). A segurança dos dados fica nas regras (RLS) do banco.
(() => {
  const SUPABASE_URL = "https://fsfljvaxbxzcobdssgnp.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tvub9holo4poZyVKfqUuvQ_aybmnkfx";
  const VOLTA = location.origin + location.pathname; // para onde o link do e-mail traz o cliente

  const el = id => document.getElementById(id);
  const drawer = el("contaDrawer"), corpo = el("contaCorpo"), titulo = el("contaTitulo"), botao = el("openConta");
  const menu = el("contaMenu"), wrap = el("contaWrap"), pagina = el("contaPagina");
  if (!drawer || !window.supabase) { if (botao) botao.hidden = true; return; }

  let vindoDaConfirmacao = /access_token=/.test(location.hash) && /type=(signup|email_change)/.test(location.hash);
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  });
  window.LT_SUPABASE = sb; // usado depois pelo checkout

  // ---------- utilidades ----------
  const so = s => (s || "").replace(/\D/g, "");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cidades = (typeof CIDADES !== "undefined" ? CIDADES : []);
  const wa = t => (typeof waLink === "function" ? waLink(t) : "#");
  const fmtCpf = v => so(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  const fmtCel = v => { const d = so(v).slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/^\((\d{0,2})\) ?-?$/, "$1"); };
  const fmtCep = v => so(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  function cpfValido(c) {
    c = so(c); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (const t of [9, 10]) {
      let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
      let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== +c[t]) return false;
    }
    return true;
  }
  const ICON = {
    pedidos: '<path d="M3 4h2l2.4 11h11l2-8H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
    trocas: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
    dados: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    contato: '<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/>',
    endereco: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    senha: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    atendimento: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    fale: '<path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4.5A8 8 0 1 1 21 12z"/>',
  };
  const svg = n => `<svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
  const SETA = '<svg class="cp-seta" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 5 7 7-7 7"/></svg>';

  let usuario = null, cliente = null, focoAntes = null;

  // ---------- campos e mensagens ----------
  const campo = (id, rot, attrs = "", dica = "") =>
    `<label class="ct-campo"><span>${rot}</span><input id="${id}" ${attrs}>${dica ? `<small>${dica}</small>` : ""}</label>`;
  const selCidade = (id, atual) =>
    `<label class="ct-campo"><span>Cidade</span><select id="${id}" required><option value="">Escolha a cidade</option>${cidades.map(c => `<option${c === atual ? " selected" : ""}>${esc(c)}</option>`).join("")}</select><small>Vendemos online só para as cidades onde temos loja.</small></label>`;
  const aviso = () => `<p class="ct-msg" role="alert" hidden></p>`;
  function msg(form, texto, tipo = "erro") {
    const m = form && form.querySelector(".ct-msg"); if (!m) return;
    m.textContent = texto; m.className = "ct-msg " + tipo; m.hidden = !texto;
    if (texto) m.scrollIntoView({ block: "nearest" });
  }
  const ocupado = (form, sim) => form.querySelectorAll("button, input:not([data-travado]), select").forEach(x => x.disabled = sim);
  const traduz = m => {
    m = String(m || "");
    if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(m)) return "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para o seu e-mail.";
    if (/already registered|already been registered/i.test(m)) return "Este e-mail já tem conta. Use \"Entrar\" ou \"Esqueci minha senha\".";
    if (/database error saving new user/i.test(m)) return "Não foi possível criar a conta. Confira os dados: este CPF talvez já esteja cadastrado.";
    if (/should be different/i.test(m)) return "A senha nova precisa ser diferente da atual.";
    if (/password should be at least|weak password/i.test(m)) return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
    if (/rate limit|too many|security purposes/i.test(m)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    if (/duplicate key.*cpf/i.test(m)) return "Este CPF já está cadastrado.";
    if (/violates check constraint/i.test(m)) return "Algum dado está em formato inválido. Confira e tente de novo.";
    if (/failed to fetch|network/i.test(m)) return "Sem conexão. Verifique sua internet e tente de novo.";
    return "Algo deu errado. Tente de novo em instantes. (" + m + ")";
  };

  // máscaras + CEP automático (ViaCEP) + envio dos formulários
  function ligar(raiz) {
    const mask = (id, f) => { const i = el(id); if (i) i.addEventListener("input", () => { i.value = f(i.value); }); };
    mask("cCpf", fmtCpf);
    ["cCel", "mCel"].forEach(id => mask(id, fmtCel));
    [["cCep", "c"], ["mCep", "m"]].forEach(([id, p]) => {
      const i = el(id); if (!i) return;
      mask(id, fmtCep);
      i.addEventListener("input", async () => {
        if (so(i.value).length !== 8) return;
        try {
          const d = await (await fetch(`https://viacep.com.br/ws/${so(i.value)}/json/`)).json();
          if (d.erro) return;
          const rua = el(p + "Rua"), bai = el(p + "Bairro"), cid = el(p + "Cidade");
          if (rua && !rua.value) rua.value = d.logradouro || "";
          if (bai && !bai.value) bai.value = d.bairro || "";
          if (cid && d.uf === "MA") { const o = [...cid.options].find(o => o.value.toLowerCase() === (d.localidade || "").toLowerCase()); if (o) cid.value = o.value; }
        } catch (_) { /* sem internet ou ViaCEP fora: o cliente preenche à mão */ }
      });
    });
    raiz.querySelectorAll("form[data-acao]").forEach(f => f.addEventListener("submit", e => { e.preventDefault(); ACOES[f.dataset.acao](f); }));
  }

  // =====================================================================
  // JANELA LATERAL: entrar, criar conta, esqueci a senha, nova senha
  // =====================================================================
  const fora = () => (typeof PARTES_FORA === "function" ? PARTES_FORA() : []);
  function abrir(tela) {
    if (typeof fecharCarrinho === "function") fecharCarrinho();
    fecharMenu();
    focoAntes = document.activeElement;
    drawer.hidden = false; el("scrim").hidden = false;
    fora().forEach(x => x && x.setAttribute("inert", ""));
    mostrar(tela || "entrar");
  }
  function fechar() {
    if (drawer.hidden) return;
    drawer.hidden = true; el("scrim").hidden = true;
    fora().forEach(x => x && x.removeAttribute("inert"));
    if (focoAntes && document.contains(focoAntes)) focoAntes.focus();
  }
  window.abrirConta = abrir;
  el("closeConta").addEventListener("click", fechar);
  el("scrim").addEventListener("click", fechar);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!drawer.hidden) fechar(); fecharMenu(); } });
  drawer.addEventListener("keydown", e => { // mantém o Tab dentro da janela
    if (e.key !== "Tab") return;
    const f = [...drawer.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select")].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  const TELAS = {
    entrar: () => ({
      t: "Entrar",
      h: `<form class="ct-form" data-acao="entrar" novalidate>
        ${campo("ctEmail", "E-mail", 'type="email" autocomplete="email" required')}
        ${campo("ctSenha", "Senha", 'type="password" autocomplete="current-password" required')}
        ${aviso()}
        <button class="ct-prim" type="submit">Entrar</button>
        <button class="ct-link" type="button" data-tela="esqueci">Esqueci minha senha</button>
        <div class="ct-sep">Ainda não tem conta?</div>
        <button class="ct-sec" type="button" data-tela="criar">Criar minha conta</button>
      </form>`,
    }),
    criar: () => ({
      t: "Criar conta",
      h: `<form class="ct-form" data-acao="criar" novalidate>
        <p class="ct-intro">Crie sua conta para comprar pelo site. Leva 1 minuto.</p>
        ${campo("cNome", "Nome completo", 'autocomplete="name" required maxlength="120"')}
        ${campo("cCpf", "CPF", 'inputmode="numeric" autocomplete="off" required placeholder="000.000.000-00"')}
        ${campo("cCel", "Celular / WhatsApp", 'type="tel" inputmode="numeric" autocomplete="tel-national" required placeholder="(99) 99999-9999"')}
        ${campo("cEmail", "E-mail", 'type="email" autocomplete="email" required')}
        ${campo("cSenha", "Crie uma senha", 'type="password" autocomplete="new-password" required minlength="8"', "Mínimo de 8 caracteres.")}
        <fieldset class="ct-grupo"><legend>Endereço de entrega</legend>
          ${campo("cCep", "CEP", 'inputmode="numeric" autocomplete="postal-code" required placeholder="65400-000"')}
          ${campo("cRua", "Rua / Avenida", 'autocomplete="address-line1" required maxlength="150"')}
          <div class="ct-duas">${campo("cNum", "Número", 'required maxlength="20"')}${campo("cComp", "Complemento", 'maxlength="100" placeholder="Opcional"')}</div>
          ${campo("cBairro", "Bairro", 'required maxlength="80"')}
          ${selCidade("cCidade")}
        </fieldset>
        <label class="ct-check"><input type="checkbox" id="cAceite" required> <span>Li e aceito os <a href="termos-de-uso.html" target="_blank">Termos de Uso</a> e a <a href="politica-de-privacidade.html" target="_blank">Política de Privacidade</a>.</span></label>
        ${aviso()}
        <button class="ct-prim" type="submit">Criar minha conta</button>
        <button class="ct-link" type="button" data-tela="entrar">Já tenho conta: entrar</button>
      </form>`,
    }),
    esqueci: () => ({
      t: "Recuperar senha",
      h: `<form class="ct-form" data-acao="esqueci" novalidate>
        <p class="ct-intro">Digite o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.</p>
        ${campo("eEmail", "E-mail", 'type="email" autocomplete="email" required')}
        ${aviso()}
        <button class="ct-prim" type="submit">Enviar link</button>
        <button class="ct-link" type="button" data-tela="entrar">Voltar para entrar</button>
      </form>`,
    }),
    novaSenha: () => ({
      t: "Nova senha",
      h: `<form class="ct-form" data-acao="senha" novalidate>
        <p class="ct-intro">Escolha uma senha nova para sua conta.</p>
        ${campo("nSenha", "Nova senha", 'type="password" autocomplete="new-password" required minlength="8"', "Mínimo de 8 caracteres.")}
        ${aviso()}
        <button class="ct-prim" type="submit">Salvar nova senha</button>
      </form>`,
    }),
    aviso: (t, texto) => ({ t, h: `<div class="ct-form"><p class="ct-ok">${texto}</p><button class="ct-prim" type="button" data-tela="entrar">Ir para entrar</button></div>` }),
  };
  function mostrar(tela, ...args) {
    const v = (TELAS[tela] || TELAS.entrar)(...args);
    titulo.textContent = v.t; corpo.innerHTML = v.h; corpo.scrollTop = 0;
    ligar(corpo);
    const primeiro = corpo.querySelector("input:not([disabled]), button"); if (primeiro) primeiro.focus();
  }
  corpo.addEventListener("click", e => { const b = e.target.closest("[data-tela]"); if (b) mostrar(b.dataset.tela); });

  // =====================================================================
  // MENU AO PASSAR O MOUSE no botão da conta
  // =====================================================================
  const ITENS_MENU = [
    ["pedidos", "Meus pedidos", "conta/pedidos"], ["trocas", "Trocas e cancelamentos", "conta/trocas"],
    ["dados", "Dados pessoais", "conta/dados"], ["contato", "Alterar e-mail ou telefone", "conta/contato"],
  ];
  function renderMenu() {
    menu.innerHTML = usuario
      ? `<a class="cm-topo" href="#conta">Sua conta ${SETA}</a>
         <div class="cm-grupo">${ITENS_MENU.map(([i, t, h]) => `<a href="#${h}">${svg(i)}${t}</a>`).join("")}</div>
         <div class="cm-grupo"><a href="${wa("Olá! Vim pelo site e preciso de ajuda com minha conta.")}" target="_blank" rel="noopener">${svg("fale")}Fale com a loja</a></div>
         <button type="button" class="cm-sair" data-sair>Sair</button>`
      : `<p class="cm-ola">Olá! Entre para acompanhar seus pedidos e comprar pelo site.</p>
         <button type="button" class="ct-prim" data-abrir="entrar">Entrar</button>
         <button type="button" class="ct-sec" data-abrir="criar">Criar minha conta</button>`;
  }
  const temHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  let timerMenu = null;
  function abrirMenu() { clearTimeout(timerMenu); if (!temHover.matches || !drawer.hidden) return; renderMenu(); menu.hidden = false; botao.setAttribute("aria-expanded", "true"); }
  function fecharMenu() { clearTimeout(timerMenu); if (menu) menu.hidden = true; botao.setAttribute("aria-expanded", "false"); }
  wrap.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") abrirMenu(); });
  wrap.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { clearTimeout(timerMenu); timerMenu = setTimeout(fecharMenu, 250); } });
  menu.addEventListener("click", e => {
    const a = e.target.closest("a, button"); if (!a) return;
    if (a.dataset.abrir) { fecharMenu(); abrir(a.dataset.abrir); return; }
    if (a.hasAttribute("data-sair")) { fecharMenu(); sair(); return; }
    fecharMenu();
  });
  // Clique no botão: logado vai para "Sua conta"; sem login abre a janela de entrar
  botao.addEventListener("click", () => {
    fecharMenu();
    if (usuario) { if (location.hash === "#conta") window.LT_rotaConta("conta", true); else location.hash = "conta"; }
    else abrir("entrar");
  });

  // =====================================================================
  // PÁGINA "SUA CONTA" (#conta e #conta/...)
  // =====================================================================
  const SECOES = [
    ["Pedidos", [["pedidos", "Meus pedidos", "conta/pedidos"], ["trocas", "Trocas e cancelamento", "conta/trocas"]]],
    ["Seus dados", [["dados", "Dados pessoais", "conta/dados"], ["contato", "Alterar e-mail ou telefone", "conta/contato"], ["endereco", "Endereço de entrega", "conta/endereco"], ["senha", "Senha de acesso", "conta/senha"]]],
    ["Comunicação", [["atendimento", "Central de atendimento", "wa"]]],
  ];
  const c = () => cliente || {};
  const voltar = `<a class="cp-voltar" href="#conta"><svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m15 5-7 7 7 7"/></svg>Sua conta</a>`;
  const PAGINAS = {
    "conta": () => `
      <h1>Sua conta</h1>
      <p class="cp-sub">Olá, <b>${esc(c().nome || (usuario && usuario.email))}</b>. Navegue e gerencie conforme desejar.</p>
      ${cliente ? "" : `<p class="ct-msg erro">Não encontramos seus dados de cadastro. <a href="${wa("Olá! Criei conta no site, mas meus dados não aparecem.")}" target="_blank" rel="noopener">Fale com a loja</a>.</p>`}
      ${SECOES.map(([t, itens]) => `<h2>${t}</h2><div class="cp-lista">${itens.map(([i, txt, h]) =>
        h === "wa" ? `<a href="${wa("Olá! Vim pelo site e preciso de atendimento.")}" target="_blank" rel="noopener">${svg(i)}<span>${txt}</span>${SETA}</a>`
                   : `<a href="#${h}">${svg(i)}<span>${txt}</span>${SETA}</a>`).join("")}</div>`).join("")}
      <button type="button" class="ct-sec cp-sair" data-sair>Sair da conta</button>
      <p class="ct-nota">Quer excluir sua conta ou seus dados? <a href="${wa("Olá! Quero excluir minha conta do site.")}" target="_blank" rel="noopener">Peça pelo WhatsApp</a>, conforme a LGPD.</p>`,
    "conta/pedidos": () => `${voltar}<h1>Meus pedidos</h1>
      <div class="cp-vazio">${svg("pedidos")}<p><b>Você ainda não tem pedidos pelo site.</b></p>
      <p>Em breve você vai poder comprar aqui pelo site e acompanhar cada pedido nesta página. Compras feitas na loja ou pelo WhatsApp não aparecem aqui.</p>
      <a class="ct-prim" href="#catalogo">Ver produtos</a></div>`,
    "conta/trocas": () => `${voltar}<h1>Trocas e cancelamento</h1>
      <div class="cp-card"><p>Para trocar, devolver ou cancelar uma compra, fale com a loja pelo WhatsApp informando seu nome e o produto. Você tem até <b>7 dias após o recebimento</b> para desistir de compras feitas fora da loja, e os produtos têm garantia legal e do fabricante.</p>
      <p><a href="politica-de-trocas-e-reembolso.html">Ler a política de trocas, devoluções e reembolso</a></p>
      <a class="ct-prim cp-wa" href="${wa("Olá! Quero solicitar uma troca ou cancelamento.")}" target="_blank" rel="noopener">Pedir troca ou cancelamento pelo WhatsApp</a></div>`,
    "conta/dados": () => `${voltar}<h1>Dados pessoais</h1>
      <form class="ct-form cp-card" data-acao="dados" novalidate>
        ${campo("mNome", "Nome completo", `autocomplete="name" required maxlength="120" value="${esc(c().nome)}"`)}
        ${campo("mCpf", "CPF", `disabled data-travado value="${esc(fmtCpf(c().cpf))}"`, "Para corrigir o CPF, fale com a loja.")}
        ${aviso()}
        <button class="ct-prim" type="submit"${cliente ? "" : " disabled"}>Salvar</button>
      </form>`,
    "conta/contato": () => `${voltar}<h1>Alterar e-mail ou telefone</h1>
      <form class="ct-form cp-card" data-acao="telefone" novalidate>
        <h2>Celular / WhatsApp</h2>
        ${campo("mCel", "Celular com DDD", `type="tel" inputmode="numeric" autocomplete="tel-national" required value="${esc(fmtCel(c().celular))}"`)}
        ${aviso()}
        <button class="ct-prim" type="submit"${cliente ? "" : " disabled"}>Salvar celular</button>
      </form>
      <form class="ct-form cp-card" data-acao="email" novalidate>
        <h2>E-mail</h2>
        <p class="ct-intro">E-mail atual: <b>${esc(usuario && usuario.email)}</b></p>
        ${campo("mEmail", "Novo e-mail", 'type="email" autocomplete="email" required')}
        <small class="ct-intro">Vamos mandar um link de confirmação para o novo e-mail. A troca só vale depois que você tocar no link.</small>
        ${aviso()}
        <button class="ct-prim" type="submit">Trocar e-mail</button>
      </form>`,
    "conta/endereco": () => `${voltar}<h1>Endereço de entrega</h1>
      <form class="ct-form cp-card" data-acao="endereco" novalidate>
        ${campo("mCep", "CEP", `inputmode="numeric" autocomplete="postal-code" required value="${esc(fmtCep(c().cep))}"`)}
        ${campo("mRua", "Rua / Avenida", `autocomplete="address-line1" required maxlength="150" value="${esc(c().rua)}"`)}
        <div class="ct-duas">${campo("mNum", "Número", `required maxlength="20" value="${esc(c().numero)}"`)}${campo("mComp", "Complemento", `maxlength="100" placeholder="Opcional" value="${esc(c().complemento)}"`)}</div>
        ${campo("mBairro", "Bairro", `required maxlength="80" value="${esc(c().bairro)}"`)}
        ${selCidade("mCidade", c().cidade)}
        ${aviso()}
        <button class="ct-prim" type="submit"${cliente ? "" : " disabled"}>Salvar endereço</button>
      </form>`,
    "conta/senha": () => `${voltar}<h1>Senha de acesso</h1>
      <form class="ct-form cp-card" data-acao="senha" novalidate>
        <p class="ct-intro">Escolha uma senha nova com pelo menos 8 caracteres.</p>
        ${campo("nSenha", "Nova senha", 'type="password" autocomplete="new-password" required minlength="8"')}
        ${campo("nSenha2", "Repita a nova senha", 'type="password" autocomplete="new-password" required minlength="8"')}
        ${aviso()}
        <button class="ct-prim" type="submit">Trocar senha</button>
      </form>`,
  };
  let rotaAtual = null;
  function renderPagina(rota, focar) {
    rotaAtual = rota;
    pagina.innerHTML = `<div class="wrap cp-in">${(PAGINAS[rota] || PAGINAS.conta)()}</div>`;
    ligar(pagina);
    if (focar) { const h1 = pagina.querySelector("h1"); h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  }
  pagina.addEventListener("click", e => { if (e.target.closest("[data-sair]")) sair(); });
  window.LT_rotaConta = (rota, focar) => {
    fecharMenu();
    if (!usuario) { // sem login: volta ao início e pede para entrar
      history.replaceState(null, "", location.pathname + location.search);
      if (typeof mostrarInicio === "function") mostrarInicio();
      abrir("entrar");
      return;
    }
    el("home").hidden = true; el("produto").hidden = true; pagina.hidden = false;
    document.body.classList.remove("no-produto");
    document.title = "Sua conta | Lojas Tropical";
    renderPagina(PAGINAS[rota] ? rota : "conta", focar);
    window.scrollTo(0, 0);
  };

  // =====================================================================
  // AÇÕES
  // =====================================================================
  function lerEndereco(p) {
    return {
      cep: so(el(p + "Cep").value), rua: el(p + "Rua").value.trim(), numero: el(p + "Num").value.trim(),
      complemento: el(p + "Comp").value.trim(), bairro: el(p + "Bairro").value.trim(), cidade: el(p + "Cidade").value,
    };
  }
  function conferirEndereco(d) {
    if (d.cep.length !== 8) return "CEP inválido.";
    if (d.rua.length < 2) return "Informe a rua.";
    if (!d.numero) return "Informe o número (ou \"s/n\").";
    if (d.bairro.length < 2) return "Informe o bairro.";
    if (!d.cidade) return "Escolha a cidade.";
    return "";
  }
  async function atualizarCliente(f, dados, ok) {
    ocupado(f, true); msg(f, "");
    const { error } = await sb.from("clientes").update(dados).eq("id", usuario.id);
    ocupado(f, false);
    if (error) return msg(f, traduz(error.message));
    await carregarCliente(); atualizarBotao(); msg(f, ok, "ok");
  }
  async function sair() {
    await sb.auth.signOut();
    fechar();
    if (/^#conta/.test(location.hash)) location.hash = "inicio";
  }

  const ACOES = {
    async entrar(f) {
      const email = el("ctEmail").value.trim(), senha = el("ctSenha").value;
      if (!email || !senha) return msg(f, "Preencha e-mail e senha.");
      ocupado(f, true); msg(f, "");
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      ocupado(f, false);
      if (error) return msg(f, traduz(error.message));
      entrouAgora = true; // onAuthStateChange fecha a janela e leva para "Sua conta"
    },
    async criar(f) {
      const d = { nome: el("cNome").value.trim().replace(/\s+/g, " "), cpf: so(el("cCpf").value), celular: so(el("cCel").value), ...lerEndereco("c") };
      const email = el("cEmail").value.trim(), senha = el("cSenha").value;
      if (d.nome.length < 5 || !d.nome.includes(" ")) return msg(f, "Informe o nome completo.");
      if (!cpfValido(d.cpf)) return msg(f, "CPF inválido. Confira os números.");
      if (d.celular.length < 10) return msg(f, "Celular inválido. Coloque o DDD, ex.: (99) 98177-1035.");
      if (!emailOk(email)) return msg(f, "E-mail inválido.");
      if (senha.length < 8) return msg(f, "A senha precisa ter pelo menos 8 caracteres.");
      const e = conferirEndereco(d); if (e) return msg(f, e);
      if (!el("cAceite").checked) return msg(f, "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.");
      ocupado(f, true); msg(f, "");
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: d, emailRedirectTo: VOLTA } });
      ocupado(f, false);
      if (error) return msg(f, traduz(error.message));
      if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return msg(f, traduz("already registered"));
      if (data && data.session) { entrouAgora = true; return; }
      mostrar("aviso", "Confirme seu e-mail", `Quase lá! Enviamos um link de confirmação para <b>${esc(email)}</b>. Abra seu e-mail (veja também a caixa de spam) e toque no link para ativar sua conta.`);
    },
    async esqueci(f) {
      const email = el("eEmail").value.trim();
      if (!emailOk(email)) return msg(f, "E-mail inválido.");
      ocupado(f, true); msg(f, "");
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: VOLTA });
      ocupado(f, false);
      if (error) return msg(f, traduz(error.message));
      mostrar("aviso", "Verifique seu e-mail", `Se existir uma conta com <b>${esc(email)}</b>, você vai receber um link para criar uma senha nova. Veja também a caixa de spam.`);
    },
    async senha(f) {
      const s = el("nSenha").value, s2 = el("nSenha2");
      if (s.length < 8) return msg(f, "A senha precisa ter pelo menos 8 caracteres.");
      if (s2 && s2.value !== s) return msg(f, "As duas senhas não são iguais.");
      ocupado(f, true); msg(f, "");
      const { error } = await sb.auth.updateUser({ password: s });
      ocupado(f, false);
      if (error) return msg(f, traduz(error.message));
      f.reset();
      if (!drawer.hidden) { fechar(); location.hash = "conta"; setTimeout(() => msg(pagina, "Senha alterada com sucesso.", "ok"), 50); }
      else msg(f, "Senha alterada com sucesso.", "ok");
    },
    async dados(f) {
      const nome = el("mNome").value.trim().replace(/\s+/g, " ");
      if (nome.length < 5 || !nome.includes(" ")) return msg(f, "Informe o nome completo.");
      atualizarCliente(f, { nome }, "Dados salvos!");
    },
    async telefone(f) {
      const celular = so(el("mCel").value);
      if (celular.length < 10) return msg(f, "Celular inválido. Coloque o DDD.");
      atualizarCliente(f, { celular }, "Celular salvo!");
    },
    async email(f) {
      const email = el("mEmail").value.trim();
      if (!emailOk(email)) return msg(f, "E-mail inválido.");
      if (usuario && email.toLowerCase() === (usuario.email || "").toLowerCase()) return msg(f, "Esse já é o seu e-mail atual.");
      ocupado(f, true); msg(f, "");
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: VOLTA });
      ocupado(f, false);
      if (error) return msg(f, traduz(error.message));
      f.reset(); msg(f, `Enviamos um link de confirmação para ${email}. A troca vale depois que você tocar no link.`, "ok");
    },
    async endereco(f) {
      const d = lerEndereco("m"); const e = conferirEndereco(d); if (e) return msg(f, e);
      d.complemento = d.complemento || null;
      atualizarCliente(f, d, "Endereço salvo!");
    },
  };

  // =====================================================================
  // SESSÃO
  // =====================================================================
  async function carregarCliente() {
    if (!usuario) { cliente = null; window.LT_CLIENTE = null; return; }
    const { data } = await sb.from("clientes").select("*").eq("id", usuario.id).maybeSingle();
    cliente = data || null; window.LT_CLIENTE = cliente;
  }
  function atualizarBotao() {
    const lbl = botao.querySelector(".lbl");
    const nome = cliente && cliente.nome ? cliente.nome.split(" ")[0] : "";
    lbl.textContent = usuario ? (nome ? "Olá, " + nome : "Sua conta") : "Entrar";
    botao.setAttribute("aria-label", usuario ? "Sua conta" : "Entrar ou criar conta");
    botao.classList.toggle("logado", !!usuario);
    if (!menu.hidden) renderMenu();
  }

  let recuperando = false, entrouAgora = false, primeiraVez = true;
  sb.auth.onAuthStateChange((evento, sessao) => {
    usuario = sessao ? sessao.user : null;
    if (evento === "PASSWORD_RECOVERY") recuperando = true;
    setTimeout(async () => { // fora do callback (recomendação do Supabase)
      await carregarCliente(); atualizarBotao();
      if (recuperando) { recuperando = false; abrir("novaSenha"); return; }
      if (evento === "SIGNED_IN" && (entrouAgora || vindoDaConfirmacao)) {
        const confirmou = vindoDaConfirmacao; entrouAgora = false; vindoDaConfirmacao = false;
        fechar(); location.hash = "conta";
        if (confirmou) setTimeout(() => msg(pagina, "E-mail confirmado! Sua conta está ativa.", "ok"), 80);
      }
      if (evento === "SIGNED_OUT") { cliente = null; window.LT_CLIENTE = null; if (!pagina.hidden) location.hash = "inicio"; }
      if (evento === "USER_UPDATED" && !pagina.hidden && rotaAtual) renderPagina(rotaAtual);
      // Página da conta aberta direto pelo link (ex.: favorito para #conta)
      if (primeiraVez) { primeiraVez = false; if (/^#conta(\/|$)/.test(location.hash)) window.LT_rotaConta(location.hash.slice(1), false); }
    }, 0);
  });
  // Mensagem de "ok" na página (ex.: depois de confirmar o e-mail)
  const msgPagina = (t, tipo) => { const p = pagina.querySelector(".cp-in"); if (!p) return; let m = p.querySelector(":scope > .ct-msg"); if (!m) { m = document.createElement("p"); p.insertBefore(m, p.children[1] || null); } m.className = "ct-msg " + tipo; m.textContent = t; m.hidden = false; };
  const msgOriginal = msg;
  msg = (alvo, t, tipo) => (alvo === pagina ? msgPagina(t, tipo || "erro") : msgOriginal(alvo, t, tipo));

  // Link do e-mail com erro (ex.: link vencido)
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get("error_description")) {
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => { abrir("entrar"); msg(corpo.querySelector("form"), /expired|invalid/i.test(q.get("error_description")) ? "Esse link expirou ou já foi usado. Entre com seu e-mail e senha ou peça um novo link em \"Esqueci minha senha\"." : q.get("error_description")); }, 300);
  }
  botao.setAttribute("aria-haspopup", "true"); botao.setAttribute("aria-expanded", "false");
  atualizarBotao();
})();
