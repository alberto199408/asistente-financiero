#!/usr/bin/env python3
"""Genera el ícono de la app (normal, redondo y adaptable) para Android desde www/img/logo.png.
Uso: python3 scripts/iconos.py <carpeta res de Android> <color de fondo #RRGGBB>
El fondo es el azul marino de la app (sale de PLAN, lo pasa preparar-android.js)."""
import os
import sys
from PIL import Image, ImageDraw

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
res = sys.argv[1]
fondo = sys.argv[2] if len(sys.argv) > 2 else '#10233F'

logo = Image.open(os.path.join(raiz, 'www', 'img', 'logo.png')).convert('RGBA')
caja = logo.split()[3].getbbox()
if caja:
    logo = logo.crop(caja)


def poner(lienzo, lado_logo):
    """Centra el logo dentro de lienzo, ocupando lado_logo píxeles como máximo."""
    l = logo.copy()
    l.thumbnail((lado_logo, lado_logo), Image.LANCZOS)
    lienzo.alpha_composite(l, ((lienzo.width - l.width) // 2, (lienzo.height - l.height) // 2))
    return lienzo


# Densidad -> tamaño del ícono clásico (48 dp) y del adaptable (108 dp)
densidades = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
rgb = tuple(int(fondo.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))

for nombre, (n, a) in densidades.items():
    carpeta = os.path.join(res, 'mipmap-' + nombre)
    os.makedirs(carpeta, exist_ok=True)
    # Adaptable: primer plano transparente; el logo dentro de la zona segura (66 % del lienzo de 108 dp)
    poner(Image.new('RGBA', (a, a), (0, 0, 0, 0)), int(a * 0.58)).save(os.path.join(carpeta, 'ic_launcher_foreground.png'))
    # Clásico cuadrado con esquinas suaves y redondo (para teléfonos sin ícono adaptable)
    base = poner(Image.new('RGBA', (n, n), rgb + (255,)), int(n * 0.72))
    cuadrado = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    m = Image.new('L', (n, n), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.22), fill=255)
    cuadrado.paste(base, (0, 0), m)
    cuadrado.save(os.path.join(carpeta, 'ic_launcher.png'))
    redondo = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    m2 = Image.new('L', (n, n), 0); ImageDraw.Draw(m2).ellipse((0, 0, n - 1, n - 1), fill=255)
    redondo.paste(base, (0, 0), m2)
    redondo.save(os.path.join(carpeta, 'ic_launcher_round.png'))

# Adaptable: definición y color de fondo
os.makedirs(os.path.join(res, 'mipmap-anydpi-v26'), exist_ok=True)
xml = ('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
       '    <background android:drawable="@color/ic_launcher_background"/>\n'
       '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
for f in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    open(os.path.join(res, 'mipmap-anydpi-v26', f), 'w', encoding='utf-8').write(xml)
os.makedirs(os.path.join(res, 'values'), exist_ok=True)
open(os.path.join(res, 'values', 'ic_launcher_background.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' % fondo)
print('Íconos generados en', res)
