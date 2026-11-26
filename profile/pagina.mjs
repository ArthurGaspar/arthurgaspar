/**
 * A página central, publicada no GitHub Pages.
 *
 * Existe porque o README é vitrine, não história: quem recruta não abre dezoito
 * repositórios para entender quem eu sou. Aqui a prosa é HTML de verdade (dá
 * para ler no celular, selecionar, achar no buscador).
 *
 * O conceito é "um dia de sol": rolar a página é o sol atravessando o céu.
 * Começa alto, à direita, e se põe dourado na seção de contato; o céu esquenta
 * junto e cada seção leva um horário. O sol, as nuvens e as partículas de luz
 * são uma cena Three.js atrás do conteúdo; os cards, gráficos e mapas são HTML,
 * não os SVGs do README, para poderem se mexer.
 *
 * Só tema claro, de propósito: a estética é luz. Tudo que se mexe respeita
 * prefers-reduced-motion, e a página inteira funciona sem JavaScript (as
 * animações de entrada só são armadas quando o JS marca <html class="js">).
 *
 * Atenção ao script embutido: o verificar.mjs reprova a página que contiver
 * certas palavras que denunciam dado faltando (ver a lista lá). Por isso o JS
 * daqui evita essas palavras até em nome de variável e em comparação de tipo.
 * E nada de template literal nem cifrão-chave no JS do navegador: isto aqui já
 * é um template literal do Node.
 */
import { C, FONTE, MONO, esc } from "./theme.mjs";
import { ICONES } from "./icons.mjs";

/** URL da badge do shields.io. O README usa; a página desenha as suas em HTML. */
export function urlBadge(b) {
  const rotulo = encodeURIComponent(b.nome).replace(/-/g, "--").replace(/_/g, "__");
  const logo = b.logo ? `&logo=${encodeURIComponent(b.logo)}&logoColor=${b.logoCor ?? "white"}` : "";
  return `https://img.shields.io/badge/${rotulo}-${b.cor}?style=flat-square${logo}`;
}

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

/** Campo em branco no historia.json some da página em vez de virar buraco. */
const vazio = (v) => v === undefined || v === null || v === "";

/** Prosa do historia.json: escapa e transforma o *destaque* em itálico. */
const prosa = (t) => esc(t).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

/** Cor do shields ("3178C6", "blue") para CSS. */
const corCss = (c) => (/^[0-9a-f]{3,8}$/i.test(c ?? "") ? `#${c}` : c || C.azul);

/** Os horários do "dia" que a página atravessa, na ordem das seções. */
const HORAS = ["06:00", "08:30", "11:00", "13:30", "16:00", "17:30", "19:00"];

/** Mapa de contribuições: semanas em colunas, como no GitHub. */
function mapaContribuicoes(dias, s, loc) {
  const ultimos = dias.slice(-371);
  if (!ultimos.length) return "";
  const naoZero = ultimos.map((d) => d.count).filter((n) => n > 0).sort((a, b) => a - b);
  const quartil = (q) => naoZero[Math.min(naoZero.length - 1, Math.floor(q * naoZero.length))] ?? 1;
  const cortes = [quartil(0.25), quartil(0.5), quartil(0.75)];
  const nivel = (n) => (n <= 0 ? 0 : n <= cortes[0] ? 1 : n <= cortes[1] ? 2 : n <= cortes[2] ? 3 : 4);

  const primeiro = new Date(ultimos[0].date + "T00:00:00Z").getUTCDay();
  const celulas = [];
  for (let i = 0; i < primeiro; i++) celulas.push(`<i class="c fora" aria-hidden="true"></i>`);
  const fmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "UTC" });
  const meses = [];
  ultimos.forEach((d, i) => {
    const pos = i + primeiro;
    const semana = Math.floor(pos / 7);
    const dia = pos % 7;
    const data = new Date(d.date + "T00:00:00Z");
    if (data.getUTCDate() <= 7 && dia === 0) meses.push({ semana, mes: s.meses[data.getUTCMonth()] });
    celulas.push(
      `<i class="c" data-n="${nivel(d.count)}" style="--d:${semana + dia}" title="${esc(`${d.count} · ${fmt.format(data)}`)}"></i>`,
    );
  });
  const semanas = Math.ceil(celulas.length / 7);
  const rotulos = meses
    .filter((m, i, a) => i === 0 || m.semana - a[i - 1].semana >= 3)
    .map((m) => `<span style="grid-column:${m.semana + 1}">${esc(m.mes)}</span>`)
    .join("");
  return `<div class="mapa-rolagem"><div class="mapa" style="--semanas:${semanas}">
<div class="mapa-meses" aria-hidden="true">${rotulos}</div>
<div class="mapa-dias" aria-hidden="true"><span></span><span>${esc(s.dias[1])}</span><span></span><span>${esc(s.dias[3])}</span><span></span><span>${esc(s.dias[5])}</span><span></span></div>
<div class="mapa-celulas" role="img" aria-label="${esc(s.contribuicoes)}">${celulas.join("")}</div>
</div></div>
<p class="mapa-legenda" aria-hidden="true">${esc(s.menos)} <i class="c" data-n="0"></i><i class="c" data-n="1"></i><i class="c" data-n="2"></i><i class="c" data-n="3"></i><i class="c" data-n="4"></i> ${esc(s.mais)}</p>`;
}

/**
 * Monta um index.html.
 *
 *   ctx.raiz    "" na versão inglesa (raiz do site) e "../" nas outras
 *   ctx.caminho { loc: "pt-BR/" ... } para o seletor de idioma
 *   ctx.idiomas { loc: "Português" ... }
 *   ctx.data    dia da geração, para o rodapé
 */
