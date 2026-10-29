/**
 * Os desenhos. Cada função devolve um SVG completo e independente.
 *
 * Largura 880 para faixa inteira e 430 para painel de meia largura, que é o que
 * cabe na coluna de leitura do GitHub sem rolagem lateral.
 */
import { C, RAMPA, FONTE, MONO, largura, quebrar, txt, painel, brilho, esc, pct, inteiro, formaArco, blob, nuvem } from "./theme.mjs";
import { ICONES, sol } from "./icons.mjs";

const W = 880;
const MEIA = 430;
const TERCO = 284;

/* ------------------------------------------------------------------ cabeçalho */

export function banner(s) {
  const h = 216;
  const sol = { x: 706, y: 96 };
  const forma = formaArco(W, h, { sobe: 14, r: 18 });

  // Fitas de luz: curvas longas e apagadas atravessando o céu.
  const fitas = [
    { d: `M-60 150 C140 96 330 196 560 120 S840 54 960 92`, w: 15, op: 0.3, cor: C.fitaQuente },
    { d: `M-60 178 C180 132 300 216 580 152 S860 102 960 134`, w: 9, op: 0.3, cor: C.fitaFria },
  ]
    .map((f) => `<path d="${f.d}" fill="none" stroke="${f.cor}" stroke-width="${f.w}" stroke-linecap="round" opacity="${f.op}"/>`)
    .join("");

  // Raios do sol, curtos e desiguais, para não virar mira de alvo.
  const raios = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI / 6) * i + 0.26;
    const r1 = 46;
    const r2 = i % 2 ? 58 : 68;
    return `<path d="M${(sol.x + r1 * Math.cos(a)).toFixed(1)} ${(sol.y + r1 * Math.sin(a)).toFixed(1)} L${(sol.x + r2 * Math.cos(a)).toFixed(1)} ${(sol.y + r2 * Math.sin(a)).toFixed(1)}" stroke="${C.amarelo}" stroke-width="2.4" stroke-linecap="round" opacity="0.45"/>`;
  }).join("");

  const defs = `
<radialGradient id="aurora" cx="0.08" cy="0.1" r="0.8">
<stop offset="0" stop-color="${C.auroraCor}" stop-opacity="${C.auroraOp}"/>
<stop offset="1" stop-color="${C.auroraCor}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ceu" cx="0.9" cy="1" r="0.8">
<stop offset="0" stop-color="${C.ceuCor}" stop-opacity="${C.ceuOp}"/>
<stop offset="1" stop-color="${C.ceuCor}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="disco" cx="0.42" cy="0.36" r="0.68">
<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.4" stop-color="${C.amareloClaro}"/><stop offset="1" stop-color="${C.amarelo}"/>
</radialGradient>
<clipPath id="corte"><path d="${forma}"/></clipPath>`;

  const corpo = `
<g clip-path="url(#corte)">
<rect width="${W}" height="${h}" fill="url(#aurora)"/>
<rect width="${W}" height="${h}" fill="url(#ceu)"/>
${fitas}
${raios}
<circle cx="${sol.x}" cy="${sol.y}" r="54" fill="${C.amareloPalido}" opacity="0.55"/>
<circle cx="${sol.x}" cy="${sol.y}" r="38" fill="url(#disco)"/>
${nuvem(628, 174, 1.15, C.nuvemA, 0.78)}
${nuvem(812, 150, 0.8, C.nuvemB, 0.72)}
${nuvem(476, 196, 0.95, C.nuvemA, 0.5)}
${brilho(566, 54, 7.5, C.amarelo, 0.8)}
${brilho(848, 70, 5, C.amarelo, 0.65)}
${brilho(622, 36, 4, C.azul, 0.3)}
${brilho(782, 38, 3.5, C.amarelo, 0.5)}
</g>
${txt(56, 104, s.nome, { tam: 42, peso: 700 })}
<path d="M58 122 Q104 114 150 122" fill="none" stroke="${C.amarelo}" stroke-width="3.5" stroke-linecap="round"/>
${txt(56, 154, s.papel, { tam: 15.5, cor: C.tinta2 })}
${txt(56, 180, s.lugar, { tam: 12.5, cor: C.tinta3, mono: true })}`;

  return painel(W, h, corpo, { defs, titulo: `${s.nome} · ${s.papel}`, forma });
}

/* ------------------------------------------------------------------ interesses */

