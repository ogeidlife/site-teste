#!/usr/bin/env python3
"""Importa o zip do arquivo (pastas AAAA/MM/arquivo.jpg) para o site.

Uso:  python3 tools/ingest_archive.py CAMINHO_DAS_PASTAS_DOS_ANOS
Ex.:  python3 tools/ingest_archive.py ~/Downloads/2020      (pasta que contém 2020/, 2021/, 2022/, 2024/)

O que faz:
- converte cada imagem para .webp (grande 1600 px + miniatura 520 px) em media/archive-AAAA/{web,thumb}/
- GIFs animados viram .webp animado (720 px); a miniatura é o primeiro quadro
- ignora duplicatas idênticas (mesmo conteúdo) e cópias "cropped-*" geradas pelo WordPress
- ignora PDFs (ficam fora do site; ver manifesto)
- gera archive.json (editável: títulos, textos, capas) preservando o que você já editou
Depois rode:  python3 build.py
"""
import os, re, sys, json, hashlib, unicodedata
from PIL import Image, ImageOps, ImageSequence
Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
WEB, THUMB, ANIM = 1600, 520, 720

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def natural(s): return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s.lower())]
def md5(p):
    h = hashlib.md5()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()

# ---------- 1. varre as pastas ----------
files = []
for y in sorted(d for d in os.listdir(SRC) if d.isdigit() and len(d) == 4):
    for m in sorted(d for d in os.listdir(os.path.join(SRC, y)) if d.isdigit()):
        for f in os.listdir(os.path.join(SRC, y, m)):
            p = os.path.join(SRC, y, m, f)
            if os.path.isfile(p): files.append((y, m, f, p))

manifest = {'ignorados_pdf': [], 'ignorados_cropped': [], 'duplicatas': [], 'erros': []}
keep, seen = [], {}
# ordem de preferência: mês mais antigo, nome sem sufixo -1/-2, nome mais curto
files.sort(key=lambda t: (t[0], t[1], bool(re.search(r'-\d+$', os.path.splitext(t[2])[0])), len(t[2]), t[2]))
for y, m, f, p in files:
    rel = '%s/%s/%s' % (y, m, f)
    ext = os.path.splitext(f)[1].lower()
    if ext == '.pdf': manifest['ignorados_pdf'].append(rel); continue
    if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'): manifest['erros'].append(rel); continue
    if f.lower().startswith('cropped-'): manifest['ignorados_cropped'].append(rel); continue
    h = md5(p)
    if h in seen: manifest['duplicatas'].append({'arquivo': rel, 'igual_a': seen[h]}); continue
    seen[h] = rel; keep.append((y, m, f, p))

# ---------- 2. converte ----------
def fit(im, n):
    im = im.copy(); im.thumbnail((n, n), Image.LANCZOS); return im
def save(im, path, q):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'transparency' in im.info or im.mode in ('LA', 'PA') else 'RGB')
    im.save(path, 'WEBP', quality=q, method=6)

prev = {}
ap = os.path.join(ROOT, 'archive.json')
if os.path.exists(ap):
    old = json.load(open(ap, encoding='utf-8'))
    prev = {i['id']: i for i in old.get('items', [])}
    prev_years = {y['year']: y for y in old.get('years', [])}
else: prev_years = {}

items = []
for y, m, f, p in keep:
    stem = os.path.splitext(f)[0]
    iid = '%s-%s-%s' % (y, m, slug(stem))
    folder = 'archive-%s' % y
    try:
        im = Image.open(p)
        frames = getattr(im, 'n_frames', 1)
        anim = ext = False
        is_gif = f.lower().endswith('.gif')
        anim = is_gif and frames > 1
        im0 = ImageOps.exif_transpose(im.convert('RGBA' if im.mode in ('P', 'LA', 'RGBA') and 'transparency' in im.info or im.mode in ('RGBA', 'LA') else 'RGB')) if not anim else im.convert('RGB')
        wpath = os.path.join(ROOT, 'media', folder, 'web', iid + '.webp')
        tpath = os.path.join(ROOT, 'media', folder, 'thumb', iid + '.webp')
        if anim:
            im.seek(0); first = im.convert('RGB')
            fr, dur = [], []
            for fm in ImageSequence.Iterator(im):
                fr.append(fit(fm.convert('RGB'), ANIM)); dur.append(max(fm.info.get('duration', 40) or 40, 20))
            os.makedirs(os.path.dirname(wpath), exist_ok=True)
            fr[0].save(wpath, 'WEBP', save_all=True, append_images=fr[1:], duration=dur, loop=0, quality=55, method=4)
            w, h = fr[0].size
            save(fit(first, THUMB), tpath, 78)
        else:
            big = fit(im0, WEB); save(big, wpath, 80); w, h = big.size
            save(fit(im0, THUMB), tpath, 76)
        tw, th = Image.open(tpath).size
    except Exception as ex:
        manifest['erros'].append('%s/%s/%s: %s' % (y, m, f, ex)); continue
    low = f.lower()
    tipo = 'Animação' if anim else ('Grafite' if (re.match(r'dsc\d+', low) or low == 'luz.jpg') else 'Arte')
    it = {'id': iid, 'img': '%s/%s' % (folder, iid), 'year': int(y), 'month': int(m), 'tipo': tipo, 'anim': anim,
          'w': w, 'h': h, 'tw': tw, 'th': th, 'orig': '%s/%s/%s' % (y, m, f), 'title': ''}
    if iid in prev: it['title'] = prev[iid].get('title', '')
    items.append(it)
    print('ok', it['orig'], '->', iid, 'anim' if anim else '')

# ordem: ano, mês, data do arquivo, nome natural
def key(it):
    p = os.path.join(SRC, it['orig']); return (it['year'], it['month'], int(os.path.getmtime(p) // 86400), natural(os.path.basename(p)))
items.sort(key=key)
for i, it in enumerate(items, 1): it['n'] = i

# ---------- 3. archive.json ----------
years = []
for y in sorted({i['year'] for i in items}):
    base = prev_years.get(y, {})
    ys = [i for i in items if i['year'] == y]
    years.append({'year': y, 'title': base.get('title', ''), 'text': base.get('text', ''),
                  'cover': base.get('cover') or ys[0]['id']})
out = {'intro': (json.load(open(ap, encoding='utf-8')).get('intro') if os.path.exists(ap) else ''), 'years': years, 'items': items}
json.dump(out, open(ap, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(manifest, open(os.path.join(ROOT, 'tools', 'archive_manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\nImagens no arquivo: %d | duplicatas: %d | cropped: %d | pdf: %d | erros: %d' % (
    len(items), len(manifest['duplicatas']), len(manifest['ignorados_cropped']), len(manifest['ignorados_pdf']), len(manifest['erros'])))