export function montarPagina({ loc, s, h, contato, d, tools, url, ctx }) {
  const p = s.pagina;
  const nf = new Intl.NumberFormat(loc);

  const idiomas = Object.entries(ctx.idiomas)
    .map(([l, nome]) => {
      const atual = l === loc;
      return `<a href="${ctx.raiz}${ctx.caminho[l]}" hreflang="${l}" lang="${l}"${atual ? ' aria-current="page"' : ""}>${esc(nome)}</a>`;
    })
    .join("");

  // Na barra fixa não cabe "Português": vão as siglas, com o nome no title.
  const idiomasCurtos = Object.entries(ctx.idiomas)
    .map(([l, nome]) => `<a href="${ctx.raiz}${ctx.caminho[l]}" hreflang="${l}" lang="${l}" title="${esc(nome)}"${l === loc ? ' aria-current="page"' : ""}>${l.slice(0, 2).toUpperCase()}</a>`)
    .join("");

  const acoes = (classe = "") =>
    [
      contato.linkedin && `<a class="botao cheio ${classe}" href="${esc(contato.linkedin)}">LinkedIn</a>`,
      contato.github && `<a class="botao ${classe}" href="${esc(contato.github)}">GitHub</a>`,
      contato.email && `<a class="botao ${classe}" href="mailto:${esc(contato.email)}">${esc(p.email)}</a>`,
      contato.cv && `<a class="botao ${classe}" href="${esc(contato.cv)}">${esc(p.curriculo)}</a>`,
      contato.orcid && `<a class="botao ${classe}" href="${esc(contato.orcid)}">ORCID</a>`,
      contato.lattes && `<a class="botao ${classe}" href="${esc(contato.lattes)}">Lattes</a>`,
    ]
      .filter(Boolean)
      .join("\n");

  const historia = (h.historia ?? []).filter((x) => !vazio(x));
  const experiencia = (h.experiencia ?? []).filter((t) => !vazio(t.titulo));
  const formacao = (h.formacao ?? []).filter((t) => !vazio(t.titulo));
  const falados = (h.idiomas ?? []).filter((x) => !vazio(x));
  const cases = h.cases ?? [];

  /* As seções que existem, na ordem; cada uma leva o seu horário do dia. */
  const secoes = [
    historia.length && { id: "historia", titulo: p.historia },
    cases.length && { id: "cases", titulo: p.cases },
    (experiencia.length || formacao.length) && { id: "trajetoria", titulo: p.trajetoria },
    { id: "projetos", titulo: s.faixas.projetos },
    { id: "numeros", titulo: s.faixas.numeros },
    { id: "ferramentas", titulo: s.faixas.ferramentas },
    { id: "contato", titulo: s.faixas.contato },
  ].filter(Boolean);
  secoes.forEach((sec, i) => (sec.hora = HORAS[Math.min(i, HORAS.length - 1)]));
  const sec = Object.fromEntries(secoes.map((x) => [x.id, x]));

  const cabecalho = (id) => `<header class="sec-cab" data-revela>
<span class="hora" aria-hidden="true"><i></i>${sec[id].hora}</span>
<h2 id="t-${id}"><span class="mascara"><span>${esc(sec[id].titulo)}</span></span></h2>
</header>`;

  /* -------------------------------------------------------------- hero */
  const nome = s.nome
    .split(" ")
    .map((palavra, w, todas) => {
      const antes = todas.slice(0, w).join("").length + w;
      return `<span class="palavra">${[...palavra].map((ch, i) => `<span class="l" style="--i:${antes + i}">${esc(ch)}</span>`).join("")}</span>`;
    })
    .join(" ");

  const interesses = s.interesses
    .map(
      (it, i) => `<li style="--i:${i}"><svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">${ICONES[it.icone]?.() ?? ""}</svg>${esc(it.rotulo)}</li>`,
    )
    .join("");

  /* ------------------------------------------------------------ história */
  const blocoHistoria = historia.length
    ? `<section id="historia" aria-labelledby="t-historia">
${cabecalho("historia")}
<div class="painel prosa">
${historia.map((x, i) => `<p data-revela style="--atraso:${i * 60}ms">${prosa(x)}</p>`).join("\n")}
</div>
</section>`
    : "";

  /* --------------------------------------------------------------- cases */
  const blocoCases = cases.length
    ? `<section id="cases" aria-labelledby="t-cases">
${cabecalho("cases")}
<div class="pilha">
${cases
  .map(
    (c, i) => `<article class="case" style="--i:${i}" aria-labelledby="case-${esc(c.repo)}">
<div class="case-topo">
<p class="case-numero">${esc(p.case)} ${String(i + 1).padStart(2, "0")}<span>/ ${String(cases.length).padStart(2, "0")}</span></p>
<a class="case-repo" href="https://github.com/ArthurGaspar/${esc(c.repo)}">${esc(c.repo)} <span aria-hidden="true">→</span></a>
</div>
<div class="case-cabeca${c.capa ? "" : " sem-capa"}">
<h3 id="case-${esc(c.repo)}">${prosa(c.titulo)}</h3>
${c.capa ? `<a class="case-capa" href="https://github.com/ArthurGaspar/${esc(c.repo)}" tabindex="-1" aria-hidden="true"><img src="${ctx.raiz}capas/${esc(c.capa)}" alt="" width="960" height="540" loading="lazy" decoding="async"></a>` : ""}
</div>
<div class="case-colunas">
${["problema", "abordagem", "resultado"]
  .map((chave, k) => `<div class="case-bloco b${k}"><h4>${esc(p[chave])}</h4><p>${prosa(c[chave])}</p></div>`)
  .join("\n")}
</div>
</article>`,
  )
  .join("\n")}
</div>
</section>`
    : "";

  /* ---------------------------------------------------------- trajetória */
  const linha = (itens) => `<ol class="linha-do-tempo">
<li class="trilho" aria-hidden="true"><span></span></li>
${itens
  .map(
    (t) => `<li class="marco" data-revela>
${vazio(t.quando) ? "" : `<span class="quando">${esc(t.quando)}</span>`}
<h4>${esc(t.titulo)}</h4>
${vazio(t.onde) ? "" : `<p class="onde">${esc(t.onde)}</p>`}
${vazio(t.texto) ? "" : `<p>${prosa(t.texto)}</p>`}
${(t.pontos ?? []).length ? `<ul>${t.pontos.map((x) => `<li>${prosa(x)}</li>`).join("")}</ul>` : ""}
</li>`,
  )
  .join("\n")}
</ol>`;

  const blocoTrajetoria = sec.trajetoria
    ? `<section id="trajetoria" aria-labelledby="t-trajetoria">
${cabecalho("trajetoria")}
<div class="painel">
${experiencia.length ? `<h3 class="grupo-tempo">${esc(p.experiencia)}</h3>\n${linha(experiencia)}` : ""}
${formacao.length ? `<h3 class="grupo-tempo">${esc(p.formacao)}</h3>\n${linha(formacao)}` : ""}
${falados.length ? `<h3 class="grupo-tempo">${esc(p.falados)}</h3>\n<ul class="falados">${falados.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
</div>
</section>`
    : "";

  /* ------------------------------------------------------------ projetos */
  const cats = d.categorias.filter((c) => c.repos.length);
  let n = 0;
  // Todo card tem faixa de capa, para a linha não sair torta: a captura do
  // projeto, ou o ícone dele, ou só a luz na cor da linguagem.
  const capa = (r) =>
    r.capa
      ? `<span class="capa"><img src="${ctx.raiz}capas/${esc(r.capa)}" alt="" width="960" height="540" loading="lazy" decoding="async"></span>`
      : `<span class="capa vazia" aria-hidden="true">${r.icone ? `<img src="${ctx.raiz}capas/${esc(r.icone)}" alt="" width="64" height="64">` : "<b>✦</b>"}</span>`;

  const card = (r, chave) => {
    const desc = r.descricaoLocal || r.descricao || "";
    const cor = r.corLinguagem || C.azul;
    return `<li class="projeto" data-cat="${esc(chave)}" data-repo="${esc(r.nome)}" style="view-transition-name:p${n++}">
<a class="cartao" href="${esc(r.url)}" style="--c:${esc(cor)}">
${capa(r)}
<span class="brilho" aria-hidden="true"></span>
<span class="cartao-topo">${r.linguagem ? `<span class="lang"><i></i>${esc(r.linguagem)}</span>` : "<span></span>"}${r.estrelas ? `<span class="estrelas" aria-label="${r.estrelas} ${esc(p.estrelas)}">★ ${nf.format(r.estrelas)}</span>` : ""}</span>
<h4>${esc(r.nome)}</h4>
${desc ? `<p>${esc(desc)}</p>` : ""}
<span class="seta" aria-hidden="true">→</span>
</a>
</li>`;
  };

  const ecossistema = (c) => {
    const eco = c.ecossistema;
    const e = s.ecossistema;
    const grupos = eco.grupos
      .map(
        (g) => `<h5>${esc(e.grupos[g.chave] ?? g.chave)} <span>${g.repos.length}</span></h5>
<ul class="chips">${g.repos.map((r) => `<li><a href="${esc(r.url)}"${r.porta ? ' class="porta"' : ""}>${r.porta ? '<b aria-hidden="true">✦</b>' : ""}${esc(r.cursoLocal || r.nome)}</a></li>`).join("")}</ul>`,
      )
      .join("\n");
    return `<li class="projeto largo" data-cat="${esc(c.chave)}" style="view-transition-name:p${n++}">
<details class="cartao eco">
<summary><span class="eco-num">${eco.total}</span><span class="eco-txt"><b>${esc(e.resumo.replace("{n}", eco.total))}</b><small>${esc(e.abrir)}</small></span></summary>
<p class="sobre-eco">${esc(e.sobre)} <b>✦</b> = ${esc(e.porta)}.</p>
${grupos}
</details>
</li>`;
  };

  const abas = [`<button type="button" data-cat="todas" aria-pressed="true">${esc(p.todos)} <span>${cats.reduce((a, c) => a + (c.quantos ?? c.repos.length), 0)}</span></button>`]
    .concat(cats.map((c) => `<button type="button" data-cat="${esc(c.chave)}" aria-pressed="false">${esc(s.categorias[c.chave] ?? c.chave)} <span>${c.quantos ?? c.repos.length}</span></button>`))
    .join("");

  const grade = cats.map((c) => c.repos.map((r) => card(r, c.chave)).join("\n") + (c.ecossistema ? ecossistema(c) : "")).join("\n");

  /* ------------------------------------------------------------- números */
  const stats = d.stats ?? {};
  const escopo = d.escopo === "privado" ? s.subPrivados : s.subPublicos;
  const numero = (valor, rotulo, sub) => `<div class="stat">
<b data-conta="${valor}">${nf.format(valor)}</b>
<span>${esc(rotulo)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}
</div>`;
  const langs = (d.langs?.lista ?? []).slice(0, 8);
  const somaLangs = langs.reduce((a, l) => a + l.parte, 0) || 1;
  const barra = langs
    .map((l) => `<i style="--w:${((l.parte / somaLangs) * 100).toFixed(2)}%;--c:${esc(l.cor)}" title="${esc(l.nome)} ${l.parte}%"></i>`)
    .join("");
  const legenda = langs
    .map((l, i) => `<li style="--c:${esc(l.cor)};--i:${i}"><i></i>${esc(l.nome)}<span>${nf.format(l.parte)}%</span></li>`)
    .join("");

  /* --------------------------------------------------------- ferramentas */
  const ferramentas = tools.grupos
    .map(
      (g) => `<div class="ferr-grupo" data-revela>
<h3>${esc(s.grupos[g.chave])}</h3>
<ul>${g.badges.map((b, i) => `<li style="--c:${esc(corCss(b.cor))};--i:${i}">${esc(b.nome)}</li>`).join("")}</ul>
</div>`,
    )
    .join("\n");

  const alternativas = Object.keys(ctx.idiomas)
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${url}${ctx.caminho[l]}">`)
    .join("\n");

  const navSecoes = secoes.map((x) => `<li><a href="#${x.id}">${esc(x.titulo)}</a></li>`).join("");

  return `<!doctype html>
<!-- Gerado por profile/generate.mjs. Edite profile/historia.json e profile/strings.json, não aqui. -->
<html lang="${loc}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="${C.papel}">
<title>${esc(p.titulo)}</title>
<meta name="description" content="${esc(h.resumo)}">
<meta property="og:title" content="${esc(p.titulo)}">
<meta property="og:description" content="${esc(h.resumo)}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${url}${ctx.caminho[loc]}">
<link rel="canonical" href="${url}${ctx.caminho[loc]}">
${alternativas}
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2Q19 13 30 16Q19 19 16 30Q13 19 2 16Q13 13 16 2Z" fill="${C.amarelo}"/></svg>`)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet">
<link rel="modulepreload" href="${THREE_URL}">
<script>document.documentElement.classList.add("js")</script>
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
  --amarelo-claro: ${C.amareloClaro};
  --amarelo-palido: ${C.amareloPalido};
  --ambar: ${C.ambar};
  --sobre-azul: ${C.sobreAzul};
  /* O céu: o script do sol interpola estas três ao longo da rolagem. */
  --ceu-topo: #DCE9FF;
  --ceu-meio: #F4F8FF;
  --ceu-base: #FFFDF7;
  --progresso: 0;
  --display: "Fraunces", Georgia, "Times New Roman", serif;
  --vidro: rgba(255, 253, 247, 0.84);
  --sombra: 0 18px 50px -24px rgba(30, 83, 184, 0.28), 0 2px 6px -2px rgba(22, 32, 58, 0.06);
  --mola: cubic-bezier(0.2, 0.8, 0.2, 1);
}
* { box-sizing: border-box; }
html { background: var(--papel); scroll-padding-top: 84px; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
body {
  margin: 0; color: var(--tinta); font: 17px/1.65 ${FONTE};
  -webkit-text-size-adjust: 100%; overflow-x: hidden; background: transparent;
}
img, svg { display: block; }
a { color: var(--azul-fundo); }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 3px solid var(--amarelo); outline-offset: 3px; border-radius: 8px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- céu, sol e luz ---------- */
.ceu {
  position: fixed; inset: 0; z-index: -3;
  background: linear-gradient(180deg, var(--ceu-topo) 0%, var(--ceu-meio) 48%, var(--ceu-base) 100%);
}
#sol3d { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -2; pointer-events: none; opacity: 0; transition: opacity 1.4s ease; }
.webgl #sol3d { opacity: 1; }
.sol-css {
  position: fixed; z-index: -2; pointer-events: none;
  top: calc(12vh + var(--progresso) * 70vh); right: calc(10vw + var(--progresso) * 60vw);
  width: 150px; height: 150px; border-radius: 50%;
  background: radial-gradient(circle, #FFF3C4 0 30%, var(--amarelo) 46%, rgba(255, 201, 39, 0.35) 58%, rgba(255, 201, 39, 0) 72%);
  filter: blur(0.5px);
}
.webgl .sol-css { display: none; }
.luz {
  position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity 0.6s ease;
  background: radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 216, 102, 0.22), rgba(255, 216, 102, 0) 70%);
}
.luz.on { opacity: 1; }