export function interesses(s) {
  const h = 124;
  const n = s.interesses.length;
  const cel = W / n;

  // Cada mancha tem raios próprios, então nenhuma repete a vizinha.
  const FORMAS = [
    [1, 0.84, 1.08, 0.9, 0.97],
    [0.95, 1.08, 0.88, 1.02, 0.92],
    [1.06, 0.92, 0.98, 0.86, 1.04],
    [0.9, 1.0, 0.9, 1.08, 0.96],
  ];

  const celulas = s.interesses
    .map((it, i) => {
      const cx = cel * i + cel / 2;
      // Separador em curva leve, não em régua.
      const divisor = i === 0 ? "" : `<path d="M${(cel * i).toFixed(1)} 28 Q${(cel * i + 5).toFixed(1)} ${h / 2} ${(cel * i).toFixed(1)} ${h - 28}" fill="none" stroke="${C.linha}" stroke-width="1"/>`;
      return `${divisor}
<path d="${blob(cx, 44, 27, FORMAS[i % FORMAS.length])}" fill="${C.amareloPalido}" opacity="0.8"/>
<g transform="translate(${cx - 16} 28)">${ICONES[it.icone]()}</g>
${txt(cx, 97, it.rotulo, { tam: 14, peso: 600, anc: "middle" })}`;
    })
    .join("");

  return painel(W, h, celulas, { titulo: s.interesses.map((i) => i.rotulo).join(" · "), raio: 20 });
}

/* ------------------------------------------------------------------ linguagens */

export function linguagens(lista) {
  const pad = 20;
  const alturaLinha = 25;
  const topo = 24;
  const h = topo + lista.length * alturaLinha + 14;

  const colRotulo = Math.min(
    126,
    Math.max(...lista.map((l) => largura(l.nome, 12, 600))) + 10,
  );
  const x0 = pad + colRotulo;
  const util = MEIA - x0 - pad - 44;

  const linhas = lista
    .map((l, i) => {
      const y = topo + i * alturaLinha;
      const larg = Math.max(3, (l.parte / lista[0].parte) * util);
      const cor = RAMPA[Math.min(i, RAMPA.length - 1)];
      const r = Math.min(4, larg / 2);
      return `${txt(pad, y + 11, l.nome, { tam: 12, peso: 600, cor: C.tinta })}
<path d="M${x0} ${y + 1} H${(x0 + larg - r).toFixed(1)} A${r} ${r} 0 0 1 ${(x0 + larg).toFixed(1)} ${y + 1 + r} V${y + 15 - r} A${r} ${r} 0 0 1 ${(x0 + larg - r).toFixed(1)} ${y + 16} H${x0} Z" fill="${cor}"/>
${txt(MEIA - pad, y + 12.5, pct(l.parte), { tam: 11, peso: 600, cor: C.tinta2, anc: "end" })}`;
    })
    .join("");

  return painel(MEIA, h, linhas, { titulo: `Linguagens: ${lista.map((l) => `${l.nome} ${pct(l.parte)}`).join(", ")}` });
}

/* --------------------------------------------------------------- contribuições */

/** Montado na chamada, não no módulo, pela mesma razão dos ícones. */
const niveis = () => [C.vazio, RAMPA[5], RAMPA[3], RAMPA[2], RAMPA[0]];

function nivel(c, max) {
  if (!c) return 0;
  if (max <= 1) return 4;
  const f = c / max;
  return f > 0.6 ? 4 : f > 0.3 ? 3 : f > 0.12 ? 2 : 1;
}

