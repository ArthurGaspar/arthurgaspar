/**
 * Tokens e utilidades de desenho.
 *
 * Duas regras saíram do validador de paleta e valem para todo asset daqui:
 *   - #FFC927 tem contraste 1,74:1 contra o papel. É forma e brilho, nunca texto
 *     e nunca uma marca que carregue valor. Para número em destaque existe AMBAR.
 *   - A rampa AZUL é monotônica em luminosidade, então serve de escala sequencial.
 *     Toda barra e célula ainda recebe rótulo em texto: a cor nunca é o único
 *     portador da informação.
 */

export const C = {
  papel: "#FFFDF7",
  papelFrio: "#F4F8FF",
  tinta: "#16203A",
  tinta2: "#54607A",
  tinta3: "#8A94AC",
  linha: "#E7E9F0",
  azul: "#2F6FE0",
  azulFundo: "#1E53B8",
  azulPalido: "#E3EDFF",
  amarelo: "#FFC927",
  amareloClaro: "#FFD866",
  amareloPalido: "#FFF0BF",
  ambar: "#B07500",
  vazio: "#EFF1F6",
};

/** Escala sequencial, do mais escuro ao mais claro. Só preenchimento. */
export const RAMPA = ["#17398C", "#1E53B8", "#2F6FE0", "#5B9BFF", "#8FBCFF", "#BBD6FF", "#DCE9FF"];

/** Fonte de sistema: SVG em <img> no GitHub não carrega fonte externa. */
export const FONTE = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Consolas,'Liberation Mono',monospace";

const ESTREITO = "ijl.,'`!|:;[]()/\\ft-";
const LARGO = "mwMW@";

/**
 * Largura aproximada de um texto. A fonte real varia por máquina, então todo
 * layout que usa isto reserva folga em vez de encostar no limite.
 */
export function largura(texto, tamanho, peso = 400) {
  let u = 0;
  for (const ch of String(texto)) {
    if (ch === " ") u += 0.26;
    else if (LARGO.includes(ch)) u += 0.86;
    else if (ESTREITO.includes(ch)) u += 0.3;
    else if (ch >= "0" && ch <= "9") u += 0.55;
    else if (ch >= "A" && ch <= "Z") u += 0.64;
    else u += 0.52;
  }
  return u * tamanho * (peso >= 600 ? 1.04 : 1);
}

/** Quebra em linhas que caibam em `max`, cortando a última com elipse. */
export function quebrar(texto, max, tamanho, peso = 400, maxLinhas = 2) {
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    const tenta = atual ? `${atual} ${p}` : p;
    if (largura(tenta, tamanho, peso) <= max || !atual) atual = tenta;
    else {
      linhas.push(atual);
      atual = p;
      if (linhas.length === maxLinhas) break;
    }
  }
  if (linhas.length < maxLinhas && atual) linhas.push(atual);
  if (linhas.length === maxLinhas && palavras.length) {
    const sobrou = palavras.join(" ").length > linhas.join(" ").length;
    if (sobrou) {
      let u = linhas[maxLinhas - 1];
      while (u && largura(u + "…", tamanho, peso) > max) u = u.slice(0, -1).trimEnd();
      linhas[maxLinhas - 1] = u + "…";
    }
  }
  return linhas.slice(0, maxLinhas);
}

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Texto já escapado, com a família de fonte aplicada. */
export function txt(x, y, conteudo, { tam = 13, peso = 400, cor = C.tinta, anc = "start", mono = false, op } = {}) {
  const a = anc === "start" ? "" : ` text-anchor="${anc}"`;
  const o = op === undefined ? "" : ` opacity="${op}"`;
  return `<text x="${x}" y="${y}" font-family="${mono ? MONO : FONTE}" font-size="${tam}" font-weight="${peso}" fill="${cor}"${a}${o}>${esc(conteudo)}</text>`;
}

/* --------------------------------------------------------------------- formas */

/**
 * Retângulo de cantos redondos, como caminho. Serve de forma padrão do painel.
 */
