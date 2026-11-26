"""
Prepara a capa de um projeto a partir de uma captura de tela.

    python profile/capas/preparar.py <repo> <captura.png> [--topo 0.0] [--foco 0.35]

Escreve dois arquivos aqui:

  <repo>.jpg       960x540, 16:9. A página do GitHub Pages usa nos cards e nos cases.
  <repo>.mini.jpg  568x240. Vai embutido em base64 no card SVG do README, que não
                   carrega imagem externa; por isso precisa ser pequeno.

--topo é onde o recorte 16:9 começa na captura (0 = topo, 1 = fundo); captura
de página inteira costuma ter o que interessa em cima. --foco é a altura, dentro
do 16:9, em que a faixa estreita da mini se centra.

O CI não roda isto: só Node, sem dependência. As capas são commitadas prontas.
Precisa de Pillow (pip install pillow).
"""
import argparse
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).parent


def recortar(im, w, h, fy):
    """Recorte w:h que ocupa a largura inteira, começando em fy da sobra vertical."""
    alvo = im.width * h / w
    if alvo > im.height:  # captura mais larga que o alvo: corta dos lados
        larg = im.height * w / h
        x = (im.width - larg) / 2
        return im.crop((round(x), 0, round(x + larg), im.height))
    y = (im.height - alvo) * fy
    return im.crop((0, round(y), im.width, round(y + alvo)))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("repo")
    p.add_argument("captura")
    p.add_argument("--topo", type=float, default=0.0)
    p.add_argument("--foco", type=float, default=0.35)
    a = p.parse_args()

    im = Image.open(a.captura).convert("RGB")
    capa = recortar(im, 16, 9, a.topo).resize((960, 540), Image.LANCZOS)
    capa.save(AQUI / f"{a.repo}.jpg", quality=82, optimize=True, progressive=True)

    mini = recortar(capa, 568, 240, a.foco).resize((568, 240), Image.LANCZOS)
    mini.save(AQUI / f"{a.repo}.mini.jpg", quality=72, optimize=True, progressive=True)

    for f in (f"{a.repo}.jpg", f"{a.repo}.mini.jpg"):
        print(f"{f}: {(AQUI / f).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
