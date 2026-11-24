"""
Art/generate_models.py
Blender 5.0 Python script to procedurally generate optimized low-poly .glb 3D assets
for Azerbaijan Caravan Game and export them to both public/models/ and Art/.

Run:
  "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python Art/generate_models.py
"""

import math
import os
import bpy


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
PUBLIC_MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "models")
ART_MODELS_DIR = SCRIPT_DIR


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mat(name, rgba, roughness=0.72, metallic=0.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission is not None and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def add_box(name, size, loc, mat, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    assign_mat(obj, mat)
    return obj


def add_cyl(name, radius, depth, loc, mat, vertices=12, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_mat(obj, mat)
    return obj


def add_cone(name, r1, r2, depth, loc, mat, vertices=12, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_mat(obj, mat)
    return obj


def add_sphere(name, radius, loc, mat, segs=12, rings=8, scale=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segs, ring_count=rings, radius=radius, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    assign_mat(obj, mat)
    return obj


def export_glb(filename):
    os.makedirs(PUBLIC_MODELS_DIR, exist_ok=True)
    os.makedirs(ART_MODELS_DIR, exist_ok=True)

    for folder in (PUBLIC_MODELS_DIR, ART_MODELS_DIR):
        out_path = os.path.join(folder, filename)
        bpy.ops.export_scene.gltf(
            filepath=out_path,
            export_format="GLB",
            export_yup=True,
            export_apply=True,
            export_materials="EXPORT",
        )
        print(f"Exported: {out_path}")


def build_merchant_caravan():
    reset_scene()
    wood_dark = make_mat("WoodDark", (0.28, 0.15, 0.07, 1.0), roughness=0.82)
    wood_trim = make_mat("WoodTrim", (0.45, 0.26, 0.12, 1.0), roughness=0.75)
    cloth_gold = make_mat("ClothGold", (0.88, 0.70, 0.24, 1.0), roughness=0.65)
    carpet_red = make_mat("CarpetRed", (0.62, 0.14, 0.14, 1.0), roughness=0.78)
    emerald = make_mat("EmeraldSilk", (0.11, 0.48, 0.38, 1.0), roughness=0.55)
    brass = make_mat("Brass", (0.85, 0.68, 0.25, 1.0), roughness=0.35, metallic=0.85)
    skin = make_mat("Skin", (0.82, 0.64, 0.49, 1.0), roughness=0.68)

    # Cart bed & side rails (Y is forward/back in Blender before glTF Y-up)
    add_box("CartBed", (1.65, 2.75, 0.25), (0.0, 0.0, 0.62), wood_dark)
    add_box("SideLeft", (0.12, 2.65, 0.55), (-0.78, 0.0, 1.0), wood_trim)
    add_box("SideRight", (0.12, 2.65, 0.55), (0.78, 0.0, 1.0), wood_trim)
    add_box("BackBoard", (1.65, 0.12, 0.55), (0.0, -1.32, 1.0), wood_trim)

    # 4 spoked-style wheels
    for wx in (-0.92, 0.92):
        for wy in (-0.85, 0.85):
            add_cyl("Wheel", 0.48, 0.14, (wx, wy, 0.48), wood_dark, vertices=14, rot=(0.0, math.pi / 2, 0.0))
            add_cyl("WheelHub", 0.14, 0.18, (wx, wy, 0.48), brass, vertices=10, rot=(0.0, math.pi / 2, 0.0))

    # Arched canopy
    add_cyl("Canopy", 0.86, 2.35, (0.0, -0.1, 1.38), cloth_gold, vertices=12, rot=(math.pi / 2, 0.0, 0.0))
    add_box("CanopyTrim", (1.76, 2.40, 0.12), (0.0, -0.1, 1.35), carpet_red)

    # Silk & carpet cargo bundles on cart
    add_cyl("CarpetRoll", 0.22, 1.1, (-0.35, -0.5, 0.96), carpet_red, vertices=10, rot=(math.pi / 2, 0.0, 0.15))
    add_box("SilkCrate", (0.55, 0.55, 0.45), (0.35, 0.45, 0.96), emerald)
    add_box("GoldChest", (0.45, 0.38, 0.32), (0.0, 1.0, 0.9), brass)

    # Merchant driver sitting at front
    add_cyl("MerchantBody", 0.25, 0.72, (0.0, 1.05, 1.15), emerald, vertices=10)
    add_sphere("MerchantHead", 0.20, (0.0, 1.05, 1.68), skin)
    add_cyl("MerchantPapakh", 0.22, 0.24, (0.0, 1.05, 1.88), wood_dark, vertices=10)

    # Front harness shafts
    add_box("ShaftL", (0.08, 1.1, 0.08), (-0.42, 1.85, 0.65), wood_trim)
    add_box("ShaftR", (0.08, 1.1, 0.08), (0.42, 1.85, 0.65), wood_trim)

    export_glb("merchant_caravan.glb")


def build_character_unit(filename, robe_rgba, trim_rgba, hat_type="papakh", has_shield=False, has_dagger=False):
    reset_scene()
    robe = make_mat("Robe", robe_rgba, roughness=0.72)
    trim = make_mat("Trim", trim_rgba, roughness=0.45, metallic=0.3)
    skin = make_mat("Skin", (0.82, 0.64, 0.49, 1.0), roughness=0.68)
    boots = make_mat("Boots", (0.16, 0.11, 0.08, 1.0), roughness=0.8)
    metal = make_mat("Metal", (0.78, 0.82, 0.86, 1.0), roughness=0.28, metallic=0.88)

    # Boots
    add_cyl("BootL", 0.13, 0.42, (-0.17, 0.0, 0.21), boots, vertices=10)
    add_cyl("BootR", 0.13, 0.42, (0.17, 0.0, 0.21), boots, vertices=10)

    # Robe / Tunic
    add_cone("Tunic", 0.42, 0.28, 1.05, (0.0, 0.0, 0.92), robe, vertices=12)
    add_cyl("Sash", 0.34, 0.16, (0.0, 0.0, 0.98), trim, vertices=12)

    # Shoulders & Arms
    add_box("Shoulders", (0.84, 0.34, 0.22), (0.0, 0.0, 1.38), robe)
    add_cyl("ArmL", 0.10, 0.58, (-0.46, 0.08, 1.12), robe, vertices=8, rot=(0.25, 0.0, 0.15))
    add_cyl("ArmR", 0.10, 0.58, (0.46, 0.08, 1.12), robe, vertices=8, rot=(0.25, 0.0, -0.15))

    # Head
    add_sphere("Head", 0.23, (0.0, 0.0, 1.72), skin)

    if hat_type == "helmet":
        add_sphere("Helmet", 0.25, (0.0, 0.0, 1.80), metal, scale=(1.0, 1.0, 0.9))
        add_cone("HelmSpire", 0.06, 0.01, 0.24, (0.0, 0.0, 2.08), trim, vertices=8)
    elif hat_type == "hood":
        add_cone("Hood", 0.29, 0.06, 0.42, (0.0, -0.04, 1.88), robe, vertices=10, rot=(-0.18, 0.0, 0.0))
    elif hat_type == "crown":
        add_cyl("Turban", 0.28, 0.24, (0.0, 0.0, 1.92), trim, vertices=14)
        add_cone("CrownTip", 0.12, 0.02, 0.22, (0.0, 0.0, 2.12), trim, vertices=10)
    else:
        add_cyl("Papakh", 0.25, 0.28, (0.0, 0.0, 1.94), boots, vertices=12)

    if has_shield:
        add_cyl("Shield", 0.36, 0.07, (-0.54, 0.22, 1.10), metal, vertices=12, rot=(math.pi / 2, 0.0, 0.4))
        add_cyl("ShieldBoss", 0.12, 0.10, (-0.58, 0.25, 1.10), trim, vertices=10, rot=(math.pi / 2, 0.0, 0.4))
        add_cyl("SpearShaft", 0.035, 1.95, (0.55, 0.15, 1.15), boots, vertices=8)
        add_cone("SpearTip", 0.07, 0.005, 0.28, (0.55, 0.15, 2.24), metal, vertices=6)

    if has_dagger:
        add_cone("Dagger", 0.05, 0.005, 0.46, (0.50, 0.25, 1.02), metal, vertices=6, rot=(1.1, 0.0, -0.2))

    export_glb(filename)


def build_city_baku():
    reset_scene()
    limestone = make_mat("BakuLimestone", (0.80, 0.72, 0.56, 1.0), roughness=0.82)
    limestone_dark = make_mat("BakuStoneDark", (0.64, 0.56, 0.42, 1.0), roughness=0.86)
    gold = make_mat("BakuGold", (0.90, 0.72, 0.28, 1.0), roughness=0.35, metallic=0.8)
    turquoise = make_mat("BakuTurquoise", (0.14, 0.62, 0.64, 1.0), roughness=0.4)

    # Courtyard base
    add_cyl("BasePlatform", 3.1, 0.35, (0.0, 0.0, 0.175), limestone_dark, vertices=16)

    # Qız Qalası (Maiden Tower) — cylindrical tower + buttress fin
    add_cyl("MaidenTower", 1.15, 3.8, (-0.85, 0.35, 2.1), limestone, vertices=18)
    add_box("MaidenButtress", (0.65, 1.35, 3.55), (-0.85, -0.65, 1.95), limestone_dark)
    add_cyl("MaidenCrown", 1.24, 0.35, (-0.85, 0.35, 4.05), limestone_dark, vertices=18)
    add_cyl("MaidenGoldBand", 1.20, 0.12, (-0.85, 0.35, 3.75), gold, vertices=18)

    # Şirvanşahlar Sarayı (Palace + ribbed dome)
    add_box("PalaceHall", (2.2, 1.85, 1.65), (1.1, -0.35, 1.15), limestone)
    add_box("PalacePortal", (0.95, 0.4, 2.1), (1.1, -1.35, 1.35), limestone_dark)
    add_cyl("DomeDrum", 0.62, 0.55, (1.1, -0.35, 2.2), limestone, vertices=14)
    add_cone("PalaceDome", 0.68, 0.05, 0.95, (1.1, -0.35, 2.95), turquoise, vertices=14)
    add_cone("DomeFinial", 0.08, 0.01, 0.35, (1.1, -0.35, 3.55), gold, vertices=8)

    # Fortress outer wall segment
    add_box("WallFrontL", (1.6, 0.35, 1.1), (-1.75, -1.85, 0.75), limestone_dark)
    add_box("WallFrontR", (1.6, 0.35, 1.1), (1.75, -1.85, 0.75), limestone_dark)

    export_glb("city_baku.glb")


def build_city_sheki():
    reset_scene()
    brick = make_mat("ShekiBrick", (0.76, 0.53, 0.38, 1.0), roughness=0.80)
    wood = make_mat("ShekiWood", (0.34, 0.19, 0.09, 1.0), roughness=0.75)
    roof_tile = make_mat("ShekiRoof", (0.58, 0.24, 0.15, 1.0), roughness=0.68)
    shebeke_ruby = make_mat("ShebekeRuby", (0.82, 0.18, 0.24, 1.0), roughness=0.2, emission=(0.82, 0.18, 0.24, 1.0), emission_strength=0.45)
    shebeke_emerald = make_mat("ShebekeEmerald", (0.14, 0.72, 0.48, 1.0), roughness=0.2, emission=(0.14, 0.72, 0.48, 1.0), emission_strength=0.45)
    shebeke_amber = make_mat("ShebekeAmber", (0.94, 0.72, 0.20, 1.0), roughness=0.2, emission=(0.94, 0.72, 0.20, 1.0), emission_strength=0.45)

    # Stone/Brick plinth
    add_box("KarvansarayBase", (5.2, 4.2, 0.35), (0.0, 0.0, 0.175), brick)

    # Main Karvansaray / Khan Palace Hall
    add_box("MainHall", (4.2, 2.2, 2.2), (0.0, 0.45, 1.45), brick)
    add_box("RoofMain", (4.6, 2.6, 0.45), (0.0, 0.45, 2.75), roof_tile)
    add_cone("RoofRidge", 1.8, 0.1, 0.75, (0.0, 0.45, 3.30), roof_tile, vertices=4, rot=(0.0, 0.0, math.pi / 4))

    # Side Karvansaray wings
    add_box("WingL", (1.1, 1.9, 1.7), (-1.75, -1.0, 1.2), brick)
    add_box("WingR", (1.1, 1.9, 1.7), (1.75, -1.0, 1.2), brick)

    # Şəbəkə stained-glass lattice facade panels
    for idx, sx in enumerate((-1.2, 0.0, 1.2)):
        glass_mat = (shebeke_ruby, shebeke_amber, shebeke_emerald)[idx]
        add_box(f"ShebekeFrame_{idx}", (0.85, 0.12, 1.35), (sx, -0.68, 1.65), wood)
        add_box(f"ShebekeGlass_{idx}", (0.68, 0.15, 1.15), (sx, -0.70, 1.65), glass_mat)

    export_glb("city_sheki.glb")


def build_city_shusha():
    reset_scene()
    stone = make_mat("ShushaStone", (0.72, 0.67, 0.60, 1.0), roughness=0.84)
    stone_dark = make_mat("ShushaStoneDark", (0.54, 0.50, 0.45, 1.0), roughness=0.88)
    amethyst = make_mat("ShushaDome", (0.52, 0.36, 0.74, 1.0), roughness=0.38)
    gold = make_mat("ShushaGold", (0.90, 0.72, 0.28, 1.0), roughness=0.35, metallic=0.82)

    # Plateau base
    add_cyl("PlateauBase", 3.3, 0.4, (0.0, 0.0, 0.2), stone_dark, vertices=16)

    # Şuşa Qalası front fortress wall & twin bastions
    add_box("FortressWall", (4.4, 0.65, 1.95), (0.0, 1.55, 1.3), stone)
    for sx in (-2.15, 2.15):
        add_cyl(f"Bastion_{sx}", 0.75, 2.75, (sx, 1.55, 1.7), stone_dark, vertices=12)
        add_cyl(f"BastionCap_{sx}", 0.82, 0.22, (sx, 1.55, 3.1), stone, vertices=12)

    # Gövhər Ağa Mosque silhouette
    add_box("MosqueBody", (2.6, 2.2, 1.85), (0.0, -0.65, 1.25), stone)
    add_cyl("MosqueDrum", 0.82, 0.45, (0.0, -0.65, 2.38), stone_dark, vertices=16)
    add_sphere("MosqueDome", 0.88, (0.0, -0.65, 2.65), amethyst, segs=16, rings=10)
    add_cone("MosqueFinial", 0.09, 0.01, 0.42, (0.0, -0.65, 3.65), gold, vertices=8)

    # Twin minarets
    for mx in (-1.45, 1.45):
        add_cyl(f"Minaret_{mx}", 0.24, 3.25, (mx, -0.65, 1.95), stone_dark, vertices=12)
        add_cyl(f"MinaretBalcony_{mx}", 0.33, 0.16, (mx, -0.65, 3.25), gold, vertices=12)
        add_cone(f"MinaretSpire_{mx}", 0.25, 0.02, 0.75, (mx, -0.65, 3.85), amethyst, vertices=12)

    export_glb("city_shusha.glb")


def main():
    build_merchant_caravan()
    build_character_unit("guard.glb", (0.14, 0.46, 0.68, 1.0), (0.85, 0.68, 0.24, 1.0), hat_type="helmet", has_shield=True)
    build_character_unit("thief.glb", (0.68, 0.16, 0.16, 1.0), (0.16, 0.16, 0.18, 1.0), hat_type="hood", has_dagger=True)
    build_character_unit("npc_padishah.glb", (0.45, 0.18, 0.62, 1.0), (0.92, 0.74, 0.26, 1.0), hat_type="crown")
    build_city_baku()
    build_city_sheki()
    build_city_shusha()
    print("All 7 .glb models generated successfully!")


if __name__ == "__main__":
    main()
