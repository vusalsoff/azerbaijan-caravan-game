# 3 Antigravity Mühiti Üçün İş Bölgüsü və Hazır Promptlar (Three.js + Vite + Blender)

Bu fayl layihənin 2 və ya 3 ayrı Antigravity söhbətində/kompüterində eyni anda, **bir-birinin fayllarına toxunmadan (0 konflikt)** işləməsi üçün hazırlanıb.

**Layihə qovluğu (bu PC):** `C:\Users\user\.gemini\antigravity\scratch\azerbaijan-caravan-game`

---

## 1. Rolların və Qovluqların Qəti Bölgüsü

| Mühit | Məsuliyyət Sahəsi | Toxunduğu Qovluqlar (Yalnız Bura!) |
| :--- | :--- | :--- |
| **Antigravity #1 (Əsas Söhbət)** | **Bünövrə, Core Sistemlər, Data & AI:**<br>• `package.json`, `vite.config.js`, `index.html`, `src/main.js`<br>• `Data/` (`cities.json`, `quests.json`, `events.json`, `npcs.json`)<br>• `Scripts/` (`EventBus`, `DataLoader`, `GameManager`, `TradeAndQuestManager`, `HistoricalEventManager`, `Merchant`, `Guard`, `Thief`) | `Data/`, `Scripts/`, `src/`, kök konfiqurasiya faylları |
| **Antigravity #2 (2-ci Söhbət)** | **2D Story Mode + 2D→3D Azərbaycan Xəritəsi:**<br>• `Scenes/Story_Intro.js` — 4 slaydlı 2D Story girişi (Azərbaycanın tarixi dövrləri + "Səyahətə Başla")<br>• `Scenes/World_Azerbaijan.js` — 2D heightmap-dən avtomatik 3D Azərbaycan relyefi, Xəzər dənizi, Böyük/Kiçik Qafqaz, karvan yolları, `City_Baku`, `City_Sheki`, `City_Shusha` zonaları və 2D Tarixi Xəritə görünüşü | `Scenes/` |
| **Antigravity #3 (3-cü Söhbət / PC)** | **Blender `.glb` 3D Modellər, UI Panelləri və Audio:**<br>• `Art/` & `Prefabs/` — Blender 5.0 skripti ilə `.glb` 3D modellər (`Merchant`, `Guard`, `Thief`, `PadishahNPC`, 3 şəhərin abidələri) və `Prefabs/ModelLoader.js`<br>• `UI/` — `HUDPanel`, `MarketPanel`, `QuestPopupPanel`, `EventPopupPanel`, `MapChroniclePanel` (`UI/UIManager.js`, `UI/ui.css`)<br>• `Audio/` — `audio_baku_shirvan`, `audio_sheki_silk`, `audio_shusha_mugham` + səs effektləri (`Audio/AudioManager.js`) | `Art/`, `Prefabs/`, `UI/`, `Audio/` |

---

## 2. Sabit Modul İnterfeysi (Contract — Dəyişdirməyin!)

Bütün modullar `Scripts/EventBus.js` üzərindən danışır. Aşağıdakı export adları qorunmalıdır:

- **`Scenes/Story_Intro.js`** → `export class StoryIntroScene { constructor(container, eventBus, data); mount(); unmount(); }`
  - "Səyahətə Başla" kliklənəndə: `eventBus.emit('story:complete')`
- **`Scenes/World_Azerbaijan.js`** → `export class WorldAzerbaijanScene { constructor(container, eventBus, data, gameManager); async mount(); unmount(); update(dt); getTerrainHeight(x, z); getCityPositions(); getScene(); getCamera(); }`
  - Şəhər mövqeləri: `{ City_Baku: {x, z, radius}, City_Sheki: {x, z, radius}, City_Shusha: {x, z, radius} }`
  - `Art/` altındakı `.glb` modelləri varsa `Prefabs/ModelLoader.js` ilə yükləyir, yoxdursa stilizə olunmuş Three.js placeholder göstərir.
- **`UI/UIManager.js`** → `export class UIManager { constructor(rootEl, eventBus, data); mount(); unmount(); updateHUD(state); showMarket(city, state); hideMarket(); showQuest(quest); showHistoricalEvent(evt); toggleMapChronicle(state); showToast(msg, type); showVictory(state); }`
- **`Audio/AudioManager.js`** → `export class AudioManager { constructor(eventBus); init(); playCityMusic(trackId); playSFX(sfxName); toggleMute(); }`

---

## 3. Paralel Söhbətlərə Kopyala-Yapışdır Hazır Promptlar

