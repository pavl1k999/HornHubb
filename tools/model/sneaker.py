"""Кроссовки носорога: массивные кожаные кеды на толстой подошве, белая кожа с чёрными накладками.

Форма задаётся формулами (контур подошвы, высота верха, профиль стенки), поэтому всё остальное —
накладки с прострочкой, перфорация, шнурки — ложится точно по поверхности.
Вызывается из upgrade.py: build(collection, side, matrix, materials).

Оси при построении: X — наружу стопы, Y — от пятки (0) к носку (L), Z — вверх.
"""
import math
import numpy as np
import bpy, bmesh

L = 0.355            # длина
Y_HEEL = 0.100       # где пятка в координатах старой модели (носок смотрит в −Y)
YC = 0.41 * L        # до этой точки сверху вырез для ноги, дальше — закрытый подъём
TIP = 0.040          # насколько верх носка отступает от края подошвы
INSET = 0.011        # наклон стенки внутрь у ворота


def cr(xk, yk):
    """Гладкая кривая через точки (кубический сплайн Эрмита)."""
    xk = np.array(xk, float); yk = np.array(yk, float)
    m = np.empty_like(yk)
    m[1:-1] = (yk[2:] - yk[:-2]) / (xk[2:] - xk[:-2])
    m[0] = (yk[1] - yk[0]) / (xk[1] - xk[0]); m[-1] = (yk[-1] - yk[-2]) / (xk[-1] - xk[-2])

    def f(x):
        x = np.clip(np.asarray(x, float), xk[0], xk[-1])
        i = np.clip(np.searchsorted(xk, x, side='right') - 1, 0, len(xk) - 2)
        h = xk[i + 1] - xk[i]; t = (x - xk[i]) / h
        return ((2 * t**3 - 3 * t**2 + 1) * yk[i] + (t**3 - 2 * t**2 + t) * h * m[i]
                + (-2 * t**3 + 3 * t**2) * yk[i + 1] + (t**3 - t**2) * h * m[i + 1])
    return f


def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ── контур подошвы (вид сверху) ──
WL = cr(np.array([0, .12, .30, .50, .68, .82, 1.0]) * L, [.047, .049, .052, .060, .066, .066, .060])   # наружная сторона
WM = cr(np.array([0, .12, .30, .45, .68, .82, 1.0]) * L, [.047, .048, .043, .045, .061, .062, .057])   # внутренняя (с выемкой свода)
RH, RT = 0.052, 0.070                                                                                  # скругление пятки и носка


def cap(Y):
    Y = np.asarray(Y, float); c = np.ones_like(Y)
    h = Y < RH; c[h] = np.sqrt(np.clip(1 - ((RH - Y[h]) / RH) ** 2, 0, 1))
    t = Y > L - RT; c[t] = np.clip(1 - ((Y[t] - (L - RT)) / RT) ** 2.3, 0, 1) ** (1 / 2.3)
    return c


def xc(Y):                       # ось стопы слегка изогнута внутрь к носку
    return -0.007 * (np.asarray(Y, float) / L) ** 2


def edge_x(side, Y):
    return xc(Y) + side * (WL(Y) if side > 0 else WM(Y)) * cap(Y)


def nout(side, Y):
    """Нормаль контура наружу (в плоскости пола)."""
    Y = np.asarray(Y, float); e = 1e-4
    a = np.clip(Y - e, 0, L); b = np.clip(Y + e, 0, L)
    d = (edge_x(side, b) - edge_x(side, a)) / (b - a)
    n = np.stack([np.ones_like(Y), -d], 1) * side
    return n / np.linalg.norm(n, axis=1)[:, None]


# ── высоты ──
def spring(Y):                   # носок приподнят
    return 0.014 * np.clip((np.asarray(Y, float) - 0.66 * L) / (0.34 * L), 0, 1) ** 2


def zbot(Y):                     # низ подошвы: носок приподнят, пятка чуть скруглена
    Y = np.asarray(Y, float)
    return spring(Y) + 0.005 * np.clip((0.08 * L - Y) / (0.08 * L), 0, 1) ** 2


