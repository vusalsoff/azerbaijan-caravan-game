import citiesData from '../Data/cities.json';
import questsData from '../Data/quests.json';
import eventsData from '../Data/events.json';
import npcsData from '../Data/npcs.json';
import itemsData from '../Data/items.json';

/**
 * Bütün Data/*.json fayllarını vahid interfeyslə yükləyir,
 * tarixi mənşə, divan möhürü və əlyazma qeydlərini birləşdirir.
 */
export class DataLoader {
  constructor() {
    this.cities = citiesData.cities || [];
    this.quests = questsData.random_quests || [];
    this.historicalEvents = eventsData.historical_events || [];
    this.npcTypes = npcsData.npc_types || [];
    this.itemCatalog = itemsData.items || {};

    this.cityMap = new Map(this.cities.map((c) => [c.city_id, c]));
    this.npcMap = new Map(this.npcTypes.map((n) => [n.role, n]));
    this.itemMetaMap = new Map();

    for (const city of this.cities) {
      for (const good of city.goods) {
        const extra = this.itemCatalog[good.item_id] || {};
        if (!this.itemMetaMap.has(good.item_id)) {
          this.itemMetaMap.set(good.item_id, {
            item_id: good.item_id,
            name: extra.name || good.name,
            icon: good.icon || '📦',
            category: good.category || extra.category || 'craft',
            quality: good.quality || 'Yaxşı',
            travel_cost: good.travel_cost ?? 12,
            max_freshness_days: good.max_freshness_days ?? null,
            tier_label: extra.tier_label || 'Karvan Malı',
            seal_title: extra.seal_title || 'Əsnaf Möhürü',
            origin_region: extra.origin_region || city.short_name || city.display_name,
            unit_label: extra.unit_label || 'Bağlama',
            lore:
              extra.lore ||
              'İpək Yolu karvansaraylarında dəyər görən ənənəvi Azərbaycan ticarət əmtəəsi.',
            merchant_whisper:
              extra.merchant_whisper ||
              '«Malın qədrini bilən bazara apar ki, zəhmətin hədər getməsin.»',
          });
        }
      }
    }

    for (const [itemId, extra] of Object.entries(this.itemCatalog)) {
      if (!this.itemMetaMap.has(itemId)) {
        this.itemMetaMap.set(itemId, {
          item_id: itemId,
          name: extra.name || itemId,
          icon: '📦',
          category: extra.category || 'craft',
          quality: 'Yaxşı',
          travel_cost: 12,
          max_freshness_days: null,
          tier_label: extra.tier_label || 'Karvan Malı',
          seal_title: extra.seal_title || 'Əsnaf Möhürü',
          origin_region: extra.origin_region || 'Azərbaycan',
          unit_label: extra.unit_label || 'Bağlama',
          lore: extra.lore || '',
          merchant_whisper: extra.merchant_whisper || '',
        });
      }
    }
  }

  getCityById(cityId) {
    // Köhnə save-lər və ya paralel komanda branch-ları üçün təhlükəsiz ID uyğunlaşdırması
    const aliases = {
      City_Quba: 'City_Shamakhi',
      City_Nakhchivan: 'City_Lankaran',
    };
    const resolved = aliases[cityId] || cityId;
    return this.cityMap.get(resolved) || null;
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
        tier_label: 'Karvan Malı',
        seal_title: 'Əsnaf Möhürü',
        origin_region: 'Azərbaycan',
        unit_label: 'Bağlama',
        lore: 'Qədim karvan yollarında daşınan ticarət əmtəəsi.',
        merchant_whisper: '«Hər malın öz alıcısı, hər yolun öz qisməti var.»',
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
        title: 'Yolçu',
        color: '#c8a258',
        encounter_types: ['quest'],
        description: '',
      }
    );
  }
}
