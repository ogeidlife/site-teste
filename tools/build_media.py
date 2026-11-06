#!/usr/bin/env python3
"""Classifica o acervo (zip descompactado), detecta duplicatas, gera versões web/miniaturas
em public/media/<categoria>/{web,thumb} e escreve data/seed.json + data/media-manifest.csv.
NUNCA altera nem apaga os arquivos originais.
uso: python3 tools/build_media.py <pasta_do_zip_descompactado>"""
import os, sys, json, hashlib, csv, colorsys
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = None
SRC = sys.argv[1] if len(sys.argv) > 1 else 'acervo'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'media')

def ext(y, m, names): return {f'{y}/{m}/{n}' for n in names.split()}

PAINT = (ext('2023','01','more_smoke_style.jpg mundodeilusoes.jpg neuroniosogeid1.jpg neuroniosogeid2.jpg prejecaoilegal.jpg presonapaisagem.jpg quebrandoregras.jpg sempreprotegido.jpg sobrevida.jpg takeiteasy.jpg verdades-amareladas.jpg')
 | ext('2023','11','1.jpg 2.jpg 3.jpg o-mapa.jpg') | ext('2023','12','adiantado.jpg conexoes.jpg conflitos.jpg faimilia.jpg habitospessoais.jpg sem-titulo-3.jpg'))
PAINT_FRAMED = {'2025/02/prancheta-5.jpg'}
SERIE25 = ext('2025','09','prancheta-1.jpg prancheta-1-1.jpg prancheta-1-2.jpg prancheta-4.jpg prancheta-5.jpg prancheta-6-1.jpg prancheta-9-1.jpg prancheta-11-1.jpg prancheta-15.jpg prancheta-16.jpg prancheta-21.jpg prancheta-26.jpg 1.jpg 6.jpg')
PAPEIS26 = {f'2026/07/{n}.png' for n in 'prancheta-1-1 prancheta-1-2 prancheta-1-3 prancheta-1-4 prancheta-1-5 prancheta-1-6 prancheta-10 prancheta-11 prancheta-12 prancheta-2-1 prancheta-2-2 prancheta-2 prancheta-3-1 prancheta-3 prancheta-4-1 prancheta-4 prancheta-5-1 prancheta-5 prancheta-6-1 prancheta-6 prancheta-7-1 prancheta-7 prancheta-8 prancheta-9'.split()}
QUADROS = ext('2026','06','quadro1.png quadro2.png quadro3.png')
NAQUIM = ext('2023','01','surrealismonaquim.jpg surrealismonaquim2.jpg surrealismonaquim3.jpg surrealismonaquim4.jpg surrealismonaquim5.jpg')
BISCUIT = ext('2023','01','biscuitogeid.jpg biscuitogeidvicthoria.jpg resultadoespontaneo.jpg') | ext('2023','03','img_8006.jpg victhoriaxogeid.jpg')
CLOTH_26 = ext('2026','06','blusa1.jpg prancheta-11.jpg prancheta-14.jpg prancheta-3.jpg prancheta-5.jpg prancheta-8.jpg story-2.jpg story1.jpg')
CLOTH_23 = ext('2023','03','2.jpg foto1.jpg')
WINE = ext('2026','06','as2caixas.jpg prancheta-2.jpg prancheta-9.jpg vinho.png vinho-1.png print-copo.png print-grama_.png print1.png print2.png')
ROLLING = ext('2023','04','ogeidduck.jpg pontual.jpg sedagarfil.jpg weedforever.jpg')
PUBLIC = ext('2023','03','revistacomcenario.jpg')
POSTERS = (ext('2025','05','makemoney.jpg prancheta-11.jpg prancheta-12.jpg prancheta-9-1.jpg prancheta-9-copiar.jpg print-abril.jpg sem-titulo-1.jpg sem-titulo-1-1.jpg sem-titulo-1-2.jpg sem-titulo-1-3.jpg')
 | ext('2025','07','prancheta-1-2.jpg') | ext('2026','03','prancheta-2-2.jpg') | ext('2023','09','agenda.jpg flashsetembro.jpg'))
LOGOS_EXTRA = ext('2023','03','papeldeparedeogeid.jpg cropped-papeldeparedeogeid.jpg') | ext('2023','12','ogeidtattoo.jpg') | ext('2026','06','logo-1.png') | ext('2025','05','logosit.png') | ext('2026','07','sem-titulo-1.png')
NEAR_DUP = {  # variante -> mantida
 '2025/07/prancheta-4-copiar.jpg': '2025/07/prancheta-2.jpg',
 '2023/03/cropped-papeldeparedeogeid.jpg': '2023/03/papeldeparedeogeid.jpg',
 '2023/03/teste-logodrop13-1.png': '2023/03/teste-logodrop13.png',
 '2023/03/teste-logodrop13-2.png': '2023/03/teste-logodrop13.png',
 '2023/03/teste-logodrop13-3.png': '2023/03/teste-logodrop13.png',
 '2023/04/drop14sitelogo-edited-1.png': '2023/04/drop14sitelogo.png',
}
# a coleção "Drop N" só é atribuída quando a própria pasta traz o logotipo do drop
DROPS = {'2023/03':'Drop 13','2023/04':'Drop 14','2023/05':'Drop 15','2023/06':'Drop 16','2023/07':'Drop 17','2023/08':'Drops 18–19','2023/09':'Drops 20–21','2023/10':'Drop 21','2023/12':'Drop 24'}
# Arquivos com o NOME CIVIL escrito na própria imagem: omitidos do site (o original permanece intacto no acervo).
# A exclusão vale também para qualquer duplicata exata (mesmo conteúdo) desses arquivos.
EXCLUDE_NOME_CIVIL = ext('2023','03','capa.jpg capaapoiada.jpg capainsta.jpg cropped-capa.jpg nomecapa.png') | ext('2025','05','adesibo.jpg')
DIRS = {'flash':'flash-tattoo','pintura':'paintings','desenho':'drawings','escultura':'sculptures','design':'graphic-design','vestuario':'clothing','projeto':'projects','logo':'graphic-design','revisar':'drawings'}