def zb(Y):                       # верх подошвы = низ кожаного верха
    return 0.033 + 0.013 * (1 - sstep(0.12 * L, 0.62 * L, Y)) + spring(Y)


# гребень подъёма: низкий носок, от первых люверсов (0.70 L) шнуровка круто поднимается к вороту — как у высоких кед
ZR = cr(np.array([.41, .44, .52, .62, .72, .80, (L - TIP) / L]) * L, [.167, .160, .140, .112, .088, .078, .071])
ZC = cr(np.array([0, .05, .17, .30, .41]) * L, [.170, .168, .158, .160, .167])                                     # край ворота
YR0 = 0.72 * L


def ridge_y(Y):                  # точка гребня для сечения Y (у носка сечения сжимаются назад)
    Y = np.asarray(Y, float)
    return Y - TIP * np.clip((Y - YR0) / (L - YR0), 0, 1) ** 1.5


CREASES = ((0.712, 1.0), (0.735, 0.8), (0.757, 0.55))   # заломы кожи на сгибе носка: где и насколько глубокие


def upper(side, Y, v):
    """Точка кожаного верха: Y — вдоль стопы, v — от подошвы (0) до гребня/края ворота (1)."""
    Y = np.asarray(Y, float); v = np.asarray(v, float)
    bx = edge_x(side, Y); n = nout(side, Y); bz = zb(Y)
    c = 1 - sstep(0.26 * L, YC, Y)                        # вырез для ноги сужается к подъёму
    tx = xc(Y) + (bx - n[:, 0] * INSET - xc(Y)) * c
    ty = Y - n[:, 1] * INSET
    Yr = ridge_y(np.clip(Y, YC, L))
    front = Y >= YC
    Tx = np.where(front, xc(Yr), tx); Ty = np.where(front, Yr, ty); Tz = np.where(front, ZR(Yr), ZC(np.clip(Y, 0, YC)))
    w = sstep(0.33 * L, 0.47 * L, Y)                      # сзади стенка почти прямая, спереди — скруглённый свод
    phi = v * np.pi / 2
    k = 2 / (2.5 + 0.7 * sstep(0.80 * L, L, Y))           # у мыска свод «квадратнее»: стенка выше и круче
    sx = (1 - w) * v ** 1.8 + w * (1 - np.cos(phi) ** k)
    sz = (1 - w) * v + w * np.sin(phi) ** k
    bulge = 0.0035 * (1 - w) * np.sin(np.pi * v)          # выпуклый задник
    P = np.empty((len(Y), 3))
    P[:, 0] = bx + (Tx - bx) * sx + n[:, 0] * bulge
    P[:, 1] = Y + (Ty - Y) * sx + n[:, 1] * bulge
    P[:, 2] = bz + (Tz - bz) * sz
    cz = np.zeros(len(Y))
    for yc, a in CREASES:                                 # заломы чуть выгнуты: к подошве уходят вперёд
        cz += a * np.exp(-((Y - yc * L - 0.012 * (1 - v)) / 0.0032) ** 2)
    P[:, 2] -= 0.0014 * cz * sstep(0.40, 0.72, v)
    return P


def upper_n(side, Y, v):
    """Нормаль верха наружу."""
    Y = np.clip(np.asarray(Y, float), 2e-3, L - 2e-3); v = np.clip(np.asarray(v, float), 1e-3, 1 - 1e-3)
    e = 5e-4
    dY = upper(side, Y + e, v) - upper(side, Y - e, v)
    dv = upper(side, Y, v + e) - upper(side, Y, v - e)
    N = np.cross(dY, dv) * side
    return N / np.maximum(np.linalg.norm(N, axis=1), 1e-12)[:, None]


def ylevels(n, a=0.0, b=L):
    """Сечения вдоль стопы, гуще к концам (там контур круто заворачивает)."""
    t = (1 - np.cos(np.linspace(0, np.pi, n))) / 2
    return a + (b - a) * t