/* ---------- barra ---------- */
.barra {
  position: fixed; top: 12px; left: 50%; z-index: 20; width: min(1080px, calc(100% - 24px));
  display: flex; align-items: center; gap: 14px; padding: 8px 10px 8px 14px; border-radius: 999px;
  background: rgba(255, 253, 247, 0.72); backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: var(--sombra);
  transform: translate(-50%, -140%); transition: transform 0.6s var(--mola);
}
.barra.mostra, .barra:focus-within { transform: translate(-50%, 0); }
.marca { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--tinta); font: 600 15px/1 var(--display); white-space: nowrap; }
.marca i { width: 18px; height: 18px; border-radius: 50%; background: var(--amarelo); box-shadow: 0 0 0 4px var(--amarelo-palido), 0 0 18px var(--amarelo); }
.secoes { flex: 1; display: flex; gap: 2px; list-style: none; margin: 0; padding: 0; overflow-x: auto; scrollbar-width: none; }
.secoes::-webkit-scrollbar { display: none; }
.secoes a { display: block; padding: 6px 12px; border-radius: 999px; font-size: 14px; color: var(--tinta2); text-decoration: none; white-space: nowrap; transition: background 0.3s, color 0.3s; }
.secoes a:hover { background: var(--azul-palido); color: var(--azul-fundo); }
.secoes a.ativo { background: var(--amarelo-palido); color: var(--tinta); }
.idiomas { display: flex; gap: 4px; }
.idiomas a { padding: 5px 10px; border-radius: 999px; font-size: 13px; color: var(--tinta2); text-decoration: none; border: 1px solid var(--linha); background: rgba(255, 255, 255, 0.6); }
.idiomas a[aria-current] { background: var(--azul); border-color: var(--azul); color: var(--sobre-azul); }
.trilha { position: absolute; left: 22px; right: 22px; bottom: -1px; height: 2px; border-radius: 2px; background: rgba(255, 201, 39, 0.18); overflow: hidden; }
.trilha::after { content: ""; position: absolute; inset: 0; transform-origin: left; transform: scaleX(var(--progresso)); background: linear-gradient(90deg, var(--amarelo), #FF9E3D); }

/* ---------- hero ---------- */
main { position: relative; }
.hero { min-height: 100svh; display: flex; flex-direction: column; justify-content: center; padding: 96px max(20px, 6vw) 64px; position: relative; }
.hero-txt { max-width: 760px; }
.hero-idiomas { position: absolute; top: 22px; right: max(20px, 6vw); }
.lugar { margin: 0 0 18px; font: 600 13px/1.4 ${MONO}; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ambar); }
.hero h1 { margin: 0; font: 700 clamp(52px, 10vw, 128px)/0.95 var(--display); letter-spacing: -0.03em; font-variation-settings: "opsz" 144; }
.palavra { display: inline-block; white-space: nowrap; }
.l { display: inline-block; }
.js .l { animation: surge 1.1s var(--mola) both; animation-delay: calc(180ms + var(--i) * 45ms); }
@keyframes surge { from { opacity: 0; transform: translateY(0.55em) rotate(8deg); filter: blur(10px); } }
.papel {
  margin: 22px 0 0; font: 600 clamp(19px, 2.4vw, 26px)/1.35 var(--display); max-width: 30em;
  background: linear-gradient(100deg, var(--tinta) 0 42%, var(--ambar) 50%, var(--tinta) 58% 100%); background-size: 260% 100%; background-position: 100% 0;
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.js .papel { animation: aparece 1s var(--mola) 0.9s both, reflexo 2.6s ease 1.6s both; }
@keyframes reflexo { from { background-position: 100% 0; } to { background-position: 0 0; } }
@keyframes aparece { from { opacity: 0; transform: translateY(18px); } }
.resumo { margin: 22px 0 28px; font-size: clamp(17px, 1.6vw, 20px); line-height: 1.6; max-width: 40em; color: var(--tinta2); text-wrap: pretty; }
.js .resumo { animation: aparece 1s var(--mola) 1.1s both; }
.acoes { display: flex; flex-wrap: wrap; gap: 10px; }
.js .hero .acoes { animation: aparece 1s var(--mola) 1.3s both; }
.botao {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; padding: 11px 22px; border-radius: 999px;
  font-weight: 600; font-size: 15px; text-decoration: none; color: var(--azul-fundo);
  background: rgba(255, 255, 255, 0.72); border: 1.5px solid rgba(47, 111, 224, 0.35); backdrop-filter: blur(8px);
  transition: transform 0.35s var(--mola), box-shadow 0.35s, background 0.35s;
}
.botao::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-120%);
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.85) 50%, transparent 70%);
}
.botao:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(47, 111, 224, 0.6); }
.botao:hover::after { transform: translateX(120%); transition: transform 0.7s ease; }
.botao.cheio { background: var(--azul); border-color: var(--azul); color: var(--sobre-azul); }
.interesses { display: flex; flex-wrap: wrap; gap: 10px; list-style: none; padding: 0; margin: 34px 0 0; }
.interesses li {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px 8px 12px; border-radius: 999px; font-size: 15px; font-weight: 600;
  background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: 0 6px 20px -14px rgba(30, 83, 184, 0.5);
}
.js .interesses li { animation: aparece 0.9s var(--mola) both; animation-delay: calc(1.5s + var(--i) * 90ms); }
.rolar {
  position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 8px; font: 12px/1 ${MONO}; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--tinta3); text-decoration: none;
}
.rolar i { width: 22px; height: 34px; border-radius: 12px; border: 1.5px solid var(--tinta3); position: relative; }
.rolar i::after { content: ""; position: absolute; left: 50%; top: 6px; width: 4px; height: 7px; margin-left: -2px; border-radius: 2px; background: var(--ambar); animation: desce 1.8s ease-in-out infinite; }
@keyframes desce { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(12px); } }