export function formaCaixa(w, h, r = 14, m = 0) {
  return `M${m + r} ${m} H${w - m - r} A${r} ${r} 0 0 1 ${w - m} ${m + r} V${h - m - r} A${r} ${r} 0 0 1 ${w - m - r} ${h - m} H${m + r} A${r} ${r} 0 0 1 ${m} ${h - m - r} V${m + r} A${r} ${r} 0 0 1 ${m + r} ${m} Z`;
}

/**
 * Caixa com o topo em arco, que é o que tira o ar de retângulo. A altura do
 * arco é o `sobe`: o pico fica exatamente em y=0 porque, numa quadrática, o topo
 * da curva é (P0 + 2C + P2) / 4, então o controle vai para -sobe.
 */
export function formaArco(w, h, { sobe = 16, r = 14, m = 0 } = {}) {
  const t = m + sobe;
  return `M${m} ${h - m - r} V${t} Q${w / 2} ${m - sobe} ${w - m} ${t} V${h - m - r} A${r} ${r} 0 0 1 ${w - m - r} ${h - m} H${m + r} A${r} ${r} 0 0 1 ${m} ${h - m - r} Z`;
}

/**
 * Mancha orgânica fechada. Os pontos viram uma curva suave passando pelos
 * pontos médios, que é o jeito barato de não ter quina nenhuma.
 */
export function blob(cx, cy, r, raios = [1, 0.86, 1.06, 0.9, 0.99]) {
  const n = raios.length;
  const p = raios.map((f, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * f * Math.cos(a), cy + r * f * Math.sin(a)];
  });
  const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (v) => v.map((x) => x.toFixed(2)).join(" ");

  let d = `M${f(meio(p[n - 1], p[0]))}`;
  for (let i = 0; i < n; i++) d += `Q${f(p[i])} ${f(meio(p[i], p[(i + 1) % n]))}`;
  return d + "Z";
}

/** Nuvem: círculos sobrepostos num grupo só, para a opacidade não costurar. */
export function nuvem(cx, cy, escala, cor, op = 0.5) {
  const c = (dx, dy, r) => `<circle cx="${(cx + dx * escala).toFixed(1)}" cy="${(cy + dy * escala).toFixed(1)}" r="${(r * escala).toFixed(1)}"/>`;
  return `<g opacity="${op}" fill="${cor}">${c(-30, 4, 20)}${c(-6, -8, 26)}${c(22, 2, 21)}${c(44, 8, 15)}<rect x="${(cx - 50 * escala).toFixed(1)}" y="${(cy + 2 * escala).toFixed(1)}" width="${(110 * escala).toFixed(1)}" height="${(30 * escala).toFixed(1)}"/></g>`;
}

/**
 * Casca de painel. Cada asset tem fundo claro próprio de propósito: quem lê o
 * GitHub no tema escuro vê um painel de luz em vez de um retângulo quebrado.
 */
export function painel(w, h, corpo, { defs = "", titulo, raio = 14, fundo, forma } = {}) {
  const d = forma ?? formaCaixa(w, h, raio);
  const dBorda = forma ?? formaCaixa(w, h, raio, 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(titulo ?? "")}">
<title>${esc(titulo ?? "")}</title>
<defs>
<linearGradient id="papel" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${C.papel}"/><stop offset="1" stop-color="${C.papelFrio}"/>
</linearGradient>
${defs}
</defs>
<path d="${d}" fill="${fundo ?? "url(#papel)"}"/>
<path d="${dBorda}" fill="none" stroke="${C.linha}"/>
${corpo}
</svg>
`;
}

/** Estrela de quatro pontas: o brilho da identidade. */
export function brilho(cx, cy, r, cor = C.amarelo, op = 1) {
  const m = r * 0.3;
  return `<path d="M${cx} ${cy - r}Q${cx + m} ${cy - m} ${cx + r} ${cy}Q${cx + m} ${cy + m} ${cx} ${cy + r}Q${cx - m} ${cy + m} ${cx - r} ${cy}Q${cx - m} ${cy - m} ${cx} ${cy - r}Z" fill="${cor}" opacity="${op}"/>`;
}

export const pct = (n) => `${n.toFixed(1)}%`;
/** Separador de milhar segue o idioma: 1,022 em inglês e 1.022 em pt/es. */
export const inteiro = (n, loc = "pt-BR") => new Intl.NumberFormat(loc).format(n);
