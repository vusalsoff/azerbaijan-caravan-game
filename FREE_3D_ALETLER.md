# Pulsuz və Limitsiz 3D Alətlər Bələdçisi (Blender 5.0 + CC0 Kitabxanalar)

Bu kompüterdə heç bir ödənişli API və ya kredit limiti **olmadan** yüksək keyfiyyətli 3D modellər və foto-real teksturalar yaratmaq üçün bütün əsas pulsuz alətlər quraşdırılıb və aktivləşdirilib.

---

## 1. Blender 5.0 Daxilində Quraşdırılan Pulsuz Eklentilər
Blender 5.0-da **Online Access** aktiv edilib və rəsmi `extensions.blender.org` reposundan aşağıdakı pulsuz eklentilər quraşdırılıb:

| Eklenti | Nə işə yarayır? | Haradan açılır? |
| :--- | :--- | :--- |
| **MPFB (`mpfb`)** | Real anatomik insan modelləri (Bazar Taciri, Qoruyucu, Bağban, Quldur), göz/saç və tam skelet yaradır. | `N` paneli → **MPFB** tabı |
| **Archimesh** & **Arch Generator** | Tağlı karvansaray divarları, sütunlar, qapılar və tarixi memarlıq elementləri yaradır. | `N` paneli → **Create** / `Shift+A → Mesh` |
| **ClothDrop Reborn** | Xalça, parça örtüklər və çadırların masa/tezgah üzərinə real fizikayla düşməsini edir. | `N` paneli → **ClothDrop** |
| **Bagapie** | Daş, ağac, sarmaşıq və bazar əşyalarını təbii şəkildə səpmək və memarlıq düzəltmək üçün. | `J` düyməsi / `N` paneli |
| **Rigify** *(daxili)* | İstənilən personaja peşəkar oyun skeleti (`Armature`) bağlayır. | `Shift+A → Armature → Human (Meta-Rig)` |
| **Pillow (`PIL`)** *(Blender Python)* | Tekstura yaratmaq və ölçüsünü kiçiltmək üçün Blender Python-a əlavə edilib. | Skriptlərdə `from PIL import Image` |

---

## 2. Limitsiz Pulsuz CC0 Fotoskan 3D və PBR Kitabxanası (`Poly Haven`)
[Art/fetch_polyhaven.py](Art/fetch_polyhaven.py) skripti heç bir API açarı və ya limit olmadan birbaşa **Poly Haven CC0** bazasından real fotoskan olunmuş 3D əşyaları və PBR teksturaları yükləyir, ölçüləndirir, optimallaşdırır və `.glb` kimi `public/models/` qovluğuna çıxarır:

```powershell
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python Art/fetch_polyhaven.py
```

Hazırda bu pulsuz pipeline ilə çıxarılan real CC0 assetlər:
- `public/models/prop_fruit_baskets.glb` — Hörmə səbətlər + real fotoskan alma, armud və nar
- `public/models/prop_copper_jugs.glb` — Antik mis/bürünc vazalar, qazan və saxsı səhənglər
- `public/models/prop_bazaar_crates.glb` — Antik taxta xəzinə sandığı və bazar yük yeşiyi
- `public/textures/pbr/` — Daş döşəmə (`cobblestone_floor_08`), karvansaray daş divarı (`coral_stone_wall`) və gil suvaq (`clay_plaster`) PBR teksturaları

---

## 3. Əlavə Pulsuz Mənbələr (Brauzerdən $0)
- **Mixamo (`mixamo.com`):** Pulsuz Adobe hesabı ilə hazır insan animasiyaları (yeriş, söhbət, qılınc/qalxan duruşu `.fbx` → Blender → `.glb`).
- **AmbientCG (`ambientcg.com`):** 100% pulsuz CC0 PBR materiallar (xalça, dəri, taxta, daş, mis).
- **Poly Haven (`polyhaven.com`):** İstənilən yeni əşyanın adını (məs: `WoodenTable_01`, `brass_diya_lantern`, `treasure_chest`) [Art/fetch_polyhaven.py](Art/fetch_polyhaven.py)-yə əlavə edib 1 əmrlə `.glb` çıxara bilərsiniz.