### Antigravity #2 (2-ci Söhbət — Xəritə & 2D Story) Üçün Prompt:
> `C:\Users\user\.gemini\antigravity\scratch\azerbaijan-caravan-game` qovluğundakı `LAYIHE_MEQZI.md`, `IS_BOLGUSU_VE_PROMPTLAR.md`, `Data/cities.json`, `Data/events.json`, `Scenes/Story_Intro.js` və `Scenes/World_Azerbaijan.js` fayllarını oxu.
> Mən **Antigravity #2 (Xəritə və 2D Story)** mühitiyəm və **yalnız `Scenes/` qovluğunda** işləyirəm (`Scripts/`, `Data/`, `UI/`, `Audio/`, `Art/` fayllarına toxunmuram).
> Mövcud `StoryIntroScene` və `WorldAzerbaijanScene` interfeysini qoruyaraq bunları yüksək keyfiyyətlə təkmilləşdir:
> 1. `Scenes/Story_Intro.js`: Azərbaycanın tarixi dövrlərini (Qobustan e.ə., VI əsr Qafqaz Albaniyası, XII əsr Şirvanşahlar/Gəncə, XVIII–XIX əsr Şəki və Şuşa) vizual 2D tarixi xəritə və SVG/Canvas illüstrasiyaları ilə təqdim edən 4 slayddan ibarət atmosferik giriş səhnəsi qur; "Səyahətə Başla" düyməsi `eventBus.emit('story:complete')` göndərsin.
> 2. `Scenes/World_Azerbaijan.js`: 2D prosedural Azərbaycan yüksəklik xəritəsindən (heightmap) avtomatik 3D relyef (Xəzər dənizi, Abşeron yarımadası, Böyük və Kiçik Qafqaz dağları, Kür-Araz ovalığı, yaşıl vadilər, günəş işıqlandırması, buludlar, karvan yolları, ağaclar və su effekti) yarat. `City_Baku`, `City_Sheki`, `City_Shusha` trigger zonalarını, dövrə uyğun memarlıq siluetlərini, yol üzərində dinamik NPC markerlərini və kliklə hərəkət raycast dəstəyini gözəl şəkildə qur. `npm.cmd run build` (Node yolu: `C:\Users\user\AppData\Local\Programs\nodejs`) ilə yoxla.

### Antigravity #3 (3-cü Söhbət / PC — Blender 3D Modellər, UI və Audio) Üçün Prompt:
> `C:\Users\user\.gemini\antigravity\scratch\azerbaijan-caravan-game` qovluğundakı `LAYIHE_MEQZI.md`, `IS_BOLGUSU_VE_PROMPTLAR.md`, `Data/cities.json`, `Data/quests.json`, `Data/events.json`, `UI/UIManager.js` və `Audio/AudioManager.js` fayllarını oxu.
> Mən **Antigravity #3 (3D Modellər, UI və Səs)** mühitiyəm və **yalnız `Art/`, `Prefabs/`, `UI/`, `Audio/` qovluqlarında** işləyirəm (`Scripts/`, `Data/`, `Scenes/` fayllarına toxunmuram).
> 1. `Art/` və `Prefabs/`: Bu PC-də **Blender 5.0** quraşdırılıb (`C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`). Blender Python skripti yazaraq avtomatik optimallaşdırılmış `.glb` modelləri `public/models/` (və `Art/`) qovluğuna eksport et: `merchant_caravan.glb`, `guard.glb`, `thief.glb`, `npc_padishah.glb`, `city_baku.glb` (Qız Qalası/Şirvanşahlar), `city_sheki.glb` (Karvansaray/Şəbəkə), `city_shusha.glb` (Şuşa Qalası). `Prefabs/ModelLoader.js`-də bunları `GLTFLoader` ilə yüklə (yoxdursa fallback qalsın).
> 2. `UI/`: `UI/UIManager.js` və `UI/ui.css`-i Azərbaycan xalça/şəbəkə ornamentlərindən ilhamlanan zərif, oxunaqlı, premium qızılı-zümrüd üslubda təkmilləşdir (`HUDPanel`, `MarketPanel`, `QuestPopupPanel`, `EventPopupPanel`, `MapChroniclePanel` — bütün `Data/` sahələri ilə tam işləsin).
> 3. `Audio/`: `Audio/AudioManager.js`-də Web Audio API ilə (əlavə mp3 tələb etmədən, istəyə bağlı `.mp3`/`.ogg` dəstəyi ilə) 3 bölgənin lad/məqam ruhunu hiss etdirən yumşaq fon musiqiləri (`audio_baku_shirvan`, `audio_sheki_silk`, `audio_shusha_mugham`) və səs effektləri (qızıl səsi, alqı-satqı, tapşırıq, oğru xəbərdarlığı, qələbə) hazırla. `npm.cmd run build` (Node yolu: `C:\Users\user\AppData\Local\Programs\nodejs`) ilə yoxla.
