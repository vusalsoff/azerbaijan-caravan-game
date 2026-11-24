const SAVE_KEY = 'irs_tacirin_yolu_save_v1';
const SECONDS_PER_GAME_DAY = 48;

/**
 * TradeAndQuestManager — "İRS — Tacirin Yolu" iqtisadiyyatı:
 * Qızıl, Xarizma/Zəka, inventar, Bazarlıq et mexanikası,
 * Kənd təsərrüfatı Təzəlik (gün) sistemi, yol tapşırıqları, salnamə və Save/Load.
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

    // Konseptə uyğun RPG göstəriciləri
    this.charisma = 12;
    this.intelligence = 9;
    this.gameDay = 1;
    this.dayElapsedSec = 0;

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

    // Tez xarab olan kənd təsərrüfatı məhsulları üçün qalan gün sayı
    this.itemFreshness = {};

    // Cari şəhərdə hər mal üçün bazarlıq nəticəsi: { [cityId_itemId]: { buyFactor, sellFactor, attempted, status } }
    this.haggleState = {};

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

  saveToStorage() {
    try {
      const payload = {
        gold: this.gold,
        charisma: this.charisma,
        intelligence: this.intelligence,
        gameDay: this.gameDay,
        inventory: this.inventory,
        itemFreshness: this.itemFreshness,
        visitedCityIds: [...this.visitedCityIds],
        activeQuests: this.activeQuests,
        completedQuestIds: [...this.completedQuestIds],
        discoveredEventIds: [...this.discoveredEventIds],
        victoryReached: this.victoryReached,
        victoryDismissed: this.victoryDismissed,
        stats: this.stats,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (typeof saved.gold === 'number') this.gold = saved.gold;
      if (typeof saved.charisma === 'number') this.charisma = saved.charisma;
      if (typeof saved.intelligence === 'number') this.intelligence = saved.intelligence;
      if (typeof saved.gameDay === 'number') this.gameDay = saved.gameDay;
      if (saved.inventory && typeof saved.inventory === 'object') {
        this.inventory = { ...this.inventory, ...saved.inventory };
      }
      if (saved.itemFreshness && typeof saved.itemFreshness === 'object') {
        this.itemFreshness = { ...saved.itemFreshness };
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
      return true;
    } catch {
      return false;
    }
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
    if (city) this.visitedCityIds.add(city);
    this.eventBus.emit('ui:toast', {
      message: 'Yeni səyahət başlandı! (İRS — Tacirin Yolu)',
      type: 'info',
    });
    this.emitState();
  }

  getTotalItems() {
    return Object.values(this.inventory).reduce((sum, n) => sum + n, 0);
  }

  hasHorseBonus() {
    return (this.inventory.horse_gear || 0) > 0;
  }

  getSpeedMultiplier() {
    let mult = 1.0;
    if (this.hasHorseBonus()) mult += 0.35;
    if (this.speedBoostTimer > 0) mult += 0.25;
    return mult;
  }

  getGuardBoostActive() {
    return this.guardBoostTimer > 0;
  }

  getForecastTrustPercent() {
    // Zəka 9 olduqda tam 65% (konsept şəklinizdəki kimi!)
    return Math.min(96, Math.max(40, Math.round(47 + this.intelligence * 2)));
  }

  /**
   * Seçilmiş mal üçün "İRS" ticarət analizi: alış qiyməti, digər şəhərlərdə təxmini satış aralığı,
   * yol xərci, xalis qazanc, proqnoza etibar və bazarlıq statusu.
   */
  getMarketAnalysis(cityId, itemId) {
    const city = this.data.getCityById(cityId);
    if (!city) return null;
    const good = city.goods.find((g) => g.item_id === itemId);
    if (!good) return null;

    const hKey = `${cityId}_${itemId}`;
    const haggle = this.haggleState[hKey] || {
      buyFactor: 1,
      sellFactor: 1,
      attempted: false,
      status: 'none',
    };

    const effectiveBuy = Math.max(5, Math.round(good.buy_price * haggle.buyFactor));
    const freshMult = this.getFreshnessPriceMultiplier(itemId);
    const effectiveSell = Math.max(4, Math.round(good.sell_price * haggle.sellFactor * freshMult));

    // Digər şəhərlərdəki satış qiymətlərindən təxmini satış aralığı hesabla
    const otherPrices = [];
    let bestCityName = null;
    let bestPrice = 0;

    for (const c of this.data.cities) {
      if (c.city_id === cityId) continue;
      const g = c.goods.find((x) => x.item_id === itemId);
      if (g) {
        otherPrices.push(g.sell_price);
        if (g.sell_price > bestPrice) {
          bestPrice = g.sell_price;
          bestCityName = c.short_name || c.display_name;
        }
      }
    }

    const baseBest = otherPrices.length > 0 ? Math.max(...otherPrices) : Math.round(good.buy_price * 1.25);
    const trust = this.getForecastTrustPercent();
    const spreadRatio = Math.max(0.04, (100 - trust) / 360);
    const estSellMin = Math.max(8, Math.round(baseBest * (1 - spreadRatio)));
    const estSellMax = Math.round(baseBest * (1 + spreadRatio));
    const travelCost = good.travel_cost ?? 12;

    return {
      good,
      effectiveBuy,
      effectiveSell,
      estSellMin,
      estSellMax,
      bestCityName: bestCityName || 'Digər şəhər',
      travelCost,
      netMin: estSellMin - effectiveBuy - travelCost,
      netMax: estSellMax - effectiveBuy - travelCost,
      trustPercent: trust,
      quality: good.quality || 'Yaxşı',
      haggle,
      freshness: this.getItemFreshnessInfo(itemId),
    };
  }

  getItemFreshnessInfo(itemId) {
    const meta = this.data.getItemMeta(itemId);
    if (!meta.max_freshness_days) return null;
    const owned = this.inventory[itemId] || 0;
    const currentDays =
      owned > 0 && typeof this.itemFreshness[itemId] === 'number'
        ? this.itemFreshness[itemId]
        : meta.max_freshness_days;
    const ratio = Math.max(0, Math.min(1, currentDays / meta.max_freshness_days));
    return {
      itemId,
      name: meta.name,
      icon: meta.icon,
      daysLeft: Math.max(0, Number(currentDays.toFixed(1))),
      maxDays: meta.max_freshness_days,
      ratio,
      owned,
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

  getFreshnessPriceMultiplier(itemId) {
    const info = this.getItemFreshnessInfo(itemId);
    if (!info || info.owned <= 0) return 1.0;
    if (info.ratio >= 0.6) return 1.0;
    if (info.ratio >= 0.3) return 0.82;
    return 0.58;
  }

  refreshAllProduce() {
    let refreshed = 0;
    for (const [itemId, count] of Object.entries(this.inventory)) {
      if (count <= 0) continue;
      const meta = this.data.getItemMeta(itemId);
      if (meta.max_freshness_days) {
        this.itemFreshness[itemId] = meta.max_freshness_days;
        refreshed++;
      }
    }
    if (refreshed > 0) {
      this.eventBus.emit('ui:toast', {
        message: 'Bütün kənd təsərrüfatı məhsulları təzələndi (100% Təzəlik)!',
        type: 'success',
      });
    }
  }

  haggleItem(cityId, itemId) {
    const city = this.data.getCityById(cityId);
    if (!city) return { ok: false, message: 'Şəhər tapılmadı.' };
    const good = city.goods.find((g) => g.item_id === itemId);
    if (!good) return { ok: false, message: 'Mal tapılmadı.' };

    const hKey = `${cityId}_${itemId}`;
    if (this.haggleState[hKey]?.attempted) {
      this.eventBus.emit('ui:toast', {
        message: `${good.name} üçün bu səfərdə artıq bazarlıq etmisiniz.`,
        type: 'info',
      });
      return { ok: false, message: 'Artıq cəhd edilib.' };
    }

    // Xarizma əsaslı uğur şansı (Xarizma 12 → ~62%)
    const winChance = Math.min(0.88, 0.44 + (this.charisma - 8) * 0.045);
    const won = Math.random() < winChance;

    if (won) {
      const discount = 0.14 + Math.min(0.1, (this.charisma - 10) * 0.012);
      this.haggleState[hKey] = {
        buyFactor: 1 - discount,
        sellFactor: 1.1,
        attempted: true,
        status: 'won',
      };
      this.stats.hagglesWon += 1;
      // Hər 3 uğurlu bazarlıqda +1 Xarizma!
      if (this.stats.hagglesWon % 3 === 0) {
        this.charisma += 1;
        this.eventBus.emit('ui:toast', {
          message: `Bazarlıq ustalığı artdı! +1 Xarizma (${this.charisma})`,
          type: 'success',
        });
      }
      const pct = Math.round(discount * 100);
      this.eventBus.emit('audio:sfx', 'haggle_ok');
      this.eventBus.emit('ui:toast', {
        message: `Bazarlıq uğurlu oldu! ${good.name} -${pct}% ucuzlaşdı!`,
        type: 'success',
      });
    } else {
      this.haggleState[hKey] = {
        buyFactor: 1.05,
        sellFactor: 0.96,
        attempted: true,
        status: 'lost',
      };
      this.eventBus.emit('audio:sfx', 'haggle_fail');
      this.eventBus.emit('ui:toast', {
        message: `Tacir inad etdi — ${good.name} qiyməti bir az qalxdı (+5%).`,
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

    // Oyun günü və kənd təsərrüfatı məhsullarının təzəlik azalması
    this.dayElapsedSec += dt;
    if (this.dayElapsedSec >= SECONDS_PER_GAME_DAY) {
      this.dayElapsedSec -= SECONDS_PER_GAME_DAY;
      this.gameDay += 1;
      changed = true;
    }

    const dayDelta = dt / SECONDS_PER_GAME_DAY;
    for (const [itemId, count] of Object.entries(this.inventory)) {
      if (count <= 0) continue;
      const meta = this.data.getItemMeta(itemId);
      if (!meta.max_freshness_days) continue;

      const prev =
        typeof this.itemFreshness[itemId] === 'number'
          ? this.itemFreshness[itemId]
          : meta.max_freshness_days;
      const next = prev - dayDelta;

      if (next <= 0) {
        this.inventory[itemId] -= 1;
        this.stats.spoiledCount += 1;
        if (this.inventory[itemId] > 0) {
          this.itemFreshness[itemId] = meta.max_freshness_days * 0.65;
        } else {
          delete this.itemFreshness[itemId];
        }
        this.eventBus.emit('audio:sfx', 'alert');
        this.eventBus.emit('ui:toast', {
          message: `Təzəlik bitdi! 1× ${meta.name} yolda xarab oldu.`,
          type: 'danger',
        });
        changed = true;
      } else {
        this.itemFreshness[itemId] = next;
        // Hər 0.2 gün dəyişəndə UI-ı yumşaq yenilə
        if (Math.floor(prev * 5) !== Math.floor(next * 5)) {
          changed = true;
        }
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
      // Yeni şəhərə girəndə bazarlıq cəhdlərini yenilə
      for (const k of Object.keys(this.haggleState)) {
        if (k.startsWith(`${cityId}_`)) delete this.haggleState[k];
      }

      const firstVisit = !this.visitedCityIds.has(cityId);
      this.visitedCityIds.add(cityId);
      const city = this.data.getCityById(cityId);

      if (city) {
        this.eventBus.emit('audio:play_city', city.music_track);
        if (firstVisit) {
          this.intelligence += 1;
          this.eventBus.emit('ui:toast', {
            message: `${city.display_name} kəşf edildi! (+1 Zəka)`,
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
    if (!analysis) return { ok: false, message: 'Mal tapılmadı.' };

    if (this.getTotalItems() + qty > this.maxInventory) {
      const msg = `Karvan çantası doludur (${this.maxInventory}/${this.maxInventory})!`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    const totalCost = analysis.effectiveBuy * qty;
    if (this.gold < totalCost) {
      const msg = `Kifayət qədər qızıl yoxdur (lazımdır: ${totalCost}).`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    this.gold -= totalCost;
    const prevQty = this.inventory[itemId] || 0;
    this.inventory[itemId] = prevQty + qty;
    this.stats.tradesCount += 1;

    // Kənd təsərrüfatı məhsulu alınıbsa təzəliyi təyin et / ortala
    const maxDays = analysis.good.max_freshness_days;
    if (maxDays) {
      if (prevQty === 0 || typeof this.itemFreshness[itemId] !== 'number') {
        this.itemFreshness[itemId] = maxDays;
      } else {
        this.itemFreshness[itemId] =
          (this.itemFreshness[itemId] * prevQty + maxDays * qty) / (prevQty + qty);
      }
    }

    this.eventBus.emit('audio:sfx', 'trade');
    this.eventBus.emit('ui:toast', {
      message: `${qty}× ${analysis.good.name} alındı (-${totalCost} qızıl)`,
      type: 'success',
    });

    if (itemId === 'horse_gear') {
      this.eventBus.emit('ui:toast', {
        message: 'Qarabağ Atı bonusu aktivdir (+35% karvan sürəti)!',
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
    if (currentQty < qty) {
      const msg = 'Çantanızda bu maldan yoxdur.';
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    const analysis = this.getMarketAnalysis(cityId, itemId);
    const unitPrice = analysis
      ? analysis.effectiveSell
      : Math.round(this.getFallbackSellPrice(itemId) * this.getFreshnessPriceMultiplier(itemId));
    const earned = unitPrice * qty;

    this.inventory[itemId] -= qty;
    if (this.inventory[itemId] <= 0) {
      delete this.itemFreshness[itemId];
    }
    this.gold += earned;
    this.stats.tradesCount += 1;

    this.eventBus.emit('audio:sfx', 'coin');
    this.eventBus.emit('ui:toast', {
      message: `${qty}× ${this.data.getItemName(itemId)} satıldı (+${earned} qızıl)`,
      type: 'success',
    });

    this.checkVictory();
    this.emitState();
    return { ok: true, message: 'Satış uğurludur.' };
  }

  getFallbackSellPrice(itemId) {
    for (const city of this.data.cities) {
      const g = city.goods.find((x) => x.item_id === itemId);
      if (g) return Math.round(g.sell_price * 0.9);
    }
    return 25;
  }

  acceptQuest(quest) {
    if (!quest) return false;
    if (this.activeQuests.some((q) => q.quest_id === quest.quest_id)) return false;

    this.activeQuests.push({ ...quest });
    this.eventBus.emit('audio:sfx', 'quest');
    this.eventBus.emit('ui:toast', {
      message: `Yeni tapşırıq qəbul edildi: ${quest.title}`,
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
        this.inventory[q.required_item] -= q.required_amount;
        if (this.inventory[q.required_item] <= 0) {
          delete this.itemFreshness[q.required_item];
        }
        this.gold += q.reward_gold;
        this.charisma += 1;
        this.completedQuestIds.add(q.quest_id);
        deliveredAny = true;

        this.eventBus.emit('audio:sfx', 'victory_small');
        this.eventBus.emit('ui:toast', {
          message: `Tapşırıq tamamlandı: "${q.title}" (+${q.reward_gold} qızıl, +1 Xarizma)!`,
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
      message: `Salnamə yeniləndi: ${eventObj.title} (${eventObj.era})`,
      type: 'success',
    });

    this.checkVictory();
    this.emitState();
  }

  stealFromCaravan() {
    this.stats.timesRobbed += 1;
    const heldItems = Object.entries(this.inventory).filter(([, count]) => count > 0);

    let resultMsg;
    if (heldItems.length > 0 && Math.random() < 0.6) {
      const [itemId] = heldItems[Math.floor(Math.random() * heldItems.length)];
      this.inventory[itemId] -= 1;
      if (this.inventory[itemId] <= 0) delete this.itemFreshness[itemId];
      resultMsg = `Oğru karvandan 1× ${this.data.getItemName(itemId)} oğurladı!`;
    } else {
      const stolenGold = Math.min(this.gold, 25);
      this.gold -= stolenGold;
      resultMsg =
        stolenGold > 0
          ? `Oğru karvandan ${stolenGold} qızıl oğurladı!`
          : 'Oğru yaxınlaşdı, amma qızıl tapa bilmədi!';
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
      message: 'Qoruyucu oğrunu uzaqlaşdırdı! (+15 qızıl mükafat)',
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
      inventory: { ...this.inventory },
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
