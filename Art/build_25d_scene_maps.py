"""
Art/build_25d_scene_maps.py
Offline DLSS / 2.5D Neural Depth-Parallax Pipeline:
Verilmiş göz səviyyəli fotorealistik tarixi məkan təsvirindən (`bazaar_<city>_25d.png`)
avtomatik olaraq 3 əlavə 3D shader xəritəsi yaradır:
  1) *_depth.png  — Memarlıq perspektivi (yer müstəvisi + yan tağlar + uzaq qapı/səma) + reliyef dərinliyi
  2) *_normal.png — Sobel tangent-space normal xəritəsi (canlı 3D fənər və günəş işıqlarının daş fakturasına düşməsi üçün)
  3) *_glow.png   — İsti fənər və günəş parıltısı maskası (dinamik titrəyən atəş/fənər nəfəsi üçün)

İstifadə (Blender-in daxili Python-u ilə — əlavə paket tələb etmir):
  "C:\Program Files\Blender Foundation\Blender 5.0\5.0\python\bin\python.exe" Art/build_25d_scene_maps.py public/images/bazaar_baku_25d.png
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter


def build_maps(src_path: str, horizon_y: float = 0.45):
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Mənbə şəkil tapılmadı: {src_path}")

    base, _ = os.path.splitext(src_path)
    img = Image.open(src_path).convert("RGB")
    w, h = img.size

    # Shader map-lər üçün optimal HD ölçü (həm sürətli yükləmə, həm kəskin detal)
    target_w = min(w, 1280)
    target_h = int(round(h * (target_w / w)))
    work = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    arr = np.asarray(work, dtype=np.float32) / 255.0

    # Luminance (parlaqlıq)
    luma = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]

    # 1. NORMAL MAP (Sobel gradientləri — canlı 3D məşəl işığı daş/xalça qabarıqlığını tutsun)
    luma_soft = np.asarray(
        Image.fromarray((np.clip(luma, 0, 1) * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(radius=0.8)
        ),
        dtype=np.float32,
    ) / 255.0

    gx = np.zeros_like(luma_soft)
    gy = np.zeros_like(luma_soft)
    gx[:, 1:-1] = (luma_soft[:, 2:] - luma_soft[:, :-2]) * 2.6
    gy[1:-1, :] = (luma_soft[2:, :] - luma_soft[:-2, :]) * 2.6

    nx = -gx
    ny = -gy
    nz = np.ones_like(luma_soft) * 0.85
    norm_len = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
    nx /= norm_len
    ny /= norm_len
    nz /= norm_len

    normal_rgb = np.stack(
        [
            np.clip((nx * 0.5 + 0.5) * 255.0, 0, 255),
            np.clip((ny * 0.5 + 0.5) * 255.0, 0, 255),
            np.clip((nz * 0.5 + 0.5) * 255.0, 0, 255),
        ],
        axis=-1,
    ).astype(np.uint8)
    normal_path = f"{base}_normal.png"
    Image.fromarray(normal_rgb, mode="RGB").save(normal_path, optimize=True)

    # 2. 3D PERSPECTIVE DEPTH MAP (1.0 = kameraya ən yaxın ön plan, 0.0 = ən uzaq səma/qüllə)
    yy, xx = np.mgrid[0:target_h, 0:target_w].astype(np.float32)
    u = xx / max(1, target_w - 1)  # 0..1
    v = yy / max(1, target_h - 1)  # 0..1 (top..bottom)

    # Mərkəzdən yan divarlara doğru uzaqlıq (sol və sağ tağ qalereyaları kameraya yaxınlaşır!)
    side_factor = np.clip(np.abs(u - 0.5) * 2.0, 0.0, 1.0)
    side_wall_depth = np.power(side_factor, 1.45) * 0.78

    # Yer müstəvisi (horizon_y-dən aşağıda kamera önünə doğru xətti perspektiv yaxınlaşması)
    ground_t = np.clip((v - horizon_y) / max(0.05, 1.0 - horizon_y), 0.0, 1.0)
    ground_depth = np.power(ground_t, 0.92) * 0.95

    # Yuxarı tağ/tavan yaxınlığı (kənarlarda yuxarı hissə ön sütun/tağdır, mərkəzdə açıq səmadır!)
    sky_mask = np.clip((horizon_y + 0.08 - v) / (horizon_y + 0.08), 0.0, 1.0)
    arch_top_depth = np.power(side_factor, 1.6) * 0.72 + (1.0 - sky_mask) * 0.12

    # Mərkəzi açıq səma / uzaq qüllə dərinliyini sıfıra yaxın saxla
    center_sky_open = np.exp(-(((u - 0.5) / 0.24) ** 2)) * np.clip((horizon_y - v) / horizon_y, 0.0, 1.0)

    # Birləşdirilmiş həndəsi dərinlik sahəsi
    geom_depth = np.maximum(ground_depth, np.where(v >= horizon_y, side_wall_depth * 0.9, arch_top_depth))
    geom_depth = np.clip(geom_depth - center_sky_open * 0.65, 0.02, 1.0)

    # Mikro-relyef detalları (tünd kölgəli oyuqlar bir az dərində, işıqlı daş kənarları bir az öndə)
    detail_img = Image.fromarray((np.clip(luma, 0, 1) * 255).astype(np.uint8))
    blur_luma = np.asarray(detail_img.filter(ImageFilter.GaussianBlur(radius=9)), dtype=np.float32) / 255.0
    local_relief = np.clip((luma - blur_luma) * 0.18, -0.07, 0.07)

    depth = np.clip(geom_depth + local_relief, 0.0, 1.0)
    # Təmiz parallaks üçün dərinlik xəritəsini yüngül hamarla (kəskin piksel qırılması olmasın)
    depth_img = Image.fromarray((depth * 255.0).astype(np.uint8), mode="L").filter(
        ImageFilter.GaussianBlur(radius=4.5)
    )
    depth_path = f"{base}_depth.png"
    depth_img.save(depth_path, optimize=True)

    # 3. EMISSIVE LANTERN & WARM LIGHT GLOW MASK
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    warmness = np.clip((r - b) * 1.45, 0.0, 1.0)
    bright = np.clip((luma - 0.62) / 0.38, 0.0, 1.0)
    # Səma çox parlamasın, əsasən yan tağlardakı isti fənərlər və məşəllər parlasın
    lantern_zone = np.where((v > 0.12) & (v < 0.78), 1.0, 0.25)
    glow = np.clip(bright * warmness * lantern_zone * 1.8, 0.0, 1.0)

    glow_img = Image.fromarray((glow * 255.0).astype(np.uint8), mode="L").filter(
        ImageFilter.GaussianBlur(radius=3.0)
    )
    glow_path = f"{base}_glow.png"
    glow_img.save(glow_path, optimize=True)

    print(f"OK: {depth_path} ({depth_img.size})")
    print(f"OK: {normal_path} ({target_w}x{target_h})")
    print(f"OK: {glow_path} ({glow_img.size})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("İstifadə: python build_25d_scene_maps.py <image_path> [horizon_y]")
        sys.exit(1)
    hy = float(sys.argv[2]) if len(sys.argv) >= 3 else 0.45
    build_maps(sys.argv[1], hy)
