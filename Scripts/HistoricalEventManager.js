/**
 * HistoricalEventManager — Yolda qarşıya çıxan müxtəlif NPC-ləri
 * (PadishahNPC, NPC_Craftsman, NPC_Traveler, NPC_Historian, NPC_Ashig)
 * və Tarixi Dövr Eventlərini (Data/events.json) + Yol Tapşırıqlarını (Data/quests.json) idarə edir.
 */
export class HistoricalEventManager {
  constructor(dataLoader, tradeManager, eventBus) {
    this.data = dataLoader;
    this.tradeManager = tradeManager;
    this.eventBus = eventBus;

    this.encounterTimer = 11; // İlk yol qarşılaşması ~11 san hərəkətdən sonra
    this.preferHistoricalNext = true; // Tarixi event və quest növbələşir
  }

  update(dt, merchant, cityPositions) {
    if (!merchant.isMoving) return;
    if (this.tradeManager.currentCityId) return; // Şəhər daxilində yol hadisəsi çıxmır

    this.encounterTimer -= dt;
    if (this.encounterTimer > 0) return;

    this.encounterTimer = 18 + Math.random() * 10;
    this.triggerRoadEncounter(merchant.position, cityPositions);
  }

  triggerRoadEncounter(pos, cityPositions) {
    const nearestCityId = this.findNearestCityId(pos, cityPositions);

    if (this.preferHistoricalNext) {
      const evt = this.pickHistoricalEvent(nearestCityId);
      if (evt) {
        this.preferHistoricalNext = false;
        this.eventBus.emit('encounter:historical_event', {
          event: evt,
          npc: this.data.getNpcMeta(evt.npc_role),
        });
        return;
      }
    }

    const quest = this.pickQuest();
    if (quest) {
      this.preferHistoricalNext = true;
      this.eventBus.emit('encounter:quest', {
        quest,
        npc: this.data.getNpcMeta(quest.npc_role),
      });
      return;
    }

    // Əgər bütün tapşırıqlar aktivdirsə, yenidən tarixi event yoxla
    const fallbackEvt = this.pickHistoricalEvent(nearestCityId, true);
    if (fallbackEvt) {
      this.eventBus.emit('encounter:historical_event', {
        event: fallbackEvt,
        npc: this.data.getNpcMeta(fallbackEvt.npc_role),
      });
    }
  }

  pickHistoricalEvent(nearestCityId, allowRepeat = false) {
    const undiscovered = this.data.historicalEvents.filter(
      (e) => !this.tradeManager.discoveredEventIds.has(e.event_id)
    );
    const pool = undiscovered.length > 0 ? undiscovered : allowRepeat ? this.data.historicalEvents : [];
    if (pool.length === 0) return null;

    // Yaxın bölgəyə aid tarixi hadisəyə üstünlük ver
    const localMatches = pool.filter((e) => e.near_city === nearestCityId);
    const candidates = localMatches.length > 0 ? localMatches : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  pickQuest() {
    if (this.tradeManager.activeQuests.length >= 2) return null;
    const activeIds = new Set(this.tradeManager.activeQuests.map((q) => q.quest_id));

    let available = this.data.quests.filter(
      (q) => !activeIds.has(q.quest_id) && !this.tradeManager.completedQuestIds.has(q.quest_id)
    );
    if (available.length === 0) {
      // Demo boyunca təkrar tapşırıqlar da çıxa bilsin
      available = this.data.quests.filter((q) => !activeIds.has(q.quest_id));
    }
    if (available.length === 0) return null;

    return available[Math.floor(Math.random() * available.length)];
  }

  findNearestCityId(pos, cityPositions) {
    if (!cityPositions) return 'City_Baku';
    let bestId = 'City_Baku';
    let bestDist = Infinity;
    for (const [cityId, info] of Object.entries(cityPositions)) {
      const d = Math.hypot(pos.x - info.x, pos.z - info.z);
      if (d < bestDist) {
        bestDist = d;
        bestId = cityId;
      }
    }
    return bestId;
  }
}
