/**
 * Confere o que foi gerado antes de virar commit.
 *
 * Existe porque o problema que motivou essa reforma foi badge quebrada: imagem
 * apontando para serviço morto, link para repo que virou privado, número que
 * saiu NaN. Tudo isso só aparece depois de publicado, quando já está no perfil.
 * Aqui aparece antes.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const READMES = ["README.md", "README.pt-BR.md", "README.es.md"];

const falhas = [];
const reprovar = (m) => falhas.push(m);

/* Todo src="assets/..." tem que existir em disco. */
const usados = new Set();
for (const r of READMES) {
  const caminho = join(RAIZ, r);
  if (!existsSync(caminho)) {
    reprovar(`${r}: não foi gerado`);
    continue;
  }
  const texto = readFileSync(caminho, "utf8");

  // src= é a versão clara e srcset= a escura; as duas precisam existir, senão
  // metade dos leitores vê imagem quebrada e a outra metade não vê nada errado.
  for (const m of texto.matchAll(/src(?:set)?="assets\/([^"?]+)/g)) {
    usados.add(m[1]);
    if (!existsSync(join(RAIZ, "assets", m[1]))) reprovar(`${r}: aponta para assets/${m[1]}, que não existe`);
  }

  const claros = [...texto.matchAll(/ src="assets\/([^"?]+)/g)].length;
  const escuros = [...texto.matchAll(/srcset="assets\/([^"?]+)/g)].length;
  if (claros !== escuros) reprovar(`${r}: ${claros} imagens claras contra ${escuros} escuras`);

  // Um README sem card nenhum significa que a busca de repos falhou calada.
  if (!/assets\/repo-/.test(texto)) reprovar(`${r}: nenhum card de repositório`);

  // Os três têm que linkar os três, senão o seletor de idioma vira beco sem saída.
  for (const outro of READMES) {
    if (!texto.includes(`href="${outro}"`)) reprovar(`${r}: não linka ${outro}`);
  }
}

/* Cada SVG tem que estar fechado e sem buraco de formatação. */
for (const f of readdirSync(join(RAIZ, "assets"))) {
  if (!f.endsWith(".svg")) continue;
  const s = readFileSync(join(RAIZ, "assets", f), "utf8");

  if (!s.trimStart().startsWith("<svg")) reprovar(`assets/${f}: não começa com <svg`);
  if (!s.trimEnd().endsWith("</svg>")) reprovar(`assets/${f}: não termina com </svg>`);
  for (const lixo of ["NaN", "undefined", "null,", "[object"]) {
    if (s.includes(lixo)) reprovar(`assets/${f}: contém "${lixo}", sinal de dado faltando`);
  }
  if (!usados.has(f)) reprovar(`assets/${f}: gerado mas nenhum README usa`);
}

if (falhas.length) {
  console.error(`\n${falhas.length} problema(s):`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`ok: ${READMES.length} READMEs, ${usados.size} assets, todos referenciados e fechados.`);
