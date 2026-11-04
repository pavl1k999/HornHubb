/* ==========================================================
   HORN HUB — новогодний снежный шар с носорогом (исходник).
   Сайт подключает собранный файл js/globe.js — после правок
   пересоберите его (команда — в tools/globe/README.md).

   Сцена занимает всю шапку магазина: ночное небо, стол с отражением,
   на нём снежный шар. Внутри — носорог (спиной к нам, смотрит на ёлку),
   ёлка из веточек с гирляндой, фонарь, снеговик, подарки.
   Снежинки — настоящие кристаллы с физикой: падают медленно, как в воде,
   кувыркаются, ложатся на снег, шляпу, плечи, ёлку и подарки; при встряске
   взлетают вихрем. Встряхнуть: нажать на шар или потрясти телефон.
   Лицо не показываем: поворот шара ограничен (TURN_MIN/TURN_MAX), ноздри скрыты —
   проверено рендером.
   ========================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, PointLight, SpotLight, Group, Mesh, Object3D,
  SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, PlaneGeometry, CircleGeometry, LatheGeometry,
  ExtrudeGeometry, TubeGeometry, BoxGeometry, InstancedBufferGeometry, InstancedBufferAttribute, BufferGeometry,
  Float32BufferAttribute, Shape, Vector2, Vector3, CatmullRomCurve3, Color, MathUtils,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, InstancedMesh, Points,
  CanvasTexture, SRGBColorSpace, RepeatWrapping, ACESFilmicToneMapping, PCFSoftShadowMap,
  AdditiveBlending, DoubleSide, BackSide, FrontSide, Sprite, SpriteMaterial, PMREMGenerator,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FLAKES = 1300;                      // снежинок в шаре
// дальше крутить нельзя — может стать видно лицо (проверено рендером; влево открывается раньше)
const TURN_MIN = MathUtils.degToRad(-28), TURN_MAX = MathUtils.degToRad(40);
const VIEW_EL = MathUtils.degToRad(15);   // обычный ракурс: чуть сверху, со спины носорога
const START_EL = MathUtils.degToRad(74);  // при появлении камера смотрит сверху
const INTRO = 2.4;                        // с
const FLOOR_Y = -1.14;                    // стол под шаром
const SNOW_Y = -0.70, SNOW_R = 0.705, SNOW_H = 0.25; // снежный холм внутри шара
const INNER_R = 0.94;                     // внутренний радиус стекла
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const rnd = (a, b) => a + Math.random() * (b - a);

// неровности снега — одна функция и для сетки, и для физики снежинок
const bump = (x, z) => 0.016 * Math.sin(x * 11 + z * 5) * Math.cos(z * 9 - x * 4) + 0.01 * Math.sin(x * 23 - z * 17);
const groundAt = (x, z) => {
  const q = 1 - (x * x + z * z) / (SNOW_R * SNOW_R);
  return q <= 0 ? SNOW_Y : SNOW_Y + SNOW_H * Math.sqrt(q) + bump(x, z) * Math.min(1, q * 4);
};

/* ── текстуры (рисуются в коде, без файлов) ───────────────── */
const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const glowTex = canvasTex(64, 64, (g) => {
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
});

// атлас 4×2 снежинок-кристаллов: шесть лучей с веточками, у каждой свой узор
function flakeAtlas() {
  return canvasTex(512, 256, (g) => {
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const cx = (k % 4) * 128 + 64, cy = Math.floor(k / 4) * 128 + 64;
      const L = 50, branches = 2 + (k % 3), spread = 0.5 + (k % 4) * 0.12;
      g.save(); g.translate(cx, cy); g.rotate(k * 0.3);
      g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 3;
      for (let a = 0; a < 6; a++) {
        g.rotate(Math.PI / 3);
        g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L); g.stroke();
        g.lineWidth = 3.5;
        for (let b = 1; b <= branches; b++) {
          const y = -L * (b / (branches + 1)) - 6, len = L * (0.42 - b * 0.07) * (1 + (k % 2) * 0.3);
          g.beginPath(); g.moveTo(0, y); g.lineTo(-Math.sin(spread) * len, y - Math.cos(spread) * len);
          g.moveTo(0, y); g.lineTo(Math.sin(spread) * len, y - Math.cos(spread) * len); g.stroke();
        }
      }
      g.lineWidth = 3; g.beginPath(); for (let a = 0; a <= 6; a++) g.lineTo(Math.cos(a * Math.PI / 3) * 9, Math.sin(a * Math.PI / 3) * 9); g.stroke();
      g.restore();
    }
  });
}

// веточка ели: стебель, иголки в два ряда, шапки снега сверху
function branchTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    const needle = (x, y, ang, len, col) => { g.strokeStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke(); };
    g.lineCap = 'round';
    g.lineWidth = 5; g.strokeStyle = '#3d2a1a'; g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 10, h / 2); g.stroke();
    g.lineWidth = 2.6;
    for (let x = 6; x < w - 8; x += 3.2) {
      const t = x / w, len = 46 * (1 - t * 0.55) + Math.random() * 6;
      const shade = ['#0b3d24', '#0f4a2b', '#135a34', '#1a6b3e'][Math.floor(Math.random() * 4)];
      needle(x, h / 2, -0.95 + Math.random() * 0.25, len, shade);
      needle(x, h / 2, 0.95 - Math.random() * 0.25, len, shade);
      if (Math.random() < 0.5) needle(x, h / 2, -0.4 + Math.random() * 0.8, len * 0.6, '#1f7a46');
    }
    // снег лежит на верхней стороне ветки
    for (let i = 0; i < 26; i++) {
      const x = 20 + Math.random() * (w - 50), y = h / 2 - 10 - Math.random() * 26, r = 4 + Math.random() * 9 * (1 - x / w);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(250,252,255,.95)'); grd.addColorStop(1, 'rgba(235,242,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
}

// рельеф снега (карта нормалей из шума)
function snowNormal() {
  const N = 256, hgt = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, a = 1, f = 1;
    for (let o = 0; o < 4; o++) { v += a * Math.sin((x * 0.05 + o * 1.7) * f + Math.sin(y * 0.07 * f)) * Math.cos((y * 0.045 - o) * f); a *= 0.5; f *= 2.1; }
    hgt[y * N + x] = v + Math.random() * 0.15;
  }
  return canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const hx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x - 1 + N) % N)];
      const hy = hgt[((y + 1) % N) * N + x] - hgt[((y - 1 + N) % N) * N + x];
      const nx = -hx * 1.4, ny = -hy * 1.4, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
}

