import citiesData from '../Data/cities.json';
import questsData from '../Data/quests.json';
import eventsData from '../Data/events.json';
import npcsData from '../Data/npcs.json';

/**
 * Bütün Data/*.json fayllarını vahid interfeyslə yükləyir və axtarış funksiyaları verir.
 */
export class DataLoader {
  constructor() {
    this.cities = citiesData.cities || [];
    this.quests = questsData.random_quests || [];
    this.historicalEvents = eventsData.historical_events || [];
    this.npcTypes = npcsData.npc_types || [];

    this.cityMap = new Map(this.cities.map((c) => [c.city_id, c]));
    this.npcMap = new Map(this.npcTypes.map((n) => [n.role, n]));
    this.itemMetaMap = new Map();

    for (const city of this.cities) {
      for (const good of city.goods) {
        if (!this.itemMetaMap.has(good.item_id)) {
          this.itemMetaMap.set(good.item_id, {
            item_id: good.item_id,
            name: good.name,
            icon: good.icon || '📦',
            category: good.category || 'craft',
            quality: good.quality || 'Yaxşı',
            travel_cost: good.travel_cost ?? 12,
            max_freshness_days: good.max_freshness_days ?? null,
          });
        }
      }
    }
  }

  getCityById(cityId) {
    return this.cityMap.get(cityId) || null;
  }

  getItemMeta(itemId) {
    return (
      this.itemMetaMap.get(itemId) || {
        item_id: itemId,
        name: itemId,
        icon: '📦',
        category: 'craft',
        quality: 'Yaxşı',
        travel_cost: 12,
        max_freshness_days: null,
      }
    );
  }

  getItemName(itemId) {
    return this.getItemMeta(itemId).name;
  }

  getItemIcon(itemId) {
    return this.getItemMeta(itemId).icon;
  }

  getNpcMeta(role) {
    return (
      this.npcMap.get(role) || {
        role,
        title: 'Yolçu NPC',
        color: '#d4af37',
        encounter_types: ['quest'],
        description: '',
      }
    );
  }
}
