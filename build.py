#!/usr/bin/env python3
"""Gera o site estático da OGEID a partir de content.json.
Uso:  python3 build.py
Edite content.json (textos, flashes, produtos, projetos), coloque as imagens em media/ e rode de novo.
"""
import json, os, re, html, shutil
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(ROOT, 'content.json'), encoding='utf-8'))
S = D['settings']
_AP = os.path.join(ROOT, 'archive.json')
A = json.load(open(_AP, encoding='utf-8')) if os.path.exists(_AP) else None
missing = set()

STATUS = {'disponivel': 'Disponível', 'reservado': 'Reservado', 'tatuado': 'Tatuado', 'esgotado': 'Esgotado',
          'exclusivo': 'Exclusivo', 'sob_consulta': 'Sob consulta', 'encomenda': 'Sob encomenda'}
PAGES = {'flash': 'flash.html', 'catalogo': 'catalogo.html', 'portfolio': 'portfolio.html', 'sobre': 'sobre.html', 'contato': 'contato.html', 'arquivo': 'arquivo.html'}

e = lambda s: html.escape(str(s or ''), quote=True)
def paras(t): return ''.join('<p>%s</p>' % e(p).replace('\n', '<br>') for p in str(t or '').split('\n\n') if p.strip())
def wa_digits(): return re.sub(r'\D', '', S.get('whatsapp', ''))
def ig_url(): return S.get('instagram') or ('https://www.instagram.com/%s/' % S.get('handle', ''))

def img_path(ref, kind):  # kind: web | thumb
    folder, name = ref.split('/', 1)
    return 'media/%s/%s/%s.webp' % (folder, kind, name.split('/')[-1]) if folder != 'flash-tattoo' else 'media/flash-tattoo/%s/%s.webp' % (kind, name)
def has(ref): 
    wp = os.path.join(ROOT, img_path(ref, 'web')); ok = os.path.exists(wp) and os.path.getsize(wp) > 500
    if not ok: missing.add(ref)
    return ok

def pic(ref, alt='', label=''):
    if has(ref):
        t = img_path(ref, 'thumb'); tp = os.path.join(ROOT, t); t = t if os.path.exists(tp) and os.path.getsize(tp) > 500 else img_path(ref, 'web')
        return '<img src="%s" alt="%s" loading="lazy" decoding="async">' % (t, e(alt))
    return '<span class="ph">%s</span>' % e(label or alt)

def zoom(ref, alt='', label='', extra=''):
    if not has(ref): return '<span class="ph">%s</span>' % e(label or alt)
    return '<a class="zoom" href="%s" data-full="%s" %s>%s</a>' % (img_path(ref, 'web'), img_path(ref, 'web'), extra, pic(ref, alt, label))

def nav_html(cur):
    out = ''
    for n in S['nav']:
        if not n.get('show', True): continue
        c = ' aria-current="page"' if n['key'] == cur else ''
        out += '<a href="%s"%s>%s</a>' % (PAGES.get(n['key'], '#'), c, e(n['label']))
    return out + '<a class="btn sm" href="contato.html">Solicitar</a>'

def contact_links():
    out = ''
    if wa_digits(): out += '<a href="https://wa.me/%s" target="_blank" rel="noopener">WhatsApp</a>' % wa_digits()
    out += '<a href="%s" target="_blank" rel="noopener">Instagram @%s</a>' % (e(ig_url()), e(S.get('handle')))
    if S.get('email'): out += '<a href="mailto:%s">%s</a>' % (e(S['email']), e(S['email']))
    return out

