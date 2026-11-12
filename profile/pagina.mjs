/**
 * A página central, publicada no GitHub Pages.
 *
 * Existe porque o README é vitrine, não história: quem recruta não abre dezoito
 * repositórios para entender quem eu sou. Aqui a prosa é HTML de verdade (dá
 * para ler no celular, selecionar, achar no buscador) e os desenhos são os
 * mesmos SVGs do README.
 *
 * Só tema claro, de propósito. A página não tem <picture> nem prefers-color-scheme,
 * só aponta para `nome.svg`, e declara `color-scheme: light` para o navegador não
 * escurecer formulário nem barra de rolagem por conta própria.
 */
import { C, FONTE, MONO, esc } from "./theme.mjs";

/** URL da badge do shields.io. O README e a página usam a mesma. */
export function urlBadge(b) {
  const rotulo = encodeURIComponent(b.nome).replace(/-/g, "--").replace(/_/g, "__");
  const logo = b.logo ? `&logo=${encodeURIComponent(b.logo)}&logoColor=${b.logoCor ?? "white"}` : "";
  return `https://img.shields.io/badge/${rotulo}-${b.cor}?style=flat-square${logo}`;
}

/** Campo em branco no historia.json some da página em vez de virar buraco. */
const vazio = (v) => v === undefined || v === null || v === "";

/**
 * Monta um index.html.
 *
 *   ctx.raiz    "" na versão inglesa (raiz do site) e "../" nas outras
 *   ctx.svg     (base, alt, attrs) → <img> de um asset claro
 *   ctx.caminho { loc: "pt-BR/" ... } para o seletor de idioma
 *   ctx.idiomas { loc: "Português" ... }
 *   ctx.data    dia da geração, para o rodapé
 */
export function montarPagina({ loc, s, h, contato, d, alvo, tools, url, ctx }) {
  const p = s.pagina;
  const svg = ctx.svg;

  const idiomas = Object.entries(ctx.idiomas)
    .map(([l, nome]) => {
      const atual = l === loc;
      return `<a href="${ctx.raiz}${ctx.caminho[l]}" hreflang="${l}"${atual ? ' aria-current="page"' : ""}>${esc(nome)}</a>`;
    })
    .join("");

  const acoes = [
    contato.linkedin && `<a class="botao cheio" href="${esc(contato.linkedin)}">LinkedIn</a>`,
    contato.github && `<a class="botao" href="${esc(contato.github)}">GitHub</a>`,
    contato.orcid && `<a class="botao" href="${esc(contato.orcid)}">ORCID</a>`,
    contato.lattes && `<a class="botao" href="${esc(contato.lattes)}">Lattes</a>`,
    contato.email && `<a class="botao" href="mailto:${esc(contato.email)}">${esc(p.email)}</a>`,
    contato.cv && `<a class="botao" href="${esc(contato.cv)}">${esc(p.curriculo)}</a>`,
  ]
    .filter(Boolean)
    .join("\n");

  const historia = (h.historia ?? []).filter((x) => !vazio(x));
  const experiencia = (h.experiencia ?? []).filter((t) => !vazio(t.titulo));
  const formacao = (h.formacao ?? []).filter((t) => !vazio(t.titulo));
  const falados = (h.idiomas ?? []).filter((x) => !vazio(x));

  /** Uma linha do tempo. Os pontos são os resultados, como no currículo. */
  const linha = (itens) => `<ol class="linha-do-tempo">
${itens
  .map(
    (t) => `<li>
${vazio(t.quando) ? "" : `<span class="quando">${esc(t.quando)}</span>`}
<h4>${esc(t.titulo)}</h4>
${vazio(t.onde) ? "" : `<p class="onde">${esc(t.onde)}</p>`}
${vazio(t.texto) ? "" : `<p>${esc(t.texto)}</p>`}
${(t.pontos ?? []).length ? `<ul>${t.pontos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
</li>`,
  )
  .join("\n")}