// окружение для отражений: тёмная комната, одно большое «окно» и тёплый огонёк гирлянды
function envScene() {
  const s = new Scene();
  s.add(new Mesh(new SphereGeometry(10, 32, 16), new MeshBasicMaterial({ color: 0x0a1430, side: BackSide })));
  // мягкие пятна света (края растворяются), иначе на стекле видны прямоугольники
  const soft = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.5, 'rgba(255,255,255,.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }, false);
  const panel = (w, h, color, k, pos) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), map: soft, transparent: true, side: DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(5, 2.4, 0xd6e4ff, 4, [-3.5, 8.2, 3.5]);   // «окно» высоко слева — блик у верхнего края шара
  panel(2.4, 2.4, 0xffb25e, 2.2, [7.5, 1.5, -4.5]); // тёплый свет справа сзади
  panel(12, 3, 0x1d2f58, 1.2, [0, -7, 0]);          // отсвет снизу
  return s;
}

// табличка: гравировка на золоте
function plaqueTexture() {
  return canvasTex(512, 96, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#f6dd94'); grd.addColorStop(0.5, '#d4a245'); grd.addColorStop(1, '#a8762a');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,55,10,.6)'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
    g.font = '800 46px Unbounded, "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(70,40,5,.85)'; g.fillText('HORN HUB', w / 2, h / 2 + 3);
    g.fillStyle = 'rgba(255,240,200,.35)'; g.fillText('HORN HUB', w / 2, h / 2 + 1);
  });
}

// небо: сверху глубокий синий, ниже чуть светлее, свечение за шаром (gx — где шар по ширине)
function skyTexture(gx) {
  return canvasTex(256, 256, (g, w, h) => {
    const lin = g.createLinearGradient(0, 0, 0, h);
    lin.addColorStop(0, '#0d1c40'); lin.addColorStop(0.55, '#13275a'); lin.addColorStop(1, '#0a142c');
    g.fillStyle = lin; g.fillRect(0, 0, w, h);
    const rad = g.createRadialGradient(gx * w, 0.42 * h, 0, gx * w, 0.42 * h, 0.55 * w);
    rad.addColorStop(0, 'rgba(120,165,255,.32)'); rad.addColorStop(1, 'rgba(120,165,255,0)');
    g.fillStyle = rad; g.fillRect(0, 0, w, h);
  });
}

/* ── шейдеры для точек и снежинок ─────────────────────────── */
// мерцающие точки (звёзды на небе, искорки на снегу)
function glintMaterial(size, color, sharp) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 500 }, uSize: { value: size }, uColor: { value: new Color(color) } },
    vertexShader: `
      attribute float aPhase; uniform float uTime, uPx, uSize; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float s = sin(uTime * (0.8 + fract(aPhase * 7.13) * 1.6) + aPhase * 6.283);
        vA = ${sharp ? 'pow(max(s, 0.0), 14.0)' : '0.45 + 0.55 * s * s'};
        gl_PointSize = uSize * uPx / -mv.z * (${sharp ? '0.5 + vA' : '1.0'});
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main() {
        vec2 p = gl_PointCoord - 0.5; float d = length(p);
        float core = smoothstep(0.5, 0.0, d);
        ${sharp ? 'core += smoothstep(0.06, 0.0, abs(p.x)) * smoothstep(0.5, 0.0, abs(p.y)) + smoothstep(0.06, 0.0, abs(p.y)) * smoothstep(0.5, 0.0, abs(p.x));' : ''}
        gl_FragColor = vec4(uColor * core * vA, 1.0);
      }`,
  });
}

// снежинки: плоские кристаллы, всегда повёрнуты к камере, но вращаются и «переворачиваются»
function flakeMaterial(atlas) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: atlas } },
    vertexShader: `
      attribute vec3 iPos; attribute vec4 iData; // угол, размер, номер узора, переворот (-1..1)
      varying vec2 vUv; varying float vL;
      void main() {
        vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
        vec2 p = position.xy; p.x *= iData.w;
        float c = cos(iData.x), s = sin(iData.x);
        mv.xy += mat2(c, s, -s, c) * p * iData.y;
        gl_Position = projectionMatrix * mv;
        vUv = (uv + vec2(mod(iData.z, 4.0), floor(iData.z / 4.0))) / vec2(4.0, 2.0);
        vL = 0.55 + 0.45 * abs(iData.w);  // повернулась ребром — тусклее, плашмя — ярче
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec2 vUv; varying float vL;
      void main() {
        float a = texture2D(uMap, vUv).a;
        if (a < 0.04) discard;
        gl_FragColor = vec4(vec3(0.92, 0.96, 1.0) * vL, a * 0.95);
      }`,
  });
}

/* ── предметы внутри шара ─────────────────────────────────── */
const snowMat = (normalMap) => new MeshStandardMaterial({ color: 0xd3dcee, roughness: 0.95, normalMap, normalScale: new Vector2(0.7, 0.7) });

