"""Рендер носорога для шапки Black Friday (Blender Cycles, процессор).

Каждый источник света рендерится отдельным слоем — на сайте слои складываются, и свет «оживает»
(js/app.js, раздел «Black Friday: живой свет»). Дальше слои собирает tools/blackfriday/post.py.

Запуск (нужен модуль Blender: pip install bpy==5.2.3 numpy):
  python render.py mask   rhino.blend out/            — проверка, что лицо не видно (глаза и ноздри = 0 пикселей)
  python render.py passes rhino.blend out/            — слои света + силуэт в out/*.npy
Размер и качество: переменные RES (ширина, по умолчанию 900) и SPP (сэмплы, по умолчанию 160).
"""
import bpy, sys, os, math, time
import numpy as np
from mathutils import Vector

MODE, BLEND, OUT = sys.argv[-3], os.path.abspath(sys.argv[-2]), os.path.abspath(sys.argv[-1])
RES = int(os.environ.get('RES', 900))
SPP = int(os.environ.get('SPP', 160))
os.makedirs(OUT, exist_ok=True)

# Камера: сзади (носорог смотрит по −Y), чуть сбоку и снизу. Угол проверен режимом mask.
CAM_AZ = float(os.environ.get('CAM_AZ', 12))     # градусы от «строго сзади»; до 14° лицо не видно
CAM_DIST, CAM_H, LOOK_H = 6.2, 0.85, 1.0
# Свет: (имя слоя, угол от камеры вокруг носорога, радиус, высота, мощность, размер). Слева направо в кадре.
ARC = [
    ('arc0',  78, 3.0, 1.9,  900, (0.5, 1.6)),
    ('arc1', 112, 3.0, 2.1, 1200, (0.5, 1.6)),
    ('arc2', 148, 3.0, 2.3, 2100, (0.5, 1.6)),
    ('arc3', 180, 2.2, 3.3, 1700, (1.2, 0.5)),   # сверху-сзади: контур шляпы и плеч
    ('arc4', 212, 3.0, 2.3, 2100, (0.5, 1.6)),
    ('arc5', 248, 3.0, 2.1, 1200, (0.5, 1.6)),
    ('arc6', 282, 3.0, 1.9,  900, (0.5, 1.6)),
]


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def polar(az_deg, r, h):
    a = math.radians(az_deg)
    return (r * math.sin(a), r * math.cos(a), h)


def setup():
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    sc = bpy.context.scene
    for o in list(bpy.data.objects):                 # свой свет и камера вместо тех, что в файле
        if o.type in {'LIGHT', 'CAMERA'}:
            bpy.data.objects.remove(o, do_unlink=True)
    bg = sc.world.node_tree.nodes.get('Background')
    if bg: bg.inputs['Strength'].default_value = 0   # чёрный мир: свет только от прожекторов

    cd = bpy.data.cameras.new('CAM-bf'); cd.lens = 85; cd.sensor_width = 36
    cam = bpy.data.objects.new('CAM-bf', cd); sc.collection.objects.link(cam)
    cam.location = polar(CAM_AZ, CAM_DIST, CAM_H); aim(cam, (0, 0, LOOK_H)); sc.camera = cam

    # глянцевый пол с неровным блеском (как полированный бетон)
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
    floor = bpy.context.object; floor.name = 'BF-floor'
    m = bpy.data.materials.new('BF-floor'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.012, 0.012, 0.012, 1)
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 2.2; noise.inputs['Detail'].default_value = 6
    ramp = nt.nodes.new('ShaderNodeMapRange'); ramp.inputs['To Min'].default_value = 0.1; ramp.inputs['To Max'].default_value = 0.34
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Value']); nt.links.new(ramp.outputs['Result'], b.inputs['Roughness'])
    floor.data.materials.append(m)

    lights = {}
    def area(name, loc, target, power, size):
        L = bpy.data.lights.new(name, 'AREA'); L.shape = 'RECTANGLE'; L.size, L.size_y = size; L.energy = power
        o = bpy.data.objects.new(name, L); o.location = loc; aim(o, target); sc.collection.objects.link(o)
        o.visible_camera = False
        lights[name] = o
    for name, rel, r, h, power, size in ARC:
        area(name, polar(CAM_AZ + rel, r, h), (0, 0, 1.3), power, size)
    area('key', polar(CAM_AZ + 38, 4.2, 2.4), (0, 0, 1.2), 620, (2.4, 2.4))   # мягкий свет спереди-слева: складки куртки, сумка
    # пол эти прожекторы не освещают (иначе он засвечен до краёв кадра) — на нём только отражение фигуры
    nofloor = bpy.data.collections.new('BF-no-floor'); nofloor.objects.link(floor)
    nofloor.collection_objects[0].light_linking.link_state = 'EXCLUDE'
    for o in lights.values(): o.light_linking.receiver_collection = nofloor
    spot = bpy.data.lights.new('top', 'SPOT'); spot.energy = 3400; spot.spot_size = math.radians(21); spot.spot_blend = 0.75; spot.shadow_soft_size = 0.12
    so = bpy.data.objects.new('top', spot); so.location = (0.0, 0.3, 5.2); aim(so, (0, 0.05, 0)); sc.collection.objects.link(so)
    lights['top'] = so                                                          # луч сверху: круглое пятно света на полу

    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = SPP; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.015
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception as e: print('denoiser:', e)
    sc.cycles.max_bounces = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    sc.render.use_persistent_data = True
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = RES, RES * 4 // 3, 100
    sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'
    return sc, floor, lights


