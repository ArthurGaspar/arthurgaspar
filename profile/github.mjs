/**
 * Conversa com a API do GitHub.
 *
 * Sobre privados: o GITHUB_TOKEN que o Actions injeta só alcança o próprio
 * repositório, então ele nunca enxerga linguagem nem contribuição privada. Para
 * isso existe PERFIL_TOKEN, um PAT clássico com escopo `repo` + `read:user`.
 * Sem ele nada quebra: a geração cai para público e devolve escopo "publico",
 * que o README anuncia em texto, para o número não parecer o que não é.
 */

const API = "https://api.github.com/graphql";

export function pegarToken() {
  const pat = process.env.PERFIL_TOKEN?.trim();
  if (pat) return { token: pat, escopo: "privado" };
  const padrao = process.env.GITHUB_TOKEN?.trim();
  if (padrao) return { token: padrao, escopo: "publico" };
  throw new Error("Nenhum token no ambiente. Defina PERFIL_TOKEN (PAT) ou GITHUB_TOKEN.");
}

async function graphql(consulta, variaveis, token) {
  const r = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "arthurgaspar-perfil",
    },
    body: JSON.stringify({ query: consulta, variables: variaveis }),
  });
  if (!r.ok) throw new Error(`GraphQL HTTP ${r.status}: ${(await r.text()).slice(0, 400)}`);
  const j = await r.json();
  if (j.errors?.length) throw new Error(`GraphQL: ${j.errors.map((e) => e.message).join(" | ")}`);
  return j.data;
}

/* ---------------------------------------------------------------- linguagens */

const Q_REPOS = `
query($login:String!, $after:String, $privacidade:RepositoryPrivacy) {
  user(login:$login) {
    repositories(first:100, after:$after, ownerAffiliations:[OWNER], privacy:$privacidade, orderBy:{field:PUSHED_AT, direction:DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name isFork isPrivate
        languages(first:15, orderBy:{field:SIZE, direction:DESC}) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

/** Soma os bytes por linguagem em todos os repos que eu possuo. */
export async function buscarLinguagens(login, token, escopo, cfg) {
  const privacidade = escopo === "privado" ? null : "PUBLIC";
  const bytes = new Map();
  const cores = new Map();
  let after = null;
  let contados = 0;

  do {
    const d = await graphql(Q_REPOS, { login, after, privacidade }, token);
    const { nodes, pageInfo } = d.user.repositories;
    for (const repo of nodes) {
      if (cfg.ignorarForks && repo.isFork) continue;

      const usaveis = repo.languages.edges.filter((e) => !cfg.ignorarLinguagens?.includes(e.node.name));
      if (!usaveis.length) continue;
      contados++;

      // Contar byte cru faz uma tese em LaTeX ou uma pasta de HTML enterrar um
      // código denso: o gráfico passa a medir tamanho de arquivo, não ofício.
      // Com peso por repo, cada repositório vale 1 e divide esse 1 entre as
      // suas linguagens, então a barra responde "em que eu construo coisas".
      const total = usaveis.reduce((a, e) => a + e.size, 0);
      for (const e of usaveis) {
        const nome = e.node.name;
        const peso = cfg.pesoPorRepo === false ? e.size : e.size / total;
        bytes.set(nome, (bytes.get(nome) ?? 0) + peso);
        if (e.node.color) cores.set(nome, e.node.color);
      }
    }
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);

  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  const lista = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cfg.topLinguagens)
    .map(([nome, n]) => ({ nome, bytes: n, parte: total ? (n / total) * 100 : 0, cor: cores.get(nome) ?? null }));

  return { lista, repos: contados, totalBytes: total };
}

/* ------------------------------------------------------------- contribuições */

/** contributionsCollection aceita no máximo um ano por janela, daí um alias por ano. */
export async function buscarContribuicoes(login, token) {
  const { user } = await graphql(`query($login:String!){ user(login:$login){ createdAt } }`, { login }, token);
  const primeiro = new Date(user.createdAt).getUTCFullYear();
  const ultimo = new Date().getUTCFullYear();

  const anos = [];
  for (let a = primeiro; a <= ultimo; a++) anos.push(a);

  const campos = anos
    .map(
      (a) => `a${a}: contributionsCollection(from:"${a}-01-01T00:00:00Z", to:"${a}-12-31T23:59:59Z") {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }`,
    )
    .join("\n");

  const d = await graphql(`query($login:String!){ user(login:$login){ ${campos} } }`, { login }, token);

  const dias = [];
  for (const a of anos) {
    for (const sem of d.user[`a${a}`].contributionCalendar.weeks) {
      for (const dia of sem.contributionDays) dias.push({ date: dia.date, count: dia.contributionCount });
    }
  }
  dias.sort((x, y) => x.date.localeCompare(y.date));

  // Um dia pode voltar em duas janelas na virada do ano; o último vence.
  const unicos = [...new Map(dias.map((d) => [d.date, d])).values()];
  return unicos;
}

/* ------------------------------------------------------------- repos curados */

const Q_REPO = `
query($owner:String!, $name:String!) {
  repository(owner:$owner, name:$name) {
    name description stargazerCount url isPrivate isArchived
    primaryLanguage { name color }
  }
}`;

/**
 * Busca cada repo da vitrine. Aceita "nome" (dono = login) ou "org/nome".
 *
 * Privado, arquivado, renomeado ou apagado é pulado com aviso. São esses quatro
 * casos que fazem uma vitrine escrita à mão apodrecer: o perfil antigo apontava
 * para um repo que tinha virado privado, e o card ficou lá, morto.
 */
export async function buscarRepos(login, itens, token) {
  const achados = [];
  for (const item of itens) {
    const alvo = typeof item === "string" ? { repo: item } : item;
    const [owner, name] = alvo.repo.includes("/") ? alvo.repo.split("/") : [login, alvo.repo];

    let r = null;
    try {
      ({ repository: r } = await graphql(Q_REPO, { owner, name }, token));
    } catch (e) {
      console.warn(`  ! ${alvo.repo}: ${e.message}`);
      continue;
    }
    if (!r) {
      console.warn(`  ! ${alvo.repo}: não encontrado, pulando`);
      continue;
    }
    if (r.isPrivate) {
      console.warn(`  ! ${alvo.repo}: privado, pulando`);
      continue;
    }
    if (r.isArchived) {
      console.warn(`  ! ${alvo.repo}: arquivado, pulando`);
      continue;
    }

    achados.push({
      nome: r.name,
      dono: owner,
      // `desc` do featured.json ganha da descrição do GitHub, que é campo único
      // e por isso não tem como sair traduzida.
      desc: alvo.desc ?? null,
      descricao: r.description ?? "",
      estrelas: r.stargazerCount,
      url: r.url,
      linguagem: r.primaryLanguage?.name ?? null,
      corLinguagem: r.primaryLanguage?.color ?? null,
    });
  }
  return achados;
}
