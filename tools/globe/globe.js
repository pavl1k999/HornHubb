/* ==========================================================
   HORN HUB — новогодний снежный шар с носорогом (исходник).
   Сайт подключает собранный файл js/globe.js — после правок
   пересоберите его (команда — в tools/globe/README.md).

   Внутри шара: снег, ёлка с гирляндой, подарки и носорог —
   он стоит спиной к нам и смотрит на ёлку. Лицо не показываем:
   поворот шара ограничен (MAX_TURN), глаза закрыты головой и полями
   шляпы — проверено рендером, ноздри скрыты.
   Нажатие — встряхнуть шар, движение пальцем вбок — покрутить.
   ========================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, PointLight, Group, Mesh,
  SphereGeometry, CylinderGeometry, ConeGeometry, BoxGeometry, TorusGeometry, OctahedronGeometry,
  MeshStandardMaterial, MeshBasicMaterial, ShaderMaterial, PointsMaterial, Points, InstancedMesh,
  BufferGeometry, Float32BufferAttribute, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping,
  PCFSoftShadowMap, AdditiveBlending, FrontSide, BackSide, Color, Matrix4, Vector3, MathUtils,
  PMREMGenerator, Sprite, SpriteMaterial,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SNOW = 420;                       // снежинок внутри шара
const MAX_TURN = MathUtils.degToRad(40); // дальше поворачивать нельзя — может стать видно лицо
const VIEW_EL = MathUtils.degToRad(27);  // обычный ракурс: чуть сверху, со спины носорога
const INTRO = 2.2;                       // с: камера опускается сверху к шару
const GROUND_Y = -0.69, MOUND_R = 0.72, MOUND_H = 0.27; // холм лежит прямо на подставке
const groundAt = (x, z) => GROUND_Y + MOUND_H * Math.sqrt(Math.max(0, MOUND_R * MOUND_R - x * x - z * z));
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// золотая надпись по кругу подставки
function bandTexture(text) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 128;
  const g = c.getContext('2d');
  g.font = '800 64px Unbounded, "Arial Black", sans-serif';
  g.textBaseline = 'middle';
  g.fillStyle = '#e9c46a';
  g.shadowColor = 'rgba(0,0,0,.45)';
  g.shadowBlur = 4;
  const w = g.measureText(text).width;
  for (let x = 20; x < c.width; x += w) g.fillText(text, x, 68);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Стекло: прозрачное в середине, светлеет к краям (френель) + блик
function glassMaterial(side, strength) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, side,
    uniforms: { uStrength: { value: strength } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uStrength; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN); vec3 v = normalize(vV);
        float f = pow(1.0 - abs(dot(n, v)), 2.6);
        vec3 l = normalize(vec3(-0.55, 0.75, 0.6));
        float s = pow(max(dot(n, normalize(l + v)), 0.0), 220.0) * 0.8;
        float s2 = pow(max(dot(n, normalize(vec3(0.7, 0.2, 0.7) + v)), 0.0), 80.0) * 0.25;
        vec3 c = mix(vec3(0.62, 0.78, 1.0), vec3(1.0), f);
        gl_FragColor = vec4(c + (s + s2), (0.015 + 0.42 * f + (s + s2) * 0.8) * uStrength);
      }`,
  });
}

function makeTree() {
  const tree = new Group();
  const green = new MeshStandardMaterial({ color: 0x0d4527, roughness: 0.9, flatShading: true });
  const snow = new MeshStandardMaterial({ color: 0xdfe7f6, roughness: 1, flatShading: true });
  const trunk = new Mesh(new CylinderGeometry(0.025, 0.03, 0.08, 8), new MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.9 }));
  trunk.position.y = 0.04;
  tree.add(trunk);
  const tiers = [[0.2, 0.24, 0.17], [0.155, 0.21, 0.31], [0.105, 0.18, 0.44]]; // радиус, высота, центр по y
  for (const [r, h, y] of tiers) {
    const cone = new Mesh(new ConeGeometry(r, h, 10), green);
    cone.position.y = y;
    const cap = new Mesh(new ConeGeometry(r * 0.55, h * 0.42, 10), snow);
    cap.position.y = y + h * 0.3;
    tree.add(cone, cap);
  }
  const star = new Mesh(new OctahedronGeometry(0.03), new MeshBasicMaterial({ color: 0xffd76a }));
  star.position.y = 0.56;
  tree.add(star);
  const glow = new Sprite(new SpriteMaterial({ map: dotTexture(), color: 0xffcf70, transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending }));
  glow.scale.setScalar(0.16);
  glow.position.y = 0.56;
  tree.add(glow);
  // гирлянда — огоньки по спирали
  const N = 30, bulbs = new InstancedMesh(new SphereGeometry(0.011, 6, 6), new MeshBasicMaterial(), N);
  const m = new Matrix4();
  for (let i = 0; i < N; i++) {
    const k = i / N, y = 0.12 + k * 0.4, r = 0.19 * (1 - k * 0.78) + 0.012;
    const a = k * Math.PI * 7;
    m.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r);
    bulbs.setMatrixAt(i, m);
  }
  const palette = [0xffd76a, 0xff4d5e, 0x6ee7a0, 0x7ab8ff].map((c) => new Color(c));
  const tmp = new Color();
  tree.add(bulbs);
  tree.twinkle = (t) => {
    for (let i = 0; i < N; i++) {
      const on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + i * 1.7));
      bulbs.setColorAt(i, tmp.copy(palette[i % palette.length]).multiplyScalar(on));
    }
    bulbs.instanceColor.needsUpdate = true;
    glow.material.opacity = 0.75 + 0.2 * Math.sin(t * 3.1);
  };
  tree.twinkle(0);
  tree.traverse((o) => { if (o.isMesh && o !== star) { o.castShadow = true; o.receiveShadow = true; } });
  bulbs.castShadow = false;
  return tree;
}

function makeGift(w, h, d, color, ribbon) {
  const g = new Group();
  const box = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color, roughness: 0.55 }));
  box.position.y = h / 2;
  const rib = new MeshStandardMaterial({ color: ribbon, roughness: 0.35, metalness: 0.4 });
  const r1 = new Mesh(new BoxGeometry(w * 1.02, h * 1.02, d * 0.18), rib);
  const r2 = new Mesh(new BoxGeometry(w * 0.18, h * 1.02, d * 1.02), rib);
  r1.position.y = r2.position.y = h / 2;
  const bow = new Mesh(new TorusGeometry(Math.min(w, d) * 0.16, Math.min(w, d) * 0.05, 6, 12), rib);
  bow.position.y = h + 0.008;
  bow.rotation.x = Math.PI / 2.4;
  g.add(box, r1, r2, bow);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// фонарь — тёплый свет рядом с носорогом
function makeLamp(dot) {
  const g = new Group();
  const iron = new MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.5, metalness: 0.6 });
  const post = new Mesh(new CylinderGeometry(0.012, 0.018, 0.52, 8), iron);
  post.position.y = 0.26;
  const head = new Mesh(new CylinderGeometry(0.03, 0.045, 0.06, 6), iron);
  head.position.y = 0.55;
  const lampBulb = new Mesh(new SphereGeometry(0.022, 10, 8), new MeshBasicMaterial({ color: 0xffd58a }));
  lampBulb.position.y = 0.51;
  const cap = new Mesh(new ConeGeometry(0.05, 0.035, 6), iron);
  cap.position.y = 0.6;
  const halo = new Sprite(new SpriteMaterial({ map: dot, color: 0xffc46b, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }));
  halo.scale.setScalar(0.22);
  halo.position.y = 0.51;
  const light = new PointLight(0xffc46b, 1.6, 1.1, 2);
  light.position.y = 0.48;
  g.add(post, head, lampBulb, cap, halo, light);
  [post, head, cap].forEach((m) => { m.castShadow = true; });
  return g;
}

function makeSnow(texture) {
  const pos = new Float32Array(SNOW * 3), vel = new Float32Array(SNOW * 3), rest = new Float32Array(SNOW);
  const spawnTop = (i) => {
    // случайная точка в верхней части шара
    for (;;) {
      const x = (Math.random() * 2 - 1) * 0.85, z = (Math.random() * 2 - 1) * 0.85, y = 0.05 + Math.random() * 0.8;
      if (x * x + y * y + z * z < 0.8) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; break; }
    }
    vel[i * 3] = vel[i * 3 + 1] = vel[i * 3 + 2] = 0;
  };
  for (let i = 0; i < SNOW; i++) {
    spawnTop(i);
    pos[i * 3 + 1] = MathUtils.lerp(groundAt(pos[i * 3], pos[i * 3 + 2]) + 0.02, pos[i * 3 + 1], Math.random());
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ size: 0.034, map: texture, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.95 });
  const pts = new Points(geo, mat);
  pts.renderOrder = 2;
  let energy = 0;
  pts.shake = (power = 1) => {
    energy = Math.min(1.6, energy + power);
    for (let i = 0; i < SNOW; i++) {
      rest[i] = 0;
      vel[i * 3] += (Math.random() - 0.5) * 1.6 * power;
      vel[i * 3 + 1] += (0.6 + Math.random() * 1.4) * power;
      vel[i * 3 + 2] += (Math.random() - 0.5) * 1.6 * power;
    }
  };
  pts.update = (dt, t) => {
    energy *= Math.exp(-dt * 0.6);
    for (let i = 0; i < SNOW; i++) {
      const j = i * 3;
      if (rest[i] > 0) { // лежит на снегу, потом снова падает сверху
        rest[i] -= dt;
        if (rest[i] <= 0) spawnTop(i);
        continue;
      }
      let x = pos[j], y = pos[j + 1], z = pos[j + 2];
      // вихрь после встряски + лёгкое покачивание
      vel[j] += (-z * 1.4 * energy + Math.sin(t * 1.3 + i) * 0.02) * dt;
      vel[j + 2] += (x * 1.4 * energy + Math.cos(t * 1.1 + i) * 0.02) * dt;
      vel[j + 1] -= 0.22 * dt;
      const drag = Math.exp(-dt * 2.2);
      vel[j] *= drag; vel[j + 1] *= drag; vel[j + 2] *= drag;
      const fall = -0.035 - (i % 7) * 0.006; // предельная скорость падения
      if (vel[j + 1] < fall) vel[j + 1] = MathUtils.lerp(vel[j + 1], fall, 0.2);
      x += vel[j] * dt; y += vel[j + 1] * dt; z += vel[j + 2] * dt;
      const r = Math.sqrt(x * x + y * y + z * z);
      if (r > 0.93) { // упёрлась в стекло
        const k = 0.93 / r; x *= k; y *= k; z *= k;
        const vn = (vel[j] * x + vel[j + 1] * y + vel[j + 2] * z) / 0.93;
        if (vn > 0) { vel[j] -= 1.5 * vn * x / 0.93; vel[j + 1] -= 1.5 * vn * y / 0.93; vel[j + 2] -= 1.5 * vn * z / 0.93; }
      }
      const gy = groundAt(x, z) + 0.008;
      if (y < gy) { y = gy; rest[i] = 0.6 + Math.random() * 3.5; }
      pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

/**
 * Ставит снежный шар в container (элемент с заданным размером).
 * glb — Promise<ArrayBuffer> с моделью носорога.
 * onReady — шар нарисован, onShake — шар встряхнули (для вибрации).
 * debug: true — время не идёт само, управление через window.__globe (для проверок и картинки-заглушки).
 */