export function contribuicoes(dias, total, s) {
  const cel = 11;
  const gap = 3;
  const passo = cel + gap;
  const rotuloDia = 24;
  const pad = 22;

  // Colunas por semana, a primeira alinhada ao domingo anterior ao primeiro dia.
  const semanas = [];
  for (const d of dias) {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
    if (!semanas.length || dow === 0) semanas.push(Array(7).fill(null));
    semanas[semanas.length - 1][dow] = d;
  }

  const max = Math.max(1, ...dias.map((d) => d.count));
  const N = niveis();
  const topo = 92;
  const grade = pad + rotuloDia;
  const h = topo + 7 * passo + 34;

  const celulas = semanas
    .map((sem, x) =>
      sem
        .map((d, y) =>
          d
            ? `<rect x="${grade + x * passo}" y="${topo + y * passo}" width="${cel}" height="${cel}" rx="2.5" fill="${N[nivel(d.count, max)]}"><title>${d.date}: ${d.count}</title></rect>`
            : "",
        )
        .join(""),
    )
    .join("");

  // Mês rotulado só quando a semana começa um mês novo, para não empilhar texto.
  const meses = semanas
    .map((sem, x) => {
      const d = sem.find(Boolean);
      if (!d) return "";
      const dt = new Date(d.date + "T00:00:00Z");
      if (dt.getUTCDate() > 7) return "";
      return txt(grade + x * passo, topo - 8, s.meses[dt.getUTCMonth()], { tam: 10, cor: C.tinta3 });
    })
    .join("");

  const dow = [1, 3, 5]
    .map((i) => txt(pad + rotuloDia - 6, topo + i * passo + cel - 1.5, s.dias[i], { tam: 10, cor: C.tinta3, anc: "end" }))
    .join("");

  const legenda = N.map(
    (c, i) => `<rect x="${W - pad - 96 + i * 15}" y="${h - 26}" width="11" height="11" rx="2.5" fill="${c}"/>`,
  ).join("");

  const corpo = `
<circle cx="${pad + 16}" cy="38" r="17" fill="${C.amareloPalido}"/>
${brilho(pad + 16, 38, 8, C.amarelo, 0.9)}
${txt(pad + 44, 44, inteiro(total, s.loc), { tam: 27, peso: 700 })}
${txt(pad + 48 + largura(inteiro(total, s.loc), 27, 700), 44, s.contribuicoes, { tam: 13, cor: C.tinta2 })}
${meses}${dow}${celulas}
${txt(W - pad - 108, h - 17, s.menos, { tam: 10, cor: C.tinta3, anc: "end" })}
${legenda}
${txt(W - pad + 2, h - 17, s.mais, { tam: 10, cor: C.tinta3, anc: "end" })}`;

  return painel(W, h, corpo, { titulo: `${inteiro(total, s.loc)} ${s.contribuicoes}` });
}

/* ------------------------------------------------------------------- sequência */

export function sequencia(d, s) {
  const h = 236;
  const col = MEIA / 3;
  const meio = MEIA / 2;

  const lado = (cx, valor, rotulo, sub) => `
${txt(cx, 118, inteiro(valor, s.loc), { tam: 25, peso: 700, anc: "middle" })}
${txt(cx, 139, rotulo, { tam: 11, peso: 600, cor: C.tinta2, anc: "middle" })}
${txt(cx, 156, sub, { tam: 9.5, cor: C.tinta3, anc: "middle" })}`;

  const corpo = `
<path d="M${col.toFixed(1)} 52 V184" stroke="${C.linha}"/>
<path d="M${(col * 2).toFixed(1)} 52 V184" stroke="${C.linha}"/>
${lado(col / 2, d.total, s.total, s.ultimoAno)}
<circle cx="${meio}" cy="74" r="30" fill="${C.amareloPalido}" opacity="0.8"/>
${sol(meio, 74, 13)}
${txt(meio, 130, inteiro(d.atual, s.loc), { tam: 34, peso: 700, anc: "middle" })}
${txt(meio, 150, s.atual, { tam: 11.5, peso: 600, cor: C.ambar, anc: "middle" })}
${txt(meio, 167, d.atualDe ? `${d.atualDe} → ${s.hoje}` : s.nenhuma, { tam: 9.5, cor: C.tinta3, anc: "middle" })}
${lado(col * 2.5, d.maior, s.maior, d.maiorDe ?? "")}`;

  return painel(MEIA, h, corpo, { titulo: `${s.atual}: ${d.atual} · ${s.maior}: ${d.maior}` });
}

/* --------------------------------------------------------------- card de repo */

/**
 * Card de projeto, em arco. São três por linha agora, porque a vitrine deixou de
 * ser uma seleção de seis e passou a ser o acervo inteiro por categoria.
 */