function makeTree(dummy) {
  const tree = new Group(), H = 0.6;
  const radiusAt = (y) => 0.23 * (1 - y / H) + 0.012;
  const trunk = new Mesh(new CylinderGeometry(0.018, 0.026, 0.12, 10), new MeshStandardMaterial({ color: 0x3b2616, roughness: 0.9 }));
  trunk.position.y = 0.06; trunk.castShadow = true;
  const core = new Mesh(new ConeGeometry(0.15, H - 0.06, 14), new MeshStandardMaterial({ color: 0x0a3320, roughness: 1 }));
  core.position.y = 0.06 + (H - 0.06) / 2; core.castShadow = true;
  tree.add(trunk, core);
  // веточки: сотни карточек с текстурой иголок по спирали, книзу длиннее и сильнее опущены
  const geo = new PlaneGeometry(1, 0.5); geo.translate(0.5, 0, 0); geo.rotateX(-Math.PI / 2);
  const mat = new MeshStandardMaterial({ map: branchTexture(), alphaTest: 0.45, side: DoubleSide, roughness: 0.85 });
  const COUNT = 220, cards = new InstancedMesh(geo, mat, COUNT);
  for (let i = 0; i < COUNT; i++) {
    const k = i / COUNT, y = 0.08 + Math.pow(k, 0.9) * (H - 0.1);
    const len = radiusAt(y) * rnd(0.95, 1.2) + 0.02;
    dummy.position.set(0, y, 0);
    dummy.rotation.set(0, i * 2.39996 + rnd(-0.2, 0.2), -rnd(0.32, 0.55) - (1 - k) * 0.2, 'YXZ');
    dummy.scale.set(len, 1, len * rnd(0.7, 1));
    dummy.updateMatrix();
    cards.setMatrixAt(i, dummy.matrix);
  }
  tree.add(cards);
  // гирлянда: тонкий провод по спирали, лампочки-капли и свечение
  const pts = [];
  for (let k = 0; k <= 60; k++) {
    const u = k / 60, y = 0.1 + u * (H - 0.16), a = u * Math.PI * 2 * 3.6, r = radiusAt(y) * 0.92 + 0.012;
    pts.push(new Vector3(Math.cos(a) * r, y - Math.sin(u * Math.PI * 14) * 0.006, Math.sin(a) * r));
  }
  const curve = new CatmullRomCurve3(pts);
  const wire = new Mesh(new TubeGeometry(curve, 240, 0.0022, 5), new MeshStandardMaterial({ color: 0x14301f, roughness: 0.6 }));
  tree.add(wire);
  const N = 44, palette = [0xffc85a, 0xff3d4f, 0x52e08a, 0x5aa8ff, 0xffffff].map((c) => new Color(c));
  const bulbGeo = new SphereGeometry(0.0075, 10, 8); bulbGeo.scale(1, 1.35, 1);
  const bulbs = new InstancedMesh(bulbGeo, new MeshBasicMaterial(), N);
  const glows = [];
  for (let i = 0; i < N; i++) {
    const p = curve.getPointAt((i + 0.5) / N);
    dummy.position.copy(p).add(new Vector3(0, -0.006, 0)); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
    const glow = new Sprite(new SpriteMaterial({ map: glowTex, color: palette[i % palette.length], transparent: true, depthWrite: false, blending: AdditiveBlending }));
    glow.position.copy(dummy.position); glow.scale.setScalar(0.055);
    glows.push(glow); tree.add(glow);
  }
  tree.add(bulbs);
  // звезда
  const star = new Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.017 : 0.042, a = i * Math.PI / 5 + Math.PI / 2; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const starGeo = new ExtrudeGeometry(star, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
  starGeo.center();
  const starMesh = new Mesh(starGeo, new MeshStandardMaterial({ color: 0xffd36b, metalness: 0.8, roughness: 0.25, emissive: 0xffb733, emissiveIntensity: 0.9 }));
  starMesh.position.y = H + 0.02;
  const starGlow = new Sprite(new SpriteMaterial({ map: glowTex, color: 0xffd27a, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  starGlow.position.y = H + 0.02; starGlow.scale.setScalar(0.2);
  tree.add(starMesh, starGlow);
  const tmp = new Color();
  tree.update = (t) => {
    for (let i = 0; i < N; i++) {
      const on = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.3), 2);
      bulbs.setColorAt(i, tmp.copy(palette[i % palette.length]).multiplyScalar(0.6 + on * 0.8));
      glows[i].material.opacity = 0.25 + on * 0.75;
    }
    bulbs.instanceColor.needsUpdate = true;
    starMesh.rotation.y = Math.sin(t * 0.7) * 0.4;
    starGlow.material.opacity = 0.75 + Math.sin(t * 2.2) * 0.2;
  };
  tree.update(0);
  tree.radiusAt = radiusAt; tree.H = H;
  return tree;
}

function makeLamp() {
  const g = new Group();
  const iron = new MeshStandardMaterial({ color: 0x161a22, roughness: 0.45, metalness: 0.7 });
  const prof = [[0.034, 0], [0.034, 0.012], [0.024, 0.02], [0.016, 0.034], [0.011, 0.06], [0.009, 0.4], [0.013, 0.41], [0.013, 0.425], [0, 0.425]]
    .map(([r, y]) => new Vector2(r, y));
  const post = new Mesh(new LatheGeometry(prof, 16), iron);
  const lantern = new Group(); lantern.position.y = 0.425;
  const glass = new Mesh(new CylinderGeometry(0.03, 0.022, 0.07, 6), new MeshBasicMaterial({ color: 0xffd08a }));
  glass.position.y = 0.035;
  for (let i = 0; i < 6; i++) {
    const bar = new Mesh(new BoxGeometry(0.004, 0.075, 0.004), iron);
    const a = i * Math.PI / 3 + Math.PI / 6; bar.position.set(Math.cos(a) * 0.028, 0.035, Math.sin(a) * 0.028); bar.rotation.z = Math.cos(a) * 0.1;
    lantern.add(bar);
  }
  const roof = new Mesh(new ConeGeometry(0.046, 0.04, 6), iron); roof.position.y = 0.09;
  const snowCap = new Mesh(new SphereGeometry(0.036, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xeef3fb, roughness: 0.95 }));
  snowCap.scale.y = 0.45; snowCap.position.y = 0.098;
  const knob = new Mesh(new SphereGeometry(0.007, 8, 6), iron); knob.position.y = 0.118;
  lantern.add(glass, roof, snowCap, knob);
  const halo = new Sprite(new SpriteMaterial({ map: glowTex, color: 0xffbf66, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }));
  halo.scale.setScalar(0.3); halo.position.y = 0.46;
  const light = new PointLight(0xffb85c, 1.5, 1.1, 2); light.position.y = 0.45;
  g.add(post, lantern, halo, light);
  [post, roof].forEach((m) => { m.castShadow = true; });
  g.update = (t) => { light.intensity = 1.5 + Math.sin(t * 9) * Math.sin(t * 5.3) * 0.12; };
  return g;
}

function makeSnowman(snow) {
  const g = new Group();
  const ball = (r, y) => { const m = new Mesh(new SphereGeometry(r, 24, 18), snow); m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  ball(0.07, 0.06); ball(0.052, 0.165); ball(0.038, 0.245);
  const coal = new MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  [[-0.013, 0.255, 0.033], [0.013, 0.255, 0.033], [0, 0.175, 0.05], [0, 0.145, 0.05], [0, 0.07, 0.068]].forEach(([x, y, z]) => {
    const c = new Mesh(new SphereGeometry(0.0055, 8, 6), coal); c.position.set(x, y, z); g.add(c);
  });
  const nose = new Mesh(new ConeGeometry(0.008, 0.045, 8), new MeshStandardMaterial({ color: 0xf07a1a, roughness: 0.6 }));
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.243, 0.056); g.add(nose);
  const red = new MeshStandardMaterial({ color: 0xc8102e, roughness: 0.8 });
  const scarf = new Mesh(new TorusGeometry(0.041, 0.012, 8, 20), red); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.212; g.add(scarf);
  const tail = new Mesh(new BoxGeometry(0.018, 0.06, 0.008), red); tail.position.set(0.025, 0.18, 0.04); tail.rotation.z = 0.25; g.add(tail);
  const wood = new MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
  [-1, 1].forEach((s) => {
    const arm = new Mesh(new CylinderGeometry(0.003, 0.004, 0.11, 5), wood);
    arm.position.set(s * 0.085, 0.19, 0); arm.rotation.z = s * -1.05; arm.castShadow = true; g.add(arm);
  });
  const hatMat = new MeshStandardMaterial({ color: 0x15151a, roughness: 0.55 });
  const brim = new Mesh(new CylinderGeometry(0.04, 0.04, 0.005, 20), hatMat); brim.position.y = 0.276;
  const top = new Mesh(new CylinderGeometry(0.026, 0.028, 0.045, 20), hatMat); top.position.y = 0.3;
  g.add(brim, top);
  return g;
}

function makeGift(w, h, d, color, ribbon) {
  const g = new Group();
  const box = new Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.08), new MeshStandardMaterial({ color, roughness: 0.45 }));
  box.position.y = h / 2;
  const rib = new MeshStandardMaterial({ color: ribbon, roughness: 0.3, metalness: 0.35 });
  const r1 = new Mesh(new BoxGeometry(w * 1.015, h * 1.015, d * 0.16), rib);
  const r2 = new Mesh(new BoxGeometry(w * 0.16, h * 1.015, d * 1.015), rib);
  r1.position.y = r2.position.y = h / 2;
  g.add(box, r1, r2);
  const loop = Math.min(w, d) * 0.2;
  [-1, 1].forEach((s) => {
    const l = new Mesh(new TorusGeometry(loop, loop * 0.28, 6, 14), rib);
    l.scale.set(1, 0.7, 1); l.position.set(s * loop * 0.9, h + loop * 0.5, 0); l.rotation.set(0, Math.PI / 2, s * 0.5);
    g.add(l);
  });
  const knot = new Mesh(new SphereGeometry(loop * 0.35, 8, 6), rib); knot.position.y = h + loop * 0.2; g.add(knot);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.top = h; g.half = [w / 2, d / 2];
  return g;
}

