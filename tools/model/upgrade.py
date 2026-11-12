"""Доработка модели носорога: ремень сумки и кроссовки. Куртка, штаны и всё остальное не меняются.

  python upgrade.py rhino_src.blend rhino.blend      (нужен модуль Blender: pip install bpy==5.2.3 numpy)

rhino_src.blend — исходная модель, rhino.blend — результат (его используют рендер Black Friday и снежный шар).

  1. Ремень сумки строится заново по поверхности куртки: натянутая стропа от сумки через плечо и спину,
     слегка вдавлена в ткань; под ней куртка примята, рядом ткань плавно поднимается.
  2. Кроссовки — sneaker.py.
"""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sneaker

SRC, DST = os.path.abspath(sys.argv[-2]), os.path.abspath(sys.argv[-1])
bpy.ops.wm.open_mainfile(filepath=SRC)
sc = bpy.context.scene
D = bpy.data
RH = D.collections['RHINO']


def coords(me):
    a = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', a); return a.reshape(-1, 3).astype(np.float64)


# ── 1. Ремень сумки ────────────────────────────────────────────────────────
STRAP_HW, STRAP_T = 0.016, 0.0035       # полуширина и толщина стропы
STRAP_PRESS = 0.006                     # насколько стропа вдавлена в ткань