def outline(n):
    """Контур подошвы: n точек с равным шагом по длине (от пятки по наружной стороне к носку и обратно)."""
    Yd = ylevels(900)
    loop = np.concatenate([np.stack([edge_x(1, Yd), Yd], 1), np.stack([edge_x(-1, Yd), Yd], 1)[::-1][1:-1]])
    seg = np.linalg.norm(np.diff(np.concatenate([loop, loop[:1]]), axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(n) * s[-1] / n
    x = np.interp(t, s, np.append(loop[:, 0], loop[0, 0])); y = np.interp(t, s, np.append(loop[:, 1], loop[0, 1]))
    tx = np.roll(x, -1) - np.roll(x, 1); ty = np.roll(y, -1) - np.roll(y, 1)
    nn = np.stack([ty, -tx], 1); nn /= np.linalg.norm(nn, axis=1)[:, None]
    return x, y, nn, t


class Mesh:
    """Накопитель сетки: вершины, грани, материал каждой грани."""
    def __init__(self):
        self.v = []; self.f = []; self.m = []; self.n = 0

    def grid(self, P, mat=0, close_u=False):
        """P[nu][nv][3] → сетка из четырёхугольников."""
        P = np.asarray(P, float); nu, nv = P.shape[:2]; base = self.n
        self.v.append(P.reshape(-1, 3)); self.n += nu * nv
        for i in range(nu if close_u else nu - 1):
            i2 = (i + 1) % nu
            for j in range(nv - 1):
                self.f.append((base + i * nv + j, base + i2 * nv + j, base + i2 * nv + j + 1, base + i * nv + j + 1))
                self.m.append(mat(i, j) if callable(mat) else mat)
        return base

    def patch(self, P, N, off, mat, bevel=0.0010):
        """Накладка из кожи: поверхность, приподнятая на off, край скруглён и опущен до основы.
        Возвращает точки и нормали накладки — по ним кладётся прострочка."""
        P = np.asarray(P, float); N = np.asarray(N, float); nu, nv = P.shape[:2]
        N = N / np.maximum(np.linalg.norm(N, axis=2), 1e-9)[..., None]
        Q = P + N * off
        edge = np.zeros((nu, nv), bool); edge[0] = edge[-1] = True; edge[:, 0] = edge[:, -1] = True
        Q[edge] -= N[edge] * bevel
        self.grid(Q, mat)
        idx = [(i, 0) for i in range(nu)] + [(nu - 1, j) for j in range(1, nv)] + \
              [(i, nv - 1) for i in range(nu - 2, -1, -1)] + [(0, j) for j in range(nv - 2, 0, -1)]
        self.grid(np.array([[Q[i, j], P[i, j] - N[i, j] * 0.0004] for i, j in idx]), mat, close_u=True)
        return Q, N

    def stitches(self, P, N, dash=0.0028, gap=0.0016, hw=0.00045, lift=0.0005, mat=0):
        """Строчка вдоль линии P (с нормалями N): ряд коротких стежков."""
        P = np.asarray(P, float); N = np.asarray(N, float)
        s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        at = lambda A, t: np.stack([np.interp(t, s, A[:, k]) for k in range(3)], -1)
        starts = np.arange(gap, s[-1] - dash, dash + gap)
        if not len(starts): return
        a, b = at(P, starts), at(P, starts + dash); n = at(N, starts + dash / 2)
        n /= np.linalg.norm(n, axis=1)[:, None]
        t = b - a; t /= np.maximum(np.linalg.norm(t, axis=1), 1e-9)[:, None]
        w = np.cross(n, t) * hw
        prof = [(-1, 0.1), (-0.6, 1), (0.6, 1), (1, 0.1)]          # стежок чуть выпуклый
        for i in range(len(starts)):
            self.grid(np.array([[e + w[i] * p + n[i] * lift * q for e in (a[i], b[i])] for p, q in prof]), mat)

    def build(self, name, mats, weld=2e-5, outward_from=None, fill=False):
        me = bpy.data.meshes.new(name)
        V = np.concatenate(self.v) if self.v else np.zeros((0, 3))
        me.from_pydata(V.tolist(), [], self.f)
        for m in mats: me.materials.append(m)
        me.polygons.foreach_set('material_index', self.m)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
        bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges)
        if fill: bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if outward_from is not None:      # сетка открытая — проверяем, что грани смотрят наружу
            s = sum(f.normal.dot(f.calc_center_median() - outward_from(f.calc_center_median())) * f.calc_area() for f in bm.faces)
            if s < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        return me


def build(collection, side_name, matrix, mats):
    """Собирает один кроссовок. side_name: 'L' или 'R' (правый — зеркально), matrix — место старого."""
    sx = 1.0 if side_name == 'L' else -1.0
    core = lambda c: type(c)((0.0, c.y, 0.065))           # ось башмака в координатах модели (для проверки нормалей)

    def to_local(P):
        P = np.asarray(P, float); Q = np.empty_like(P)
        Q[..., 0] = sx * P[..., 0]; Q[..., 1] = Y_HEEL - P[..., 1]; Q[..., 2] = P[..., 2]
        return Q

    def add(name, mesh, materials, outward=True, sharp=38, fill=False):
        for i, blk in enumerate(mesh.v): mesh.v[i] = to_local(blk)
        me = mesh.build(f'{name}.{side_name}', materials, outward_from=core if outward else None, fill=fill)
        me.set_sharp_from_angle(angle=math.radians(sharp))
        ob = bpy.data.objects.new(f'{name}.{side_name}', me)
        ob.matrix_world = matrix
        collection.objects.link(ob)
        return ob

    NY, NV = 140, 34
    Ys = ylevels(NY); vs = np.linspace(0, 1, NV)
    sides = (1, -1)

    # ── кожаный верх ──
    up = Mesh()
    for s in sides:
        up.grid(np.array([upper(s, np.full(NV, y), vs) for y in Ys]), 0)
    add('GEO-shoe-upper', up, [mats['white']])

    # ── мягкий ворот и подкладка (внутрь выреза) ──
    col = Mesh()
    Yk = ylevels(70, 0.0, YC)
    for s in sides:
        T = upper(s, Yk, np.ones_like(Yk)); n = nout(s, Yk)
        ce = np.clip((1 - sstep(0.26 * L, YC, Yk)) * 1.5, 0, 1)[:, None]
        inw = np.concatenate([-n, np.zeros((len(Yk), 1))], 1); up_ = np.array([0, 0, 1.0])
        rows = [T]
        for a in np.radians([35, 70, 105, 140, 180]):
            rows.append(T + inw * 0.011 * ce * (1 - math.cos(a)) + up_ * 0.010 * ce * math.sin(a))
        for d in (0.02, 0.05):
            rows.append(T + inw * 0.022 * ce - up_ * d * ce)
        col.grid(np.stack(rows, 1), 0)
    add('GEO-shoe-collar', col, [mats['black']], outward=False)

    # ── подошва: чёрная резина с протектором по краю, белая промежуточная часть с канавкой-строчкой,
    #    на носке и пятке — зернистые вставки ──
    so = Mesh()
    ox, oy, nn, arc = outline(600)
    zlo = zbot(oy); Hs = zb(oy) - zlo; M = Hs - 0.0104 - 0.0105
    lug = np.where(np.mod(arc, 0.0135) < 0.0038, 0.0022, 0.0)          # вырезы протектора
    z0 = 0 * Hs
    rows_def = [(-0.0100, z0), (-0.0005 - lug, z0), (0.0018 - lug, z0 + 0.0022), (0.0026 - lug, z0 + 0.0068),
                (0.0008, z0 + 0.0076), (0.0008, z0 + 0.0092), (0.0048, z0 + 0.0104),
                (0.0054, 0.0104 + 0.20 * M), (0.0040, 0.0104 + 0.55 * M), (0.0040, Hs - 0.0105),
                (0.0052, Hs - 0.0092), (0.0054, Hs - 0.0062), (0.0042, Hs - 0.0056), (0.0042, Hs - 0.0044),
                (0.0054, Hs - 0.0038), (0.0050, Hs - 0.0010), (0.0030, Hs), (-0.0050, Hs + 0.0004)]
    rows = [np.stack([ox + nn[:, 0] * off, oy + nn[:, 1] * off, zlo + h], 1) for off, h in rows_def]
    pebble = (oy > 0.74 * L) | (oy < 0.16 * L)

    def band(i, j):
        if j < 6: return 0                                   # резина
        if j == 12: return 2                                 # канавка
        return 3 if (7 <= j <= 8 and pebble[i]) else 1       # зернистая вставка / белая
    so.grid(np.stack(rows, 1), band, close_u=True)
    add('GEO-shoe-sole', so, [mats['rubber'], mats['sole'], mats['groove'], mats['pebble']], sharp=30, fill=True)

    # ── накладки из чёрной кожи, по краям — прострочка ──
    ov = Mesh(); st = Mesh()

    def patch(fn, nu, nv, off, join=None):
        """fn(a, b) → (Y, v) для a, b ∈ [0, 1]; строит накладку на обеих сторонах.
        join='end' / 'start' — стороны сшиваются в одну деталь по краю a=1 (мысок) / a=0 (пятка)."""
        a = np.linspace(0, 1, nu); b = np.linspace(0, 1, nv)
        A, B = np.meshgrid(a, b, indexing='ij')
        Yp, vp = fn(A.ravel(), B.ravel())
        PN = [(upper(s, Yp, vp).reshape(nu, nv, 3), upper_n(s, Yp, vp).reshape(nu, nv, 3)) for s in sides]
        if join == 'end':
            return [ov.patch(np.concatenate([PN[0][0], PN[1][0][-2::-1]]), np.concatenate([PN[0][1], PN[1][1][-2::-1]]), off, 0)]
        if join == 'start':
            return [ov.patch(np.concatenate([PN[0][0][::-1], PN[1][0][1:]]), np.concatenate([PN[0][1][::-1], PN[1][1][1:]]), off, 0)]
        return [ov.patch(P, N, off, 0) for P, N in PN]

    def sew(QN, lines):
        """Прострочка по линиям сетки накладки: ('i', k) — k-й столбец, ('j', k) — k-я строка."""
        Q, N = QN
        for axis, k in lines:
            if axis == 'i': st.stitches(Q[k, 1:-1], N[k, 1:-1])
            else: st.stitches(Q[1:-1, k], N[1:-1, k])

    # мысок: полоса вокруг носка; сзади её край поднимается к шнуровке и по диагонали спускается к подошве
    vm = cr(np.array([.675, .715, .775, .86, .93, 1.0]) * L, [.80, .52, .40, .40, .50, .62])
    def toe(a, b):
        e = 1 - (1 - a) ** 1.6                                   # сетка гуще к мыску
        Yb = 0.60 * L + e * (L - 0.60 * L)                       # нижний край — вдоль подошвы
        Yt = 0.675 * L + e * (L - 0.675 * L)                     # верхний край
        return Yb + (Yt - Yb) * b, b * vm(Yt)
    for qn in patch(toe, 64, 15, 0.0016, join='end'): sew(qn, [('j', -2), ('j', -3), ('i', 1), ('i', -2)])

    # задник: огибает пятку до середины высоты, передний край — вогнутая дуга к подошве
    VH = 0.70
    yh = cr([0, .3, .62, .85, 1.0], np.array([.31, .21, .15, .125, .115]) * L)
    def heel(a, b):
        return a * yh(b), b * VH
    for qn in patch(heel, 38, 22, 0.0019, join='start'): sew(qn, [('j', -2), ('j', -3), ('i', 1), ('i', -2)])

    # ярлык на пятке
    def heel_tab(a, b):
        return a * 0.034 * L, 0.76 + b * 0.18
    for qn in patch(heel_tab, 12, 9, 0.0020, join='start'): sew(qn, [('j', 1), ('j', -2), ('i', 1), ('i', -2)])

    # верхняя полоса: вдоль ворота, дальше — планка шнуровки; спереди сходит на нет
    def vmax(Y): return 0.90 + 0.10 * (1 - sstep(YC - 0.03 * L, YC + 0.02 * L, Y))
    def top_band(a, b):
        Y = 0.07 * L + a * (0.705 * L - 0.07 * L)
        lo = 0.80 - 0.08 * sstep(0.27 * L, 0.40 * L, Y)
        lo = lo + (vmax(Y) - lo) * sstep(0.65 * L, 0.705 * L, Y) ** 2
        return Y, lo + b * (vmax(Y) - lo)
    for qn in patch(top_band, 100, 9, 0.0014): sew(qn, [('j', 1), ('i', 1)])

    # эмблема на боку — рог носорога: широкое основание над подошвой, остриё загнуто назад
    def bez(p0, p1, p2, t): return (1 - t) ** 2 * p0 + 2 * t * (1 - t) * p1 + t ** 2 * p2
    def horn(a, b):
        fy, fv = bez(0.520, 0.512, 0.418, a), bez(0.10, 0.52, 0.74, a)      # передний край: выпуклый
        by, bv = bez(0.438, 0.462, 0.418, a), bez(0.10, 0.40, 0.74, a)      # задний край: вогнутый
        return (by + (fy - by) * b) * L, bv + (fv - bv) * b
    for qn in patch(horn, 30, 8, 0.0017): sew(qn, [('j', 1), ('j', -2)])
    add('GEO-shoe-overlays', ov, [mats['black']])
    add('GEO-shoe-stitch', st, [mats['thread']], outward=False, sharp=60)

    # ── язык: толстый, мягкий, выходит из выреза и поднимается над воротом; на нём ярлык ──
    tg = Mesh()
    NS, NR = 30, 22
    s_ = np.linspace(0, 1, NS)
    cy = 0.44 * L + (0.375 * L - 0.44 * L) * s_
    z0 = float(ZR(np.array([0.44 * L]))[0]) - 0.010
    C = np.stack([xc(cy), cy, z0 + (0.196 - z0) * s_ ** 0.9], 1)
    T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    Nt = np.stack([np.zeros(NS), T[:, 2], -T[:, 1]], 1)                 # лицевая сторона языка смотрит вперёд-вверх
    tip = np.sqrt(np.clip(1 - np.clip((s_ - 0.86) / 0.14, 0, 1) ** 2, 0.02, 1))
    hw = (0.022 + 0.010 * sstep(0, 0.4, s_)) * (0.55 + 0.45 * tip)      # полуширина: к верху шире, край скруглён
    th = 0.0065 * (0.35 + 0.65 * tip)                                   # полутолщина
    ang = np.linspace(0, 2 * np.pi, NR, endpoint=False)
    X = np.array([1.0, 0, 0])
    box = lambda a: (np.sign(math.cos(a)) * abs(math.cos(a)) ** 0.45, np.sign(math.sin(a)) * abs(math.sin(a)) ** 0.6)   # сечение — подушка
    tg.grid(np.array([[C[i] + X * hw[i] * box(a)[0] + Nt[i] * th[i] * box(a)[1] for i in range(NS)] for a in ang]), 0, close_u=True)
    lab = [[C[i] + X * t * 0.016 + Nt[i] * (th[i] + 0.0008) for t in np.linspace(-1, 1, 7)] for i in range(int(NS * 0.50), int(NS * 0.80))]
    tg.grid(np.array(lab), 1)
    add('GEO-shoe-tongue', tg, [mats['tongue'], mats['black']], outward=False, sharp=50)

    # ── люверсы и шнурки ──
    EY = np.linspace(0.668, 0.405, 8) * L
    VEY = 0.82
    ey = Mesh()
    for s in sides:
        Cc = upper(s, EY, np.full(len(EY), VEY)); N = upper_n(s, EY, np.full(len(EY), VEY))
        for c, n in zip(Cc, N):
            t = np.cross(n, [0, 1.0, 0]); t /= np.linalg.norm(t); b = np.cross(n, t)
            ring = []
            for a in np.linspace(0, 2 * np.pi, 14, endpoint=False):
                d = math.cos(a) * t + math.sin(a) * b
                ring.append([c + n * (0.0018 + 0.0008 * math.sin(p)) + d * (0.0036 + 0.0009 * math.cos(p)) for p in np.linspace(0, 2 * np.pi, 7)])
            ey.grid(np.array(ring), 0, close_u=True)
    add('GEO-shoe-eyelets', ey, [mats['metal']], outward=False)

    la = Mesh()
    def lace(s0, y0, s1, y1, lift):
        """Плоский шнурок от люверса (сторона s0, сечение y0) к люверсу (s1, y1) через язык."""
        n = 15; t = np.linspace(0, 1, n)
        P = []; N = []
        for u in t:
            y = y0 + (y1 - y0) * u
            wq = abs(u - 0.5) * 2; s = s0 if u < 0.5 else s1; v = 1 - (1 - VEY) * wq
            P.append(upper(s, [y], [v])[0]); N.append(upper_n(s, [y], [v])[0])
        P = np.array(P); N = np.array(N)
        N[:] = (N + np.roll(N, 1, 0) + np.roll(N, -1, 0)) / 3; N[0] = N[1]; N[-1] = N[-2]
        N /= np.linalg.norm(N, axis=1)[:, None]
        P = P + N * (0.0030 + lift + 0.0026 * np.sin(np.pi * t))[:, None]
        Tl = np.gradient(P, axis=0); Tl /= np.linalg.norm(Tl, axis=1)[:, None]
        Bn = np.cross(N, Tl); Bn /= np.linalg.norm(Bn, axis=1)[:, None]
        hw_, ht = 0.0042, 0.0010
        prof = [(-hw_, -ht), (-hw_ * 0.7, -ht * 1.4), (hw_ * 0.7, -ht * 1.4), (hw_, -ht), (hw_, ht), (hw_ * 0.7, ht * 1.4), (-hw_ * 0.7, ht * 1.4), (-hw_, ht)]
        la.grid(np.array([[p + Bn[i] * a + N[i] * b for a, b in prof] for i, p in enumerate(P)]).transpose(1, 0, 2), 0, close_u=True)
    lace(1, EY[0], -1, EY[0], 0.0)                                   # прямая перемычка спереди
    for k in range(len(EY) - 1):                                     # крест-накрест, через раз сверху то левый, то правый
        lace(1, EY[k], -1, EY[k + 1], 0.0012 if k % 2 else 0.0)
        lace(-1, EY[k], 1, EY[k + 1], 0.0 if k % 2 else 0.0012)
    add('GEO-shoe-laces', la, [mats['lace']], outward=False)

    # ── вентиляционные отверстия на носке ──
    pf = Mesh()
    for s in sides:
        for iy, y in enumerate(np.array([0.785, 0.813, 0.841, 0.869]) * L):
            for v in np.linspace(0.66, 0.96, 4) + (0.04 if iy % 2 else 0):
                if v > 0.985 or v < vm(ridge_y(np.array([y]))[0]) + 0.13: continue
                c = upper(s, [y], [v])[0]; n = upper_n(s, [y], [v])[0]
                t = np.cross(n, [0, 1.0, 0]); t /= np.linalg.norm(t); b = np.cross(n, t)
                ring = [c + n * 0.0004 + (math.cos(a) * t + math.sin(a) * b) * 0.0017 for a in np.linspace(0, 2 * np.pi, 8, endpoint=False)]
                pf.grid(np.array([[c + n * 0.0004] * 8, ring]).transpose(1, 0, 2), 0, close_u=True)
    add('GEO-shoe-perforations', pf, [mats['hole']], outward=False)