/* ── снег с физикой ───────────────────────────────────────── */
function makeFlakes(atlas, colliders) {
  const P = new Float32Array(FLAKES * 3), V = new Float32Array(FLAKES * 3);
  const D = new Float32Array(FLAKES * 4);              // угол, размер, узор, переворот
  const spin = new Float32Array(FLAKES), flip = new Float32Array(FLAKES), phase = new Float32Array(FLAKES);
  const fall = new Float32Array(FLAKES), rest = new Uint8Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) {
    D[i * 4 + 1] = rnd(0.016, 0.034) * (Math.random() < 0.12 ? 1.6 : 1);
    D[i * 4 + 2] = Math.floor(Math.random() * 8);
    spin[i] = rnd(-1.5, 1.5); flip[i] = rnd(0.6, 2.2); phase[i] = rnd(0, 100);
    fall[i] = rnd(0.035, 0.08);                         // скорость оседания в «воде»
    // в начале снег лежит: на земле — почти весь, немного — в воздухе
    const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * SNOW_R * 0.96;
    P[i * 3] = Math.cos(a) * r; P[i * 3 + 2] = Math.sin(a) * r;
    P[i * 3 + 1] = groundAt(P[i * 3], P[i * 3 + 2]) + 0.004;
    rest[i] = 1;
  }
  const geo = new InstancedBufferGeometry();
  geo.copy(new PlaneGeometry(1, 1));
  geo.instanceCount = FLAKES;
  const aPos = new InstancedBufferAttribute(P, 3), aData = new InstancedBufferAttribute(D, 4);
  geo.setAttribute('iPos', aPos); geo.setAttribute('iData', aData);
  const mesh = new Mesh(geo, flakeMaterial(atlas));
  mesh.frustumCulled = false; mesh.renderOrder = 5;

  let swirl = 0, gx = 0, gz = 0;
  mesh.shake = (power = 1) => {
    swirl = Math.min(1.8, swirl + power);
    for (let i = 0; i < FLAKES; i++) {
      const j = i * 3, low = 1 - (P[j + 1] - SNOW_Y) / 1.5;
      if (rest[i] && Math.random() > 0.35 + power * 0.6) continue; // лёгкая встряска поднимает не всё
      rest[i] = 0;
      V[j] += rnd(-0.9, 0.9) * power; V[j + 2] += rnd(-0.9, 0.9) * power;
      V[j + 1] += rnd(0.5, 1.6) * power * (0.6 + low);
    }
  };
  // наклон телефона: снег сносит в сторону (dx, dz — небольшие)
  mesh.tilt = (dx, dz) => { gx = dx; gz = dz; };
  mesh.update = (dt, t) => {
    swirl *= Math.exp(-dt * 0.45);
    const drag = Math.exp(-dt * 2.4);
    for (let i = 0; i < FLAKES; i++) {
      const j = i * 3, k = i * 4;
      if (rest[i]) { D[k + 3] = 0.35; continue; }    // лежит плашмя
      let x = P[j], y = P[j + 1], z = P[j + 2];
      // вихрь вокруг оси шара + течение и колыхание
      V[j] += (-z * 1.3 * swirl + Math.sin(t * 0.9 + phase[i]) * 0.035 + gx) * dt;
      V[j + 2] += (x * 1.3 * swirl + Math.cos(t * 0.8 + phase[i] * 1.3) * 0.035 + gz) * dt;
      V[j + 1] += (-0.25 + swirl * 0.06 * Math.sin(phase[i] + t)) * dt;
      V[j] *= drag; V[j + 1] *= drag; V[j + 2] *= drag;
      if (V[j + 1] < -fall[i]) V[j + 1] = MathUtils.lerp(V[j + 1], -fall[i], 0.25);
      x += V[j] * dt; y += V[j + 1] * dt; z += V[j + 2] * dt;
      // стекло
      const r = Math.hypot(x, y, z);
      if (r > INNER_R) {
        const nx = x / r, ny = y / r, nz = z / r, vn = V[j] * nx + V[j + 1] * ny + V[j + 2] * nz;
        x = nx * INNER_R; y = ny * INNER_R; z = nz * INNER_R;
        if (vn > 0) { V[j] -= 1.4 * vn * nx; V[j + 1] -= 1.4 * vn * ny; V[j + 2] -= 1.4 * vn * nz; }
      }
      // земля и предметы: снежинка ложится и лежит до следующей встряски
      let landed = false;
      const gy = groundAt(x, z);
      if (y < gy + 0.003) { y = gy + 0.003; landed = true; }
      else {
        for (const c of colliders) {
          const h = c.hit(x, y, z);
          if (h === true) { landed = true; break; }
          if (h) { x = h[0]; y = h[1]; z = h[2]; if (h[3]) { landed = true; break; } }
        }
      }
      if (landed && V[j + 1] < 0.2) { rest[i] = 1; V[j] = V[j + 1] = V[j + 2] = 0; }
      P[j] = x; P[j + 1] = y; P[j + 2] = z;
      // кувыркается: угол и «переворот» (сжатие по ширине)
      D[k] += spin[i] * dt * (1 + swirl);
      D[k + 3] = Math.cos(t * flip[i] + phase[i]);
    }
    aPos.needsUpdate = true; aData.needsUpdate = true;
  };
  mesh.restingShare = () => { let n = 0; for (let i = 0; i < FLAKES; i++) n += rest[i]; return n / FLAKES; };
  return mesh;
}

