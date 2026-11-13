// ===================================================================
// Lojas Tropical: dados legais, aviso de cookies (LGPD) e scripts de medição
// Este arquivo é usado por TODAS as páginas do site.
// ===================================================================

// ===== 1) Dados legais da empresa: edite aqui =====
// Aparecem no rodapé e nas políticas. Troque tudo que estiver entre [colchetes].
const EMPRESA = {
  nomeFantasia: "Lojas Tropical",
  razaoSocial: "R N SAMPAIO PIMENTA LTDA",
  cnpj: "10.665.286/0001-88",
  inscricaoEstadual: "123121671",
  endereco: "Rua Francisco Bernadino, nº 1371-A, São Sebastião, Codó - MA, CEP 65400-000",
  telefone: "(99) 98177-1035",
  whatsapp: "559981771035",                       // DDI 55 + DDD + número, só dígitos
  atendimento: "segunda a sábado, das 8h às 18h",
  encarregado: "Jardiel Lima Pimenta",
  atualizacao: "12/11/2026"                        // data da última revisão das políticas
};

// ===== 2) Ferramentas de medição (tracking): deixe "" para não usar =====
// Elas SÓ são carregadas depois que o visitante aceita a categoria correspondente.
const TRACKING = {
  ga4: "",        // Google Analytics 4, ex.: "G-XXXXXXXXXX"   → categoria "Estatísticas"
  metaPixel: ""   // Meta (Facebook/Instagram) Pixel, ex.: "123456789012345" → categoria "Marketing"
};