/* ---------- seções ---------- */
.conteudo { width: min(1080px, calc(100% - 32px)); margin: 0 auto; }
.conteudo > section { padding: 72px 0 24px; }
.sec-cab { display: flex; align-items: baseline; gap: 18px; margin: 0 0 28px; }
.hora { display: inline-flex; align-items: center; gap: 8px; font: 600 13px/1 ${MONO}; color: var(--ambar); letter-spacing: 0.04em; white-space: nowrap; }
.hora i { width: 9px; height: 9px; border-radius: 50%; background: var(--amarelo); box-shadow: 0 0 0 3px var(--amarelo-palido), 0 0 12px var(--amarelo); }
.sec-cab h2 { margin: 0; font: 700 clamp(34px, 5vw, 56px)/1.05 var(--display); letter-spacing: -0.02em; }
.mascara { display: inline-block; overflow: hidden; vertical-align: bottom; padding-bottom: 0.08em; }
.mascara > span { display: inline-block; }
.js .sec-cab .mascara > span { transform: translateY(105%); transition: transform 1s var(--mola); }
.js .sec-cab .hora { opacity: 0; transform: translateX(-10px); transition: opacity 0.8s ease 0.2s, transform 0.8s var(--mola) 0.2s; }
.js .sec-cab.visivel .mascara > span { transform: none; }
.js .sec-cab.visivel .hora { opacity: 1; transform: none; }

.painel {
  background: var(--vidro); backdrop-filter: blur(18px) saturate(1.25); -webkit-backdrop-filter: blur(18px) saturate(1.25);
  border: 1px solid rgba(255, 255, 255, 0.85); border-radius: 28px; box-shadow: var(--sombra); padding: clamp(22px, 4vw, 44px);
}
.js [data-revela]:not(.sec-cab) { opacity: 0; transform: translateY(26px); transition: opacity 0.9s ease var(--atraso, 0ms), transform 0.9s var(--mola) var(--atraso, 0ms); }
.js [data-revela].visivel:not(.sec-cab) { opacity: 1; transform: none; }

/* história */
.prosa p { margin: 0 0 1.1em; max-width: 44em; font-size: 18px; text-wrap: pretty; }
.prosa p:last-child { margin-bottom: 0; }
.prosa p:first-child { font-size: clamp(18px, 1.7vw, 20px); line-height: 1.6; color: var(--tinta); }
.prosa em, .case em, .marco em, .resumo em { font-style: italic; color: var(--azul-fundo); }
.prosa p:first-child::first-letter {
  float: left; font: 700 3.3em/0.82 var(--display); margin: 0.06em 0.12em 0 0; color: var(--ambar);
  text-shadow: 0 0 24px rgba(255, 201, 39, 0.55);
}

/* cases empilhados */
.pilha { display: grid; gap: 22px; padding-bottom: 8px; }
.case {
  position: sticky; top: calc(92px + var(--i) * 16px);
  background: rgba(255, 255, 255, 0.86); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 28px; box-shadow: var(--sombra); padding: clamp(22px, 3.4vw, 38px);
  transform-origin: 50% 0; transform: scale(calc(1 - var(--emp, 0) * 0.05)); filter: saturate(calc(1 - var(--emp, 0) * 0.4));
  overflow: hidden;
}
.case::before { content: ""; position: absolute; inset: 0 0 auto; height: 4px; background: linear-gradient(90deg, var(--amarelo), var(--amarelo-claro) 40%, var(--azul)); }
.case.sem-pilha { position: relative; top: auto; transform: none; filter: none; }
.case-topo { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.case-numero { margin: 0; font: 600 13px/1.4 ${MONO}; color: var(--ambar); letter-spacing: 0.06em; text-transform: uppercase; }
.case-numero span { color: var(--tinta3); margin-left: 6px; }
.case-repo { font: 14px/1.4 ${MONO}; text-decoration: none; overflow-wrap: anywhere; }
.case-repo span { display: inline-block; transition: transform 0.3s var(--mola); }
.case-repo:hover span { transform: translateX(4px); }
.case h3 { margin: 12px 0 22px; font: 600 clamp(22px, 2.6vw, 30px)/1.25 var(--display); letter-spacing: -0.01em; text-wrap: balance; max-width: 30em; }
.case-cabeca { display: grid; grid-template-columns: 1fr minmax(220px, 34%); gap: 24px; align-items: start; }
.case-cabeca.sem-capa { grid-template-columns: 1fr; }
.case-capa { display: block; margin: 12px 0 22px; border-radius: 16px; overflow: hidden; border: 1px solid var(--linha); box-shadow: 0 18px 40px -24px rgba(30, 83, 184, 0.45); }
.case-capa img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; transition: transform 0.6s var(--mola); }
.case-capa:hover img { transform: scale(1.04); }
.case-colunas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.case-bloco { padding: 16px 18px; border-radius: 18px; background: rgba(244, 248, 255, 0.8); border: 1px solid var(--linha); }
.case-bloco.b2 { background: rgba(255, 240, 191, 0.55); border-color: rgba(255, 201, 39, 0.45); }
.case-bloco h4 { margin: 0 0 6px; font: 700 12px/1.4 ${MONO}; letter-spacing: 0.08em; text-transform: uppercase; color: var(--azul-fundo); }
.case-bloco.b2 h4 { color: var(--ambar); }
.case-bloco p { margin: 0; font-size: 15.5px; line-height: 1.6; text-wrap: pretty; }