def render(sc, name):
    path = os.path.join(OUT, name + '.exr')
    sc.render.filepath = path
    t = time.time(); bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]   # строки сверху вниз
    bpy.data.images.remove(img); os.remove(path)
    print(f'{name}: {time.time() - t:.0f} c', flush=True)
    return px


if MODE == 'mask':
    # глаза и ноздри — красным светом, всё остальное — чёрным: считаем красные пиксели при разных углах камеры
    sc, floor, lights = setup()
    red = bpy.data.materials.new('CHK-red'); red.use_nodes = True
    e = red.node_tree.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1, 0, 0, 1)
    red.node_tree.links.new(e.outputs[0], red.node_tree.nodes['Material Output'].inputs['Surface'])
    black = bpy.data.materials.new('CHK-black'); black.use_nodes = True
    k = black.node_tree.nodes.new('ShaderNodeEmission'); k.inputs['Strength'].default_value = 0
    black.node_tree.links.new(k.outputs[0], black.node_tree.nodes['Material Output'].inputs['Surface'])
    for o in bpy.data.objects:
        if o.type != 'MESH': continue
        face = o.name.startswith(('GEO-rhino-eye', 'GEO-rhino-nostril'))
        o.data.materials.clear(); o.data.materials.append(red if face else black)
    for l in lights.values(): l.hide_render = True
    sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.use_adaptive_sampling = False
    for az in [float(a) for a in os.environ.get('AZS', '0,10,20,30,40,50,60').split(',')]:
        sc.camera.location = polar(az, CAM_DIST, CAM_H); aim(sc.camera, (0, 0, LOOK_H))
        px = render(sc, f'mask_{az:g}')
        print(f'угол камеры {az:g}°: глаза+ноздри = {int(((px[..., 0] > 0.3) & (px[..., 1] < 0.1)).sum())} пикселей', flush=True)
else:
    sc, floor, lights = setup()
    lum = lambda px: (0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]).astype(np.float32)
    for name in lights:
        for n, l in lights.items(): l.hide_render = n != name
        np.save(os.path.join(OUT, name + '.npy'), lum(render(sc, name)))
    # силуэт носорога (для перекрытия надписи позади): прозрачный фон, без пола
    for l in lights.values(): l.hide_render = True
    floor.hide_render = True; sc.render.film_transparent = True
    sc.cycles.samples = 16; sc.cycles.use_denoising = False
    np.save(os.path.join(OUT, 'matte.npy'), render(sc, 'matte')[..., 3].astype(np.float32))
    print('готово', flush=True)
