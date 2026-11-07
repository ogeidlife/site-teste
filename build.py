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
missing = set()
A = D.get('archive', [])
ACATS = S.get('archiveCats', {})
MONTHS = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
YEARS = sorted({a['year'] for a in A})

STATUS = {'disponivel': 'Disponível', 'reservado': 'Reservado', 'tatuado': 'Tatuado', 'esgotado': 'Esgotado',
          'exclusivo': 'Exclusivo', 'sob_consulta': 'Sob consulta', 'encomenda': 'Sob encomenda'}
PAGES = {'arquivo': 'arquivo.html', 'flash': 'flash.html', 'catalogo': 'catalogo.html', 'portfolio': 'portfolio.html', 'sobre': 'sobre.html', 'contato': 'contato.html'}

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
<div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Imagem ampliada"><button class="lb-x" aria-label="Fechar">×</button><button class="lb-p" aria-label="Anterior">‹</button><img alt=""><video controls loop muted playsinline hidden></video><button class="lb-n" aria-label="Próxima">›</button><p class="lb-cap"></p><a class="btn sm lb-req" hidden href="contato.html">Quero este desenho</a></div>
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

# ---------------- arquivo (banco de imagens) ----------------
def acode(a): return 'ARQ-%d-%s' % (a['year'], a['id'][-3:])
def aurl(a, k='thumb'): return 'media/arquivo/%s/%s.webp' % (k, a['id'])
def acap(a): return '%s %d · %s' % (MONTHS[a['month']].capitalize(), a['year'], ACATS.get(a['cat'], a['cat']))
def aexists(a): return os.path.exists(os.path.join(ROOT, aurl(a, 'thumb')))
def aimg(a, alt=''):
    return '<img src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">' % (aurl(a), e(alt or acap(a)), a['w'], a['h'])
def acard(a):
    if not aexists(a): return ''
    vid = ' data-video="media/arquivo/anim/%s.mp4"' % a['id'] if a.get('video') else ''
    code = ' data-code="%s"' % acode(a) if a['cat'] == 'flash' else ''
    full = aurl(a, 'thumb') if a.get('video') else aurl(a, 'web')
    play = '<span class="play" aria-hidden="true">▶</span>' if a.get('video') else ''
    return '<figure class="mi rv" data-y="%d" data-k="%s"><a class="zoom" href="%s" data-full="%s"%s%s data-cap="%s">%s%s</a><figcaption><span>%s</span><b>%d</b></figcaption></figure>' % (
        a['year'], e(a['cat']), full, full, vid, code, e(acap(a) + ' · ' + acode(a)), aimg(a), play, e(ACATS.get(a['cat'], a['cat'])), a['year'])