/* trajetória */
.grupo-tempo { margin: 0 0 18px; font: 700 13px/1.4 ${MONO}; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tinta2); }
.linha-do-tempo + .grupo-tempo, .linha-do-tempo + .grupo-tempo + * { margin-top: 10px; }
.linha-do-tempo { list-style: none; margin: 0 0 30px; padding: 0 0 0 34px; position: relative; }
.trilho { position: absolute; left: 9px; top: 8px; bottom: 8px; width: 3px; border-radius: 3px; background: var(--linha); }
.trilho span {
  position: absolute; inset: 0; border-radius: 3px; transform-origin: top; transform: scaleY(var(--fill, 1));
  background: linear-gradient(180deg, var(--amarelo), #FFB14A 60%, var(--azul)); box-shadow: 0 0 14px rgba(255, 201, 39, 0.7);
}
.js .trilho span { transform: scaleY(var(--fill, 0)); }
.marco { position: relative; margin: 0 0 30px; }
.marco:last-child { margin-bottom: 0; }
.marco::before {
  content: ""; position: absolute; left: -32px; top: 6px; width: 17px; height: 17px; border-radius: 50%;
  background: var(--papel); border: 3px solid var(--linha); transition: all 0.5s var(--mola);
}
.marco.aceso::before, html:not(.js) .marco::before { background: var(--amarelo); border-color: #FFF3C4; box-shadow: 0 0 0 5px rgba(255, 201, 39, 0.25), 0 0 22px var(--amarelo); }
.quando { font: 600 13px/1.4 ${MONO}; color: var(--ambar); letter-spacing: 0.02em; }
.marco h4 { margin: 2px 0 0; font: 600 21px/1.3 var(--display); }
.marco p { margin: 4px 0 0; max-width: 46em; }
.onde { color: var(--tinta2); }
.marco ul { margin: 10px 0 0; padding-left: 1.15em; max-width: 46em; }
.marco ul li { margin: 0 0 5px; }
.marco ul li::marker { color: var(--ambar); }
.falados { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 0; padding: 0; }
.falados li { padding: 7px 14px; border-radius: 999px; background: var(--azul-palido); color: var(--azul-fundo); font-weight: 600; font-size: 15px; }

/* projetos */
.abas { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; }
.abas button {
  font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; padding: 8px 16px; border-radius: 999px;
  color: var(--tinta2); background: rgba(255, 255, 255, 0.7); border: 1px solid var(--linha); backdrop-filter: blur(8px);
  transition: all 0.35s var(--mola);
}
.abas button span { margin-left: 4px; font: 12px ${MONO}; color: var(--tinta3); }
.abas button:hover { border-color: var(--azul); color: var(--azul-fundo); }
.abas button[aria-pressed="true"] { background: var(--tinta); border-color: var(--tinta); color: var(--papel); }
.abas button[aria-pressed="true"] span { color: var(--amarelo-claro); }
.projetos-grade { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.projeto { display: flex; }
.projeto[hidden] { display: none; }
.projeto.largo { grid-column: 1 / -1; }
.cartao {
  --rx: 0deg; --ry: 0deg; position: relative; flex: 1; display: flex; flex-direction: column; overflow: hidden;
  padding: 22px 22px 20px; border-radius: 22px; text-decoration: none; color: var(--tinta);
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.95); box-shadow: var(--sombra);
  transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)); transition: transform 0.5s var(--mola), box-shadow 0.5s;
}
.cartao::before { content: ""; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--c), var(--amarelo)); opacity: 0.9; z-index: 1; }
.capa { display: block; margin: -22px -22px 18px; aspect-ratio: 16 / 9; overflow: hidden; border-bottom: 1px solid var(--linha); }
.capa img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; transition: transform 0.6s var(--mola); }
a.cartao:hover .capa img { transform: scale(1.05); }
.capa.vazia {
  display: grid; place-items: center;
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%), linear-gradient(180deg, rgba(255, 240, 191, 0.6), rgba(244, 248, 255, 0.4));
}
.capa.vazia img { width: 64px; height: 64px; object-fit: contain; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.18)); }
a.cartao:hover .capa.vazia img { transform: scale(1.1) rotate(-4deg); }
.capa.vazia b { font-size: 34px; color: var(--amarelo); text-shadow: 0 0 22px rgba(255, 201, 39, 0.8); }
a.cartao:hover { box-shadow: 0 26px 60px -26px rgba(30, 83, 184, 0.45), 0 0 0 1px rgba(255, 201, 39, 0.5); }
.brilho {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.4s;
  background: radial-gradient(260px circle at var(--gx, 50%) var(--gy, 0%), rgba(255, 216, 102, 0.38), rgba(255, 216, 102, 0) 70%);
}
a.cartao:hover .brilho { opacity: 1; }
.cartao-topo { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; color: var(--tinta2); }
.lang { display: inline-flex; align-items: center; gap: 6px; }
.lang i { width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9); }
.estrelas { font: 600 13px ${MONO}; color: var(--ambar); }
.cartao h4 { margin: 14px 0 6px; font: 600 20px/1.25 var(--display); overflow-wrap: anywhere; }
.cartao p { margin: 0 0 16px; font-size: 15px; line-height: 1.55; color: var(--tinta2); text-wrap: pretty; }
.seta { margin-top: auto; align-self: flex-end; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--azul-palido); color: var(--azul-fundo); transition: all 0.4s var(--mola); }
a.cartao:hover .seta { background: var(--amarelo); color: var(--tinta); transform: rotate(-35deg); }
.eco { cursor: default; }
.eco summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 18px; }
.eco summary::-webkit-details-marker { display: none; }
.eco-num { font: 700 56px/1 var(--display); color: var(--ambar); text-shadow: 0 0 30px rgba(255, 201, 39, 0.5); }
.eco-txt b { display: block; font: 600 20px/1.3 var(--display); }
.eco-txt small { color: var(--tinta3); font-size: 14px; }
.eco[open] .eco-txt small { display: none; }
.sobre-eco { margin: 16px 0 6px; max-width: 52em; font-size: 15px; color: var(--tinta2); }
.eco h5 { margin: 18px 0 8px; font-size: 14px; color: var(--tinta2); }
.eco h5 span { font-weight: 400; color: var(--tinta3); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; }
.chips a { display: inline-flex; gap: 4px; padding: 6px 12px; border-radius: 999px; font-size: 13.5px; text-decoration: none; color: var(--azul-fundo); background: var(--azul-palido); transition: background 0.3s; }
.chips a.porta { background: var(--amarelo-palido); color: var(--tinta); }
.chips a b { color: var(--ambar); }
.chips a:hover { background: var(--amarelo); color: var(--tinta); }
::view-transition-group(*) { animation-duration: 0.45s; animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1); }

