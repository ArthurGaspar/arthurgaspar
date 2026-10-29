# Como o perfil é montado

Os três READMEs da raiz e tudo em `assets/` são **gerados**. Não edite nenhum
deles à mão: a próxima execução sobrescreve. Edite os arquivos desta pasta.

```
profile/strings.json    toda a prosa, nos três idiomas
profile/featured.json   quais repos aparecem, e em que ordem
profile/tools.json      as badges de ferramenta (shields.io)
profile/theme.mjs       cores, fonte, medida de texto
profile/icons.mjs       os ícones de linha
profile/render.mjs      os desenhos
profile/github.mjs      as consultas à API
profile/generate.mjs    junta tudo e escreve os READMEs
profile/verificar.mjs   confere o resultado antes de virar commit
```

O motivo de os três idiomas saírem de um template só: enquanto cada um era um
arquivo editado à mão, o português ficou para trás e o espanhol nunca chegou a
existir. Agora não há caminho em que eles divirjam: só `strings.json` tem prosa.

## Rodar

```bash
node profile/generate.mjs --fixture   # dados de exemplo, offline, para ver o visual
node profile/verificar.mjs            # confere referências e fechamento dos SVGs
node profile/generate.mjs             # dados ao vivo, precisa de token no ambiente
```

O `--fixture` existe para dar pra conferir o layout sem gastar chamada de API e
sem token. Ele marca o rodapé do README com `· fixture`, para esse resultado
nunca ser confundido com o real.

## O token

O `GITHUB_TOKEN` que o Actions injeta só enxerga este repositório, então com ele
as linguagens e as contribuições saem só dos repos públicos.

Para incluir os privados, crie um **PAT clássico** com escopo `repo` +
`read:user` e salve em *Settings → Secrets and variables → Actions* com o nome
`PERFIL_TOKEN`. Sem o secret nada quebra: a geração cai para público e o próprio
README passa a dizer "repositórios públicos" em vez de "públicos e privados",
para o número não parecer o que não é.

Dos repos privados sai **só o total de bytes por linguagem**. Nome, descrição e
quantidade de repositório privado não entram em lugar nenhum do que é publicado.

## Por que o commit é do bot

O workflow commita como `github-actions[bot]`, nunca com o PAT. Commit assinado
com o PAT contaria como contribuição sua, e aí o gráfico de contribuição logo
acima passaria a medir o próprio workflow rodando todo dia em vez do seu
trabalho. O PAT serve para **ler** a API e nada mais.

## Os dois temas

Cada asset é desenhado duas vezes, em `nome.svg` e `nome.dark.svg`, e o README
escolhe com `<picture>` + `prefers-color-scheme`, que o GitHub suporta.

A troca é feita por `aplicarTema("claro" | "escuro")`, que muda a paleta em
vigor. É estado global mutável de propósito: assim nenhuma função de desenho
precisa receber tema. O preço é que **cor nenhuma pode ser literal no desenho, e
nenhuma string pode ser montada no carregamento do módulo**: foi exatamente o
que aconteceu com as nuvens, fixas em `#FFFFFF`, e com os ícones, que montavam o
traço uma vez só e ficavam presos no tema claro.

A primeira tentativa foi painel claro único, servindo os dois temas. No claro
funcionou; no escuro os painéis pareciam adesivos colados sobre a página.

## Regras de cor

Saíram do validador de paleta, não do olho:

- `#FFC927` tem **1,74:1** contra o papel claro e **11,23:1** contra o escuro.
  Por isso ele troca de papel entre os temas: no claro é só forma e brilho, e
  quem carrega número é `#B07500`; no escuro ele pode ser texto.
- As duas rampas azuis são monotônicas em luminosidade: a clara escurece, a
  escura clareia.
- Toda barra e célula leva rótulo em texto: a cor nunca é o único portador.
- `sobreAzul` é a cor que vai por cima do azul cheio. Ela existe porque branco
  sobre o azul do tema escuro dá 2,4:1.

## A métrica das linguagens

`pesoPorRepo: true` faz cada repositório valer 1 e dividir esse 1 entre as suas
linguagens. Com byte cru, a primeira rodada real devolveu **TeX 37,8%** e
**TypeScript 1,5%**: uma tese em LaTeX e pastas de HTML enterraram todo o resto.
Byte mede tamanho de arquivo, não ofício.

## Limites conhecidos

- A descrição de cada card vem de `desc` no `featured.json`, por idioma. Quando
  não existe, cai para a descrição do GitHub, que é campo único e aparece igual
  nos três idiomas.
- Só o `README.md` da raiz aparece na página do perfil. As versões pt-BR e es são
  alcançadas pelo seletor de idioma no topo.
- O SVG é servido como imagem: fonte externa não carrega, por isso tudo usa a
  fonte do sistema e cada layout reserva folga em vez de encostar no limite.
