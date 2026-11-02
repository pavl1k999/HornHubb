# 3D-заставка с носорогом

При открытии магазина — заставка: ночь, носорог стоит в центре светящейся паутины, камера сверху
по спирали опускается к нему, летят искры, появляется логотип. Покупатели видят её раз в день,
владелец (`OWNER_IDS` в `js/app.js`) — при каждом открытии. Пропуск — нажатием.
Выключить совсем: `const INTRO = false;` в начале `js/app.js`.

**Лицо не показываем:** камера всегда высоко сверху (не ниже 78° над горизонтом, `END_EL` в `intro.js`),
глаза закрыты полями шляпы, ноздри скрыты, голова только чуть кивает вниз. Проверено рендером:
глаза и ноздри — 0 пикселей во всех кадрах.

| Файл | Что это |
|---|---|
| `tools/intro/rhino.blend` | исходная модель из Blender |
| `tools/intro/export.py` | экспорт модели для сайта (цвета материалов, группы для анимации) |
| `tools/intro/intro.js` | исходник сцены (three.js) |
| `models/rhino.glb` | готовая сжатая модель (~340 КБ), её грузит сайт |
| `js/intro.js` | собранная заставка (three.js + сцена), её грузит сайт |

## Пересобрать модель (после правок в Blender)

```sh
pip install bpy==5.2.3
python tools/intro/export.py tools/intro/rhino.blend /tmp/rhino_raw.glb
npx @gltf-transform/cli@4.5.1 optimize /tmp/rhino_raw.glb models/rhino.glb --compress meshopt \
  --flatten false --join true --join-named true --palette false --instance false \
  --simplify true --simplify-ratio 0.25 --simplify-error 0.0015
```

## Пересобрать заставку (после правок в `intro.js`)

```sh
npm install three@0.186.1 esbuild@0.25.10
npx esbuild tools/intro/intro.js --bundle --format=esm --minify --target=es2020 \
  --legal-comments=none --outfile=js/intro.js
```

После любой пересборки поменяйте `?v=` в `index.html`, чтобы Telegram не взял старые файлы из кэша.
