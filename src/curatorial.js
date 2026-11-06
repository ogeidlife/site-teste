'use strict';
// Textos curatoriais iniciais (rascunho redacional). São apenas o PONTO DE PARTIDA: o artista edita tudo em
// Painel → Portfólio → [projeto] → "Texto curatorial" e "Contextualização conceitual".
// Regras seguidas: só descreve o que é visível nas imagens e o posicionamento já informado; não afirma técnicas,
// dimensões, datas exatas, exposições, prêmios ou clientes. Confirme/ajuste interpretações antes de divulgar.
const texts = {
  'pinturas-2023': {
    summary: `Reunião de pinturas de 2023, período em que se inicia a investigação pictórica de orientação neoexpressionista. As composições combinam figuras humanas, cenários urbanos e objetos do cotidiano — grades, viaturas, placas de trânsito, esquinas e vitrines — em campos de cor saturada e contornos marcados.\n\nEntre os trabalhos há cenas de abordagem e vigilância, paisagens de cidade e imagens de caráter onírico, que alternam humor, tensão e ironia.`,
    concept: `Esta série estabelece o vocabulário que atravessa a produção posterior: personagens e símbolos da cultura urbana tratados como matéria pictórica para elaborar experiências pessoais, relações humanas e cotidiano. O gesto expressivo e a cor operam como linguagem, e não como ilustração de um enredo fechado.`,
  },
  'surrealismo-naquim': {
    summary: `Cinco desenhos em preto e branco, de composição fragmentada. Planos geométricos, olhos, máquinas e arquiteturas se sobrepõem em espaços impossíveis, entre o croqui técnico e a cena surreal. O traço constrói volume e profundidade sem recorrer à cor.`,
    concept: `A série investiga o desenho como forma de pensamento: formas que lembram peças de um mecanismo em constante rearranjo. Dialoga com o surrealismo na lógica de associação livre e com o universo gráfico urbano na economia e na firmeza do traço.`,
  },
  'biscuit-e-objetos': {
    summary: `Conjunto de esculturas e objetos tridimensionais: figuras modeladas em cores vivas, algumas apresentadas em caixa de acrílico, um objeto pintado com rolo e uma peça de colagem em relevo, emoldurada.\n\nOs trabalhos transpõem para o espaço os personagens e a paleta do desenho e da pintura.`,
    concept: `A passagem para o volume amplia a pesquisa sobre personagens: figuras que habitam a pintura ganham corpo, escala de mão e presença de objeto, aproximando arte, brinquedo e coleção.`,
  },
  'serie-numerada-2025': {
    summary: `Obras coloridas identificadas, na própria imagem, por numeração (#11, #12 e #15 a #26, entre as registradas). Camadas de cor, riscos e manchas sustentam figuras, rostos e símbolos que emergem do fundo, em formato vertical.`,
    concept: `A numeração sugere uma série em andamento, tratada como processo contínuo e não como conjunto fechado. Cada peça retoma personagens e signos recorrentes em variações de gesto e paleta; a superfície acumula tempo — sobreposições, correções, acasos — e converte o improviso em método.`,
  },
  'obras-em-papel-a3-2026': {
    summary: `Conjunto de obras em papel, em formato vertical, algumas com a indicação “A3” na própria imagem. Manchas de cor e traços lineares sobrepõem figuras, rostos, construções e objetos em composições abertas, de aspecto leve e imediato.`,
    concept: `Em escala de mesa, o trabalho se aproxima do caderno de estudos e do desenho de ateliê: o papel registra decisões rápidas, repetições e desvios. A série prolonga a pesquisa pictórica em um suporte mais direto e portátil, onde símbolos e personagens da cultura urbana aparecem em estado de experimentação.`,
  },
  'quadros': {
    summary: `Pinturas apresentadas como quadros: uma obra emoldurada, de composição recortada em planos de cor com referências à cidade e a trens, e três cenas em que um personagem verde ocupa uma paisagem e interiores, em paleta vibrante e acabamento gráfico.`,
    concept: `O quadro é o ponto de encontro entre a gramática gráfica do artista e a tradição da pintura: planos chapados, contornos e personagens recorrentes são deslocados do papel para um formato de parede, pensado para contemplação e circulação em coleções.`,
  },
  'ogeid-wine': {
    summary: `OGEID WINE é um projeto especial que estende a linguagem gráfica do artista para rótulo, caixa, prints e peças de vestuário. Um personagem esverdeado, de moletom e boné, repete-se em cenas de lazer — deitado na grama, brindando, servindo vinho — sobre um logotipo manuscrito em vinho e verde.\n\nAs imagens registram garrafas, caixas ilustradas, prints e uma fotografia de brinde.`,
    concept: `O projeto desloca a arte para um objeto de consumo e convivência, perguntando como uma identidade visual independente circula fora das galerias — na mesa, no presente, no corpo. Ironia, cultura de rua e ritual social convivem na mesma iconografia.`,
  },
  'vestuario-ogeid': {
    summary: `Peças e acessórios com intervenções gráficas autorais: jaquetas, camiseta, camisas polo, calça, bolsa transversal e ecobag. Os desenhos e as manchas vermelhas aplicados sobre as peças trazem personagens do universo OGEID e são registrados também em ensaios fotográficos.`,
    concept: `O vestuário leva a pesquisa visual para o corpo em circulação: a roupa é suporte e meio de difusão, aproximando arte, streetwear e cultura independente.`,
  },
  'ogeid-rolling-paper': {
    summary: `Embalagens personalizadas de papel de seda (rolling paper) com a marca OGEID. Cada caixa traz lettering em estilo graffiti, em cores vibrantes, e personagens e cenas ilustradas sobre fundo claro.`,
    concept: `Um objeto de uso cotidiano tratado como pequena obra: o lettering, a embalagem e o personagem condensam a estética urbana em um formato portátil e colecionável.`,
  },
  'portfolio-artistico-impresso': {
    summary: `Publicação impressa de portfólio artístico, com capa de composição pintada em cores vibrantes e miolo editorial que alterna desenhos em preto e branco e pinturas coloridas, fotografada em cenário de estúdio.`,
    concept: `O livro funciona ao mesmo tempo como arquivo e como obra: reúne a produção em sequência editorial e aproxima o artista das práticas de publicação independente — zines, revistas e portfólios impressos.`,
  },
  'cartazes-e-pecas-graficas': {
    summary: `Cartazes, adesivos e peças promocionais: composições chapadas e coloridas com personagens, frases e logotipos, incluindo cartazes para circulação, uma folha de adesivos, folhas de agenda de flash e cartelas de uma ação intitulada “OGEID da sorte”.`,
    concept: `A cultura do cartaz e do adesivo — feita para colar, trocar e circular — organiza esta frente de trabalho: o design gráfico como extensão direta do desenho, com humor e ironia na relação entre arte, rua e economia.`,
  },
  'logotipos-e-identidade': {
    summary: `Logotipos, lettering e identidades de coleções e projetos — como os “drops” numerados de flash e a marca OGEID Tattoo — em letras de graffiti, escrita manuscrita e formas gráficas de forte contraste.`,
    concept: `O lettering é a assinatura em movimento: cada drop recebe um logotipo próprio, marcando a passagem do tempo da produção e construindo uma identidade visual reconhecível dentro da cultura independente.`,
  },
  'flash-tattoo-autoral': {
    summary: `Criação contínua de flash tattoos autorais, lançados em séries numeradas (“drops”), em traço preto sobre fundo branco. O repertório mistura personagens, cenas do cotidiano, carros, cidade, símbolos e frases, com humor, ironia e referências à cultura urbana.\n\nCada desenho é identificado por um código e pode ser tatuado mediante agendamento.`,
    concept: `Na prática do artista, a tatuagem ocupa lugar central: o desenho nasce no papel, é publicado como flash e passa a circular no corpo de quem o escolhe. O flash opera entre obra, catálogo e convite, e a cultura de rua fornece o repertório de símbolos que o público reconhece e reinterpreta.`,
  },
};
module.exports = { texts, version: 2 };
