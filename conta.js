// ===== Conta do cliente (cadastro, login, "Minha conta") — Supabase =====
// A chave abaixo é a chave PÚBLICA (publishable). A segurança dos dados fica nas regras (RLS) do banco.
(() => {
  const SUPABASE_URL = "https://fsfljvaxbxzcobdssgnp.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tvub9holo4poZyVKfqUuvQ_aybmnkfx";
  const VOLTA = location.origin + location.pathname; // para onde o link do e-mail traz o cliente

  const el = id => document.getElementById(id);
  const drawer = el("contaDrawer"), corpo = el("contaCorpo"), titulo = el("contaTitulo"), botao = el("openConta");
  if (!drawer || !window.supabase) { if (botao) botao.hidden = true; return; }

  let vindoDaConfirmacao = /access_token=/.test(location.hash) && /type=(signup|email_change)/.test(location.hash);
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  });
  window.LT_SUPABASE = sb; // usado depois pelo checkout

  const so = s => (s || "").replace(/\D/g, "");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cidades = (typeof CIDADES !== "undefined" ? CIDADES : []);
  const fmtCpf = v => so(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  const fmtCel = v => { const d = so(v).slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/^\((\d{0,2})\) ?-?$/, "$1"); };
  const fmtCep = v => so(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  function cpfValido(c) {
    c = so(c); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (const t of [9, 10]) {
      let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
      let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== +c[t]) return false;
    }
    return true;
  }

  let usuario = null, cliente = null, focoAntes = null;

  // ---------- abrir / fechar ----------
  const fora = () => (typeof PARTES_FORA === "function" ? PARTES_FORA() : []);
  function abrir(tela) {
    if (typeof fecharCarrinho === "function") fecharCarrinho();
    focoAntes = document.activeElement;
    drawer.hidden = false; el("scrim").hidden = false;
    fora().forEach(x => x && x.setAttribute("inert", ""));
    mostrar(tela || (usuario ? "minha" : "entrar"));
  }
  function fechar() {
    if (drawer.hidden) return;
    drawer.hidden = true; el("scrim").hidden = true;
    fora().forEach(x => x && x.removeAttribute("inert"));
    if (focoAntes && document.contains(focoAntes)) focoAntes.focus();
  }
  window.abrirConta = abrir;
  botao.addEventListener("click", () => abrir());
  el("closeConta").addEventListener("click", fechar);
  el("scrim").addEventListener("click", fechar);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !drawer.hidden) fechar(); });
  drawer.addEventListener("keydown", e => { // mantém o Tab dentro da janela
    if (e.key !== "Tab") return;
    const f = [...drawer.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select")].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  // ---------- telas ----------
  const campo = (id, rot, attrs = "", dica = "") =>
    `<label class="ct-campo"><span>${rot}</span><input id="${id}" ${attrs}>${dica ? `<small>${dica}</small>` : ""}</label>`;
  const selCidade = (id, atual) =>
    `<label class="ct-campo"><span>Cidade</span><select id="${id}" required><option value="">Escolha a cidade</option>${cidades.map(c => `<option${c === atual ? " selected" : ""}>${esc(c)}</option>`).join("")}</select><small>Vendemos online só para as cidades onde temos loja.</small></label>`;
  const aviso = () => `<p class="ct-msg" id="ctMsg" role="alert" hidden></p>`;
  function msg(texto, tipo = "erro") { const m = el("ctMsg"); if (!m) return; m.textContent = texto; m.className = "ct-msg " + tipo; m.hidden = !texto; if (texto) m.scrollIntoView({ block: "nearest" }); }
  function ocupado(form, sim) { form.querySelectorAll("button, input, select").forEach(x => x.disabled = sim); }

  const TELAS = {
    entrar: () => ({
      t: "Entrar",
      h: `<form class="ct-form" id="fEntrar" novalidate>
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
      h: `<form class="ct-form" id="fCriar" novalidate>
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
      h: `<form class="ct-form" id="fEsqueci" novalidate>
        <p class="ct-intro">Digite o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.</p>
        ${campo("eEmail", "E-mail", 'type="email" autocomplete="email" required')}
        ${aviso()}
        <button class="ct-prim" type="submit">Enviar link</button>
        <button class="ct-link" type="button" data-tela="entrar">Voltar para entrar</button>
      </form>`,
    }),
    novaSenha: () => ({
      t: "Nova senha",
      h: `<form class="ct-form" id="fNova" novalidate>
        <p class="ct-intro">Escolha uma senha nova para sua conta.</p>
        ${campo("nSenha", "Nova senha", 'type="password" autocomplete="new-password" required minlength="8"', "Mínimo de 8 caracteres.")}
        ${aviso()}
        <button class="ct-prim" type="submit">Salvar nova senha</button>
      </form>`,
    }),
    minha: () => {
      const c = cliente || {};
      return {
        t: "Minha conta",
        h: `<form class="ct-form" id="fMinha" novalidate>
          <p class="ct-ola">Olá, <b>${esc((c.nome || "").split(" ")[0] || "cliente")}</b>!</p>
          ${cliente ? "" : `<p class="ct-msg erro">Não encontramos seus dados de cadastro. Fale com a gente no WhatsApp.</p>`}
          ${campo("mNome", "Nome completo", `required maxlength="120" value="${esc(c.nome)}"`)}
          ${campo("mCpf", "CPF", `disabled value="${esc(fmtCpf(c.cpf))}"`, "Para corrigir o CPF, fale com a loja.")}
          ${campo("mEmail", "E-mail", `disabled value="${esc(c.email || (usuario && usuario.email))}"`)}
          ${campo("mCel", "Celular / WhatsApp", `type="tel" inputmode="numeric" required value="${esc(fmtCel(c.celular))}"`)}
          <fieldset class="ct-grupo"><legend>Endereço de entrega</legend>
            ${campo("mCep", "CEP", `inputmode="numeric" required value="${esc(fmtCep(c.cep))}"`)}
            ${campo("mRua", "Rua / Avenida", `required maxlength="150" value="${esc(c.rua)}"`)}
            <div class="ct-duas">${campo("mNum", "Número", `required maxlength="20" value="${esc(c.numero)}"`)}${campo("mComp", "Complemento", `maxlength="100" value="${esc(c.complemento)}"`)}</div>
            ${campo("mBairro", "Bairro", `required maxlength="80" value="${esc(c.bairro)}"`)}
            ${selCidade("mCidade", c.cidade)}
          </fieldset>
          ${aviso()}
          <button class="ct-prim" type="submit"${cliente ? "" : " disabled"}>Salvar alterações</button>
          <button class="ct-sec" type="button" id="ctSair">Sair da conta</button>
          <p class="ct-nota">Quer excluir sua conta ou seus dados? <a href="${typeof waLink === "function" ? waLink("Olá! Quero excluir minha conta do site.") : "#"}" target="_blank" rel="noopener">Peça pelo WhatsApp</a>, conforme a LGPD.</p>
        </form>`,
      };
    },
    aviso: (t, texto) => ({ t, h: `<div class="ct-form"><p class="ct-ok">${texto}</p><button class="ct-prim" type="button" data-tela="entrar">Ir para entrar</button></div>` }),
  };

  function mostrar(tela, ...args) {
    const v = (TELAS[tela] || TELAS.entrar)(...args);
    titulo.textContent = v.t;
    corpo.innerHTML = v.h;
    corpo.scrollTop = 0;
    ligar();
    const primeiro = corpo.querySelector("input:not([disabled]), button");
    if (primeiro) primeiro.focus();
  }
  corpo.addEventListener("click", e => { const b = e.target.closest("[data-tela]"); if (b) mostrar(b.dataset.tela); });

  // máscaras + CEP automático (ViaCEP)
  function ligar() {
    const mask = (id, f) => { const i = el(id); if (i) i.addEventListener("input", () => { i.value = f(i.value); }); };
    ["cCpf"].forEach(id => mask(id, fmtCpf));
    ["cCel", "mCel"].forEach(id => mask(id, fmtCel));
    [["cCep", "c"], ["mCep", "m"]].forEach(([id, p]) => {
      const i = el(id); if (!i) return;
      mask(id, fmtCep);
      i.addEventListener("input", async () => {
        if (so(i.value).length !== 8) return;
        try {
          const r = await fetch(`https://viacep.com.br/ws/${so(i.value)}/json/`); const d = await r.json();
          if (d.erro) return;
          const rua = el(p + "Rua"), bai = el(p + "Bairro"), cid = el(p + "Cidade");
          if (rua && !rua.value) rua.value = d.logradouro || "";
          if (bai && !bai.value) bai.value = d.bairro || "";
          if (cid && d.uf === "MA") { const o = [...cid.options].find(o => o.value.toLowerCase() === (d.localidade || "").toLowerCase()); if (o) cid.value = o.value; }
        } catch (_) { /* sem internet ou ViaCEP fora: o cliente preenche à mão */ }
      });
    });
    const f = corpo.querySelector("form"); if (!f) return;
    const acao = { fEntrar: entrar, fCriar: criar, fEsqueci: esqueci, fNova: novaSenha, fMinha: salvar }[f.id];
    if (acao) f.addEventListener("submit", e => { e.preventDefault(); acao(f); });
    const sair = el("ctSair"); if (sair) sair.addEventListener("click", async () => { await sb.auth.signOut(); fechar(); });
  }

  const traduz = m => {
    m = String(m || "");
    if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(m)) return "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para o seu e-mail.";
    if (/already registered|already been registered/i.test(m)) return "Este e-mail já tem conta. Use \"Entrar\" ou \"Esqueci minha senha\".";
    if (/database error saving new user/i.test(m)) return "Não foi possível criar a conta. Confira os dados: este CPF talvez já esteja cadastrado.";
    if (/password should be at least|weak password/i.test(m)) return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
    if (/rate limit|too many/i.test(m)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    if (/duplicate key.*cpf/i.test(m)) return "Este CPF já está cadastrado.";
    if (/violates check constraint/i.test(m)) return "Algum dado está em formato inválido. Confira e tente de novo.";
    if (/failed to fetch|network/i.test(m)) return "Sem conexão. Verifique sua internet e tente de novo.";
    return "Algo deu errado. Tente de novo em instantes. (" + m + ")";
  };

  // ---------- ações ----------
  async function entrar(f) {
    const email = el("ctEmail").value.trim(), senha = el("ctSenha").value;
    if (!email || !senha) return msg("Preencha e-mail e senha.");
    ocupado(f, true); msg("");
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    ocupado(f, false);
    if (error) return msg(traduz(error.message));
    // onAuthStateChange carrega os dados e mostra "Minha conta"
  }

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

  async function criar(f) {
    const d = {
      nome: el("cNome").value.trim().replace(/\s+/g, " "), cpf: so(el("cCpf").value), celular: so(el("cCel").value),
      ...lerEndereco("c"),
    };
    const email = el("cEmail").value.trim(), senha = el("cSenha").value;
    if (d.nome.length < 5 || !d.nome.includes(" ")) return msg("Informe o nome completo.");
    if (!cpfValido(d.cpf)) return msg("CPF inválido. Confira os números.");
    if (d.celular.length < 10) return msg("Celular inválido. Coloque o DDD, ex.: (99) 98177-1035.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("E-mail inválido.");
    if (senha.length < 8) return msg("A senha precisa ter pelo menos 8 caracteres.");
    const e = conferirEndereco(d); if (e) return msg(e);
    if (!el("cAceite").checked) return msg("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.");
    ocupado(f, true); msg("");
    const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: d, emailRedirectTo: VOLTA } });
    ocupado(f, false);
    if (error) return msg(traduz(error.message));
    if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
      return msg(traduz("already registered"));
    if (data && data.session) return; // confirmação de e-mail desligada: já entrou
    mostrar("aviso", "Confirme seu e-mail", `Quase lá! Enviamos um link de confirmação para <b>${esc(email)}</b>. Abra seu e-mail (veja também a caixa de spam) e toque no link para ativar sua conta.`);
  }

  async function esqueci(f) {
    const email = el("eEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("E-mail inválido.");
    ocupado(f, true); msg("");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: VOLTA });
    ocupado(f, false);
    if (error) return msg(traduz(error.message));
    mostrar("aviso", "Verifique seu e-mail", `Se existir uma conta com <b>${esc(email)}</b>, você vai receber um link para criar uma senha nova. Veja também a caixa de spam.`);
  }

  async function novaSenha(f) {
    const s = el("nSenha").value;
    if (s.length < 8) return msg("A senha precisa ter pelo menos 8 caracteres.");
    ocupado(f, true); msg("");
    const { error } = await sb.auth.updateUser({ password: s });
    ocupado(f, false);
    if (error) return msg(traduz(error.message));
    await carregarCliente(); mostrar("minha"); msg("Senha alterada com sucesso.", "ok");
  }

  async function salvar(f) {
    const d = { nome: el("mNome").value.trim().replace(/\s+/g, " "), celular: so(el("mCel").value), ...lerEndereco("m") };
    if (d.nome.length < 5 || !d.nome.includes(" ")) return msg("Informe o nome completo.");
    if (d.celular.length < 10) return msg("Celular inválido. Coloque o DDD.");
    const e = conferirEndereco(d); if (e) return msg(e);
    d.complemento = d.complemento || null;
    ocupado(f, true); msg("");
    const { error } = await sb.from("clientes").update(d).eq("id", usuario.id);
    ocupado(f, false);
    if (error) return msg(traduz(error.message));
    await carregarCliente(); atualizarBotao(); msg("Dados salvos!", "ok");
  }

  // ---------- sessão ----------
  async function carregarCliente() {
    if (!usuario) { cliente = null; return; }
    const { data } = await sb.from("clientes").select("*").eq("id", usuario.id).maybeSingle();
    cliente = data || null;
    window.LT_CLIENTE = cliente;
  }
  function atualizarBotao() {
    const lbl = botao.querySelector(".lbl");
    const nome = cliente && cliente.nome ? cliente.nome.split(" ")[0] : "";
    lbl.textContent = usuario ? (nome ? "Olá, " + nome : "Minha conta") : "Entrar";
    botao.setAttribute("aria-label", usuario ? "Abrir minha conta" : "Entrar ou criar conta");
    botao.classList.toggle("logado", !!usuario);
  }

  let recuperando = false;
  sb.auth.onAuthStateChange((evento, sessao) => {
    usuario = sessao ? sessao.user : null;
    if (evento === "PASSWORD_RECOVERY") recuperando = true;
    setTimeout(async () => { // fora do callback (recomendação do Supabase)
      await carregarCliente(); atualizarBotao();
      if (recuperando) { recuperando = false; abrir("novaSenha"); return; }
      if (evento === "SIGNED_IN" && !drawer.hidden) mostrar("minha");
      if (evento === "SIGNED_IN" && vindoDaConfirmacao) {
        vindoDaConfirmacao = false; abrir("minha"); msg("E-mail confirmado! Sua conta está ativa.", "ok");
      }
      if (evento === "SIGNED_OUT") { cliente = null; window.LT_CLIENTE = null; }
    }, 0);
  });
  // Link do e-mail com erro (ex.: link vencido)
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get("error_description")) {
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => { abrir("entrar"); msg(/expired|invalid/i.test(q.get("error_description")) ? "Esse link expirou ou já foi usado. Entre com seu e-mail e senha ou peça um novo link em \"Esqueci minha senha\"." : q.get("error_description")); }, 300);
  }
  atualizarBotao();
})();