def apick(cat=None, year=None, n=4, portrait=False, offset=0):
    L = [a for a in A if (not cat or a['cat'] in (cat if isinstance(cat, (list, tuple)) else [cat])) and (not year or a['year'] == year) and aexists(a)]
    if portrait: L = [a for a in L if a['h'] >= a['w']] or L
    if not L: return []
    step = max(1, len(L) // n)
    return [L[(offset + i * step) % len(L)] for i in range(n)]
POOL = {'Pintura': ['quadro'], 'Desenho': ['flash'], 'Tattoo': ['flash'], 'Design gráfico': ['logo', 'cartaz'], 'Escultura': ['cartaz'], 'Vestuário': ['cartaz'], 'Projetos especiais': ['cartaz', 'mural']}
def cover_for(p, k=0):
    L = apick(POOL.get(p['cat'], ['cartaz']), None, 12)
    return L[(sum(map(ord, p['slug'])) + k) % len(L)] if L else None
def flash_from_archive(): return [a for a in A if a['cat'] == 'flash' and aexists(a)]
def use_archive_flash(): return sum(1 for f in D['flash'] if os.path.exists(os.path.join(ROOT, img_path(f['img'], 'web')))) < len(D['flash']) * 0.2

def reveal(): return ' rv'
def mini_flash(a):
    return '<div class="fcard rv"><div class="fimg"><a class="zoom" href="%s" data-full="%s" data-code="%s" data-cap="%s">%s</a></div><div class="fmeta"><span class="code">%s</span><span class="badge s-disponivel">Disponível</span></div><a class="link small" href="contato.html?tipo=tattoo&ref=%s">Quero este</a></div>' % (
        aurl(a, 'web'), aurl(a, 'web'), acode(a), e(acap(a) + ' · ' + acode(a)), aimg(a), acode(a), quote(acode(a)))

def pcard(p):
    img = pic(p['images'][0], p['title'], p['title']) if p['images'] and has(p['images'][0]) else ''
    if not img:
        c = cover_for(p); img = aimg(c, p['title']) if c else '<span class="ph">%s</span>' % e(p['title'])
    return '<a class="pcard rv" href="projeto-%s.html"><div class="pimg">%s</div><div class="pmeta"><span>%s</span><span>%s</span></div><h3>%s</h3></a>' % (e(p['slug']), img, e(p['cat']), e(p['year']), e(p['title']))

def page_index():
    imgs = [r for r in S.get('heroImages', []) if has(r)]
    art = ''.join('<img class="h%d" src="%s" alt="">' % (i, img_path(r, 'web')) for i, r in enumerate(imgs[:4]))
    extra = apick(['quadro', 'cartaz'], None, 8, portrait=True)
    for i, a in enumerate(extra[:max(0, 4 - len(imgs))]):
        art += '<img class="h%d" src="%s" alt="" width="%d" height="%d">' % (len(imgs) + i, aurl(a, 'web'), a['w'], a['h'])
    words = ['Pintura', 'Desenho', 'Tatuagem', 'Escultura', 'Animação', 'Design', 'Flash tattoo', 'Cultura de rua']
    mq = ''.join('<span>%s</span><i>✦</i>' % w for w in words) * 2
    stats = [(len(A), 'imagens no arquivo'), (len(YEARS), 'anos de produção'), (len(D['flash']), 'flashes catalogados'), (len(D['projects']), 'projetos')]
    st = ''.join('<div class="stat rv"><b>%s</b><span>%s</span></div>' % (n, e(l)) for n, l in stats)
    yrs = ''
    for y in YEARS[::-1]:
        L = [a for a in A if a['year'] == y and aexists(a)]
        cv = (apick(['cartaz', 'quadro', 'mural'], y, 1) or L[:1])
        yrs += '<a class="ycard rv" href="arquivo.html#%d"><div class="yimg">%s</div><div class="ytxt"><b>%d</b><span>%d imagens</span></div></a>' % (y, aimg(cv[0]) if cv else '', y, len(L))
    if use_archive_flash():
        fl = ''.join(mini_flash(a) for a in flash_from_archive()[:8]); total = len(flash_from_archive())
    else:
        fl = ''.join(fcard(f) for f in D['flash'][:8]); total = len(D['flash'])
    feat_p = [p for p in D['projects'] if p.get('featured')][:6]
    mosaic = ''.join(acard(a) for a in apick(None, None, 12, offset=3))
    steps = ''.join('<li class="rv"><b>0%d</b><h3>%s</h3><p>%s</p></li>' % (i + 1, e(s_['t']), e(s_['d'])) for i, s_ in enumerate(S['steps']))
    b = f"""<section class="hero"><div class="hero-title"><p class="eyebrow">@{e(S['handle'])} · 2020 — 2026</p><h1 class="mega">{e(S['name'])}</h1><p class="lead">{e(S['tagline'])}</p>
<div class="row"><a class="btn" href="flash.html">Ver flashes</a><a class="btn ghost" href="arquivo.html">Explorar o arquivo</a></div></div>{'<div class="hero-art">%s</div>' % art if art else ''}</section>
<div class="marquee" aria-hidden="true"><div>{mq}</div></div>
<section class="wrap stats">{st}</section>
<section class="wrap intro"><p class="eyebrow">01 — Sobre</p><p class="big">{e(S['bio'][0])}</p><a class="link" href="sobre.html">Ler mais</a></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">02 — Linha do tempo</p><h2 class="display">Arquivo por ano</h2><a class="link" href="arquivo.html">Ver tudo ({len(A)})</a></div><div class="years">{yrs}</div></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">03 — Flash tattoo</p><h2 class="display">Flashes</h2><a class="link" href="flash.html">Ver todos ({total})</a></div><div class="fgrid">{fl}</div></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">04 — Portfólio</p><h2 class="display">Projetos</h2><a class="link" href="portfolio.html">Ver todos</a></div><div class="pgrid">{''.join(pcard(p) for p in feat_p)}</div></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">05 — Do arquivo</p><h2 class="display">Seleção</h2><a class="link" href="arquivo.html">Abrir arquivo</a></div><div class="masonry mini">{mosaic}</div></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">06 — Catálogo</p><h2 class="display">Obras e objetos</h2><a class="link" href="catalogo.html">Ver catálogo</a></div><div class="fgrid four">{''.join(prodcard(p) for p in D['products'][:4])}</div></section>
<section class="wrap steps"><div class="sec-head"><p class="eyebrow">Como funciona</p><h2 class="display">Em 3 passos</h2></div><ol>{steps}</ol></section>
<section class="wrap band"><p class="eyebrow">Contato</p><h2 class="display">{e(S['ctaTitle'])}</h2><p class="lead">{e(S['contactIntro'])}</p><div class="row"><a class="btn" href="contato.html">Enviar solicitação</a><a class="btn ghost" href="{e(ig_url())}" target="_blank" rel="noopener">Instagram</a></div></section>"""
    write('index.html', layout('', S['title'], b))

def page_arquivo():
    yc = ''.join('<button class="chip" data-y="%d">%d <small>%d</small></button>' % (y, y, sum(1 for a in A if a['year'] == y)) for y in YEARS)
    kc = ''.join('<button class="chip" data-k="%s">%s <small>%d</small></button>' % (k, e(v), sum(1 for a in A if a['cat'] == k)) for k, v in ACATS.items() if any(a['cat'] == k for a in A))
    items = ''.join(acard(a) for a in A)
    b = f"""<section class="wrap"><p class="eyebrow">Arquivo</p><h1 class="display">Arquivo</h1><p class="lead">{e(S.get('archiveIntro', ''))}</p>
<div class="archbar" data-archive-bar><div class="chips" role="group" aria-label="Ano"><button class="chip on" data-y="">Todos <small>{len(A)}</small></button>{yc}</div>
<div class="chips" role="group" aria-label="Tipo"><button class="chip on" data-k="">Tudo</button>{kc}</div><span class="count" data-acount></span></div>
<div class="masonry" data-archive>{items}</div><p data-empty hidden>Nada encontrado com esse filtro.</p>
<div class="more-wrap"><button class="btn ghost" data-amore hidden>Mostrar mais</button></div></section>"""
    write('arquivo.html', layout('arquivo', 'Arquivo', b, S.get('archiveIntro')))

def page_flash():
    cats = []
    if use_archive_flash():
        L = flash_from_archive(); grid = ''.join(mini_flash(a).replace('class="fcard rv"', 'class="fcard rv" data-c="%s" data-k="%d" data-s="disponivel"' % (acode(a), a['year'])) for a in L)
        opts = ''.join('<option>%d</option>' % y for y in sorted({a['year'] for a in L}, reverse=True)); label = 'Ano'
        note = '<p class="small dim">Desenhos do arquivo (%d–%d). Cada um tem um código — use-o ao solicitar.</p>' % (min(a['year'] for a in L), max(a['year'] for a in L))
    else:
        for f in D['flash']:
            if f['cat'] not in cats: cats.append(f['cat'])
        grid = ''.join(fcard(f) for f in D['flash']); opts = ''.join('<option>%s</option>' % e(c) for c in cats); label = 'Coleção'; note = ''
    b = f"""<section class="wrap"><p class="eyebrow">Flash tattoo</p><h1 class="display">Flashes</h1><p class="lead">{e(S['flashIntro'])}</p>{note}
<form class="filters" data-filters onsubmit="return false"><label>Buscar código<input name="q" type="search" placeholder="ex.: 045"></label>
<label>{label}<select name="cat"><option value="">Todos</option>{opts}</select></label><a class="link small" href="#" data-clear>Limpar</a><span class="count"></span></form>
<div class="masonry flashm" data-grid>{grid}</div><p data-empty hidden>Nenhum desenho encontrado. <a class="link" href="#" data-clear>Limpar filtros</a></p>
<div class="more-wrap"><button class="btn ghost" data-more hidden>Mostrar mais</button></div></section>"""
    write('flash.html', layout('flash', 'Flash tattoo', b, S['flashIntro']))

def page_portfolio():
    b = '<section class="wrap"><p class="eyebrow">Portfólio</p><h1 class="display">Portfólio</h1><p class="lead">%s</p><div class="pgrid">%s</div></section>' % (e(S['portfolioIntro']), ''.join(pcard(p) for p in D['projects']))
    write('portfolio.html', layout('portfolio', 'Portfólio', b, S['portfolioIntro']))

def page_project(i, p):
    prev_ = D['projects'][i - 1]; next_ = D['projects'][(i + 1) % len(D['projects'])]
    real = [r for r in p['images'] if has(r)]
    if real:
        gal = '<div class="gallery">%s</div>' % ''.join(zoom(r, p['title'], p['title']) for r in real)
    else:
        rel = apick(POOL.get(p['cat'], ['cartaz']), None, 12)
        gal = '<h2 class="h-sm">Do arquivo</h2><div class="masonry mini">%s</div>' % ''.join(acard(a) for a in rel)
    concept = p.get('concept', ''); link = ''
    if p.get('link'):
        href = p['link']; href = PAGES.get(href.strip('/'), href) if href.startswith('/') else href
        link = '<p><a class="btn" href="%s">%s</a></p>' % (e(href), e(p.get('linkLabel') or 'Ver mais'))
        concept = concept.replace('Ver flash tattoos disponíveis', '').strip()
    b = f"""<section class="wrap"><p class="eyebrow"><a href="portfolio.html">← Portfólio</a></p><h1 class="display sm">{e(p['title'])}</h1>
<div class="proj-text"><dl class="specs"><dt>Categoria</dt><dd>{e(p['cat'])}</dd><dt>Ano</dt><dd>{e(p['year'])}</dd></dl>
<div class="prose big">{paras(p['text'])}<h3>Conceito</h3>{paras(concept)}{link}</div></div>{gal}
<div class="prevnext"><a href="projeto-{e(prev_['slug'])}.html">← {e(prev_['title'])}</a><a href="projeto-{e(next_['slug'])}.html">{e(next_['title'])} →</a></div></section>"""
    write('projeto-%s.html' % p['slug'], layout('portfolio', p['title'], b, (p['text'] or '')[:155]))

def page_sobre():
    imgs = [r for r in S.get('aboutImages', []) if has(r)]
    stack = ''.join('<img src="%s" alt="" loading="lazy">' % img_path(r, 'web') for r in imgs)
    if not stack: stack = ''.join('<img src="%s" alt="" width="%d" height="%d" loading="lazy">' % (aurl(a, 'web'), a['w'], a['h']) for a in apick(['quadro', 'cartaz'], None, 6, portrait=True)[:3])
    stack = '<div class="stack">%s</div>' % stack if stack else ''
    cv = ''
    for sec in D['cv']:
        if not sec['items']: continue
        rows = ''.join('<div class="cv-row"><span class="period">%s</span><div><strong>%s</strong>%s</div></div>' % (e(it.get('period')), e(it['title']), ('<p>%s</p>' % e(it['desc'])) if it.get('desc') else '') for it in sec['items'])
        cv += '<div class="cv-sec"><h2>%s</h2>%s</div>' % (e(sec['title']), rows)
    tl = ''.join('<a class="trow" href="arquivo.html#%d"><b>%d</b><span>%d imagens · %s</span></a>' % (y, y, sum(1 for a in A if a['year'] == y), ', '.join(sorted({ACATS.get(a['cat'], '') for a in A if a['year'] == y}))) for y in YEARS[::-1])
    tl = '<div class="cv-sec"><h2>Produção por ano</h2>%s</div>' % tl if A else ''
    text = '<div><p class="eyebrow">Sobre</p><h1 class="display sm">%s</h1><div class="prose big">%s</div>%s%s<div class="row"><a class="btn" href="contato.html">Entrar em contato</a></div></div>' % (e(S['name']), ''.join('<p>%s</p>' % e(x) for x in S['bio']), tl, cv)
    b = '<section class="wrap about %s">%s</section>' % ('split' if stack else 'narrow', text + stack)
    write('sobre.html', layout('sobre', 'Sobre', b, S['bio'][0]))

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

if __name__ == '__main__':
    for f in os.listdir(ROOT):
        if f.endswith('.html'): os.remove(os.path.join(ROOT, f))
    page_index(); page_arquivo(); page_flash(); page_catalogo(); page_portfolio(); page_sobre(); page_contato(); page_privacy(); page_404()
    for i, p in enumerate(D['products']): page_product(i, p)
    for i, p in enumerate(D['projects']): page_project(i, p)
    sitemap()
    n = len([f for f in os.listdir(ROOT) if f.endswith('.html')])
    print('OK: %d páginas geradas.' % n)
    if missing: print('Aviso: %d imagens referenciadas não estão em media/ (aparecem como espaço reservado).' % len(missing))