export function mountGlobe({ container, glb, onReady = () => {}, onShake = () => {}, onFail = () => {}, debug = false }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: debug, powerPreference: 'high-performance' });
  } catch {
    onFail();
    return { destroy() {} };
  }
  const canvas = renderer.domElement;
  canvas.className = 'globe-canvas';
  container.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new PerspectiveCamera(30, 1, 0.1, 40);

  scene.add(new HemisphereLight(0x9fb8ff, 0x1d1830, 0.38));
  const moon = new DirectionalLight(0xdbe7ff, 1.5);
  moon.position.set(-1.6, 3.2, 2.4);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: 0.5, far: 8 });
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.01;
  scene.add(moon);
  const back = new DirectionalLight(0x86a8ff, 1.2);
  back.position.set(0.8, 1.5, -3);
  scene.add(back);

  const globe = new Group();          // крутится пальцем и качается при встряске
  scene.add(globe);
  const dot = dotTexture();

  // подставка: красный лак, золотые кольца и надпись
  const baseMat = new MeshStandardMaterial({ color: 0x7c1020, roughness: 0.32, metalness: 0.1 });
  const gold = new MeshStandardMaterial({ color: 0xd8ac4f, roughness: 0.28, metalness: 1 });
  const base = new Mesh(new CylinderGeometry(0.73, 0.86, 0.42, 72), baseMat);
  base.position.y = -0.9;
  const ring1 = new Mesh(new TorusGeometry(0.735, 0.028, 12, 72), gold);
  ring1.rotation.x = Math.PI / 2; ring1.position.y = -0.69;
  const ring2 = new Mesh(new TorusGeometry(0.862, 0.03, 12, 72), gold);
  ring2.rotation.x = Math.PI / 2; ring2.position.y = -1.11;
  const band = new Mesh(new CylinderGeometry(0.788, 0.806, 0.13, 72, 1, true),
    new MeshStandardMaterial({ map: bandTexture('HORN HUB  ✦  2027  ✦  '), transparent: true, roughness: 0.3, metalness: 0.9, color: 0xffffff }));
  band.position.y = -0.9;
  band.rotation.y = -Math.PI / 2;
  globe.add(base, ring1, ring2, band);

  // внутри шара
  const inner = new Group();
  globe.add(inner);
  // снежный холм с неровными сугробами
  const moundGeo = new SphereGeometry(MOUND_R, 64, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const mp = moundGeo.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
    const bump = 0.035 * Math.sin(x * 9 + z * 4) * Math.cos(z * 7 - x * 3) * (y / MOUND_R);
    mp.setY(i, y + bump);
  }
  moundGeo.computeVertexNormals();
  const mound = new Mesh(moundGeo, new MeshStandardMaterial({ color: 0xc8d3ea, roughness: 1 }));
  mound.scale.y = MOUND_H / MOUND_R;
  mound.position.y = GROUND_Y;
  mound.receiveShadow = true;
  inner.add(mound);

  const tree = makeTree();
  tree.position.set(0.24, groundAt(0.24, -0.3) - 0.02, -0.3);
  tree.scale.setScalar(1.05);
  inner.add(tree);
  const lamp = makeLamp(dot);
  lamp.position.set(-0.46, groundAt(-0.46, -0.28) - 0.01, -0.28);
  inner.add(lamp);
  const treeLight = new PointLight(0xffc46b, 1.4, 1.3, 2);
  treeLight.position.set(0.12, -0.12, -0.05);
  inner.add(treeLight);
  const gifts = [
    [makeGift(0.1, 0.08, 0.1, 0xc1121f, 0xe9c46a), -0.28, -0.2, 0.4],
    [makeGift(0.08, 0.1, 0.08, 0x2b59c3, 0xf1f5ff), 0.46, -0.02, -0.5],
    [makeGift(0.07, 0.06, 0.07, 0xd8ac4f, 0xc1121f), 0.02, -0.46, 0.9],
  ];
  for (const [g, x, z, rot] of gifts) {
    g.position.set(x, groundAt(x, z) - 0.01, z);
    g.rotation.y = rot;
    inner.add(g);
  }
  const snow = makeSnow(dot);
  inner.add(snow);

  // стекло: внутренняя сторона слабее, внешняя — с бликами
  const glassBack = new Mesh(new SphereGeometry(1, 64, 48), glassMaterial(BackSide, 0.35));
  const glassFront = new Mesh(new SphereGeometry(1, 64, 48), glassMaterial(FrontSide, 1));
  glassBack.renderOrder = 1;
  glassFront.renderOrder = 3;
  globe.add(glassBack, glassFront);

  let rhino, upper, head;
  let w = 1, h = 1;
  const resize = () => {
    w = Math.max(1, container.clientWidth); h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(container);

  // шар (вместе с подставкой) целиком помещается в кадр
  const fit = () => {
    const v = MathUtils.degToRad(camera.fov / 2);
    const hz = Math.atan(Math.tan(v) * camera.aspect);
    return 1.22 / Math.sin(Math.min(v, hz));
  };
  const target = new Vector3(0, -0.08, 0);
  const pose = (el, dist) => {
    camera.position.set(0, target.y + dist * Math.sin(el), dist * Math.cos(el));
    camera.lookAt(target);
  };

  // управление: вбок — покрутить (с пределом), нажатие — встряхнуть
  let turn = 0, turnVel = 0, dragging = false, downX = 0, downTurn = 0, lastX = 0, lastMove = 0, moved = false;
  let wobble = 0, idleSince = 0;
  const onDown = (e) => {
    dragging = true; moved = false; downX = lastX = e.clientX; downTurn = turn; turnVel = 0;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - downX;
    if (Math.abs(dx) > 6) moved = true;
    if (!moved) return;
    const now = performance.now();
    turn = MathUtils.clamp(downTurn + dx * 0.008, -MAX_TURN, MAX_TURN);
    turnVel = ((e.clientX - lastX) * 0.008) / Math.max(0.016, (now - lastMove) / 1000);
    lastX = e.clientX; lastMove = now;
  };
  const shake = (power = 1) => { snow.shake(power); wobble = 1; idleSince = clock; onShake(); };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    idleSince = clock;
    if (!moved) shake(1);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  let clock = 0;
  const animate = (dt) => {
    clock += dt;
    const k = ease(clock / INTRO); // при появлении камера опускается сверху
    pose(MathUtils.lerp(MathUtils.degToRad(82), VIEW_EL, k), MathUtils.lerp(fit() * 0.78, fit(), k));
    if (!dragging) {
      turn += turnVel * dt;
      turnVel *= Math.exp(-dt * 3);
      // через пару секунд без касаний шар сам возвращается и чуть покачивается
      const rest = clock - idleSince > 2.5 ? Math.sin(clock * 0.35) * 0.18 : turn;
      turn = MathUtils.clamp(MathUtils.lerp(turn, rest, 1 - Math.exp(-dt * 1.2)), -MAX_TURN, MAX_TURN);
    }
    wobble *= Math.exp(-dt * 3.5);
    globe.rotation.y = turn;
    globe.rotation.z = Math.sin(clock * 18) * 0.06 * wobble;
    globe.position.y = Math.abs(Math.sin(clock * 18)) * 0.02 * wobble;
    snow.update(Math.min(dt, 0.05), clock);
    tree.twinkle(clock);
    treeLight.intensity = 1.4 + Math.sin(clock * 2.4) * 0.3;
    if (upper) upper.scale.y = 1 + Math.sin(clock * 2.1) * 0.006;
    if (head) {
      head.rotation.x = MathUtils.degToRad(4 + Math.sin(clock * 0.9) * 1.5);
      head.rotation.y = MathUtils.degToRad(Math.sin(clock * 0.6) * 5);
    }
    renderer.render(scene, camera);
  };

  // рисуем только когда шар виден на экране, не чаще 30 кадров в секунду
  let raf = 0, last = 0, visible = true, dead = false, started = false;
  const loop = (now) => {
    raf = 0;
    if (dead || !visible || document.hidden) return;
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 31) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
    last = now;
    animate(dt);
  };
  const wake = () => { if (started && !raf && !dead && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
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
    rhino.scale.setScalar(0.74 / 1.97);
    rhino.position.set(-0.08, groundAt(-0.08, 0.14) - 0.005, 0.14);
    rhino.rotation.y = Math.PI - 0.38; // спиной к нам, смотрит на ёлку
    inner.add(rhino);
    snow.shake(0.9);
    started = true;
    if (debug) {
      window.__globe = { scene, camera, renderer, rhino, globe, snow, shake, step: animate, setTurn: (v) => { turn = v; idleSince = clock; } };
      animate(0);
    } else {
      raf = requestAnimationFrame(loop);
    }
    onReady();
  }).catch(() => { if (!dead) onFail(); });

  return {
    shake,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      io?.disconnect(); ro?.disconnect();
      document.removeEventListener('visibilitychange', wake);
      try { renderer.dispose(); renderer.forceContextLoss(); } catch {}
      canvas.remove();
    },
  };
}
