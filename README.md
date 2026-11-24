# Azerbaijan Caravan Game (Demo MVP)

Azərbaycanın müxtəlif tarixi dövrlərini və mədəniyyətini əks etdirən **3D Açıq Xəritə (Three.js + Vite + Blender `.glb`)** karvan ticarəti oyunu.

## İşə Salmaq
```bash
npm install
npm run dev
```
Brauzerdə göstərilən `http://localhost:5173` ünvanını açın.

## Qovluq Strukturu
- `Data/` — Şəhərlər (`cities.json`), yol tapşırıqları (`quests.json`), tarixi dövr eventləri (`events.json`), NPC növləri (`npcs.json`) *(Antigravity #1)*
- `Scripts/` — `EventBus`, `DataLoader`, `GameManager`, `TradeAndQuestManager`, `HistoricalEventManager`, `Merchant`, `Guard`, `Thief` *(Antigravity #1)*
- `Scenes/` — `Story_Intro.js` (2D Story Mode) və `World_Azerbaijan.js` (2D→3D Açıq Xəritə) *(Antigravity #2)*
- `Art/` & `Prefabs/` — Blender `.glb` 3D modelləri və `ModelLoader.js` *(Antigravity #3)*
- `UI/` & `Audio/` — `UIManager.js` (`HUDPanel`, `MarketPanel`, `QuestPopupPanel`, `EventPopupPanel`, `MapChroniclePanel`) və `AudioManager.js` *(Antigravity #3)*

## Sənədlər
Ətraflı məlumat və paralel iş bölgüsü üçün `LAYIHE_MEQZI.md` və `IS_BOLGUSU_VE_PROMPTLAR.md` fayllarına baxın.