def layout(cur, title, body, desc=None, file=''):
    full = title if title == S['title'] else '%s — %s' % (title, S['name'])
    foot_nav = ''.join('<a href="%s">%s</a>' % (PAGES[n['key']], e(n['label'])) for n in S['nav'] if n.get('show', True) and n['key'] in PAGES)
    return '''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title><meta name="description" content="%s">
<meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:type" content="website">
<link rel="stylesheet" href="css/style.css"></head>
<body><a class="skip" href="#main">Pular para o conteúdo</a>
<header class="top"><a class="logo" href="index.html" aria-label="%s — início">%s</a>
<button class="burger" data-burger aria-expanded="false" aria-controls="nav">Menu</button>
<nav class="nav" id="nav" aria-label="Principal">%s</nav></header>
<main id="main">%s</main>
<a class="fab" href="contato.html">Solicitar</a>
<footer class="foot"><p class="foot-big" aria-hidden="true">%s</p><div class="foot-cols">
<div><h4>Navegar</h4>%s</div><div><h4>Contato</h4>%s</div><div><h4>Info</h4><a href="privacidade.html">Privacidade</a></div></div>
<p class="copy">%s</p></footer>
<div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Imagem ampliada"><button class="lb-x" aria-label="Fechar">×</button><button class="lb-p" aria-label="Anterior">‹</button><img alt=""><p class="lb-cap" hidden></p><button class="lb-n" aria-label="Próxima">›</button><a class="btn sm lb-req" hidden href="contato.html">Quero este desenho</a></div>
<script src="js/site.js"></script></body></html>''' % (
        e(full), e(desc or S['description']), e(full), e(desc or S['description']), e(S['name']), e(S['name']),
        nav_html(cur), body, e(S['name']), foot_nav, contact_links(), e(S['footerNote']))

def write(name, content):
    with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f: f.write(content)

def badge(st): return '<span class="badge s-%s">%s</span>' % (e(st), e(STATUS.get(st, st)))

def fcard(f):
    t = f.get('title') or ''
    return '''<div class="fcard" data-c="%s" data-k="%s" data-s="%s"><div class="fimg">%s</div>
<div class="fmeta"><span class="code">%s</span>%s</div>%s<a class="link small" href="contato.html?tipo=tattoo&ref=%s">Quero este</a></div>''' % (
        e(f['code'] + ' ' + t), e(f['cat']), e(f['status']),
        zoom(f['img'], t or f['code'], f['code'], 'data-code="%s"' % e(f['code'])),
        e(f['code']), badge(f['status']), ('<div class="ftitle">%s</div>' % e(t)) if t else '', quote(f['code']))

def pcard(p):
    return '''<a class="pcard" href="projeto-%s.html"><div class="pimg">%s</div><div class="pmeta"><span>%s</span><span>%s</span></div><h3>%s</h3></a>''' % (
        e(p['slug']), pic(p['images'][0], p['title'], p['title']) if p['images'] else '', e(p['cat']), e(p['year']), e(p['title']))

def prodcard(p):
    price = '<span class="fprice">%s</span>' % e(p['price']) if p.get('price') else ''
    return '''<a class="fcard" href="produto-%s.html"><div class="fimg">%s</div><div class="fmeta"><span class="code">%s</span>%s</div><div class="ftitle">%s</div>%s</a>''' % (
        e(p['slug']), pic(p['images'][0], p['title'], p['code']) if p['images'] else '', e(p['code']), badge(p['status']), e(p['title']), price)

def order_form(tipo=None, ref='', extra_tipo=False):
    """tipo fixo (tattoo|produto) ou None para escolher."""
    radios = ''
    if not tipo:
        radios = '''<fieldset class="types"><legend>Assunto</legend>
<label class="check"><input type="radio" name="tipo" value="tattoo" checked> Tatuagem</label>
<label class="check"><input type="radio" name="tipo" value="produto"> Encomenda / compra</label>
<label class="check"><input type="radio" name="tipo" value="outro"> Outro assunto</label></fieldset>'''
    t = tipo or 'tattoo'
    hid = '<input type="hidden" name="tipo" value="%s">' % t if tipo else ''
    return '''<form class="form order" data-order %s data-wa="%s" data-email="%s" data-ig="%s" data-handle="%s">
%s%s
<label>Seu nome<input name="nome" required autocomplete="name"></label>
<label>WhatsApp ou e-mail para resposta<input name="contato" autocomplete="off"></label>
<div data-for="tattoo"><label>Código do flash<input name="ref_tattoo" value="%s" placeholder="OG-F-0000"></label>
<div class="two"><label>Região do corpo<input name="regiao" placeholder="ex.: antebraço"></label><label>Tamanho aproximado<input name="tamanho" placeholder="ex.: 10 cm"></label></div></div>
<div data-for="produto"><label>Produto / código<input name="ref_produto" value="%s" placeholder="OG-P-000"></label></div>
<label>Mensagem<textarea name="msg" rows="4"></textarea></label>
<button class="btn" type="submit">Enviar solicitação</button>
<p class="small dim">%s</p>
<div class="alert ok" data-done hidden><strong>Mensagem pronta!</strong> <span data-donetext></span><span data-follow></span></div>
</form>''' % ('data-type="%s"' % tipo if tipo else 'data-default="tattoo"', wa_digits(), e(S.get('email')), e(ig_url()), e(S.get('handle')),
              hid, radios, e(ref if t == 'tattoo' else ''), e(ref if t == 'produto' else ''), e(S['orderNote']))

