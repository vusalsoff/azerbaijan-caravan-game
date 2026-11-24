import { renderItemSvg, renderSigil, renderSeljukStarDivider } from './AntiqueIcons.js';

/**
 * UI/UIManager.js — "İRS — Tacirin Yolu"
 * Qədim Divan Əlyazması & Əmlak Mücrüsü (Lord of the Mysteries × Tarixi Azərbaycan estetikası):
 * - Mis-qravür vektor simvollar, ikiqat bürünc çərçivəli lövhələr, surğuç möhürləri
 * - 12 gözlü "Karvan Heybəsi" (FIFO partiyalar, alış maya dəyəri, tarixi mənşə, tacir sirri, yük boşaltma)
 * - Karvansaray sağ bazar panelində "Piştaxta" və "Heybəm (Satış)" sekmələri (şəhərlərarası tam satış)
 * - Antispam (cooldown + dublikat birləşdirmə) bildiriş sistemi
 */
export class UIManager {
  constructor(rootEl, eventBus, data, tradeManager) {
    this.rootEl = rootEl;
    this.eventBus = eventBus;
    this.data = data;
    this.tradeManager = tradeManager;

    this.mounted = false;
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = false;
    this.muted = false;

    this.selectedMarketItemId = null;
    this.dockedMarketTab = 'stall'; // 'stall' | 'bag'
    this.selectedVaultItemId = null;

    this.hudEl = null;
    this.modalEl = null;
    this.toastEl = null;
    this.lastState = null;

    // Toast antispam izləyicisi: Map<message, { el, timerId, count, lastAt }>
    this._activeToasts = new Map();
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.rootEl.innerHTML = `
      <div id="HUDPanel"></div>
      <div id="ModalContainer"></div>
      <div id="ToastStack" class="toast-stack"></div>
    `;
    this.hudEl = this.rootEl.querySelector('#HUDPanel');
    this.modalEl = this.rootEl.querySelector('#ModalContainer');
    this.toastEl = this.rootEl.querySelector('#ToastStack');
  }

  unmount() {
    this.mounted = false;
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = false;
    this._activeToasts.clear();
    this.rootEl.innerHTML = '';
  }

  isMarketOpen() {
    return this.marketOpen;
  }

  isInventoryOpen() {
    return this.inventoryOpen;
  }

