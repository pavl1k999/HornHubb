# Снежный шар с носорогом (тема «Новый год»)

В шапке магазина — 3D-снежный шар: носорог стоит спиной к нам и смотрит на ёлку с гирляндой,
рядом фонарь и подарки, внутри идёт снег. При появлении камера опускается к шару сверху.
Нажатие — встряхнуть шар, движение пальцем вбок — покрутить (не больше чем на 40°).

**Лицо не показываем:** носорог повёрнут спиной, поворот шара ограничен (`MAX_TURN` в `globe.js`),
ноздри скрыты. Проверено рендером: глаза и ноздри — 0 пикселей при любом повороте до ±45°
и во всех кадрах появления.

| Файл | Что это |
|---|---|
| `tools/globe/rhino.blend` | исходная модель из Blender |
| `tools/globe/export.py` | экспорт модели для сайта (цвета материалов, группы для анимации) |
| `tools/globe/globe.js` | исходник сцены шара (three.js) |
| `models/rhino.glb` | готовая сжатая модель (~340 КБ), её грузит сайт |
| `js/globe.js` | собранная сцена (three.js + шар), её грузит сайт |
| `images/newyear/globe.webp` | картинка шара: пока грузится 3D и там, где 3D нет |

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

Картинку `images/newyear/globe.webp` после заметных правок сцены стоит перерисовать: открыть шар
с `debug: true`, дождаться конца появления и сохранить холст (`canvas.toDataURL`) 840×840 с прозрачным фоном.

После любой пересборки поменяйте `?v=` в `index.html`, чтобы Telegram не взял старые файлы из кэша.