# ---------------- páginas ----------------
def page_index():
    imgs = [r for r in S.get('heroImages', []) if has(r)]
    hero_art = ''.join('<img class="h%d" src="%s" alt="">' % (i, img_path(r, 'web')) for i, r in enumerate(imgs[:4]))
    flash = D['flash'][:8]
    feat_p = [p for p in D['projects'] if p.get('featured')][:6]
    feat_c = [p for p in D['products']][:4]
    steps = ''.join('<li><b>0%d</b><h3>%s</h3><p>%s</p></li>' % (i + 1, e(s['t']), e(s['d'])) for i, s in enumerate(S['steps']))
    b = '''<section class="hero"><div class="hero-title"><p class="eyebrow">@%s</p><h1 class="mega">%s</h1><p class="lead">%s</p>
<div class="row"><a class="btn" href="flash.html">Ver flashes</a><a class="btn ghost" href="portfolio.html">Portfólio</a></div></div>%s</section>
<section class="wrap intro"><p class="eyebrow">Sobre</p><p class="big">%s</p><a class="link" href="sobre.html">Ler mais</a></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">Flash tattoo</p><h2 class="display">Flashes recentes</h2><a class="link" href="flash.html">Ver todos (%d)</a></div><div class="fgrid">%s</div></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">Portfólio</p><h2 class="display">Projetos</h2><a class="link" href="portfolio.html">Ver todos</a></div><div class="pgrid">%s</div></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">Catálogo</p><h2 class="display">Obras e objetos</h2><a class="link" href="catalogo.html">Ver catálogo</a></div><div class="fgrid four">%s</div></section>
<section class="wrap steps"><div class="sec-head"><p class="eyebrow">Como funciona</p><h2 class="display">Em 3 passos</h2></div><ol>%s</ol></section>
<section class="wrap band"><p class="eyebrow">Contato</p><h2 class="display">%s</h2><p class="lead">%s</p><div class="row"><a class="btn" href="contato.html">Enviar solicitação</a><a class="btn ghost" href="%s" target="_blank" rel="noopener">Instagram</a></div></section>''' % (
        e(S['handle']), e(S['name']), e(S['tagline']), '<div class="hero-art">%s</div>' % hero_art if hero_art else '',
        e(S['bio'][0]), len(D['flash']), ''.join(fcard(f) for f in flash), ''.join(pcard(p) for p in feat_p),
        ''.join(prodcard(p) for p in feat_c), steps, e(S['ctaTitle']), e(S['contactIntro']), e(ig_url()))
    if A: b = b.replace('<section class="wrap steps">', archive_teaser() + '<section class="wrap steps">', 1)
    write('index.html', layout('', S['title'], b))

def page_flash():
    cats = []
    for f in D['flash']:
        if f['cat'] not in cats: cats.append(f['cat'])
    stats = sorted({f['status'] for f in D['flash']})
    status_sel = '' if len(stats) < 2 else '<label>Situação<select name="status"><option value="">Todas</option>%s</select></label>' % ''.join('<option value="%s">%s</option>' % (e(s), e(STATUS.get(s, s))) for s in stats)
    b = '''<section class="wrap"><p class="eyebrow">Flash tattoo</p><h1 class="display">Flashes</h1><p class="lead">%s</p>
<form class="filters" data-filters onsubmit="return false"><label>Buscar código<input name="q" type="search" placeholder="ex.: 0123"></label>
<label>Coleção<select name="cat"><option value="">Todas</option>%s</select></label>%s<a class="link small" href="#" data-clear>Limpar</a><span class="count"></span></form>
<div class="fgrid" data-grid>%s</div><p data-empty hidden>Nenhum desenho encontrado. <a class="link" href="#" data-clear>Limpar filtros</a></p>
<div class="more-wrap"><button class="btn ghost" data-more hidden>Mostrar mais</button></div></section>''' % (
        e(S['flashIntro']), ''.join('<option>%s</option>' % e(c) for c in cats), status_sel, ''.join(fcard(f) for f in D['flash']))
    write('flash.html', layout('flash', 'Flash tattoo', b, S['flashIntro']))

