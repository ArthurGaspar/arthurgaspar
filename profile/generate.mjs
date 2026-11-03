/**
 * Gera todos os SVGs e os três READMEs.
 *
 * Os READMEs são escritos inteiros a partir de um template só, e toda a prosa
 * vem de strings.json. É de propósito: enquanto cada idioma era um arquivo
 * editado à mão, o PT ficou para trás e o ES nunca existiu. Agora não existe
 * caminho em que eles divirjam.
 *
 *   node profile/generate.mjs              # dados ao vivo, precisa de token
 *   node profile/generate.mjs --fixture    # dados de exemplo, roda offline
 *
 * Além dos READMEs, monta a página central em _site/, que o workflow publica no
 * GitHub Pages. _site/ não é commitada: é saída de build, refeita a cada rodada.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { banner, interesses, linguagens, contribuicoes, sequencia, cardRepo, cabecalhoCategoria, chipIdioma, faixa } from "./render.mjs";
import { pegarToken, buscarLinguagens, buscarContribuicoes, buscarRepos } from "./github.mjs";
import { aplicarTema } from "./theme.mjs";
import { montarPagina, urlBadge } from "./pagina.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const ASSETS = join(RAIZ, "assets");
const SITE = join(RAIZ, "_site");

const ler = (p) => JSON.parse(readFileSync(join(AQUI, p), "utf8"));
const CFG = ler("featured.json");
const STR = ler("strings.json");
const TOOLS = ler("tools.json");
const HIST = ler("historia.json");

const ARQUIVO = { en: "README.md", "pt-BR": "README.pt-BR.md", es: "README.es.md" };
/** Pasta de cada idioma na página. O inglês fica na raiz, como no README. */
const PASTA = { en: "", "pt-BR": "pt-BR/", es: "es/" };
const CHIP = { en: "English", "pt-BR": "Português", es: "Español" };
const LOCAIS = Object.keys(ARQUIVO);

const offline = process.argv.includes("--fixture");

/* ------------------------------------------------------------------ métricas */

/**
 * Sequência de dias com contribuição. O dia de hoje não quebra nada quando está
 * em zero: o dia ainda não acabou, então ele é ignorado em vez de zerar a conta.
 */
function medirSequencia(dias) {
  const hoje = new Date().toISOString().slice(0, 10);
  const total = dias
    .filter((d) => d.date > new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10))
    .reduce((a, d) => a + d.count, 0);

  let maior = 0;
  let maiorFim = null;
  let corrida = 0;
  for (const d of dias) {
    if (d.count > 0) {
      corrida++;
      if (corrida > maior) {
        maior = corrida;
        maiorFim = d.date;
      }
    } else if (d.date !== hoje) {
      corrida = 0;
    }
  }

  let i = dias.length - 1;
  while (i >= 0 && dias[i].date > hoje) i--;
  if (i >= 0 && dias[i].date === hoje && dias[i].count === 0) i--;
  let atual = 0;
  while (i >= 0 && dias[i].count > 0) {
    atual++;
    i--;
  }

  const atualDe = atual ? dias[dias.length - 1 - (dias[dias.length - 1].date === hoje && dias[dias.length - 1].count === 0 ? 1 : 0) - (atual - 1)]?.date : null;
  const maiorDe = maior && maiorFim ? new Date(new Date(maiorFim).getTime() - (maior - 1) * 864e5).toISOString().slice(0, 10) : null;

  return { total, atual, maior, atualDe, maiorFim, maiorDe };
}

function dataCurta(iso, s, loc) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  const mes = s.meses[d.getUTCMonth()];
  const dia = d.getUTCDate();
  return loc === "en" ? `${mes} ${dia}` : `${dia} ${mes}`;
}

/* --------------------------------------------------------------------- dados */