  isAnyModalOpen() {
    return this.marketOpen || this.mapOpen || this.inventoryOpen;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.lastState) this.updateHUD(this.lastState);
  }

  _freshnessColor(ratio) {
    if (ratio >= 0.6) return 'linear-gradient(90deg, #3d6e47, #72a868)';
    if (ratio >= 0.3) return 'linear-gradient(90deg, #966d22, #d4a448)';
    return 'linear-gradient(90deg, #8a2c24, #c95244)';
  }

  _renderFreshnessRows(perishables) {
    if (!perishables || perishables.length === 0) {
      return '<div style="font-size:12px;color:#9e8b6e;font-style:italic;">Heybədə tez xarab olan bağ neməti yoxdur.</div>';
    }
    return perishables
      .map(
        (p) => `
      <div class="freshness-row">
        <span style="display:inline-flex;align-items:center;gap:5px;color:#e6d7bc;">
          ${renderItemSvg(p.itemId, 15)}
          <span>${p.name}</span>
          <small style="color:#a89474">(${p.owned}×)</small>
        </span>
        <div class="freshness-track">
          <div class="freshness-fill" style="width:${Math.round(p.ratio * 100)}%;background:${this._freshnessColor(p.ratio)};"></div>
        </div>
        <span style="text-align:right;color:#dfd0b4;">${p.daysLeft} g.</span>
      </div>`
      )
      .join('');
  }

  updateHUD(state) {
    this.lastState = state;
    if (!this.hudEl) return;

    const isGTA = state.cameraMode === 'gta';
    const isBazaar = state.sceneName === 'Caravanserai_Bazaar';
    const eraBanner = state.currentCity
      ? `${state.currentCity.short_name || state.currentCity.display_name} · ${state.currentCity.era_name}`
      : `Qədim İpək Yolu · Gün ${state.gameDay}`;

    const bonuses = [];
    if (state.hasHorseBonus) bonuses.push('Köhlən +35%');
    if (state.speedBoostTimer > 0) bonuses.push(`Çeviklik ${state.speedBoostTimer}s`);
    if (state.guardBoostTimer > 0) bonuses.push(`Keşik ${state.guardBoostTimer}s`);

    const prox = state.bazaarProximity;
    const bottomActionHtml = isBazaar
      ? prox?.type === 'exit_to_map'
        ? `<button id="btn-exit-map" class="btn-primary">
            <span class="key-cap">E</span>
            <span>Qədim Xəritəyə Çıx</span>
          </button>`
        : `<button id="btn-open-market" class="btn-primary">
            <span class="key-cap">E</span>
            <span>${prox?.label || 'Tacirlə Sövdələş'}</span>
          </button>
          <span style="color:#b8a484;font-size:12.5px;">WASD: Gəz · Siçan: Baxış · <span class="key-cap">I</span> Heybə</span>`
      : state.currentCity
      ? `<button id="btn-enter-bazaar" class="btn-emerald">
           ${renderSigil('gate', 15)}
           <span>Karvansaraya Daxil Ol</span>
         </button>
         <button id="btn-open-market" class="btn-primary">
           <span class="key-cap">E</span>
           <span>Bazar Dəftəri (${state.currentCity.short_name || state.currentCity.display_name})</span>
         </button>`
      : `<span><strong>Qədim Mənzil Xəritəsi:</strong> Səfər üçün xəritədə istənilən mənzilə klikləyin · <span class="key-cap">WASD</span> Hərəkət · <span class="key-cap">I</span> Heybə · <span class="key-cap">M</span> Salnamə</span>`;

    this.hudEl.innerHTML = `
      <div class="hud-shell">
        <div class="hud-top-row">
          <div class="irs-brand-box lotm-plate">
            <div class="irs-logo">
              <span class="irs-logo-main">İRS</span>
              <span class="irs-logo-sub">Tacirin Yolu</span>
            </div>
            <div class="hud-pill" title="Xəzinə və Hədəf">
              ${renderSigil('coin', 15)}
              <span><strong>${state.gold}</strong> / ${state.winGoldGoal}</span>
            </div>
            <button id="btn-hud-inventory" class="hud-pill clickable" title="Karvan Heybəsini Aç (I)">
              ${renderSigil('satchel', 15)}
              <span>Heybə: <strong>${state.totalItems}/${state.maxInventory}</strong></span>
            </button>
            <div class="hud-pill" title="Səfər Günü">
              ${renderSigil('sun', 15)}
              <span>Gün <strong>${state.gameDay}</strong></span>
            </div>
            ${bonuses.map((b) => `<div class="hud-pill">${b}</div>`).join('')}
          </div>

          <div class="irs-era-banner lotm-plate">✦ ${eraBanner} ✦</div>

          <div class="hud-actions-bar lotm-plate">
            ${
              isBazaar
                ? `<button id="btn-exit-map-top" class="btn-primary">${renderSigil('compass', 15)} <span>Qədim Xəritə (X)</span></button>`
                : ''
            }
            <button id="btn-inv-top" class="btn-secondary" title="Karvan Heybəsi (I)">
              ${renderSigil('satchel', 15)}
              <span>Heybə (I)</span>
            </button>
            <button id="btn-map" class="btn-secondary" title="Tarixi Salnamə (M)">
              ${renderSigil('scroll', 15)}
              <span>Salnamə (${state.discoveredEvents.length}/${state.totalEventsCount})</span>
            </button>
            <button id="btn-event-test" class="btn-secondary" title="Yol Qarşılaşması">
              ${renderSigil('seal', 15)}
              <span>Rəvayət</span>
            </button>
            <button id="btn-mute" class="btn-secondary" title="Səs">${this.muted ? 'Səssiz' : 'Səs'}</button>
            <button id="btn-reset" class="btn-secondary" title="Səfəri Yenidən Başlat">↺</button>
          </div>
        </div>

        <div class="hud-middle-right" style="${isBazaar && this.marketOpen ? 'display:none;' : ''}">
          <div class="hud-side-card lotm-plate">
            <h4>Divan Əmanətləri (${state.activeQuests.length})</h4>
            ${
              state.activeQuests.length === 0
                ? '<div style="color:#a89474;font-style:italic;">Yol boyu el ağsaqqalları, bağbanlar və xan qasidləri sizə əmanət tapşıracaq.</div>'
                : state.activeQuests
                    .map(
                      (q) => `
                  <div class="quest-mini">
                    <strong style="color:#efe1c6;">${q.title}</strong><br/>
                    <span style="color:#bda886;">${q.npc_name}: ${q.required_amount}× ${this.data.getItemName(q.required_item)} → ${
                        q.target_city === 'ANY'
                          ? 'Hər hansı mənzil'
                          : this.data.getCityById(q.target_city)?.short_name || q.target_city
                      }</span><br/>
                    <span style="color:var(--gold-bright);">Ənam: +${q.reward_gold} qızıl</span>
                  </div>`
                    )
                    .join('')
            }
          </div>

          ${
            state.perishables && state.perishables.length > 0
              ? `<div class="hud-side-card lotm-plate">
                  <h4>Bağ Nemətlərinin Möhləti</h4>
                  ${this._renderFreshnessRows(state.perishables)}
                </div>`
              : ''
          }
        </div>

        <div class="hud-bottom-grid">
          <div class="irs-stats-stack">
            <div class="irs-stat-badge lotm-plate">
              <span style="display:inline-flex;align-items:center;gap:6px;">${renderSigil('charisma', 15)} Nüfuz (Xarizma)</span>
              <strong>${state.charisma}</strong>
            </div>
            <div class="irs-stat-badge lotm-plate">
              <span style="display:inline-flex;align-items:center;gap:6px;">${renderSigil('intelligence', 15)} Fərasət (Zəka)</span>
              <strong>${state.intelligence}</strong>
            </div>
          </div>

          <div class="hud-bottom-center">
            <div class="hud-bottom-hint lotm-plate">
              ${bottomActionHtml}
            </div>
          </div>

          <div style="width:158px;"></div>
        </div>
      </div>
    `;

    this.hudEl.querySelector('#btn-cam-mode')?.addEventListener('click', () => {
      this.eventBus.emit('camera:toggle_mode');
    });
    this.hudEl.querySelector('#btn-enter-bazaar')?.addEventListener('click', () => {
      this.eventBus.emit('scene:enter_bazaar', state.currentCityId);
    });
    this.hudEl.querySelector('#btn-exit-map')?.addEventListener('click', () => {
      this.eventBus.emit('scene:exit_to_world');
    });
    this.hudEl.querySelector('#btn-exit-map-top')?.addEventListener('click', () => {
      this.eventBus.emit('scene:exit_to_world');
    });
    this.hudEl.querySelector('#btn-open-market')?.addEventListener('click', () => {
      this.eventBus.emit('market:open');
    });
    this.hudEl.querySelector('#btn-hud-inventory')?.addEventListener('click', () => {
      this.eventBus.emit('ui:toggle_inventory');
    });
    this.hudEl.querySelector('#btn-inv-top')?.addEventListener('click', () => {
      this.eventBus.emit('ui:toggle_inventory');
    });
    this.hudEl.querySelector('#btn-map')?.addEventListener('click', () => {
      this.eventBus.emit('ui:toggle_map');
    });
    this.hudEl.querySelector('#btn-event-test')?.addEventListener('click', () => {
      this.eventBus.emit('world:trigger_event_now');
    });
    this.hudEl.querySelector('#btn-mute')?.addEventListener('click', () => {
      this.eventBus.emit('audio:toggle_mute');
    });
    this.hudEl.querySelector('#btn-reset')?.addEventListener('click', () => {
      if (window.confirm('Bütün səfər dəftəri və yaddaş sıfırlansın?')) {
        this.eventBus.emit('game:reset');
      }
    });
  }

  /**
   * 12 Gözlü Karvan Heybəsi & Əmlak Mücrüsü (Lord of the Mysteries Təftiş Üslubu)
   */
  toggleInventory(state) {
    if (!this.modalEl) return false;
    if (this.inventoryOpen) {
      this.inventoryOpen = false;
      this.modalEl.innerHTML = '';
      return false;
    }
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = true;
    this.renderInventoryModal(state);
    return true;
  }

  closeAllModals() {
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = false;
    if (this.modalEl) this.modalEl.innerHTML = '';
    if (this.lastState) this.updateHUD(this.lastState);
  }

  renderInventoryModal(state) {
    if (!this.modalEl || !this.inventoryOpen) return;

    const detailed = state.detailedInventory || [];
    if (detailed.length > 0) {
      const exists = detailed.some((d) => d.itemId === this.selectedVaultItemId);
      if (!exists) this.selectedVaultItemId = detailed[0].itemId;
    } else {
      this.selectedVaultItemId = null;
    }

    const selectedEntry = detailed.find((d) => d.itemId === this.selectedVaultItemId) || null;

    // 12 fiziki heybə gözünü doldur (hər vahid və ya mal yığını göz kimi + boş gözlər)
    const slotsHtml = [];
    for (const item of detailed) {
      const isSel = item.itemId === this.selectedVaultItemId;
      slotsHtml.push(`
        <div class="lotm-slot ${isSel ? 'selected' : ''}" data-vault-item="${item.itemId}">
          <span class="lotm-slot-qty">${item.qty}×</span>
          ${renderItemSvg(item.itemId, 28)}
          <div class="lotm-slot-name">${item.meta.name}</div>
          ${
            item.freshness
              ? `<div class="freshness-track" style="width:82%;height:4px;">
                   <div class="freshness-fill" style="width:${Math.round(item.freshness.ratio * 100)}%;background:${this._freshnessColor(item.freshness.ratio)};"></div>
                 </div>`
              : `<span style="font-size:10px;color:#9f8b6c;">${item.meta.unit_label}</span>`
          }
        </div>
      `);
    }

    const emptyCount = Math.max(0, 12 - slotsHtml.length);
    for (let i = 0; i < emptyCount; i++) {
      slotsHtml.push(`
        <div class="lotm-slot empty">
          ${renderSigil('seal', 18)}
          <span style="font-size:10.5px;">Boş Göz</span>
        </div>
      `);
    }

    const cityShort = state.currentCity?.short_name || null;

    this.modalEl.innerHTML = `
      <div id="InventoryModal" class="modal-backdrop">
        <div class="modal-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <div class="wax-seal-tag">${renderSigil('seal', 12)} Divan Əmlak Mücrüsü</div>
              <h2 style="margin-top:6px;">Karvan Heybəsi və Əmtəə Təftişi</h2>
              <div style="font-size:13px;color:var(--text-muted);">
                Tutum: <strong style="color:var(--gold-bright)">${state.totalItems} / ${state.maxInventory}</strong> bağlama ·
                Xəzinə: <strong style="color:var(--gold-bright)">${state.gold} qızıl</strong> ·
                Karvan Sürəti: <strong>${state.hasHorseBonus ? '+35% (Köhlən)' : 'Adi gediş'}</strong>
              </div>
            </div>
            <button id="inv-close" class="btn-secondary">✕ Bağla (I / Esc)</button>
          </div>

          ${renderSeljukStarDivider()}

          <div class="lotm-vault-grid">
            <div>
              <div style="font-family:var(--font-display);font-size:14px;color:var(--gold-bright);letter-spacing:0.06em;margin-bottom:8px;text-transform:uppercase;">
                Heybə Gözləri (${detailed.length} çeşid əmtəə, ${state.totalItems}/${state.maxInventory} yük)
              </div>
              <div class="lotm-slots-matrix">
                ${slotsHtml.join('')}
              </div>
            </div>

            <div class="irs-trade-card">
              ${
                selectedEntry
                  ? `
                <div class="irs-trade-card-title">Əmtəənin Möhür və Mənşə Təftişi</div>
                <div style="display:flex;align-items:center;gap:12px;">
                  <div class="lotm-emblem-box">
                    ${renderItemSvg(selectedEntry.itemId, 30)}
                  </div>
                  <div>
                    <span class="wax-seal-tag">${selectedEntry.meta.seal_title}</span>
                    <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:#f5e7cb;margin-top:3px;">
                      ${selectedEntry.meta.name}
                    </div>
                    <div style="font-size:12px;color:var(--text-muted);">
                      Mənşə: ${selectedEntry.meta.origin_region}
                    </div>
                  </div>
                </div>

                <div class="lotm-lore-box">
                  <div>${selectedEntry.meta.lore}</div>
                  <div class="lotm-whisper">${selectedEntry.meta.merchant_whisper}</div>
                </div>

                <div class="irs-trade-row">
                  <span>Heybədəki miqdar</span>
                  <strong>${selectedEntry.qty}× (${selectedEntry.meta.unit_label})</strong>
                </div>
                <div class="irs-trade-row">
                  <span>Orta alış maya dəyəri</span>
                  <strong>${selectedEntry.avgBuy} qızıl</strong>
                </div>
                <div class="irs-trade-row">
                  <span>Ən sərfəli mənzil</span>
                  <strong style="color:var(--gold-bright);">${selectedEntry.bestTargetCity} (~${selectedEntry.bestTargetPrice} q.)</strong>
                </div>
                ${
                  cityShort && selectedEntry.unitSellHere != null
                    ? `<div class="irs-trade-row profit">
                        <span>Cari mənzildə (${cityShort}) satış</span>
                        <span style="color:${selectedEntry.netPerUnitHere >= 0 ? '#84c994' : '#d9786e'};">
                          ${selectedEntry.unitSellHere} q. (${selectedEntry.netPerUnitHere >= 0 ? '+' : ''}${selectedEntry.netPerUnitHere} xalis)
                        </span>
                      </div>`
                    : ''
                }

                <div>
                  <div style="font-family:var(--font-display);font-size:13px;color:var(--gold-bright);letter-spacing:0.05em;margin-bottom:4px;">
                    Partiyalar (Köhnə partiya əvvəl satılır — FIFO)
                  </div>
                  <div class="lotm-batch-table">
                    ${selectedEntry.batches
                      .map(
                        (b) => `
                      <div class="lotm-batch-row">
                        <span>#${b.index} · <strong>${b.qty}×</strong> (${b.originName}, alış: ${b.buyPrice} q.)</span>
                        <span style="color:${b.daysLeft != null && b.daysLeft <= 1.2 ? '#e07a6f' : '#cbb896'};">
                          ${b.daysLeft != null ? `${b.daysLeft} gün möhlət` : 'Xarab olmur'}
                        </span>
                      </div>`
                      )
                      .join('')}
                  </div>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                  ${
                    state.currentCityId
                      ? `<button id="vault-sell-one" class="btn-primary" style="flex:1;">
                           1× Sat (+${selectedEntry.unitSellHere} q.)
                         </button>
                         ${
                           selectedEntry.qty > 1
                             ? `<button id="vault-sell-all" class="btn-emerald" style="flex:1;">
                                  Hamısını Sat (${selectedEntry.qty}×)
                                </button>`
                             : ''
                         }`
                      : ''
                  }
                  <button id="vault-discard-one" class="btn-crimson" title="Karvan yükünü azaltmaq üçün 1 ədəd boşalt">
                    1× Yükdən Boşalt
                  </button>
                </div>
              `
                  : `
                <div style="padding:36px 16px;text-align:center;color:var(--text-muted);">
                  <div style="margin-bottom:10px;color:var(--gold-dim);">${renderSigil('satchel', 36)}</div>
                  <div style="font-family:var(--font-display);font-size:19px;color:var(--gold-bright);margin-bottom:6px;">
                    Karvan Heybəsi Boşdur
                  </div>
                  <p style="font-size:13px;line-height:1.55;">
                    Şəhər karvansaraylarında piştaxtaya yaxınlaşıb (<span class="key-cap">E</span>) duz, ipək, xalça və ya bağ nemətləri tədarük edin. Alınan hər bir malın möhürü və mənşə tarixçəsi burada görünəcək.
                  </p>
                </div>
              `
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#inv-close')?.addEventListener('click', () => {
      this.eventBus.emit('ui:toggle_inventory');
    });

    this.modalEl.querySelectorAll('.lotm-slot[data-vault-item]').forEach((el) => {
      el.addEventListener('click', () => {
        this.selectedVaultItemId = el.dataset.vaultItem;
        this.renderInventoryModal(this.lastState || state);
      });
    });

    if (selectedEntry) {
      this.modalEl.querySelector('#vault-sell-one')?.addEventListener('click', () => {
        this.eventBus.emit('trade:sell', {
          cityId: state.currentCityId,
          itemId: selectedEntry.itemId,
          qty: 1,
        });
      });
      this.modalEl.querySelector('#vault-sell-all')?.addEventListener('click', () => {
        this.eventBus.emit('trade:sell', {
          cityId: state.currentCityId,
          itemId: selectedEntry.itemId,
          qty: selectedEntry.qty,
        });
      });
      this.modalEl.querySelector('#vault-discard-one')?.addEventListener('click', () => {
        this.eventBus.emit('trade:discard', {
          itemId: selectedEntry.itemId,
          qty: 1,
        });
      });
    }
  }

  showMarket(city, state, options = {}) {
    if (!this.modalEl) return;
    this.marketOpen = true;
    this.mapOpen = false;
    this.inventoryOpen = false;
    const dockedRight = Boolean(options.dockedRight);

    const validIds = city.goods.map((g) => g.item_id);
    if (!this.selectedMarketItemId || !validIds.includes(this.selectedMarketItemId)) {
      this.selectedMarketItemId = city.goods[0]?.item_id || null;
    }

    const analysis = this.tradeManager.getMarketAnalysis(city.city_id, this.selectedMarketItemId);
    const selectedOwned = this.selectedMarketItemId ? state.inventory[this.selectedMarketItemId] || 0 : 0;
    const heldItems = state.detailedInventory || [];

    // Karvansaray 3D səhnəsində sağ tərəfdə açılan ikili (Piştaxta + Heybəm) Divan Lövhəsi
    if (dockedRight && analysis) {
      if (this.lastState) this.updateHUD(this.lastState);

      const stallBodyHtml = `
        <div class="irs-item-chips">
          ${city.goods
            .map(
              (g) => `
            <button class="irs-item-chip ${g.item_id === this.selectedMarketItemId ? 'active' : ''}" data-select="${g.item_id}">
              ${renderItemSvg(g.item_id, 14)}
              <span>${g.name.split(' ')[0]}</span>
            </button>`
            )
            .join('')}
        </div>

        <div style="display:flex;align-items:center;gap:11px;">
          <div class="lotm-emblem-box">
            ${renderItemSvg(analysis.good.item_id, 28)}
          </div>
          <div>
            <span class="wax-seal-tag">${analysis.good.seal_title}</span>
            <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#f5e7cb;margin-top:2px;">
              ${analysis.good.name}
            </div>
            <div style="font-size:12px;color:var(--text-muted);">
              Ən sərfəli mənzil: <strong style="color:var(--gold-bright)">${analysis.bestCityName}</strong>
            </div>
          </div>
        </div>

        <div class="lotm-lore-box">
          <div>${analysis.good.lore}</div>
          <div class="lotm-whisper">${analysis.good.merchant_whisper}</div>
        </div>

        <div class="irs-trade-row">
          <span>Alış dəyəri</span>
          <strong style="color:var(--gold-bright);">
            ${analysis.effectiveBuy} qızıl
            ${analysis.haggle.status === 'won' ? '<small style="color:#84c994"> (Endirimli)</small>' : ''}
          </strong>
        </div>
        <div class="irs-trade-row">
          <span>Digər bazarlarda satış</span>
          <strong>${analysis.estSellMin}–${analysis.estSellMax} qızıl</strong>
        </div>
        <div class="irs-trade-row">
          <span>Karvan yol xərci</span>
          <span>${analysis.travelCost} qızıl</span>
        </div>
        <div class="irs-trade-row profit">
          <span>Gözlənilən xalis qazanc</span>
          <span style="color:${analysis.netMax >= 0 ? '#84c994' : '#d9786e'};">
            ${analysis.netMin >= 0 ? '+' : ''}${analysis.netMin} .. ${analysis.netMax >= 0 ? '+' : ''}${analysis.netMax} qızıl
          </span>
        </div>

        <div>
          <div class="irs-trade-row" style="margin-bottom:4px;font-size:12px;">
            <span>Fərasət təxmini etibarı</span>
            <strong style="color:var(--gold-bright)">${analysis.trustPercent}%</strong>
          </div>
          <div class="trust-bar-track">
            <div class="trust-bar-fill" style="width:${analysis.trustPercent}%;"></div>
          </div>
        </div>

        <div style="font-size:12.5px;color:#dfd0b4;">
          Keyfiyyət dərəcəsi: <strong style="color:var(--gold-bright)">${analysis.quality}</strong> ·
          ${
            analysis.good.max_freshness_days
              ? `Möhlət: <strong>${analysis.good.max_freshness_days} gün</strong>`
              : 'Xarab olmur'
          }
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button id="btn-haggle-sel" class="btn-secondary" ${analysis.haggle.attempted ? 'disabled' : ''}>
            ${renderSigil('scale', 14)}
            <span>Bazarlıq Et</span>
          </button>
          <button id="btn-buy-sel" class="btn-emerald">
            <span>1× Tədarük Al (${analysis.effectiveBuy} q.)</span>
          </button>
        </div>

        ${
          selectedOwned > 0
            ? `<div style="display:flex;gap:6px;">
                 <button id="btn-sell-sel" class="btn-primary" style="flex:1;">
                   1× Sat (+${analysis.effectiveSell} q. · Heybədə: ${selectedOwned})
                 </button>
                 ${
                   selectedOwned > 1
                     ? `<button id="btn-sell-all-sel" class="btn-secondary">Hamısını Sat</button>`
                     : ''
                 }
               </div>`
            : ''
        }

        <div class="irs-freshness-box">
          <div style="text-align:center;font-family:var(--font-display);font-size:13px;color:var(--gold-bright);margin-bottom:5px;letter-spacing:0.06em;">
            ✦ Bağ Nemətlərinin Möhləti ✦
          </div>
          ${this._renderFreshnessRows(state.perishables)}
        </div>
      `;

      const bagBodyHtml =
        heldItems.length === 0
          ? `<div style="padding:26px 12px;text-align:center;color:var(--text-muted);font-size:13px;">
               Heybənizdə satılacaq əmtəə yoxdur. «Piştaxta» bölməsindən mal tədarük edin.
             </div>`
          : `<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">
               Digər şəhərlərdən gətirdiyiniz idxal malları da daxil olmaqla bütün heybəni buradan sata bilərsiniz:
             </div>
             <div class="irs-goods-list">
               ${heldItems
                 .map(
                   (entry) => `
                 <div class="irs-good-row" style="cursor:default;flex-direction:column;align-items:stretch;gap:7px;">
                   <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                     <span style="display:inline-flex;align-items:center;gap:7px;font-weight:600;color:#f3e5c8;">
                       ${renderItemSvg(entry.itemId, 18)}
                       <span>${entry.meta.name} (${entry.qty}×)</span>
                     </span>
                     <span style="font-size:12px;color:${entry.netPerUnitHere >= 0 ? '#84c994' : '#d9786e'};">
                       Satış: <strong>${entry.unitSellHere} q.</strong> (${entry.netPerUnitHere >= 0 ? '+' : ''}${entry.netPerUnitHere})
                     </span>
                   </div>
                   <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--text-muted);">
                     <span>Alış maya: ${entry.avgBuy} q. · ${entry.isImportedHere ? 'İdxal tələbi' : 'Yerli bazar'}</span>
                     <span>${entry.freshness ? `Möhlət: ${entry.freshness.daysLeft} g.` : 'Sabit mal'}</span>
                   </div>
                   <div style="display:flex;gap:6px;">
                     <button class="btn-primary btn-bag-sell-one" data-item="${entry.itemId}" style="flex:1;padding:5px 8px;font-size:12px;">
                       1× Sat (+${entry.unitSellHere} q.)
                     </button>
                     ${
                       entry.qty > 1
                         ? `<button class="btn-emerald btn-bag-sell-all" data-item="${entry.itemId}" data-qty="${entry.qty}" style="padding:5px 9px;font-size:12px;">
                              Hamısını (${entry.qty}×)
                            </button>`
                         : ''
                     }
                     <button class="btn-crimson btn-bag-drop" data-item="${entry.itemId}" style="padding:5px 8px;font-size:12px;" title="1 ədəd yükdən boşalt">
                       At
                     </button>
                   </div>
                 </div>`
                 )
                 .join('')}
             </div>`;

      this.modalEl.innerHTML = `
        <div id="MarketPanel" class="irs-docked-market">
          <div class="irs-trade-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:6px;border-bottom:1px solid rgba(196,152,76,0.28);">
              <span style="font-family:var(--font-display);font-size:17px;font-weight:700;letter-spacing:0.06em;color:var(--gold-bright);">
                ${city.short_name || city.display_name} Divan Bazarı
              </span>
              <button id="market-close" class="btn-secondary" style="padding:4px 9px;font-size:12px;">✕ (Esc)</button>
            </div>

            <div class="lotm-tabs">
              <button class="lotm-tab ${this.dockedMarketTab === 'stall' ? 'active' : ''}" data-tab="stall">
                Piştaxta (${city.goods.length})
              </button>
              <button class="lotm-tab ${this.dockedMarketTab === 'bag' ? 'active' : ''}" data-tab="bag">
                Heybəm · Satış (${state.totalItems}/${state.maxInventory})
              </button>
            </div>

            ${this.dockedMarketTab === 'stall' ? stallBodyHtml : bagBodyHtml}
          </div>
        </div>
      `;

      this.modalEl.querySelector('#market-close')?.addEventListener('click', () => {
        this.eventBus.emit('market:close');
      });

      this.modalEl.querySelectorAll('.lotm-tab[data-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
          this.dockedMarketTab = tabBtn.dataset.tab;
          this.showMarket(city, state, { dockedRight: true });
        });
      });

      this.modalEl.querySelectorAll('.irs-item-chip[data-select]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedMarketItemId = btn.dataset.select;
          this.showMarket(city, state, { dockedRight: true });
        });
      });

      this.modalEl.querySelector('#btn-haggle-sel')?.addEventListener('click', () => {
        this.eventBus.emit('trade:haggle', {
          cityId: city.city_id,
          itemId: this.selectedMarketItemId,
        });
      });

      this.modalEl.querySelector('#btn-buy-sel')?.addEventListener('click', () => {
        this.eventBus.emit('trade:buy', {
          cityId: city.city_id,
          itemId: this.selectedMarketItemId,
        });
      });

      this.modalEl.querySelector('#btn-sell-sel')?.addEventListener('click', () => {
        this.eventBus.emit('trade:sell', {
          cityId: city.city_id,
          itemId: this.selectedMarketItemId,
          qty: 1,
        });
      });

      this.modalEl.querySelector('#btn-sell-all-sel')?.addEventListener('click', () => {
        this.eventBus.emit('trade:sell', {
          cityId: city.city_id,
          itemId: this.selectedMarketItemId,
          qty: selectedOwned,
        });
      });

      this.modalEl.querySelectorAll('.btn-bag-sell-one').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.eventBus.emit('trade:sell', {
            cityId: city.city_id,
            itemId: btn.dataset.item,
            qty: 1,
          });
        });
      });

      this.modalEl.querySelectorAll('.btn-bag-sell-all').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.eventBus.emit('trade:sell', {
            cityId: city.city_id,
            itemId: btn.dataset.item,
            qty: Number(btn.dataset.qty) || 1,
          });
        });
      });

      this.modalEl.querySelectorAll('.btn-bag-drop').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.eventBus.emit('trade:discard', {
            itemId: btn.dataset.item,
            qty: 1,
          });
        });
      });
      return;
    }

    // Tam ekran Bazar Dəftəri (Xəritə üzərindən açıldıqda)
    const cityGoodsIds = new Set(validIds);
    const extraOwned = heldItems.filter((entry) => !cityGoodsIds.has(entry.itemId));

    const catLabels = {
      agriculture: 'Bağ və Əkin',
      luxury: 'Xanlıq Xəzinəsi',
      craft: 'Sənət və Mədən',
    };

    this.modalEl.innerHTML = `
      <div id="MarketPanel" class="modal-backdrop">
        <div class="modal-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <div class="wax-seal-tag">${renderSigil('seal', 12)} Şəhər Ticarət Divanı</div>
              <h2 style="margin-top:5px;">${city.display_name}</h2>
              <div style="color:var(--text-muted);font-size:13px;">${city.era_name} — ${city.culture_note}</div>
            </div>
            <button id="market-close" class="btn-secondary">✕ Bağla (Esc)</button>
          </div>

          <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-size:13.5px;">
            <span>${renderSigil('coin', 14)} Xəzinə: <strong style="color:var(--gold-bright)">${state.gold} qızıl</strong></span>
            <span>${renderSigil('satchel', 14)} Heybə: <strong>${state.totalItems}/${state.maxInventory}</strong></span>
            <span>${renderSigil('charisma', 14)} Nüfuz: <strong style="color:var(--gold-bright)">${state.charisma}</strong></span>
            <span>${renderSigil('intelligence', 14)} Fərasət: <strong style="color:var(--gold-bright)">${state.intelligence}</strong></span>
          </div>

          ${renderSeljukStarDivider()}

          <div class="irs-market-grid">
            <div class="irs-goods-list">
              ${city.goods
                .map((g) => {
                  const a = this.tradeManager.getMarketAnalysis(city.city_id, g.item_id);
                  const owned = state.inventory[g.item_id] || 0;
                  const isSel = g.item_id === this.selectedMarketItemId;
                  return `
                  <div class="irs-good-row ${isSel ? 'selected' : ''}" data-select="${g.item_id}">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="color:var(--gold-bright);">${renderItemSvg(g.item_id, 22)}</span>
                      <div>
                        <div style="font-weight:600;font-size:14px;color:#f3e5c8;">${a.good.name}</div>
                        <div style="display:flex;gap:6px;align-items:center;margin-top:2px;">
                          <span class="irs-cat-tag ${g.category || 'craft'}">${catLabels[g.category] || 'Əmtəə'}</span>
                          ${owned > 0 ? `<span style="font-size:11.5px;color:#84c994;">Heybədə: ${owned}×</span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div style="text-align:right;font-size:12.5px;">
                      <div style="color:var(--gold-bright);">Alış: <strong>${a.effectiveBuy}</strong> q.</div>
                      <div style="color:#84c994;">Satış: ${a.effectiveSell} q.</div>
                    </div>
                  </div>`;
                })
                .join('')}

              ${
                extraOwned.length > 0
                  ? `<div style="margin-top:8px;font-family:var(--font-display);font-size:14px;color:var(--gold-bright);">
                       Uzaq Mənzildən Gətirdiyiniz İdxal Malları:
                     </div>
                    ${extraOwned
                      .map(
                        (entry) => `
                        <div class="irs-good-row" style="cursor:default;">
                          <span style="display:inline-flex;align-items:center;gap:8px;">
                            ${renderItemSvg(entry.itemId, 18)}
                            <span>${entry.meta.name} (${entry.qty}×) · Alış: ${entry.avgBuy} q.</span>
                          </span>
                          <div style="display:flex;gap:6px;">
                            <button class="btn-primary btn-sell" data-item="${entry.itemId}" data-qty="1" style="padding:5px 10px;font-size:12px;">
                              1× Sat (+${entry.unitSellHere} q.)
                            </button>
                            ${
                              entry.qty > 1
                                ? `<button class="btn-emerald btn-sell" data-item="${entry.itemId}" data-qty="${entry.qty}" style="padding:5px 10px;font-size:12px;">
                                     Hamısı
                                   </button>`
                                : ''
                            }
                          </div>
                        </div>`
                      )
                      .join('')}`
                  : ''
              }
            </div>

            ${
              analysis
                ? `<div class="irs-trade-card">
                    <div class="irs-trade-card-title">Əmtəə və Qiymət Təftişi</div>
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div class="lotm-emblem-box">
                        ${renderItemSvg(analysis.good.item_id, 28)}
                      </div>
                      <div>
                        <span class="wax-seal-tag">${analysis.good.seal_title}</span>
                        <div style="font-family:var(--font-display);font-size:19px;font-weight:700;color:#f5e7cb;margin-top:2px;">
                          ${analysis.good.name}
                        </div>
                        <div style="font-size:12px;color:var(--text-muted);">
                          Ən sərfəli bazar: <strong style="color:var(--gold-bright)">${analysis.bestCityName}</strong>
                        </div>
                      </div>
                    </div>

                    <div class="lotm-lore-box">
                      <div>${analysis.good.lore}</div>
                      <div class="lotm-whisper">${analysis.good.merchant_whisper}</div>
                    </div>

                    <div class="irs-trade-row">
                      <span>Alış dəyəri</span>
                      <strong style="color:var(--gold-bright);">
                        ${analysis.effectiveBuy} qızıl
                        ${analysis.haggle.status === 'won' ? '<small style="color:#84c994">(Endirimli)</small>' : ''}
                      </strong>
                    </div>
                    <div class="irs-trade-row">
                      <span>Təxmini satış</span>
                      <strong>${analysis.estSellMin}–${analysis.estSellMax} qızıl</strong>
                    </div>
                    <div class="irs-trade-row">
                      <span>Yol xərci</span>
                      <span>${analysis.travelCost} qızıl</span>
                    </div>
                    <div class="irs-trade-row profit">
                      <span>Xalis qazanc</span>
                      <span style="color:${analysis.netMax >= 0 ? '#84c994' : '#d9786e'};">
                        ${analysis.netMin >= 0 ? '+' : ''}${analysis.netMin} .. ${analysis.netMax >= 0 ? '+' : ''}${analysis.netMax} qızıl
                      </span>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
                      <button id="btn-haggle-sel" class="btn-secondary" ${analysis.haggle.attempted ? 'disabled' : ''}>
                        ${renderSigil('scale', 14)}
                        <span>Bazarlıq Et</span>
                      </button>
                      <button id="btn-buy-sel" class="btn-emerald">1× Al (${analysis.effectiveBuy} q.)</button>
                    </div>

                    ${
                      selectedOwned > 0
                        ? `<div style="display:flex;gap:6px;">
                             <button id="btn-sell-sel" class="btn-primary" style="flex:1;">
                               1× Sat (+${analysis.effectiveSell} q. · Heybədə: ${selectedOwned})
                             </button>
                             ${
                               selectedOwned > 1
                                 ? `<button id="btn-sell-all-sel" class="btn-secondary">Hamısını Sat</button>`
                                 : ''
                             }
                           </div>`
                        : ''
                    }

                    <div class="irs-freshness-box">
                      <div style="text-align:center;font-family:var(--font-display);font-size:13px;color:var(--gold-bright);margin-bottom:6px;">
                        ✦ Bağ Nemətlərinin Möhləti ✦
                      </div>
                      ${this._renderFreshnessRows(state.perishables)}
                    </div>
                  </div>`
                : ''
            }
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#market-close')?.addEventListener('click', () => {
      this.eventBus.emit('market:close');
    });

    this.modalEl.querySelectorAll('.irs-good-row[data-select]').forEach((row) => {
      row.addEventListener('click', () => {
        this.selectedMarketItemId = row.dataset.select;
        this.showMarket(city, state);
      });
    });

    this.modalEl.querySelector('#btn-haggle-sel')?.addEventListener('click', () => {
      this.eventBus.emit('trade:haggle', {
        cityId: city.city_id,
        itemId: this.selectedMarketItemId,
      });
    });

    this.modalEl.querySelector('#btn-buy-sel')?.addEventListener('click', () => {
      this.eventBus.emit('trade:buy', {
        cityId: city.city_id,
        itemId: this.selectedMarketItemId,
      });
    });

    this.modalEl.querySelector('#btn-sell-sel')?.addEventListener('click', () => {
      this.eventBus.emit('trade:sell', {
        cityId: city.city_id,
        itemId: this.selectedMarketItemId,
        qty: 1,
      });
    });

    this.modalEl.querySelector('#btn-sell-all-sel')?.addEventListener('click', () => {
      this.eventBus.emit('trade:sell', {
        cityId: city.city_id,
        itemId: this.selectedMarketItemId,
        qty: selectedOwned,
      });
    });

    this.modalEl.querySelectorAll('.btn-sell').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.eventBus.emit('trade:sell', {
          cityId: city.city_id,
          itemId: btn.dataset.item,
          qty: Number(btn.dataset.qty) || 1,
        });
      });
    });
  }

  hideMarket() {
    this.marketOpen = false;
    if (this.modalEl) this.modalEl.innerHTML = '';
    if (this.lastState) this.updateHUD(this.lastState);
  }

  showQuest(quest, npc) {
    if (!this.modalEl) return;
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = false;

    const targetCityName =
      quest.target_city === 'ANY'
        ? 'Hər hansı şəhər divanı (avtomatik təhvil)'
        : this.data.getCityById(quest.target_city)?.display_name || quest.target_city;

    this.modalEl.innerHTML = `
      <div id="QuestPopupPanel" class="modal-backdrop">
        <div class="modal-card" style="max-width:610px;">
          <div class="wax-seal-tag">${renderSigil('seal', 12)} ${npc?.title || quest.npc_role} · ${quest.npc_name}</div>
          <h2 style="margin-top:8px;">${quest.title}</h2>
          ${renderSeljukStarDivider()}
          <p style="margin:10px 0 16px;line-height:1.68;color:#eadcc3;font-size:14.5px;">${quest.description}</p>
          <div class="lotm-lore-box" style="margin-bottom:18px;font-size:13.5px;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
              ${renderItemSvg(quest.required_item, 18)}
              <span>Tələb olunan əmanət: <strong>${quest.required_amount}× ${this.data.getItemName(quest.required_item)}</strong></span>
            </div>
            <div>Çatdırılacaq mənzil: <strong>${targetCityName}</strong></div>
            <div>Vəd olunan ənam: <strong style="color:var(--gold-bright);">+${quest.reward_gold} qızıl və +1 Nüfuz</strong></div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="quest-decline" class="btn-secondary">Üzr İstəyib Keç</button>
            <button id="quest-accept" class="btn-emerald">Əhd Bağla və Qəbul Et</button>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#quest-accept')?.addEventListener('click', () => {
      this.modalEl.innerHTML = '';
      this.eventBus.emit('quest:accept', quest);
    });
    this.modalEl.querySelector('#quest-decline')?.addEventListener('click', () => {
      this.modalEl.innerHTML = '';
      this.eventBus.emit('quest:decline');
    });
  }

  showHistoricalEvent(evt, npc) {
    if (!this.modalEl) return;
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = false;

    this.modalEl.innerHTML = `
      <div id="EventPopupPanel" class="modal-backdrop">
        <div class="modal-card" style="max-width:660px;">
          <div class="wax-seal-tag">
            ${renderSigil('scroll', 12)} Salnamə Vərəqi · ${evt.era} · ${evt.region}
          </div>
          <h2 style="margin-top:8px;">${evt.title}</h2>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;font-style:italic;">
            Rəvayətçi: ${evt.npc_name} (${npc?.title || evt.npc_role})
          </div>
          ${renderSeljukStarDivider()}
          <p style="line-height:1.7;color:#ede0c7;margin-bottom:14px;font-size:14.5px;">${evt.story_text}</p>
          <div class="lotm-lore-box" style="margin-bottom:18px;">
            <strong style="color:var(--gold-bright);">Tarixi Qeyd:</strong> ${evt.history_fact}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${evt.choices
              .map(
                (c, idx) => `
              <button class="btn-primary evt-choice" data-idx="${idx}" style="justify-content:flex-start;text-align:left;padding:11px 15px;">
                <span>❖ ${c.label}</span>
              </button>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelectorAll('.evt-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        this.modalEl.innerHTML = '';
        this.eventBus.emit('event:choose', { event: evt, choiceIndex: idx });
      });
    });
  }

  toggleMapChronicle(state, merchantPos, cityPositions) {
    if (!this.modalEl) return false;
    if (this.mapOpen) {
      this.mapOpen = false;
      this.modalEl.innerHTML = '';
      return false;
    }

    this.mapOpen = true;
    this.marketOpen = false;
    this.inventoryOpen = false;

    const toSvg = (x, z) => ({
      sx: ((x + 62) / 124) * 520 + 20,
      sy: ((z + 42) / 84) * 240 + 20,
    });

    const mSvg = merchantPos ? toSvg(merchantPos.x, merchantPos.z) : { sx: 280, sy: 140 };
    const cities = cityPositions || {};

    this.modalEl.innerHTML = `
      <div id="MapChroniclePanel" class="modal-backdrop">
        <div class="modal-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div>
              <div class="wax-seal-tag">${renderSigil('scroll', 12)} Karvan Salnaməsi</div>
              <h2 style="margin-top:5px;">Mənzil Xəritəsi və Dövr Salnaməsi</h2>
              <div style="font-size:12.5px;color:var(--text-muted);">Səfər marşrutu qurmaq üçün istənilən şəhər möhürünə klikləyin.</div>
            </div>
            <button id="map-close" class="btn-secondary">✕ Bağla (M)</button>
          </div>

          ${renderSeljukStarDivider()}

          <svg viewBox="0 0 560 260" style="width:100%;height:auto;background:radial-gradient(circle at 42% 50%, #2b2015, #16100a);border:1px solid rgba(207,163,85,0.45);margin:10px 0 14px;">
            <rect x="415" y="0" width="145" height="260" fill="#132936" opacity="0.85" />
            <text x="486" y="135" text-anchor="middle" fill="#9ab8c7" font-size="13" font-family="Georgia, serif" font-style="italic">Xəzər Dənizi</text>
            ${Object.entries(cities)
              .map(([id, c]) => {
                const p = toSvg(c.x, c.z);
                const visited = state.visitedCityIds.includes(id);
                return `
                  <g class="svg-city-target" data-city="${id}" style="cursor:pointer;">
                    <circle cx="${p.sx}" cy="${p.sy}" r="12" fill="${visited ? '#7e2323' : '#3d2c1a'}" stroke="#cfa355" stroke-width="2" />
                    <text x="${p.sx}" y="${p.sy - 17}" text-anchor="middle" fill="#eadcc3" font-weight="bold" font-size="12" font-family="Georgia, serif">${c.label}</text>
                  </g>
                `;
              })
              .join('')}
            <circle cx="${mSvg.sx}" cy="${mSvg.sy}" r="6.5" fill="#cfa355" stroke="#fff3d6" stroke-width="2" />
            <text x="${mSvg.sx}" y="${mSvg.sy + 18}" text-anchor="middle" fill="#e4be74" font-size="11">Karvan</text>
          </svg>

          <h3 style="font-family:var(--font-display);color:var(--gold-bright);font-size:18px;margin-bottom:8px;">
            Açılmış Tarixi Vərəqlər (${state.discoveredEvents.length}/${state.totalEventsCount})
          </h3>
          ${
            state.discoveredEvents.length === 0
              ? '<p style="color:var(--text-muted);font-size:13.5px;font-style:italic;">Hələ heç bir salnamə vərəqi açılmayıb — karvan yollarında qarşılaşdığınız salnaməçilər, ustadlar və aşıqlar qədim irsi burada toplayacaq.</p>'
              : state.discoveredEvents
                  .map(
                    (e) => `
                <div class="lotm-lore-box" style="margin-bottom:8px;">
                  <strong style="color:var(--gold-bright);font-family:var(--font-display);font-size:15.5px;">${e.era} — ${e.title}</strong>
                  <span style="color:var(--text-muted);font-size:12px;"> (${e.region})</span><br/>
                  <span>${e.history_fact}</span>
                </div>`
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    this.modalEl.querySelector('#map-close')?.addEventListener('click', () => {
      this.eventBus.emit('ui:toggle_map');
    });

    this.modalEl.querySelectorAll('.svg-city-target').forEach((el) => {
      el.addEventListener('click', () => {
        this.eventBus.emit('map:navigate_city', el.dataset.city);
      });
    });

    return true;
  }

  showVictory(state) {
    if (!this.modalEl) return;
    this.modalEl.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card" style="text-align:center;max-width:560px;">
          <div class="wax-seal-tag">${renderSigil('seal', 12)} Baş Tacir Mərtəbəsi</div>
          <h2 style="margin-top:10px;font-size:28px;">İRS — Böyük Karvanbaşı!</h2>
          ${renderSeljukStarDivider()}
          <p style="margin:12px 0 18px;color:#eadcc3;line-height:1.65;">
            Xəzinənizi <strong>${state.gold} qızıla</strong> çatdıraraq Azərbaycan İpək Yolunun ən mötəbər karvanbaşısı adını qazandınız.
          </p>
          <div style="margin-bottom:20px;font-size:13.5px;color:var(--text-muted);">
            Nüfuz: ${state.charisma} · Fərasət: ${state.intelligence} · Uğurlu sövdələşmə: ${state.stats.hagglesWon} · Salnamə: ${state.discoveredEvents.length}/${state.totalEventsCount}
          </div>
          <button id="victory-continue" class="btn-primary">Səfərə Davam Et</button>
        </div>
      </div>
    `;
    this.modalEl.querySelector('#victory-continue')?.addEventListener('click', () => {
      this.modalEl.innerHTML = '';
      this.eventBus.emit('game:continue_after_win');
    });
  }

  /**
   * Sürətli Səfər (Fast-Travel) sonunda çıxan qısa və rəsmi Divan Yol Hesabatı
   */
  showFastTravelSummary(report) {
    if (!this.modalEl || !report) return;
    this.marketOpen = false;
    this.mapOpen = false;
    this.inventoryOpen = false;

    this.modalEl.innerHTML = `
      <div id="FastTravelSummaryModal" class="modal-backdrop">
        <div class="modal-card" style="max-width:540px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <span class="wax-seal-tag">${renderSigil('compass', 12)} Mənzil Yekunu</span>
            <span style="font-size:12px;color:var(--text-muted);">${report.eraName}</span>
          </div>

          <h2 style="margin-top:8px;">${report.fromName} → ${report.toName}</h2>
          ${renderSeljukStarDivider()}

          <div class="lotm-lore-box" style="margin-bottom:12px;">
            ${report.roadNote}
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
            <div class="irs-trade-row">
              <span>Səfər müddəti</span>
              <strong>+${report.wholeDays} gün (${report.daysSpent} sutka)</strong>
            </div>
            <div class="irs-trade-row">
              <span>Yol azuqəsi və keçid xərci</span>
              <span style="color:#d98b76;">-${report.roadCost} qızıl</span>
            </div>
            ${
              report.bonusGold > 0
                ? `<div class="irs-trade-row">
                     <span>Yol qazancı / ənam</span>
                     <strong style="color:#84c994;">+${report.bonusGold} qızıl</strong>
                   </div>`
                : ''
            }
            ${
              report.questDeltaGold > 0
                ? `<div class="irs-trade-row">
                     <span>Təhvil verilən əmanət mükafatı</span>
                     <strong style="color:var(--gold-bright);">+${report.questDeltaGold} qızıl</strong>
                   </div>`
                : ''
            }
            ${
              report.spoiledItems.length > 0
                ? `<div class="irs-trade-row">
                     <span>Yolda xarab olan yük</span>
                     <span style="color:#d9786e;">${report.spoiledItems.join(', ')}</span>
                   </div>`
                : ''
            }
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
            <button id="ft-stay-map" class="btn-secondary">Xəritədə Qal</button>
            <button id="ft-enter-3d" class="btn-emerald">
              ${renderSigil('gate', 15)}
              <span>3D Şəhərə Daxil Ol (${report.toShort})</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#ft-stay-map')?.addEventListener('click', () => {
      this.modalEl.innerHTML = '';
      this.eventBus.emit('fast_travel:dismiss');
    });

    this.modalEl.querySelector('#ft-enter-3d')?.addEventListener('click', () => {
      this.modalEl.innerHTML = '';
      this.eventBus.emit('scene:enter_bazaar', report.toCityId);
    });
  }

  /**
   * Antispam Toast — eyni mesaj dalbadal gəldikdə üst-üstə yığmır,
   * mövcud sətiri yeniləyir və ekranda maksimum 3 bildiriş saxlayır.
   */
  showToast(message, type = 'info') {
    if (!this.toastEl || !message) return;
    const now = performance.now();

    const existing = this._activeToasts.get(message);
    if (existing) {
      if (now - existing.lastAt < 1800) {
        existing.lastAt = now;
        clearTimeout(existing.timerId);
        existing.timerId = setTimeout(() => {
          existing.el.remove();
          this._activeToasts.delete(message);
        }, 3400);
        return;
      }
    }

    // Maksimum 3 aktiv bildiriş saxla
    while (this._activeToasts.size >= 3) {
      const oldestKey = this._activeToasts.keys().next().value;
      const oldest = this._activeToasts.get(oldestKey);
      if (oldest) {
        clearTimeout(oldest.timerId);
        oldest.el.remove();
      }
      this._activeToasts.delete(oldestKey);
    }

    const item = document.createElement('div');
    item.className = `toast-item ${type}`;
    item.textContent = message;
    this.toastEl.appendChild(item);

    const timerId = setTimeout(() => {
      item.remove();
      this._activeToasts.delete(message);
    }, 3600);

    this._activeToasts.set(message, { el: item, timerId, lastAt: now });
  }
}
