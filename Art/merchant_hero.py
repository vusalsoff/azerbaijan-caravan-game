"""
Art/merchant_hero.py
"İRS — Tacirin Yolu" əsas qəhrəmanı: Azərbaycan Taciri
- Anatomik bədən və vahid heykəltəraşlıq başlı (göz çuxurları, burun körpüsü/qanadları, dodaq, çənə)
- 1024x1024 prosedur üz, saqqal/bığ və saç teksturası + yun çuxa, xalça-naxışlı qurşaq, qıvrım qoyun dərisi papaq
- Arxa görünüş (3-cü şəxs kamera) üçün qırçınlı bel tikişləri, çiyin qayışı və kisə
- Tam Blender Armature skeleti + yumşaq vertex çəkiləri + "Idle" və "Walk" glTF animasiyaları

İşə salmaq:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" --background --python Art/merchant_hero.py -- render
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "render" in ARGV

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
OUT_FILES = [
    os.path.join(ROOT, "public", "models", "merchant_hero.glb"),
    os.path.join(SCRIPT_DIR, "merchant_hero.glb"),
]
PREVIEW_DIR = os.path.join(SCRIPT_DIR, "previews")

bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene
COL = SCENE.collection


# ---------------------------------------------------------------------------
# Rəng / Material Köməkçiləri
# ---------------------------------------------------------------------------
def to_linear(c):
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def _bsdf(mat):
    mat.use_nodes = True
    return mat.node_tree.nodes.get("Principled BSDF")


def _try_set(bsdf, key, value):
    try:
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value
    except Exception:
        pass


def mat_basic(name, srgb, rough=0.7, metal=0.0, sheen=0.0):
    m = bpy.data.materials.new(name)
    b = _bsdf(m)
    b.inputs["Base Color"].default_value = (*to_linear(srgb), 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sheen > 0:
        _try_set(b, "Sheen Weight", sheen)
    return m


def mat_tex(name, img, rough=0.8, metal=0.0, nimg=None, nstrength=0.75, rimg=None, sheen=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    b = _bsdf(m)
    nt = m.node_tree
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    _try_set(b, "Specular IOR Level", spec)
    if sheen > 0:
        _try_set(b, "Sheen Weight", sheen)
    if rimg is not None:
        tr = nt.nodes.new("ShaderNodeTexImage")
        tr.image = rimg
        nt.links.new(tr.outputs["Color"], b.inputs["Roughness"])
    if nimg is not None:
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = nimg
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = nstrength
        nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


# ---------------------------------------------------------------------------
# Prosedural Teksturalar (numpy)
# ---------------------------------------------------------------------------
def grid(w, h):
    u = (np.arange(w) + 0.5) / w
    v = (np.arange(h) + 0.5) / h
    return np.meshgrid(u, v)


def smooth_noise(w, h, cells, seed):
    rng = np.random.default_rng(seed)
    g = rng.random((cells + 1, cells + 1))
    U, V = grid(w, h)
    x = U * cells
    y = V * cells
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    x1 = np.minimum(x0 + 1, cells)
    y1 = np.minimum(y0 + 1, cells)
    a = g[y0, x0]
    b = g[y0, x1]
    c = g[y1, x0]
    d = g[y1, x1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def np_image(name, rgb, non_color=False):
    h, w, _ = rgb.shape
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1))], axis=2).astype(np.float32)
    img = bpy.data.images.new(name, width=w, height=h, alpha=False)
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(rgba.ravel())
    img.update()
    try:
        img.pack()
    except Exception as exc:  # noqa: BLE001
        print("pack warning:", name, exc)
    return img


GOLD_C = np.array([0.86, 0.65, 0.28])
RED_C = np.array([0.52, 0.11, 0.09])
DARK_BRONZE = np.array([0.19, 0.11, 0.065])
COAT_GAP = 0.44
WEAVE_PERIOD = 4.5


def coat_texture(size=512, band=True, trims=False, back_yoke=False, gap=COAT_GAP):
    U, V = grid(size, size)
    base = np.array([0.33, 0.195, 0.115])
    weave = 0.5 + 0.5 * np.sin(2 * np.pi * (U * size * 1.15 + V * size * 0.85) / WEAVE_PERIOD)
    n = smooth_noise(size, size, 22, 7)
    n2 = smooth_noise(size, size, 88, 11)
    shade = 0.89 + 0.11 * weave + 0.16 * (n - 0.5) + 0.07 * (n2 - 0.5)
    rgb = base[None, None, :] * shade[..., None]

    # Zərif şaquli arxa qırçın tikiş kölgəsi (üçüncü şəxs kamera üçün canlı görünüş)
    if band and not trims:
        # Ətəkdə şaquli qırçın kölgələri (arxa mərkəz U=0/1 ətrafında)
        pleat = 0.5 + 0.5 * np.cos(2 * np.pi * U * 12.0)
        pleat_mask = np.clip(1.0 - V * 1.15, 0.0, 1.0)
        rgb *= (1.0 - 0.10 * pleat * pleat_mask)[..., None]

    if band:
        v0, v1 = 0.015, 0.095
        m = (V >= v0) & (V <= v1)
        bv = (V - v0) / (v1 - v0)
        bu = (U * 38.0) % 1.0
        d = np.abs(bu - 0.5) * 2 + np.abs(bv - 0.5) * 2
        rgb[m] = RED_C
        rgb[m & (d < 0.78)] = GOLD_C
        rgb[m & (d < 0.36)] = RED_C * 1.25
        rgb[m & ((bv < 0.11) | (bv > 0.89))] = GOLD_C
        rgb[m & (bv > 0.90) & (bv < 0.95)] = DARK_BRONZE

    if back_yoke:
        # Arxa çiyin/bel tikiş xətləri (incə zərif tikiş — sarı lent yox!)
        back_dist = np.minimum(U, 1.0 - U)
        yoke_v = 0.72 - 0.06 * np.cos((back_dist / 0.25) * math.pi * 0.5)
        yoke_line = (np.abs(V - yoke_v) < 0.0045) & (back_dist < 0.23)
        rgb[yoke_line] = rgb[yoke_line] * 0.52 + GOLD_C * 0.48
        seam1 = (np.abs(back_dist - 0.085) < 0.0038) & (V < 0.72)
        rgb[seam1] = rgb[seam1] * 0.68 + DARK_BRONZE * 0.32
        center_seam = (back_dist < 0.0035) & (V < 0.70)
        rgb[center_seam] = rgb[center_seam] * 0.65 + DARK_BRONZE * 0.35

    if trims:
        g = gap / (2 * np.pi)
        w = 0.025
        for lo, hi in ((0.5 + g, 0.5 + g + w), (0.5 - g - w, 0.5 - g)):
            m = (U >= lo) & (U <= hi)
            rgb[m] = GOLD_C * 0.94
            mid = (lo + hi) / 2
            zig = (np.abs(((V * 68) % 1.0) - 0.5) - 0.25) * w * 0.7
            rgb[m & (np.abs(U - mid - zig) < w * 0.17)] = RED_C
    return rgb


def coat_normal(size=512, strength=0.6):
    U, V = grid(size, size)
    h = 0.5 + 0.5 * np.sin(2 * np.pi * (U * size * 1.15 + V * size * 0.85) / WEAVE_PERIOD)
    h += 0.38 * smooth_noise(size, size, 128, 3)
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(h)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], axis=2)


def papaq_textures(size=512):
    """Qıvrım qoyun dərisi (Qaragül/astraxan papaq) teksturası + mat yun normal map."""
    n1 = smooth_noise(size, size, 48, 21)
    n2 = smooth_noise(size, size, 96, 29)
    n3 = smooth_noise(size, size, 176, 37)
    # İzotrop xırda qıvrımlar (taxta damar kimi yox, yun topaları)
    curl = n1 * 0.42 + n2 * 0.38 + n3 * 0.20

    dark_fur = np.array([0.070, 0.050, 0.038])
    mid_fur = np.array([0.145, 0.108, 0.080])
    tip_fur = np.array([0.215, 0.165, 0.122])

    t = np.clip((curl - 0.25) / 0.55, 0, 1)[..., None]
    rgb = dark_fur * (1 - t) + mid_fur * t
    tip_m = np.clip((curl - 0.70) / 0.28, 0, 1)[..., None]
    rgb = rgb * (1 - tip_m * 0.5) + tip_fur * (tip_m * 0.5)

    dx = (np.roll(curl, -1, axis=1) - np.roll(curl, 1, axis=1)) * 0.65
    dy = (np.roll(curl, -1, axis=0) - np.roll(curl, 1, axis=0)) * 0.65
    nx, ny, nz = -dx, -dy, np.ones_like(curl)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], axis=2)
    return rgb, nrm


def face_textures(size=1024):
    """
    Head UV xəritəsi:
    U: θ/(2π) — U=0.5 düz ön (-Y), U=0 və U=1 arxa (+Y)
    V: 0 (boyun/çənə altı) .. 1 (başın təpəsi)
    """
    U, V = grid(size, size)

    # Əsas isti dəri rəngi + incə dəri məsaməsi
    skin_base = np.array([0.78, 0.57, 0.44])
    skin_warm = np.array([0.82, 0.50, 0.38])
    skin_shadow = np.array([0.56, 0.36, 0.27])
    hair_col = np.array([0.085, 0.058, 0.045])
    lip_col = np.array([0.62, 0.35, 0.30])

    n_fine = smooth_noise(size, size, 120, 41)
    n_med = smooth_noise(size, size, 28, 43)
    rgb = skin_base[None, None, :] * (0.94 + 0.08 * n_fine + 0.05 * (n_med - 0.5))[..., None]
    rough = np.full((size, size), 0.56)

    def gauss(x, y, cx, cy, sx, sy):
        return np.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))

    # Yanaq və burun istiliyi
    cheek_l = gauss(U, V, 0.575, 0.44, 0.042, 0.065)
    cheek_r = gauss(U, V, 0.425, 0.44, 0.042, 0.065)
    nose_w = gauss(U, V, 0.50, 0.45, 0.018, 0.06)
    warm_m = np.clip(cheek_l + cheek_r + nose_w * 0.6, 0, 1)[..., None]
    rgb = rgb * (1 - warm_m * 0.32) + skin_warm * (warm_m * 0.32)

    # Göz çuxuru kölgəsi & burun altı kölgəsi
    sock_l = gauss(U, V, 0.558, 0.565, 0.030, 0.036)
    sock_r = gauss(U, V, 0.442, 0.565, 0.030, 0.036)
    nose_under = gauss(U, V, 0.50, 0.39, 0.02, 0.018)
    sh_m = np.clip(sock_l * 0.55 + sock_r * 0.55 + nose_under * 0.45, 0, 1)[..., None]
    rgb = rgb * (1 - sh_m * 0.42) + skin_shadow * (sh_m * 0.42)

    # Qaşlar (papağın altında aydın görünən təbii tüklü qövs)
    strand = smooth_noise(size, size, 180, 51)
    for s in (1, -1):
        bx = 0.5 + s * 0.054
        arch_v = 0.580 - 0.011 * ((U - bx) / 0.032) ** 2
        brow = np.exp(-(((U - bx) / 0.028) ** 4 + ((V - arch_v) / 0.013) ** 2))
        brow *= (0.72 + 0.40 * strand)
        bm = np.clip(brow, 0, 1)[..., None]
        rgb = rgb * (1 - bm * 0.92) + hair_col * (bm * 0.92)

    # Dodaqlar (V ~ 0.30)
    lip_m = np.clip(gauss(U, V, 0.50, 0.295, 0.034, 0.014), 0, 1)[..., None]
    rgb = rgb * (1 - lip_m * 0.72) + lip_col * (lip_m * 0.72)
    lip_line = np.clip(gauss(U, V, 0.50, 0.295, 0.032, 0.004), 0, 1)[..., None]
    rgb = rgb * (1 - lip_line * 0.45) + skin_shadow * (lip_line * 0.45)

    # Bığ (V ~ 0.345, iki tərəfə zərif qövs)
    for s in (1, -1):
        mx = 0.5 + s * 0.028
        mv = 0.352 - 0.022 * np.abs(U - mx) / 0.035
        stache = np.exp(-(((U - mx) / 0.032) ** 2 + ((V - mv) / 0.014) ** 2))
        stache *= (0.72 + 0.38 * strand)
        sm = np.clip(stache, 0, 1)[..., None]
        rgb = rgb * (1 - sm * 0.95) + hair_col * (sm * 0.95)

    # Səliqəli kəsilmiş Azərbaycan saqqalı + bakenbard (üzə tam oturan, qopuq olmayan)
    # Çənə ətrafında saqqal profili (U=0.5 mərkəz, yanaqlardan aşağı)
    du = np.abs(U - 0.5)
    jaw_top = 0.23 + 0.27 * np.clip((du - 0.05) / 0.14, 0, 1) ** 1.6
    # Dodaq və yanaq arası təmiz qalır
    mouth_clear = gauss(U, V, 0.50, 0.31, 0.048, 0.048)
    beard_base = np.clip((jaw_top - V) / 0.035, 0, 1) * np.clip((0.23 - du) / 0.03, 0, 1)
    # Çənə qabağında saqqal azacıq yuxarı (dodaq altına) qalxır
    chin_soul = gauss(U, V, 0.50, 0.245, 0.022, 0.032)
    beard_mask = np.clip(np.maximum(beard_base * (1 - mouth_clear * 0.85), chin_soul), 0, 1)
    # Tüklənmə keçidi (stubble gradient)
    beard_soft = np.clip(beard_mask * (0.75 + 0.35 * strand), 0, 1)[..., None]
    rgb = rgb * (1 - beard_soft * 0.92) + hair_col * (beard_soft * 0.92)
    rough = rough * (1 - beard_soft[..., 0]) + 0.88 * beard_soft[..., 0]

    # Başın arxa və gicgah saçları (papağın altından boyuna qədər tam örtür — keçəl zolaq qalmır!)
    # Ön üzdə du < 0.19 təmiz, yanlarda və arxada (du > 0.19) saç xətti V=0.20-dən yuxarı
    side_hair_v = 0.42 - 0.28 * np.clip((du - 0.17) / 0.10, 0, 1)
    hair_back_mask = np.clip((du - 0.165) / 0.03, 0, 1) * np.clip((V - side_hair_v) / 0.045, 0, 1)
    # Təpə hissəsi də tünd saçdır
    crown_mask = np.clip((V - 0.72) / 0.05, 0, 1)
    head_hair = np.clip(np.maximum(hair_back_mask, crown_mask) * (0.78 + 0.30 * strand), 0, 1)[..., None]
    rgb = rgb * (1 - head_hair * 0.96) + hair_col * (head_hair * 0.96)
    rough = rough * (1 - head_hair[..., 0]) + 0.86 * head_hair[..., 0]

    return rgb, np.stack([rough, rough, rough], axis=2)


def sash_texture():
    W, H = 512, 128
    U, V = grid(W, H)
    rgb = np.zeros((H, W, 3)) + np.array([0.56, 0.11, 0.09])
    ivory = np.array([0.92, 0.86, 0.70])
    navy = np.array([0.10, 0.14, 0.30])
    for lo, hi in ((0.10, 0.18), (0.82, 0.90)):
        rgb[(V >= lo) & (V <= hi)] = GOLD_C
    m = (V > 0.26) & (V < 0.74)
    bu = (U * 30) % 1.0
    bv = (V - 0.5) / 0.24
    d = np.abs(bu - 0.5) * 2 + np.abs(bv)
    rgb[m & (d < 0.9)] = navy
    rgb[m & (d < 0.6)] = GOLD_C
    rgb[m & (d < 0.25)] = ivory
    n = smooth_noise(W, H, 32, 5)
    rgb *= (0.90 + 0.18 * n)[..., None]
    rgb *= (0.94 + 0.06 * np.sin(2 * np.pi * V * H / 3.0))[..., None]
    return rgb


def arkhalig_texture():
    S = 256
    U, V = grid(S, S)
    rgb = np.zeros((S, S, 3)) + np.array([0.38, 0.075, 0.095])
    stripe = ((U * 48) % 1.0) < 0.075
    rgb[stripe] = rgb[stripe] * 0.58 + GOLD_C * 0.42
    n = smooth_noise(S, S, 20, 9)
    rgb *= (0.9 + 0.2 * n)[..., None]
    return rgb


# ---------------------------------------------------------------------------
# Armature (Skelet) Sistemi
# ---------------------------------------------------------------------------
def build_armature():
    arm_data = bpy.data.armatures.new("MerchantArmature")
    arm_obj = bpy.data.objects.new("MerchantRig", arm_data)
    COL.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    eb = arm_data.edit_bones

    def add_bone(name, head, tail, parent_name=None, connect=False):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if parent_name:
            b.parent = eb[parent_name]
            b.use_connect = connect
        return b

    add_bone("Root", (0, 0, 0.0), (0, -0.25, 0.0))
    add_bone("Hips", (0, 0, 0.98), (0, 0, 1.08), "Root")
    add_bone("Spine", (0, 0, 1.08), (0, -0.005, 1.28), "Hips", connect=True)
    add_bone("Chest", (0, -0.005, 1.28), (0, 0.0, 1.49), "Spine", connect=True)
    add_bone("Neck", (0, 0.0, 1.49), (0, 0.003, 1.58), "Chest", connect=True)
    add_bone("Head", (0, 0.003, 1.58), (0, 0.003, 1.88), "Neck", connect=True)

    for s, sd in ((1, "L"), (-1, "R")):
        # Təbii A-pose qollar (azacıq yana və dirsəkdə bükülü)
        sh_head = (0.08 * s, 0.0, 1.41)
        sh_tail = (0.205 * s, 0.0, 1.39)
        el_pos = (0.255 * s, 0.01, 1.12)
        wr_pos = (0.275 * s, -0.055, 0.87)
        hn_pos = (0.285 * s, -0.075, 0.76)

        add_bone(f"Shoulder.{sd}", sh_head, sh_tail, "Chest")
        add_bone(f"UpperArm.{sd}", sh_tail, el_pos, f"Shoulder.{sd}", connect=True)
        add_bone(f"Forearm.{sd}", el_pos, wr_pos, f"UpperArm.{sd}", connect=True)
        add_bone(f"Hand.{sd}", wr_pos, hn_pos, f"Forearm.{sd}", connect=True)

        # Ayaqlar
        hip_pos = (0.10 * s, 0.0, 0.96)
        knee_pos = (0.10 * s, -0.01, 0.53)
        ank_pos = (0.10 * s, 0.01, 0.08)
        toe_pos = (0.10 * s, -0.14, 0.02)

        add_bone(f"Thigh.{sd}", hip_pos, knee_pos, "Hips")
        add_bone(f"Shin.{sd}", knee_pos, ank_pos, f"Thigh.{sd}", connect=True)
        add_bone(f"Foot.{sd}", ank_pos, toe_pos, f"Shin.{sd}", connect=True)

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


# ---------------------------------------------------------------------------
# Geometriya və Skinning Köməkçiləri
# ---------------------------------------------------------------------------
def _norm_profile(profile):
    pts = []
    for p in profile:
        z, rx, ry = p[0], p[1], p[2]
        cy = p[3] if len(p) > 3 else 0.0
        cx = p[4] if len(p) > 4 else 0.0
        pts.append((z, rx, ry, cy, cx))
    return pts


def finish_object(name, me, mat, subsurf=1, curl_displace=False):
    obj = bpy.data.objects.new(name, me)
    COL.objects.link(obj)
    me.materials.append(mat)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))

    bpy.context.view_layer.objects.active = obj
    if subsurf > 0:
        mod = obj.modifiers.new("Subsurf", "SUBSURF")
        mod.levels = subsurf
        mod.render_levels = subsurf
        bpy.ops.object.modifier_apply(modifier=mod.name)

    if curl_displace:
        try:
            curl = bpy.data.textures.new(f"{name}_Curl", "VORONOI")
            curl.noise_scale = 0.014
        except Exception:  # noqa: BLE001
            curl = bpy.data.textures.new(f"{name}_Curl", "CLOUDS")
            curl.noise_scale = 0.012
        disp = obj.modifiers.new("Curl", "DISPLACE")
        disp.texture = curl
        disp.strength = 0.0085
        disp.mid_level = 0.55
        bpy.ops.object.modifier_apply(modifier=disp.name)

    return obj


def lathe(name, profile, mat, segs=24, gap=0.0, gap_center=math.pi, caps=(True, True),
          subsurf=1, matrix=None, curl_displace=False):
    pts = _norm_profile(profile)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")

    lengths = [0.0]
    for i in range(1, len(pts)):
        a, b = pts[i - 1], pts[i]
        lengths.append(lengths[-1] + math.hypot(b[0] - a[0], (b[1] + b[2]) / 2 - (a[1] + a[2]) / 2) + 1e-6)
    total = lengths[-1] or 1.0
    vcoord = [x / total for x in lengths]

    rings = []
    for (z, rx, ry, cy, cx) in pts:
        ring = []
        for s in range(segs):
            th = 2 * math.pi * s / segs
            ring.append(bm.verts.new((cx + rx * math.sin(th), cy + ry * math.cos(th), z)))
        rings.append(ring)

    def angdiff(a, b):
        return abs((a - b + math.pi) % (2 * math.pi) - math.pi)

    for i in range(len(rings) - 1):
        for s in range(segs):
            thc = 2 * math.pi * (s + 0.5) / segs
            if gap > 0 and angdiff(thc, gap_center) < gap:
                continue
            s2 = (s + 1) % segs
            f = bm.faces.new((rings[i][s], rings[i + 1][s], rings[i + 1][s2], rings[i][s2]))
            u0, u1 = s / segs, (s + 1) / segs
            for loop, uv in zip(f.loops, ((u0, vcoord[i]), (u0, vcoord[i + 1]), (u1, vcoord[i + 1]), (u1, vcoord[i]))):
                loop[uvl].uv = uv

    if gap <= 0:
        if caps[0]:
            z, rx, ry, cy, cx = pts[0]
            c = bm.verts.new((cx, cy, z))
            for s in range(segs):
                f = bm.faces.new((c, rings[0][s], rings[0][(s + 1) % segs]))
                for loop in f.loops:
                    loop[uvl].uv = (0.5, 0.0)
        if caps[1]:
            z, rx, ry, cy, cx = pts[-1]
            c = bm.verts.new((cx, cy, z))
            for s in range(segs):
                f = bm.faces.new((c, rings[-1][(s + 1) % segs], rings[-1][s]))
                for loop in f.loops:
                    loop[uvl].uv = (0.5, 1.0)

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if matrix is not None:
        me.transform(matrix)
    return finish_object(name, me, mat, subsurf, curl_displace=curl_displace)


def prim(name, kind, mat, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), subsurf=0, segs=12, rings=8,
         r1=1.0, r2=1.0, depth=1.0, base=None):
    bm = bmesh.new()
    bm.loops.layers.uv.new("UVMap")
    if kind == "sphere":
        bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0, calc_uvs=True)
    elif kind == "cube":
        bmesh.ops.create_cube(bm, size=1.0, calc_uvs=True)
    else:
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2,
                              depth=depth, calc_uvs=True)
    m = Matrix.Translation(loc) @ Euler(rot, "XYZ").to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1.0))
    if base is not None:
        m = base @ m
    bm.transform(m)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish_object(name, me, mat, subsurf)


def build_sculpted_head(name, mat):
    """Vahid anatomik baş bmesh-i: göz çuxurları, qaş qövsü, burun körpüsü/qanadları, yanaqlar, dodaqlar, çənə."""
    profile = [
        (1.560, 0.012, 0.012, -0.048),
        (1.572, 0.042, 0.038, -0.045),
        (1.592, 0.066, 0.064, -0.032),
        (1.618, 0.078, 0.084, -0.016),
        (1.648, 0.086, 0.096, -0.006),
        (1.680, 0.089, 0.100, -0.002),
        (1.712, 0.090, 0.101, 0.000),
        (1.744, 0.087, 0.098, 0.004),
        (1.772, 0.076, 0.088, 0.008),
        (1.792, 0.054, 0.064, 0.010),
        (1.805, 0.020, 0.024, 0.010),
    ]
    segs = 38
    pts = _norm_profile(profile)
    # Subdivide vertically for smooth facial landmark sculpting
    dense_pts = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        steps = 3 if (1.58 <= a[0] <= 1.75) else 2
        for k in range(steps):
            t = k / steps
            dense_pts.append(tuple(a[c] + (b[c] - a[c]) * t for c in range(5)))
    dense_pts.append(pts[-1])

    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")

    z_min, z_max = dense_pts[0][0], dense_pts[-1][0]
    rings = []
    for (z, rx, ry, cy, cx) in dense_pts:
        ring = []
        for s in range(segs):
            th = 2 * math.pi * s / segs
            x = cx + rx * math.sin(th)
            y = cy + ry * math.cos(th)
            pz = z

            # Anatomik üz relyefi (yalnız ön yarımkürədə: y < -0.03)
            if y < -0.02:
                # 1. Göz çuxurları (recess inward)
                for sx in (1, -1):
                    d_eye = ((x - 0.033 * sx) / 0.020) ** 2 + ((pz - 1.680) / 0.016) ** 2
                    y += 0.013 * math.exp(-d_eye)
                    # Qaş sümüyü (brow ridge slightly outward)
                    d_brow = ((x - 0.034 * sx) / 0.025) ** 2 + ((pz - 1.703) / 0.011) ** 2
                    y -= 0.0075 * math.exp(-d_brow)
                    # Yanaq sümüyü (cheekbone)
                    d_cheek = ((x - 0.048 * sx) / 0.028) ** 2 + ((pz - 1.652) / 0.019) ** 2
                    y -= 0.007 * math.exp(-d_cheek)
                    # Burun qanadı
                    d_wing = ((x - 0.012 * sx) / 0.009) ** 2 + ((pz - 1.637) / 0.008) ** 2
                    y -= 0.0085 * math.exp(-d_wing)

                # 2. Burun körpüsü və ucu (protrudes cleanly -Y)
                d_bridge = (x / 0.0115) ** 2 + ((pz - 1.662) / 0.028) ** 2
                y -= 0.0245 * math.exp(-d_bridge)
                d_tip = (x / 0.012) ** 2 + ((pz - 1.639) / 0.0115) ** 2
                y -= 0.0225 * math.exp(-d_tip)

                # 3. Dodaqlar və ağız xətti
                d_ulip = (x / 0.021) ** 2 + ((pz - 1.615) / 0.006) ** 2
                y -= 0.007 * math.exp(-d_ulip)
                d_llip = (x / 0.018) ** 2 + ((pz - 1.602) / 0.0065) ** 2
                y -= 0.006 * math.exp(-d_llip)
                d_cleft = (x / 0.022) ** 2 + ((pz - 1.608) / 0.0028) ** 2
                y += 0.005 * math.exp(-d_cleft)

                # 4. Güclü çənə / saqqal dolğunluğu
                d_chin = (x / 0.027) ** 2 + ((pz - 1.582) / 0.017) ** 2
                y -= 0.013 * math.exp(-d_chin)
                pz -= 0.006 * math.exp(-d_chin)

            ring.append(bm.verts.new((x, y, pz)))
        rings.append(ring)

    for i in range(len(rings) - 1):
        v0 = (dense_pts[i][0] - z_min) / (z_max - z_min)
        v1 = (dense_pts[i + 1][0] - z_min) / (z_max - z_min)
        for s in range(segs):
            s2 = (s + 1) % segs
            f = bm.faces.new((rings[i][s], rings[i + 1][s], rings[i + 1][s2], rings[i][s2]))
            u0, u1 = s / segs, (s + 1) / segs
            for loop, uv in zip(f.loops, ((u0, v0), (u0, v1), (u1, v1), (u1, v0))):
                loop[uvl].uv = uv

    # Üst və alt qapaqlar
    c_bot = bm.verts.new((0, -0.048, z_min))
    for s in range(segs):
        f = bm.faces.new((c_bot, rings[0][s], rings[0][(s + 1) % segs]))
        for loop in f.loops:
            loop[uvl].uv = (0.5, 0.0)
    c_top = bm.verts.new((0, 0.010, z_max))
    for s in range(segs):
        f = bm.faces.new((c_top, rings[-1][(s + 1) % segs], rings[-1][s]))
        for loop in f.loops:
            loop[uvl].uv = (0.5, 1.0)

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish_object(name, me, mat, subsurf=1)


def profile_at(profile, z):
    pts = _norm_profile(profile)
    if z <= pts[0][0]:
        return pts[0][1:]
    for a, b in zip(pts, pts[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / max(1e-6, b[0] - a[0])
            return tuple(a[k] + (b[k] - a[k]) * t for k in range(1, 5))
    return pts[-1][1:]


def surface(profile, z, theta, offset=0.0):
    rx, ry, cy, cx = profile_at(profile, z)
    p = Vector((cx + (rx + offset) * math.sin(theta), cy + (ry + offset) * math.cos(theta), z))
    n = Vector((math.sin(theta) / rx, math.cos(theta) / ry, 0.0)).normalized()
    return p, n


def face_rot_z(n):
    return math.atan2(n.x, -n.y)


# ---------------------------------------------------------------------------
# Yumşaq Vertex Çəkiləri (Skinning Weights)
# ---------------------------------------------------------------------------
SKIN_PARTS = []


def reg(obj, mode, param=None):
    SKIN_PARTS.append((obj, mode, param))
    return obj


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0))) if edge1 != edge0 else (1.0 if x >= edge1 else 0.0)
    return t * t * (3.0 - 2.0 * t)


def bind_and_weight(obj, arm_obj, mode, param):
    for b in arm_obj.data.bones:
        if b.name not in obj.vertex_groups:
            obj.vertex_groups.new(name=b.name)

    vgs = {vg.name: vg for vg in obj.vertex_groups}

    if mode == "fixed":
        idx = [v.index for v in obj.data.vertices]
        vgs[param].add(idx, 1.0, "REPLACE")
    elif mode == "torso_grad":
        # z əsaslı yumşaq keçid: Hips (z<1.05) -> Spine (1.08..1.28) -> Chest (1.30+)
        for v in obj.data.vertices:
            z = v.co.z
            x = v.co.x
            if z < 1.03:
                w_hips = 1.0
                w_spine = 0.0
                w_chest = 0.0
            elif z < 1.24:
                t = smoothstep(1.03, 1.24, z)
                w_hips = 1.0 - t
                w_spine = t
                w_chest = 0.0
            elif z < 1.38:
                t = smoothstep(1.24, 1.38, z)
                w_hips = 0.0
                w_spine = 1.0 - t
                w_chest = t
            else:
                w_hips, w_spine, w_chest = 0.0, 0.0, 1.0

            # Qoltuq/çiyin kənarında çox az Shoulder təsiri
            if z > 1.33 and abs(x) > 0.175:
                sd = "L" if x > 0 else "R"
                ws = smoothstep(0.175, 0.215, abs(x)) * 0.45
                w_chest *= (1.0 - ws)
                vgs[f"Shoulder.{sd}"].add([v.index], ws, "REPLACE")

            if w_hips > 0.001:
                vgs["Hips"].add([v.index], w_hips, "REPLACE")
            if w_spine > 0.001:
                vgs["Spine"].add([v.index], w_spine, "REPLACE")
            if w_chest > 0.001:
                vgs["Chest"].add([v.index], w_chest, "REPLACE")
    elif mode == "neck":
        for v in obj.data.vertices:
            t = smoothstep(1.47, 1.56, v.co.z)
            vgs["Chest"].add([v.index], (1.0 - t) * 0.5, "REPLACE")
            vgs["Neck"].add([v.index], 0.5 + 0.3 * (1 - abs(t - 0.5) * 2), "REPLACE")
            vgs["Head"].add([v.index], t * 0.5, "REPLACE")
    elif mode == "arm":
        sd = param
        for v in obj.data.vertices:
            z = v.co.z
            x = abs(v.co.x)
            if x < 0.20:
                t = smoothstep(0.15, 0.21, x)
                vgs["Chest"].add([v.index], 1.0 - t, "REPLACE")
                vgs[f"UpperArm.{sd}"].add([v.index], t, "REPLACE")
            elif z > 1.17:
                vgs[f"UpperArm.{sd}"].add([v.index], 1.0, "REPLACE")
            elif z > 1.07:
                t = smoothstep(1.17, 1.07, z)
                vgs[f"UpperArm.{sd}"].add([v.index], 1.0 - t, "REPLACE")
                vgs[f"Forearm.{sd}"].add([v.index], t, "REPLACE")
            elif z > 0.89:
                vgs[f"Forearm.{sd}"].add([v.index], 1.0, "REPLACE")
            elif z > 0.85:
                t = smoothstep(0.89, 0.85, z)
                vgs[f"Forearm.{sd}"].add([v.index], 1.0 - t, "REPLACE")
                vgs[f"Hand.{sd}"].add([v.index], t, "REPLACE")
            else:
                vgs[f"Hand.{sd}"].add([v.index], 1.0, "REPLACE")
    elif mode == "leg":
        sd = param
        for v in obj.data.vertices:
            z = v.co.z
            if z > 0.96:
                t = smoothstep(0.96, 1.01, z)
                vgs[f"Thigh.{sd}"].add([v.index], 1.0 - t, "REPLACE")
                vgs["Hips"].add([v.index], t, "REPLACE")
            elif z > 0.58:
                vgs[f"Thigh.{sd}"].add([v.index], 1.0, "REPLACE")
            elif z > 0.48:
                t = smoothstep(0.58, 0.48, z)
                vgs[f"Thigh.{sd}"].add([v.index], 1.0 - t, "REPLACE")
                vgs[f"Shin.{sd}"].add([v.index], t, "REPLACE")
            elif z > 0.11:
                vgs[f"Shin.{sd}"].add([v.index], 1.0, "REPLACE")
            elif z > 0.06:
                t = smoothstep(0.11, 0.06, z)
                vgs[f"Shin.{sd}"].add([v.index], 1.0 - t, "REPLACE")
                vgs[f"Foot.{sd}"].add([v.index], t, "REPLACE")
            else:
                vgs[f"Foot.{sd}"].add([v.index], 1.0, "REPLACE")

    obj.parent = arm_obj
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj


# ---------------------------------------------------------------------------
# Materiallar
# ---------------------------------------------------------------------------
IMG_COAT_FULL = np_image("Tex_CoatTrim", coat_texture(band=True, trims=True, back_yoke=True))
IMG_COAT_CUFF = np_image("Tex_CoatCuff", coat_texture(band=True, trims=False))
IMG_COAT_PLAIN = np_image("Tex_CoatPlain", coat_texture(band=False, trims=False))
IMG_COAT_N = np_image("Tex_CoatNormal", coat_normal(), non_color=True)
IMG_PAPAQ_C, IMG_PAPAQ_N = papaq_textures()
IMG_PAPAQ = np_image("Tex_Papaq", IMG_PAPAQ_C)
IMG_PAPAQ_NRM = np_image("Tex_PapaqN", IMG_PAPAQ_N, non_color=True)
IMG_FACE_C, IMG_FACE_R = face_textures(1024)
IMG_FACE = np_image("Tex_Face", IMG_FACE_C)
IMG_FACE_ROUGH = np_image("Tex_FaceRough", IMG_FACE_R, non_color=True)
IMG_SASH = np_image("Tex_Sash", sash_texture())
IMG_ARKH = np_image("Tex_Arkhalig", arkhalig_texture())

M_COAT = mat_tex("Chukha_Wool", IMG_COAT_FULL, rough=0.88, nimg=IMG_COAT_N, sheen=0.32)
M_COAT_CUFF = mat_tex("Chukha_Cuff", IMG_COAT_CUFF, rough=0.88, nimg=IMG_COAT_N, sheen=0.32)
M_COAT_PLAIN = mat_tex("Chukha_Plain", IMG_COAT_PLAIN, rough=0.88, nimg=IMG_COAT_N, sheen=0.32)
M_PAPAQ = mat_tex("Papaq_Fur", IMG_PAPAQ, rough=0.98, nimg=IMG_PAPAQ_NRM, nstrength=0.45, sheen=0.45, spec=0.14)
M_FACE = mat_tex("Head_Skin", IMG_FACE, rough=0.58, rimg=IMG_FACE_ROUGH, spec=0.35)
M_SASH = mat_tex("Qursaq_Sash", IMG_SASH, rough=0.76, sheen=0.25)
M_ARKH = mat_tex("Arkhalig_Silk", IMG_ARKH, rough=0.46, sheen=0.2)

M_SKIN = mat_basic("Hand_Skin", (0.78, 0.57, 0.44), rough=0.56)
M_EYELID = mat_basic("Eyelid_Skin", (0.68, 0.47, 0.36), rough=0.58)
M_EYE = mat_basic("EyeWhite", (0.91, 0.89, 0.85), rough=0.12)
M_IRIS = mat_basic("Iris", (0.14, 0.08, 0.04), rough=0.08)
M_TROUSER = mat_basic("Trousers_Wool", (0.16, 0.13, 0.11), rough=0.9, sheen=0.22)
M_LEATHER = mat_basic("Boot_Leather", (0.19, 0.115, 0.068), rough=0.40)
M_LEATHER_DARK = mat_basic("Boot_Cuff", (0.12, 0.075, 0.048), rough=0.48)
M_SOLE = mat_basic("Sole", (0.07, 0.05, 0.038), rough=0.75)
M_GOLD = mat_basic("Gold", (0.86, 0.65, 0.28), rough=0.30, metal=1.0)
M_SILVER = mat_basic("Silver", (0.80, 0.80, 0.82), rough=0.26, metal=1.0)
M_POCKET = mat_basic("Gazyr_Pocket", (0.21, 0.125, 0.072), rough=0.85)
M_POUCH = mat_basic("Pouch_Leather", (0.36, 0.20, 0.10), rough=0.52)
M_POUCH_FLAP = mat_basic("Pouch_Flap", (0.25, 0.14, 0.07), rough=0.55)
M_HORN = mat_basic("Horn_Hilt", (0.11, 0.085, 0.065), rough=0.3)
M_SCABBARD = mat_basic("Scabbard", (0.07, 0.055, 0.045), rough=0.45)


# ---------------------------------------------------------------------------
# Geometriyanın Qurulması
# ---------------------------------------------------------------------------
# 1. Vahid Çuxa Gövdəsi + Ətək (kəsiksiz tikiş beldə, təbii çiyin əyriliyi!)
CHUKHA_ALL = [
    (0.50, 0.285, 0.245, 0.01),
    (0.60, 0.268, 0.230, 0.009),
    (0.72, 0.242, 0.206, 0.007),
    (0.84, 0.212, 0.180, 0.004),
    (0.94, 0.184, 0.155, 0.000),
    (1.01, 0.171, 0.141, 0.000),
    (1.10, 0.174, 0.144, -0.004),
    (1.20, 0.187, 0.150, -0.010),
    (1.30, 0.200, 0.153, -0.013),
    (1.38, 0.206, 0.147, -0.008),
    (1.435, 0.194, 0.126, 0.000),
    (1.475, 0.152, 0.095, 0.005),
    (1.500, 0.088, 0.074, 0.006),
]
reg(lathe("Chukha_Coat", CHUKHA_ALL, M_COAT, segs=36, gap=COAT_GAP, subsurf=1), "torso_grad")

# 2. Daxili İpək Ərxalıq (həm üst, həm alt vahid)
ARKH_ALL = [
    (0.59, 0.246, 0.222, 0.01),
    (0.73, 0.222, 0.195, 0.007),
    (0.88, 0.192, 0.163, 0.003),
    (1.01, 0.163, 0.134, 0.000),
    (1.18, 0.176, 0.139, -0.010),
    (1.31, 0.189, 0.143, -0.013),
    (1.41, 0.184, 0.125, -0.004),
    (1.465, 0.144, 0.090, 0.002),
    (1.495, 0.074, 0.067, 0.005),
    (1.535, 0.066, 0.062, 0.005),
]
reg(lathe("Arkhalig_Coat", ARKH_ALL, M_ARKH, segs=30, caps=(False, False), subsurf=1), "torso_grad")

# Düymələr
z = 1.13
bi = 0
while z <= 1.44:
    bp, _ = surface(ARKH_ALL, z, math.pi, 0.003)
    reg(prim(f"Arkh_Button{bi}", "sphere", M_GOLD, loc=tuple(bp), scale=(0.0065, 0.0065, 0.0065),
             segs=8, rings=6), "fixed", "Chest")
    z += 0.045
    bi += 1

# 3. Qurşaq + Düyün + Sallanan Uclar
SASH = [(0.985, 0.177, 0.147), (1.005, 0.180, 0.150), (1.060, 0.178, 0.148), (1.075, 0.174, 0.144)]
reg(lathe("Qursaq", SASH, M_SASH, segs=32, caps=(False, False), subsurf=1), "fixed", "Hips")

kp, kn = surface(SASH, 1.03, math.pi - 0.42, 0.012)
krz = face_rot_z(kn)
reg(prim("Qursaq_Knot", "sphere", M_SASH, loc=tuple(kp), scale=(0.032, 0.021, 0.028),
         rot=(0, 0, krz), subsurf=1), "fixed", "Hips")
for i, (dz, ry) in enumerate(((0.0, 0.08), (-0.022, -0.10))):
    tail_loc = kp + kn * 0.007 + Vector((0.012 * (1 if i == 0 else -1), 0, -0.095 + dz))
    reg(prim(f"Qursaq_Tail{i}", "cube", M_SASH, loc=tuple(tail_loc), scale=(0.034, 0.011, 0.14),
             rot=(0.05, ry, krz), subsurf=1), "fixed", "Hips")
    fr_loc = tail_loc + Vector((0, 0, -0.08))
    reg(prim(f"Qursaq_Fringe{i}", "cube", M_GOLD, loc=tuple(fr_loc), scale=(0.035, 0.012, 0.018),
             rot=(0.05, ry, krz)), "fixed", "Hips")

# 4. Qafqaz Xəncəri (qurşağın ön mərkəzində)
M_K = Matrix.Translation((-0.012, -0.172, 1.0)) @ Matrix.Rotation(0.14, 4, "Y")
reg(lathe("Xencer_Scabbard", [(-0.20, 0.004, 0.003), (-0.18, 0.009, 0.006), (-0.10, 0.016, 0.008),
                              (-0.02, 0.020, 0.009), (0.0, 0.021, 0.009)],
          M_SCABBARD, segs=12, subsurf=1, matrix=M_K), "fixed", "Hips")
for zi, zz in enumerate((-0.012, -0.09, -0.175)):
    rr = 0.022 - (0.0 if zi == 0 else 0.004 * zi)
    reg(lathe(f"Xencer_Ring{zi}", [(zz - 0.008, rr, 0.011), (zz + 0.008, rr, 0.011)], M_SILVER, segs=12,
              caps=(False, False), subsurf=0, matrix=M_K), "fixed", "Hips")
reg(prim("Xencer_Guard", "cube", M_SILVER, loc=(0, 0, 0.006), scale=(0.048, 0.022, 0.012), base=M_K), "fixed", "Hips")
reg(lathe("Xencer_Hilt", [(0.01, 0.011, 0.009), (0.05, 0.009, 0.008), (0.085, 0.011, 0.009)], M_HORN,
          segs=12, subsurf=0, matrix=M_K), "fixed", "Hips")
for sx in (-0.012, 0.012):
    reg(prim(f"Xencer_Pommel{sx}", "sphere", M_SILVER, loc=(sx, 0, 0.092), scale=(0.011, 0.01, 0.01),
             base=M_K, segs=8, rings=6), "fixed", "Hips")

# 5. Dəri Pul Kisəsi (sağ omba xaricində — qayışı qurşağın altına səliqəli girir)
PP = Vector((-0.232, 0.035, 0.875))
M_POUCH_ROT = Matrix.Translation(PP) @ Matrix.Rotation(-0.18, 4, "Y")
reg(prim("Kise_Body", "sphere", M_POUCH, loc=(0, 0, 0), scale=(0.028, 0.056, 0.068), base=M_POUCH_ROT,
         subsurf=1, segs=12, rings=8), "fixed", "Hips")
reg(prim("Kise_Flap", "sphere", M_POUCH_FLAP, loc=(-0.006, 0, 0.036), scale=(0.026, 0.058, 0.030),
         base=M_POUCH_ROT, subsurf=1, segs=12, rings=8), "fixed", "Hips")
reg(prim("Kise_Clasp", "sphere", M_GOLD, loc=(-0.032, 0, 0.018), scale=(0.008, 0.008, 0.008),
         base=M_POUCH_ROT, segs=8, rings=6), "fixed", "Hips")
reg(prim("Kise_Strap", "cyl", M_POUCH_FLAP, loc=(0.020, 0, 0.068), rot=(0, -0.22, 0), segs=8, r1=0.005, r2=0.005,
         depth=0.055, base=M_POUCH_ROT), "fixed", "Hips")

# 6. Qazırlar (sinədə gümüş başlıqlı yuvalar)
for s in (1, -1):
    for k in range(5):
        th = math.pi - s * (0.66 + 0.115 * k)
        gp, gn = surface(CHUKHA_ALL, 1.32, th, 0.003)
        rz = face_rot_z(gn)
        suf = f"{'L' if s > 0 else 'R'}{k}"
        reg(prim(f"Gazyr_Pocket{suf}", "cube", M_POCKET, loc=tuple(gp + gn * 0.002), scale=(0.025, 0.012, 0.088),
                 rot=(0, 0, rz), subsurf=0), "fixed", "Chest")
        tp = gp + gn * 0.011
        reg(prim(f"Gazyr_Tube{suf}", "cyl", M_HORN, loc=(tp.x, tp.y, 1.335), rot=(0, 0, rz), segs=8, r1=0.0072,
                 r2=0.0072, depth=0.068), "fixed", "Chest")
        reg(prim(f"Gazyr_Cap{suf}", "sphere", M_SILVER, loc=(tp.x, tp.y, 1.375), scale=(0.0095, 0.0095, 0.0082),
                 segs=8, rings=6), "fixed", "Chest")

# 7. Boyun & Heykəltəraşlıq Baş + Gözlər + Qulaqlar + Papaq
reg(lathe("Neck", [(1.45, 0.052, 0.054, 0.0), (1.51, 0.050, 0.052, 0.002), (1.585, 0.051, 0.055, 0.004)],
          M_SKIN, segs=18, caps=(False, False), subsurf=1), "neck")

reg(build_sculpted_head("Head", M_FACE), "fixed", "Head")

EYE_Z = 1.678
for s in (1, -1):
    sd = "L" if s > 0 else "R"
    ex = 0.032 * s
    # Göz alması + zərif incə göz qapaqları (göz çuxuruna tam oturan)
    reg(prim(f"Eye_{sd}", "sphere", M_EYE, loc=(ex, -0.079, EYE_Z), scale=(0.0115, 0.0115, 0.0105),
             segs=14, rings=10), "fixed", "Head")
    reg(prim(f"Iris_{sd}", "sphere", M_IRIS, loc=(ex, -0.0898, EYE_Z - 0.0004), scale=(0.0058, 0.0022, 0.0058),
             segs=12, rings=8), "fixed", "Head")
    reg(prim(f"LidUp_{sd}", "sphere", M_EYELID, loc=(ex, -0.080, EYE_Z + 0.0055), scale=(0.0138, 0.0112, 0.0058),
             rot=(0.10, 0.08 * s, 0), segs=12, rings=8), "fixed", "Head")
    reg(prim(f"LidLow_{sd}", "sphere", M_EYELID, loc=(ex, -0.0795, EYE_Z - 0.0064), scale=(0.0132, 0.0108, 0.0040),
             segs=12, rings=8), "fixed", "Head")
    # Qulaqlar (üzə tam birləşik)
    reg(prim(f"Ear_{sd}", "sphere", M_SKIN, loc=(0.088 * s, 0.004, 1.668), scale=(0.010, 0.022, 0.029),
             rot=(0, -0.15 * s, 0), subsurf=1, segs=10, rings=8), "fixed", "Head")

# Qoyun dərisi Papaq (təbii qıvrım relyefli, qaşların üstündə oturan)
PAPAQ_TILT = Matrix.Translation((0, 0, 1.6)) @ Matrix.Rotation(0.055, 4, "X") @ Matrix.Translation((0, 0, -1.6))
papaq = lathe("Papaq", [
    (1.732, 0.095, 0.104, 0.004),
    (1.740, 0.107, 0.115, 0.004),
    (1.762, 0.115, 0.123, 0.003),
    (1.815, 0.120, 0.127, 0.001),
    (1.870, 0.121, 0.129, 0.000),
    (1.902, 0.116, 0.123, 0.000),
    (1.916, 0.095, 0.102, 0.000),
    (1.922, 0.045, 0.050, 0.000),
    (1.924, 0.003, 0.003, 0.000),
], M_PAPAQ, segs=30, caps=(True, True), subsurf=1, matrix=PAPAQ_TILT, curl_displace=True)
reg(papaq, "fixed", "Head")

# 8. Vahid Qollar (çiyindən biləyə qədər TƏK kəsiksiz qol — çiyin tikişsiz içəri girir)
for s in (1, -1):
    sd = "L" if s > 0 else "R"
    sh = Vector((0.174 * s, 0.0, 1.404))
    el = Vector((0.255 * s, 0.010, 1.12))
    wr = Vector((0.275 * s, -0.055, 0.87))

    v_fo = wr - el
    q_fo = Vector((0, 0, -1)).rotation_difference(v_fo.normalized())

    # Çiyindən biləyə qədər vahid profil (xətti interpolasiya)
    arm_pts = [
        (0.0, 0.016, 0.016, 0.0, 0.0),
        (0.04, 0.056, 0.058, 0.0, 0.0),
        (0.20, 0.062, 0.064, 0.0, 0.0),
        (0.42, 0.058, 0.060, 0.0, 0.0),
        (0.54, 0.053, 0.055, 0.0, 0.0),
        (0.70, 0.051, 0.053, 0.0, 0.0),
        (0.86, 0.056, 0.058, 0.0, 0.0),
        (0.95, 0.064, 0.068, 0.0, 0.0),
        (1.00, 0.067, 0.071, 0.0, 0.0),
        (0.99, 0.032, 0.034, 0.0, 0.0),
    ]
    bm_arm = bmesh.new()
    uv_arm = bm_arm.loops.layers.uv.new("UVMap")
    segs_a = 18
    rings_a = []
    for t_arm, rx, ry, _, _ in arm_pts:
        if t_arm <= 0.52:
            k = t_arm / 0.52
            center = sh.lerp(el, k)
            tangent = (el - sh).normalized()
        else:
            k = (t_arm - 0.52) / 0.48
            center = el.lerp(wr, k)
            tangent = (wr - el).normalized()
        # Local frame around tangent
        side_v = Vector((1, 0, 0)).cross(tangent)
        if side_v.length < 1e-4:
            side_v = Vector((0, 1, 0))
        else:
            side_v.normalize()
        fwd_v = tangent.cross(side_v).normalized()
        ring = []
        for si in range(segs_a):
            th = 2 * math.pi * si / segs_a
            pt = center + side_v * (rx * math.sin(th)) + fwd_v * (ry * math.cos(th))
            ring.append(bm_arm.verts.new(pt))
        rings_a.append(ring)

    for ri in range(len(rings_a) - 1):
        v0 = 1.0 - arm_pts[ri][0]
        v1 = 1.0 - arm_pts[ri + 1][0]
        for si in range(segs_a):
            s2 = (si + 1) % segs_a
            f = bm_arm.faces.new((rings_a[ri][si], rings_a[ri + 1][si], rings_a[ri + 1][s2], rings_a[ri][s2]))
            u0, u1 = si / segs_a, (si + 1) / segs_a
            for loop, uv in zip(f.loops, ((u0, v0), (u0, v1), (u1, v1), (u1, v0))):
                loop[uv_arm].uv = uv
    c_top_a = bm_arm.verts.new(sh + Vector((0, 0.0, 0.015)))
    for si in range(segs_a):
        f = bm_arm.faces.new((c_top_a, rings_a[0][(si + 1) % segs_a], rings_a[0][si]))
        for loop in f.loops:
            loop[uv_arm].uv = (0.5, 1.0)

    me_arm = bpy.data.meshes.new(f"Sleeve{sd}")
    bm_arm.to_mesh(me_arm)
    bm_arm.free()
    reg(finish_object(f"Sleeve{sd}", me_arm, M_COAT_CUFF, subsurf=1), "arm", sd)

    # Bilək, ovuc və 5 barmaq (armature Hand.{sd} sümüyünə təmiz bağlı)
    m_hand = Matrix.Translation(wr) @ q_fo.to_matrix().to_4x4()
    reg(prim(f"Wrist{sd}", "cyl", M_SKIN, loc=(0, 0, -0.015), segs=10, r1=0.025, r2=0.027,
             depth=0.04, base=m_hand), "fixed", f"Hand.{sd}")
    reg(prim(f"Palm{sd}", "sphere", M_SKIN, loc=(0, -0.003, -0.055), scale=(0.022, 0.039, 0.048),
             base=m_hand, subsurf=1, segs=10, rings=7), "fixed", f"Hand.{sd}")
    for k, (fy, ln) in enumerate(((-0.025, 0.030), (-0.008, 0.034), (0.009, 0.032), (0.024, 0.026))):
        reg(prim(f"Finger{sd}{k}", "sphere", M_SKIN, loc=(-0.003 * s, fy, -0.098 - ln * 0.8),
                 scale=(0.0082, 0.0082, ln), rot=(0, 0.2 * s, 0), segs=8, rings=6, base=m_hand),
            "fixed", f"Hand.{sd}")
    reg(prim(f"Thumb{sd}", "sphere", M_SKIN, loc=(-0.013 * s, -0.034, -0.066), scale=(0.0092, 0.0092, 0.025),
             rot=(-0.65, 0.28 * s, 0), segs=8, rings=6, base=m_hand), "fixed", f"Hand.{sd}")

# 9. Ayaqlar + Dəri Çəkmələr (beldən çıxmır — təmiz içəridə oturur + oval altlıq!)
for s in (1, -1):
    sd = "L" if s > 0 else "R"
    cx = 0.10 * s
    reg(lathe(f"Trousers{sd}", [
        (0.45, 0.064, 0.068, 0.0, cx),
        (0.55, 0.072, 0.076, -0.004, cx),
        (0.70, 0.078, 0.082, -0.004, cx),
        (0.84, 0.070, 0.074, 0.0, cx),
        (0.95, 0.062, 0.066, 0.0, cx),
    ], M_TROUSER, segs=16, caps=(False, False), subsurf=1), "leg", sd)

    reg(lathe(f"Boot{sd}", [
        (0.03, 0.049, 0.058, 0.01, cx),
        (0.09, 0.049, 0.057, 0.007, cx),
        (0.18, 0.054, 0.060, 0.003, cx),
        (0.32, 0.061, 0.065, 0.0, cx),
        (0.46, 0.067, 0.071, 0.0, cx),
        (0.51, 0.071, 0.075, 0.0, cx),
    ], M_LEATHER, segs=16, caps=(True, False), subsurf=1), "leg", sd)

    reg(lathe(f"BootCuff{sd}", [
        (0.465, 0.073, 0.077, 0.0, cx),
        (0.515, 0.077, 0.081, 0.0, cx),
    ], M_LEATHER_DARK, segs=16, caps=(False, False), subsurf=1), "leg", sd)

    reg(prim(f"Foot{sd}", "sphere", M_LEATHER, loc=(cx, -0.055, 0.048), scale=(0.048, 0.122, 0.048),
             subsurf=1, segs=12, rings=8), "fixed", f"Foot.{sd}")
    # Oval dəri altlıq və daban (çəkməyə tam oturan)
    reg(lathe(f"Sole{sd}", [
        (0.002, 0.047, 0.122, -0.058, cx),
        (0.018, 0.050, 0.125, -0.058, cx),
        (0.025, 0.048, 0.121, -0.058, cx),
    ], M_SOLE, segs=18, caps=(True, True), subsurf=0), "fixed", f"Foot.{sd}")
    reg(lathe(f"Heel{sd}", [
        (0.000, 0.037, 0.038, 0.024, cx),
        (0.026, 0.039, 0.040, 0.024, cx),
    ], M_SOLE, segs=14, caps=(True, True), subsurf=0), "fixed", f"Foot.{sd}")

# ---------------------------------------------------------------------------
# Skeletə Bağlama (Skinning) & Idle / Walk Animasiyaları
# ---------------------------------------------------------------------------
ARMATURE = build_armature()
for obj, mode, param in SKIN_PARTS:
    bind_and_weight(obj, ARMATURE, mode, param)


def create_animations(arm_obj):
    arm_obj.animation_data_create()
    pb = arm_obj.pose.bones

    def set_rot(bone_name, rx_deg=0.0, ry_deg=0.0, rz_deg=0.0):
        b = pb[bone_name]
        b.rotation_mode = "XYZ"
        b.rotation_euler = (math.radians(rx_deg), math.radians(ry_deg), math.radians(rz_deg))

    def key_all(frame, bone_names):
        for bn in bone_names:
            b = pb[bn]
            b.keyframe_insert(data_path="location", frame=frame)
            b.keyframe_insert(data_path="rotation_euler", frame=frame)

    def make_cyclic(action):
        try:
            for fc in action.fcurves:
                fc.modifiers.new(type="CYCLES")
        except Exception:
            pass

    all_bones = list(pb.keys())

    # 1) IDLE animasiyası (72 kadr @ 24fps = 3 saniyə)
    act_idle = bpy.data.actions.new("Idle")
    arm_obj.animation_data.action = act_idle
    for f, phase in ((1, 0.0), (19, 0.5), (37, 1.0), (55, 1.5), (73, 2.0)):
        breath = math.sin(phase * math.pi)
        sway = math.sin(phase * math.pi * 0.5)
        for bn in all_bones:
            pb[bn].location = (0, 0, 0)
            set_rot(bn, 0, 0, 0)

        pb["Hips"].location = (0.008 * sway, 0, -0.004 * (1 - breath))
        set_rot("Hips", 0, 1.5 * sway, 0)
        set_rot("Spine", 1.2 * breath, -1.0 * sway, 0)
        set_rot("Chest", -1.6 * breath, -1.2 * sway, 0)
        set_rot("Head", 1.2 * breath, 3.5 * sway, 0)
        set_rot("UpperArm.L", 2.0 * breath, 0, -2.0)
        set_rot("UpperArm.R", 2.0 * breath, 0, 2.0)
        set_rot("Forearm.L", -8.0 - 2.0 * breath, 0, 0)
        set_rot("Forearm.R", -8.0 - 2.0 * breath, 0, 0)
        key_all(f, all_bones)

    make_cyclic(act_idle)
    track_idle = arm_obj.animation_data.nla_tracks.new()
    track_idle.name = "Idle"
    strip_idle = track_idle.strips.new("Idle", 1, act_idle)
    strip_idle.name = "Idle"

    # 2) WALK animasiyası (24 kadr @ 24fps = 1 saniyə tam döngü)
    act_walk = bpy.data.actions.new("Walk")
    arm_obj.animation_data.action = act_walk
    walk_keys = (1, 4, 7, 10, 13, 16, 19, 22, 25)
    for f in walk_keys:
        t = (f - 1) / 24.0
        ang = t * 2.0 * math.pi
        s = math.sin(ang)
        c = math.cos(ang)
        bob = abs(math.sin(ang)) * 0.032 - 0.015

        for bn in all_bones:
            pb[bn].location = (0, 0, 0)
            set_rot(bn, 0, 0, 0)

        # Omba şaquli hərəkəti və yüngül dönmə
        pb["Hips"].location = (0.018 * s, 0, bob)
        set_rot("Hips", 3.0, 4.5 * s, 2.2 * c)
        set_rot("Spine", 3.5, -3.0 * s, -1.0 * c)
        set_rot("Chest", 2.5, -5.0 * s, -1.5 * c)
        set_rot("Head", -4.0, 2.5 * s, 0)

        # Sol/Sağ ayaqlar (180 dərəcə əks faza)
        # X fırlanması mənfi olanda ayaq önə (-Y) qalxır!
        for sd, ph in (("L", ang), ("R", ang + math.pi)):
            sp = math.sin(ph)
            cp = math.cos(ph)
            thigh_x = -26.0 * sp - 2.0
            knee_lift = max(0.0, -cp)
            shin_x = 36.0 * knee_lift + (6.0 if sp < 0 else 2.0)
            foot_x = -12.0 * knee_lift + 10.0 * max(0.0, sp)
            set_rot(f"Thigh.{sd}", thigh_x, 0, 0)
            set_rot(f"Shin.{sd}", shin_x, 0, 0)
            set_rot(f"Foot.{sd}", foot_x, 0, 0)

        # Qollar ayaqların əksinə yellənir
        set_rot("UpperArm.L", 22.0 * s, 0, -2.5)
        set_rot("UpperArm.R", -22.0 * s, 0, 2.5)
        set_rot("Forearm.L", -16.0 - 12.0 * max(0.0, -s), 0, 0)
        set_rot("Forearm.R", -16.0 - 12.0 * max(0.0, s), 0, 0)

        key_all(f, all_bones)

    make_cyclic(act_walk)
    track_walk = arm_obj.animation_data.nla_tracks.new()
    track_walk.name = "Walk"
    strip_walk = track_walk.strips.new("Walk", 1, act_walk)
    strip_walk.name = "Walk"

    # Yalnız NLA trekləri eksport olunsun (Idle və Walk ayrı-ayrı)
    arm_obj.animation_data.action = None
    SCENE.frame_set(1)


create_animations(ARMATURE)

# ---------------------------------------------------------------------------
# Eksport (Idle + Walk NLA trekləri ilə!)
# ---------------------------------------------------------------------------
bpy.context.view_layer.update()
for path in OUT_FILES:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_materials="EXPORT",
        export_animations=True,
        export_nla_strips=True,
        export_nla_strips_merged_animation_name="",
        export_force_sampling=True,
        export_image_format="JPEG",
        export_jpeg_quality=88,
    )
    print(f"EXPORTED {path} ({os.path.getsize(path) / 1024:.0f} KB)")

# GLB daxilindəki animasiya adlarını yoxla
import json, struct
with open(OUT_FILES[0], "rb") as gf:
    gf.read(12)
    clen, ctype = struct.unpack("<II", gf.read(8))
    gltf_hdr = json.loads(gf.read(clen).decode("utf-8"))
    print("GLB_ANIMATIONS:", [a.get("name") for a in gltf_hdr.get("animations", [])])

deps = bpy.context.evaluated_depsgraph_get()
tri_total = 0
for ob in SCENE.objects:
    if ob.type == "MESH":
        ev = ob.evaluated_get(deps)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        tri_total += len(me.loop_triangles)
        ev.to_mesh_clear()
print(f"TRIANGLES {tri_total}")

# ---------------------------------------------------------------------------
# Önizləmə Render
# ---------------------------------------------------------------------------
def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


if DO_RENDER:
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    SCENE.render.engine = "CYCLES"
    SCENE.cycles.device = "CPU"
    SCENE.cycles.samples = 40
    try:
        SCENE.cycles.use_denoising = True
    except Exception:  # noqa: BLE001
        pass
    SCENE.render.resolution_x = 720
    SCENE.render.resolution_y = 960

    world = bpy.data.worlds.new("PreviewWorld")
    SCENE.world = world
    try:
        world.use_nodes = True
        bg = world.node_tree.nodes.get("Background")
        bg.inputs["Color"].default_value = (*to_linear((0.78, 0.70, 0.60)), 1.0)
        bg.inputs["Strength"].default_value = 0.55
    except Exception:  # noqa: BLE001
        world.color = to_linear((0.78, 0.70, 0.60))

    prim("PreviewFloor", "cube", mat_basic("Floor", (0.62, 0.52, 0.40), rough=0.9), loc=(0, 0, -0.01),
         scale=(8, 8, 0.02))

    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = 0.12
    sun_data.color = (1.0, 0.9, 0.75)
    sun = bpy.data.objects.new("Sun", sun_data)
    COL.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))

    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 120
    fill_data.size = 2.5
    fill = bpy.data.objects.new("Fill", fill_data)
    COL.objects.link(fill)
    fill.location = (-2.2, -1.8, 2.0)
    look_at(fill, (0, 0, 1.2))

    rim_data = bpy.data.lights.new("Rim", "AREA")
    rim_data.energy = 160
    rim_data.size = 1.5
    rim_data.color = (1.0, 0.85, 0.6)
    rim = bpy.data.objects.new("Rim", rim_data)
    COL.objects.link(rim)
    rim.location = (1.2, 2.4, 2.2)
    look_at(rim, (0, 0, 1.3))

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    COL.objects.link(cam)
    SCENE.camera = cam

    shots = [
        ("merchant_full.png", (1.45, -3.0, 1.25), (0.0, 0.0, 0.98), 45),
        ("merchant_face.png", (0.28, -0.78, 1.69), (0.0, 0.0, 1.67), 72),
        ("merchant_back.png", (-1.55, 2.45, 1.38), (0.0, 0.0, 1.02), 45),
    ]
    for fname, pos, target, lens in shots:
        cam.location = pos
        cam_data.lens = lens
        look_at(cam, target)
        SCENE.render.filepath = os.path.join(PREVIEW_DIR, fname)
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED {SCENE.render.filepath}")
