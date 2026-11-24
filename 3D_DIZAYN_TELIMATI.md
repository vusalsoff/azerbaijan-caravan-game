# 3D Dizayn və Model Təlimatı — İRS: Tacirin Yolu

Bu sənəd **3D dizayner / 3D Asset hazırlayan komanda üzvü** üçündür.  
Layihənin ümumi məğzi üçün `LAYIHE_MEQZI.md` faylına baxın.

---

## 1. Vizual İstiqamət ("İRS — Tacirin Yolu")
- **Üslub:** Tarixi Azərbaycan Karvansarayı və Böyük İpək Yolu atmosferi (isti günəş işığı, yonulmuş qumdaşı tağlar, naxışlı Azərbaycan xalçaları, mis səhənglər, ipək parçalar, papaq və milli naxışlı geyimlər).
- **Əsas prinsip:** Detallı görünüşü ağır poliqonla yox, **yaxşı PBR teksturalarla (`BaseColor`, `Roughness`, `Normal`)** verin ki, brauzerdə (Three.js) hamar 60 FPS işləsin.

---

## 2. Məcburi Eksport Qaydaları (Three.js Uyğunluğu)
- **Format:** Yalnız **`.glb`** (glTF Binary — teksturalar faylın içinə gömülü). `.blend` və `.obj` göndərməyin.
- **Ölçü & Pivot:**
  - Modelin **alt hissəsi `Y = 0`** (yer səthi), mərkəzi `X = 0, Z = 0` olsun.
  - Ön tərəf (üzü) **`+Z`** istiqamətinə baxsın.
  - Blender eksport zamanı **`+Y Up`** aktiv olsun (defolt).
- **Performans Limitləri:**
  - Kiçik bazar detalları (`prop_*.glb`): **< 5,000 üçbucaq**, `< 2 MB`
  - Personajlar & Karvan: **< 12,000 üçbucaq**, `< 4 MB`
  - Şəhər / Karvansaray binaları: **< 20,000 üçbucaq**, `< 5 MB`
  - Teksturalar: `1024×1024` (maks. `2048×2048`, JPG/WebP sıxılma).

---

## 3. Faylların Yerləşməsi və Dəqiq Adları

Hazırladığınız hər `.glb` faylını həm **`Art/`**, həm də **`public/models/`** qovluğuna eyni adla yerləşdirin *(mövcud ilkin modelləri yenisi ilə əvəz edin — kod avtomatik yükləyir!)*:

### 1-ci Növbə — Xəritə və Əsas Obyektlər
| Fayl adı (`public/models/...`) | Təsvir |
| :--- | :--- |
| `merchant_caravan.glb` | Detallı tacir arabası (xalça yüklü, atlı/dəvəli karvan) |
| `city_baku.glb` | Bakı — Qız Qalası & Şirvanşahlar günbəzi |
| `city_sheki.glb` | Şəki — Yuxarı Karvansaray & rəngli şəbəkə pəncərələri |
| `city_shusha.glb` | Şuşa — Qala divarları, bürclər & məscid günbəzi |

### 2-ci Növbə — Personajlar
| Fayl adı | Təsvir |
| :--- | :--- |
| `guard.glb` | Qoruyucu (papaq/dəbilqə, nizə, qalxan) |
| `thief.glb` | Quldur / yol kəsən |
| `npc_padishah.glb` | Padşah / Xan / Karvansaray Taciri NPC |

### 3-cü Növbə — Bazar və Karvansaray Detalları ("İRS" Konsepti)
| Fayl adı | Təsvir |
| :--- | :--- |
| `prop_carpet_stall.glb` | Naxışlı Azərbaycan xalçaları sərilmiş bazar tezgahı |
| `prop_copper_jugs.glb` | Naxışlı mis səhənglər və qab-qacaq dəsti |
| `prop_fruit_baskets.glb` | Alma və armud dolu hörülmüş səbətlər |
| `prop_caravanserai_arch.glb` | Daş karvansaray tağı və parça kölgəlik |

---

## 4. İş Qaydası (Konfliktsiz)
- Yalnız **`Art/`** və **`public/models/`** qovluqlarında işləyin.
- `Scripts/`, `Scenes/`, `UI/`, `Data/` fayllarına toxunmayın.
- Hər 1–2 model hazır olduqca ayrıca `commit + push` edin (məs: `feat(3d): add detailed carpet stall glb`) ki, əsas komanda dərhal xəritədə sınaya bilsin!