</ol>`;

  const blocoHistoria = historia.length
    ? `<section aria-labelledby="historia">
<h2 id="historia">${svg(`faixa-historia${alvo}`, p.historia)}</h2>
<div class="prosa">
${historia.map((x) => `<p>${esc(x)}</p>`).join("\n")}
</div>
</section>`
    : "";

  const blocoTrajetoria =
    experiencia.length || formacao.length
      ? `<section aria-labelledby="trajetoria">
<h2 id="trajetoria">${svg(`faixa-trajetoria${alvo}`, p.trajetoria)}</h2>
${experiencia.length ? `<h3 class="grupo-tempo">${esc(p.experiencia)}</h3>\n${linha(experiencia)}` : ""}
${formacao.length ? `<h3 class="grupo-tempo">${esc(p.formacao)}</h3>\n${linha(formacao)}` : ""}
${falados.length ? `<h3 class="grupo-tempo">${esc(p.falados)}</h3>\n<p class="falados">${falados.map(esc).join(" · ")}</p>` : ""}
</section>`
      : "";

  const blocoCases = (h.cases ?? []).length
    ? `<section aria-labelledby="cases">
<h2 id="cases">${svg(`faixa-cases${alvo}`, p.cases)}</h2>
${h.cases.map((c, i) => `<article class="case" aria-labelledby="case-${esc(c.repo)}">
<p class="case-numero">${esc(p.case)} ${i + 1}</p>
<h3 id="case-${esc(c.repo)}">${esc(c.titulo)}</h3>
<a class="case-repo" href="https://github.com/ArthurGaspar/${esc(c.repo)}">${esc(c.repo)} &rarr;</a>
${["problema", "abordagem", "resultado"].map((chave) => `<p><strong>${esc(p[chave])}.</strong> ${esc(c[chave])}</p>`).join("\n")}
</article>`).join("\n")}
</section>`
    : "";

  const categorias = d.categorias
    .filter((c) => c.repos.length)
    .map((c) => {
      const titulo = s.categorias[c.chave] ?? c.chave;
      const cards = c.repos
        .map((r) => {
          const alt = `${r.nome}${r.descricaoLocal ? ` · ${r.descricaoLocal}` : ""}`;
          return `<li><a href="${esc(r.url)}">${svg(`${r.id}${alvo}`, alt, ' width="284" height="142" loading="lazy"')}</a></li>`;
        })
        .join("\n");
      return `<h3 class="categoria">${svg(`cat-${c.chave}${alvo}`, `${titulo} (${c.repos.length})`, ' height="44"')}</h3>
<ul class="cards">
${cards}
</ul>`;
    })
    .join("\n");

  const ferramentas = tools.grupos
    .map(
      (g) => `<h3 class="grupo">${esc(s.grupos[g.chave])}</h3>
