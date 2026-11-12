"""Экспорт носорога из Blender для сайта: rhino.blend → rhino_raw.glb (дальше — сжатие, см. README.md).
Запуск: python export.py rhino.blend rhino_raw.glb  (нужен модуль Blender: pip install bpy==5.2.3)"""
import bpy, sys
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=src)

# 1) Процедурные материалы → постоянные значения (сайт формулы Blender не понимает)
FIX = {  # base color (linear), roughness
    'MAT-bag-nylon':     ((0.007, 0.006, 0.005), 0.6),
    'MAT-fabric-hat':    ((0.007, 0.006, 0.005), 0.8),
    'MAT-fabric-jacket': ((0.008, 0.006, 0.005), 0.82),
    'MAT-fabric-pants':  ((0.008, 0.006, 0.005), 0.86),
    'MAT-rib-knit':      ((0.006, 0.005, 0.004), 0.9),
    'MAT-skin-rhino':    ((0.07, 0.052, 0.042), 0.55),  # темнее, как на баннере
    'MAT-horn':          ((0.1, 0.078, 0.06), 0.5),
    'MAT-metal-zip':     ((0.25, 0.25, 0.24), 0.3),
}
for m in bpy.data.materials:
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if not bsdf: continue
    for name in ('Base Color', 'Roughness', 'Normal', 'Metallic'):
        inp = bsdf.inputs[name]
        for l in list(inp.links): nt.links.remove(l)
    # экспорт берёт оттенок блеска ткани без его силы — умножаем сами
    w = bsdf.inputs['Sheen Weight'].default_value
    if w > 0 and not bsdf.inputs['Sheen Weight'].is_linked:
        tint = bsdf.inputs['Sheen Tint'].default_value
        bsdf.inputs['Sheen Tint'].default_value = (tint[0] * w, tint[1] * w, tint[2] * w, 1.0)
        bsdf.inputs['Sheen Weight'].default_value = 1.0
    if m.name in FIX:
        col, rough = FIX[m.name]
        bsdf.inputs['Base Color'].default_value = (*col, 1.0)
        bsdf.inputs['Roughness'].default_value = rough

# Глаза — отдельным материалом (у значка на шляпе такой же), чтобы проверять, что лицо не видно
eye = bpy.data.materials['MAT-eye'].copy(); eye.name = 'MAT-rhino-eye'
next(n for n in eye.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled').inputs['Roughness'].default_value = 0.1  # иначе сжатие склеит с MAT-eye
for n in ('GEO-rhino-eye.L', 'GEO-rhino-eye.R'):
    bpy.data.objects[n].data.materials[0] = eye

# 2) Сглаживание полегче: 2 → 1
rh = bpy.data.collections['RHINO']
objs = [o for o in rh.all_objects if o.type == 'MESH' and not o.hide_render and o.visible_get()]
for o in objs:
    for mod in o.modifiers:
        if mod.type == 'SUBSURF':
            mod.levels = min(mod.levels, 1); mod.render_levels = mod.levels

# 3) Группы для анимации: ноги / корпус (дыхание) / голова со шляпой (покачивание)
def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc
    bpy.context.scene.collection.objects.link(e)
    if parent: e.parent = parent
    return e
root  = empty('RHINO', (0, 0, 0))
lower = empty('LOWER', (0, 0, 0), root)
upper = empty('UPPER', (0, 0, 0.98), root)
bpy.context.view_layer.update()
head  = empty('HEAD', (0, 0.0, 1.0 - 0.98 + 0.58), upper)  # шея ≈ z 1.56
bpy.context.view_layer.update()
def group(n):
    if n.startswith(('GEO-hat-', 'GEO-rhino-head', 'GEO-rhino-horn', 'GEO-rhino-eye', 'GEO-rhino-nostril')): return head
    if n.startswith(('GEO-pants-', 'GEO-shoe-')): return lower
    return upper
for o in objs:
    p = group(o.name); mw = o.matrix_world.copy()
    o.parent = p; o.matrix_world = mw
bpy.context.view_layer.update()
print("head pivot world:", tuple(round(v, 3) for v in head.matrix_world.translation))

bpy.ops.object.select_all(action='DESELECT')
for o in objs + [root, lower, upper, head]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
    export_yup=True, export_texcoords=False, export_normals=True, export_materials='EXPORT',
    export_cameras=False, export_lights=False, export_extras=False, export_animations=False)
print("exported", out)
