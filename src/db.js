'use strict';
// Banco SQLite persistente (node:sqlite, embutido no Node >= 22.5). Arquivo: data/ogeid.db
const { DatabaseSync } = require('node:sqlite');
const CUR = require('./curatorial');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
fs.mkdirSync(path.join(DATA, 'uploads'), { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'ogeid.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, sort INTEGER DEFAULT 0, UNIQUE(kind,name));
CREATE TABLE IF NOT EXISTS flash(
  id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, title TEXT DEFAULT '', category TEXT DEFAULT '', style TEXT DEFAULT '',
  size_label TEXT DEFAULT '', dimensions TEXT DEFAULT '', body_place TEXT DEFAULT '', description TEXT DEFAULT '',
  price_cents INTEGER, status TEXT DEFAULT 'disponivel', image TEXT, thumb TEXT, year TEXT DEFAULT '', source_file TEXT DEFAULT '',
  published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT DEFAULT '',
  description TEXT DEFAULT '', price_cents INTEGER, dimensions TEXT DEFAULT '', materials TEXT DEFAULT '',
  status TEXT DEFAULT 'sob_consulta', stock INTEGER, images TEXT DEFAULT '[]', published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0,
  created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, year TEXT DEFAULT '', category TEXT DEFAULT '',
  techniques TEXT DEFAULT '', dimensions TEXT DEFAULT '', summary TEXT DEFAULT '', concept TEXT DEFAULT '',
  images TEXT DEFAULT '[]', videos TEXT DEFAULT '', link_label TEXT DEFAULT '', link_url TEXT DEFAULT '',
  featured INTEGER DEFAULT 0, published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cv_items(
  id INTEGER PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL, institution TEXT DEFAULT '', period TEXT DEFAULT '',
  description TEXT DEFAULT '', sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS bookings(
  id INTEGER PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, name TEXT, contact TEXT, email TEXT, flash_code TEXT,
  custom INTEGER DEFAULT 0, size TEXT, body_place TEXT, date_pref TEXT, description TEXT, refs TEXT DEFAULT '[]',
  status TEXT DEFAULT 'novo', admin_notes TEXT DEFAULT '', consent INTEGER DEFAULT 0, ip_hash TEXT);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, product_code TEXT, product_name TEXT, qty INTEGER DEFAULT 1,
  customization TEXT, notes TEXT, name TEXT, contact TEXT, email TEXT, status TEXT DEFAULT 'nova',
  admin_notes TEXT DEFAULT '', consent INTEGER DEFAULT 0, ip_hash TEXT, payment_ref TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS contacts(
  id INTEGER PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, name TEXT, email TEXT, message TEXT,
  status TEXT DEFAULT 'novo', admin_notes TEXT DEFAULT '', consent INTEGER DEFAULT 0, ip_hash TEXT);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, csrf TEXT, expires INTEGER);
CREATE INDEX IF NOT EXISTS ix_flash_status ON flash(status, published);
`);

const q = {
  all: (s, ...p) => db.prepare(s).all(...p),
  get: (s, ...p) => db.prepare(s).get(...p),
  run: (s, ...p) => db.prepare(s).run(...p),
};
const getSetting = (k, d = '') => { const r = q.get('SELECT value FROM settings WHERE key=?', k); return r ? r.value : d; };
const setSetting = (k, v) => q.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, v ?? '');
const allSettings = () => Object.fromEntries(q.all('SELECT key,value FROM settings').map(r => [r.key, r.value]));

const FLASH_STATUS = { disponivel: 'Disponível', reservado: 'Reservado', tatuado: 'Tatuado / Indisponível', exclusivo: 'Exclusivo' };
const PRODUCT_STATUS = { disponivel: 'Disponível', sob_consulta: 'Sob consulta', encomenda: 'Sob encomenda', esgotado: 'Esgotado' };
const BOOKING_STATUS = { novo: 'Novo', analise: 'Em análise', aguardando: 'Aguardando resposta', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
const ORDER_STATUS = { nova: 'Nova solicitação', negociacao: 'Em negociação', pagamento: 'Aguardando pagamento', producao: 'Em produção', concluida: 'Concluída', cancelada: 'Cancelada' };
const CONTACT_STATUS = { novo: 'Novo', respondido: 'Respondido', arquivado: 'Arquivado' };
const CV_SECTIONS = { biografia: 'Biografia resumida', formacao: 'Formação', cursos: 'Cursos e oficinas', pesquisa: 'Pesquisa artística', linguagens: 'Linguagens e técnicas', projetos: 'Projetos relevantes', exposicoes: 'Exposições e participações', experiencia: 'Experiência profissional', contato: 'Contato profissional' };
const DEFAULT_CATS = {
  portfolio: ['Pintura', 'Desenho', 'Tattoo', 'Escultura', 'Animação', 'Design gráfico', 'Vestuário', 'Projetos especiais'],
  produto: ['Prints', 'Pinturas originais', 'Esculturas', 'Vestuário', 'Colecionáveis', 'Livros e Zines', 'Objetos personalizados', 'Outros produtos'],
};

const slugify = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
const uniqueSlug = (table, base, ignoreId = 0) => {
  let s = slugify(base), n = 1;
  while (q.get(`SELECT id FROM ${table} WHERE slug=? AND id<>?`, s, ignoreId)) s = `${slugify(base)}-${++n}`;
  return s;
};

// ---------- SEED (só roda com o banco vazio) ----------
function seed() {
  if (q.get('SELECT COUNT(*) c FROM settings').c > 0) return;
  const S = {
    site_title: 'OGEID', instagram: 'https://www.instagram.com/ogeid_life/', email: '', whatsapp: '',
    site_url: process.env.SITE_URL || '', cv_pdf: '',
    tagline: 'Artista visual independente — pintura, desenho, tatuagem, escultura, animação e design.',
    about_text: [
      'OGEID é o nome artístico e plataforma criativa de um artista independente cuja produção transita entre artes visuais, tatuagem, desenho, pintura, escultura, animação e design.',
      'Sua pesquisa visual é atravessada pela cultura urbana, pela experimentação gráfica e pela construção de uma linguagem autoral.',
      'Desde 2023, desenvolve uma investigação pictórica de orientação neoexpressionista, utilizando símbolos, personagens e referências da cultura urbana para construir composições que dialogam com experiências pessoais, relações humanas, filosofia e cotidiano.',
      'A tatuagem ocupa um lugar central em sua prática, especialmente por meio da criação contínua de flash tattoos autorais.',
      'Paralelamente, desenvolve projetos independentes que exploram diferentes suportes, materiais e possibilidades de circulação da arte.',
      'Sua produção busca aproximar expressão artística, identidade visual e cultura independente.'].join('\n\n'),
    booking_notice: 'Este formulário envia uma solicitação — não é uma reserva. O artista analisa cada pedido e confirma disponibilidade, valor e data pessoalmente.',
    order_notice: 'Este formulário envia uma solicitação de encomenda. Valores, prazos e forma de pagamento são combinados diretamente com o artista.',
    privacy_text: 'Os dados enviados nos formulários (nome, contato, e-mail e mensagem) são usados apenas para responder à sua solicitação e organizar agendamentos e encomendas. Não são vendidos nem compartilhados com terceiros. Você pode pedir a correção ou a exclusão dos seus dados a qualquer momento, pelos canais de contato do site.',
  };
  S.curatorial_version = String(CUR.version);
  for (const [k, v] of Object.entries(S)) setSetting(k, v);
  for (const [kind, arr] of Object.entries(DEFAULT_CATS)) arr.forEach((n, i) => q.run('INSERT OR IGNORE INTO categories(kind,name,sort) VALUES(?,?,?)', kind, n, i));

  const cv = [
    ['formacao', 'Ensino médio completo', '', '', ''],
    ['formacao', 'Técnica de Comunicação Visual', 'Etec', '', ''],
    ['formacao', 'Criação e Desenvolvimento de Animação', 'Senac', '', ''],
    ['cursos', 'Formação artística complementar', '', '', 'Cursos e oficinas — detalhar título, instituição e ano no painel.'],
    ['pesquisa', 'Investigação pictórica neoexpressionista', '', 'desde 2023', 'Símbolos, personagens e referências da cultura urbana em composições que dialogam com experiências pessoais, relações humanas, filosofia e cotidiano.'],
    ['linguagens', 'Pintura, desenho, tatuagem (flash tattoo), escultura, animação, design gráfico e vestuário', '', '', ''],
  ];
  cv.forEach((r, i) => q.run('INSERT INTO cv_items(section,title,institution,period,description,sort) VALUES(?,?,?,?,?,?)', ...r, i));

  const fp = [path.join(DATA, 'seed.json'), path.join(ROOT, 'data', 'seed.json')].find(p => fs.existsSync(p));
  if (!fp) return;
  const items = JSON.parse(fs.readFileSync(fp, 'utf8')).filter(i => i.status === 'ok');
  const by = Object.fromEntries(items.map(i => [i.src, i]));
  const img = i => ({ web: i.web, thumb: i.thumb, alt: i.code });
  const grp = g => items.filter(i => i.group === g);
  const pick = (...names) => names.map(n => by[n]).filter(Boolean);

  // Flash tattoos: título, preço, dimensões e local do corpo ficam vazios (editáveis no painel).
  let n = 0;
  for (const f of items.filter(i => i.category === 'flash')) {
    q.run(`INSERT INTO flash(code,title,category,style,year,image,thumb,source_file,sort) VALUES(?,?,?,?,?,?,?,?,?)`,
      f.code, '', f.drop || `Flash ${f.year}`, 'Traço preto', String(f.year), f.web, f.thumb, f.src, n++);
    q.run('INSERT OR IGNORE INTO categories(kind,name,sort) VALUES(?,?,?)', 'flash', f.drop || `Flash ${f.year}`, n);
  }

  // Portfólio
  const P = [
    ['Pinturas · 2023', '2023', 'Pintura', grp('pinturas-2023'), 1, 'Conjunto de pinturas e trabalhos sobre papel de 2023, fase inicial da investigação pictórica de orientação neoexpressionista.', 'Símbolos, personagens e referências da cultura urbana compõem cenas que dialogam com experiências pessoais, relações humanas e cotidiano.'],
    ['Surrealismo naquim', '2023', 'Desenho', grp('naquim'), 0, 'Série de cinco desenhos em preto e branco, de composição fragmentada.', ''],
    ['Biscuit e objetos', '2023', 'Escultura', grp('biscuit'), 0, 'Esculturas e objetos tridimensionais, entre modelagem e colagem.', ''],
    ['Série numerada · 2025', '2025', 'Pintura', grp('serie-2025'), 1, 'Obras coloridas identificadas por numeração na própria imagem (#11, #12, #15 a #26, entre as registradas).', 'Cada peça é um campo de símbolos e personagens sobrepostos, construído por camadas.'],
    ['Obras em papel A3 · 2026', '2026', 'Pintura', grp('papeis-a3-2026'), 1, 'Conjunto de obras em papel, algumas com formato A3 indicado na própria imagem.', ''],
    ['Quadros', '2025–2026', 'Pintura', pick('2025/02/prancheta-5.jpg').concat(grp('quadros-2026')), 0, 'Pinturas apresentadas em formato de quadro.', ''],
    ['OGEID WINE', '2026', 'Projetos especiais', grp('wine'), 1, 'Projeto especial que une ilustração, embalagem, prints e vestuário em torno da marca OGEID WINE.', 'Extensão da linguagem gráfica do artista para objetos de circulação cotidiana.'],
    ['Vestuário OGEID', '2023–2026', 'Vestuário', grp('vestuario'), 0, 'Peças e acessórios com intervenções gráficas autorais.', ''],
    ['OGEID Rolling Paper', '2023', 'Projetos especiais', grp('rolling'), 0, 'Embalagens personalizadas com grafismos autorais.', ''],
    ['Portfólio artístico impresso', '2023', 'Design gráfico', grp('publicacao'), 0, 'Publicação impressa de portfólio, com capa pintada e miolo editorial.', ''],
    ['Cartazes e peças gráficas', '2023–2026', 'Design gráfico', grp('cartazes'), 0, 'Cartazes, adesivos e peças promocionais desenvolvidos para circulação independente.', ''],
    ['Logotipos e identidade', '2023–2026', 'Design gráfico', grp('logos'), 0, 'Logotipos, lettering e identidades das coleções (drops) e projetos.', ''],
  ];
  const flashItems = items.filter(i => i.category === 'flash');
  const sample = flashItems.filter((_, i) => i % Math.ceil(flashItems.length / 16) === 0).slice(0, 16);
  P.push(['Flash tattoo autoral', '2023–2026', 'Tattoo', sample, 1, 'Criação contínua de flash tattoos autorais, em traço preto, lançados em séries. Veja o catálogo completo e disponível para agendamento.', 'A tatuagem ocupa um lugar central na prática: o desenho nasce no papel e circula no corpo.']);
  P.forEach((p, i) => {
    if (!p[3].length) return;
    const slug = uniqueSlug('projects', p[0]), cur = CUR.texts[slug] || {};
    q.run(`INSERT INTO projects(slug,title,year,category,summary,concept,images,featured,sort,link_label,link_url) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      slug, p[0], p[1], p[2], cur.summary || p[5], cur.concept || p[6], JSON.stringify(p[3].map(img)), p[4], i,
      p[0] === 'Flash tattoo autoral' ? 'Ver flash tattoos disponíveis' : '', p[0] === 'Flash tattoo autoral' ? '/flash' : '');
  });

  // Catálogo (preço e estoque NÃO informados → "Sob consulta")
  let pi = 0;
  const addProd = (cat, name, imgs, pub = 1) => {
    if (!imgs.length) return; pi++;
    q.run(`INSERT INTO products(code,slug,name,category,images,published,sort) VALUES(?,?,?,?,?,?,?)`,
      `OG-P-${String(pi).padStart(3, '0')}`, uniqueSlug('products', name), name, cat, JSON.stringify(imgs.map(img)), pub, pi);
  };
  ['print1.png', 'print2.png', 'print-copo.png', 'print-grama_.png'].forEach((f, i) => addProd('Prints', `Print OGEID WINE ${String(i + 1).padStart(2, '0')}`, pick('2026/06/' + f)));
  ['quadro1.png', 'quadro2.png', 'quadro3.png'].forEach((f, i) => addProd('Pinturas originais', `Quadro ${String(i + 1).padStart(2, '0')}`, pick('2026/06/' + f)));
  addProd('Vestuário', 'Jaqueta preta OGEID', pick('2026/06/blusa1.jpg', '2026/06/story1.jpg'));
  addProd('Vestuário', 'Camiseta OGEID', pick('2026/06/prancheta-11.jpg'));
  addProd('Vestuário', 'Calça OGEID', pick('2026/06/prancheta-14.jpg'));
  addProd('Vestuário', 'Jaqueta cinza OGEID', pick('2026/06/prancheta-3.jpg', '2026/06/story-2.jpg'));
  addProd('Vestuário', 'Polo azul-marinho OGEID', pick('2026/06/prancheta-5.jpg'));
  addProd('Vestuário', 'Polo vermelha OGEID', pick('2026/06/prancheta-8.jpg'));
  addProd('Colecionáveis', 'Caixa OGEID WINE', pick('2026/06/as2caixas.jpg', '2026/06/prancheta-2.jpg', '2026/06/vinho-1.png'));
  addProd('Livros e Zines', 'Portfólio artístico impresso', grp('publicacao'), 0);   // rascunho: confirme se está à venda
  addProd('Objetos personalizados', 'OGEID Rolling Paper', grp('rolling'), 0);        // rascunho
}

module.exports = { db, q, getSetting, setSetting, allSettings, slugify, uniqueSlug, seed, DATA, ROOT,
  FLASH_STATUS, PRODUCT_STATUS, BOOKING_STATUS, ORDER_STATUS, CONTACT_STATUS, CV_SECTIONS, DEFAULT_CATS };