def page_catalogo():
    cats = []
    for p in D['products']:
        if p['cat'] not in cats: cats.append(p['cat'])
    sec = ''.join('<h2 class="h-sm">%s</h2><div class="fgrid four">%s</div>' % (e(c), ''.join(prodcard(p) for p in D['products'] if p['cat'] == c)) for c in cats)
    b = '<section class="wrap"><p class="eyebrow">Catálogo</p><h1 class="display">Catálogo</h1><p class="lead">%s</p>%s</section>' % (e(S['catalogIntro']), sec)
    write('catalogo.html', layout('catalogo', 'Catálogo', b, S['catalogIntro']))

def page_product(i, p):
    prev_ = D['products'][i - 1]; next_ = D['products'][(i + 1) % len(D['products'])]
    gal = ''.join('<div class="gallery-item">%s</div>' % zoom(r, p['title'], p['code']) for r in p['images'])
    specs = '<dt>Código</dt><dd>%s</dd><dt>Categoria</dt><dd>%s</dd><dt>Situação</dt><dd>%s</dd>' % (e(p['code']), e(p['cat']), e(STATUS.get(p['status'], p['status'])))
    price = '<p class="price">%s</p>' % e(p['price']) if p.get('price') else ''
    b = '''<section class="wrap prod"><p class="eyebrow"><a href="catalogo.html">← Catálogo</a></p>
<div class="detail"><div class="d-img"><div class="gallery">%s</div></div><div class="d-info"><h1 class="display sm">%s</h1>%s<div class="prose">%s</div><dl class="specs">%s</dl>
<h2 class="h-sm">Solicitar</h2>%s</div></div>
<div class="prevnext"><a href="produto-%s.html">← %s</a><a href="produto-%s.html">%s →</a></div></section>''' % (
        gal, e(p['title']), price, paras(p.get('desc')), specs, order_form('produto', p['code']), e(prev_['slug']), e(prev_['title']), e(next_['slug']), e(next_['title']))
    write('produto-%s.html' % p['slug'], layout('catalogo', p['title'], b, p.get('desc') or S['catalogIntro']))

def page_portfolio():
    cats = []
    for p in D['projects']:
        if p['cat'] not in cats: cats.append(p['cat'])
    b = '''<section class="wrap"><p class="eyebrow">Portfólio</p><h1 class="display">Portfólio</h1><p class="lead">%s</p>
<div class="pgrid">%s</div></section>''' % (e(S['portfolioIntro']), ''.join(pcard(p) for p in D['projects']))
    if A: b = b[:b.rindex('</section>')] + archive_banner() + '</section>'
    write('portfolio.html', layout('portfolio', 'Portfólio', b, S['portfolioIntro']))

def page_project(i, p):
    prev_ = D['projects'][i - 1]; next_ = D['projects'][(i + 1) % len(D['projects'])]
    gal = ''.join(zoom(r, p['title'], p['title']) for r in p['images'])
    concept = p.get('concept', '')
    link = ''
    if p.get('link'):
        href = p['link']
        if href.startswith('/'):
            base, _, qs = href.partition('?'); mapped = PAGES.get(base.strip('/'))
            href = (mapped + ('?' + qs if qs else '')) if mapped else href
        link = '<p><a class="btn" href="%s">%s</a></p>' % (e(href), e(p.get('linkLabel') or 'Ver mais'))
        concept = concept.replace('Ver flash tattoos disponíveis', '').strip()
    b = '''<section class="wrap"><p class="eyebrow"><a href="portfolio.html">← Portfólio</a></p><h1 class="display sm">%s</h1>
<div class="proj-text"><dl class="specs"><dt>Categoria</dt><dd>%s</dd><dt>Ano</dt><dd>%s</dd><dt>Imagens</dt><dd>%d</dd></dl>
<div class="prose big">%s<h3>Conceito</h3>%s%s</div></div>
<div class="gallery">%s</div>
<div class="prevnext"><a href="projeto-%s.html">← %s</a><a href="projeto-%s.html">%s →</a></div></section>''' % (
        e(p['title']), e(p['cat']), e(p['year']), len(p['images']), paras(p['text']), paras(concept), link, gal,
        e(prev_['slug']), e(prev_['title']), e(next_['slug']), e(next_['title']))
    write('projeto-%s.html' % p['slug'], layout('portfolio', p['title'], b, (p['text'] or '')[:155]))