def sat(img):
    im = img.convert('RGBA'); bg = Image.new('RGBA', im.size, (255,255,255,255)); bg.alpha_composite(im)
    t = bg.convert('RGB').resize((64,64)); px = list(t.getdata())
    return sum(colorsys.rgb_to_hsv(r/255,g/255,b/255)[1] for r,g,b in px)/len(px)

def classify(k, img):
    base = os.path.basename(k).lower()
    if k in NAQUIM: return 'desenho','naquim'
    if k in PAINT: return 'pintura','pinturas-2023'
    if k in PAINT_FRAMED: return 'pintura','pintura-emoldurada'
    if k in SERIE25: return 'pintura','serie-2025'
    if k in PAPEIS26: return 'pintura','papeis-a3-2026'
    if k in QUADROS: return 'pintura','quadros-2026'
    if k in BISCUIT: return 'escultura','biscuit'
    if k in CLOTH_26 or k in CLOTH_23: return 'vestuario','vestuario'
    if k in WINE: return 'projeto','wine'
    if k in ROLLING: return 'projeto','rolling'
    if k in PUBLIC: return 'projeto','publicacao'
    if k in POSTERS: return 'design','cartazes'
    if k in LOGOS_EXTRA or 'logo' in base or base.startswith('drop'): return 'logo','logos'
    if k.endswith('.png') and img.width/img.height > 2.2: return 'logo','logos'
    return ('flash','traco') if sat(img) < 0.10 else ('revisar','cor')

def main():
    inv = []
    for r, _, fs in os.walk(SRC):
        for f in fs:
            if not f.lower().endswith(('.jpg','.jpeg','.png')): continue
            p = os.path.join(r, f); rel = os.path.relpath(p, SRC).replace(os.sep, '/')
            inv.append((rel, p, hashlib.sha256(open(p,'rb').read()).hexdigest()))
    inv.sort()
    excl_sha = {h for rel, p, h in inv if rel in EXCLUDE_NOME_CIVIL}
    first, items = {}, []
    for rel, p, h in inv:
        y, m = rel.split('/')[:2]
        im = ImageOps.exif_transpose(Image.open(p)); w, hh = im.size
        row = dict(src=rel, sha=h, w=w, h=hh, year=int(y), month=int(m), bytes=os.path.getsize(p))
        if h in excl_sha: row.update(status='omitida-nome-civil'); items.append(row); continue
        if h in first: row.update(status='duplicata-exata', of=first[h]); items.append(row); continue
        first[h] = rel
        if rel in NEAR_DUP: row.update(status='variante', of=NEAR_DUP[rel]); items.append(row); continue
        cat, grp = classify(rel, im)
        row.update(status='ok', category=cat, group=grp)
        if cat == 'flash': row['drop'] = DROPS.get(f'{y}/{m}')
        items.append(row)
    prefix = {'flash':'OG-F','pintura':'OG-A','desenho':'OG-D','escultura':'OG-E','design':'OG-G','vestuario':'OG-V','projeto':'OG-J','logo':'OG-L','revisar':'OG-R'}
    cnt = {}
    for it in items:
        if it['status'] != 'ok': continue
        c = it['category']; cnt[c] = cnt.get(c,0)+1; it['code'] = f"{prefix[c]}-{cnt[c]:04d}"
    by = {i['src']: i for i in items}
    for it in items:
        if it['status'] in ('duplicata-exata', 'variante'): it['code'] = by[it['of']].get('code')
    for it in items:
        if it['status'] != 'ok': continue
        d = DIRS[it['category']]
        for sub in ('web','thumb'): os.makedirs(os.path.join(OUT,d,sub), exist_ok=True)
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, it['src'])))
        im = im.convert('RGBA' if im.mode in ('RGBA','LA','P') else 'RGB')
        for sub, mx, q in (('web',1600,82),('thumb',520,76)):
            t = im.copy(); t.thumbnail((mx,mx), Image.LANCZOS)
            fn = f"{it['code'].lower()}.webp"
            t.save(os.path.join(OUT,d,sub,fn), 'WEBP', quality=q, method=5)
            it[sub] = f"/media/{d}/{sub}/{fn}"
    json.dump(items, open(os.path.join(ROOT,'data','seed.json'),'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT,'data','media-manifest.csv'),'w',newline='',encoding='utf-8') as f:
        wr = csv.writer(f); wr.writerow(['arquivo_original','status','duplicata_ou_variante_de','codigo','categoria','grupo','largura','altura','web','miniatura'])
        for it in items: wr.writerow([it['src'],it['status'],it.get('of',''),it.get('code',''),it.get('category',''),it.get('group',''),it['w'],it['h'],it.get('web',''),it.get('thumb','')])
    from collections import Counter
    print(sorted(Counter((i['status'], i.get('category')) for i in items).items(), key=str))
    print('revisar:', [i['src'] for i in items if i.get('category')=='revisar'])

main()
