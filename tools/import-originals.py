#!/usr/bin/env python3
"""Copia os ORIGINAIS (sem alterar) para media/<categoria>/ conforme data/media-manifest.csv.
uso: python3 tools/import-originals.py <pasta_do_zip_descompactado>
Os originais continuam intactos na pasta de origem; duplicatas exatas e variantes são copiadas para media/_duplicatas/."""
import csv, os, shutil, sys
src = sys.argv[1]; root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = {'flash':'flash-tattoo','pintura':'paintings','desenho':'drawings','escultura':'sculptures','design':'graphic-design','logo':'graphic-design','vestuario':'clothing','projeto':'projects'}
GROUP_PROFILE = {'papeldeparedeogeid'}
n = 0
for r in csv.DictReader(open(os.path.join(root,'data','media-manifest.csv'), encoding='utf-8')):
    rel = r['arquivo_original']; a = os.path.join(src, rel)
    base = rel.replace('/', '-')
    d = '_duplicatas' if r['status'] != 'ok' else DIRS.get(r['categoria'], 'projects')
    if os.path.splitext(os.path.basename(rel))[0] in GROUP_PROFILE: d = 'profile'
    out = os.path.join(root, 'media', d); os.makedirs(out, exist_ok=True)
    if os.path.exists(a): shutil.copy2(a, os.path.join(out, base)); n += 1
for d in ('animations','documents','profile'): os.makedirs(os.path.join(root,'media',d), exist_ok=True)
print(n, 'arquivos copiados para media/ (originais preservados na origem).')