def page_sobre():
    imgs = [r for r in S.get('aboutImages', []) if has(r)]
    stack = '<div class="stack">%s</div>' % ''.join('<img src="%s" alt="" loading="lazy">' % img_path(r, 'web') for r in imgs) if imgs else ''
    cv = ''
    for sec in D['cv']:
        if not sec['items']: continue
        rows = ''.join('<div class="cv-row"><span class="period">%s</span><div><strong>%s</strong>%s</div></div>' % (e(it.get('period')), e(it['title']), ('<p>%s</p>' % e(it['desc'])) if it.get('desc') else '') for it in sec['items'])
        cv += '<div class="cv-sec"><h2>%s</h2>%s</div>' % (e(sec['title']), rows)
    text = '<div><p class="eyebrow">Sobre</p><h1 class="display sm">%s</h1><div class="prose big">%s</div>%s<div class="row"><a class="btn" href="contato.html">Entrar em contato</a></div></div>' % (e(S['name']), ''.join('<p>%s</p>' % e(x) for x in S['bio']), cv)
    b = '<section class="wrap about %s">%s</section>' % ('split' if imgs else 'narrow', text + stack if imgs else text)
    write('sobre.html', layout('sobre', 'Sobre', b, S['bio'][0]))

def page_contato():
    b = '''<section class="wrap split"><div><p class="eyebrow">Contato</p><h1 class="display sm">%s</h1><p class="lead">%s</p><div class="links">%s</div>
<p class="small dim">Ao enviar, o site prepara a mensagem e abre o WhatsApp ou o Instagram para você finalizar o envio.</p></div>%s</section>''' % (
        e(S['ctaTitle']), e(S['contactIntro']),
        ('<a class="btn" data-ev="whatsapp" target="_blank" rel="noopener" href="https://wa.me/%s">WhatsApp</a>' % wa_digits() if wa_digits() else '') +
        '<a class="btn ghost" target="_blank" rel="noopener" href="%s">Instagram</a>' % e(ig_url()) +
        ('<a class="btn ghost" href="mailto:%s">E-mail</a>' % e(S['email']) if S.get('email') else ''),
        order_form(None))
    write('contato.html', layout('contato', 'Contato', b, S['contactIntro']))

def page_privacy():
    b = '<section class="wrap narrow"><p class="eyebrow">Legal</p><h1 class="display sm">Privacidade</h1><div class="prose">%s</div></section>' % paras(S['privacy'])
    write('privacidade.html', layout('', 'Privacidade', b))

def page_404():
    b = '<section class="wrap narrow"><p class="eyebrow">404</p><h1 class="display">Página não encontrada</h1><p class="lead">O endereço não existe ou foi movido.</p><a class="btn" href="index.html">Voltar ao início</a></section>'
    write('404.html', layout('', 'Não encontrada', b))

def sitemap():
    base = os.environ.get('SITE_URL', '').rstrip('/')
    if not base: return
    urls = [f for f in os.listdir(ROOT) if f.endswith('.html') and f != '404.html']
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</urlset>' % ''.join('<url><loc>%s/%s</loc></url>' % (base, u) for u in sorted(urls)))
    write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % base)

# ---------------- arquivo 2020–2024 ----------------
MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
def mes(m): return MESES[m - 1]
def plural(n, a, b): return '%d %s' % (n, a if n == 1 else b)

def a_items(year=None):
    return [i for i in A['items'] if year is None or i['year'] == year]
def a_by_id(): return {i['id']: i for i in A['items']}
def a_years(): return [y['year'] for y in A['years']]
def a_months(year):
    out = []
    for i in a_items(year):
        if i['month'] not in out: out.append(i['month'])
    return sorted(out)

