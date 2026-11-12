"""Обзорные рендеры модели при ровном студийном свете — чтобы проверять правки.

  python look.py rhino.blend /tmp/out/prefix          (нужен модуль Blender: pip install bpy==5.2.3)

Переменные: VIEWS (список видов через запятую), RES (ширина), SPP (сэмплы), EXP (экспозиция),
LIGHT (яркость света), CLAY=1 (серый «пластилин» вместо материалов), HIDE (скрыть объекты по началу имени).
"""
import bpy, sys, os, math
from mathutils import Vector

BLEND, OUT = os.path.abspath(sys.argv[-2]), os.path.abspath(sys.argv[-1])
RES = int(os.environ.get('RES', 700)); SPP = int(os.environ.get('SPP', 48))
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
if os.environ.get('HIDE'):
    for o in bpy.data.objects:
        if o.name.startswith(tuple(os.environ['HIDE'].split(','))): o.hide_render = True
if os.environ.get('CLAY'):
    clay = bpy.data.materials.new('clay'); clay.use_nodes = True
    clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.5, 0.5, 0.5, 1)
    clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
    for o in bpy.data.objects:
        if o.type == 'MESH': o.data.materials.clear(); o.data.materials.append(clay)
for o in list(bpy.data.objects):
    if o.type in {'LIGHT', 'CAMERA'}: bpy.data.objects.remove(o, do_unlink=True)
bg = sc.world.node_tree.nodes.get('Background')
if bg: bg.inputs['Strength'].default_value = 0.25; bg.inputs['Color'].default_value = (0.5, 0.5, 0.5, 1)
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
fl = bpy.context.object; m = bpy.data.materials.new('fl'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.35, 0.35, 0.35, 1); fl.data.materials.append(m)


def aim(o, t): o.rotation_euler = (Vector(t) - o.location).to_track_quat('-Z', 'Y').to_euler()
def polar(az, r, h): a = math.radians(az); return (r * math.sin(a), r * math.cos(a), h)


def area(loc, tgt, power, size):
    L = bpy.data.lights.new('L', 'AREA'); L.size = size; L.energy = power * float(os.environ.get('LIGHT', 1))
    o = bpy.data.objects.new('L', L); o.location = loc; aim(o, tgt); sc.collection.objects.link(o)


cd = bpy.data.cameras.new('C'); cam = bpy.data.objects.new('C', cd); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = 'CYCLES'; sc.cycles.samples = SPP; sc.cycles.use_denoising = True
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
sc.render.use_persistent_data = True
sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = float(os.environ.get('EXP', 0))
sc.render.image_settings.file_format = 'PNG'
# вид: (угол камеры от «строго сзади», расстояние, высота камеры, куда смотрит, объектив, ширина : высота)
VIEWS = {
    'back':    (12, 6.0, 1.1, (0, 0, 1.0), 85, 3, 4),
    'side':    (90, 6.0, 1.1, (0, 0, 1.0), 85, 3, 4),
    'front34': (215, 6.0, 1.2, (0, 0, 1.0), 85, 3, 4),
    'jacket':  (20, 3.2, 1.4, (0, 0, 1.25), 85, 1, 1),
    'jacketF': (200, 3.2, 1.4, (0, 0, 1.25), 85, 1, 1),
    'strapB':  (5, 2.2, 1.5, (0, 0.1, 1.35), 85, 4, 3),
    'strapS':  (300, 2.4, 1.5, (-0.1, 0, 1.4), 85, 4, 3),         # правое плечо сбоку-сзади
    'shoesB':  (25, 2.0, 0.35, (0.05, 0, 0.1), 85, 4, 3),
    'shoesF':  (215, 2.0, 0.45, (0.05, 0, 0.1), 85, 4, 3),
    'shoeL':   (132, 1.5, 0.22, (0.30, -0.03, 0.08), 85, 4, 3),   # левый кроссовок сбоку-снаружи
    'shoeLb':  (40, 1.5, 0.30, (0.30, -0.03, 0.08), 85, 4, 3),    # сзади-снаружи
    'shoeLf':  (222, 1.5, 0.45, (0.30, -0.03, 0.08), 85, 4, 3),   # спереди
    'shoeTop': (180, 1.4, 1.3, (0.30, -0.03, 0.05), 85, 4, 3),    # сверху
}
for name in os.environ.get('VIEWS', ','.join(VIEWS)).split(','):
    az, d, h, tgt, lens, aw, ah = VIEWS[name]
    cd.lens = lens; cam.location = polar(az, d, h); aim(cam, tgt)
    sc.render.resolution_x = RES; sc.render.resolution_y = RES * ah // aw
    for o in [o for o in bpy.data.objects if o.type == 'LIGHT']: bpy.data.objects.remove(o, do_unlink=True)
    area(polar(az + 35, 4, 3.0), tgt, 900, 2.5); area(polar(az - 50, 4, 1.5), tgt, 350, 3); area(polar(az + 170, 3.5, 2.6), tgt, 700, 1.5)
    sc.render.filepath = f'{OUT}_{name}.png'
    bpy.ops.render.render(write_still=True)
    print('view', name, flush=True)