<p class="badges">${g.badges.map((b) => `<img src="${urlBadge(b)}" alt="${esc(b.nome)}" height="20" loading="lazy">`).join("")}</p>`,
    )
    .join("\n");

  const subEscopo = d.escopo === "privado" ? s.subPrivados : s.subPublicos;

  const alternativas = Object.keys(ctx.idiomas)
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${url}${ctx.caminho[l]}">`)
    .join("\n");

  return `<!doctype html>
<!-- Gerado por profile/generate.mjs. Edite profile/historia.json e profile/strings.json, não aqui. -->
<html lang="${loc}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(p.titulo)}</title>
<meta name="description" content="${esc(h.resumo)}">
<meta property="og:title" content="${esc(p.titulo)}">
<meta property="og:description" content="${esc(h.resumo)}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${url}${ctx.caminho[loc]}">
<link rel="canonical" href="${url}${ctx.caminho[loc]}">
${alternativas}
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2Q19 13 30 16Q19 19 16 30Q13 19 2 16Q13 13 16 2Z" fill="${C.amarelo}"/></svg>`)}">
<style>
:root {
  color-scheme: light;
  --papel: ${C.papel};
  --papel-frio: ${C.papelFrio};
  --tinta: ${C.tinta};
  --tinta2: ${C.tinta2};
  --tinta3: ${C.tinta3};
  --linha: ${C.linha};
  --azul: ${C.azul};
  --azul-fundo: ${C.azulFundo};
  --azul-palido: ${C.azulPalido};
  --amarelo: ${C.amarelo};
  --amarelo-palido: ${C.amareloPalido};
  --ambar: ${C.ambar};
  --sobre-azul: ${C.sobreAzul};
}
* { box-sizing: border-box; }
html { background: var(--papel); }
body {
  margin: 0;
  background: linear-gradient(180deg, var(--papel) 0%, var(--papel-frio) 100%);
  color: var(--tinta);
  font: 17px/1.65 ${FONTE};
  -webkit-text-size-adjust: 100%;
}
main { max-width: 912px; margin: 0 auto; padding: 24px 16px 48px; }
img { max-width: 100%; height: auto; display: block; }
a { color: var(--azul-fundo); }
a:focus-visible { outline: 3px solid var(--amarelo); outline-offset: 3px; border-radius: 6px; }

.idiomas { display: flex; justify-content: flex-end; gap: 6px; margin: 0 0 14px; font-size: 14px; }
.idiomas a {
  padding: 4px 12px; border-radius: 999px; border: 1px solid var(--linha);
  color: var(--tinta2); text-decoration: none; background: var(--papel);
}
.idiomas a[aria-current] { background: var(--azul); border-color: var(--azul); color: var(--sobre-azul); }

.resumo { font-size: 20px; line-height: 1.55; margin: 28px 0 20px; max-width: 46em; text-wrap: pretty; }
.acoes { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 8px; }
.botao {
  display: inline-block; padding: 9px 18px; border-radius: 999px; font-weight: 600; font-size: 15px;
  border: 1.5px solid var(--azul); color: var(--azul-fundo); text-decoration: none; background: var(--papel);
}
.botao.cheio { background: var(--azul); color: var(--sobre-azul); }
.botao:hover { background: var(--azul-palido); }
.botao.cheio:hover { background: var(--azul-fundo); }

section { margin-top: 48px; }
h2 { margin: 0 0 20px; }
h3 { margin: 0; }
.interesses { margin-top: 28px; }

.prosa p { margin: 0 0 1em; max-width: 46em; text-wrap: pretty; }

.case { margin: 0 0 24px; padding: 24px; border: 1px solid var(--linha); border-radius: 16px; background: var(--papel); }
.case-numero { margin: 0 0 8px; font: 600 13px/1.4 ${MONO}; color: var(--ambar); }
.case h3 { font-size: 23px; line-height: 1.35; text-wrap: pretty; }
.case-repo { display: inline-block; margin: 8px 0 12px; font: 14px/1.5 ${MONO}; overflow-wrap: anywhere; }
.case > p:not(.case-numero) { margin: 0 0 12px; max-width: 46em; text-wrap: pretty; }
.case > p:last-child { margin-bottom: 0; }

.linha-do-tempo { list-style: none; margin: 0; padding: 0 0 0 28px; position: relative; }
.linha-do-tempo::before {
  content: ""; position: absolute; left: 8px; top: 8px; bottom: 8px; width: 2px; background: var(--linha);
}
.linha-do-tempo > li { position: relative; margin: 0 0 26px; }
.linha-do-tempo > li::before {
  content: ""; position: absolute; left: -26px; top: 7px; width: 14px; height: 14px; border-radius: 50%;
  background: var(--amarelo); box-shadow: 0 0 0 4px var(--amarelo-palido);
}
.linha-do-tempo h4 { margin: 0; font-size: 19px; line-height: 1.35; }
.linha-do-tempo p { margin: 4px 0 0; max-width: 46em; }
.linha-do-tempo ul { margin: 8px 0 0; padding-left: 1.2em; max-width: 46em; }
.linha-do-tempo ul li { margin: 0 0 4px; }
.linha-do-tempo ul li::marker { color: var(--ambar); }
.grupo-tempo { font-size: 14px; font-weight: 700; color: var(--tinta2); text-transform: uppercase; letter-spacing: 0.06em; margin: 8px 0 16px; }
.grupo-tempo ~ .grupo-tempo { margin-top: 12px; }
.falados { margin: 0; }
.quando { font: 600 13px/1.4 ${MONO}; color: var(--ambar); letter-spacing: 0.02em; }
.onde { color: var(--tinta2); }