/* números */
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 0 0 18px; }
.stat { padding: 22px; border-radius: 22px; background: var(--vidro); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: var(--sombra); }
.stat b { display: block; font: 700 clamp(36px, 4.4vw, 52px)/1 var(--display); color: var(--tinta); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.stat:first-child b { color: var(--ambar); text-shadow: 0 0 28px rgba(255, 201, 39, 0.45); }
.stat span { display: block; margin-top: 8px; font-weight: 600; font-size: 15px; }
.stat small { display: block; color: var(--tinta3); font-size: 13px; }
/* Empilhados: o mapa tem 53 semanas e não cabe em meia coluna. min-width: 0
   deixa o mapa rolar dentro do painel em vez de esticar a grade. */
.duo { display: grid; grid-template-columns: 1fr; gap: 16px; }
.duo > * { min-width: 0; }
.duo h3 { margin: 0 0 4px; font: 600 20px/1.3 var(--display); }
.duo .sub { margin: 0 0 18px; font-size: 14px; color: var(--tinta3); }
.barra-langs { display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: var(--linha); gap: 2px; }
.barra-langs i { width: var(--w); background: var(--c); }
.js .barra-langs i { width: 0; transition: width 1.2s var(--mola); }
.js .visivel .barra-langs i { width: var(--w); }
.legenda { list-style: none; margin: 18px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 28px; font-size: 14.5px; }
.legenda li { display: flex; align-items: center; gap: 8px; }
.legenda i { width: 10px; height: 10px; border-radius: 3px; background: var(--c); flex: none; }
.legenda span { margin-left: auto; font: 13px ${MONO}; color: var(--tinta2); }
.mapa-rolagem { overflow-x: auto; padding-bottom: 6px; }
.mapa { display: grid; grid-template-columns: 28px 1fr; grid-template-rows: auto 1fr; gap: 6px 6px; min-width: max-content; }
.mapa-meses { grid-column: 2; display: grid; grid-template-columns: repeat(var(--semanas), 12px); gap: 3px; font-size: 11px; color: var(--tinta3); }
.mapa-meses span { white-space: nowrap; }
.mapa-dias { grid-row: 2; display: grid; grid-template-rows: repeat(7, 12px); gap: 3px; font-size: 10.5px; color: var(--tinta3); line-height: 12px; }
.mapa-celulas { grid-row: 2; grid-column: 2; display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); grid-auto-columns: 12px; gap: 3px; }
.c { width: 12px; height: 12px; border-radius: 3px; background: #EFF1F6; display: inline-block; }
.c[data-n="1"] { background: ${C.amareloPalido}; }
.c[data-n="2"] { background: ${C.amareloClaro}; }
.c[data-n="3"] { background: ${C.amarelo}; }
.c[data-n="4"] { background: ${C.ambar}; box-shadow: 0 0 8px rgba(255, 201, 39, 0.6); }
.c.fora { visibility: hidden; }
.js .mapa-celulas .c { opacity: 0; transform: scale(0.3); transition: opacity 0.5s ease, transform 0.5s var(--mola); transition-delay: calc(var(--d, 0) * 9ms); }
.js .visivel .mapa-celulas .c { opacity: 1; transform: none; }
.mapa-legenda { display: flex; align-items: center; gap: 4px; justify-content: flex-end; margin: 10px 0 0; font-size: 12px; color: var(--tinta3); }

/* ferramentas */
.ferr { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.ferr-grupo { padding: 20px 22px; border-radius: 22px; background: var(--vidro); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: var(--sombra); }
.ferr-grupo h3 { margin: 0 0 12px; font: 700 12.5px/1.4 ${MONO}; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tinta2); }
.ferr-grupo ul { display: flex; flex-wrap: wrap; gap: 7px; list-style: none; margin: 0; padding: 0; }
.ferr-grupo li {
  display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px 6px 10px; border-radius: 999px; font-size: 14px; font-weight: 600;
  background: rgba(255, 255, 255, 0.85); border: 1px solid var(--linha); transition: transform 0.3s var(--mola), box-shadow 0.3s, border-color 0.3s;
}
.ferr-grupo li::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.ferr-grupo li:hover { transform: translateY(-2px); border-color: var(--c); box-shadow: 0 8px 18px -10px var(--c); }
.js .ferr-grupo li { opacity: 0; transform: translateY(8px) scale(0.95); transition: opacity 0.5s ease, transform 0.5s var(--mola); transition-delay: calc(var(--i) * 35ms + 150ms); }
.js .ferr-grupo.visivel li { opacity: 1; transform: none; }

/* contato: o pôr do sol */
#contato { text-align: center; padding: 120px 0 80px; }
#contato .sec-cab { justify-content: center; flex-direction: column; align-items: center; gap: 12px; }
#contato .sec-cab h2 { font-size: clamp(44px, 8vw, 96px); }
#contato .acoes { justify-content: center; }
.horizonte { height: 1px; margin: 64px auto 0; width: min(720px, 90%); background: linear-gradient(90deg, transparent, rgba(255, 158, 61, 0.7), transparent); box-shadow: 0 0 24px rgba(255, 158, 61, 0.7); }
footer { padding: 18px 16px 40px; text-align: center; font-size: 13.5px; color: var(--tinta2); text-shadow: 0 0 10px #FFF6EA, 0 0 2px #FFF6EA; }
footer a { color: var(--tinta2); }

@media (max-width: 900px) {
  .stats { grid-template-columns: 1fr 1fr; }
  .ferr { grid-template-columns: 1fr; }
  .legenda { grid-template-columns: 1fr 1fr; }
  .case-colunas { grid-template-columns: 1fr; }
  .case-cabeca { grid-template-columns: 1fr; gap: 0; }
  .case-capa { order: -1; margin: 14px 0 0; }
}
@media (max-width: 640px) {
  body { font-size: 16px; }
  .marca span { display: none; }
  .barra { gap: 8px; }
  .hero { padding-top: 84px; }
  .prosa p { font-size: 16.5px; }
  .legenda { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .js [data-revela]:not(.sec-cab), .js .sec-cab .mascara > span, .js .sec-cab .hora,
  .js .mapa-celulas .c, .js .ferr-grupo li { opacity: 1 !important; transform: none !important; }
  .js .barra-langs i { width: var(--w) !important; }
  .js .trilho span { transform: none; }
  .case { position: relative; top: auto; transform: none; filter: none; }
}
</style>
</head>
<body>
<div class="ceu" aria-hidden="true"></div>
<canvas id="sol3d" aria-hidden="true"></canvas>
<div class="sol-css" aria-hidden="true"></div>
<div class="luz" aria-hidden="true"></div>

<nav class="barra" aria-label="${esc(p.secoes)}">
<a class="marca" href="#topo"><i aria-hidden="true"></i><span>${esc(s.nome)}</span></a>
<ul class="secoes">${navSecoes}</ul>
<div class="idiomas curtos" aria-label="${esc(p.idiomas)}">${idiomasCurtos}</div>
<span class="trilha" aria-hidden="true"></span>
</nav>

<main>
<header class="hero" id="topo">
<div class="hero-idiomas idiomas" aria-label="${esc(p.idiomas)}">${idiomas}</div>
<div class="hero-txt">
<p class="lugar">${esc(s.lugar)}</p>
<h1 aria-label="${esc(s.nome)}"><span aria-hidden="true">${nome}</span></h1>
<p class="papel">${esc(s.papel)}</p>
<p class="resumo">${prosa(h.resumo)}</p>
<div class="acoes">
${acoes()}
</div>
<ul class="interesses">${interesses}</ul>
</div>
<a class="rolar" href="#${secoes[0].id}"><i aria-hidden="true"></i>${esc(p.rolar)}</a>
</header>

<div class="conteudo">
${blocoHistoria}

${blocoCases}

${blocoTrajetoria}

<section id="projetos" aria-labelledby="t-projetos">
${cabecalho("projetos")}
<div class="abas" role="group" aria-label="${esc(s.faixas.projetos)}">${abas}</div>
<ul class="projetos-grade">
${grade}
</ul>
</section>

<section id="numeros" aria-labelledby="t-numeros">
${cabecalho("numeros")}
<div class="stats" data-revela>
${numero(stats.total ?? 0, s.contribuicoes, s.ultimoAno)}
${numero(stats.atual ?? 0, s.atual, p.unidadeDias)}
${numero(stats.maior ?? 0, s.maior, p.unidadeDias)}
${numero(d.langs?.repos ?? 0, escopo, "")}
</div>
<div class="duo">
<div class="painel" data-revela>
<h3>${esc(s.subLinguagens)}</h3>
<p class="sub">${esc(escopo)}</p>
<div class="barra-langs" role="img" aria-label="${esc(langs.map((l) => `${l.nome} ${l.parte}%`).join(", "))}">${barra}</div>
<ul class="legenda">${legenda}</ul>
</div>
<div class="painel" data-revela style="--atraso:120ms">
<h3>${esc(s.subSequencia)}</h3>
<p class="sub">${nf.format(stats.total ?? 0)} ${esc(s.contribuicoes)}</p>
${mapaContribuicoes(d.dias ?? [], s, loc)}
</div>
</div>
</section>

<section id="ferramentas" aria-labelledby="t-ferramentas">
${cabecalho("ferramentas")}
<div class="ferr">
${ferramentas}
</div>
</section>

<section id="contato" aria-labelledby="t-contato">
${cabecalho("contato")}
<div class="acoes" data-revela>
${acoes()}
</div>
<div class="horizonte" aria-hidden="true"></div>
</section>
</div>
</main>

<footer>${esc(p.rodape)} ${esc(s.geradoEm)} ${ctx.data}. · <a href="#topo">${esc(p.voltar)} ↑</a></footer>

<script>
(function () {
  var raiz = document.documentElement;
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fino = window.matchMedia("(pointer: fine)").matches;
  var idioma = raiz.lang;

  /* Contadores: sobem de zero quando o bloco aparece. */
  function contar(el) {
    if (reduz) return;
    el.querySelectorAll("[data-conta]").forEach(function (n) {
      var alvo = Number(n.getAttribute("data-conta")) || 0;
      var t0 = performance.now();
      function passo(t) {
        var k = Math.min(1, (t - t0) / 1500);
        var e = 1 - Math.pow(1 - k, 3);
        n.textContent = Math.round(alvo * e).toLocaleString(idioma);
        if (k < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    });
  }

  /* Entradas: cada [data-revela] ganha .visivel ao entrar na tela. */
  var revelaveis = document.querySelectorAll("[data-revela]");
  if (reduz || !("IntersectionObserver" in window)) {
    revelaveis.forEach(function (el) { el.classList.add("visivel"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        contar(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revelaveis.forEach(function (el) { io.observe(el); });
  }

  /* Barra: aparece depois do hero; marca a seção em que se está. */
  var barra = document.querySelector(".barra");
  var hero = document.querySelector(".hero");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      barra.classList.toggle("mostra", !es[0].isIntersecting);
    }, { threshold: 0.15 }).observe(hero);
    var links = {};
    barra.querySelectorAll(".secoes a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var ioSecao = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) {
          var ativo = k === e.target.id;
          links[k].classList.toggle("ativo", ativo);
          if (ativo) links[k].scrollIntoView({ block: "nearest", inline: "center" });
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll(".conteudo > section[id]").forEach(function (s) { ioSecao.observe(s); });
  } else {
    barra.classList.add("mostra");
  }

  /* Rolagem: trilha do sol, linha do tempo acendendo, cases empilhando. */
  var linhas = Array.prototype.slice.call(document.querySelectorAll(".linha-do-tempo"));
  var casos = Array.prototype.slice.call(document.querySelectorAll(".case"));
  var pendente = false;
  function medirPilha() {
    casos.forEach(function (c) {
      c.classList.toggle("sem-pilha", reduz || window.innerWidth < 760 || c.offsetHeight > window.innerHeight - 150);
    });
  }
  function atualizar() {
    pendente = false;
    var vh = window.innerHeight;
    var max = raiz.scrollHeight - vh;
    raiz.style.setProperty("--progresso", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : "0");
    linhas.forEach(function (l) {
      var r = l.getBoundingClientRect();
      var f = Math.max(0, Math.min(1, (vh * 0.62 - r.top) / Math.max(1, r.height)));
      l.style.setProperty("--fill", f.toFixed(4));
      l.querySelectorAll(".marco").forEach(function (m) {
        m.classList.toggle("aceso", m.getBoundingClientRect().top < vh * 0.62);
      });
    });
    casos.forEach(function (c, i) {
      var prox = casos[i + 1];
      if (!prox || c.classList.contains("sem-pilha")) { c.style.setProperty("--emp", "0"); return; }
      var rc = c.getBoundingClientRect();
      var rp = prox.getBoundingClientRect();
      var k = Math.max(0, Math.min(1, (rc.bottom - rp.top) / Math.max(1, rc.height)));
      c.style.setProperty("--emp", k.toFixed(3));
    });
  }
  function aoRolar() { if (!pendente) { pendente = true; requestAnimationFrame(atualizar); } }
  window.addEventListener("scroll", aoRolar, { passive: true });
  window.addEventListener("resize", function () { medirPilha(); aoRolar(); });
  medirPilha();
  atualizar();

  /* Cards: inclinam e refletem a luz onde o cursor está. */
  if (fino && !reduz) {
    document.querySelectorAll("a.cartao").forEach(function (c) {
      c.addEventListener("pointermove", function (ev) {
        var r = c.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width;
        var y = (ev.clientY - r.top) / r.height;
        c.style.setProperty("--ry", ((x - 0.5) * 10).toFixed(2) + "deg");
        c.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
        c.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        c.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      });
      c.addEventListener("pointerleave", function () {
        c.style.setProperty("--rx", "0deg");
        c.style.setProperty("--ry", "0deg");
      });
    });
    var luz = document.querySelector(".luz");
    window.addEventListener("pointermove", function (e) {
      raiz.style.setProperty("--mx", e.clientX + "px");
      raiz.style.setProperty("--my", e.clientY + "px");
      luz.classList.add("on");
    }, { passive: true });
  }

  /* Filtro de categorias, com transição de layout quando o navegador tem. */
  var abas = document.querySelectorAll(".abas button");
  var grade = document.querySelector(".projetos-grade");
  abas.forEach(function (b) {
    b.addEventListener("click", function () {
      var cat = b.getAttribute("data-cat");
      function aplicar() {
        abas.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        grade.querySelectorAll(".projeto").forEach(function (p) {
          p.hidden = !(cat === "todas" || p.getAttribute("data-cat") === cat);
        });
      }
      if (document.startViewTransition && !reduz) document.startViewTransition(aplicar);
      else aplicar();
    });
  });
})();
</script>

<script type="module">
/*
 * O céu em Three.js: um sol com shader (núcleo, halo e raios), nuvens low-poly
 * iluminadas por ele e poeira de luz subindo. A rolagem leva o sol do alto à
 * direita até o horizonte e esquenta as cores; o mouse dá parallax.
 * Se qualquer coisa falhar, a página fica com o sol em CSS (.sol-css).
 */
import * as THREE from "${THREE_URL}";

const raiz = document.documentElement;
const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("sol3d");

function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 30);

  const ceuLuz = new THREE.HemisphereLight(0xFFFFFF, 0xDCE6F5, 2.1);
  cena.add(ceuLuz);
  const luzSol = new THREE.DirectionalLight(0xFFF1D0, 1.1);
  cena.add(luzSol);

  /* ---- sol ---- */
  const sol = new THREE.Group();
  cena.add(sol);
  const uni = {
    t: { value: 0 },
    c1: { value: new THREE.Color("#FFE58A") },
    c2: { value: new THREE.Color("#FFC927") },
    halo: { value: new THREE.Color("#FFD866") },
  };
  const nucleo = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: uni,
      vertexShader: [
        "varying vec3 vN; varying vec3 vV; varying vec3 vP;",
        "void main() {",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;",
        "  gl_Position = projectionMatrix * mv;",
        "}",
      ].join("\\n"),
      fragmentShader: [
        "uniform float t; uniform vec3 c1; uniform vec3 c2;",
        "varying vec3 vN; varying vec3 vV; varying vec3 vP;",
        "void main() {",
        "  float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);",
        "  float g = sin(vP.x * 4.0 + t * 0.7) * sin(vP.y * 5.0 - t * 0.9) * sin(vP.z * 4.5 + t * 0.5);",
        "  vec3 cor = mix(c1, c2, clamp(f * 0.9 + g * 0.05 + 0.1, 0.0, 1.0));",
        "  gl_FragColor = vec4(cor + vec3(0.18, 0.12, 0.0) * (1.0 - f), 1.0);",
        "}",
      ].join("\\n"),
    }),
  );
  sol.add(nucleo);

  function plano(tamanho, frag, forca) {
    const m = new THREE.ShaderMaterial({
      uniforms: { t: uni.t, cor: uni.halo, forca: { value: forca } },
      transparent: true, depthWrite: false,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: frag,
    });
    const malha = new THREE.Mesh(new THREE.PlaneGeometry(tamanho, tamanho), m);
    malha.position.z = -0.5;
    sol.add(malha);
    return malha;
  }
  plano(26, [
    "uniform float t; uniform vec3 cor; uniform float forca; varying vec2 vUv;",
    "void main() {",
    "  float r = length(vUv - 0.5) * 2.0;",
    "  float a = pow(max(1.0 - r, 0.0), 2.6) * forca * (0.93 + 0.07 * sin(t * 1.6));",
    "  gl_FragColor = vec4(cor, a);",
    "}",
  ].join("\\n"), 0.95);
  const raios = plano(46, [
    "uniform float t; uniform vec3 cor; uniform float forca; varying vec2 vUv;",
    "void main() {",
    "  vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float ang = atan(p.y, p.x);",
    "  float a1 = pow(abs(sin(ang * 6.0 + t * 0.05)), 22.0);",
    "  float a2 = 0.7 * pow(abs(sin(ang * 9.0 - t * 0.07 + 1.3)), 30.0);",
    "  float a = (a1 + a2) * pow(max(1.0 - r, 0.0), 1.7) * smoothstep(0.1, 0.24, r) * forca;",
    "  gl_FragColor = vec4(cor, a);",
    "}",
  ].join("\\n"), 0.26);

  /* ---- nuvens ---- */
  const estreito = window.innerWidth < 700;
  const geoNuvem = new THREE.IcosahedronGeometry(1, 3);
  const matNuvem = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF, roughness: 1, metalness: 0,
    emissive: new THREE.Color("#F2F6FF"), emissiveIntensity: 0.45, transparent: true, opacity: 0.88,
  });
  const nuvens = [];
  const qtdNuvens = estreito ? 5 : 8;
  for (let i = 0; i < qtdNuvens; i++) {
    const g = new THREE.Group();
    const partes = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < partes; k++) {
      const s = 1 + Math.random() * 1.5;
      const m = new THREE.Mesh(geoNuvem, matNuvem);
      m.position.set((k - partes / 2) * 1.35 + Math.random() * 0.5, Math.random() * 0.7 - (Math.abs(k - partes / 2) * 0.18), Math.random() * 0.8);
      m.scale.set(s, s * 0.72, s);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.add(m);
    }
    // Longe, e fora da faixa onde fica o texto do hero (lado esquerdo, meio).
    const z = -12 - Math.random() * 22;
    const x = -40 + Math.random() * 80;
    let y = -14 + Math.random() * 30;
    if (x < 4 && y > -8 && y < 8) y = y < 0 ? y - 10 : y + 10;
    g.position.set(x, y, z);
    const escala = 0.55 + Math.random() * 0.6;
    g.scale.setScalar(escala);
    g.userData = { vel: 0.12 + Math.random() * 0.35, baseY: g.position.y, fase: Math.random() * 6.28 };
    cena.add(g);
    nuvens.push(g);
  }

  /* ---- poeira de luz ---- */
  const qtd = estreito ? 220 : 520;
  const pos = new Float32Array(qtd * 3);
  const fase = new Float32Array(qtd);
  for (let i = 0; i < qtd; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 2] = -Math.random() * 24 + 4;
    fase[i] = Math.random();
  }
  const geoPo = new THREE.BufferGeometry();
  geoPo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geoPo.setAttribute("fase", new THREE.BufferAttribute(fase, 1));
  const po = new THREE.Points(geoPo, new THREE.ShaderMaterial({
    uniforms: { t: uni.t, px: { value: renderer.getPixelRatio() }, cor: { value: new THREE.Color("#F5B700") } },
    transparent: true, depthWrite: false,
    vertexShader: [
      "uniform float t; uniform float px; attribute float fase; varying float vA;",
      "void main() {",
      "  vec3 p = position;",
      "  p.y = mod(p.y + t * (0.25 + 0.45 * fase) + 17.0, 34.0) - 17.0;",
      "  p.x += sin(t * 0.3 + fase * 6.2831) * 0.7;",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * 1.8 + fase * 40.0));",
      "  gl_PointSize = (1.6 + 3.2 * fase) * px * (26.0 / -mv.z);",
      "  gl_Position = projectionMatrix * mv;",
      "}",
    ].join("\\n"),
    fragmentShader: [
      "uniform vec3 cor; varying float vA;",
      "void main() {",
      "  float d = length(gl_PointCoord - 0.5);",
      "  float a = smoothstep(0.5, 0.0, d) * vA * 0.8;",
      "  gl_FragColor = vec4(cor, a);",
      "}",
    ].join("\\n"),
  }));
  cena.add(po);

  /* ---- rolagem e cores do dia ---- */
  const meioDia = { c1: new THREE.Color("#FFE58A"), c2: new THREE.Color("#FFC927"), halo: new THREE.Color("#FFD866") };
  const tarde = { c1: new THREE.Color("#FFCF7A"), c2: new THREE.Color("#FF8F2E"), halo: new THREE.Color("#FFB45E") };
  const ceuA = ["#DCE9FF", "#F4F8FF", "#FFFDF7"].map((c) => new THREE.Color(c));
  const ceuB = ["#FFE3C2", "#FFF2E2", "#FFF9F1"].map((c) => new THREE.Color(c));
  const tmp = new THREE.Color();
  let progresso = 0;
  let ultimoCeu = -1;
  const mouse = { x: 0, y: 0, ax: 0, ay: 0 };

  function lerRolagem() {
    const max = raiz.scrollHeight - innerHeight;
    progresso = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }
  function aplicarDia() {
    const p = progresso;
    const k = p * p * (3 - 2 * p);
    const largo = camera.aspect > 1;
    // Desce pela direita durante quase toda a página e só no fim cruza para o
    // centro, para se pôr atrás do "fale comigo": no meio, o sol no centro
    // ficaria atrás dos cards e das abas.
    // No celular o texto ocupa a largura toda: o sol fica no canto, espiando.
    const x0 = largo ? 9.5 : 6.2, y0 = largo ? 5.2 : 15.5;
    const x1 = 0, y1 = -15.5;
    const kx = Math.pow(k, 3.2);
    sol.position.set(x0 + (x1 - x0) * kx, y0 + (y1 - y0) * k, -2);
    sol.scale.setScalar((largo ? 1 : 0.7) * (1 + k * 0.35));
    uni.c1.value.copy(meioDia.c1).lerp(tarde.c1, k);
    uni.c2.value.copy(meioDia.c2).lerp(tarde.c2, k);
    uni.halo.value.copy(meioDia.halo).lerp(tarde.halo, k);
    luzSol.position.copy(sol.position).add(new THREE.Vector3(0, 0, 12));
    luzSol.color.copy(meioDia.halo).lerp(tarde.c2, k * 0.8);
    if (Math.abs(k - ultimoCeu) > 0.002) {
      ultimoCeu = k;
      ["--ceu-topo", "--ceu-meio", "--ceu-base"].forEach((v, i) => {
        raiz.style.setProperty(v, "#" + tmp.copy(ceuA[i]).lerp(ceuB[i], k).getHexString());
      });
    }
  }

  function redimensionar() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 60 : 45;
    camera.updateProjectionMatrix();
  }

  const relogio = new THREE.Clock();
  let rodando = false;
  function quadro() {
    const dt = Math.min(relogio.getDelta(), 0.05);
    if (!reduz) uni.t.value += dt;
    const t = uni.t.value;
    raios.rotation.z = t * 0.02;
    nuvens.forEach((g) => {
      if (!reduz) g.position.x += g.userData.vel * dt;
      if (g.position.x > 42) g.position.x = -42;
      g.position.y = g.userData.baseY + Math.sin(t * 0.25 + g.userData.fase) * 0.35;
    });
    mouse.ax += (mouse.x - mouse.ax) * 0.04;
    mouse.ay += (mouse.y - mouse.ay) * 0.04;
    camera.position.x = mouse.ax * 1.4;
    camera.position.y = mouse.ay * 0.9 - progresso * 1.5;
    camera.lookAt(0, -progresso * 1.5, 0);
    aplicarDia();
    renderer.render(cena, camera);
  }
  function laco() {
    if (!rodando) return;
    quadro();
    requestAnimationFrame(laco);
  }
  function ligar() {
    if (rodando || reduz || document.hidden) return;
    rodando = true;
    relogio.getDelta();
    requestAnimationFrame(laco);
  }

  addEventListener("resize", () => { redimensionar(); if (reduz) quadro(); });
  addEventListener("scroll", () => { lerRolagem(); if (reduz) quadro(); }, { passive: true });
  addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = -(e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) rodando = false; else ligar(); });

  redimensionar();
  lerRolagem();
  quadro();
  raiz.classList.add("webgl");
  ligar();
}

try { iniciar(); } catch (erro) { console.warn("sol 3D desligado:", erro); }
</script>
</body>
</html>
`;
}
