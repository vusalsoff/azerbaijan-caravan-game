/**
 * TradeAndQuestManager — Qızıl, inventar, şəhər alqı-satqısı,
 * yol tapşırıqları (quests.json) və tarixi salnamə (events.json) vəziyyətini idarə edir.
 */
export class TradeAndQuestManager {
  constructor(dataLoader, eventBus) {
    this.data = dataLoader;
    this.eventBus = eventBus;

    this.gold = 120;
    this.winGoldGoal = 1000;
    this.maxInventory = 10;
    this.inventory = {
      salt: 0,
      oil: 0,
      silk: 0,
      halva: 0,
      carpet: 0,
      horse_gear: 0,
    };

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
      thievesRepelled: 0,
      timesRobbed: 0,
    };
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
    if (changed) {
      this.emitState();
    }
  }

  setCurrentCity(cityId) {
    if (this.currentCityId === cityId) return;
    this.currentCityId = cityId;

    if (cityId) {
      const firstVisit = !this.visitedCityIds.has(cityId);
      this.visitedCityIds.add(cityId);
      const city = this.data.getCityById(cityId);

      if (city) {
        this.eventBus.emit('audio:play_city', city.music_track);
        if (firstVisit) {
          this.eventBus.emit('ui:toast', {
            message: `${city.display_name} kəşf edildi — ${city.era_name}`,
            type: 'info',
          });
        }
        this.tryDeliverQuests(cityId);
      }
    }

    this.emitState();
  }

  buyItem(cityId, itemId, qty = 1) {
    const city = this.data.getCityById(cityId);
    if (!city) return { ok: false, message: 'Şəhər tapılmadı.' };

    const good = city.goods.find((g) => g.item_id === itemId);
    if (!good) return { ok: false, message: 'Bu mal bu şəhərdə satılmır.' };

    if (this.getTotalItems() + qty > this.maxInventory) {
      const msg = `Karvan çantası doludur (${this.maxInventory}/${this.maxInventory})!`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    const totalCost = good.buy_price * qty;
    if (this.gold < totalCost) {
      const msg = `Kifayət qədər qızıl yoxdur (lazımdır: ${totalCost}).`;
      this.eventBus.emit('ui:toast', { message: msg, type: 'warn' });
      return { ok: false, message: msg };
    }

    this.gold -= totalCost;
    this.inventory[itemId] = (this.inventory[itemId] || 0) + qty;
    this.stats.tradesCount += 1;

    this.eventBus.emit('audio:sfx', 'trade');
    this.eventBus.emit('ui:toast', {
      message: `${qty}× ${good.name} alındı (-${totalCost} qızıl)`,
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

    const good = city.goods.find((g) => g.item_id === itemId);
    // Şəhər siyahısında olmayan malı da baza satış qiymətinə sata bilsin ki, oyunçu ilişməsin
    const unitPrice = good ? good.sell_price : this.getFallbackSellPrice(itemId);
    const earned = unitPrice * qty;

    this.inventory[itemId] -= qty;
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
        this.gold += q.reward_gold;
        this.completedQuestIds.add(q.quest_id);
        deliveredAny = true;

        this.eventBus.emit('audio:sfx', 'victory_small');
        this.eventBus.emit('ui:toast', {
          message: `Tapşırıq tamamlandı: "${q.title}" (+${q.reward_gold} qızıl)!`,
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
      if (choice.effect.gold) {
        this.gold += choice.effect.gold;
      }
      if (choice.effect.speed_boost_sec) {
        this.speedBoostTimer = Math.max(this.speedBoostTimer, choice.effect.speed_boost_sec);
      }
      if (choice.effect.guard_boost_sec) {
        this.guardBoostTimer = Math.max(this.guardBoostTimer, choice.effect.guard_boost_sec);
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
    this.gold += 15; // Kiçik müdafiə mükafatı
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
  }

  getSnapshot() {
    return {
      gold: this.gold,
      winGoldGoal: this.winGoldGoal,
      maxInventory: this.maxInventory,
      totalItems: this.getTotalItems(),
      inventory: { ...this.inventory },
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
    this.eventBus.emit('state:updated', this.getSnapshot());
  }
}