async function colher() {
  if (offline) {
    console.log("· modo fixture: nenhuma chamada de rede");
    const f = ler("fixture.json");
    return { ...f, escopo: f.escopo ?? "privado" };
  }

  const { token, escopo } = pegarToken();
  console.log(`· token com escopo "${escopo}"`);
  if (CFG.incluirPrivados && escopo === "publico") {
    console.warn("! featured.json pede privados mas só há GITHUB_TOKEN. Seguindo com públicos.");
  }

  const login = CFG.usuario;
  console.log("· linguagens");
  const langs = await buscarLinguagens(login, token, escopo, CFG);
  console.log(`  ${langs.repos} repos, ${langs.lista.length} linguagens`);

  console.log("· contribuições");
  const dias = await buscarContribuicoes(login, token);
  console.log(`  ${dias.length} dias de histórico`);

  console.log("· repos da vitrine");
  const categorias = [];
  for (const c of CFG.categorias) {
    const repos = await buscarRepos(login, c.repos, token);
    console.log(`  ${c.chave}: ${repos.length} de ${c.repos.length}`);
    categorias.push({ chave: c.chave, repos });
  }

  return { escopo, langs, dias, categorias };
}

/* ------------------------------------------------------------------ escrever */

const escritos = new Set();

function gravar(nome, conteudo) {
  writeFileSync(join(ASSETS, nome), conteudo, "utf8");
  escritos.add(nome);
}

/**
 * Desenha o mesmo asset nas duas paletas: `nome.svg` e `nome.dark.svg`.
 * O <picture> no README escolhe um dos dois pelo tema de quem está lendo.
 */
function gravarTemas(base, desenhar) {
  for (const tema of ["claro", "escuro"]) {
    aplicarTema(tema);
    gravar(`${base}${tema === "escuro" ? ".dark" : ""}.svg`, desenhar());
  }
}

/** <picture> com prefers-color-scheme, que é como o GitHub troca imagem por tema. */
const img = (base, alt, extra = "") =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${base}.dark.svg?v=${STAMP}"><img src="assets/${base}.svg?v=${STAMP}" alt="${alt}"${extra}></picture>`;

const STAMP = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const idCard = (r) => `repo-${r.dono}-${r.nome}`.toLowerCase();

/** A descrição traduzida ganha da do GitHub, que é um campo só e não traduz. */
const descDe = (r, loc) => r.desc?.[loc] ?? r.descricao ?? "";

/** Largura fixa do card no README. Três cabem na coluna de leitura do perfil. */
const LARGURA_CARD = 268;

/**
 * A vitrine, uma categoria por vez. Os cards fluem como imagens soltas.
 *
 * Tabela foi a primeira tentativa e saiu torta: o GitHub renderiza tabela de
 * markdown com `width: max-content`, então uma linha incompleta não estica, e a
 * categoria de dois projetos saía com card de 189px contra 255px da de oito.
 * Com largura fixa na imagem, o tamanho não depende de quantos vizinhos há.
 */
