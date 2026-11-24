# Azərbaycan Mədəniyyəti Karvan Oyunu — Layihənin Ümumi Məğzi

> **Məqsəd:** Bu sənəd layihənin əsas ideyasını, mexanikalarını, texniki arxitekturasını (**Three.js + Vite + Blender `.glb`**) və **sabah saat 06:00-a qədər** hazırlanacaq işlək Demo MVP-nin çərçivəsini müəyyən edir. Paralel işləyən bütün Antigravity mühitləri bu sənədi **əsas istinad nöqtəsi** kimi istifadə edir.

---

## 1. Oyunun Konsepsiyası
Azərbaycanın zəngin tarixini, mədəniyyətini və ticarət ənənələrini əks etdirən **3D Açıq Xəritə (Open World)** karvan ticarəti oyunudur.
- **Çoxdövrülü Sistem (Zamansız Mədəniyyət Xəritəsi):** Oyun tək bir əsrə bağlı deyil. Hər şəhər və bölgə özünün ən parlaq tarixi-mədəni dövrünü, memarlığını, musiqisini və yerli mallarını təmsil edir.
- **2D → 3D Avtomatlaşdırılmış Dünya:** Xəritə sıfırdan modelləşdirilmir; 2D heightmap/xəritə məlumatlarından avtomatik 3D relyef və zona yaradan Three.js pipeline istifadə olunur.
- **Genişləndirilə Bilən Tarixi Hadisələr (Event Sistemi):** Yolda qarşıya çıxan müxtəlif NPC-lər vasitəsilə e.ə. Qobustan tapıntıları, VI əsr Qafqaz Albaniyası (Qəbələ), XII əsr İntibahı (Gəncə/Bakı), XVIII–XIX əsr Xanlıqlar (Şəki/Şuşa) haqqında interaktiv **Tarixi Eventlər** (`Data/events.json`) açılır və oyunçunun **2D Tarix Xəritəsi / Salnaməsi** zənginləşir.

---

## 2. Oyun Axını (Rejimlər)
1. **2D Story Mode & Tarixi Xəritə (`Story_Intro`):**
   - Oyunun məqsədini və Azərbaycanın müxtəlif tarixi dövrlərini (e.ə., VI əsr, XII əsr, XVIII–XIX əsr) qısaca tanıdan **4 slayddan ibarət 2D giriş səhnəsi** + *"Səyahətə Başla"* düyməsi.
   - Oyun zamanı da `M` düyməsi və ya HUD-dan **2D Tarixi Xəritə / Salnamə** rejiminə baxaraq kəşf olunmuş bölgə və dövr faktlarını oxumaq mümkündür.
2. **3D Açıq Xəritə (`World_Azerbaijan` — Əsas Demo Oyunu):**
   - Oyunçu Azərbaycanın 3D relyefi üzərində karvanla sərbəst hərəkət edir (`WASD` / Ox düymələri və ya xəritəyə klikləməklə).
   - 3 şəhərdə (`City_Baku`, `City_Sheki`, `City_Shusha`) alqı-satqı edir.
   - Yolda təsadüfi şəkildə **Oğru pusquları**, **NPC Tapşırıqları (`Data/quests.json`)** və **Tarixi Dövr Eventləri (`Data/events.json`)** baş verir.
3. **Çoxoyunçulu Rejim (Gələcək Modul):**
   - Demo versiyadan sonra növbəti mərhələdə əlavə olunacaq (məs: 2-ci oyunçunun Qoruyucu rolunu oynaması).

---

## 3. Əsas Personajlar və NPC Növləri (`Data/npcs.json`)
| Rol / Tag | Funksiya |
| :--- | :--- |
| **Tacir (`Merchant`)** | Oyunçu idarə edir; qızıl (`gold`, başlanğıc: `120`), çanta (`inventory`, tutum: `10`) daşıyır, şəhərlər arasında ticarət edir. Qarabağ Atı Ləvazimatı (`horse_gear`) daşıyanda sürət bonusu qazanır. |
| **Qoruyucu (`Guard`)** | AI Mühafizəçi; Tacirin yanında hərəkət edir, yaxınlaşan Oğruları avtomatik önləyir və uzaqlaşdırır. |
| **Oğru (`Thief`)** | Yolda təsadüfi pusqu qurur, Qoruyucu mane olmasa Tacirdən mal və ya qızıl oğurlayır. |
| **Padşah / Xan Elçisi (`PadishahNPC`)** | Saray sifarişləri və xanlıq dövrü hadisələri verir. |
| **Sənətkar (`NPC_Craftsman`)** | Karvansaray, şəbəkə və sənətkarlıq tapşırıqları/hadisələri verir. |
| **Yolçu Tacir (`NPC_Traveler`)** | Yolda qalan karvanlar üçün təcili ticarət istəkləri edir. |
| **Salnaməçi (`NPC_Historian`)** | Qobustan (e.ə.), Qəbələ (VI əsr) kimi tarixi-arxeoloji eventləri açır. |
| **Səyyar Aşıq (`NPC_Ashig`)** | XII əsr mədəniyyəti, musiqi və karvana dəstək eventləri gətirir. |

---

## 4. Sabah Saat 06:00 Demo Hədəfi (MVP)
Başdan-sona oynanıla bilən döngü:
1. **`Story_Intro`** → 4 slaydlı 2D tarixi giriş → *"Səyahətə Başla"*
2. **`World_Azerbaijan`** → 3D Azərbaycan xəritəsi + 3 şəhər (`City_Baku`, `City_Sheki`, `City_Shusha`)
3. **Ticarət:** Ucuz al → digər şəhərdə baha sat (`Data/cities.json`)
4. **Dinamik Yol:** Random **Oğru hücumu**, **NPC Tapşırıqları** (`Data/quests.json`) və **Tarixi Eventlər** (`Data/events.json`)
5. **Qalibiyyət Hədəfi (Demo):** `1000 Qızıl` toplamaq (və ya 3 tarixi salnamə + 3 şəhər ziyarəti) → qələbə ekranı (istəsəniz oynamağa davam edə bilərsiniz).

---

## 5. Vahid Texniki Müqavilə (Bütün Antigravity Mühitləri Üçün Sabit Adlar)
- **Texnologiya:** **Three.js + Vite (ES Modules)** + **Blender 5.0 (`.glb` modellər)**
- **Səhnələr:** `Scenes/Story_Intro.js`, `Scenes/World_Azerbaijan.js`
- **Obyekt / Tag adları:** `Merchant`, `Guard`, `Thief`, `PadishahNPC`, `NPC_Craftsman`, `NPC_Traveler`, `NPC_Historian`, `NPC_Ashig`
- **Şəhər Trigger adları:** `City_Baku`, `City_Sheki`, `City_Shusha`
- **Data faylları:** `Data/cities.json`, `Data/quests.json`, `Data/events.json`, `Data/npcs.json`
- **UI Panelləri:** `HUDPanel`, `MarketPanel`, `QuestPopupPanel`, `EventPopupPanel`, `MapChroniclePanel` (`UI/UIManager.js`)
- **Audio Trekləri:** `audio_baku_shirvan`, `audio_sheki_silk`, `audio_shusha_mugham` (`Audio/AudioManager.js`)
