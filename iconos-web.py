#!/usr/bin/env python3
"""Íconos de la versión web (instalable desde Chrome) a partir de www/img/logo.png.
Uso: python3 scripts/iconos-web.py <carpeta de salida> <color de fondo #RRGGBB>
Saca: icon-192.png, icon-512.png (normales), icon-maskable-512.png (Android los recorta en círculo/cuadrado
redondeado: el logo queda en el centro seguro), apple-touch-icon.png (180) y favicon.png (48)."""
import os
import sys
from PIL import Image

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
salida = sys.argv[1]
fondo = sys.argv[2] if len(sys.argv) > 2 else '#10233F'
rgb = tuple(int(fondo.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))

logo = Image.open(os.path.join(raiz, 'www', 'img', 'logo.png')).convert('RGBA')
caja = logo.split()[3].getbbox()
if caja:
    logo = logo.crop(caja)


def icono(lado, proporcion):
    """Cuadrado de color de fondo con el logo centrado ocupando `proporcion` del lado."""
    lienzo = Image.new('RGBA', (lado, lado), rgb + (255,))
    l = logo.copy()
    l.thumbnail((int(lado * proporcion), int(lado * proporcion)), Image.LANCZOS)
    lienzo.alpha_composite(l, ((lado - l.width) // 2, (lado - l.height) // 2))
    return lienzo.convert('RGB')


os.makedirs(salida, exist_ok=True)
icono(512, 0.78).save(os.path.join(salida, 'icon-512.png'), optimize=True)
icono(192, 0.78).save(os.path.join(salida, 'icon-192.png'), optimize=True)
icono(512, 0.56).save(os.path.join(salida, 'icon-maskable-512.png'), optimize=True)   # zona segura: el círculo de recorte mide 80 % del lado
icono(180, 0.74).save(os.path.join(salida, 'apple-touch-icon.png'), optimize=True)
icono(48, 0.9).save(os.path.join(salida, 'favicon.png'), optimize=True)
print('Íconos web listos en', salida)