/**
 * Ставит сцену в container (элемент во всю шапку).
 * glb — Promise<ArrayBuffer> с моделью носорога.
 * motion — { start(cb), stop(), permit() }: акселерометр телефона, cb(x, y, z) — в м/с² или в g
 *   (единицы определяются сами); permit() вызывается по нажатию — на iPhone так спрашивают доступ.
 * gx — где по ширине стоит шар (0..1), функция от соотношения сторон.
 * onReady — сцена нарисована, onShake(сила, этоЧеловек) — шар встряхнули (для вибрации и подсказки).
 * onView({ x, y, r }) — где на экране стеклянный шар (центр и радиус в пикселях контейнера):
 *   по нему надпись «2027» уходит за шар по круглому контуру.
 * debug: true — время не идёт само, управление через window.__globe (для проверок и картинок-заглушек).
 */
export function mountGlobe({ container, glb, motion = null, gx = (aspect) => (aspect > 1.9 ? 0.72 : 0.7),
  onReady = () => {}, onShake = () => {}, onFail = () => {}, onView = () => {}, debug = false }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: debug, powerPreference: 'high-performance' });
  } catch {
    onFail();
    return { destroy() {} };
  }
  const canvas = renderer.domElement;
  canvas.className = 'globe-canvas';
  container.appendChild(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene(), 0.02).texture;
  scene.environmentIntensity = 1;
  const camera = new PerspectiveCamera(26, 1, 0.1, 60);

  scene.add(new HemisphereLight(0x9cb6ff, 0x1a1530, 0.45));
  const moon = new DirectionalLight(0xdce8ff, 1.5);
  moon.position.set(-2.4, 4.6, 3.6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 1, far: 14 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.012;
  scene.add(moon);
  const rim = new DirectionalLight(0x8fb0ff, 1.1);
  rim.position.set(1.5, 2, -4);
  scene.add(rim);

  // небо со звёздами
  const starsGeo = new BufferGeometry();
  const sp = [], sph = [];
  for (let i = 0; i < 160; i++) { sp.push(rnd(-14, 14), rnd(-1, 8), rnd(-12, -9)); sph.push(Math.random()); }
  starsGeo.setAttribute('position', new Float32BufferAttribute(sp, 3));
  starsGeo.setAttribute('aPhase', new Float32BufferAttribute(sph, 1));
  const starMat = glintMaterial(0.07, 0xdfe8ff, false);
  scene.add(new Points(starsGeo, starMat));

  // стол: тёмный, с отражением, к краям растворяется
  const floorAlpha = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.35, '#888'); grd.addColorStop(0.7, '#000');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }, false);
  const floor = new Mesh(new CircleGeometry(4, 64), new MeshStandardMaterial({ color: 0x101c38, roughness: 0.4, metalness: 0.1, alphaMap: floorAlpha, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; floor.receiveShadow = true;
  scene.add(floor);
  const contact = new Mesh(new CircleGeometry(1.15, 48), new MeshBasicMaterial({ map: canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,.75)'); grd.addColorStop(0.7, 'rgba(0,0,0,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = FLOOR_Y + 0.002;
  const warm = new Mesh(new CircleGeometry(1.6, 48), new MeshBasicMaterial({ map: glowTex, color: 0xff9a40, transparent: true, opacity: 0.16, depthWrite: false, blending: AdditiveBlending }));
  warm.rotation.x = -Math.PI / 2; warm.position.set(0.1, FLOOR_Y + 0.003, -0.3);
  scene.add(contact, warm);

  const globe = new Group();   // крутится пальцем и качается при встряске
  scene.add(globe);
  const dummy = new Object3D();
  const sNormal = snowNormal(); sNormal.wrapS = sNormal.wrapT = RepeatWrapping; sNormal.repeat.set(3, 3);
  const snow = snowMat(sNormal);

  // подставка: точёное дерево под красным лаком, золотые канты, табличка
  const prof = [[0.69, -0.69], [0.745, -0.69], [0.775, -0.715], [0.755, -0.745], [0.745, -0.78], [0.79, -0.81], [0.832, -0.86],
    [0.848, -0.95], [0.85, -1.02], [0.885, -1.045], [0.912, -1.075], [0.915, -1.12], [0.9, -1.14], [0, -1.14]].map(([r, y]) => new Vector2(r, y))
    .reverse(); // снизу вверх — иначе поверхность смотрит внутрь
  const base = new Mesh(new LatheGeometry(prof, 96), new MeshPhysicalMaterial({ color: 0x8c1222, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.06 }));
  base.castShadow = true;
  const gold = new MeshStandardMaterial({ color: 0xe2b457, roughness: 0.22, metalness: 1 });
  const ring = (r, y, tube) => { const m = new Mesh(new TorusGeometry(r, tube, 12, 96), gold); m.rotation.x = Math.PI / 2; m.position.y = y; globe.add(m); };
  ring(0.765, -0.712, 0.015); ring(0.9, -1.06, 0.015);
  const plaque = new Mesh(new CylinderGeometry(0.853, 0.853, 0.1, 32, 1, true, -0.42, 0.84),
    new MeshStandardMaterial({ map: plaqueTexture(), metalness: 0.85, roughness: 0.32 }));
  plaque.position.y = -0.935;
  globe.add(base, plaque);

  // внутри
  const inner = new Group();
  globe.add(inner);
  const moundGeo = new SphereGeometry(SNOW_R, 96, 26, 0, Math.PI * 2, 0, Math.PI / 2);
  const mp = moundGeo.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i); mp.setY(i, groundAt(x, z) - SNOW_Y); }
  moundGeo.computeVertexNormals();
  const mound = new Mesh(moundGeo, snow);
  mound.position.y = SNOW_Y; mound.receiveShadow = true;
  inner.add(mound);
  // искорки на снегу
  const gp = [], gph = [];
  for (let i = 0; i < 260; i++) {
    const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * SNOW_R * 0.95, x = Math.cos(a) * r, z = Math.sin(a) * r;
    gp.push(x, groundAt(x, z) + 0.003, z); gph.push(Math.random());
  }
  const glitGeo = new BufferGeometry();
  glitGeo.setAttribute('position', new Float32BufferAttribute(gp, 3));
  glitGeo.setAttribute('aPhase', new Float32BufferAttribute(gph, 1));
  const glitMat = glintMaterial(0.022, 0xffffff, true);
  inner.add(new Points(glitGeo, glitMat));

  const tree = makeTree(dummy);
  const TREE_S = 1.15;
  tree.scale.setScalar(TREE_S);
  tree.position.set(0.37, groundAt(0.37, -0.3) - 0.015, -0.3);
  inner.add(tree);
  const treeLight = new PointLight(0xffc46b, 1.1, 1.2, 2);
  treeLight.position.set(0.22, -0.3, -0.12);
  inner.add(treeLight);
  const lamp = makeLamp();
  const LAMP_S = 1.3;
  lamp.scale.setScalar(LAMP_S);
  lamp.position.set(-0.43, groundAt(-0.43, -0.3) - 0.01, -0.3);
  inner.add(lamp);
  const snowman = makeSnowman(snow);
  snowman.position.set(-0.46, groundAt(-0.46, 0.2) - 0.012, 0.2);
  snowman.rotation.y = 0.55;
  snowman.scale.setScalar(0.9);
  inner.add(snowman);
  const gifts = [
    [makeGift(0.1, 0.075, 0.09, 0xb3121f, 0xe9c46a), 0.06, -0.4, 0.45],
    [makeGift(0.075, 0.1, 0.075, 0x1f4fb3, 0xf1f5ff), 0.52, -0.06, -0.4],
    [makeGift(0.065, 0.055, 0.065, 0xd9a843, 0xb3121f), 0.4, 0.06, 0.9],
  ];
  for (const [g, x, z, rot] of gifts) {
    g.position.set(x, groundAt(x, z) - 0.008, z);
    g.rotation.y = rot;
    inner.add(g);
  }

  // где снежинки могут лежать: шляпа и плечи носорога, ёлка, подарки, шапка снеговика, фонарь
  const colliders = [];
  const disc = (cx, cz, r, top) => ({ hit: (x, y, z) => {
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r && y < top + 0.004 && y > top - 0.04) return [x, top + 0.004, z, true];
    return null;
  } });
  colliders.push({ hit: (x, y, z) => { // ёлка — конус
    const lx = x - tree.position.x, lz = z - tree.position.z, ly = (y - tree.position.y) / TREE_S;
    if (ly < 0.08 || ly > tree.H + 0.02) return null;
    const rr = tree.radiusAt(ly) * TREE_S, d = Math.hypot(lx, lz);
    if (d < rr) { const k = (rr + 0.004) / Math.max(d, 1e-4); return [tree.position.x + lx * k, y, tree.position.z + lz * k, Math.random() < 0.35]; }
    return null;
  } });
  for (const [g] of gifts) colliders.push(disc(g.position.x, g.position.z, Math.min(...g.half) * 1.1, g.position.y + g.top));
  colliders.push(disc(snowman.position.x, snowman.position.z, 0.035, snowman.position.y + 0.32 * 0.9));
  colliders.push(disc(lamp.position.x, lamp.position.z, 0.04 * LAMP_S, lamp.position.y + 0.535 * LAMP_S));

  const flakes = makeFlakes(flakeAtlas(), colliders);
  inner.add(flakes);

  // стекло: только отражения (сложение цвета), края ярче — как у настоящего шара
  const glassMat = (side, k) => new MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5,
    envMapIntensity: 1.1 * k, specularIntensity: 1, transparent: true, depthWrite: false, blending: AdditiveBlending, side,
  });
  const glassBack = new Mesh(new SphereGeometry(1, 72, 54), glassMat(BackSide, 0.5));
  const glassFront = new Mesh(new SphereGeometry(1, 72, 54), glassMat(FrontSide, 1));
  glassBack.renderOrder = 4; glassFront.renderOrder = 6;
  const rimGlow = new Mesh(new SphereGeometry(1.002, 72, 54), new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(vec3(0.55,0.7,1.0) * f * 0.42, 1.0); }`,
  }));
  rimGlow.renderOrder = 7;
  globe.add(glassBack, glassFront, rimGlow);

  let rhino, upper, head;
  let w = 1, h = 1, sky = null;
  const resize = () => {
    w = Math.max(1, container.clientWidth); h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // шар не по центру, а там, где задано (слева остаётся место для надписи)
    camera.setViewOffset(w, h, (0.5 - gx(camera.aspect)) * w, 0, w, h);
    camera.updateProjectionMatrix();
    sky?.dispose();
    sky = skyTexture(gx(camera.aspect));
    scene.background = sky;
    const px = h * renderer.getPixelRatio() / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
    starMat.uniforms.uPx.value = px; glitMat.uniforms.uPx.value = px;
  };
  resize();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(container);

  // шар с подставкой и столом помещается по высоте с запасом
  const target = new Vector3(0, -0.12, 0);
  const dist = () => 1.42 / Math.tan(MathUtils.degToRad(camera.fov / 2));
  const pose = (el, k) => {
    const d = dist() * k;
    camera.position.set(0, target.y + d * Math.sin(el), d * Math.cos(el));
    camera.lookAt(target);
  };

  // управление: вбок — покрутить (с пределом), нажатие — встряхнуть, тряска телефона — тоже
  let turn = 0, turnVel = 0, dragging = false, downX = 0, downTurn = 0, lastX = 0, lastMove = 0, moved = false;
  let wobble = 0, idleSince = 0, clock = 0;
  const shake = (power = 1, byUser = true) => { flakes.shake(power); wobble = Math.min(1.2, wobble + power * 0.8); idleSince = clock; onShake(power, byUser); };
  canvas.addEventListener('pointerdown', (e) => { dragging = true; moved = false; downX = lastX = e.clientX; downTurn = turn; turnVel = 0; lastMove = performance.now(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - downX;
    if (Math.abs(dx) > 7) moved = true;
    if (!moved) return;
    const now = performance.now();
    turn = MathUtils.clamp(downTurn + dx * 0.007, TURN_MIN, TURN_MAX);
    turnVel = ((e.clientX - lastX) * 0.007) / Math.max(0.016, (now - lastMove) / 1000);
    lastX = e.clientX; lastMove = now;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false; idleSince = clock;
    try { motion?.permit?.(); } catch {} // на iPhone доступ к датчику движения дают только по нажатию
    if (!moved) shake(1);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointerleave', release);

  // акселерометр: резкий рывок или сильное отклонение от покоя — встряска.
  // Телефоны отдают разное: м/с² с силой тяжести (в покое ≈ 9.8), g (≈ 1) или без силы тяжести (≈ 0) —
  // определяем по среднему значению и приводим к м/с².
  let prev = null, lastJerk = -1, gAvg = 0, samples = 0;
  const onMotion = (x, y, z) => {
    if (![x, y, z].every(Number.isFinite)) return;
    const m = Math.hypot(x, y, z);
    gAvg = samples++ ? gAvg * 0.92 + m * 0.08 : m;
    if (samples < 4) { prev = [x, y, z]; return; }
    const unit = gAvg > 5 ? 'ms2' : gAvg > 0.45 ? 'g' : 'linear';
    const k = unit === 'g' ? 9.81 : 1;
    const jerk = prev ? Math.hypot(x - prev[0], y - prev[1], z - prev[2]) * k : 0;
    const dev = unit === 'linear' ? m : Math.abs(m * k - 9.81);
    prev = [x, y, z];
    if ((jerk > 7 || dev > 8) && clock - lastJerk > 0.45) {
      lastJerk = clock;
      shake(MathUtils.clamp(Math.max(jerk, dev) / 16, 0.7, 1.4));
    }
  };

  const animate = (dt) => {
    clock += dt;
    const k = ease(clock / INTRO);
    pose(MathUtils.lerp(START_EL, VIEW_EL, k), MathUtils.lerp(0.86, 1, k));
    if (!dragging) {
      turn += turnVel * dt; turnVel *= Math.exp(-dt * 3);
      const rest = clock - idleSince > 3 ? Math.sin(clock * 0.3) * 0.14 : turn; // сам слегка поворачивается
      turn = MathUtils.clamp(MathUtils.lerp(turn, rest, 1 - Math.exp(-dt * 1.1)), TURN_MIN, TURN_MAX);
    }
    wobble *= Math.exp(-dt * 3.2);
    globe.rotation.y = turn;
    globe.rotation.z = Math.sin(clock * 17) * 0.045 * wobble;
    globe.rotation.x = Math.sin(clock * 13 + 1) * 0.025 * wobble;
    // если долго никто не трогал и почти весь снег лёг — шар сам чуть встряхивается
    if (clock - idleSince > 40 && flakes.restingShare() > 0.9) shake(0.5, false);
    flakes.update(Math.min(dt, 0.05), clock);
    tree.update(clock); lamp.update(clock);
    treeLight.intensity = 1.1 + Math.sin(clock * 1.7) * 0.2;
    starMat.uniforms.uTime.value = clock; glitMat.uniforms.uTime.value = clock;
    if (upper) upper.scale.y = 1 + Math.sin(clock * 2.1) * 0.006;
    if (head) {
      head.rotation.x = MathUtils.degToRad(4 + Math.sin(clock * 0.9) * 1.5);
      head.rotation.y = MathUtils.degToRad(Math.sin(clock * 0.6) * 5);
    }
    renderer.render(scene, camera);
    reportView();
  };

  // контур стекла на экране: центр шара и его видимый радиус (сообщаем, только когда меняется)
  const vc = new Vector3(), view = { x: 0, y: 0, r: 0 };
  const reportView = () => {
    vc.set(0, 0, 0).project(camera);
    const d = camera.position.length();
    const r = (h / 2) * Math.tan(Math.asin(Math.min(1, 1.012 / d))) / Math.tan(MathUtils.degToRad(camera.fov / 2));
    const x = (vc.x + 1) / 2 * w, y = (1 - vc.y) / 2 * h;
    if (Math.abs(x - view.x) + Math.abs(y - view.y) + Math.abs(r - view.r) < 0.3) return;
    view.x = x; view.y = y; view.r = r;
    onView({ ...view });
  };

  // рисуем только когда шапка видна, не чаще 30 кадров в секунду
  let raf = 0, last = 0, visible = true, dead = false, started = false, listening = false;
  const loop = (now) => {
    raf = 0;
    if (dead || !visible || document.hidden) { if (listening) { motion?.stop(); listening = false; } return; }
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 31) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
    last = now;
    animate(dt);
  };
  const wake = () => {
    if (!started || raf || dead || !visible || document.hidden) return;
    if (motion && !listening) { listening = true; motion.start(onMotion); }
    last = 0; raf = requestAnimationFrame(loop);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; wake(); }) : null;
  io?.observe(container);
  document.addEventListener('visibilitychange', wake);

  glb.then((buf) => new Promise((res, rej) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.parse(buf, '', res, rej);
  })).then((gltf) => {
    if (dead) return;
    rhino = gltf.scene;
    rhino.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (/MAT-nostril/.test(o.material.name)) o.visible = false; // лицо не показываем
    });
    upper = rhino.getObjectByName('UPPER');
    head = rhino.getObjectByName('HEAD');
    const S = 1.0 / 1.97, rx = -0.07, rz = 0.17; // носорог — около половины высоты шара
    rhino.scale.setScalar(S);
    rhino.position.set(rx, groundAt(rx, rz) - 0.005, rz);
    rhino.rotation.y = Math.PI - 0.38; // спиной к нам, смотрит на ёлку
    inner.add(rhino);
    // мягкий свет со стороны зрителя: видно шляпу, складки куртки, сумку (иначе — чёрный силуэт)
    const fill = new SpotLight(0xc9dcff, 4.5, 3, 0.55, 0.85, 1.5);
    fill.position.set(rx + 0.35, rhino.position.y + 1.1, rz + 0.9);
    fill.target.position.set(rx, rhino.position.y + 0.55, rz);
    inner.add(fill, fill.target);
    rhino.traverse((o) => { if (o.isMesh) o.material.envMapIntensity = 2.2; });
    // снег ложится на шляпу и плечи
    const feet = rhino.position.y;
    colliders.push(disc(rx, rz, 0.18 * S, feet + 1.865 * S));   // поля шляпы
    colliders.push(disc(rx, rz, 0.12 * S, feet + 1.955 * S));   // макушка шляпы
    colliders.push(disc(rx, rz, 0.37 * S, feet + 1.5 * S));     // плечи
    flakes.shake(1.1); // при появлении шар как будто только что встряхнули
    started = true;
    if (debug) {
      window.__globe = { scene, camera, renderer, rhino, globe, flakes, shake, step: animate, view: () => ({ ...view }), setTurn: (v) => { turn = v; idleSince = clock; } };
      animate(0);
    } else {
      wake();
    }
    onReady();
  }).catch(() => { if (!dead) onFail(); });

  return {
    shake,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      if (listening) motion?.stop();
      io?.disconnect(); ro?.disconnect();
      document.removeEventListener('visibilitychange', wake);
      try { renderer.dispose(); renderer.forceContextLoss(); } catch {}
      canvas.remove();
    },
  };
}