def a_thumb(it, alt='', eager=False):
    ref = it['img']
    if not has(ref): return '<span class="ph">%s</span>' % e(alt or it['id'])
    t = img_path(ref, 'thumb')
    return '<img src="%s" alt="%s" width="%d" height="%d" loading="%s" decoding="async">' % (t, e(alt), it['tw'], it['th'], 'eager' if eager else 'lazy')

def a_alt(it):
    base = it['title'] or 'Obra do arquivo OGEID'
    return '%s — %s de %d, nº %d' % (base, mes(it['month']), it['year'], it['n'])

def a_cell(it):
    """miniatura da galeria justificada (abre no lightbox)"""
    if not has(it['img']): return ''
    ratio = it['w'] / it['h']; ratio = max(0.45, min(ratio, 2.8))
    cap = '%s · %s de %d · nº %d' % (it['title'] or it['tipo'], mes(it['month']), it['year'], it['n'])
    gif = '<span class="gif">GIF</span>' if it['anim'] else ''
    return ('<a class="zoom jg-i" data-t="%s" data-full="%s" data-cap="%s" href="%s" style="--g:%.1f;--b:%.3f;--r:%.4f">%s<i></i>%s<span class="no">%03d</span></a>' % (
        e(it['tipo']), img_path(it['img'], 'web'), e(cap), img_path(it['img'], 'web'), ratio * 100, ratio, 1 / ratio,
        a_thumb(it, a_alt(it)), gif, it['n']))

def a_stats():
    return {'obras': len(A['items']), 'anos': len(A['years']), 'meses': len({(i['year'], i['month']) for i in A['items']}),
            'anim': len([i for i in A['items'] if i['anim']])}

def year_page_name(y): return 'arquivo-%d.html' % y

def year_tabs(cur):
    t = ''.join('<a href="%s"%s>%d</a>' % (year_page_name(y), ' aria-current="page"' if y == cur else '', y) for y in a_years())
    return '<nav class="tabs ar-tabs" aria-label="Anos do arquivo"><a href="arquivo.html"%s>Todos os anos</a>%s</nav>' % (' aria-current="page"' if cur is None else '', t)

