"""Сборка слоёв света носорога для сайта: out/*.npy (из render.py) → images/blackfriday/*.webp.

  python post.py out/ ../../images/blackfriday/   (нужны numpy и Pillow)

Каждый слой — чёрно-белая картинка одного источника света; на сайте они складываются с разным весом.
Ещё сохраняются: matte.webp (силуэт — чтобы надпись позади перекрывалась фигурой) и poster.webp
(готовая картинка с прозрачным фоном — пока слои грузятся и для «уменьшить движение»).
"""
import sys, os
import numpy as np
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)
# яркость каждого слоя (подобрана на глаз по пробным рендерам)
GAIN = {'arc0': 1.0, 'arc1': 1.0, 'arc2': 1.0, 'arc3': 1.0, 'arc4': 1.0, 'arc5': 1.0, 'arc6': 1.0, 'key': 1.0, 'top': 1.0}
GAIN.update({k: float(v) for k, v in (kv.split('=') for kv in os.environ.get('GAIN', '').split(',') if kv)})
# веса слоёв в готовой картинке (такой же «спокойный» свет, как на сайте без анимации)
POSTER = {'arc1': 0.9, 'arc5': 0.9, 'arc3': 0.7, 'top': 0.8, 'key': 0.55}


def tone(lin, gain):
    v = 1.0 - np.exp(-np.clip(lin, 0, None) * gain)       # мягкое плечо: яркие блики не выгорают резко
    return np.power(v, 1 / 2.2)


def edge_fade(h, w):
    """Плавное затухание к краям кадра — чтобы на странице не было видно границы картинки."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    fx = np.clip(np.minimum(x, w - 1 - x) / (w * 0.16), 0, 1)
    ft = np.clip(y / (h * 0.06), 0, 1)
    fb = np.clip((h - 1 - y) / (h * 0.10), 0, 1)
    s = lambda t: t * t * (3 - 2 * t)
    return s(fx) * s(ft) * s(fb)


matte = np.clip(np.load(os.path.join(SRC, 'matte.npy')), 0, 1)
h, w = matte.shape
fade = edge_fade(h, w)
layers = {}
for name in GAIN:
    layers[name] = tone(np.load(os.path.join(SRC, name + '.npy')), GAIN[name]) * fade
    Image.fromarray((layers[name] * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(DST, name + '.webp'), 'WEBP', quality=84, method=6)
Image.fromarray((matte * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(DST, 'matte.webp'), 'WEBP', quality=90, method=6)

# готовая картинка: свет складывается, прозрачность = силуэт + свет (как на сайте)
light = np.clip(sum(layers[n] * k for n, k in POSTER.items()), 0, 1)
alpha = np.clip(matte + light, 0, 1)
rgb = np.where(alpha > 0, light / np.maximum(alpha, 1e-4), 0)       # в файле цвет хранится без умножения на прозрачность
rgba = np.dstack([rgb, rgb, rgb, alpha])
Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(DST, 'poster.webp'), 'WEBP', quality=86, method=6)

# листы для просмотра (в репозиторий не идут): все слои по отдельности и готовая картинка на чёрном
if os.environ.get('PREVIEW'):
    names = list(GAIN)
    sheet = Image.new('L', (w * 5, h * 2), 0)
    for i, n in enumerate(names + ['matte']):
        im = Image.fromarray(((matte if n == 'matte' else layers[n]) * 255).astype(np.uint8), 'L')
        sheet.paste(im, ((i % 5) * w, (i // 5) * h))
    sheet.save(os.environ['PREVIEW'] + '_layers.png')
    Image.fromarray((light * 255).astype(np.uint8), 'L').save(os.environ['PREVIEW'] + '_poster.png')
sizes = {f: os.path.getsize(os.path.join(DST, f)) // 1024 for f in sorted(os.listdir(DST)) if f.endswith('.webp')}
print(f'{w}×{h}', sizes, 'всего', sum(sizes.values()), 'КБ')
