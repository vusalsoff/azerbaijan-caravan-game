/**
 * UI/UIManager.js
 * Qədim perqament & bürünc üslublu HUDPanel, MarketPanel, QuestPopupPanel,
 * EventPopupPanel və kliklənə bilən GTA GPS-li 2D MapChroniclePanel.
 */
export class UIManager {
  constructor(rootEl, eventBus, data) {
    this.rootEl = rootEl;
    this.eventBus = eventBus;
    this.data = data;

    this.mounted = false;
    this.marketOpen = false;
    this.mapOpen = false;
    this.muted = false;

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

  updateHUD(state) {
    this.lastState = state;
    if (!this.hudEl) return;

    const isGTA = state.cameraMode === 'gta';
    const cityLabel = state.currentCity
      ? `${state.currentCity.display_name} · ${state.currentCity.era_name}`
      : 'Qədim İpək Yolu';

    const bonuses = [];
    if (state.hasHorseBonus) bonuses.push('🐎 Qarabağ Atı (+35%)');
    if (state.speedBoostTimer > 0) bonuses.push(`⚡ Sürət (${state.speedBoostTimer}s)`);
    if (state.guardBoostTimer > 0) bonuses.push(`🛡️ Qoruyucu (${state.guardBoostTimer}s)`);

    this.hudEl.innerHTML = `
      <div class="hud-shell">
        <div class="hud-top-stack">
          <div class="hud-bar">
            <div class="hud-group">
              <div class="hud-pill">💰 Qızıl: <strong>${state.gold}</strong> / ${state.winGoldGoal}</div>
              <div class="hud-pill">🎒 Çanta: <strong>${state.totalItems}/${state.maxInventory}</strong></div>
              <div class="hud-pill">📍 <strong>${cityLabel}</strong></div>
              ${bonuses.map((b) => `<div class="hud-pill">${b}</div>`).join('')}
            </div>
            <div class="hud-group">
              <button id="btn-cam-mode" class="btn-primary">
                ${isGTA ? '🗺️ Qədim Xəritə (V)' : '🎥 GTA 3D Sürüş (V)'}
              </button>
              <button id="btn-map" class="btn-secondary">📜 Salnamə (${state.discoveredEvents.length}/${state.totalEventsCount})</button>
              <button id="btn-event-test" class="btn-secondary">✨ Yol Hadisəsi</button>
              <button id="btn-mute" class="btn-secondary">${this.muted ? '🔇' : '🔊'}</button>
            </div>
          </div>

          <div class="hud-quests">
            <h4>Aktiv Tapşırıqlar (${state.activeQuests.length})</h4>
            ${
              state.activeQuests.length === 0
                ? '<div style="color:#bda986">Xəritədə irəlilədikcə Padşah, Sənətkar və Salnaməçilər çıxacaq.</div>'
                : state.activeQuests
                    .map(
                      (q) => `
                  <div class="quest-mini">
                    <strong>${q.title}</strong><br/>
                    <span style="color:#cbb896">${q.npc_name}: ${q.required_amount}× ${this.data.getItemName(q.required_item)} → ${
                        q.target_city === 'ANY'
                          ? 'İstənilən yer'
                          : this.data.getCityById(q.target_city)?.display_name || q.target_city
                      }</span><br/>
                    <span style="color:#f0c75e">+${q.reward_gold} qızıl</span>
                  </div>`
                    )
                    .join('')
            }
          </div>
        </div>

        <div class="hud-bottom-row">
          <div class="hud-bottom-hint">
            <span>${
              isGTA
                ? '<strong>GTA Rejimi:</strong> W/S sür · A/D döndər · Sağ klik kamera · <strong>V</strong>: Qədim Xəritə'
                : '<strong>Qədim Xəritə:</strong> İstənilən yerə kliklə (GTA GPS ilə enər) · <strong>M</strong>: Salnamə'
            }</span>
            ${
              state.currentCity
                ? `<button id="btn-open-market" class="btn-primary">🏛️ ${state.currentCity.display_name} Bazarı (E)</button>`
                : ''
            }
          </div>
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
  }

  showMarket(city, state) {
    if (!this.modalEl) return;
    this.marketOpen = true;
    this.mapOpen = false;

    const cityGoodsIds = new Set(city.goods.map((g) => g.item_id));
    const extraOwned = Object.entries(state.inventory).filter(
      ([id, qty]) => qty > 0 && !cityGoodsIds.has(id)
    );

    this.modalEl.innerHTML = `
      <div id="MarketPanel" class="modal-backdrop">
        <div class="modal-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <h2>${city.display_name} Bazarı</h2>
              <div style="color:#cbb896;font-size:13px;">${city.era_name} — ${city.culture_note}</div>
            </div>
            <button id="market-close" class="btn-secondary">✕ Bağla</button>
          </div>

          <div style="margin-top:12px;display:flex;gap:14px;font-size:14px;">
            <span>💰 Qızıl: <strong style="color:#f0c75e">${state.gold}</strong></span>
            <span>🎒 Çanta: <strong>${state.totalItems}/${state.maxInventory}</strong></span>
          </div>

          <table class="market-table">
            <thead>
              <tr>
                <th>Mal</th>
                <th>Səndə</th>
                <th>Alış</th>
                <th>Satış</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              ${city.goods
                .map((g) => {
                  const owned = state.inventory[g.item_id] || 0;
                  return `
                  <tr>
                    <td><strong>${g.name}</strong></td>
                    <td>${owned}</td>
                    <td style="color:#ffd479">${g.buy_price} q.</td>
                    <td style="color:#6ee7b7">${g.sell_price} q.</td>
                    <td style="display:flex;gap:6px;">
                      <button class="btn-primary btn-buy" data-item="${g.item_id}" style="padding:5px 12px;font-size:12px;">Al</button>
                      <button class="btn-secondary btn-sell" data-item="${g.item_id}" style="padding:5px 12px;font-size:12px;" ${owned === 0 ? 'disabled' : ''}>Sat</button>
                    </td>
                  </tr>`;
                })
                .join('')}
              ${extraOwned
                .map(
                  ([itemId, owned]) => `
                <tr>
                  <td>${this.data.getItemName(itemId)} <small style="color:#cbb896">(digər bölgə)</small></td>
                  <td>${owned}</td>
                  <td>—</td>
                  <td style="color:#6ee7b7">~baza qiymət</td>
                  <td>
                    <button class="btn-secondary btn-sell" data-item="${itemId}" style="padding:5px 12px;font-size:12px;">Sat</button>
                  </td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#market-close')?.addEventListener('click', () => {
      this.eventBus.emit('market:close');
    });

    this.modalEl.querySelectorAll('.btn-buy').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.eventBus.emit('trade:buy', { cityId: city.city_id, itemId: btn.dataset.item });
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
        <div class="modal-card">
          <div style="color:${npc?.color || '#f0c75e'};font-size:13px;font-weight:700;margin-bottom:6px;">
            ${npc?.title || quest.npc_role} · ${quest.npc_name}
          </div>
          <h2>${quest.title}</h2>
          <p style="margin:12px 0 18px;line-height:1.6;color:#efe4cf;">${quest.description}</p>
          <div style="padding:12px;border-radius:10px;background:rgba(244,224,182,0.07);margin-bottom:20px;font-size:14px;">
            <div>📦 Tələb: <strong>${quest.required_amount}× ${this.data.getItemName(quest.required_item)}</strong></div>
            <div>📍 Təhvil yeri: <strong>${targetCityName}</strong></div>
            <div>💰 Mükafat: <strong style="color:#f0c75e">+${quest.reward_gold} Qızıl</strong></div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="quest-decline" class="btn-secondary">Sonra</button>
            <button id="quest-accept" class="btn-primary">Tapşırığı Qəbul Et</button>
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
        <div class="modal-card">
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
              <h2>Qədim Tarixi Xəritə & Salnamə</h2>
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
              ? '<p style="color:#cbb896;font-size:13.5px;">Hələ tarixi salnamə açılmayıb — karvanla yolları gəzdikcə e.ə. Qobustan, VI əsr Qəbələ, XII əsr Şirvan-Gəncə hadisələri burada toplanacaq.</p>'
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
        <div class="modal-card" style="text-align:center;">
          <h2>🏆 Böyük Karvan Ustası!</h2>
          <p style="margin:12px 0 18px;color:#f3e7d0;">
            Təbriklər! <strong>${state.gold} Qızıl</strong> toplayaraq Azərbaycan İpək Yolunun ən uğurlu taciri oldunuz.
          </p>
          <div style="margin-bottom:20px;font-size:14px;color:#cbb896;">
            Ticarət sayı: ${state.stats.tradesCount} · Qovulan oğru: ${state.stats.thievesRepelled} · Salnamə: ${state.discoveredEvents.length}/${state.totalEventsCount}
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