def strap():
    old = D.objects['GEO-bag-strap']
    oc = coords(old.data)
    # ось старого ремня: центры его колец, от верхнего конца у сумки через плечо и спину к нижнему
    bm = bmesh.new(); bm.from_mesh(old.data); bm.verts.ensure_lookup_table()
    bnd = {v.index for e in bm.edges if e.is_boundary for v in e.verts}
    top = max(bnd, key=lambda i: oc[i][2])
    ring = {top}
    while True:                                                            # всё кольцо верхнего конца
        more = {e.other_vert(bm.verts[i]).index for i in ring for e in bm.verts[i].link_edges if e.is_boundary} - ring
        if not more: break
        ring |= more
    seen = set(ring); ctrl = [oc[list(ring)].mean(0)]
    while True:
        nxt = {e.other_vert(bm.verts[i]).index for i in ring for e in bm.verts[i].link_edges} - seen
        if not nxt: break
        ctrl.append(oc[list(nxt)].mean(0)); seen |= nxt; ring = nxt
    bm.free(); ctrl = np.array(ctrl)
    t = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(ctrl, axis=0), axis=1))]); t /= t[-1]
    N = 280; u = np.linspace(0, 1, N)
    path = np.stack([sneaker.cr(t, ctrl[:, k])(u) for k in range(3)], 1)   # гладкая кривая через эти точки

    # куртка как есть (со всеми её неровностями), но с плотной сеткой — чтобы примять ткань под стропой
    body = D.objects['GEO-jacket-body']
    for m in body.modifiers:
        if m.type == 'SUBSURF': m.levels = 3
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    baked = D.meshes.new_from_object(body.evaluated_get(dg))
    body.modifiers.clear(); body.data = baked
    for p in baked.polygons: p.use_smooth = True
    V = coords(baked)
    tree = BVHTree.FromPolygons(V.tolist(), [tuple(p.vertices) for p in baked.polygons])
    C0 = Vector((0, 0, 1.30))                                              # из центра туловища наружу
    dirs = np.zeros((N, 3)); nrm = np.zeros((N, 3)); rs = np.zeros(N); ok = np.zeros(N, bool)
    for i, p in enumerate(path):
        d = (Vector(p) - C0).normalized()
        h, n, _, dist = tree.ray_cast(C0, d)
        if h is None: continue
        ok[i] = True; dirs[i] = d; nrm[i] = n if n.dot(d) > 0 else -n; rs[i] = dist
    idx = np.arange(N)
    rs = np.interp(idx, idx[ok], rs[ok])
    for k in range(3):
        dirs[:, k] = np.interp(idx, idx[ok], dirs[ok][:, k]); nrm[:, k] = np.interp(idx, idx[ok], nrm[ok][:, k])
    # натянутая стропа не повторяет каждый бугорок: уровень сглажен вдоль пути, стропа чуть вдавлена
    ker = np.exp(-0.5 * (np.arange(-36, 37) / 13.0) ** 2); ker /= ker.sum()
    rsm = np.convolve(np.pad(rs, 36, mode='edge'), ker, mode='valid')
    surf = np.array(C0)[None] + dirs * (rsm - STRAP_PRESS + STRAP_T / 2)[:, None]
    w = sneaker.sstep(0.0, 0.07, u) * sneaker.sstep(0.0, 0.07, 1 - u)      # у сумки концы стропы отходят от куртки
    cen = path + (surf - path) * w[:, None]
    for _ in range(8): cen[1:-1] = (cen[:-2] + 2 * cen[1:-1] + cen[2:]) / 4

    T = np.gradient(cen, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    for _ in range(40): nrm[1:-1] = (nrm[:-2] + 2 * nrm[1:-1] + nrm[2:]) / 4
    Nn = nrm - T * (nrm * T).sum(1)[:, None]; Nn /= np.linalg.norm(Nn, axis=1)[:, None]
    B = np.cross(Nn, T); B /= np.linalg.norm(B, axis=1)[:, None]

    # сетка стропы: плоская лента со скруглёнными кромками и окантовкой
    prof = [(-1, -0.55), (-0.90, -1), (0.90, -1), (1, -0.55), (1, 0.55), (0.90, 1), (0.80, 0.72), (-0.80, 0.72), (-0.90, 1), (-1, 0.55)]
    ms = sneaker.Mesh()
    ms.grid(np.array([[c + B[i] * a * STRAP_HW + Nn[i] * b * STRAP_T / 2 for a, b in prof] for i, c in enumerate(cen)]).transpose(1, 0, 2), 0, close_u=True)
    me = ms.build('GEO-bag-strap', [D.materials['MAT-webbing']])
    me.set_sharp_from_angle(angle=math.radians(40))
    old.data = me; old.modifiers.clear()

    kd = kdtree.KDTree(N)
    for i, c in enumerate(cen): kd.insert(c, i)
    kd.balance()
    # пряжка и свободный конец стропы — на новое место (вместе со стропой)
    i0 = int(np.argmin(np.linalg.norm(cen[:N // 3] - ctrl[1], axis=1)))
    shift = Vector(cen[i0] - ctrl[1])
    for n in ('GEO-bag-buckle', 'GEO-bag-strap-tail'):
        D.objects[n].location += shift

    # ткань под стропой примята: вершины куртки не могут быть выше её нижней стороны, рядом — плавный подъём
    FALL, RISE = 0.024, 0.016
    moved = 0
    for vi, p in enumerate(V):
        _, i, dist = kd.find(p)
        if dist > STRAP_HW + FALL + 0.03 or w[i] < 0.5: continue
        dv = p - cen[i]; bq = abs(dv @ B[i]); nq = dv @ Nn[i]
        if bq > STRAP_HW + FALL or nq < -0.05: continue
        lim = -STRAP_T / 2 - 0.0006 + (0 if bq <= STRAP_HW else ((bq - STRAP_HW) / FALL) ** 2 * RISE)
        if nq > lim: V[vi] = p - Nn[i] * (nq - lim); moved += 1
    baked.vertices.foreach_set('co', V.astype(np.float32).ravel()); baked.update()

    # капюшон лежит поверх стропы: там, где он её задевает, приподнимаем его над ней
    hood = D.objects['GEO-jacket-hood']
    for m in hood.modifiers:
        if m.type == 'SUBSURF': m.levels = max(m.levels, 2)
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    hb = D.meshes.new_from_object(hood.evaluated_get(dg))
    hood.modifiers.clear(); hood.data = hb
    for p in hb.polygons: p.use_smooth = True
    H = coords(hb); lifted = 0
    for vi, p in enumerate(H):
        _, i, dist = kd.find(p)
        if dist > STRAP_HW + 0.03: continue
        dv = p - cen[i]; bq = abs(dv @ B[i]); nq = dv @ Nn[i]
        if bq > STRAP_HW + 0.012 or abs(nq) > 0.02: continue
        need = STRAP_T / 2 + 0.0012 - max(0.0, (bq - STRAP_HW) / 0.012) * 0.004
        if nq < need: H[vi] = p + Nn[i] * (need - nq); lifted += 1
    hb.vertices.foreach_set('co', H.astype(np.float32).ravel()); hb.update()
    print(f'ремень: примято вершин куртки {moved}, приподнято вершин капюшона {lifted}', flush=True)


# ── 2. Кроссовки ───────────────────────────────────────────────────────────
def material(name, color, rough, bump=None):
    m = D.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if bump:                                    # мелкая фактура: (тип, масштаб, сила)
        kind, scale, strength = bump
        tc = nt.nodes.new('ShaderNodeTexCoord')
        tex = nt.nodes.new('ShaderNodeTexVoronoi' if kind == 'pebble' else 'ShaderNodeTexNoise')
        tex.inputs['Scale'].default_value = scale
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength; bp.inputs['Distance'].default_value = 0.0006
        nt.links.new(tc.outputs['Object'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Distance' if kind == 'pebble' else 'Fac'], bp.inputs['Height'])
        nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def shoes():
    place = {o.name[-1]: o.matrix_world.copy() for o in D.objects if o.name.startswith('GEO-shoe-upper.')}
    for o in [o for o in D.objects if o.name.startswith(('GEO-shoe-', 'CUT-shoe-'))]: D.objects.remove(o, do_unlink=True)
    M = D.materials
    mats = {'white': M['MAT-leather-white'], 'black': M['MAT-leather-black'], 'sole': M['MAT-sole'], 'groove': M['MAT-sole-groove'],
            'lace': M['MAT-lace'], 'metal': M['MAT-metal-dark'], 'hole': M['MAT-perforation'],
            'rubber': material('MAT-rubber-dark', (0.018, 0.018, 0.018), 0.7),
            'pebble': material('MAT-sole-pebble', (0.8, 0.78, 0.74), 0.65, ('pebble', 900, 0.6)),
            'thread': material('MAT-thread', (0.06, 0.06, 0.06), 0.55),
            'tongue': material('MAT-shoe-tongue', (0.72, 0.71, 0.69), 0.85, ('weave', 1400, 0.4))}
    for s in 'LR': sneaker.build(RH, s, place[s], mats)


steps = os.environ.get('STEPS', 'strap,shoes').split(',')
if 'strap' in steps: strap()
if 'shoes' in steps: shoes()
for blk in (D.meshes, D.materials, D.textures, D.images):       # убираем осиротевшие данные
    for x in [x for x in blk if x.users == 0]: blk.remove(x)
bpy.ops.wm.save_as_mainfile(filepath=DST, compress=True)
print('сохранено', DST, f'{os.path.getsize(DST) / 1e6:.1f} МБ', flush=True)
