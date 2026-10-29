/**
 * Ícones de linha, desenhados numa caixa de 32x32 e posicionados por translate.
 * Traço azul porque azul é a cor que aguenta contraste; o amarelo entra só nos
 * pontinhos de destaque, onde não carrega informação nenhuma.
 */
import { C } from "./theme.mjs";

// Funções, não constantes: a paleta pode trocar entre um lote e outro, e uma
// string montada no carregamento do módulo ficaria presa no tema claro.
const T = () => `fill="none" stroke="${C.azul}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;
const P = () => `fill="${C.amarelo}"`;

/** Software: os sinais de maior e menor com a barra no meio. */
const software = () => `
<path d="M10.5 9 L3.5 16 L10.5 23" ${T()}/>
<path d="M21.5 9 L28.5 16 L21.5 23" ${T()}/>
<path d="M18.5 7.5 L13.5 24.5" ${T()}/>`;

/** Pesquisa: lupa com pontos de dado dentro. */
const pesquisa = () => `
<circle cx="14" cy="14" r="9" ${T()}/>
<path d="M20.6 20.6 L28 28" ${T()}/>
<circle cx="10.8" cy="16.4" r="1.5" ${P()}/>
<circle cx="14" cy="12.2" r="1.5" ${P()}/>
<circle cx="17.2" cy="15.2" r="1.5" ${P()}/>`;

/** Educação: livro aberto. */
const educacao = () => `
<path d="M4 8.5 Q10 6 15.5 9.2 L15.5 25 Q10 22 4 24.3 Z" ${T()}/>
<path d="M27 8.5 Q21 6 15.5 9.2 L15.5 25 Q21 22 27 24.3 Z" ${T()}/>`;

/** Jogos: controle em linha fina, sem nada de neon. */
const jogos = () => `
<path d="M9.5 11.5 H22.5 A7 7 0 0 1 22.5 25.5 H9.5 A7 7 0 0 1 9.5 11.5 Z" ${T()}/>
<path d="M9.5 18.5 H15.5 M12.5 15.5 V21.5" ${T()}/>
<circle cx="20.4" cy="16.2" r="1.7" ${P()}/>
<circle cx="23.6" cy="20.2" r="1.7" ${P()}/>`;

export const ICONES = { software, pesquisa, educacao, jogos };

/** Estrela pequena do cabeçalho de seção. */
export function estrela(cx, cy, r, cor = C.amarelo) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 ? r * 0.44 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + raio * Math.cos(a)).toFixed(2)} ${(cy + raio * Math.sin(a)).toFixed(2)}`);
  }
  return `<path d="M${pts.join("L")}Z" fill="${cor}"/>`;
}

/** Sol: substitui a chama do streak. Mesma ideia, outro clima. */
export function sol(cx, cy, r) {
  const raios = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const r1 = r * 1.45;
    const r2 = r * 1.95;
    raios.push(
      `<path d="M${(cx + r1 * Math.cos(a)).toFixed(2)} ${(cy + r1 * Math.sin(a)).toFixed(2)} L${(cx + r2 * Math.cos(a)).toFixed(2)} ${(cy + r2 * Math.sin(a)).toFixed(2)}" stroke="${C.amarelo}" stroke-width="2" stroke-linecap="round"/>`,
    );
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.amarelo}"/>${raios.join("")}`;
}
