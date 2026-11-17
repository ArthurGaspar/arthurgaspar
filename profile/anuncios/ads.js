/**
 * Anúncios internos: os sites do GitHub Pages anunciando uns aos outros.
 *
 * Este arquivo é um template. O generate.mjs troca o marcador abaixo pelo
 * inventário (anuncios/inventario.json + descrições de featured.json) e publica
 * o resultado em _site/ads/ads.js. Os dados vão embutidos para o site gastar uma
 * requisição só.
 *
 * Tudo mora num Shadow DOM: o CSS do site não deforma o anúncio e o do anúncio
 * não vaza para o site. Nenhum cookie, nenhuma requisição além da imagem.
 *
 *   ?noads   esconde tudo nesta visita
 *   ?ads     mostra tudo agora, ignorando a frequência (e o navigator.webdriver)
 */
(() => {
  const DADOS = /*__DADOS__*/ null;
  const script = document.currentScript;
  if (!DADOS || !DADOS.ativo || !script) return;

  const params = new URLSearchParams(location.search);
  const forcar = params.has("ads");
  if (params.has("noads")) return;
  // Teste automatizado (Playwright, Selenium) não pode ter um modal na frente
  // do clique. Sem isto, o CI de qualquer site com e2e fica instável.
  if (navigator.webdriver && !forcar) return;
  // Nem no npm run dev de cada projeto: quem está desenvolvendo não é público.
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !forcar) return;

  const site = script.dataset.site;
  const eu = DADOS.projetos[site];
  if (!eu || !eu.anuncia) return;

  const embaralhar = (xs) => {
    const a = xs.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const candidatos = embaralhar(
    Object.entries(DADOS.projetos)
      .filter(([id, p]) => id !== site && p.categoria === eu.categoria)
      .map(([id, p]) => ({ id, ...p })),
  );
  if (!candidatos.length) return;

  const lang = (document.documentElement.lang || navigator.language || "en").toLowerCase();
  const loc = lang.startsWith("pt") ? "pt-BR" : lang.startsWith("es") ? "es" : "en";
  const T = {
    en: {
      rotulo: "Ad",
      cta: "Check it out",
      fechar: "Close ad",
      porque: "Why this ad?",
      explica: "A house ad: another project by the same author, in the same category as this one. No cookies, no tracking.",
      dispensar: "No thanks",
    },
    "pt-BR": {
      rotulo: "Anúncio",
      cta: "Conhecer",
      fechar: "Fechar anúncio",
      porque: "Por que este anúncio?",
      explica: "Anúncio da casa: outro projeto do mesmo autor, da mesma categoria deste. Sem cookies, sem rastreamento.",
      dispensar: "Agora não",
    },
    es: {
      rotulo: "Anuncio",
      cta: "Conocer",
      fechar: "Cerrar anuncio",
      porque: "¿Por qué este anuncio?",
      explica: "Anuncio de la casa: otro proyecto del mismo autor, de la misma categoría que este. Sin cookies, sin rastreo.",
      dispensar: "Ahora no",
    },
  }[loc];

  // sessionStorage pode não existir (aba privada, site data bloqueado). Sem ele
  // os anúncios só perdem a memória de "já fechei", nunca quebram.
  const chave = (k) => `ads:${site}:${k}`;
  const visto = (k) => {
    if (forcar) return false;
    try {
      return sessionStorage.getItem(chave(k)) === "1";
    } catch {
      return false;
    }
  };
  const marcar = (k) => {
    try {
      sessionStorage.setItem(chave(k), "1");
    } catch {}
  };

  const imgBase = new URL("img/", script.src);
  const destino = (p, formato) => {
    const u = new URL(p.url);
    // O "clique pago" simulado: o site de destino sabe de onde veio e por qual
    // formato. Só nos sites; o github.com ignoraria os parâmetros.
    if (u.hostname.endsWith("github.io")) {
      u.searchParams.set("utm_source", site);
      u.searchParams.set("utm_medium", "house-ad");
      u.searchParams.set("utm_campaign", formato);
    }
    return u.href;
  };

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const criativo = (p) =>
    p.img
      ? `<img class="criativo" src="${esc(new URL(p.img, imgBase).href)}" alt="" loading="lazy" decoding="async">`
      : `<div class="criativo tipo" style="--cor:${esc(p.cor)}" aria-hidden="true"><span>${esc(p.nome)}</span></div>`;

  const selo = (formato) => `
    <div class="selo">
      <span class="tag">${T.rotulo}</span>
      <button class="info" type="button" aria-label="${T.porque}" aria-expanded="false" data-info="${formato}">i</button>
      <span class="explica" role="note" hidden>${T.explica}</span>
    </div>`;

  const fechar = (formato) =>
    `<button class="x" type="button" aria-label="${T.fechar}" data-fechar="${formato}">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
    </button>`;

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .raiz {
      --fundo: #ffffff; --texto: #1d1d1f; --suave: #5f6368; --borda: rgba(0,0,0,.12);
      --tag: #fbbc04; --tag-texto: #202124; --sombra: 0 8px 28px rgba(0,0,0,.18);
      font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: var(--texto);
    }
    @media (prefers-color-scheme: dark) {
      .raiz { --fundo: #202124; --texto: #e8eaed; --suave: #9aa0a6; --borda: rgba(255,255,255,.14); --sombra: 0 8px 28px rgba(0,0,0,.55); }
    }
    a { color: inherit; text-decoration: none; }
    button { font: inherit; color: inherit; cursor: pointer; }

    .criativo { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; object-position: top; background: var(--borda); }
    .tipo { display: grid; place-items: center; padding: 6%; color: #fff; text-align: center; container-type: inline-size;
      background: radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--cor) 55%, #fff), var(--cor) 60%, color-mix(in srgb, var(--cor) 70%, #000)); }
    /* Medido pela largura do próprio criativo: o mesmo nome cabe no modal e na miniatura do banner. */
    .tipo span { font-weight: 800; font-size: clamp(10px, 11cqi, 34px); line-height: 1.1; letter-spacing: -.01em; text-shadow: 0 2px 12px rgba(0,0,0,.25); }

    .selo { position: relative; display: inline-flex; align-items: center; gap: 4px; }
    .tag { background: var(--tag); color: var(--tag-texto); font-weight: 700; font-size: 11px; line-height: 1; padding: 3px 5px; border-radius: 3px; }
    .info { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--suave); background: none; color: var(--suave);
      font: italic 700 10px/1 Georgia, serif; padding: 0; display: grid; place-items: center; }
    .explica { position: absolute; left: 0; bottom: calc(100% + 6px); width: 240px; padding: 8px 10px; border-radius: 6px;
      background: var(--texto); color: var(--fundo); font-size: 12px; box-shadow: var(--sombra); z-index: 2; }
    .explica[hidden] { display: none; }

    .x { flex: none; width: 28px; height: 28px; border: 0; border-radius: 50%; background: transparent; color: var(--suave); display: grid; place-items: center; }
    .x:hover { background: var(--borda); color: var(--texto); }
    .x svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
    .cta { flex: none; display: inline-block; background: #1a73e8; color: #fff; font-weight: 600; padding: 8px 16px; border-radius: 999px; white-space: nowrap; }
    .cta:hover { background: #1765cc; }
    :focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
    .nome { color: var(--suave); font-size: 12px; }
    .chamada { font-weight: 700; }

    /* ---- banner fixo, rodapé ---- */
    .banner { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000; background: var(--fundo);
      border-top: 1px solid var(--borda); box-shadow: 0 -4px 18px rgba(0,0,0,.08); animation: subir .35s ease-out; }
    .banner .dentro { max-width: 760px; margin: 0 auto; display: flex; align-items: center; gap: 12px; padding: 8px 12px; }
    .banner .criativo { width: 112px; flex: none; border-radius: 4px; }
    .banner .texto { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .banner .chamada { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 560px) {
      .banner .criativo { display: none; }
      .banner .dentro { gap: 8px; padding: 6px 8px; }
      .banner .chamada { font-size: 13px; }
      .banner .cta { padding: 6px 12px; font-size: 13px; }
    }

    /* ---- card lateral, canto inferior direito ---- */
    .card { position: fixed; right: 16px; bottom: calc(var(--banner, 0px) + 16px); z-index: 2147483001; width: 300px;
      background: var(--fundo); border: 1px solid var(--borda); border-radius: 10px; overflow: hidden; box-shadow: var(--sombra);
      animation: entrar .4s ease-out; }
    .card .topo { position: absolute; inset: 8px 8px auto 8px; display: flex; justify-content: space-between; align-items: center; }
    .card .topo .x { background: rgba(0,0,0,.45); color: #fff; }
    .card .topo .tag { box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    .card .topo .info { background: rgba(0,0,0,.45); border-color: transparent; color: #fff; }
    .card .explica { top: calc(100% + 6px); bottom: auto; }
    .card .corpo { padding: 12px 14px 14px; display: grid; gap: 6px; }
    .card .desc { color: var(--suave); font-size: 13px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .card .cta { justify-self: start; margin-top: 4px; }
    @media (max-width: 760px) { .card { display: none; } }

    /* ---- modal (interstitial) ---- */
    .fundo { position: fixed; inset: 0; z-index: 2147483002; background: rgba(15,15,20,.62); display: grid; place-items: center; padding: 16px;
      animation: aparecer .25s ease-out; }
    .modal { width: min(560px, 100%); max-height: calc(100vh - 32px); overflow: auto; background: var(--fundo); border-radius: 14px;
      box-shadow: 0 24px 64px rgba(0,0,0,.4); animation: crescer .3s cubic-bezier(.2,.9,.3,1.2); }
    .modal .barra { display: flex; justify-content: space-between; align-items: center; padding: 8px 8px 8px 14px; }
    .modal .explica { top: calc(100% + 6px); bottom: auto; }
    .modal .corpo { padding: 16px 20px 20px; display: grid; gap: 8px; }
    .modal .chamada { font-size: 22px; line-height: 1.2; letter-spacing: -.01em; }
    .modal .desc { color: var(--suave); }
    .modal .acoes { display: flex; align-items: center; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
    .modal .cta { padding: 10px 22px; font-size: 15px; }
    .modal .dispensar { border: 0; background: none; color: var(--suave); padding: 6px 2px; text-decoration: underline; }

    @keyframes subir { from { transform: translateY(100%); } }
    @keyframes entrar { from { opacity: 0; transform: translateY(16px); } }
    @keyframes aparecer { from { opacity: 0; } }
    @keyframes crescer { from { opacity: 0; transform: scale(.94); } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    @media print { .raiz { display: none; } }
  `;

  const host = document.createElement("div");
  host.setAttribute("data-house-ads", "");
  const raizShadow = host.attachShadow({ mode: "open" });
  raizShadow.innerHTML = `<style>${CSS}</style><div class="raiz"></div>`;
  const raiz = raizShadow.querySelector(".raiz");
  document.body.appendChild(host);

  // Um por formato. O card só sai com um anúncio diferente do banner; o modal
  // pode repetir o banner, como numa campanha de verdade.
  const [paraBanner, paraCard, paraModal] = [candidatos[0], candidatos[1], candidatos[2] || candidatos[0]];

  const montar = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // "i" e "x" são delegados: o mesmo tratamento serve aos três formatos.
  raiz.addEventListener("click", (e) => {
    const info = e.target.closest("[data-info]");
    if (info) {
      const nota = info.parentElement.querySelector(".explica");
      nota.hidden = !nota.hidden;
      info.setAttribute("aria-expanded", String(!nota.hidden));
      return;
    }
    const x = e.target.closest("[data-fechar]");
    if (x) remover[x.dataset.fechar]?.();
  });

  const remover = {};

  /* ---------------------------------------------------------------- banner */
  if (!visto("banner")) {
    const p = paraBanner;
    const el = montar(`
      <aside class="banner" aria-label="${T.rotulo}">
        <div class="dentro">
          <a href="${esc(destino(p, "banner"))}" target="_blank" rel="noopener" tabindex="-1">${criativo(p)}</a>
          <div class="texto">
            ${selo("banner")}
            <a class="chamada" href="${esc(destino(p, "banner"))}" target="_blank" rel="noopener">${esc(p.chamada[loc])}</a>
            <span class="nome">${esc(p.nome)}</span>
          </div>
          <a class="cta" href="${esc(destino(p, "banner"))}" target="_blank" rel="noopener">${T.cta}</a>
          ${fechar("banner")}
        </div>
      </aside>`);
    raiz.appendChild(el);
    const medir = () => raiz.style.setProperty("--banner", `${el.offsetHeight}px`);
    medir();
    addEventListener("resize", medir);
    remover.banner = () => {
      el.remove();
      raiz.style.setProperty("--banner", "0px");
      removeEventListener("resize", medir);
      marcar("banner");
    };
  }

  /* ------------------------------------------------------------------ card */
  if (paraCard && !visto("card")) {
    setTimeout(
      () => {
        const p = paraCard;
        const el = montar(`
          <aside class="card" aria-label="${T.rotulo}">
            <a href="${esc(destino(p, "card"))}" target="_blank" rel="noopener" tabindex="-1">${criativo(p)}</a>
            <div class="topo">${selo("card")}${fechar("card")}</div>
            <div class="corpo">
              <span class="nome">${esc(p.nome)}</span>
              <a class="chamada" href="${esc(destino(p, "card"))}" target="_blank" rel="noopener">${esc(p.chamada[loc])}</a>
              <p class="desc" style="margin:0">${esc(p.desc[loc])}</p>
              <a class="cta" href="${esc(destino(p, "card"))}" target="_blank" rel="noopener">${T.cta}</a>
            </div>
          </aside>`);
        raiz.appendChild(el);
        remover.card = () => {
          el.remove();
          marcar("card");
        };
      },
      forcar ? 0 : DADOS.frequencia.atrasoCardMs,
    );
  }

  /* ----------------------------------------------------------------- modal */
  if (!visto("modal")) {
    let aberto = false;
    const abrir = () => {
      if (aberto) return;
      aberto = true;
      clearTimeout(timer);
      removeEventListener("scroll", aoRolar);
      marcar("modal");

      const p = paraModal;
      const anterior = document.activeElement;
      const el = montar(`
        <div class="fundo">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ads-titulo">
            <div class="barra">${selo("modal")}${fechar("modal")}</div>
            <a href="${esc(destino(p, "modal"))}" target="_blank" rel="noopener" tabindex="-1">${criativo(p)}</a>
            <div class="corpo">
              <span class="nome">${esc(p.nome)}</span>
              <a class="chamada" id="ads-titulo" href="${esc(destino(p, "modal"))}" target="_blank" rel="noopener">${esc(p.chamada[loc])}</a>
              <span class="desc">${esc(p.desc[loc])}</span>
              <div class="acoes">
                <a class="cta" href="${esc(destino(p, "modal"))}" target="_blank" rel="noopener">${T.cta}</a>
                <button class="dispensar" type="button" data-fechar="modal">${T.dispensar}</button>
              </div>
            </div>
          </div>
        </div>`);
      raiz.appendChild(el);

      const focaveis = () => [...el.querySelectorAll("a, button")];
      const teclado = (e) => {
        if (e.key === "Escape") return remover.modal();
        if (e.key !== "Tab") return;
        // Prende o Tab dentro do modal enquanto ele está aberto.
        const f = focaveis();
        const atual = raizShadow.activeElement;
        if (e.shiftKey && atual === f[0]) (e.preventDefault(), f[f.length - 1].focus());
        else if (!e.shiftKey && atual === f[f.length - 1]) (e.preventDefault(), f[0].focus());
      };
      el.addEventListener("click", (e) => e.target === el && remover.modal());
      document.addEventListener("keydown", teclado, true);
      el.querySelector(".x").focus();

      remover.modal = () => {
        el.remove();
        document.removeEventListener("keydown", teclado, true);
        anterior?.focus?.();
      };
    };

    // Abre no que vier primeiro: o tempo, ou a pessoa ter rolado parte da página.
    const aoRolar = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max > 0 && scrollY / max >= DADOS.frequencia.scrollModal) abrir();
    };
    const timer = setTimeout(abrir, forcar ? 300 : DADOS.frequencia.atrasoModalMs);
    addEventListener("scroll", aoRolar, { passive: true });
  }
})();
