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
    this.itemNameMap = new Map();

    for (const city of this.cities) {
      for (const good of city.goods) {
        if (!this.itemNameMap.has(good.item_id)) {
          this.itemNameMap.set(good.item_id, good.name);
        }
      }
    }
  }

  getCityById(cityId) {
    return this.cityMap.get(cityId) || null;
  }

  getItemName(itemId) {
    return this.itemNameMap.get(itemId) || itemId;
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