.categoria { margin: 28px 0 12px; }
.categoria:first-of-type { margin-top: 0; }
.cards {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px;
}
.cards a { display: block; border-radius: 16px; transition: transform 0.15s ease; }
.cards a:hover { transform: translateY(-2px); }
.cards img { width: 100%; }

.numeros { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.numeros figure { margin: 0; }
.numeros figcaption, .contribuicoes figcaption { font-weight: 700; margin-bottom: 8px; }
.numeros figcaption small, .contribuicoes figcaption small { display: block; font-weight: 400; font-size: 14px; color: var(--tinta2); }
.contribuicoes { margin: 20px 0 0; }

.grupo { font-size: 14px; color: var(--tinta2); margin: 20px 0 8px; font-weight: 700; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
.badges img { display: inline-block; }

footer { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--linha); font-size: 14px; color: var(--tinta3); }

@media (max-width: 640px) {
  body { font-size: 16px; }
  .resumo { font-size: 18px; }
  .case { padding: 18px; }
  .case h3 { font-size: 21px; }
  .numeros { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .cards a { transition: none; } }
</style>
</head>
<body>
<main>
<nav class="idiomas" aria-label="${esc(p.idiomas)}">${idiomas}</nav>

<header>
<h1>${svg(`banner${alvo}`, `${s.nome} · ${s.papel}`, ' width="880" height="216"')}</h1>
<p class="resumo">${esc(h.resumo)}</p>
<div class="acoes">
${acoes}
</div>
<div class="interesses">${svg(`interesses${alvo}`, s.interesses.map((i) => i.rotulo).join(" · "), ' width="880" height="124"')}</div>
</header>

${blocoHistoria}

${blocoCases}

${blocoTrajetoria}

<section aria-labelledby="projetos">
<h2 id="projetos">${svg(`faixa-projetos${alvo}`, s.faixas.projetos)}</h2>
${categorias}
</section>

<section aria-labelledby="numeros">
<h2 id="numeros">${svg(`faixa-numeros${alvo}`, s.faixas.numeros)}</h2>
<div class="numeros">
<figure><figcaption>${esc(s.subLinguagens)}<small>${esc(subEscopo)}</small></figcaption>${svg("linguagens", s.subLinguagens, ' width="430" height="238" loading="lazy"')}</figure>
<figure><figcaption>${esc(s.subSequencia)}<small>${esc(s.ultimoAno)}</small></figcaption>${svg(`sequencia${alvo}`, s.subSequencia, ' width="430" height="236" loading="lazy"')}</figure>
</div>
<figure class="contribuicoes">${svg(`contribuicoes${alvo}`, `${d.stats.total} ${s.contribuicoes}`, ' width="880" height="224" loading="lazy"')}</figure>
</section>

<section aria-labelledby="ferramentas">
<h2 id="ferramentas">${svg(`faixa-ferramentas${alvo}`, s.faixas.ferramentas)}</h2>
${ferramentas}
</section>

<section aria-labelledby="contato">
<h2 id="contato">${svg(`faixa-contato${alvo}`, s.faixas.contato)}</h2>
<div class="acoes">
${acoes}
</div>
</section>

<footer>${esc(p.rodape)} ${esc(s.geradoEm)} ${ctx.data}.</footer>
</main>
</body>
</html>
`;
}
