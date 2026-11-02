/* ==========================================================
   HORN HUB — 3D-заставка с носорогом (исходник).
   Сайт подключает собранный файл js/intro.js — после правок
   пересоберите его (команда — в tools/intro/README.md).

   Сюжет: ночь, носорог стоит в центре светящейся паутины,
   камера сверху (как ракурс из Blender) по спирали опускается,
   вокруг летят искры, фонарь ходит кругом. Лицо не показываем:
   камера всегда высоко сверху (глаза закрыты полями шляпы — проверено
   рендером каждого кадра), голова только чуть кивает вниз, ноздри скрыты.
   ========================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, FogExp2, HemisphereLight, SpotLight, PointLight,
  DirectionalLight, Mesh, CircleGeometry, PlaneGeometry, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, BufferGeometry,
  Float32BufferAttribute, Points, PointsMaterial, AdditiveBlending, Vector3, MathUtils, PMREMGenerator,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DUR = 3.6;        // полёт камеры, с
const FADE_OUT = 0.7;   // растворение заставки, с
// Камера: 0 — спереди носорога. Высота — угол над горизонтом (не ниже END_EL, иначе видно лицо)
const START_AZ = -2.3, END_AZ = 0.45;
const START_EL = MathUtils.degToRad(88), END_EL = MathUtils.degToRad(78);

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Паутина на земле — та же тема, что на сайте
function webTexture() {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = 'rgba(255, 196, 150, .5)';
  g.shadowColor = 'rgba(255, 120, 30, .9)';
  g.shadowBlur = 6;
  const RAYS = 14, R = S * 0.49;
  const ang = [...Array(RAYS)].map((_, i) => (i / RAYS) * Math.PI * 2 + Math.sin(i * 2.3) * 0.08);
  g.lineWidth = 2.2;
  ang.forEach((a) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); });
  g.lineWidth = 1.5;
  for (let r = 34; r < R; r *= 1.18) {
    g.beginPath();
    ang.concat(ang[0] + Math.PI * 2).forEach((a, i, arr) => {
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (!i) { g.moveTo(x, y); return; }
      const m = (a + arr[i - 1]) / 2, k = r * 0.86; // нить провисает к центру
      g.quadraticCurveTo(Math.cos(m) * k, Math.sin(m) * k, x, y);
    });
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function makeEmbers(count) {
  const pos = new Float32Array(count * 3), speed = new Float32Array(count), phase = new Float32Array(count);
  const spawn = (i, y) => {
    const a = Math.random() * Math.PI * 2, r = 0.35 + Math.random() * 2.2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r;
    speed[i] = 0.25 + Math.random() * 0.5; phase[i] = Math.random() * 10;
  };
  for (let i = 0; i < count; i++) spawn(i, Math.random() * 3.2);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({
    size: 0.05, map: glowTexture('rgba(255,200,120,1)', 'rgba(255,90,10,0)'), color: 0xffa040,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const points = new Points(geo, mat);
  points.update = (dt, time) => {
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speed[i] * dt;
      pos[i * 3] += Math.sin(time * 1.3 + phase[i]) * 0.12 * dt;
      if (pos[i * 3 + 1] > 3.2) spawn(i, 0);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return points;
}

/**
 * Показывает заставку поверх страницы.
 * root — готовый экран заставки (его заранее ставит js/app.js), без него создаётся свой.
 * glb — Promise<ArrayBuffer> с моделью, onDone — вызов после окончания (или при ошибке).
 * debug: true — время не идёт само, управление через window.__intro (для проверок).
 */
