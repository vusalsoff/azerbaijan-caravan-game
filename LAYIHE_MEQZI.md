# Azərbaycan Mədəniyyəti Karvan Oyunu — Layihənin Ümumi Məğzi

> **Məqsəd:** Bu sənəd layihənin əsas ideyasını, mexanikalarını, texniki arxitekturasını və **sabah saat 06:00-a qədər** hazırlanacaq işlək Demo versiyasının çərçivəsini müəyyən edir. Komandanın bütün üzvləri və paralel işləyən Antigravity mühitləri bu sənədi **əsas istinad nöqtəsi** kimi istifadə edir.

---

## 1. Oyunun Konsepsiyası
Azərbaycanın zəngin tarixini, mədəniyyətini və ticarət ənənələrini əks etdirən **3D Açıq Xəritə (Open World)** karvan ticarəti oyunudur.
- **Çoxdövrülü Sistem (Zamansız Mədəniyyət Xəritəsi):** Oyun tək bir əsrə və ya dövrə bağlı deyil. Hər şəhər və bölgə özünün ən parlaq tarixi-mədəni dövrünü, memarlığını, musiqisini, geyimini və yerli mallarını təmsil edir.
- **2D → 3D Avtomatlaşdırılmış Dünya:** Xəritə sıfırdan Blender-də modelləşdirilmir; 2D heightmap/xəritə məlumatlarından avtomatik 3D relyef və zona yaradan modul/pipeline istifadə olunur.

---

## 2. Oyun Axını (Rejimlər)
1. **2D Story Mode (Giriş):**
   - Oyunun məqsədini və hekayəsini qısaca başa salmaq üçün **3–4 slayddan ibarət 2D giriş səhnəsi**.
   - *(Dərin Story Mode missiyaları növbəti mərhələlərə saxlanılıb.)*
2. **3D Açıq Xəritə (Əsas Demo Oyunu):**
   - Oyunçu Azərbaycan xəritəsi üzərində karvanla sərbəst hərəkət edir.
   - Şəhərlərdə alqı-satqı edir, yolda **random (təsadüfi)** şəkildə çıxan NPC/Padşah tapşırıqları və düşmən pusquları ilə qarşılaşır.
3. **Çoxoyunçulu Rejim (Gələcək Modul):**
   - Demo versiyadan sonra növbəti mərhələdə əlavə olunacaq (məs: 2-ci oyunçunun Qoruyucu rolunu oynaması).

---

## 3. Əsas Personajlar və Mexanikalar
| Rol | Funksiya |
| :--- | :--- |
| **Tacir (Oyunçu)** | Karvanı idarə edir, pul (`gold`) və mal çantası (`inventory`) daşıyır, şəhərlər arasında ticarət edir. |
| **Qoruyucu (AI Mühafizəçi)** | Tacirin yanında hərəkət edir, yaxınlaşan düşmənlərdən (oğrulardan) karvanı qoruyur. |
| **Düşmən (Oğru / Quldur)** | Yolda tacirin qarşısını kəsir və ya yaxınlaşaraq **mallarını və pulunu** oğurlamağa çalışır. |
| **Ətraf NPC-lər və Padşahlar** | Karvan yolda irəliləyərkən təsir göstərə, xüsusi mal/xidmət istəyə və ya random tapşırıqlar verə bilirlər. |

---

## 4. Sabah Saat 06:00 Demo Hədəfi (13 Saatlıq MVP)
Sabah saat 06:00-a qədər əlimizdə **tam işlək, başdan-sona oynanıla bilən** bu döngü olmalıdır:
1. Oyun açılır → **2D Story Mode** (3–4 qısa kadr) → *"Səyahətə Başla"* düyməsi.
2. **3D Açıq Xəritə** yüklənir (Azərbaycanın sıxılmış 3D relyefi + **3 şəhər**):
   - **`City_Baku`** *(Şirvanşahlar dövrü)* — Duz, Neft, Xalça
   - **`City_Sheki`** *(Xanlıq dövrü)* — İpək, Şəki Halvası
   - **`City_Shusha`** *(Qarabağ xanlığı)* — Qarabağ Xalçası, Qarabağ Atı *(sürət bonusu)*
3. **Ticarət:** Bir şəhərdən ucuz mal alıb digər şəhərdə baha satmaq.
4. **Dinamik Yol:** Yolda gedərkən random olaraq **Oğru hücumu** (Qoruyucu müdafiə edir) və ya **Padşah/NPC istəyi (Random Görəv)** baş verir.

---

## 5. Vahid Texniki Müqavilə (Bütün Komanda Üçün Sabit Adlar)
3 nəfərin ayrı-ayrı yazdığı kodların və səhnələrin sonda xətasız birləşməsi üçün **bu adlar dəyişdirilməməlidir**:
- **Səhnə adları:** `Story_Intro` (2D), `World_Azerbaijan` (3D)
- **Obyekt / Node / Tag adları:** `Merchant`, `Guard`, `Thief`, `PadishahNPC`
- **Şəhər Trigger adları:** `City_Baku`, `City_Sheki`, `City_Shusha`
- **Data faylları:** `Data/cities.json`, `Data/quests.json`
- **UI Panelləri:** `MarketPanel`, `QuestPopupPanel`, `HUDPanel`
