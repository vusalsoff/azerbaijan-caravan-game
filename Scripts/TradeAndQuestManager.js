const SAVE_KEY = 'karva_save_v2';
const LEGACY_SAVE_KEY = 'irs_tacirin_yolu_save_v1';
const BACKUP_SAVE_KEY = 'karva_save_v2_backup';
const SAVE_VERSION = 2;
const SECONDS_PER_GAME_DAY = 90;

/**
 * TradeAndQuestManager — "KARVA" iqtisadiyyatı, Karvan, Bacarıqlar və Yaddaş Sistemi:
 * - Köhnə `irs_tacirin_yolu_save_v1` yaddaşından itkisiz miqrasiya + ehtiyat nüsxə (`karva_save_v2_backup`)
 * - FIFO Partiyalı İnventar (`inventoryBatches`) + Çəki/Tutum + 4-mərhələli Təzəlik
 * - Şəhər qiymət kəşfiyyatı (`cityPriceIntel`), Tələb-Təklif (`marketSupply`), Bacarıqlar (`skills`) və Karvan avadanlığı
 */
export class TradeAndQuestManager {
  constructor(dataLoader, eventBus) {
    this.data = dataLoader;
    this.eventBus = eventBus;

    this._initDefaults();
    this.loadFromStorage();
  }

  _initDefaults() {
    this.gold = 140;
    this.winGoldGoal = 1000;
    this.maxInventory = 12;

    this.charisma = 12;
    this.intelligence = 9;
    this.gameDay = 1;
    this.dayElapsedSec = 0;
    this.worldSeed = 157801;

    this.skills = {
      carpetLore: 0,
      foodLore: 0,
      roadExp: 0,
    };

    this.caravan = {
      maxWeight: 60,
      horseCondition: 100,
      wagonCondition: 100,
      feed: 4,
      guardLevel: 0,
      equippedHorseGear: false,
    };

    this.npcRelations = {};
    this.cityPriceIntel = {};
    this.marketSupply = {};

    this.inventory = {
      salt: 0,
      oil: 0,
      silk: 0,
      halva: 0,
      carpet: 0,
      horse_gear: 0,
      apple: 0,
      pear: 0,
      pomegranate: 0,
      grape: 0,
      honey: 0,
      wheat: 0,
    };

    // FIFO partiyalar: { [itemId]: Array<{ qty, daysLeft, maxDays, buyPrice, originCityId, acquiredDay }> }
    this.inventoryBatches = {};
    // Köhnə save formatı ilə geriyə uyğunluq üçün saxlanılır
    this.itemFreshness = {};

    // Bazarlıq yaddaşı: { [cityId_itemId]: { buyFactor, sellFactor, attempted, status, day } }
    this.haggleState = {};
    this.lastHaggleCityId = null;

    this.currentCityId = null;
    this.visitedCityIds = new Set();
    this.activeQuests = [];
    this.completedQuestIds = new Set();
    this.discoveredEvents = [];
    this.discoveredEventIds = new Set();

    this.speedBoostTimer = 0;
    this.guardBoostTimer = 0;
    this.victoryReached = false;
    this.victoryDismissed = false;
    this.stats = {
      tradesCount: 0,
      hagglesWon: 0,
      thievesRepelled: 0,
      timesRobbed: 0,
      spoiledCount: 0,
    };
  }

  _syncInventoryFromBatches() {
    for (const key of Object.keys(this.inventory)) {
      this.inventory[key] = 0;
    }
    this.itemFreshness = {};

    for (const [itemId, batches] of Object.entries(this.inventoryBatches)) {
      const clean = (batches || []).filter((b) => b && b.qty > 0);
      if (clean.length === 0) {
        delete this.inventoryBatches[itemId];
        continue;
      }
      // Köhnə (tez xarab olacaq) partiyalar həmişə öndə dursun (FIFO)
      clean.sort((a, b) => {
        if (a.daysLeft == null && b.daysLeft == null) return (a.acquiredDay || 1) - (b.acquiredDay || 1);
        if (a.daysLeft == null) return 1;
        if (b.daysLeft == null) return -1;
        return a.daysLeft - b.daysLeft;
      });
      this.inventoryBatches[itemId] = clean;

      const total = clean.reduce((s, b) => s + b.qty, 0);
      this.inventory[itemId] = total;

      if (clean[0].daysLeft != null) {
        this.itemFreshness[itemId] = clean[0].daysLeft;
      }
    }
  }

  _consumeFromBatches(itemId, qty) {
    const batches = this.inventoryBatches[itemId];
    if (!batches || batches.length === 0) return [];

    let remaining = qty;
    const consumed = [];

    while (remaining > 0 && batches.length > 0) {
      const front = batches[0];
      const take = Math.min(remaining, front.qty);
      consumed.push({ ...front, qty: take });
      front.qty -= take;
      remaining -= take;
      if (front.qty <= 0) {
        batches.shift();
      }
    }

    this._syncInventoryFromBatches();
    return consumed;
  }

