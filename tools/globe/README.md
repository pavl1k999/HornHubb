# Снежный шар с носорогом (тема «Новый год»)

Сцена во всю шапку магазина: ночное небо со звёздами, стол с отражением, снежный шар на точёной
подставке (красный лак, золотые канты, табличка HORN HUB). Внутри — носорог (спиной к нам, смотрит
на ёлку), ёлка из веточек-карточек с гирляндой и звездой, фонарь, снеговик, подарки, искорки на снегу.
Снежинки — кристаллы с физикой (оседание как в воде, вихрь при встряске, ложатся на снег, шляпу,
плечи, ёлку, подарки). Встряхнуть — нажатие или тряска телефона (`motion` из `js/app.js`),
покрутить — пальцем вбок.

**Лицо не показываем:** носорог повёрнут спиной, поворот шара ограничен (`TURN_MIN`/`TURN_MAX`
в `globe.js`), ноздри скрыты. Проверено рендером: глаза и ноздри — 0 пикселей на всём допустимом
повороте.

| Файл | Что это |
|---|---|
| `tools/globe/rhino.blend` | исходная модель из Blender |
| `tools/globe/export.py` | экспорт модели для сайта (цвета материалов, группы для анимации) |
| `tools/globe/globe.js` | исходник сцены шара (three.js) |
| `models/rhino.glb` | готовая сжатая модель (~340 КБ), её грузит сайт |
| `js/globe.js` | собранная сцена (three.js + шар), её грузит сайт |
| `images/newyear/hero.webp`, `hero-wide.webp`, `hero-card.webp` | картинки той же сцены: пока грузится 3D и там, где 3D нет |

## Пересобрать модель (после правок в Blender)

```sh
pip install bpy==5.2.3
python tools/globe/export.py tools/globe/rhino.blend /tmp/rhino_raw.glb
npx @gltf-transform/cli@4.5.1 optimize /tmp/rhino_raw.glb models/rhino.glb --compress meshopt \
  --flatten false --join true --join-named true --palette false --instance false \
  --simplify true --simplify-ratio 0.25 --simplify-error 0.0015
```

## Пересобрать шар (после правок в `globe.js`)

```sh
npm install three@0.186.1 esbuild@0.25.10
npx esbuild tools/globe/globe.js --bundle --format=esm --minify --target=es2020 \
  --legal-comments=none --outfile=js/globe.js
```

Картинки `images/newyear/*.webp` после заметных правок сцены стоит перерисовать: открыть сцену
с `debug: true` в окне нужного размера (366×244 — телефон, 1076×400 — компьютер, 400×267 с `gx: () => 0.5` —
карточка техобслуживания), прокрутить время (`__globe.step`), встряхнуть и сохранить холст (`canvas.toDataURL`).

После любой пересборки поменяйте `?v=` в `index.html`, чтобы Telegram не взял старые файлы из кэша.
