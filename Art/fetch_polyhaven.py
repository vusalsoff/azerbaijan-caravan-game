"""
Art/fetch_polyhaven.py
Tamamilə pulsuz, limitsiz CC0 Poly Haven API-dən real fotoskan edilmiş
3D modelləri və PBR teksturaları yükləyir, Blender 5.0 ilə ölçüləndirib
optimallaşdırır və public/models/ + public/textures/pbr/ qovluqlarına çıxarır.

İşə salmaq:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" --background --python Art/fetch_polyhaven.py
"""

import math
import os
import random
import socket
import time
import bpy
import requests
import urllib3.util.connection
from mathutils import Matrix, Vector

# IPv6 DNS xətalarının qarşısını almaq üçün IPv4 üstünlüyü
urllib3.util.connection.allowed_gai_family = lambda: socket.AF_INET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
CACHE_DIR = os.path.join(SCRIPT_DIR, "_ph_cache")
PUBLIC_MODELS = os.path.join(ROOT, "public", "models")
PUBLIC_PBR = os.path.join(ROOT, "public", "textures", "pbr")

HEADERS = {"User-Agent": "AzerbaijanCaravanGame/1.0 (CC0 Asset Fetcher)"}


def download_file(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(3):
        try:
            with requests.get(url, headers=HEADERS, stream=True, timeout=60) as r:
                r.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in r.iter_content(chunk_size=65536):
                        if chunk:
                            f.write(chunk)
            return dest
        except Exception as exc:
            if attempt == 2:
                raise
            print(f"Retry {attempt + 1} for {url}: {exc}")
            time.sleep(1.5)
    return dest


def fetch_ph_gltf(asset_id, res="1k"):
    """Poly Haven 3D assetinin glTF + .bin + teksturalarını yükləyir."""
    asset_dir = os.path.join(CACHE_DIR, "models", asset_id)
    files_url = f"https://api.polyhaven.com/files/{asset_id}"
    data = requests.get(files_url, headers=HEADERS, timeout=30).json()
    gltf_block = data.get("gltf", {})
    res_block = gltf_block.get(res) or gltf_block.get("1k") or next(iter(gltf_block.values()))
    entry = res_block["gltf"]

    gltf_name = os.path.basename(entry["url"])
    gltf_path = os.path.join(asset_dir, gltf_name)
    download_file(entry["url"], gltf_path)

    for rel_path, info in entry.get("include", {}).items():
        local_sub = os.path.join(asset_dir, *rel_path.split("/"))
        download_file(info["url"], local_sub)

    return gltf_path


def fetch_ph_pbr_texture(asset_id, out_folder, res="1k"):
    """Poly Haven PBR teksturasının Diffuse, nor_gl, Rough (jpg) fayllarını yükləyir."""
    files_url = f"https://api.polyhaven.com/files/{asset_id}"
    data = requests.get(files_url, headers=HEADERS, timeout=30).json()

    os.makedirs(out_folder, exist_ok=True)
    wanted = {
        "Diffuse": "diff.jpg",
        "nor_gl": "nor.jpg",
        "Rough": "rough.jpg",
    }
    saved = {}
    for ph_key, out_name in wanted.items():
        block = data.get(ph_key, {})
        res_block = block.get(res) or block.get("1k")
        if not res_block:
            continue
        fmt = res_block.get("jpg") or res_block.get("png")
        if not fmt:
            continue
        dest = os.path.join(out_folder, f"{asset_id}_{out_name}")
        download_file(fmt["url"], dest)
        saved[ph_key] = dest
        print(f"PBR saved: {dest}")
    return saved


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_and_normalize(gltf_path, name_prefix, target_size, by_height=True, max_tris=1800):
    """glTF assetini yükləyir, transformasiyaları vertexlərə bişirir, təmiz ölçüyə gətirir və desimate edir."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=gltf_path)
    imported = [o for o in bpy.data.objects if o not in before]
    bpy.context.view_layer.update()

    meshes = [o for o in imported if o.type == "MESH"]
    # Dünya transformasiyasını vertexlərə tətbiq et, valideynləri ayır
    for m in meshes:
        wm = m.matrix_world.copy()
        m.parent = None
        m.matrix_world = Matrix.Identity(4)
        m.data.transform(wm)

    for o in imported:
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)

    # Ümumi bounding box hesabla
    min_v = Vector((1e9, 1e9, 1e9))
    max_v = Vector((-1e9, -1e9, -1e9))
    for m in meshes:
        for v in m.data.vertices:
            min_v.x = min(min_v.x, v.co.x)
            min_v.y = min(min_v.y, v.co.y)
            min_v.z = min(min_v.z, v.co.z)
            max_v.x = max(max_v.x, v.co.x)
            max_v.y = max(max_v.y, v.co.y)
            max_v.z = max(max_v.z, v.co.z)

    size_x = max_v.x - min_v.x
    size_y = max_v.y - min_v.y
    size_z = max_v.z - min_v.z
    cur_dim = size_z if by_height else max(size_x, size_y)
    scale = target_size / max(cur_dim, 1e-4)

    cx = (min_v.x + max_v.x) * 0.5
    cy = (min_v.y + max_v.y) * 0.5
    cz = min_v.z

    norm_mat = Matrix.Scale(scale, 4) @ Matrix.Translation((-cx, -cy, -cz))
    for idx, m in enumerate(meshes):
        m.name = f"{name_prefix}_{idx}"
        m.data.transform(norm_mat)
        m.data.update()

    # Optimallaşdırma (brauzer 60 FPS üçün)
    deps = bpy.context.evaluated_depsgraph_get()
    for m in meshes:
        ev = m.evaluated_get(deps)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        tris = len(me.loop_triangles)
        ev.to_mesh_clear()
        if tris > max_tris:
            mod = m.modifiers.new("OptDecimate", "DECIMATE")
            mod.ratio = max(0.08, max_tris / float(tris))
            bpy.context.view_layer.objects.active = m
            bpy.ops.object.modifier_apply(modifier=mod.name)

    dims = (size_x * scale, size_y * scale, size_z * scale)
    return meshes, dims


def place_clone(meshes, loc, rot_z=0.0, scale=1.0, parent=None):
    grp = bpy.data.objects.new("Item", None)
    bpy.context.scene.collection.objects.link(grp)
    if parent:
        grp.parent = parent
    for src in meshes:
        dup = src.copy()
        dup.data = src.data
        bpy.context.scene.collection.objects.link(dup)
        dup.parent = grp
    grp.location = loc
    grp.rotation_euler = (0.0, 0.0, rot_z)
    grp.scale = (scale, scale, scale)
    return grp


def remove_objects(objs):
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)


def export_glb(filename):
    for folder in (PUBLIC_MODELS, SCRIPT_DIR):
        os.makedirs(folder, exist_ok=True)
        out = os.path.join(folder, filename)
        bpy.ops.export_scene.gltf(
            filepath=out,
            export_format="GLB",
            export_yup=True,
            export_apply=True,
            export_materials="EXPORT",
            export_image_format="JPEG",
            export_jpeg_quality=84,
        )
        print(f"EXPORTED {out} ({os.path.getsize(out) / 1024:.0f} KB)")


def build_fruit_baskets():
    """Real Poly Haven hörmə səbət (wicker_basket_02) + fotoskan alma, armud və nar meyvələri."""
    print("Building prop_fruit_baskets.glb from Poly Haven...")
    p_basket = fetch_ph_gltf("wicker_basket_02", "1k")
    p_apple = fetch_ph_gltf("food_apple_01", "1k")
    p_pear = fetch_ph_gltf("food_pears_asian_01", "1k")
    p_pom = fetch_ph_gltf("food_pomegranate_01", "1k")

    reset_scene()
    basket_m, b_dim = import_and_normalize(p_basket, "Basket", 0.64, by_height=False, max_tris=1800)
    apple_m, _ = import_and_normalize(p_apple, "Apple", 0.125, by_height=False, max_tris=600)
    pear_m, _ = import_and_normalize(p_pear, "Pear", 0.125, by_height=False, max_tris=600)
    pom_m, _ = import_and_normalize(p_pom, "Pomegranate", 0.135, by_height=False, max_tris=700)

    b_height = b_dim[2]
    b_rad = min(b_dim[0], b_dim[1]) * 0.34

    root = bpy.data.objects.new("FruitBaskets", None)
    bpy.context.scene.collection.objects.link(root)

    rng = random.Random(101)
    configs = [
        ((-0.55, -0.18, 0.0), 1.05, apple_m),
        ((0.15, -0.45, 0.0), 0.98, pear_m),
        ((0.62, 0.18, 0.0), 1.02, pom_m),
    ]

    for b_loc, b_sc, fruit_list in configs:
        place_clone(basket_m, b_loc, rng.uniform(0, 3.14), b_sc, parent=root)
        for z_off, count, r_factor in (
            (b_height * 0.58 * b_sc, 7, 0.70),
            (b_height * 0.80 * b_sc, 4, 0.35),
        ):
            for i in range(count):
                ang = (i / count) * 2.0 * math.pi + rng.uniform(-0.25, 0.25)
                dist = 0.0 if (i == 0 and count == 4) else b_rad * b_sc * r_factor
                fx = b_loc[0] + math.cos(ang) * dist
                fy = b_loc[1] + math.sin(ang) * dist
                place_clone(
                    fruit_list,
                    (fx, fy, b_loc[2] + z_off + rng.uniform(0, 0.015)),
                    rng.uniform(0, 6.28),
                    rng.uniform(0.95, 1.15),
                    parent=root,
                )

    remove_objects(basket_m + apple_m + pear_m + pom_m)
    export_glb("prop_fruit_baskets.glb")


def build_copper_jugs():
    """Real Poly Haven mis/bürünc və antik saxsı səhəng dəsti."""
    print("Building prop_copper_jugs.glb from Poly Haven...")
    p_v1 = fetch_ph_gltf("brass_vase_01", "1k")
    p_v2 = fetch_ph_gltf("brass_vase_03", "1k")
    p_pot = fetch_ph_gltf("brass_pot_01", "1k")
    p_cer = fetch_ph_gltf("antique_ceramic_vase_01", "1k")

    reset_scene()
    assets = [
        (p_v1, 0.68, (0.0, 0.0, 0.0), 0.4),
        (p_v2, 0.54, (-0.36, 0.16, 0.0), 1.2),
        (p_pot, 0.38, (0.38, 0.14, 0.0), -0.6),
        (p_cer, 0.48, (-0.12, -0.32, 0.0), 2.1),
    ]

    for idx, (path, height_m, loc, rz) in enumerate(assets):
        meshes, _ = import_and_normalize(path, f"Vessel_{idx}", height_m, by_height=True, max_tris=1500)
        for m in meshes:
            m.location = loc
            m.rotation_euler.z = rz

    export_glb("prop_copper_jugs.glb")


def build_bazaar_crates():
    """Real Poly Haven antik taxta xəzinə sandığı və bazar yük yeşikləri."""
    print("Building prop_bazaar_crates.glb from Poly Haven...")
    p_chest = fetch_ph_gltf("treasure_chest", "1k")
    p_crate = fetch_ph_gltf("wooden_crate_02", "1k")

    reset_scene()
    m1, _ = import_and_normalize(p_chest, "TreasureChest", 0.68, by_height=True, max_tris=1800)
    for m in m1:
        m.location.x = -0.45
        m.rotation_euler.z = -0.25

    m2, _ = import_and_normalize(p_crate, "WoodenCrate", 0.58, by_height=True, max_tris=1400)
    for m in m2:
        m.location.x = 0.55
        m.rotation_euler.z = 0.35

    export_glb("prop_bazaar_crates.glb")


def fetch_courtyard_pbr():
    """Karvansaray həyəti və daş divarları üçün real Poly Haven CC0 PBR teksturaları."""
    print("Downloading CC0 PBR textures...")
    fetch_ph_pbr_texture("cobblestone_floor_08", os.path.join(PUBLIC_PBR, "cobblestone"), "1k")
    fetch_ph_pbr_texture("coral_stone_wall", os.path.join(PUBLIC_PBR, "stone_wall"), "1k")
    fetch_ph_pbr_texture("clay_plaster", os.path.join(PUBLIC_PBR, "plaster"), "1k")


if __name__ == "__main__":
    fetch_courtyard_pbr()
    build_fruit_baskets()
    build_copper_jugs()
    build_bazaar_crates()
    print("ALL FREE POLY HAVEN CC0 ASSETS READY!")