def page_arquivo():
    st = a_stats(); byid = a_by_id()
    ycards = ''
    for y in A['years']:
        n = len(a_items(y['year'])); ms = a_months(y['year'])
        cover = byid.get(y['cover']) or a_items(y['year'])[0]
        ycards += ('<a class="ycard" href="%s"><div class="yimg">%s</div><div class="ynum">%d</div><div class="ymeta"><span>%s</span><span>%s</span></div><h3>%s</h3><p>%s</p><span class="link small">Abrir %d</span></a>' % (
            year_page_name(y['year']), a_thumb(cover, 'Capa do arquivo %d' % y['year'], True), y['year'], plural(n, 'obra', 'obras'),
            plural(len(ms), 'mês', 'meses'), e(y['title']), e(y['text']), y['year']))
    tl = ''
    for y in A['years']:
        rows = ''
        for m in a_months(y['year']):
            its = [i for i in a_items(y['year']) if i['month'] == m]
            step = max(1, len(its) // 6); pick = its[::step][:6]
            thumbs = ''.join('<span class="tt">%s</span>' % a_thumb(i, '') for i in pick if has(i['img']))
            rows += ('<a class="tl-row" href="%s#%d-%02d"><span class="tl-m"><b>%02d</b> %s</span><span class="tl-th">%s</span><span class="tl-n">%s <i aria-hidden="true">→</i></span></a>' % (
                year_page_name(y['year']), y['year'], m, m, e(mes(m)), thumbs, plural(len(its), 'obra', 'obras')))
        tl += '<div class="tl-year"><div class="tl-y"><a href="%s">%d</a><span>%s</span></div><div class="tl-rows">%s</div></div>' % (
            year_page_name(y['year']), y['year'], e(y['title']), rows)
        if y['year'] == 2022:  # 2023 não tem pasta neste arquivo: aponta para o portfólio
            tl += '<div class="tl-year tl-gap"><div class="tl-y"><span class="gap-y">2023</span><span>no Portfólio</span></div><div class="tl-rows"><a class="tl-row" href="portfolio.html"><span class="tl-m">Pinturas, desenhos e projetos de 2023</span><span class="tl-th"></span><span class="tl-n">Ver portfólio <i aria-hidden="true">→</i></span></a></div></div>'
    anim = [i for i in a_items() if i['anim'] and has(i['img'])]
    anim_html = ''
    if anim:
        strip = ''.join('<a class="zoom anim-i" data-full="%s" data-cap="%s" href="%s">%s<span class="gif">GIF</span></a>' % (
            img_path(i['img'], 'web'), e('Animação · %s de %d' % (mes(i['month']), i['year'])), img_path(i['img'], 'web'), a_thumb(i, a_alt(i))) for i in anim)
        anim_html = ('<section class="wrap"><div class="sec-head"><p class="eyebrow">Movimento</p><h2 class="display">Animações</h2><a class="link" href="%s?tipo=Anima%%C3%%A7%%C3%%A3o">Ver as %d animações no ano</a></div><div class="anim-strip" data-lb-group>%s</div></section>' % (
            year_page_name(anim[0]['year']), len(anim), strip))
    art = ''.join('<img class="h%d" src="%s" alt="">' % (k, img_path(byid[y['cover']]['img'], 'web')) for k, y in enumerate(A['years'][:4]) if y['cover'] in byid and has(byid[y['cover']]['img']))
    b = ('<section class="ar-hero"><div class="wrap ar-hero-in"><div><p class="eyebrow">Arquivo</p><h1 class="ar-mega">2020<span>—</span>2024</h1><p class="lead">%s</p>'
         '<dl class="ar-stats"><div><dt>Obras</dt><dd>%d</dd></div><div><dt>Anos</dt><dd>%d</dd></div><div><dt>Meses</dt><dd>%d</dd></div><div><dt>Animações</dt><dd>%d</dd></div></dl></div>'
         + ('<div class="hero-art ar-art" aria-hidden="true">%s</div>' % art if art else '') + '</div></section>'
         '<section class="wrap"><div class="sec-head"><p class="eyebrow">Por ano</p><h2 class="display">Escolha um ano</h2></div><div class="ygrid">%s</div></section>'
         '<section class="wrap"><div class="sec-head"><p class="eyebrow">Mês a mês</p><h2 class="display">Linha do tempo</h2></div><div class="tl">%s</div></section>%s'
         '<section class="wrap band"><p class="eyebrow">Contato</p><h2 class="display">Gostou de algum desenho?</h2><p class="lead">Os flashes e as obras podem ser tatuados, impressos ou encomendados. Fale comigo.</p><div class="row"><a class="btn" href="contato.html">Enviar solicitação</a><a class="btn ghost" href="flash.html">Ver flashes atuais</a></div></section>') % (
        e(A.get('intro') or ''), st['obras'], st['anos'], st['meses'], st['anim'], ycards, tl, anim_html)
    write('arquivo.html', layout('arquivo', 'Arquivo 2020–2024', b, A.get('intro') or S['description']))

def page_arquivo_ano(i, y):
    items = a_items(y['year']); ms = a_months(y['year'])
    tipos = []
    for it in items:
        if it['tipo'] not in tipos: tipos.append(it['tipo'])
    chips = ''
    if len(tipos) > 1:
        chips = '<div class="ar-types" role="group" aria-label="Filtrar por tipo"><button type="button" class="chip" data-tipo="" aria-pressed="true">Tudo <small>%d</small></button>%s<span class="count" data-count aria-live="polite"></span></div>' % (
            len(items), ''.join('<button type="button" class="chip" data-tipo="%s" aria-pressed="false">%s <small>%d</small></button>' % (e(t), e(t), len([x for x in items if x['tipo'] == t])) for t in tipos))
    mnav = ''.join('<a href="#%d-%02d" data-m="%d-%02d">%s <small>%d</small></a>' % (y['year'], m, y['year'], m, e(mes(m)[:3].capitalize()), len([x for x in items if x['month'] == m])) for m in ms)
    secs = ''
    for m in ms:
        its = [x for x in items if x['month'] == m]
        secs += '<section class="ar-month" id="%d-%02d" data-month><header><h2><span>%02d</span> %s</h2><em>%s</em></header><div class="jg">%s</div></section>' % (
            y['year'], m, m, e(mes(m).capitalize()), plural(len(its), 'obra', 'obras'), ''.join(a_cell(x) for x in its))
    yrs = a_years(); k = yrs.index(y['year'])
    prev_ = yrs[k - 1] if k > 0 else None; next_ = yrs[k + 1] if k + 1 < len(yrs) else None
    pn = '<div class="prevnext">%s%s</div>' % (
        '<a href="%s">← %d</a>' % (year_page_name(prev_), prev_) if prev_ else '<a href="arquivo.html">← Arquivo</a>',
        '<a href="%s">%d →</a>' % (year_page_name(next_), next_) if next_ else '<a href="portfolio.html">Portfólio →</a>')
    pool = [x for x in items if not x['anim'] and has(x['img'])]
    pick = [pool[int(k * (len(pool) - 1) / 3)] for k in range(4)] if len(pool) >= 4 else pool
    art = ''.join('<img class="h%d" src="%s" alt="">' % (k, img_path(x['img'], 'web')) for k, x in enumerate(pick))
    b = ('<section class="ar-hero ar-year"><div class="wrap ar-hero-in"><div><p class="eyebrow"><a href="arquivo.html">← Arquivo 2020–2024</a></p><h1 class="ar-mega">%d</h1><p class="ar-title">%s</p><p class="lead">%s</p>'
         '<p class="ar-count">%s · %s</p></div>' + ('<div class="hero-art ar-art" aria-hidden="true">%s</div>' % art if art else '') + '</div></section>'
         '<div class="ar-bar"><div class="ar-bar-in">%s<nav class="ar-months" aria-label="Meses de %d">%s</nav></div></div>'
         '<div class="wrap ar-body" data-lb-group data-archive>%s%s%s</div>') % (
        y['year'], e(y['title']), e(y['text']), plural(len(items), 'obra', 'obras'), plural(len(ms), 'mês', 'meses'),
        year_tabs(y['year']), y['year'], mnav, chips, secs, pn)
    write(year_page_name(y['year']), layout('arquivo', 'Arquivo %d' % y['year'], b, y['text']))

def archive_teaser():
    byid = a_by_id()
    tiles = ''.join('<a class="atile" href="%s"><div class="yimg">%s</div><span class="ynum sm">%d</span><span class="ymeta"><span>%s</span></span></a>' % (
        year_page_name(y['year']), a_thumb(byid.get(y['cover']) or a_items(y['year'])[0], 'Capa do arquivo %d' % y['year']), y['year'], plural(len(a_items(y['year'])), 'obra', 'obras')) for y in A['years'])
    return '<section class="wrap"><div class="sec-head"><p class="eyebrow">Arquivo</p><h2 class="display">2020 — 2024</h2><a class="link" href="arquivo.html">Abrir o arquivo (%d obras)</a></div><div class="agrid">%s</div></section>' % (len(A['items']), tiles)

def archive_banner():
    return '<aside class="ar-banner"><div><p class="eyebrow">Antes de 2023</p><p class="big">Procurando trabalhos anteriores? O arquivo reúne 2020, 2021, 2022 e 2024.</p></div><a class="btn" href="arquivo.html">Abrir o arquivo</a></aside>'

if __name__ == '__main__':
    for f in os.listdir(ROOT):
        if f.endswith('.html'): os.remove(os.path.join(ROOT, f))
    page_index(); page_flash(); page_catalogo(); page_portfolio(); page_sobre(); page_contato(); page_privacy(); page_404()
    for i, p in enumerate(D['products']): page_product(i, p)
    for i, p in enumerate(D['projects']): page_project(i, p)
    if A:
        page_arquivo()
        for i, y in enumerate(A['years']): page_arquivo_ano(i, y)
    sitemap()
    n = len([f for f in os.listdir(ROOT) if f.endswith('.html')])
    print('OK: %d páginas geradas.' % n)
    miss_a = [m for m in missing if m.startswith('archive-')]
    if miss_a: print('ATENÇÃO: %d imagens do arquivo não encontradas em media/.' % len(miss_a))
    if missing: print('Aviso: %d imagens referenciadas não estão em media/ (aparecem como espaço reservado).' % len(missing))
