/**
 * Publica os anúncios internos em _site/ads/: o ads.js com o inventário embutido
 * e os criativos em ads/img/.
 *
 * A descrição de cada anúncio não é escrita de novo aqui: vem de featured.json,
 * a mesma da vitrine do perfil. Assim os dois nunca contam histórias diferentes
 * do mesmo projeto.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = join(dirname(fileURLToPath(import.meta.url)), "anuncios");
const IDIOMAS = ["en", "pt-BR", "es"];

/** Monta o inventário final. Erro de configuração para o build aqui, não no navegador. */
export function inventario(featured) {
  const inv = JSON.parse(readFileSync(join(AQUI, "inventario.json"), "utf8"));

  const descs = new Map();
  for (const c of featured.categorias) for (const r of c.repos) if (r.desc) descs.set(r.repo, r.desc);

  const categoriaDe = new Map();
  for (const [cat, ids] of Object.entries(inv.categorias)) {
    for (const id of ids) {
      if (categoriaDe.has(id)) throw new Error(`anúncios: ${id} está em ${categoriaDe.get(id)} e em ${cat}`);
      categoriaDe.set(id, cat);
    }
  }

  const projetos = {};
  for (const [id, p] of Object.entries(inv.projetos)) {
    const categoria = categoriaDe.get(id);
    if (!categoria) throw new Error(`anúncios: ${id} não está em nenhuma categoria`);
    const desc = descs.get(p.repo);
    if (!desc) throw new Error(`anúncios: ${id} aponta para ${p.repo}, que não tem desc em featured.json`);
    for (const loc of IDIOMAS) {
      if (!p.chamada?.[loc]) throw new Error(`anúncios: ${id} sem chamada em ${loc}`);
      if (!desc[loc]) throw new Error(`anúncios: ${p.repo} sem desc em ${loc} no featured.json`);
    }
    if (p.img && !existsSync(join(AQUI, "img", p.img))) throw new Error(`anúncios: ${id} usa img/${p.img}, que não existe`);
    projetos[id] = { nome: p.nome, categoria, anuncia: p.anuncia !== false, url: p.url, img: p.img, cor: p.cor, chamada: p.chamada, desc };
  }
  for (const id of categoriaDe.keys()) {
    if (!projetos[id]) throw new Error(`anúncios: a categoria lista ${id}, que não está em projetos`);
  }

  return { ativo: inv.ativo !== false, frequencia: inv.frequencia, projetos };
}

export function montarAnuncios(site, featured) {
  const dados = inventario(featured);
  const destino = join(site, "ads");
  mkdirSync(join(destino, "img"), { recursive: true });

  const modelo = readFileSync(join(AQUI, "ads.js"), "utf8");
  const marcador = "/*__DADOS__*/ null";
  if (!modelo.includes(marcador)) throw new Error("anúncios: ads.js perdeu o marcador /*__DADOS__*/");
  // </script> dentro de uma string quebraria quem um dia embutir o arquivo inline.
  const json = JSON.stringify(dados).replace(/</g, "\\u003c");
  writeFileSync(join(destino, "ads.js"), modelo.replace(marcador, json), "utf8");

  const imgs = new Set(Object.values(dados.projetos).map((p) => p.img).filter(Boolean));
  for (const f of imgs) copyFileSync(join(AQUI, "img", f), join(destino, "img", f));

  const exibem = Object.values(dados.projetos).filter((p) => p.anuncia).length;
  console.log(`· anúncios: ${Object.keys(dados.projetos).length} projetos, ${exibem} exibem, ${imgs.size} criativos`);
}
