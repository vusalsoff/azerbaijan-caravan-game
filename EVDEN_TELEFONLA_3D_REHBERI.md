# 📱 Evdən Telefonla 3D Modellər, Xalça Teksturaları və İllüstrasiyalar — Addım-Addım Rəhbər

> **Məqsəd:** Bu fayl evdən **yalnız telefonla** Google AI Studio / ChatGPT + Image-to-3D saytları vasitəsilə yüksək keyfiyyətli `.glb` 3D modelləri, xalça naxışı teksturalarını və 2D tarixi şəkilləri mərhələ-mərhələ hazırlayıb birbaşa GitHub-a yükləməyiniz üçün yazılıb.

---

## ⚡ Telefonla 4 Addımda İş Axını

1. **Şəkil çıxar (Google AI Studio / ChatGPT):**  
   Aşağıdakı hazır ingiliscə promptlardan birini kopyalayıb **Google AI Studio** (Imagen / Gemini Image) və ya **ChatGPT**-yə yapışdır → təmiz ağ fonda şəkil çıxar → telefona saxla.
2. **Şəkli 3D `.glb`-yə çevir (telefon brauzerində):**  
   Aşağıdakı saytlardan birini aç, **Image to 3D** bölməsinə şəkli yüklə, hazır olanda **`.GLB`** formatında endir:
   - **[tripo3d.ai](https://www.tripo3d.ai)** *(telefonda çox sürətli və keyfiyyətli)*
   - **[meshy.ai](https://www.meshy.ai)** *(Image-to-3D, yaxşı tekstura)*
   - **[hyper3d.ai](https://hyper3d.ai)** *(Rodin — çox yüksək detal)*
   - **[Hunyuan3D-2 (HuggingFace)](https://huggingface.co/spaces/tencent/Hunyuan3D-2)** *(pulsuz)*
3. **Faylın adını dəqiq dəyiş:**  
   Məsələn: `prop_carpet_stall.glb` *(ad aşağıdakı cədvəllə 100% eyni olmalıdır)*.
4. **Telefondan birbaşa GitHub-a yüklə:**  
   - Brauzerdə `github.com/vusalsoff/azerbaijan-caravan-game` aç.
   - **`public/models/`** qovluğuna gir *(tekstura üçün `public/textures/carpets/`, 2D şəkil üçün `public/images/`)*.
   - Sağ yuxarıda **Add file → Upload files** bas.
   - Telefondan faylı seç → aşağıda **Commit changes** bas! *(Eyni adla yükləyəndə köhnə test faylını avtomatik əvəz edir!)*

> **3 Qızıl Qayda:**
> - 3D fayllar yalnız **`.glb`** olsun (`.obj`, `.fbx`, `.zip` yox).
> - Ölçü mümkün qədər **1–6 MB** arası olsun.
> - Şəkil yaradanda **arxa fon mütləq düz ağ (plain white background)** olsun ki, 3D çevirmə təmiz çıxsın!

---

## 🏰 MƏRHƏLƏ 1 — Əsas Personajlar və Karvan (`public/models/`)

- [ ] **`merchant_caravan.glb`** — Tacir Karvanı (Araba + xalça/kisə yükləri)
  ```text
  Medieval Azerbaijani Silk Road wooden merchant wagon with arched golden silk canopy, wooden spoked wheels, loaded with rolled red patterned carpets and spice sacks, warm handcrafted details, isolated on plain pure white background, full object visible, 3/4 front view, studio lighting, no floor shadow, no text, 3D game asset
  ```

- [ ] **`guard.glb`** — Qoruyucu (Papaqlı, nizəli-qalxanlı)
  ```text
  Medieval Azerbaijani caravan guard warrior wearing traditional dark fur papaq hat, embroidered teal and gold patterned robe, leather belt, holding wooden spear and round bronze shield, standing straight neutral pose, full body from head to boots, isolated on plain pure white background, front 3/4 view, no shadow, no text, 3D game character asset
  ```

- [ ] **`thief.glb`** — Oğru / Quldur
  ```text
  Medieval Silk Road desert bandit wearing weathered dark crimson and charcoal cloak, wrapped head scarf mask, leather boots, curved dagger on belt, standing neutral pose, full body visible, isolated on plain pure white background, front 3/4 view, no shadow, no text, 3D game character asset
  ```

- [ ] **`npc_padishah.glb`** — Bazar Taciri / Padşah Elçisi *(konsept şəklinizdəki kimi!)*
  ```text
  Wise medieval Azerbaijani bazaar merchant elder with trimmed grey beard, woven silk turban, richly embroidered dark blue and gold brocade robe, welcoming standing pose, full body visible, isolated on plain pure white background, front 3/4 view, no shadow, no text, 3D game character asset
  ```

- [ ] **`npc_farmer.glb`** — Kəndli / Bağban NPC *(Kənd təsərrüfatı üçün)*
  ```text
  Historical Azerbaijani village farmer wearing simple woven wool vest, traditional cap, cloth sash, carrying a small wooden basket of apples, friendly standing pose, full body visible, isolated on plain pure white background, front 3/4 view, no shadow, no text, 3D game character asset
  ```

---

## 🕌 MƏRHƏLƏ 2 — Tarixi Şəhər Abidələri (`public/models/`)

- [ ] **`city_baku.glb`** — Bakı (Qız Qalası + Şirvanşahlar günbəzi)
  ```text
  Miniature 3D game landmark of historic Baku Maiden Tower Qiz Qalasi next to Shirvanshah sandstone palace with golden dome, warm carved limestone architecture, circular stone base, isolated on plain pure white background, isometric 3/4 view, no floor shadow, no text
  ```

- [ ] **`city_sheki.glb`** — Şəki (Yuxarı Karvansaray + Şəbəkə)
  ```text
  Miniature 3D game landmark of historic Sheki Caravanserai and Sheki Khan Palace with ornate colorful stained glass shebeke windows, carved wooden arches and terracotta tiled roof, isolated on plain pure white background, isometric 3/4 view, no floor shadow, no text
  ```

- [ ] **`city_shusha.glb`** — Şuşa (Qala divarları + minarələr)
  ```text
  Miniature 3D game landmark of historic Shusha fortress stone walls with twin round watchtowers and historic Karabakh mosque dome with two patterned minarets, isolated on plain pure white background, isometric 3/4 view, no floor shadow, no text
  ```

- [ ] **`city_shamakhi.glb`** — Şamaxı XVI əsr *(konseptdəki əlavə şəhər!)*
  ```text
  Miniature 3D game landmark of 16th century Shamakhi stone caravanserai courtyard with arched colonnades, fabric sun canopies and historic stone mosque dome, warm sandstone architecture, isolated on plain pure white background, isometric 3/4 view, no floor shadow, no text
  ```

---

## 🧶 MƏRHƏLƏ 3 — Bazar və Kənd Təsərrüfatı 3D Detalları (`public/models/`)

- [ ] **`prop_carpet_stall.glb`** — Naxışlı Azərbaycan Xalçası Tezgahı
  ```text
  Medieval Azerbaijani wooden bazaar stall table draped with richly patterned red, navy and gold traditional Azerbaijan carpets and stacked silk rolls, isolated on plain pure white background, 3/4 view, no floor shadow, no text, 3D game prop
  ```

- [ ] **`prop_copper_jugs.glb`** — Mis Səhənglər və Qablar
  ```text
  Group of three antique Azerbaijani engraved copper water jugs (seheng) and ornate brass pitchers arranged neatly together, warm metallic bronze patina, isolated on plain pure white background, 3/4 view, no shadow, no text, 3D game prop
  ```

- [ ] **`prop_fruit_baskets.glb`** — Alma və Armud Səbətləri *(Kənd təsərrüfatı)*
  ```text
  Two rustic woven wicker market baskets side by side, one overflowing with fresh red apples and the other with ripe yellow-green pears, isolated on plain pure white background, 3/4 view, no shadow, no text, 3D game prop
  ```

- [ ] **`prop_pomegranate_crate.glb`** — Göyçay Narı və Üzüm Yeşiyi *(Kənd təsərrüfatı)*
  ```text
  Rustic wooden market crate filled with ripe red Azerbaijani pomegranates and bunches of dark purple grapes, medieval bazaar prop, isolated on plain pure white background, 3/4 view, no shadow, no text, 3D game prop
  ```

- [ ] **`prop_wheat_honey.glb`** — Buğda Kisələri və Bal Küpü *(Kənd təsərrüfatı)*
  ```text
  Two burlap grain sacks filled with golden wheat next to a glazed clay honey jar tied with twine, medieval village agricultural trade prop, isolated on plain pure white background, 3/4 view, no shadow, no text, 3D game prop
  ```

- [ ] **`prop_caravanserai_arch.glb`** — Karvansaray Daş Tağı və Kölgəlik
  ```text
  Medieval Silk Road carved sandstone caravanserai archway with draped terracotta fabric sun canopy on top, warm weathered limestone, isolated on plain pure white background, 3/4 front view, no shadow, no text, 3D game environment prop
  ```

---

## 🎨 MƏRHƏLƏ 4 — Fərqli Rəngli Xalça Teksturaları (`public/textures/carpets/`)

> **Niyə ayrı tekstura?** 1 dənə xalça 3D modelinin üzərində bu şəkilləri dəyişərək **5 fərqli bölgənin xalçasını** oyunda sıfır əlavə ağırlıqla göstərəcəyik!  
> Şəkilləri **1:1 kvadrat (1024×1024)** çıxarıb GitHub-da **`public/textures/carpets/`** qovluğuna yükləyin:

- [ ] **`carpet_karabakh.png`** — Qarabağ xalçası (qırmızı-qızılı-tünd göy)
  ```text
  Flat top-down 2D seamless texture of a traditional Azerbaijani Karabakh carpet, deep crimson red background with ornate gold, navy blue and ivory floral geometric medallions, crisp woven wool fabric texture, completely flat orthographic view, no perspective, no borders outside frame, 1:1 square
  ```

- [ ] **`carpet_quba.png`** — Quba xalçası (tünd göy-qızılı-krem)
  ```text
  Flat top-down 2D seamless texture of a traditional Azerbaijani Quba carpet, deep indigo navy background with intricate geometric star medallions in saffron gold, terracotta and cream, realistic woven wool texture, completely flat orthographic view, no perspective, 1:1 square
  ```

- [ ] **`carpet_shirvan.png`** — Şirvan xalçası (zümrüd-bordo-qızılı)
  ```text
  Flat top-down 2D seamless texture of a traditional Azerbaijani Shirvan carpet, rich emerald green and burgundy geometric lattice motifs with warm gold accents, authentic woven wool texture, completely flat orthographic view, 1:1 square
  ```

- [ ] **`carpet_sheki.png`** — Şəki ipək-şəbəkə xalçası (firuzəyi-yaqut-kəhrəba)
  ```text
  Flat top-down 2D seamless texture of an ornate Azerbaijani Sheki silk rug inspired by shebeke stained glass patterns, turquoise, ruby red, amber gold and dark walnut symmetrical geometric ornament, completely flat orthographic view, 1:1 square
  ```

- [ ] **`carpet_ganja.png`** — Gəncə xalçası (oxra sarı-tünd qırmızı-göy)
  ```text
  Flat top-down 2D seamless texture of a traditional Azerbaijani Ganja carpet, bold diagonal stripes and stepped geometric medallions in warm ochre yellow, madder red and deep blue, authentic wool weave, completely flat orthographic view, 1:1 square
  ```

---

## 🖼️ MƏRHƏLƏ 5 — 2D Story Mode Tarixi İllüstrasiyaları (`public/images/`)

> İstəsəniz giriş hekayəsi (`Story_Intro`) üçün 16:9 kinematik 4 tarixi şəkil çıxarıb **`public/images/`** qovluğuna yükləyin:

- [ ] **`story_1_gobustan.png`** — Eramızdan əvvəl Qobustan qayaüstü təsvirləri
  ```text
  Cinematic painterly historical illustration of ancient Gobustan rocky cliffs in Azerbaijan at golden sunset, glowing rock petroglyphs of boats and Yalli dancers, ancient Silk Road horizon, warm museum-grade concept art, 16:9 widescreen, no text
  ```
- [ ] **`story_2_gabala_shirvan.png`** — VI–XII əsr Qəbələ & Şirvanşahlar
  ```text
  Cinematic painterly historical illustration of a bustling 12th century Silk Road caravan approaching medieval Baku Maiden Tower and sandstone palace by the Caspian Sea, camels and silk banners, golden hour lighting, high detail game concept art, 16:9 widescreen, no text
  ```
- [ ] **`story_3_shamakhi_bazaar.png`** — XVI–XVIII əsr Şamaxı / Şəki Karvansarayı Bazarı
  ```text
  Cinematic painterly historical illustration of a sunlit medieval Azerbaijani caravanserai bazaar in Shamakhi and Sheki, stone arches, colorful hanging Azerbaijani carpets, copper jugs, baskets of apples and pomegranates, merchants trading, warm rich atmosphere, 16:9 widescreen, no text
  ```
- [ ] **`story_4_shusha_caravan.png`** — XVIII–XIX əsr Şuşa və Qarabağ Atları
  ```text
  Cinematic painterly historical illustration of golden Karabakh horses and a royal merchant caravan riding toward Shusha mountain fortress at dawn, misty green Caucasus peaks, warm dramatic sunlight, epic game concept art, 16:9 widescreen, no text
  ```

---

## 🤖 Google AI Studio Üçün Master Prompt (Yeni İdeyalar Çıxarmaq İstəsəniz)

Əgər siyahıdan əlavə yeni əşyalar (məs: arı pətəyi, pambıq tayası, tar/kamança, dəvə, çörək təndiri və s.) fikirləşsəniz, **Google AI Studio**-ya əvvəlcə bu mətni göndərin:

```text
Mən "İRS — Tacirin yolu" adlı 3D Azərbaycan tarixi karvan ticarəti oyunu üçün 3D modellər hazırlayıram.
Sənə Azərbaycan dilində hansı obyekti/personajı desəm, mənə onu Image-to-3D (Tripo3D / Meshy) üçün ideal İngiliscə şəkil yaratma promptuna çevir.
Hər promptda mütləq bu qaydalar olsun:
1) Tarixi Azərbaycan mədəniyyəti və İpək Yolu üslubu (isti, realistik tekstura)
2) "isolated on plain pure white background, full object visible, 3/4 front view, studio lighting, no floor shadow, no text, 3D game asset"
3) Fayl adını da təklif et (məs: prop_tendir.glb).
Hazırsansa "Hazıram, ilk obyekti yaz" de.
```

---

## ✅ Necə İşarələyəsən?
Hər faylı GitHub-da `public/models/` (və ya `public/textures/carpets/`, `public/images/`) qovluğuna yüklədikcə bu faylda `[ ]` işarəsini `[x]` edə bilərsən ki, həm sən, həm dostun nəyin hazır olduğunu dərhal görsün!