export function cardRepo(r) {
  const w = TERCO;
  const h = 142;
  const pad = 16;
  const sobe = 13;
  const forma = formaArco(w, h, { sobe, r: 16 });
  const desc = r.descricao ? quebrar(r.descricao, w - pad * 2, 10.8, 400, 3) : [];

  const base = h - 17;
  let x = pad;
  const metas = [];
  if (r.linguagem) {
    metas.push(`<circle cx="${x + 4.5}" cy="${base - 4}" r="4.5" fill="${r.corLinguagem || C.azul}"/>`);
    metas.push(txt(x + 14, base, r.linguagem, { tam: 11, peso: 600, cor: C.tinta2 }));
    x += 14 + largura(r.linguagem, 11, 600) + 14;
  }
  if (r.estrelas > 0) {
    metas.push(`<path d="M${x + 5} ${base - 9} l1.9 4 4.4.6-3.2 3 .8 4.3-3.9-2.1-3.9 2.1.8-4.3-3.2-3 4.4-.6z" fill="${C.amarelo}"/>`);
    metas.push(txt(x + 16, base, String(r.estrelas), { tam: 11, peso: 600, cor: C.tinta2 }));
  }

  const defs = `
<radialGradient id="cupula" cx="0.5" cy="0" r="0.85">
<stop offset="0" stop-color="${C.amareloPalido}" stop-opacity="0.85"/>
<stop offset="1" stop-color="${C.amareloPalido}" stop-opacity="0"/>
</radialGradient>
<clipPath id="corteCard"><path d="${forma}"/></clipPath>`;

  const corpo = `
<g clip-path="url(#corteCard)"><rect width="${w}" height="${h}" fill="url(#cupula)"/></g>
${brilho(w / 2, sobe + 11, 5.5, C.amarelo, 0.9)}
${txt(w / 2, sobe + 36, r.nome, { tam: 13, peso: 700, anc: "middle", mono: true })}
${desc.map((l, i) => txt(pad, sobe + 58 + i * 14.5, l, { tam: 10.8, cor: C.tinta2 })).join("")}
${metas.join("")}`;

  return painel(w, h, corpo, { defs, titulo: `${r.nome}${r.descricao ? ` · ${r.descricao}` : ""}`, forma });
}

/** Cabeçalho de categoria: o arco de novo, agora como portal de entrada. */
export function cabecalhoCategoria(titulo, quantos) {
  const h = 44;
  const w = Math.round(largura(titulo, 14, 700) + largura(String(quantos), 11, 600) + 92);
  const forma = formaArco(w, h, { sobe: 10, r: 14 });
  const corpo = `
${brilho(26, 25, 7, C.amarelo, 1)}
${txt(42, 30, titulo, { tam: 14, peso: 700 })}
${txt(w - 18, 30, String(quantos), { tam: 11, peso: 600, cor: C.tinta3, anc: "end" })}`;
  return painel(w, h, corpo, { titulo: `${titulo} (${quantos})`, forma });
}

/* ------------------------------------------------------------------- idiomas */

/** Chip de idioma: o seletor no topo de cada README. */
export function chipIdioma(rotulo, ativo) {
  const h = 34;
  const w = Math.round(largura(rotulo, 13, 600) + 34);
  const fundo = ativo ? C.azul : C.papel;
  const cor = ativo ? C.sobreAzul : C.tinta2;
  const borda = ativo ? C.azul : C.linha;
  const ponto = ativo
    ? `<circle cx="15" cy="${h / 2}" r="4" fill="${C.amarelo}"/>`
    : `<circle cx="15" cy="${h / 2}" r="4" fill="none" stroke="${C.tinta3}" stroke-width="1.4"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${rotulo}">
<title>${rotulo}</title>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${fundo}" stroke="${borda}"/>
${ponto}
<text x="26" y="${h / 2 + 4.5}" font-family="${FONTE}" font-size="13" font-weight="600" fill="${cor}">${rotulo}</text>
</svg>
`;
}

/**
 * Faixa de seção. A pílula clara atrás do texto não é enfeite: sem ela o título
 * é tinta escura sobre nada, e some inteiro para quem lê o GitHub no tema
 * escuro. Todo asset aqui carrega o próprio fundo pela mesma razão.
 */
export function faixa(titulo) {
  const h = 50;
  const w = W;
  const larguraPilula = Math.round(largura(titulo, 17, 700) + 62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${titulo}">
<title>${titulo}</title>
<path d="${formaArco(larguraPilula, h, { sobe: 11, r: h / 2.8 })}" fill="${C.papel}" stroke="${C.linha}"/>
${brilho(28, h / 2 + 4, 8.5, C.amarelo, 1)}
<text x="48" y="${h / 2 + 10}" font-family="${FONTE}" font-size="17" font-weight="700" fill="${C.tinta}">${esc(titulo)}</text>
<path d="M${larguraPilula + 12} ${h / 2 + 3} Q${(larguraPilula + w) / 2} ${h / 2 - 2} ${w - 6} ${h / 2 + 3}"
  fill="none" stroke="${C.linha}" stroke-width="1.5" stroke-linecap="round" opacity="0.85"/>
</svg>
`;
}

export { W, MEIA, TERCO, MONO };