export function playIntro({ root, glb, onDone = () => {}, hint = '', timeout = 4000, debug = false }) {
  if (!root) {
    root = document.createElement('div');
    root.className = 'intro';
    root.innerHTML = `<canvas class="intro-canvas"></canvas>
      <div class="intro-logo">HORN<span>HUB</span></div>
      <div class="intro-hint">${hint}</div>`;
    document.body.appendChild(root);
  }
  const canvas = root.querySelector('canvas');

  let renderer, finished = false, removed = false, raf = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    root.classList.add('is-out');
    setTimeout(() => {
      removed = true;
      cancelAnimationFrame(raf);
      try { removeEventListener('resize', resize); } catch {} // при раннем выходе resize ещё не объявлен
      try { renderer?.dispose(); renderer?.forceContextLoss(); } catch {}
      root.remove();
      onDone();
    }, FADE_OUT * 1000);
  };
  // пропуск касанием или клавишей
  root.addEventListener('pointerdown', finish);
  const onKey = () => { finish(); removeEventListener('keydown', onKey); };
  addEventListener('keydown', onKey);
  // модель не успела загрузиться — не держим человека
  const slow = setTimeout(finish, timeout);

  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    clearTimeout(slow); finish(); return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const BG = 0x0d0908;
  const scene = new Scene();
  scene.background = new Color(BG);
  scene.fog = new FogExp2(BG, 0.085);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const camera = new PerspectiveCamera(38, 1, 0.1, 60);

  // свет: фонарь сверху, тыквенный огонёк по кругу, фиолетовый контур сзади
  scene.add(new HemisphereLight(0x4a3a66, 0x120a06, 0.35));
  const key = new SpotLight(0xffeedd, 28, 14, 0.5, 0.65, 2);
  key.position.set(0.9, 6.5, 1.8);
  key.target.position.set(0, 0.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const lantern = new PointLight(0xff7a1a, 6, 6, 2);
  scene.add(lantern);
  const rim = new DirectionalLight(0xb06cff, 2.4);
  rim.position.set(-1.5, 3.5, -4);
  scene.add(rim);

  const ground = new Mesh(new CircleGeometry(9, 64), new MeshStandardMaterial({ color: 0x140d0a, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const web = new Mesh(new PlaneGeometry(7.5, 7.5), new MeshBasicMaterial({
    map: webTexture(), transparent: true, opacity: 0.32, depthWrite: false, blending: AdditiveBlending,
  }));
  web.rotation.x = -Math.PI / 2;
  web.position.y = 0.004;
  scene.add(web);
  const pool = new Mesh(new PlaneGeometry(4.6, 4.6), new MeshBasicMaterial({
    map: glowTexture('rgba(255,120,30,.35)', 'rgba(255,80,10,0)'), transparent: true, depthWrite: false, blending: AdditiveBlending,
  }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.006;
  scene.add(pool);
  const embers = makeEmbers(130);
  scene.add(embers);

  let model, upper, head;
  const resize = () => {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // расстояние, чтобы носорог (радиус r) поместился по узкой стороне экрана
  const fitDist = (r) => {
    const v = MathUtils.degToRad(camera.fov / 2);
    const hz = Math.atan(Math.tan(v) * camera.aspect);
    return r / Math.sin(Math.min(v, hz));
  };

  const pose = (t) => {
    const e = ease(clamp01(t / DUR));
    const drift = Math.max(0, t - DUR) * 0.05; // после полёта — медленное кружение
    const az = MathUtils.lerp(START_AZ, END_AZ, e) + drift;
    const el = MathUtils.lerp(START_EL, END_EL, e);
    const dist = MathUtils.lerp(fitDist(1.9), fitDist(camera.aspect > 1 ? 1.05 : 0.62), e);
    const target = new Vector3(0, MathUtils.lerp(0.5, 0.95, e), 0);
    camera.position.set(
      target.x + dist * Math.cos(el) * Math.sin(az),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(target);
  };

  const animate = (t, dt) => {
    pose(t);
    lantern.position.set(Math.cos(t * 0.7) * 1.4, 0.55, Math.sin(t * 0.7) * 1.4);
    lantern.intensity = 6 * (0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3));
    embers.update(dt, t);
    if (upper) upper.scale.y = 1 + Math.sin(t * 2.1) * 0.006;        // дыхание
    if (head) {                                                        // голова только чуть кивает вниз
      head.rotation.x = MathUtils.degToRad(5 + Math.sin(t * 0.9) * 1.5);
      head.rotation.y = MathUtils.degToRad(Math.sin(t * 0.6) * 6);
    }
    const logo = clamp01((t - 1.9) / 0.8);
    root.style.setProperty('--logo', logo.toFixed(3));
    root.style.setProperty('--fade', clamp01(t / 0.5).toFixed(3));
    renderer.render(scene, camera);
  };

  const ready = glb.then((buf) => new Promise((res, rej) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.parse(buf, '', res, rej);
  })).then((gltf) => {
    model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (/MAT-nostril/.test(o.material.name)) o.visible = false; // лицо не показываем
    });
    upper = model.getObjectByName('UPPER');
    head = model.getObjectByName('HEAD');
    scene.add(model);
  });

  ready.then(() => {
    if (finished) return;
    clearTimeout(slow);
    root.classList.add('is-ready');
    if (debug) {
      window.__intro = { scene, camera, renderer, model, finish, render: (t) => animate(t, 1 / 60) };
      animate(0, 0);
      return;
    }
    let start = 0, last = 0;
    const loop = (now) => {
      if (removed) return;
      if (!start) start = last = now;
      const t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      animate(t, dt);
      if (t > DUR + 0.6) finish(); // доигрываем, пока заставка растворяется
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }).catch(() => { clearTimeout(slow); finish(); });
}
