/**
 * UI/UIManager.js — "İRS — Tacirin Yolu" konsept UI:
 * - Yuxarı-sol: İRS brend + qızıl/çanta/gün
 * - Yuxarı-orta: Şəhər • Dövr lövhəsi
 * - Aşağı-sol: Xarizma & Zəka RPG göstəriciləri
 * - Aşağı-orta: [E] • Tacirlə danış
 * - Sağ bazar kartı: Alış, Təxmini satış, Yol xərci, Xalis qazanc, Proqnoza etibar %,
 *   Keyfiyyət, "Bazarlıq et" + "Al" / "Sat" və "Təzəlik" (kənd təsərrüfatı) paneli.
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
    this.muted = false;
    this.selectedMarketItemId = null;

    this.hudEl = null;
    this.modalEl = null;
    this.toastEl = null;
    this.lastState = null;
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
    this.rootEl.innerHTML = '';
  }

  isMarketOpen() {
    return this.marketOpen;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.lastState) this.updateHUD(this.lastState);
  }

  _freshnessColor(ratio) {
    if (ratio >= 0.6) return 'linear-gradient(90deg, #4b8f42, #87c454)';
    if (ratio >= 0.3) return 'linear-gradient(90deg, #b88a28, #e6b84c)';
    return 'linear-gradient(90deg, #a83328, #e05a47)';
  }

  _renderFreshnessRows(perishables) {
    if (!perishables || perishables.length === 0) {
      return '<div style="font-size:12px;color:#b8a382;">Çantada tez xarab olan kənd təsərrüfatı məhsulu yoxdur.</div>';
    }
    return perishables
      .map(
        (p) => `
      <div class="freshness-row">
        <span>${p.icon} ${p.name} <small style="color:#bda986">(${p.owned}×)</small></span>
        <div class="freshness-track">
          <div class="freshness-fill" style="width:${Math.round(p.ratio * 100)}%;background:${this._freshnessColor(p.ratio)};"></div>
        </div>
        <span style="text-align:right;color:#e7d5b2;">${p.daysLeft} g.</span>
      </div>`
      )
      .join('');
  }

  updateHUD(state) {
    this.lastState = state;
    if (!this.hudEl) return;

    const isGTA = state.cameraMode === 'gta';
    const eraBanner = state.currentCity
      ? `${state.currentCity.short_name || state.currentCity.display_name} • ${state.currentCity.era_name}`
      : `Qədim İpək Yolu • Gün ${state.gameDay}`;

    const bonuses = [];
    if (state.hasHorseBonus) bonuses.push('🐎 +35% Sürət');
    if (state.speedBoostTimer > 0) bonuses.push(`⚡ ${state.speedBoostTimer}s`);
    if (state.guardBoostTimer > 0) bonuses.push(`🛡️ ${state.guardBoostTimer}s`);

    this.hudEl.innerHTML = `
      <div class="hud-shell">
        <div class="hud-top-row">
          <div class="irs-brand-box">
            <div class="irs-logo">
              <span class="irs-logo-main">İRS</span>
              <span class="irs-logo-sub">Tacirin yolu</span>
            </div>
            <div class="hud-pill">💰 <strong>${state.gold}</strong> / ${state.winGoldGoal}</div>
            <div class="hud-pill">🎒 <strong>${state.totalItems}/${state.maxInventory}</strong></div>
            <div class="hud-pill">☀️ Gün <strong>${state.gameDay}</strong></div>
            ${bonuses.map((b) => `<div class="hud-pill">${b}</div>`).join('')}
          </div>

          <div class="irs-era-banner">✦ ${eraBanner} ✦</div>

          <div class="hud-actions-bar">
            <button id="btn-cam-mode" class="btn-primary">
              ${isGTA ? '🗺️ Xəritə (V)' : '🎥 GTA 3D (V)'}
            </button>
            <button id="btn-map" class="btn-secondary">📜 Salnamə (${state.discoveredEvents.length}/${state.totalEventsCount})</button>
            <button id="btn-event-test" class="btn-secondary" title="Yol hadisəsi">✨ Hadisə</button>
            <button id="btn-mute" class="btn-secondary" title="Səsi aç/bağla">${this.muted ? '🔇' : '🔊'}</button>
            <button id="btn-reset" class="btn-secondary" title="Yeni oyun">↺</button>
          </div>
        </div>

        <div class="hud-middle-right">
          <div class="hud-side-card">
            <h4>Aktiv Tapşırıqlar (${state.activeQuests.length})</h4>
            ${
              state.activeQuests.length === 0
                ? '<div style="color:#bda986">Yolda irəlilədikcə Padşah, Bağban və Salnaməçilər çıxacaq.</div>'
                : state.activeQuests
                    .map(
                      (q) => `
                  <div class="quest-mini">
                    <strong>${q.title}</strong><br/>
                    <span style="color:#cbb896">${q.npc_name}: ${q.required_amount}× ${this.data.getItemName(q.required_item)} → ${
                        q.target_city === 'ANY'
                          ? 'İstənilən yer'
                          : this.data.getCityById(q.target_city)?.short_name || q.target_city
                      }</span><br/>
                    <span style="color:#f0c75e">+${q.reward_gold} qızıl</span>
                  </div>`
                    )
                    .join('')
            }
          </div>

          ${
            state.perishables && state.perishables.length > 0
              ? `<div class="hud-side-card">
                  <h4>✦ Təzəlik (Kənd Təsərrüfatı) ✦</h4>
                  ${this._renderFreshnessRows(state.perishables)}
                </div>`
              : ''
          }
        </div>

        <div class="hud-bottom-grid">
          <div class="irs-stats-stack">
            <div class="irs-stat-badge"><span>🤝 Xarizma</span><strong>${state.charisma}</strong></div>
            <div class="irs-stat-badge"><span>📖 Zəka</span><strong>${state.intelligence}</strong></div>
          </div>

          <div class="hud-bottom-center">
            <div class="hud-bottom-hint">
              ${
                state.currentCity
                  ? `<button id="btn-open-market" class="btn-primary" style="display:flex;align-items:center;gap:8px;">
                      <span class="key-cap" style="background:rgba(28,19,8,0.22);border-color:#1c1308;color:#1c1308;">E</span>
                      <span>• Tacirlə danış (${state.currentCity.short_name || state.currentCity.display_name})</span>
                    </button>`
                  : `<span>${
                      isGTA
                        ? '<strong>GTA Rejimi:</strong> W/S sür · A/D döndər · Sağ klik kamera · <span class="key-cap">V</span> Xəritə'
                        : '<strong>Qədim Xəritə:</strong> Kliklə (GTA GPS ilə enər) · <span class="key-cap">M</span> Salnamə'
                    }</span>`
              }
            </div>
          </div>

          <div style="width:142px;"></div>
        </div>
      </div>
    `;

    this.hudEl.querySelector('#btn-cam-mode')?.addEventListener('click', () => {
      this.eventBus.emit('camera:toggle_mode');
    });
    this.hudEl.querySelector('#btn-open-market')?.addEventListener('click', () => {
      this.eventBus.emit('market:open');
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
      if (window.confirm('Bütün yadda saxlanılmış irəliləyiş sıfırlansın?')) {
        this.eventBus.emit('game:reset');
      }
    });
  }

  showMarket(city, state) {
    if (!this.modalEl) return;
    this.marketOpen = true;
    this.mapOpen = false;

    const validIds = city.goods.map((g) => g.item_id);
    if (!this.selectedMarketItemId || !validIds.includes(this.selectedMarketItemId)) {
      this.selectedMarketItemId = city.goods[0]?.item_id || null;
    }

    const analysis = this.tradeManager.getMarketAnalysis(city.city_id, this.selectedMarketItemId);
    const selectedOwned = this.selectedMarketItemId ? state.inventory[this.selectedMarketItemId] || 0 : 0;

    const cityGoodsIds = new Set(validIds);
    const extraOwned = Object.entries(state.inventory).filter(
      ([id, qty]) => qty > 0 && !cityGoodsIds.has(id)
    );

    const catLabels = {
      agriculture: 'Kənd təsərrüfatı',
      luxury: 'Nadir / İpək-Xalça',
      craft: 'Sənətkarlıq',
    };

    this.modalEl.innerHTML = `
      <div id="MarketPanel" class="modal-backdrop">
        <div class="modal-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <h2>✦ ${city.display_name} Bazarı</h2>
              <div style="color:#cbb896;font-size:13px;">${city.era_name} — ${city.culture_note}</div>
            </div>
            <button id="market-close" class="btn-secondary">✕ Bağla (Esc)</button>
          </div>

          <div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;">
            <span>💰 Qızıl: <strong style="color:#f0c75e">${state.gold}</strong></span>
            <span>🎒 Çanta: <strong>${state.totalItems}/${state.maxInventory}</strong></span>
            <span>🤝 Xarizma: <strong style="color:#f0c75e">${state.charisma}</strong></span>
            <span>📖 Zəka: <strong style="color:#f0c75e">${state.intelligence}</strong></span>
          </div>

          <div class="irs-market-grid">
            <div class="irs-goods-list">
              ${city.goods
                .map((g) => {
                  const a = this.tradeManager.getMarketAnalysis(city.city_id, g.item_id);
                  const owned = state.inventory[g.item_id] || 0;
                  const isSel = g.item_id === this.selectedMarketItemId;
                  return `
                  <div class="irs-good-row ${isSel ? 'selected' : ''}" data-select="${g.item_id}">
                    <div>
                      <div style="font-weight:600;font-size:13.5px;">${g.icon || '📦'} ${g.name}</div>
                      <div style="display:flex;gap:6px;align-items:center;margin-top:3px;">
                        <span class="irs-cat-tag ${g.category || 'craft'}">${catLabels[g.category] || 'Mal'}</span>
                        ${owned > 0 ? `<span style="font-size:11.5px;color:#87e0a8;">Səndə: ${owned}</span>` : ''}
                      </div>
                    </div>
                    <div style="text-align:right;font-size:12.5px;">
                      <div style="color:#ffd479;">Alış: <strong>${a.effectiveBuy}</strong> q.</div>
                      <div style="color:#87e0a8;">Satış: ${a.effectiveSell} q.</div>
                    </div>
                  </div>`;
                })
                .join('')}

              ${
                extraOwned.length > 0
                  ? `<div style="margin-top:8px;font-size:12px;color:#cbb896;">Digər bölgələrdən gətirdiyin mallar:</div>
                    ${extraOwned
                      .map(([itemId, owned]) => {
                        const meta = this.data.getItemMeta(itemId);
                        return `
                        <div class="irs-good-row" style="cursor:default;">
                          <span>${meta.icon} ${meta.name} (${owned}×)</span>
                          <button class="btn-secondary btn-sell" data-item="${itemId}" style="padding:5px 12px;font-size:12px;">Sat</button>
                        </div>`;
                      })
                      .join('')}`
                  : ''
              }
            </div>

            ${
              analysis
                ? `<div class="irs-trade-card">
                    <div class="irs-trade-card-title">${analysis.good.category === 'agriculture' ? 'KƏND TƏSƏRRÜFATI TİCARƏTİ' : 'KARVANSARAY TİCARƏTİ'}</div>
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div style="width:52px;height:52px;border-radius:10px;background:rgba(229,184,75,0.14);border:1px solid rgba(229,184,75,0.5);display:flex;align-items:center;justify-content:center;font-size:28px;">
                        ${analysis.good.icon || '📦'}
                      </div>
                      <div>
                        <div style="font-size:16px;font-weight:700;color:#f8edd4;">${analysis.good.name}</div>
                        <div style="font-size:12px;color:#cbb896;">Ən sərfəli bazar: <strong style="color:#f0c75e">${analysis.bestCityName}</strong></div>
                      </div>
                    </div>

                    <div class="irs-trade-row">
                      <span>Alış qiyməti</span>
                      <strong style="color:#ffd479;">🪙 ${analysis.effectiveBuy} ${
                        analysis.haggle.status === 'won' ? '<small style="color:#6ee7b7">(Endirim!)</small>' : ''
                      }</strong>
                    </div>
                    <div class="irs-trade-row">
                      <span>Təxmini satış</span>
                      <strong>🪙 ${analysis.estSellMin}–${analysis.estSellMax}</strong>
                    </div>
                    <div class="irs-trade-row">
                      <span>Yol xərci</span>
                      <span>🪙 ${analysis.travelCost}</span>
                    </div>
                    <div class="irs-trade-row profit">
                      <span>Xalis qazanc</span>
                      <span style="color:${analysis.netMax >= 0 ? '#7ce38b' : '#f28b82'};">
                        🪙 ${analysis.netMin >= 0 ? '+' : ''}${analysis.netMin}..${analysis.netMax >= 0 ? '+' : ''}${analysis.netMax}
                      </span>
                    </div>

                    <div>
                      <div class="irs-trade-row" style="margin-bottom:5px;font-size:12.5px;">
                        <span>Proqnoza etibar</span>
                        <strong style="color:#f0c75e">${analysis.trustPercent}%</strong>
                      </div>
                      <div class="trust-bar-track">
                        <div class="trust-bar-fill" style="width:${analysis.trustPercent}%;"></div>
                      </div>
                    </div>

                    <div style="font-size:13px;color:#e6d7b9;">
                      🏅 Keyfiyyət: <strong style="color:#f0c75e">${analysis.quality}</strong>
                      ${
                        analysis.good.max_freshness_days
                          ? ` · 🌿 Təzəlik: <strong>${analysis.good.max_freshness_days} gün</strong>`
                          : ' · ⏳ Xarab olmur'
                      }
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
                      <button id="btn-haggle-sel" class="btn-secondary" ${analysis.haggle.attempted ? 'disabled' : ''}>
                        🤝 Bazarlıq et
                      </button>
                      <button id="btn-buy-sel" class="btn-emerald">Al (${analysis.effectiveBuy} q.)</button>
                    </div>

                    ${
                      selectedOwned > 0
                        ? `<button id="btn-sell-sel" class="btn-primary" style="width:100%;">
                            💰 1× Sat (+${analysis.effectiveSell} qızıl · Səndə: ${selectedOwned})
                          </button>`
                        : ''
                    }

                    <div class="irs-freshness-box">
                      <div style="text-align:center;font-family:var(--font-display);font-size:12.5px;color:#f0c75e;margin-bottom:6px;">
                        ✦ Təzəlik ✦
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
      });
    });

    this.modalEl.querySelectorAll('.btn-sell').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.eventBus.emit('trade:sell', { cityId: city.city_id, itemId: btn.dataset.item });
      });
    });
  }

  hideMarket() {
    this.marketOpen = false;
    if (this.modalEl) this.modalEl.innerHTML = '';
  }

  showQuest(quest, npc) {
    if (!this.modalEl) return;
    this.marketOpen = false;
    this.mapOpen = false;

    const targetCityName =
      quest.target_city === 'ANY'
        ? 'İstənilən yerdə (avtomatik)'
        : this.data.getCityById(quest.target_city)?.display_name || quest.target_city;

    this.modalEl.innerHTML = `
      <div id="QuestPopupPanel" class="modal-backdrop">
        <div class="modal-card" style="max-width:600px;">
          <div style="color:${npc?.color || '#f0c75e'};font-size:13px;font-weight:700;margin-bottom:6px;">
            ${npc?.title || quest.npc_role} · ${quest.npc_name}
          </div>
          <h2>${quest.title}</h2>
          <p style="margin:12px 0 18px;line-height:1.6;color:#efe4cf;">${quest.description}</p>
          <div style="padding:12px;border-radius:10px;background:rgba(244,224,182,0.07);margin-bottom:20px;font-size:14px;">
            <div>📦 Tələb: <strong>${quest.required_amount}× ${this.data.getItemIcon(quest.required_item)} ${this.data.getItemName(quest.required_item)}</strong></div>
            <div>📍 Təhvil yeri: <strong>${targetCityName}</strong></div>
            <div>💰 Mükafat: <strong style="color:#f0c75e">+${quest.reward_gold} Qızıl & +1 Xarizma</strong></div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="quest-decline" class="btn-secondary">Sonra</button>
            <button id="quest-accept" class="btn-emerald">Tapşırığı Qəbul Et</button>
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

    this.modalEl.innerHTML = `
      <div id="EventPopupPanel" class="modal-backdrop">
        <div class="modal-card" style="max-width:650px;">
          <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:${npc?.color || '#8f6bd4'}33;border:1px solid ${npc?.color || '#8f6bd4'};font-size:12px;margin-bottom:10px;">
            📜 Tarixi Hadisə · ${evt.era} · ${evt.region}
          </div>
          <h2>${evt.title}</h2>
          <div style="font-size:13px;color:#cbb896;margin-bottom:10px;">${evt.npc_name} (${npc?.title || evt.npc_role})</div>
          <p style="line-height:1.65;color:#f2e7d2;margin-bottom:14px;">${evt.story_text}</p>
          <div style="padding:12px 14px;border-radius:10px;background:rgba(229,184,75,0.12);border-left:3px solid #f0c75e;font-size:13px;color:#f6e6be;margin-bottom:20px;">
            <strong>Tarixi Fakt:</strong> ${evt.history_fact}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${evt.choices
              .map(
                (c, idx) => `
              <button class="btn-primary evt-choice" data-idx="${idx}" style="text-align:left;padding:12px 16px;">
                ${c.label}
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
              <h2>İRS — Qədim Tarixi Xəritə & Salnamə</h2>
              <div style="font-size:12.5px;color:#cbb896;">GTA GPS marşrutu üçün istənilən şəhərə klikləyin!</div>
            </div>
            <button id="map-close" class="btn-secondary">✕ Bağla (M)</button>
          </div>
          <svg viewBox="0 0 560 280" style="width:100%;height:auto;background:radial-gradient(circle at 42% 50%, #e5cfa2, #bfa06c);border-radius:12px;border:2px solid #966d32;margin:14px 0;">
            <rect x="415" y="0" width="145" height="280" fill="#2c596b" opacity="0.82" />
            <text x="485" y="145" text-anchor="middle" fill="#ead8b2" font-size="13" font-family="Georgia, serif" font-style="italic">Xəzər Dənizi</text>
            ${Object.entries(cities)
              .map(([id, c]) => {
                const p = toSvg(c.x, c.z);
                const visited = state.visitedCityIds.includes(id);
                return `
                  <g class="svg-city-target" data-city="${id}" style="cursor:pointer;">
                    <circle cx="${p.sx}" cy="${p.sy}" r="13" fill="${visited ? '#b83728' : '#5e4022'}" stroke="#f7e7c0" stroke-width="2.5" />
                    <text x="${p.sx}" y="${p.sy - 18}" text-anchor="middle" fill="#2b1a0c" font-weight="bold" font-size="12" font-family="Georgia, serif">${c.label}</text>
                  </g>
                `;
              })
              .join('')}
            <circle cx="${mSvg.sx}" cy="${mSvg.sy}" r="7" fill="#1f8a5b" stroke="#fff" stroke-width="2" />
            <text x="${mSvg.sx}" y="${mSvg.sy + 19}" text-anchor="middle" fill="#1b4332" font-weight="bold" font-size="11">Karvanın</text>
          </svg>

          <h3 style="font-family:var(--font-display);color:#f0c75e;font-size:15px;margin-bottom:10px;">
            Kəşf Olunmuş Tarixi Dövr Salnaməsi (${state.discoveredEvents.length}/${state.totalEventsCount})
          </h3>
          ${
            state.discoveredEvents.length === 0
              ? '<p style="color:#cbb896;font-size:13.5px;">Hələ tarixi salnamə açılmayıb — karvanla yolları gəzdikcə Qobustan (e.ə.), Qəbələ (VI əsr), Şamaxı (XVI əsr), Quba-Şəki bağları və Şuşa hadisələri burada toplanacaq.</p>'
              : state.discoveredEvents
                  .map(
                    (e) => `
                <div style="padding:10px 12px;border-radius:10px;background:rgba(244,224,182,0.07);border-left:3px solid #f0c75e;margin-bottom:8px;font-size:13px;">
                  <strong style="color:#f0c75e">${e.era} — ${e.title}</strong> (${e.region})<br/>
                  <span style="color:#eadec6">${e.history_fact}</span>
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
          <h2>🏆 İRS — Böyük Karvan Ustası!</h2>
          <p style="margin:12px 0 18px;color:#f3e7d0;">
            Təbriklər! <strong>${state.gold} Qızıl</strong> toplayaraq Azərbaycan İpək Yolunun ən nüfuzlu taciri oldunuz.
          </p>
          <div style="margin-bottom:20px;font-size:13.5px;color:#cbb896;">
            Xarizma: ${state.charisma} · Zəka: ${state.intelligence} · Uğurlu bazarlıq: ${state.stats.hagglesWon} · Salnamə: ${state.discoveredEvents.length}/${state.totalEventsCount}
          </div>
          <button id="victory-continue" class="btn-primary">Səyahətə Davam Et</button>
        </div>
      </div>
    `;
    this.modalEl.querySelector('#victory-continue')?.addEventListener('click', () => {
      this.modalEl.innerHTML = '';
      this.eventBus.emit('game:continue_after_win');
    });
  }

  showToast(message, type = 'info') {
    if (!this.toastEl) return;
    const item = document.createElement('div');
    item.className = `toast-item ${type}`;
    item.textContent = message;
    this.toastEl.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 4200);
  }
}
