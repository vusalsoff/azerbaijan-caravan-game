# 3 Antigravity Mühiti Üçün İş Bölgüsü və GitHub Sinxronizasiyası (Deadline: 06:00)

Bu fayl layihənin 3 ayrı Antigravity mühitində eyni anda, bir-birinə mane olmadan işləməsi üçün hazırlanmışdır.

---

## 1. Rolların Bölgüsü (Antigravity #1, #2, #3)

| Mühit | Məsuliyyət Sahəsi | Git Branch | İşlədiyi Qovluqlar |
| :--- | :--- | :--- | :--- |
| **Antigravity #1 (BU KOMPYUTER)** | **Daxili Struktur, Modul Qoşma və Core Sistemlər:**<br>• Layihə arxitekturası və Data (`cities.json`, `quests.json`)<br>• `Merchant`, `Guard`, `Thief` AI və hərəkət skriptləri<br>• `TradeAndQuestManager` və `GameManager` | `main` / `feat/core-modules` | `Scripts/`, `Data/` |
| **Antigravity #2 (DİGƏR PC)** | **Xəritə (2D → 3D) və 2D Story Mode:**<br>• 2D heightmap-dən 3D Azərbaycan xəritəsi (`World_Azerbaijan`)<br>• `City_Baku`, `City_Sheki`, `City_Shusha` zonaları və karvan yolları<br>• 2D Story giriş səhnəsi (`Story_Intro`) | `feat/map-and-story` | `Scenes/` |
| **Antigravity #3 (DİGƏR PC)** | **3D Modellər (Blender/Asset), UI və Səs:**<br>• Tacir, Qoruyucu, Oğru, Padşah və 3 şəhərin dövr binaları (`.fbx`/`.glb`)<br>• `HUDPanel`, `MarketPanel`, `QuestPopupPanel`<br>• Bölgə musiqiləri və səs effektləri | `feat/3d-ui-audio` | `Art/`, `Prefabs/`, `UI/`, `Audio/` |

---

## 2. Digər İki Antigravity Mühitinə Yapışdırılacaq Hazır Promptlar

> **Qeyd:** Digər kompüterlərdə GitHub repoyu `clone` etdikdən sonra Antigravity-ni açın və aşağıdakı uyğun promptu yapışdırın.

### Antigravity #2 (Xəritə & 2D Story) Üçün Prompt:
> `LAYIHE_MEQZI.md` və `IS_BOLGUSU_VE_PROMPTLAR.md` fayllarını oxu. Mən **Antigravity #2 (Xəritə və 2D Story)** mühitiyəm və `Scenes/` qovluğunda işləyirəm (`Scripts/` və `Data/` fayllarına toxunmuram).
> Mənə:
> 1. `Scenes/World_Azerbaijan` səhnəsi üçün Blender-də sıfırdan modelləşdirmədən 2D heightmap/xəritədən avtomatik 3D Azərbaycan relyefi yaratmağı qur. Üstündə `City_Baku`, `City_Sheki`, `City_Shusha` trigger zonalarını və aralarında karvan yollarını yerləşdir.
> 2. `Scenes/Story_Intro` səhnəsində 3–4 slayddan ibarət 2D Story girişi hazırla; sonuncu slayddakı "Səyahətə Başla" düyməsi `Scenes/World_Azerbaijan` səhnəsini açsın.

### Antigravity #3 (3D Modellər, UI və Səs) Üçün Prompt:
> `LAYIHE_MEQZI.md`, `Data/cities.json`, `Data/quests.json` və `IS_BOLGUSU_VE_PROMPTLAR.md` fayllarını oxu. Mən **Antigravity #3 (3D Modellər, UI və Səs)** mühitiyəm və yalnız `Art/`, `Prefabs/`, `UI/`, `Audio/` qovluqlarında işləyirəm.
> Mənə:
> 1. `Art/` və `Prefabs/` üçün: `Merchant`, `Guard`, `Thief`, `PadishahNPC` və 3 şəhərin dövrünü əks etdirən sadə, oyun üçün optimallaşdırılmış 3D modellər/prefab-lar (`.glb`/`.fbx` və ya hazır asset uyğunlaşdırması) hazırla.
> 2. `UI/` üçün: `HUDPanel`, `MarketPanel` (`cities.json` sahələrinə uyğun) və `QuestPopupPanel` (`quests.json` sahələrinə uyğun) hazırla.
> 3. `Audio/` üçün: `cities.json`-dakı `audio_baku_shirvan`, `audio_sheki_silk`, `audio_shusha_mugham` adlarına uyğun fon musiqilərini yerləşdir.

---

## 3. Saatlıq Plan və Birləşdirmə (02:00 – 06:00)
- **17:00 – 02:00:** Hər 3 Antigravity öz qovluğunda paralel işləyir və saatda bir dəfə GitHub-a `commit + push` edir.
- **02:00 – 04:30:** Hamı `main` branch-ə merge edir. **Antigravity #1 (Bu kompyuter)** `Scenes/World_Azerbaijan` səhnəsində `Scripts/` + `Data/` + `Art/` + `UI/` hissələrini birləşdirir.
- **04:30 – 06:00:** Başdan-sona test və Demo Build.