function blocoCategorias(categorias, s, loc, alvo) {
  return categorias
    .filter((c) => c.repos.length)
    .map((c) => {
      const cards = c.repos
        .map((r) => {
          const d = descDe(r, loc);
          const alt = `${r.nome}${d ? ` · ${d}` : ""}`.replace(/"/g, "&quot;");
          return `<a href="${r.url}">${img(`${idCard(r)}${alvo}`, alt, ` width="${LARGURA_CARD}"`)}</a>`;
        })
        .join("\n");
      const titulo = s.categorias[c.chave] ?? c.chave;
      return `${img(`cat-${c.chave}${alvo}`, `${titulo} (${c.repos.length})`, ' height="44"')}

<p>
${cards}
</p>`;
    })
    .join("\n\n");
}

function blocoFerramentas(s) {
  return TOOLS.grupos
    .map((g) => {
      const badges = g.badges
        .map((b) => `<img src="${urlBadge(b)}" alt="${b.nome}">`)
        .join("\n");
      return `<p><sub><b>${s.grupos[g.chave]}</b></sub></p>\n<p>\n${badges}\n</p>`;
    })
    .join("\n");
}

/**
 * Badges de contato, na ordem do CONTATO. Link vazio no historia.json some.
 *
 * O Lattes não tem logo no Simple Icons, então vai só com o nome, na cor da
 * casa (o azul do CNPq).
 */
const CONTATO = [
  { chave: "linkedin", nome: "LinkedIn", cor: "2F6FE0", logo: "linkedin" },
  { chave: "orcid", nome: "ORCID", cor: "A6CE39", logo: "orcid" },
  { chave: "lattes", nome: "Lattes", cor: "1E53B8" },
];

function blocoContato() {
  return CONTATO.filter((c) => HIST.contato[c.chave])
    .map((c) => `<a href="${HIST.contato[c.chave]}"><img src="${urlBadge(c)}" alt="${c.nome}"></a>`)
    .join("\n");
}

function montarReadme(loc, s, d, alvo) {
  const chips = LOCAIS.map(
    (l) => `<a href="${ARQUIVO[l]}">${img(`chip-${l}-${l === loc ? "on" : "off"}`, CHIP[l], ' height="30"')}</a>`,
  ).join("\n");

  const subEscopo = d.escopo === "privado" ? s.subPrivados : s.subPublicos;

  return `<!-- Este arquivo é gerado por profile/generate.mjs. Edite profile/strings.json, não aqui. -->
<div align="center">

${img(`banner${alvo}`, `${s.nome} · ${s.papel}`, ' width="100%"')}

${chips}

<p><a href="${HIST.url}${PASTA[loc]}"><b>${s.pagina.link} &rarr;</b></a></p>

${img(`interesses${alvo}`, s.interesses.map((i) => i.rotulo).join(" · "), ' width="100%"')}

</div>

${img(`faixa-projetos${alvo}`, s.faixas.projetos, ' width="100%"')}

${blocoCategorias(d.categorias, s, loc, alvo)}

<p align="right"><a href="https://github.com/${CFG.usuario}?tab=repositories">${s.verTodos} &rarr;</a></p>

${img(`faixa-numeros${alvo}`, s.faixas.numeros, ' width="100%"')}

<table>
<tr>
  <td width="50%" valign="top"><b>${s.subLinguagens}</b><br><sub>${subEscopo}</sub><br><br>${img("linguagens", s.subLinguagens, ' width="100%"')}</td>
  <td width="50%" valign="top"><b>${s.subSequencia}</b><br><sub>${s.ultimoAno}</sub><br><br>${img(`sequencia${alvo}`, s.subSequencia, ' width="100%"')}</td>
</tr>
</table>

${img(`contribuicoes${alvo}`, `${d.stats.total} ${s.contribuicoes}`, ' width="100%"')}

${img(`faixa-ferramentas${alvo}`, s.faixas.ferramentas, ' width="100%"')}

<div align="center">

${blocoFerramentas(s)}

</div>

${img(`faixa-contato${alvo}`, s.faixas.contato, ' width="100%"')}

<p>${blocoContato()}</p>

<p><sub>${s.geradoEm} ${new Date().toISOString().slice(0, 10)}${offline ? " · fixture" : ""}</sub></p>
`;
}

/* -------------------------------------------------------------------- página */

/**
 * Monta _site/ do zero: um index.html por idioma e só os SVGs claros.
 *
 * As faixas de "história" e "trajetória" não existem no README, então são
 * desenhadas aqui direto em _site/assets. Se fossem para assets/, o verificar
 * reprovaria por asset que nenhum README usa, e com razão.
 */
function montarSite(d) {
  rmSync(SITE, { recursive: true, force: true });
  mkdirSync(join(SITE, "assets"), { recursive: true });

  for (const f of escritos) {
    if (!f.endsWith(".dark.svg")) copyFileSync(join(ASSETS, f), join(SITE, "assets", f));
  }

  aplicarTema("claro");
  const hoje = new Date().toISOString().slice(0, 10);

  for (const loc of LOCAIS) {
    const s = { ...STR[loc], loc };
    const alvo = loc === "en" ? "" : `.${loc}`;
    for (const chave of ["historia", "trajetoria"]) {
      writeFileSync(join(SITE, "assets", `faixa-${chave}${alvo}.svg`), faixa(s.pagina[chave]), "utf8");
    }

    const raiz = PASTA[loc] ? "../" : "";
    // O padrão de medida é o da faixa, que é o asset mais repetido na página.
    const svg = (base, alt, extra = ' width="880" height="50"') =>
      `<img src="${raiz}assets/${base}.svg?v=${STAMP}" alt="${alt.replace(/"/g, "&quot;")}"${extra}>`;

    const categorias = d.categorias.map((c) => ({
      chave: c.chave,
      repos: c.repos.map((r) => ({ ...r, id: idCard(r), descricaoLocal: descDe(r, loc) })),
    }));

    const html = montarPagina({
      loc,
      s,
      h: HIST[loc],
      contato: HIST.contato,
      d: { ...d, categorias },
      alvo,
      tools: TOOLS,
      url: HIST.url,
      ctx: { raiz, svg, caminho: PASTA, idiomas: CHIP, data: hoje },
    });
    mkdirSync(join(SITE, PASTA[loc]), { recursive: true });
    writeFileSync(join(SITE, PASTA[loc], "index.html"), html, "utf8");
  }

  // Sem isto o Pages passaria o _site pelo Jekyll, que ignora pasta com _ e
  // não tem nada a acrescentar a HTML pronto.
  writeFileSync(join(SITE, ".nojekyll"), "");
  console.log(`· página: ${LOCAIS.length} idiomas em _site/`);
}

/* --------------------------------------------------------------------- rodar */

async function principal() {
  mkdirSync(ASSETS, { recursive: true });
  const d = await colher();
  d.stats = medirSequencia(d.dias);
  console.log(`· sequência: atual ${d.stats.atual}, maior ${d.stats.maior}, total ${d.stats.total}`);

  // Neutros: não carregam prosa, então um arquivo serve os três idiomas.
  gravarTemas("linguagens", () => linguagens(d.langs.lista));
  for (const l of LOCAIS) {
    gravarTemas(`chip-${l}-on`, () => chipIdioma(CHIP[l], true));
    gravarTemas(`chip-${l}-off`, () => chipIdioma(CHIP[l], false));
  }

  for (const loc of LOCAIS) {
    const s = { ...STR[loc], loc };
    const alvo = loc === "en" ? "" : `.${loc}`;
    const seq = {
      ...d.stats,
      atualDe: dataCurta(d.stats.atualDe, s, loc),
      maiorDe: d.stats.maiorDe ? `${dataCurta(d.stats.maiorDe, s, loc)} → ${dataCurta(d.stats.maiorFim, s, loc)}` : null,
    };

    for (const c of d.categorias) {
      if (!c.repos.length) continue;
      gravarTemas(`cat-${c.chave}${alvo}`, () => cabecalhoCategoria(s.categorias[c.chave] ?? c.chave, c.repos.length));
      for (const r of c.repos) gravarTemas(`${idCard(r)}${alvo}`, () => cardRepo({ ...r, descricao: descDe(r, loc) }));
    }

    gravarTemas(`banner${alvo}`, () => banner(s));
    gravarTemas(`interesses${alvo}`, () => interesses(s));
    gravarTemas(`sequencia${alvo}`, () => sequencia(seq, s));
    gravarTemas(`contribuicoes${alvo}`, () => contribuicoes(d.dias.slice(-371), d.stats.total, s));
    for (const [chave, titulo] of Object.entries(s.faixas)) gravarTemas(`faixa-${chave}${alvo}`, () => faixa(titulo));

    writeFileSync(join(RAIZ, ARQUIVO[loc]), montarReadme(loc, s, d, alvo), "utf8");
  }

  montarSite(d);

  // Um repo tirado da lista curada deixaria o card órfão em assets/.
  for (const f of readdirSync(ASSETS)) {
    if (f.endsWith(".svg") && !escritos.has(f)) {
      unlinkSync(join(ASSETS, f));
      console.log(`· removido asset órfão: ${f}`);
    }
  }

  const totalRepos = d.categorias.reduce((a, c) => a + c.repos.length, 0);
  const usadas = d.categorias.filter((c) => c.repos.length).length;
  console.log(`\n${escritos.size} SVGs, ${totalRepos} projetos em ${usadas} categorias, ${LOCAIS.length} READMEs.`);
}

principal().catch((e) => {
  console.error(`\nFalhou: ${e.message}`);
  process.exit(1);
});