  saveToStorage() {
    try {
      const prevRaw = localStorage.getItem(SAVE_KEY);
      if (prevRaw) {
        localStorage.setItem(BACKUP_SAVE_KEY, prevRaw);
      }
      const payload = {
        saveVersion: SAVE_VERSION,
        worldSeed: this.worldSeed,
        gold: this.gold,
        charisma: this.charisma,
        intelligence: this.intelligence,
        gameDay: this.gameDay,
        dayElapsedSec: this.dayElapsedSec,
        currentCityId: this.currentCityId,
        skills: this.skills,
        caravan: this.caravan,
        npcRelations: this.npcRelations,
        cityPriceIntel: this.cityPriceIntel,
        marketSupply: this.marketSupply,
        inventory: this.inventory,
        inventoryBatches: this.inventoryBatches,
        itemFreshness: this.itemFreshness,
        haggleState: this.haggleState,
        lastHaggleCityId: this.lastHaggleCityId,
        visitedCityIds: [...this.visitedCityIds],
        activeQuests: this.activeQuests,
        completedQuestIds: [...this.completedQuestIds],
        discoveredEventIds: [...this.discoveredEventIds],
        victoryReached: this.victoryReached,
        victoryDismissed: this.victoryDismissed,
        stats: this.stats,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (err) {
      this.eventBus?.emit?.('ui:toast', {
        message: 'Brauzer yaddaşı doludur — irəliləyiş saxlanmaya bilər.',
        type: 'warning',
      });
    }
  }

  loadFromStorage() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      let migratedFromLegacy = false;
      if (!raw) {
        const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
        if (legacyRaw) {
          raw = legacyRaw;
          migratedFromLegacy = true;
        }
      }
      if (!raw) return false;
      const saved = JSON.parse(raw);

      if (typeof saved.worldSeed === 'number') this.worldSeed = saved.worldSeed;
      if (typeof saved.gold === 'number') this.gold = saved.gold;
      if (typeof saved.charisma === 'number') this.charisma = saved.charisma;
      if (typeof saved.intelligence === 'number') this.intelligence = saved.intelligence;
      if (typeof saved.gameDay === 'number') this.gameDay = saved.gameDay;
      if (typeof saved.dayElapsedSec === 'number') this.dayElapsedSec = saved.dayElapsedSec;
      if (typeof saved.currentCityId === 'string') this.currentCityId = saved.currentCityId;
      if (saved.skills && typeof saved.skills === 'object') {
        this.skills = { ...this.skills, ...saved.skills };
      }
      if (saved.caravan && typeof saved.caravan === 'object') {
        this.caravan = { ...this.caravan, ...saved.caravan };
      }
      if (saved.npcRelations && typeof saved.npcRelations === 'object') {
        this.npcRelations = { ...saved.npcRelations };
      }
      if (saved.cityPriceIntel && typeof saved.cityPriceIntel === 'object') {
        this.cityPriceIntel = { ...saved.cityPriceIntel };
      }
      if (saved.marketSupply && typeof saved.marketSupply === 'object') {
        this.marketSupply = { ...saved.marketSupply };
      }

      if (saved.haggleState && typeof saved.haggleState === 'object') {
        this.haggleState = { ...saved.haggleState };
      }
      if (typeof saved.lastHaggleCityId === 'string') {
        this.lastHaggleCityId = saved.lastHaggleCityId;
      }

      if (saved.inventoryBatches && typeof saved.inventoryBatches === 'object') {
        this.inventoryBatches = {};
        for (const [itemId, arr] of Object.entries(saved.inventoryBatches)) {
          if (Array.isArray(arr)) {
            this.inventoryBatches[itemId] = arr.map((b) => ({ ...b }));
          }
        }
        this._syncInventoryFromBatches();
      } else if (saved.inventory && typeof saved.inventory === 'object') {
        // Köhnə save formatından FIFO partiyalara avtomatik miqrasiya
        this.inventoryBatches = {};
        for (const [itemId, qty] of Object.entries(saved.inventory)) {
          const count = Number(qty) || 0;
          if (count <= 0) continue;
          const meta = this.data.getItemMeta(itemId);
          const maxDays = meta.max_freshness_days ?? null;
          const daysLeft =
            maxDays != null
              ? typeof saved.itemFreshness?.[itemId] === 'number'
                ? saved.itemFreshness[itemId]
                : maxDays
              : null;
          this.inventoryBatches[itemId] = [
            {
              qty: count,
              daysLeft,
              maxDays,
              buyPrice: this._estimateBaseCost(itemId),
              originCityId: null,
              acquiredDay: this.gameDay,
            },
          ];
        }
        this._syncInventoryFromBatches();
      }

      if (Array.isArray(saved.visitedCityIds)) {
        this.visitedCityIds = new Set(saved.visitedCityIds);
      }
      if (Array.isArray(saved.activeQuests)) {
        this.activeQuests = saved.activeQuests;
      }
      if (Array.isArray(saved.completedQuestIds)) {
        this.completedQuestIds = new Set(saved.completedQuestIds);
      }
      if (Array.isArray(saved.discoveredEventIds)) {
        this.discoveredEventIds = new Set(saved.discoveredEventIds);
        this.discoveredEvents = this.data.historicalEvents.filter((e) =>
          this.discoveredEventIds.has(e.event_id)
        );
      }
      if (typeof saved.victoryReached === 'boolean') this.victoryReached = saved.victoryReached;
      if (typeof saved.victoryDismissed === 'boolean') this.victoryDismissed = saved.victoryDismissed;
      if (saved.stats) this.stats = { ...this.stats, ...saved.stats };
      if (migratedFromLegacy) {
        this.saveToStorage();
      }
      return true;
    } catch {
      // Pozulmuş yaddaşda ehtiyat nüsxədən bərpa etməyə çalış
      try {
        const backupRaw = localStorage.getItem(BACKUP_SAVE_KEY);
        if (backupRaw) {
          localStorage.setItem(SAVE_KEY, backupRaw);
        }
      } catch {
        // ignore
      }
      return false;
    }
  }

  exportSaveJSON() {
    return localStorage.getItem(SAVE_KEY) || '';
  }

  importSaveJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed.gold !== 'number') return { ok: false, error: 'Yaddaş faylı düzgün formatda deyil.' };
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
      this._initDefaults();
      this.loadFromStorage();
      this.emitState();
      return { ok: true };
    } catch {
      return { ok: false, error: 'JSON oxuna bilmədi — fayl zədələnib.' };
    }
  }

  _estimateBaseCost(itemId) {
    let minBuy = Infinity;
    for (const c of this.data.cities) {
      const g = c.goods.find((x) => x.item_id === itemId);
      if (g && g.buy_price < minBuy) minBuy = g.buy_price;
    }
    return Number.isFinite(minBuy) ? minBuy : 25;
  }

  resetProgress() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    const city = this.currentCityId;
    this._initDefaults();
    this.currentCityId = city;
    this.lastHaggleCityId = city;
    if (city) this.visitedCityIds.add(city);
    this.eventBus.emit('ui:toast', {
      message: 'Yeni səfər dəftəri açıldı — KARVA.',
      type: 'info',
    });
    this.emitState();
  }

  getTotalItems() {
    return Object.values(this.inventory).reduce((sum, n) => sum + n, 0);
  }

  getItemWeight(itemId) {
    const weights = {
      carpet: 8,
      horse_gear: 7,
      salt: 5,
      oil: 5,
      wheat: 5,
      silk: 3,
      honey: 3,
      pomegranate: 3,
      apple: 2,
      pear: 2,
      grape: 2,
      halva: 2,
    };
    return weights[itemId] ?? 3;
  }

  getTotalWeight() {
    return Object.entries(this.inventory).reduce(
      (sum, [itemId, qty]) => sum + (qty || 0) * this.getItemWeight(itemId),
      0
    );
  }

  getSupplyMultiplier(cityId, itemId) {
    const key = `${cityId}_${itemId}`;
    const val = this.marketSupply[key];
    return typeof val === 'number' ? Math.max(0.75, Math.min(1.3, val)) : 1.0;
  }

  _adjustSupply(cityId, itemId, delta) {
    const key = `${cityId}_${itemId}`;
    const cur = this.getSupplyMultiplier(cityId, itemId);
    this.marketSupply[key] = Number(Math.max(0.75, Math.min(1.3, cur + delta)).toFixed(3));
  }

  hasHorseBonus() {
    return Boolean(this.caravan?.equippedHorseGear && (this.inventory.horse_gear || 0) > 0);
  }

  equipHorseGear(equip = true) {
    if (equip && (this.inventory.horse_gear || 0) <= 0) return false;
    this.caravan.equippedHorseGear = Boolean(equip);
    this.emitState();
    return true;
  }

  upgradeInventoryCapacity() {
    if (this.maxInventory >= 24) {
      this.eventBus.emit('ui:toast', { message: 'Heybə artıq maksimum tutumdadır (24 göz).', type: 'info' });
      return false;
    }
    const cost = this.maxInventory === 12 ? 65 : 120;
    if (this.gold < cost) {
      this.eventBus.emit('ui:toast', { message: `Heybəni böyütmək üçün ${cost} qızıl lazımdır.`, type: 'warn' });
      return false;
    }
    this.gold -= cost;
    this.maxInventory += 6;
    this.caravan.maxWeight = (this.caravan.maxWeight || 60) + 30;
    this.eventBus.emit('audio:sfx', 'trade');
    this.eventBus.emit('ui:toast', {
      message: `Karvan heybəsi böyüdüldü: ${this.maxInventory} göz / ${this.caravan.maxWeight} kq (-${cost} qızıl).`,
      type: 'success',
    });
    this.emitState();
    return true;
  }

  getSpeedMultiplier() {
    let mult = 1.0;
    if (this.hasHorseBonus()) mult += 0.35;
    if (this.speedBoostTimer > 0) mult += 0.25;
    return mult;
  }

  getGuardBoostActive() {
    return this.guardBoostTimer > 0 || (this.caravan?.guardLevel || 0) > 0;
  }

  getForecastTrustPercent() {
    const loreBonus = Math.min(12, (this.skills?.carpetLore || 0) + (this.skills?.foodLore || 0));
    return Math.min(96, Math.max(40, Math.round(47 + this.intelligence * 2 + loreBonus)));
  }

  /**
   * Şəhərin yerli siyahısında OLMAYAN idxal malı üçün ədalətli İpək Yolu tələb qiyməti:
   * Ən ucuz istehsal şəhərinin alış qiyməti + yol xərci + nadirlik marjası.
   */
  getCityImportSellPrice(cityId, itemId) {
    const city = this.data.getCityById(cityId);
    const listed = city?.goods.find((x) => x.item_id === itemId);
    if (listed) return listed.sell_price;

    let minBuy = Infinity;
    let maxSell = 0;
    let travel = 12;
    for (const c of this.data.cities) {
      const g = c.goods.find((x) => x.item_id === itemId);
      if (g) {
        if (g.buy_price < minBuy) {
          minBuy = g.buy_price;
          travel = g.travel_cost ?? 12;
        }
        if (g.sell_price > maxSell) maxSell = g.sell_price;
      }
    }

    if (!Number.isFinite(minBuy)) return 28;
    const importPrice = Math.round(minBuy * 1.42 + travel * 1.15);
    return Math.max(importPrice, Math.round(maxSell * 1.08));
  }

  getFallbackSellPrice(itemId, cityId = this.currentCityId) {
    if (cityId) {
      return this.getCityImportSellPrice(cityId, itemId);
    }
    return Math.round(this._estimateBaseCost(itemId) * 1.25);
  }

  _batchRatioMultiplier(daysLeft, maxDays) {
    if (!maxDays || daysLeft == null) return 1.0;
    const ratio = Math.max(0, Math.min(1, daysLeft / maxDays));
    if (ratio >= 0.6) return 1.0;
    if (ratio >= 0.3) return 0.82;
    return 0.58;
  }

  /**
   * Seçilmiş mal üçün "İRS" ticarət və divan təhlili
   */
  getMarketAnalysis(cityId, itemId) {
    const city = this.data.getCityById(cityId);
    if (!city) return null;

    const meta = this.data.getItemMeta(itemId);
    const localGood = city.goods.find((g) => g.item_id === itemId);
    const isLocalGood = Boolean(localGood);

    const hKey = `${cityId}_${itemId}`;
    const haggle = this.haggleState[hKey] || {
      buyFactor: 1,
      sellFactor: 1,
      attempted: false,
      status: 'none',
    };

    const supplyMult = this.getSupplyMultiplier(cityId, itemId);
    const relBonus = 1 + Math.max(-0.08, Math.min(0.12, (this.npcRelations[cityId] || 0) * 0.015));

    const baseBuy = localGood ? localGood.buy_price : null;
    const baseSell = localGood ? localGood.sell_price : this.getCityImportSellPrice(cityId, itemId);

    const effectiveBuy =
      baseBuy != null ? Math.max(5, Math.round(baseBuy * haggle.buyFactor * (2 - relBonus))) : null;
    const freshMult = this.getFreshnessPriceMultiplier(itemId);
    const effectiveSell = Math.max(
      4,
      Math.round(baseSell * haggle.sellFactor * freshMult * supplyMult * relBonus)
    );

    // Digər şəhərlərdəki (həm yerli bazar, həm idxal tələbi) satış qiymətlərindən ən sərfəlisini tap
    const otherPrices = [];
    let bestCityName = null;
    let bestPrice = 0;

    for (const c of this.data.cities) {
      if (c.city_id === cityId) continue;
      const g = c.goods.find((x) => x.item_id === itemId);
      const candidateSell = g ? g.sell_price : this.getCityImportSellPrice(c.city_id, itemId);
      otherPrices.push(candidateSell);
      if (candidateSell > bestPrice) {
        bestPrice = candidateSell;
        bestCityName = c.short_name || c.display_name;
      }
    }

    const refBuy = effectiveBuy ?? this._estimateBaseCost(itemId);
    const baseBest = otherPrices.length > 0 ? Math.max(...otherPrices) : Math.round(refBuy * 1.35);
    const trust = this.getForecastTrustPercent();
    const spreadRatio = Math.max(0.04, (100 - trust) / 360);
    const estSellMin = Math.max(8, Math.round(baseBest * (1 - spreadRatio)));
    const estSellMax = Math.round(baseBest * (1 + spreadRatio));
    const travelCost = localGood?.travel_cost ?? meta.travel_cost ?? 12;

    const goodObj = localGood
      ? { ...meta, ...localGood }
      : {
          ...meta,
          buy_price: null,
          sell_price: baseSell,
        };

    return {
      good: goodObj,
      isLocalGood,
      effectiveBuy,
      effectiveSell,
      estSellMin,
      estSellMax,
      bestCityName: bestCityName || 'Digər şəhər',
      travelCost,
      netMin: estSellMin - refBuy - travelCost,
      netMax: estSellMax - refBuy - travelCost,
      trustPercent: trust,
      quality: goodObj.quality || 'Yaxşı',
      haggle,
      freshness: this.getItemFreshnessInfo(itemId),
      costBasis: this.getAverageBuyPrice(itemId),
    };
  }

  getAverageBuyPrice(itemId) {
    const batches = this.inventoryBatches[itemId];
    if (!batches || batches.length === 0) return null;
    let totalCost = 0;
    let totalQty = 0;
    for (const b of batches) {
      totalCost += (b.buyPrice || 0) * b.qty;
      totalQty += b.qty;
    }
    return totalQty > 0 ? Math.round(totalCost / totalQty) : null;
  }

  getItemFreshnessInfo(itemId) {
    const meta = this.data.getItemMeta(itemId);
    if (!meta.max_freshness_days) return null;
    const owned = this.inventory[itemId] || 0;
    const batches = this.inventoryBatches[itemId] || [];

    // Ən tez xarab olacaq (ilk növbədə satılmalı) partiyanı göstər
    const oldestDays =
      owned > 0 && batches.length > 0 && typeof batches[0].daysLeft === 'number'
        ? batches[0].daysLeft
        : meta.max_freshness_days;

    const ratio = Math.max(0, Math.min(1, oldestDays / meta.max_freshness_days));
    return {
      itemId,
      name: meta.name,
      icon: meta.icon,
      daysLeft: Math.max(0, Number(oldestDays.toFixed(1))),
      maxDays: meta.max_freshness_days,
      ratio,
      owned,
      batchCount: batches.length,
      batches: batches.map((b) => ({
        qty: b.qty,
        daysLeft: b.daysLeft != null ? Math.max(0, Number(b.daysLeft.toFixed(1))) : null,
        maxDays: b.maxDays || meta.max_freshness_days,
        ratio: b.daysLeft != null ? Math.max(0, Math.min(1, b.daysLeft / meta.max_freshness_days)) : 1,
        buyPrice: b.buyPrice,
        originCityName: b.originCityId
          ? this.data.getCityById(b.originCityId)?.short_name || 'Səfər'
          : 'Əvvəlki yük',
      })),
    };
  }

  getHeldPerishables() {
    const list = [];
    for (const [itemId, count] of Object.entries(this.inventory)) {
      if (count <= 0) continue;
      const info = this.getItemFreshnessInfo(itemId);
      if (info) list.push(info);
    }
    return list;
  }

  /**
   * Karvan Heybəsi (İnventar Mücrüsü) üçün bütün əldə olan malların tam siyahısı
   */
  getDetailedInventory(cityId = this.currentCityId) {
    const items = [];
    for (const [itemId, count] of Object.entries(this.inventory)) {
      if (count <= 0) continue;
      const meta = this.data.getItemMeta(itemId);
      const batches = this.inventoryBatches[itemId] || [];
      const avgBuy = this.getAverageBuyPrice(itemId) ?? this._estimateBaseCost(itemId);
      const freshness = this.getItemFreshnessInfo(itemId);

      let unitSellHere = null;
      let isImportedHere = false;
      if (cityId) {
        const analysis = this.getMarketAnalysis(cityId, itemId);
        unitSellHere = analysis ? analysis.effectiveSell : this.getFallbackSellPrice(itemId, cityId);
        isImportedHere = analysis ? !analysis.isLocalGood : true;
      }

      // Ən sərfəli hədəf bazar
      let bestTargetCity = null;
      let bestTargetPrice = 0;
      for (const c of this.data.cities) {
        const g = c.goods.find((x) => x.item_id === itemId);
        const p = g ? g.sell_price : this.getCityImportSellPrice(c.city_id, itemId);
        if (p > bestTargetPrice) {
          bestTargetPrice = p;
          bestTargetCity = c.short_name || c.display_name;
        }
      }

      const origins = [
        ...new Set(
          batches
            .map((b) => (b.originCityId ? this.data.getCityById(b.originCityId)?.short_name : null))
            .filter(Boolean)
        ),
      ];

      items.push({
        itemId,
        qty: count,
        meta,
        avgBuy,
        unitSellHere,
        netPerUnitHere: unitSellHere != null ? unitSellHere - avgBuy : null,
        isImportedHere,
        bestTargetCity: bestTargetCity || 'Şəhər bazarı',
        bestTargetPrice,
        originsLabel: origins.length > 0 ? origins.join(', ') : meta.origin_region,
        freshness,
        batches: batches.map((b, idx) => ({
          index: idx + 1,
          qty: b.qty,
          buyPrice: b.buyPrice || avgBuy,
          daysLeft: b.daysLeft != null ? Math.max(0, Number(b.daysLeft.toFixed(1))) : null,
          maxDays: b.maxDays,
          originName: b.originCityId
            ? this.data.getCityById(b.originCityId)?.short_name || 'Karvan'
            : 'Anbar',
        })),
      });
    }
    return items;
  }

  getFreshnessPriceMultiplier(itemId) {
    const batches = this.inventoryBatches[itemId];
    if (!batches || batches.length === 0) return 1.0;
    const front = batches[0];
    return this._batchRatioMultiplier(front.daysLeft, front.maxDays);
  }

  refreshAllProduce() {
    let refreshed = 0;
    for (const [itemId, batches] of Object.entries(this.inventoryBatches)) {
      const meta = this.data.getItemMeta(itemId);
      if (!meta.max_freshness_days || !batches) continue;
      for (const b of batches) {
        if (b.daysLeft != null) {
          b.daysLeft = Math.min(meta.max_freshness_days, b.daysLeft + 1.2);
        }
      }
      refreshed++;
    }
    this._syncInventoryFromBatches();
    if (refreshed > 0) {
      this.eventBus.emit('ui:toast', {
        message: 'Sərin qablaşdırma və saman tədarükü məhsulların ömrünü +1.2 gün uzatdı.',
        type: 'success',
      });
    }
  }

  haggleItem(cityId, itemId, approach = 'reasoned') {
    const city = this.data.getCityById(cityId);
    if (!city) return { ok: false, message: 'Şəhər tapılmadı.' };
    const good = city.goods.find((g) => g.item_id === itemId);
    const meta = this.data.getItemMeta(itemId);
    const itemName = good ? good.name : meta.name || itemId;

    const hKey = `${cityId}_${itemId}`;
    if (this.haggleState[hKey]?.attempted) {
      this.eventBus.emit('ui:toast', {
        message: `${itemName} üçün bu satıcı ilə artıq sövdələşmisiniz.`,
        type: 'info',
      });
      return { ok: false, message: 'Artıq cəhd edilib.' };
    }

    const rel = this.npcRelations[cityId] || 0;
    let baseChance = 0.52;
    let discountBase = 0.12;
    let sellBonus = 1.1;

    if (approach === 'gentle') {
      baseChance = 0.72 + (this.charisma - 10) * 0.03 + rel * 0.02;
      discountBase = 0.08 + Math.min(0.06, (this.charisma - 10) * 0.008);
      sellBonus = 1.07;
    } else if (approach === 'firm') {
      baseChance = 0.34 + (this.charisma - 10) * 0.04 + rel * 0.015;
      discountBase = 0.20 + Math.min(0.10, (this.charisma - 10) * 0.012);
      sellBonus = 1.18;
    } else {
      // 'reasoned': Zəka və ixtisaslaşma (Xalça / Ərzaq biliciliyi) təsir edir
      const lore =
        itemId === 'carpet' || itemId === 'silk'
          ? this.skills.carpetLore || 0
          : meta.max_freshness_days
            ? this.skills.foodLore || 0
            : 0;
      baseChance = 0.48 + (this.intelligence - 8) * 0.035 + lore * 0.03 + rel * 0.02;
      discountBase = 0.14 + Math.min(0.08, (this.intelligence - 8) * 0.01);
      sellBonus = 1.13;
    }

    const winChance = Math.max(0.15, Math.min(0.92, baseChance));
    const won = Math.random() < winChance;

    if (won) {
      this.haggleState[hKey] = {
        buyFactor: 1 - discountBase,
        sellFactor: sellBonus,
        attempted: true,
        status: 'won',
        approach,
        day: this.gameDay,
      };
      this.npcRelations[cityId] = Math.min(10, rel + 1);
      this.stats.hagglesWon += 1;
      if (this.stats.hagglesWon % 3 === 0) {
        this.charisma += 1;
      }
      const pct = Math.round(discountBase * 100);
      this.eventBus.emit('audio:sfx', 'haggle_ok');
      this.eventBus.emit('ui:toast', {
        message: `Tacir: «Bu şərtlərlə razıyam» — ${itemName} alışda -${pct}%, satışda +${Math.round((sellBonus - 1) * 100)}%.`,
        type: 'success',
      });
    } else {
      if (approach === 'firm') {
        this.npcRelations[cityId] = Math.max(-5, rel - 1);
      }
      this.haggleState[hKey] = {
        buyFactor: approach === 'firm' ? 1.08 : 1.03,
        sellFactor: approach === 'firm' ? 0.94 : 0.98,
        attempted: true,
        status: 'lost',
        approach,
        day: this.gameDay,
      };
      this.eventBus.emit('audio:sfx', 'haggle_fail');
      this.eventBus.emit('ui:toast', {
        message:
          approach === 'firm'
            ? `Tacir: «Bu qiymətə verə bilmərəm!» (Münasibət -1).`
            : `Tacir geri çəkilmədi — ${itemName} üçün endirim alınmadı.`,
        type: 'warn',
      });
    }

    this.emitState();
    return { ok: won };
  }

  update(dt) {
    let changed = false;

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
      changed = true;
    }
    if (this.guardBoostTimer > 0) {
      this.guardBoostTimer = Math.max(0, this.guardBoostTimer - dt);
      changed = true;
    }

    this.dayElapsedSec += dt;
    if (this.dayElapsedSec >= SECONDS_PER_GAME_DAY) {
      this.dayElapsedSec -= SECONDS_PER_GAME_DAY;
      this.gameDay += 1;
      // Yeni gün açıldıqda köhnə günün bazarlıq qıfıllarını yenilə
      for (const [k, v] of Object.entries(this.haggleState)) {
        if (v && typeof v.day === 'number' && v.day < this.gameDay) {
          delete this.haggleState[k];
        }
      }
      changed = true;
    }

    const dayDelta = dt / SECONDS_PER_GAME_DAY;
    for (const [itemId, batches] of Object.entries(this.inventoryBatches)) {
      if (!batches || batches.length === 0) continue;
      const meta = this.data.getItemMeta(itemId);
      if (!meta.max_freshness_days) continue;

      let expiredQty = 0;
      let bucketBoundaryChanged = false;

      for (const b of batches) {
        if (b.daysLeft == null) continue;
        const prev = b.daysLeft;
        const next = prev - dayDelta;
        b.daysLeft = next;
        if (Math.floor(prev * 5) !== Math.floor(next * 5)) {
          bucketBoundaryChanged = true;
        }
      }

      for (let i = batches.length - 1; i >= 0; i--) {
        if (batches[i].daysLeft != null && batches[i].daysLeft <= 0) {
          expiredQty += batches[i].qty;
          batches.splice(i, 1);
        }
      }

      if (expiredQty > 0) {
        this.stats.spoiledCount += expiredQty;
        this._syncInventoryFromBatches();
        this.eventBus.emit('audio:sfx', 'alert');
        this.eventBus.emit('ui:toast', {
          message: `Möhlət bitdi: ${expiredQty}× ${meta.name} yolda xarab olub heybədən çıxarıldı.`,
          type: 'danger',
        });
        changed = true;
      } else if (bucketBoundaryChanged) {
        this._syncInventoryFromBatches();
        changed = true;
      }
    }

    if (changed) {
      this.emitState();
    }
  }

  setCurrentCity(cityId) {
    if (this.currentCityId === cityId) return;
    this.currentCityId = cityId;

    if (cityId) {
      // Yalnız başqa bir şəhərdən gələndə bu şəhərin bazarlığını sıfırla (kənara çıxıb-girmə istismarının qarşısını alır)
      if (this.lastHaggleCityId && this.lastHaggleCityId !== cityId) {
        for (const k of Object.keys(this.haggleState)) {
          if (k.startsWith(`${cityId}_`)) delete this.haggleState[k];
        }
      }
      this.lastHaggleCityId = cityId;

      const firstVisit = !this.visitedCityIds.has(cityId);
      this.visitedCityIds.add(cityId);
      this.cityPriceIntel[cityId] = { day: this.gameDay };
      const city = this.data.getCityById(cityId);

      if (city) {
        this.eventBus.emit('audio:play_city', city.music_track);
        if (firstVisit) {
          this.intelligence += 1;
          this.eventBus.emit('ui:toast', {
            message: `${city.display_name} salnaməyə yazıldı (+1 Zəka).`,
            type: 'info',
          });
        }
        this.tryDeliverQuests(cityId);
      }
    }

    this.emitState();
  }

  buyItem(cityId, itemId, qty = 1) {
    const analysis = this.getMarketAnalysis(cityId, itemId);
    if (!analysis || !analysis.isLocalGood || analysis.effectiveBuy == null) {
      return { ok: false, message: 'Bu mal cari bazarda alışda yoxdur.' };
    }

    if (this.getTotalItems() + qty > this.maxInventory) {
      const msg = `Heybədə yer çatmır (${this.maxInventory}/${this.maxInventory}).`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    const addWeight = this.getItemWeight(itemId) * qty;
    if (this.getTotalWeight() + addWeight > this.caravan.maxWeight) {
      const msg = `Karvanın çəki limiti doludur (${this.getTotalWeight()}/${this.caravan.maxWeight} kq).`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    const totalCost = analysis.effectiveBuy * qty;
    if (this.gold < totalCost) {
      const msg = `Xəzinədə kifayət qədər qızıl yoxdur (tələb olunan: ${totalCost}).`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    this.gold -= totalCost;
    this.stats.tradesCount += 1;

    const maxDays = analysis.good.max_freshness_days ?? null;
    if (!this.inventoryBatches[itemId]) this.inventoryBatches[itemId] = [];

    // Eyni gündə, eyni şəhərdən və eyni təzəlikdə alınan partiyaları səliqəli birləşdir
    const mergeTarget = this.inventoryBatches[itemId].find(
      (b) =>
        b.originCityId === cityId &&
        b.buyPrice === analysis.effectiveBuy &&
        (maxDays == null || Math.abs((b.daysLeft ?? 0) - maxDays) < 0.08)
    );

    if (mergeTarget) {
      mergeTarget.qty += qty;
    } else {
      this.inventoryBatches[itemId].push({
        qty,
        daysLeft: maxDays,
        maxDays,
        buyPrice: analysis.effectiveBuy,
        originCityId: cityId,
        acquiredDay: this.gameDay,
      });
    }

    this._syncInventoryFromBatches();
    this._adjustSupply(cityId, itemId, 0.04 * qty);

    // İxtisaslaşma bacarıqları (ucuz təkrar istismarı məhdudlaşdırmaq üçün alışda +1 limitli)
    if ((itemId === 'carpet' || itemId === 'silk') && this.skills.carpetLore < 10) {
      this.skills.carpetLore = Math.min(10, this.skills.carpetLore + 1);
    } else if (analysis.good.max_freshness_days && this.skills.foodLore < 10) {
      this.skills.foodLore = Math.min(10, this.skills.foodLore + 1);
    }

    this.eventBus.emit('audio:sfx', 'trade');
    this.eventBus.emit('ui:toast', {
      message: `${qty}× ${analysis.good.name} heybəyə vuruldu (-${totalCost} qızıl).`,
      type: 'success',
    });

    if (itemId === 'horse_gear' && !this.caravan.equippedHorseGear) {
      this.caravan.equippedHorseGear = true;
      this.eventBus.emit('ui:toast', {
        message: 'Qarabağ Atı ləvazimatı karvana qoşuldu (+35% sürət).',
        type: 'info',
      });
    }

    this.tryDeliverQuests(cityId);
    this.emitState();
    return { ok: true, message: 'Alış uğurludur.' };
  }

  sellItem(cityId, itemId, qty = 1) {
    const city = this.data.getCityById(cityId);
    if (!city) return { ok: false, message: 'Şəhər tapılmadı.' };

    const currentQty = this.inventory[itemId] || 0;
    const sellCount = Math.min(qty, currentQty);
    if (sellCount <= 0) {
      const msg = 'Heybənizdə bu əmtəədən yoxdur.';
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    const hKey = `${cityId}_${itemId}`;
    const haggle = this.haggleState[hKey] || { sellFactor: 1 };
    const localGood = city.goods.find((g) => g.item_id === itemId);
    const baseSell = localGood ? localGood.sell_price : this.getCityImportSellPrice(cityId, itemId);

    // Hər FIFO partiyasını öz real təzəlik əmsalı ilə hesabla
    const consumed = this._consumeFromBatches(itemId, sellCount);
    let earned = 0;
    for (const part of consumed) {
      const freshMult = this._batchRatioMultiplier(part.daysLeft, part.maxDays);
      const unit = Math.max(4, Math.round(baseSell * (haggle.sellFactor || 1) * freshMult));
      earned += unit * part.qty;
    }

    this.gold += earned;
    this.stats.tradesCount += 1;

    this.eventBus.emit('audio:sfx', 'coin');
    this.eventBus.emit('ui:toast', {
      message: `${sellCount}× ${this.data.getItemName(itemId)} təhvil verildi (+${earned} qızıl).`,
      type: 'success',
    });

    this.checkVictory();
    this.emitState();
    return { ok: true, earned };
  }

  discardItem(itemId, qty = 1) {
    const currentQty = this.inventory[itemId] || 0;
    const dropCount = Math.min(qty, currentQty);
    if (dropCount <= 0) return { ok: false };

    this._consumeFromBatches(itemId, dropCount);
    this.eventBus.emit('ui:toast', {
      message: `${dropCount}× ${this.data.getItemName(itemId)} yükdən boşaldıldı.`,
      type: 'info',
    });
    this.emitState();
    return { ok: true };
  }

  acceptQuest(quest) {
    if (!quest) return false;
    if (this.activeQuests.some((q) => q.quest_id === quest.quest_id)) return false;

    this.activeQuests.push({ ...quest });
    this.eventBus.emit('audio:sfx', 'quest');
    this.eventBus.emit('ui:toast', {
      message: `Əmanət qəbul edildi: «${quest.title}»`,
      type: 'info',
    });

    if (quest.target_city === 'ANY') {
      this.tryDeliverQuests('ANY');
    } else if (this.currentCityId === quest.target_city) {
      this.tryDeliverQuests(this.currentCityId);
    }

    this.emitState();
    return true;
  }

  tryDeliverQuests(cityId) {
    const remaining = [];
    let deliveredAny = false;

    for (const q of this.activeQuests) {
      const matchesCity = q.target_city === 'ANY' || q.target_city === cityId;
      const haveAmount = this.inventory[q.required_item] || 0;

      if (matchesCity && haveAmount >= q.required_amount) {
        this._consumeFromBatches(q.required_item, q.required_amount);
        this.gold += q.reward_gold;
        this.charisma += 1;
        this.completedQuestIds.add(q.quest_id);
        deliveredAny = true;

        this.eventBus.emit('audio:sfx', 'victory_small');
        this.eventBus.emit('ui:toast', {
          message: `Əmanət yerinə çatdı: «${q.title}» (+${q.reward_gold} qızıl, +1 Xarizma).`,
          type: 'success',
        });
      } else {
        remaining.push(q);
      }
    }

    if (deliveredAny) {
      this.activeQuests = remaining;
      this.checkVictory();
      this.emitState();
    }
    return deliveredAny;
  }

  applyHistoricalEventChoice(eventObj, choiceIndex) {
    if (!eventObj) return;
    const choice = eventObj.choices?.[choiceIndex] || eventObj.choices?.[0];

    if (!this.discoveredEventIds.has(eventObj.event_id)) {
      this.discoveredEventIds.add(eventObj.event_id);
      this.discoveredEvents.push(eventObj);
    }

    if (choice?.effect) {
      if (choice.effect.gold) this.gold += choice.effect.gold;
      if (choice.effect.charisma) this.charisma += choice.effect.charisma;
      if (choice.effect.intelligence) this.intelligence += choice.effect.intelligence;
      if (choice.effect.speed_boost_sec) {
        this.speedBoostTimer = Math.max(this.speedBoostTimer, choice.effect.speed_boost_sec);
      }
      if (choice.effect.guard_boost_sec) {
        this.guardBoostTimer = Math.max(this.guardBoostTimer, choice.effect.guard_boost_sec);
      }
      if (choice.effect.refresh_produce) {
        this.refreshAllProduce();
      }
    }

    this.eventBus.emit('audio:sfx', 'quest');
    this.eventBus.emit('ui:toast', {
      message: `Salnaməyə həkk olundu: ${eventObj.title} (${eventObj.era})`,
      type: 'success',
    });

    this.checkVictory();
    this.emitState();
    return;
  }

  stealFromCaravan() {
    this.stats.timesRobbed += 1;
    const heldItems = Object.entries(this.inventory).filter(([, count]) => count > 0);

    let resultMsg;
    if (heldItems.length > 0 && Math.random() < 0.6) {
      const [itemId] = heldItems[Math.floor(Math.random() * heldItems.length)];
      this._consumeFromBatches(itemId, 1);
      resultMsg = `Haramzadə quldur heybədən 1× ${this.data.getItemName(itemId)} qoparıb qaçdı!`;
    } else {
      const stolenGold = Math.min(this.gold, 25);
      this.gold -= stolenGold;
      resultMsg =
        stolenGold > 0
          ? `Quldur basqınında kisədən ${stolenGold} qızıl itirildi!`
          : 'Quldur həmlə etdi, lakin xəzinə kisəsinə əli çatmadı!';
    }

    this.eventBus.emit('audio:sfx', 'alert');
    this.eventBus.emit('ui:toast', { message: resultMsg, type: 'danger' });
    this.emitState();
    return resultMsg;
  }

  recordThiefRepelled() {
    this.stats.thievesRepelled += 1;
    this.gold += 15;
    this.eventBus.emit('audio:sfx', 'guard');
    this.eventBus.emit('ui:toast', {
      message: 'Karvan keşikçisi qulduru dəf etdi (+15 qızıl ənam).',
      type: 'success',
    });
    this.checkVictory();
    this.emitState();
  }

  checkVictory() {
    if (this.victoryReached) return;
    if (this.gold >= this.winGoldGoal) {
      this.victoryReached = true;
      this.eventBus.emit('audio:sfx', 'victory');
      this.eventBus.emit('game:victory', this.getSnapshot());
    }
  }

  dismissVictory() {
    this.victoryDismissed = true;
    this.saveToStorage();
  }

  /**
   * 2D Xəritədə Sürətli Səfər (Fast-Travel) simulyasiyası:
   * Gün irəliləyir, yol azuqə xərci çıxılır, bağ nemətlərinin möhləti azalır,
   * yol hadisəsi (keşikçi uğuru / sakit keçid / quldur həmləsi) hesablanır və qısa hesabat qaytarılır.
   */
  completeFastTravel(fromCityId, toCityId, daysElapsed = 1.4, travelMode = 'normal') {
    const fromCity = fromCityId ? this.data.getCityById(fromCityId) : null;
    const toCity = this.data.getCityById(toCityId);
    if (!toCity) return null;

    let timeMult = this.hasHorseBonus() ? 0.72 : 1.0;
    let extraCost = 0;
    if (travelMode === 'rushed') {
      timeMult *= 0.72;
      extraCost = 10;
      this.caravan.wagonCondition = Math.max(40, (this.caravan.wagonCondition ?? 100) - 8);
      this.caravan.horseCondition = Math.max(40, (this.caravan.horseCondition ?? 100) - 6);
    } else if (travelMode === 'guarded') {
      extraCost = 12;
      this.guardBoostTimer = Math.max(this.guardBoostTimer, 20);
    }

    const effectiveDays = Number(Math.max(0.5, daysElapsed * timeMult).toFixed(1));
    const wholeDays = Math.max(1, Math.round(effectiveDays));
    this.gameDay += wholeDays;
    this.skills.roadExp = Math.min(10, (this.skills.roadExp || 0) + 1);

    // Yeni günə görə köhnə bazarlıq qıfıllarını təmizlə
    for (const [k, v] of Object.entries(this.haggleState)) {
      if (v && typeof v.day === 'number' && v.day < this.gameDay) {
        delete this.haggleState[k];
      }
    }

    // Karvan yol azuqəsi və seçilmiş səfər üsulu xərci
    const cargoCount = this.getTotalItems();
    const roadCost = Math.min(this.gold, 4 + Math.round(cargoCount * 0.8) + extraCost);
    this.gold -= roadCost;

    // Bağ nemətlərinin möhlət azalması
    const spoiledItems = [];
    for (const [itemId, batches] of Object.entries(this.inventoryBatches)) {
      if (!batches || batches.length === 0) continue;
      const meta = this.data.getItemMeta(itemId);
      if (!meta.max_freshness_days) continue;

      let expiredQty = 0;
      for (const b of batches) {
        if (b.daysLeft != null) b.daysLeft -= effectiveDays;
      }
      for (let i = batches.length - 1; i >= 0; i--) {
        if (batches[i].daysLeft != null && batches[i].daysLeft <= 0) {
          expiredQty += batches[i].qty;
          batches.splice(i, 1);
        }
      }
      if (expiredQty > 0) {
        this.stats.spoiledCount += expiredQty;
        spoiledItems.push(`${expiredQty}× ${meta.name}`);
      }
    }
    this._syncInventoryFromBatches();

    // Təsadüfi yol qeydi
    let roadNote = 'Karvan daş körpüləri və dərələri sağ-salamat aşdı.';
    let bonusGold = 0;
    const roll = Math.random();
    if (roll < 0.28) {
      bonusGold = 15;
      this.gold += bonusGold;
      this.stats.thievesRepelled += 1;
      roadNote = 'Yol kənarında pusqu quran quldur dəstəsi keşikçi tərəfindən dəf edildi (+15 qızıl ənam).';
    } else if (roll < 0.48) {
      bonusGold = 8;
      this.gold += bonusGold;
      roadNote = 'Karvan yolunda rast gəlinən səyyahlarla faydalı mübadilə aparıldı (+8 qızıl).';
    }

    // Şəhərə çatış və tapşırıq təhvili
    const prevGold = this.gold;
    this.setCurrentCity(toCityId);
    const questDeltaGold = Math.max(0, this.gold - prevGold);

    this.checkVictory();
    this.emitState();

    return {
      fromName: fromCity?.short_name || 'Karvan Yolu',
      toCityId,
      toName: toCity.display_name,
      toShort: toCity.short_name || toCity.display_name,
      eraName: toCity.era_name,
      daysSpent: effectiveDays,
      wholeDays,
      roadCost,
      bonusGold,
      questDeltaGold,
      spoiledItems,
      roadNote,
      perishables: this.getHeldPerishables(),
    };
  }

  getSnapshot() {
    return {
      gold: this.gold,
      winGoldGoal: this.winGoldGoal,
      charisma: this.charisma,
      intelligence: this.intelligence,
      forecastTrust: this.getForecastTrustPercent(),
      gameDay: this.gameDay,
      maxInventory: this.maxInventory,
      totalItems: this.getTotalItems(),
      totalWeight: this.getTotalWeight(),
      maxWeight: this.caravan.maxWeight,
      caravan: { ...this.caravan },
      skills: { ...this.skills },
      npcRelations: { ...this.npcRelations },
      inventory: { ...this.inventory },
      detailedInventory: this.getDetailedInventory(this.currentCityId),
      perishables: this.getHeldPerishables(),
      currentCityId: this.currentCityId,
      currentCity: this.currentCityId ? this.data.getCityById(this.currentCityId) : null,
      visitedCityIds: [...this.visitedCityIds],
      activeQuests: this.activeQuests.map((q) => ({ ...q })),
      completedQuestCount: this.completedQuestIds.size,
      discoveredEvents: [...this.discoveredEvents],
      totalEventsCount: this.data.historicalEvents.length,
      hasHorseBonus: this.hasHorseBonus(),
      speedBoostTimer: Math.ceil(this.speedBoostTimer),
      guardBoostTimer: Math.ceil(this.guardBoostTimer),
      stats: { ...this.stats },
    };
  }

  emitState() {
    this.saveToStorage();
    this.eventBus.emit('state:updated', this.getSnapshot());
  }
}