(() => {
  const CHAVE = "tropical-consentimento";
  const VERSAO = 1;          // aumente se mudar as categorias: o aviso aparece de novo para todos
  const VALIDADE_DIAS = 365; // após esse prazo, pedimos o consentimento outra vez

  // ----- Preenche os dados da empresa nas páginas -----
  function preencherEmpresa() {
    document.querySelectorAll("[data-empresa]").forEach(el => {
      const v = EMPRESA[el.dataset.empresa];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll("[data-empresa-mail]").forEach(a => {
      const v = EMPRESA[a.dataset.empresaMail];
      if (v) { a.href = "mailto:" + v.replace(/[\[\]]/g, ""); a.textContent = v; }
    });
    document.querySelectorAll("[data-empresa-wa]").forEach(a => {
      a.href = "https://wa.me/" + EMPRESA.whatsapp;
    });
  }

  // ----- Leitura e gravação do consentimento -----
  function lerConsentimento() {
    try {
      const c = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (!c || c.v !== VERSAO) return null;
      if (Date.now() - new Date(c.data).getTime() > VALIDADE_DIAS * 864e5) return null;
      return c;
    } catch (_) { return null; }
  }
  function gravarConsentimento(estatisticas, marketing) {
    const anterior = lerConsentimento();
    const c = { v: VERSAO, data: new Date().toISOString(), estatisticas: !!estatisticas, marketing: !!marketing };
    try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch (_) {}
    // Revogou algo que estava aceito: apaga os cookies e recarrega para descarregar os scripts
    if (anterior && ((anterior.estatisticas && !c.estatisticas) || (anterior.marketing && !c.marketing))) {
      apagarCookiesDeMedicao();
      location.reload();
      return c;
    }
    aplicar(c);
    return c;
  }
  function apagarCookiesDeMedicao() {
    const dominios = ["", location.hostname, "." + location.hostname.replace(/^www\./, "")];
    document.cookie.split(";").map(s => s.split("=")[0].trim())
      .filter(n => /^(_ga|_gid|_gat|_fbp|_fbc)/.test(n))
      .forEach(n => dominios.forEach(d => {
        document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? "; domain=" + d : ""}`;
      }));
  }

  // ----- Carregamento condicionado dos scripts de medição -----
  let gaCarregado = false, pixelCarregado = false;
  function aplicar(c) {
    if (!c) return;
    if (c.estatisticas && TRACKING.ga4 && !gaCarregado) {
      gaCarregado = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      gtag("js", new Date());
      gtag("config", TRACKING.ga4, { allow_google_signals: false, allow_ad_personalization_signals: false });
      const s = document.createElement("script");
      s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(TRACKING.ga4);
      document.head.appendChild(s);
    }
    if (c.marketing && TRACKING.metaPixel && !pixelCarregado) {
      pixelCarregado = true;
      /* Código oficial do Meta Pixel */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      fbq("init", TRACKING.metaPixel);
      fbq("track", "PageView");
    }
  }

  // Registra um evento (ex.: clique no WhatsApp) só nas ferramentas que o visitante autorizou
  window.LT_rastrear = function (evento, params) {
    const c = lerConsentimento(); if (!c) return;
    if (c.estatisticas && gaCarregado && window.gtag) gtag("event", evento, params || {});
    if (c.marketing && pixelCarregado && window.fbq) fbq("track", evento === "contato_whatsapp" ? "Contact" : evento, params || {});
  };

  // ----- Interface: aviso (banner) e janela de preferências -----
  const linkPolitica = document.currentScript && document.currentScript.dataset.base || "";
  function criarInterface() {
    const banner = document.createElement("div");
    banner.className = "lt-cookies";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.hidden = true;
    banner.innerHTML = `
      <div class="lt-cookies-in">
        <p><b>Sua privacidade importa.</b> Usamos o armazenamento do navegador para o site funcionar (como o seu carrinho). Com a sua permissão, também usamos cookies de estatísticas e de marketing para melhorar o site e nossos anúncios. Você pode mudar isso quando quiser em “Preferências de cookies”, no rodapé. Saiba mais na <a href="${linkPolitica}politica-de-cookies.html">Política de Cookies</a> e na <a href="${linkPolitica}politica-de-privacidade.html">Política de Privacidade</a>.</p>
        <div class="lt-cookies-acoes">
          <button type="button" class="lt-btn lt-btn-sec" data-lt="recusar">Recusar opcionais</button>
          <button type="button" class="lt-btn lt-btn-sec" data-lt="personalizar">Personalizar</button>
          <button type="button" class="lt-btn lt-btn-pri" data-lt="aceitar">Aceitar todos</button>
        </div>
      </div>`;

    const dlg = document.createElement("dialog");
    dlg.className = "lt-dialog";
    dlg.setAttribute("aria-labelledby", "lt-dlg-titulo");
    dlg.innerHTML = `
      <form method="dialog" class="lt-dialog-in">
        <h2 id="lt-dlg-titulo">Preferências de cookies</h2>
        <p>Escolha o que podemos usar. Os itens opcionais ficam desligados até você ligar.</p>
        <fieldset>
          <legend class="lt-vh">Categorias</legend>
          <div class="lt-cat">
            <input type="checkbox" id="lt-nec" checked disabled aria-describedby="lt-nec-d">
            <label for="lt-nec"><b>Necessários</b> <span class="lt-sempre">(sempre ativos)</span></label>
            <p id="lt-nec-d">Guardam seu carrinho e esta escolha, só no seu navegador. Sem eles o site não funciona direito.</p>
          </div>
          <div class="lt-cat">
            <input type="checkbox" id="lt-est" aria-describedby="lt-est-d">
            <label for="lt-est"><b>Estatísticas</b></label>
            <p id="lt-est-d">Contam visitas e páginas vistas, de forma agregada, para melhorarmos o site (Google Analytics).</p>
          </div>
          <div class="lt-cat">
            <input type="checkbox" id="lt-mkt" aria-describedby="lt-mkt-d">
            <label for="lt-mkt"><b>Marketing</b></label>
            <p id="lt-mkt-d">Medem o resultado dos nossos anúncios no Instagram e Facebook (Meta Pixel).</p>
          </div>
        </fieldset>
        <div class="lt-cookies-acoes">
          <button type="submit" class="lt-btn lt-btn-sec" value="recusar">Recusar opcionais</button>
          <button type="submit" class="lt-btn lt-btn-pri" value="salvar">Salvar preferências</button>
        </div>
      </form>`;

    document.body.append(banner, dlg);

    const abrirPreferencias = () => {
      const c = lerConsentimento();
      dlg.querySelector("#lt-est").checked = !!(c && c.estatisticas);
      dlg.querySelector("#lt-mkt").checked = !!(c && c.marketing);
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      dlg.querySelector("#lt-est").focus();
    };
    const fecharBanner = () => { banner.hidden = true; };

    banner.addEventListener("click", e => {
      const b = e.target.closest("[data-lt]"); if (!b) return;
      if (b.dataset.lt === "aceitar") { gravarConsentimento(true, true); fecharBanner(); }
      if (b.dataset.lt === "recusar") { gravarConsentimento(false, false); fecharBanner(); }
      if (b.dataset.lt === "personalizar") abrirPreferencias();
    });
    dlg.addEventListener("close", () => {
      if (dlg.returnValue === "salvar") gravarConsentimento(dlg.querySelector("#lt-est").checked, dlg.querySelector("#lt-mkt").checked);
      else if (dlg.returnValue === "recusar") gravarConsentimento(false, false);
      else return; // fechou com Esc: nada muda
      fecharBanner();
    });
    // Qualquer elemento com data-lt-preferencias abre a janela (ex.: link no rodapé)
    document.addEventListener("click", e => {
      if (e.target.closest("[data-lt-preferencias]")) { e.preventDefault(); abrirPreferencias(); }
    });

    if (!lerConsentimento()) banner.hidden = false;
  }

  function iniciar() {
    preencherEmpresa();
    criarInterface();
    aplicar(lerConsentimento());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
