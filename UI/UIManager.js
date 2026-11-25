import { renderItemSvg, renderSigil, renderSeljukStarDivider } from './AntiqueIcons.js';

const SHORT_ITEM_LABELS = {
  salt: 'Duz',
  oil: 'Neft',
  silk: 'İpək',
  carpet: 'Xalça',
  horse_gear: 'Yəhər',
  halva: 'Halva',
  apple: 'Alma',
  pear: 'Armud',
  pomegranate: 'Nar',
  grape: 'Üzüm',
  honey: 'Bal',
  wheat: 'Buğda',
};

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
    this.voMuted = false;

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

  setVoMuted(voMuted) {
    this.voMuted = Boolean(voMuted);
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
    const isCinema25D = isBazaar && state.bazaarRenderMode === '25d';
    const eraBanner = state.currentCity
      ? `${state.currentCity.short_name || state.currentCity.display_name} · ${state.currentCity.era_name}`
      : `Qədim İpək Yolu · Gün ${state.gameDay}`;

    // 2.5D Kinematik Rejim üçün Ultra-Minimalist Alt Menyu (~90% açıq kino ekranı!)
    if (isCinema25D) {
      const prox = state.bazaarProximity;
      const activeAngle = state.bazaarAngleId || 'courtyard';
      const angleLabel = state.bazaarAngleTitle || 'Karvansaray Həyəti';

      let contextBtnHtml = '';
      if (prox && !this.marketOpen) {
        const btnId =
          prox.type === 'exit_to_map'
            ? 'btn-exit-map'
            : prox.type === 'mission_encounter'
            ? 'btn-mission-encounter'
            : prox.type === 'angle_portal'
            ? 'btn-angle-portal'
            : prox.type === 'fayton'
            ? 'btn-board-fayton'
            : prox.type === 'palace_audience'
            ? 'btn-palace-audience'
            : 'btn-open-market';
        contextBtnHtml = `
          <div class="cinema-context-bar">
            <button id="${btnId}" class="btn-primary cinema-action-pill" data-target-angle="${prox.targetAngle || ''}">
              <span class="key-cap">E</span>
              <span>${prox.label}</span>
            </button>
          </div>
        `;
      }

      const activeQuestCount = state.activeQuests?.length || 0;
      const questPopoverHtml =
        this._cinemaQuestOpen && !this.marketOpen
          ? `
        <div class="cinema-quest-popover lotm-plate">
          <h4>Divan Əmanətləri (${activeQuestCount})</h4>
          ${
            activeQuestCount === 0
              ? '<div style="color:#a89474;font-style:italic;font-size:12px;">Hələ aktiv əmanət yoxdur. Şəhər tacirləri və yol rəvayətləri sizə tapşırıq verəcək.</div>'
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
                  <span style="color:var(--gold-bright);">+${q.reward_gold} qızıl</span>
                </div>`
                  )
                  .join('')
          }
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(196,152,76,0.22);display:flex;gap:12px;font-size:11.5px;color:#cbb796;">
            <span>${renderSigil('charisma', 13)} Nüfuz: <strong style="color:var(--gold-bright);">${state.charisma}</strong></span>
            <span>${renderSigil('intelligence', 13)} Fərasət: <strong style="color:var(--gold-bright);">${state.intelligence}</strong></span>
          </div>
        </div>
      `
          : '';

      const roomsList =
        state.bazaarRooms && state.bazaarRooms.length > 0
          ? state.bazaarRooms
          : [
              { id: 'courtyard', shortTitle: 'Həyət' },
              { id: 'carpet_gallery', shortTitle: 'Pasaj' },
              { id: 'palace_hall', shortTitle: 'Divan' },
            ];
      const roomsPillsHtml = roomsList
        .map(
          (rm) =>
            `<button class="cinema-pill ${activeAngle === rm.id ? 'active' : ''}" data-angle="${rm.id}" title="${rm.title || rm.shortTitle}">${rm.shortTitle}</button>`
        )
        .join('');
      const separateRoomRow = roomsList.length >= 4;

      const isNight = state.timeOfDay === 'night';
      this.hudEl.innerHTML = `
        <div class="cinema-hud-shell">
          <div class="cinema-top-strip">
            <div class="cinema-location-whisper">
              <span class="cinema-brand-mark">KARVA</span>
              <span class="cinema-sep">·</span>
              <span class="cinema-city-text">${state.bazaarCityLabel || state.currentCity?.short_name || 'Bakı'}</span>
              <span class="cinema-sep">·</span>
              <span class="cinema-zone-text">${angleLabel}</span>
            </div>
            <div class="cinema-top-right-mini">
              <button id="btn-toggle-time" class="cinema-mini-btn" title="Səhər / Gecə Modu (T)">${isNight ? '☾ Gecə' : '☀ Səhər'}</button>
              <button id="btn-toggle-25d" class="cinema-mini-btn" title="Klassik 3D Rejiminə keç">🏛️ 3D</button>
              <button id="btn-vo-toggle" class="cinema-mini-btn" title="Səsləndirmə (Voiceover) Aç/Bağla">${this.voMuted ? '🎙️✕' : '🎙️'}</button>
              <button id="btn-mute" class="cinema-mini-btn" title="Səs">${this.muted ? '🔇' : '🔊'}</button>
              <button id="btn-settings" class="cinema-mini-btn" title="Ayarlar">⚙</button>
            </div>
          </div>

          <div class="cinema-bottom-wrap">
            ${questPopoverHtml}
            ${contextBtnHtml}
            ${
              separateRoomRow
                ? `<div class="cinema-room-strip lotm-plate" title="Şəhərin Xüsusi Məkanları">${roomsPillsHtml}</div>`
                : ''
            }
            <div class="cinema-dock lotm-plate">
              <div class="cinema-stat" title="Xəzinə">
                ${renderSigil('coin', 14)}
                <strong>${state.gold}</strong><small>/${state.winGoldGoal}</small>
              </div>
              <div class="cinema-stat" title="Gün">
                ${renderSigil('sun', 13)}
                <span>G.${state.gameDay}</span>
              </div>
              ${
                !separateRoomRow
                  ? `<span class="cinema-dock-div"></span><div class="cinema-angle-pills">${roomsPillsHtml}</div>`
                  : ''
              }
              <span class="cinema-dock-div"></span>
              <button id="btn-inv-top" class="cinema-dock-btn" title="Karvan Heybəsi (I)">
                ${renderSigil('satchel', 14)}
                <span>Heybə <b>${state.totalItems}/${state.maxInventory}</b></span>
              </button>
              <button id="btn-exit-map-top" class="cinema-dock-btn gold" title="Qədim Xəritə (X)">
                ${renderSigil('compass', 14)}
                <span>Xəritə</span>
              </button>
              <button id="btn-cinema-quests" class="cinema-dock-btn ${this._cinemaQuestOpen ? 'active' : ''}" title="Divan Əmanətləri & Bacarıqlar">
                ${renderSigil('seal', 14)}
                <span>Əmanət (${activeQuestCount})</span>
              </button>
              <button id="btn-map" class="cinema-dock-btn" title="Tarixi Salnamə (M)">
                ${renderSigil('scroll', 14)}
                <span>Salnamə</span>
              </button>
              <button id="btn-event-test" class="cinema-dock-btn" title="Yol Rəvayəti">✦</button>
            </div>
          </div>
        </div>
      `;

      this.hudEl.querySelectorAll('.cinema-pill[data-angle]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.eventBus.emit('bazaar:switch_angle', btn.dataset.angle);
        });
      });
      this.hudEl.querySelector('#btn-angle-portal')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const prox = this.lastState?.bazaarProximity;
        const targetAngle = e.currentTarget.dataset.targetAngle || prox?.targetAngle;
        if (targetAngle) {
          this.eventBus.emit('bazaar:switch_angle', {
            angleId: targetAngle,
            targetSpawn: prox?.targetSpawn || null,
            targetYaw: prox?.targetYaw,
          });
        }
      });
      this.hudEl.querySelector('#btn-cinema-quests')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._cinemaQuestOpen = !this._cinemaQuestOpen;
        this.updateHUD(this.lastState);
      });
      this.hudEl.querySelector('#btn-toggle-time')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eventBus.emit('bazaar:toggle_time');
      });
      this.hudEl.querySelector('#btn-mission-encounter')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eventBus.emit('world:trigger_event_now', {
          spotId: this.lastState?.bazaarProximity?.spotId || null,
        });
      });
      this.hudEl.querySelector('#btn-toggle-25d')?.addEventListener('click', () => {
        this.eventBus.emit('bazaar:toggle_render_mode');
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
      this.hudEl.querySelector('#btn-board-fayton')?.addEventListener('click', () => {
        this.eventBus.emit('fayton:open');
      });
      this.hudEl.querySelector('#btn-palace-audience')?.addEventListener('click', () => {
        this.eventBus.emit('palace:audience');
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
      this.hudEl.querySelector('#btn-vo-toggle')?.addEventListener('click', () => {
        this.eventBus.emit('audio:toggle_vo');
      });
      this.hudEl.querySelector('#btn-mute')?.addEventListener('click', () => {
        this.eventBus.emit('audio:toggle_mute');
      });
      this.hudEl.querySelector('#btn-settings')?.addEventListener('click', () => {
        this.eventBus.emit('ui:open_settings');
      });
      return;
    }

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
        : prox?.type === 'horse_mount'
          ? `<button id="btn-mount-horse" class="btn-primary">
              <span class="key-cap">E</span>
              <span>${prox.label}</span>
            </button>
            <span style="color:#b8a484;font-size:12.5px;">Atdan enmək üçün: <span class="key-cap">R</span></span>`
          : prox?.type === 'fayton'
          ? `<button id="btn-board-fayton" class="btn-primary">
              <span class="key-cap">E</span>
              <span>${prox.label}</span>
            </button>
            <span style="color:#b8a484;font-size:12.5px;">Faytonla Bakı · Şəki · Şuşa səfəri</span>`
          : prox?.type === 'palace_audience'
          ? `<button id="btn-palace-audience" class="btn-primary">
              <span class="key-cap">E</span>
              <span>${prox.label}</span>
            </button>
            <span style="color:#b8a484;font-size:12.5px;">${prox.palaceTitle || 'Saray Qəbulu'}</span>`
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
              <span class="irs-logo-main">KARVA</span>
              <span class="irs-logo-sub">Karvan Yolu</span>
            </div>
            <div class="hud-pill" title="Xəzinə və Hədəf">
              ${renderSigil('coin', 15)}
              <span><strong>${state.gold}</strong> / ${state.winGoldGoal}</span>
            </div>
            <button id="btn-hud-inventory" class="hud-pill clickable" title="İnventarı Aç (I)">
              ${renderSigil('satchel', 15)}
              <span>İnventar: <strong>${state.totalItems}/${state.maxInventory}</strong></span>
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
                ? `<button id="btn-toggle-25d" class="btn-emerald" title="2.5D Kinematik və Klassik 3D arasında keçid">${state.bazaarRenderMode === '25d' ? '🏛️ Klassik 3D' : '✦ 2.5D Kinematik'}</button>
                   <button id="btn-exit-map-top" class="btn-primary">${renderSigil('compass', 15)} <span>Qədim Xəritə (X)</span></button>`
                : ''
            }
            <button id="btn-inv-top" class="btn-secondary" title="İnventar (I)">
              ${renderSigil('satchel', 15)}
              <span>İnventar (I)</span>
            </button>
            <button id="btn-map" class="btn-secondary" title="Tarixi Salnamə (M)">
              ${renderSigil('scroll', 15)}
              <span>Salnamə (${state.discoveredEvents.length}/${state.totalEventsCount})</span>
            </button>
            <button id="btn-event-test" class="btn-secondary" title="Yol Qarşılaşması">
              ${renderSigil('seal', 15)}
              <span>Rəvayət</span>
            </button>
            <button id="btn-vo-toggle" class="btn-secondary" title="Səsləndirməni Aç/Bağla">${this.voMuted ? '🎙️ Səsləndirmə: Bağlı' : '🎙️ Səsləndirmə'}</button>
            <button id="btn-mute" class="btn-secondary" title="Səs">${this.muted ? 'Səssiz' : 'Səs'}</button>
            <button id="btn-settings" class="btn-secondary" title="Ayarlar">⚙ Ayarlar</button>
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
            <div class="gta-minimap-wrap${this.minimapExpanded ? ' is-expanded' : ''}" id="gta-minimap-wrap" title="Şəhər xəritəsini açmaq / bağlamaq üçün klikləyin" style="display:${isBazaar && state.bazaarRenderMode !== '25d' ? 'block' : 'none'};">
              <div class="gta-minimap-controls">
                <button type="button" class="gta-minimap-btn" id="btn-minimap-rot">${this.minimapRotate ? 'Yön: Oyunçu' : 'Yön: Şimal ↑'}</button>
                <button type="button" class="gta-minimap-btn" id="btn-minimap-clear-wp">Hədəfi Sil</button>
                <button type="button" class="gta-minimap-btn" id="btn-minimap-close">Bağla</button>
              </div>
              <canvas class="gta-minimap-canvas" id="gta-minimap" width="172" height="148"></canvas>
              <div class="gta-minimap-label">
                <span id="gta-minimap-zone">Karvansara Həyəti</span>
                <span id="gta-minimap-compass">${this.minimapExpanded ? 'Xəritədə hədəf seç · Ş ↑' : 'Ş ↑'}</span>
              </div>
            </div>
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

    this.hudEl.querySelector('#btn-minimap-rot')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimapRotate = !this.minimapRotate;
      e.currentTarget.textContent = this.minimapRotate ? 'Yön: Oyunçu' : 'Yön: Şimal ↑';
    });
    this.hudEl.querySelector('#btn-minimap-clear-wp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cityWaypoint = null;
      this.eventBus.emit('bazaar:set_waypoint', null);
    });
    this.hudEl.querySelector('#btn-minimap-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimapExpanded = false;
      this.hudEl.querySelector('#gta-minimap-wrap')?.classList.remove('is-expanded');
    });
    this.hudEl.querySelector('#gta-minimap-wrap')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.minimapExpanded) {
        this.minimapExpanded = true;
        const wrap = this.hudEl.querySelector('#gta-minimap-wrap');
        if (wrap) wrap.classList.add('is-expanded');
        const comp = this.hudEl.querySelector('#gta-minimap-compass');
        if (comp) comp.textContent = 'Xəritədə hədəf seç · Ş ↑';
        return;
      }
      // Böyüdülmüş xəritədə kliklədikdə dünya koordinatında hədəf qoy
      const canvas = this.hudEl.querySelector('#gta-minimap');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const u = (e.clientX - rect.left) / Math.max(1, rect.width);
        const v = (e.clientY - rect.top) / Math.max(1, rect.height);
        // bazaar_satellite_map.png koordinatları: u = 0.50 + x/100, v = 0.25 + z/100
        const wx = (u - 0.5) * 100;
        const wz = (v - 0.25) * 100;
        this.cityWaypoint = { x: wx, z: wz };
        this.eventBus.emit('bazaar:set_waypoint', this.cityWaypoint);
      }
    });
    this.hudEl.querySelector('#btn-cam-mode')?.addEventListener('click', () => {
      this.eventBus.emit('camera:toggle_mode');
    });
    this.hudEl.querySelector('#btn-enter-bazaar')?.addEventListener('click', () => {
      this.eventBus.emit('scene:enter_bazaar', state.currentCityId);
    });
    this.hudEl.querySelector('#btn-exit-map')?.addEventListener('click', () => {
      this.eventBus.emit('scene:exit_to_world');
    });
    this.hudEl.querySelector('#btn-toggle-25d')?.addEventListener('click', () => {
      this.eventBus.emit('bazaar:toggle_render_mode');
    });
    this.hudEl.querySelector('#btn-exit-map-top')?.addEventListener('click', () => {
      this.eventBus.emit('scene:exit_to_world');
    });
    this.hudEl.querySelector('#btn-open-market')?.addEventListener('click', () => {
      this.eventBus.emit('market:open');
    });
    this.hudEl.querySelector('#btn-board-fayton')?.addEventListener('click', () => {
      this.eventBus.emit('fayton:open');
    });
    this.hudEl.querySelector('#btn-palace-audience')?.addEventListener('click', () => {
      this.eventBus.emit('palace:audience');
    });
    this.hudEl.querySelector('#btn-mount-horse')?.addEventListener('click', () => {
      this.eventBus.emit('horse:toggle_mount');
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
    this.hudEl.querySelector('#btn-vo-toggle')?.addEventListener('click', () => {
      this.eventBus.emit('audio:toggle_vo');
    });
    this.hudEl.querySelector('#btn-mute')?.addEventListener('click', () => {
      this.eventBus.emit('audio:toggle_mute');
    });
    this.hudEl.querySelector('#btn-settings')?.addEventListener('click', () => {
      this.eventBus.emit('ui:open_settings');
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
      const shortName = SHORT_ITEM_LABELS[item.itemId] || item.meta.name;
      slotsHtml.push(`
        <div class="lotm-slot ${isSel ? 'selected' : ''}" data-vault-item="${item.itemId}" title="${item.meta.name}">
          <span class="lotm-slot-qty">${item.qty}×</span>
          ${renderItemSvg(item.itemId, 30)}
          <div class="lotm-slot-name">${shortName}</div>
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

    const invCap = state.maxInventory || 12;
    const emptyCount = Math.max(0, Math.min(24, invCap) - slotsHtml.length);
    for (let i = 0; i < emptyCount; i++) {
      slotsHtml.push(`
        <div class="lotm-slot empty">
          ${renderSigil('seal', 18)}
          <span style="font-size:10.5px;">Boş</span>
        </div>
      `);
    }

    const cityShort = state.currentCity?.short_name || null;
    const upgradeCost = invCap < 18 ? 65 : 120;
    const canUpgradeInv = invCap < 24;

    this.modalEl.innerHTML = `
      <div id="InventoryModal" class="modal-backdrop">
        <div class="modal-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <div class="wax-seal-tag">${renderSigil('satchel', 12)} Karvan Çantası</div>
              <h2 style="margin-top:6px;">Karvan İnventarı</h2>
              <div style="font-size:13px;color:var(--text-muted);">
                Tutum: <strong style="color:var(--gold-bright)">${state.totalItems} / ${state.maxInventory}</strong> bağlama ·
                Xəzinə: <strong style="color:var(--gold-bright)">${state.gold} qızıl</strong> ·
                Karvan Sürəti: <strong>${state.hasHorseBonus ? '+35% (Köhlən)' : 'Adi gediş'}</strong>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
              ${
                canUpgradeInv
                  ? `<button id="btn-upgrade-inv" class="btn-primary" style="padding:7px 12px;font-size:12.5px;">
                       +6 Göz Böyüt (${upgradeCost} q.)
                     </button>`
                  : `<span class="wax-seal-tag" style="background:rgba(50,110,60,0.35);">Maks. Heybə (24)</span>`
              }
              <button id="inv-close" class="btn-secondary">✕ Bağla (I / Esc)</button>
            </div>
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

    this.modalEl.querySelector('#btn-upgrade-inv')?.addEventListener('click', () => {
      this.eventBus.emit('inventory:upgrade');
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
            .map((g) => {
              const ownedCount = state.inventory[g.item_id] || 0;
              const shortLabel = SHORT_ITEM_LABELS[g.item_id] || g.name;
              return `
            <button class="irs-item-chip ${g.item_id === this.selectedMarketItemId ? 'active' : ''}" data-select="${g.item_id}" title="${g.name}">
              ${ownedCount > 0 ? `<span class="irs-chip-qty">×${ownedCount}</span>` : ''}
              ${renderItemSvg(g.item_id, 22)}
              <span>${shortLabel}</span>
            </button>`;
            })
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

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">
          <button class="btn-secondary btn-haggle-approach" data-approach="gentle" style="font-size:11.5px;padding:6px 4px;" ${analysis.haggle.attempted ? 'disabled' : ''}>Mülayim</button>
          <button class="btn-secondary btn-haggle-approach" data-approach="reasoned" style="font-size:11.5px;padding:6px 4px;" ${analysis.haggle.attempted ? 'disabled' : ''}>Əsaslı</button>
          <button class="btn-secondary btn-haggle-approach" data-approach="firm" style="font-size:11.5px;padding:6px 4px;" ${analysis.haggle.attempted ? 'disabled' : ''}>Sərt</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:8px;">
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
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding-bottom:6px;border-bottom:1px solid rgba(196,152,76,0.28);">
              <span style="font-family:var(--font-display);font-size:17px;font-weight:700;letter-spacing:0.05em;color:var(--gold-bright);">
                ${city.short_name || city.display_name} Bazarı
              </span>
              <div style="display:flex;gap:5px;">
                <button id="market-open-vault" class="btn-secondary" style="padding:4px 8px;font-size:11.5px;" title="Ayrıca İkonlu İnventarı Aç (I)">
                  ${renderSigil('satchel', 13)}
                  <span>İnventar</span>
                </button>
                <button id="market-close" class="btn-secondary" style="padding:4px 8px;font-size:12px;">✕</button>
              </div>
            </div>

            <div class="lotm-tabs">
              <button class="lotm-tab ${this.dockedMarketTab === 'stall' ? 'active' : ''}" data-tab="stall">
                Bazar Malları (${city.goods.length})
              </button>
              <button class="lotm-tab ${this.dockedMarketTab === 'bag' ? 'active' : ''}" data-tab="bag">
                Çantam · Satış (${state.totalItems}/${state.maxInventory})
              </button>
            </div>

            ${this.dockedMarketTab === 'stall' ? stallBodyHtml : bagBodyHtml}
          </div>
        </div>
      `;

      this.modalEl.querySelector('#market-open-vault')?.addEventListener('click', () => {
        this.eventBus.emit('ui:toggle_inventory');
      });

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

      this.modalEl.querySelectorAll('.btn-haggle-approach').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.eventBus.emit('trade:haggle', {
            cityId: city.city_id,
            itemId: this.selectedMarketItemId,
            approach: btn.getAttribute('data-approach'),
          });
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

                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0;">
                      <button class="btn-secondary btn-haggle-approach" data-approach="gentle" style="font-size:11.5px;padding:6px 4px;" ${analysis.haggle.attempted ? 'disabled' : ''}>Mülayim</button>
                      <button class="btn-secondary btn-haggle-approach" data-approach="reasoned" style="font-size:11.5px;padding:6px 4px;" ${analysis.haggle.attempted ? 'disabled' : ''}>Əsaslı</button>
                      <button class="btn-secondary btn-haggle-approach" data-approach="firm" style="font-size:11.5px;padding:6px 4px;" ${analysis.haggle.attempted ? 'disabled' : ''}>Sərt</button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;">
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

    this.modalEl.querySelectorAll('.btn-haggle-approach').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.eventBus.emit('trade:haggle', {
          cityId: city.city_id,
          itemId: this.selectedMarketItemId,
          approach: btn.getAttribute('data-approach'),
        });
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
          ${quest.clue_text ? `<div style="margin:-6px 0 14px;padding:8px 12px;border-left:2px solid var(--gold-bright);background:rgba(212,175,55,0.08);font-size:12.5px;color:#e7d3a5;font-style:italic;">📜 Sirli İpucu: ${quest.clue_text}</div>` : ''}
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
          ${evt.video_file ? `<video src="${evt.video_file}" autoplay loop muted playsinline style="width:100%;max-height:230px;object-fit:cover;border-radius:8px;border:1px solid rgba(212,175,55,0.48);margin:8px 0 12px;background:#0e0b08;"></video>` : ''}
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

    const toPct = (x, z) => ({
      px: Math.max(5, Math.min(93, ((x + 62) / 124) * 86 + 6)),
      py: Math.max(8, Math.min(90, ((z + 42) / 84) * 82 + 8)),
    });

    const uvByCity = {
      City_Baku: { px: 75.5, py: 48.5, label: 'Bakı · İçərişəhər' },
      City_Sheki: { px: 46.5, py: 27.5, label: 'Şəki · Karvansaray' },
      City_Shusha: { px: 15.5, py: 44.5, label: 'Şuşa · Qala Şəhəri' },
    };

    const mPct = state.currentCityId && uvByCity[state.currentCityId]
      ? uvByCity[state.currentCityId]
      : merchantPos
        ? toPct(merchantPos.x, merchantPos.z)
        : { px: 75.5, py: 48.5 };
    let cities = cityPositions || {};
    if (Object.keys(cities).length === 0) {
      cities = uvByCity;
    }

    this.modalEl.innerHTML = `
      <div id="MapChroniclePanel" class="modal-backdrop">
        <div class="modal-card" style="max-width:1120px;width:95vw;max-height:92vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div>
              <div class="wax-seal-tag">${renderSigil('compass', 12)} XVI Əsr Tarixi Karvan Xəritəsi</div>
              <h2 style="margin-top:5px;">Azərbaycan Karvan Xəritəsi · Sizin Yeriniz və Şəhərlər</h2>
              <div style="font-size:12.5px;color:var(--text-muted);">İstənilən şəhər nişanına klikləyərək birbaşa səfərə çıxın.</div>
            </div>
            <button id="map-close" class="btn-secondary">✕ Bağla (X / M)</button>
          </div>

          ${renderSeljukStarDivider()}

          <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;border:2px solid rgba(212,175,55,0.65);box-shadow:0 12px 36px rgba(0,0,0,0.75);margin:10px 0 16px;background:#1b120a;">
            <img src="./images/ancient_azerbaijan_map.jpg" alt="Qədim Azərbaycan Karvan Xəritəsi" style="width:100%;height:100%;object-fit:cover;display:block;" />
            <div style="position:absolute;inset:0;background:radial-gradient(circle at center, transparent 68%, rgba(10,10,8,0.32) 100%);pointer-events:none;"></div>
            ${Object.entries(cities)
              .map(([id, c]) => {
                const p = uvByCity[id] || toPct(c.x, c.z);
                const visited = state.visitedCityIds.includes(id);
                const isCurrent = state.currentCityId === id;
                return `
                  <button class="svg-city-target" data-city="${id}" style="position:absolute;left:${p.px}%;top:${p.py}%;transform:translate(-50%,-50%);background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0;">
                    <span style="width:${isCurrent ? 18 : 14}px;height:${isCurrent ? 18 : 14}px;border-radius:50%;background:${isCurrent ? '#f5d26b' : visited ? '#b83232' : '#2b2015'};border:2.5px solid #fff3d6;box-shadow:0 0 12px rgba(0,0,0,0.9);display:block;"></span>
                    <span style="background:rgba(16,13,10,0.88);color:#f5e6c8;border:1px solid rgba(212,175,55,0.55);padding:2px 7px;border-radius:4px;font-size:11.5px;font-weight:700;white-space:nowrap;text-shadow:0 1px 2px #000;">${c.label || uvByCity[id]?.label || id}${isCurrent ? ' ★' : ''}</span>
                  </button>
                `;
              })
              .join('')}
            <div style="position:absolute;left:${mPct.px}%;top:${mPct.py}%;transform:translate(-50%,16px);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;">
              <span style="width:14px;height:14px;background:#ffffff;border:2.5px solid #e0a838;border-radius:50%;box-shadow:0 0 14px #f5d26b, 0 0 4px #000;"></span>
              <span style="background:rgba(212,175,55,0.95);color:#140e08;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:800;white-space:nowrap;">Sizin Yeriniz</span>
            </div>
          </div>

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
          <h2 style="margin-top:10px;font-size:28px;">KARVA — Qələbə Möhürü</h2>
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

  /**
   * GTA V üslubunda canlı radar mini-xəritəni yeniləyir.
   */
  /**
   * Hər şəhərin (Bakı, Şəki, Şuşa) özünəməxsus Xəritəsi + 3D koordinat markerləri.
   */
  updateMinimap({ x = 0, z = 0, yaw = 0, markers = [], cityName = '', cityId = 'City_Baku' } = {}) {
    const wrap = document.getElementById('gta-minimap-wrap');
    if (wrap) {
      if (wrap.style.display !== 'block') wrap.style.display = 'block';
      wrap.classList.toggle('is-expanded', !!this.minimapExpanded);
    }
    const canvas = document.getElementById('gta-minimap');
    if (!canvas) return;
    const targetW = this.minimapExpanded ? Math.max(360, wrap?.clientWidth || 540) : 172;
    const targetH = this.minimapExpanded ? Math.max(360, wrap?.clientHeight || 540) : 148;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const zoneEl = document.getElementById('gta-minimap-zone');
    if (zoneEl) {
      const area = z > 38 ? 'Liman Meydanı' : z > 14.5 ? 'Çöl Bazar' : 'Karvansara Həyəti';
      zoneEl.textContent = cityName ? `${cityName} · ${area}` : area;
    }

    if (!this._satMinimapImg) {
      this._satMinimapImg = new Image();
      this._satMinimapImg.src = './images/bazaar_satellite_map.png';
    }

    if (!this._cityMapCache) this._cityMapCache = {};

    const getCitySatelliteCanvas = (cid) => {
      if (this._cityMapCache[cid]) return this._cityMapCache[cid];
      const off = document.createElement('canvas');
      off.width = 512;
      off.height = 512;
      const octx = off.getContext('2d');
      const isSheki = cid === 'City_Sheki';

      // Zəngin teksturalı torpaq/dağ/qayalıq fonu
      octx.fillStyle = isSheki ? '#354f2d' : '#4a4e52';
      octx.fillRect(0, 0, 512, 512);

      let seed = isSheki ? 101 : 202;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // Təbii relyef ləkələri və ağac/qaya teksturası
      for (let i = 0; i < 650; i++) {
        const rx = rand() * 512;
        const ry = rand() * 512;
        const rr = 3 + rand() * 14;
        octx.fillStyle = isSheki
          ? rand() > 0.5
            ? 'rgba(34, 62, 26, 0.42)'
            : 'rgba(84, 110, 52, 0.35)'
          : rand() > 0.5
            ? 'rgba(54, 58, 64, 0.45)'
            : 'rgba(115, 118, 122, 0.32)';
        octx.beginPath();
        octx.arc(rx, ry, rr, 0, Math.PI * 2);
        octx.fill();
      }

      // Şəki: Qıvrılan mavi dağ çayı + daş körpü; Şuşa: Cıdır Düzü qayalıq yarğanı
      if (isSheki) {
        octx.strokeStyle = '#2c7694';
        octx.lineWidth = 24;
        octx.lineCap = 'round';
        octx.beginPath();
        octx.moveTo(45, 0);
        octx.bezierCurveTo(115, 140, 40, 290, 95, 512);
        octx.stroke();
        octx.strokeStyle = '#53a6c4';
        octx.lineWidth = 8;
        octx.stroke();
      } else {
        octx.fillStyle = '#2d3033';
        octx.fillRect(0, 0, 512, 42);
        octx.strokeStyle = '#7e838a';
        octx.lineWidth = 4;
        octx.beginPath();
        octx.moveTo(0, 44);
        octx.lineTo(512, 44);
        octx.stroke();
      }

      // 100m x 100m dünya koordinatını 512x512 xəritəyə çevir (mərkəz: 0.50, 0.25)
      const toPx = (wx, wz) => [(0.5 + wx / 100) * 512, (0.25 + wz / 100) * 512];
      const sc = 512 / 100;

      // Karvansaray həyəti və küçə döşəməsi
      const [cyX, cyY] = toPx(-13, -11);
      octx.fillStyle = isSheki ? '#8c775c' : '#7b7c7d';
      octx.fillRect(cyX, cyY, 26 * sc, 25 * sc);
      const [stX, stY] = toPx(-6, 14);
      octx.fillRect(stX, stY, 12 * sc, 44 * sc);

      // Qərb Bağça Həyəti
      const [gx, gy] = toPx(-25, -10.5);
      octx.fillStyle = '#335229';
      octx.fillRect(gx, gy, 12 * sc, 24 * sc);

      // Karvansaray divarları (kölgəli)
      octx.fillStyle = isSheki ? '#b56e52' : '#9aa1a8';
      const drawWall = (wx, wz, ww, wd) => {
        const [px, py] = toPx(wx, wz);
        octx.fillStyle = 'rgba(0,0,0,0.35)';
        octx.fillRect(px + 2, py + 2, ww * sc, wd * sc);
        octx.fillStyle = isSheki ? '#b56e52' : '#aeb4ba';
        octx.fillRect(px, py, ww * sc, wd * sc);
      };
      drawWall(-13.5, -11.6, 27, 1.4);
      drawWall(-13.5, -11.6, 1.4, 26.2);
      drawWall(12.1, -11.6, 1.4, 26.2);
      drawWall(-13.5, 13.4, 11.3, 1.4);
      drawWall(2.2, 13.4, 11.3, 1.4);

      // Şəhərin Xan Sarayı (Şəkidə qərbdə, Şuşada şərqdə)
      const [palX, palY] = isSheki ? toPx(-25, -22) : toPx(14, -22);
      octx.fillStyle = 'rgba(0,0,0,0.4)';
      octx.fillRect(palX + 3, palY + 3, 12 * sc, 8 * sc);
      octx.fillStyle = isSheki ? '#9c3e2b' : '#43586b';
      octx.fillRect(palX, palY, 12 * sc, 8 * sc);
      octx.strokeStyle = '#d4a442';
      octx.lineWidth = 1.5;
      octx.strokeRect(palX, palY, 12 * sc, 8 * sc);

      // Küçə boyu damları olan bazar binaları
      for (const [bx, bz, bw, bd] of [
        [-12.8, 16.5, 4.8, 5.2], [-12.6, 28.2, 5.0, 5.6], [-10.5, 44, 5.5, 6],
        [12.8, 16.8, 4.8, 5.4], [12.6, 28.5, 5.0, 5.6], [10.5, 44, 5.5, 6],
        [-20.5, 25, 7, 8], [20.5, 25, 7, 8],
      ]) {
        const [px, py] = toPx(bx - bw / 2, bz - bd / 2);
        octx.fillStyle = 'rgba(0,0,0,0.35)';
        octx.fillRect(px + 2, py + 2, bw * sc, bd * sc);
        octx.fillStyle = isSheki ? '#9e4731' : '#58626b';
        octx.fillRect(px, py, bw * sc, bd * sc);
      }

      // Ağac çətirləri
      for (const [tx, tz] of [
        [-9, 18], [9, 18], [-9, 28], [9, 28], [-16, 24], [16, 24], [-19, -4], [-19, 8],
      ]) {
        const [px, py] = toPx(tx, tz);
        octx.fillStyle = isSheki ? '#244a20' : '#2f4533';
        octx.beginPath();
        octx.arc(px, py, 2.2 * sc, 0, Math.PI * 2);
        octx.fill();
      }

      this._cityMapCache[cid] = off;
      return off;
    };

    const drawCityBackdrop = (isFull) => {
      if (cityId === 'City_Baku' && this._satMinimapImg.complete && this._satMinimapImg.naturalWidth > 0) {
        if (isFull) {
          ctx.drawImage(this._satMinimapImg, 0, 0, w, h);
        } else {
          ctx.drawImage(this._satMinimapImg, -50, -25, 100, 100);
        }
        return;
      }

      const cityCanvas = getCitySatelliteCanvas(cityId);
      if (isFull) {
        ctx.drawImage(cityCanvas, 0, 0, w, h);
      } else {
        ctx.drawImage(cityCanvas, -50, -25, 100, 100);
      }
    };

    ctx.fillStyle = '#1b150f';
    ctx.fillRect(0, 0, w, h);

    const scale = 3.2; // 1m = 3.2px (kompakt radar üçün)
    const rotAngle = !this.minimapExpanded && this.minimapRotate ? yaw - Math.PI : 0;

    if (this.minimapExpanded) {
      drawCityBackdrop(true);
      ctx.fillStyle = 'rgba(10, 12, 14, 0.10)';
      ctx.fillRect(0, 0, w, h);

      const toScreen = (wx, wz) => [(0.5 + wx / 100) * w, (0.25 + wz / 100) * h];

      for (const m of markers) {
        const [mx, my] = toScreen(m.x, m.z);
        if (mx < -8 || mx > w + 8 || my < -8 || my > h + 8) continue;
        ctx.fillStyle = m.color || '#f3c65f';
        ctx.beginPath();
        ctx.arc(mx, my, (m.radius || 4) * 1.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#110d08';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (this.cityWaypoint) {
        const [wx, wy] = toScreen(this.cityWaypoint.x, this.cityWaypoint.z);
        ctx.strokeStyle = '#f3cf70';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(wx, wy, 9, 0, Math.PI * 2);
        ctx.stroke();
      }

      const [px, py] = toScreen(x, z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-yaw + Math.PI);
      ctx.scale(1.35, 1.35);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#110d08';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5.5, 5.5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-5.5, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Kompakt mini-xəritə (oyunçu mərkəzli, istəyə bağlı dönən)
    ctx.save();
    ctx.translate(cx, cy);
    if (rotAngle !== 0) ctx.rotate(rotAngle);
    ctx.scale(scale, scale);
    ctx.translate(-x, -z);

    drawCityBackdrop(false);

    for (const m of markers) {
      const dist = Math.hypot(m.x - x, m.z - z);
      if (dist > 26) continue;
      ctx.fillStyle = m.color || '#f3c65f';
      ctx.beginPath();
      ctx.arc(m.x, m.z, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#110d08';
      ctx.lineWidth = 0.35;
      ctx.stroke();
    }

    if (this.cityWaypoint) {
      ctx.strokeStyle = '#f3cf70';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(this.cityWaypoint.x, this.cityWaypoint.z, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Mərkəzdə oyunçu oxu
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.minimapRotate ? 0 : -yaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#110d08';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5.5, 5.5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  showSettingsModal(audioSettings, perfMode = 'fast', callbacks = {}) {
    if (!this.modalEl && this.rootEl) {
      this.modalEl = document.createElement('div');
      this.rootEl.appendChild(this.modalEl);
    }
    if (!this.modalEl) return;

    this.marketOpen = false;
    this.inventoryOpen = false;
    this.mapOpen = true;

    const musicPct = Math.round((audioSettings?.musicVolume ?? 0.65) * 100);
    const sfxPct = Math.round((audioSettings?.sfxVolume ?? 0.85) * 100);
    const voPct = Math.round((audioSettings?.voVolume ?? 0.9) * 100);
    const musicMuted = Boolean(audioSettings?.musicMuted);
    const sfxMuted = Boolean(audioSettings?.sfxMuted);
    const voMuted = Boolean(audioSettings?.voMuted);

    this.modalEl.innerHTML = `
      <div class="modal-backdrop" style="z-index:80;">
        <div class="modal-card lotm-plate" style="max-width:480px;width:92vw;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h2 style="margin:0;color:#f3cf70;font-size:22px;">⚙ Ayarlar · Səs və Performans</h2>
            <button id="settings-close" class="btn-ghost">✕ Bağla</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="padding:12px;background:rgba(16,12,8,0.75);border:1px solid rgba(212,175,55,0.35);border-radius:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="color:#f5e6c8;">🎵 Musiqi Səsi (<span id="lbl-music-pct">${musicPct}%</span>)</strong>
                <label style="font-size:12.5px;color:#cbb893;cursor:pointer;">
                  <input type="checkbox" id="chk-music-mute" ${musicMuted ? 'checked' : ''} /> Səssiz
                </label>
              </div>
              <input id="rng-music-vol" type="range" min="0" max="100" value="${musicPct}" style="width:100%;accent-color:#cfa355;" />
            </div>

            <div style="padding:12px;background:rgba(16,12,8,0.75);border:1px solid rgba(212,175,55,0.35);border-radius:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="color:#f5e6c8;">🎙️ Səsləndirmə / Rəvayətçi (<span id="lbl-vo-pct">${voPct}%</span>)</strong>
                <label style="font-size:12.5px;color:#cbb893;cursor:pointer;">
                  <input type="checkbox" id="chk-vo-mute" ${voMuted ? 'checked' : ''} /> Səssiz (Yalnız Musiqi)
                </label>
              </div>
              <input id="rng-vo-vol" type="range" min="0" max="100" value="${voPct}" style="width:100%;accent-color:#cfa355;" />
            </div>

            <div style="padding:12px;background:rgba(16,12,8,0.75);border:1px solid rgba(212,175,55,0.35);border-radius:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="color:#f5e6c8;">🔊 Effekt Səsləri (<span id="lbl-sfx-pct">${sfxPct}%</span>)</strong>
                <label style="font-size:12.5px;color:#cbb893;cursor:pointer;">
                  <input type="checkbox" id="chk-sfx-mute" ${sfxMuted ? 'checked' : ''} /> Səssiz
                </label>
              </div>
              <input id="rng-sfx-vol" type="range" min="0" max="100" value="${sfxPct}" style="width:100%;accent-color:#cfa355;" />
            </div>

            <div style="padding:12px;background:rgba(16,12,8,0.75);border:1px solid rgba(212,175,55,0.35);border-radius:8px;">
              <strong style="color:#f5e6c8;display:block;margin-bottom:8px;">⚡ Qrafik və Performans Rejimi</strong>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button type="button" class="btn-secondary perf-mode-btn" data-mode="fast" style="border-color:${perfMode === 'fast' ? '#f3cf70' : 'rgba(212,175,55,0.35)'};">Sürətli (Donmasız)</button>
                <button type="button" class="btn-secondary perf-mode-btn" data-mode="high" style="border-color:${perfMode === 'high' ? '#f3cf70' : 'rgba(212,175,55,0.35)'};">Yüksək Keyfiyyət</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#settings-close')?.addEventListener('click', () => {
      this.closeAllModals();
    });

    const rngMusic = this.modalEl.querySelector('#rng-music-vol');
    const lblMusic = this.modalEl.querySelector('#lbl-music-pct');
    rngMusic?.addEventListener('input', () => {
      lblMusic.textContent = `${rngMusic.value}%`;
      callbacks.onMusicVolume?.(Number(rngMusic.value) / 100);
    });

    this.modalEl.querySelector('#chk-music-mute')?.addEventListener('change', (e) => {
      callbacks.onMusicMute?.(e.target.checked);
    });

    const rngSfx = this.modalEl.querySelector('#rng-sfx-vol');
    const lblSfx = this.modalEl.querySelector('#lbl-sfx-pct');
    rngSfx?.addEventListener('input', () => {
      lblSfx.textContent = `${rngSfx.value}%`;
      callbacks.onSfxVolume?.(Number(rngSfx.value) / 100);
    });

    this.modalEl.querySelector('#chk-sfx-mute')?.addEventListener('change', (e) => {
      callbacks.onSfxMute?.(e.target.checked);
    });

    const rngVo = this.modalEl.querySelector('#rng-vo-vol');
    const lblVo = this.modalEl.querySelector('#lbl-vo-pct');
    rngVo?.addEventListener('input', () => {
      lblVo.textContent = `${rngVo.value}%`;
      callbacks.onVoVolume?.(Number(rngVo.value) / 100);
    });

    this.modalEl.querySelector('#chk-vo-mute')?.addEventListener('change', (e) => {
      callbacks.onVoMute?.(e.target.checked);
    });

    this.modalEl.querySelectorAll('.perf-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        callbacks.onPerfMode?.(mode);
        this.modalEl.querySelectorAll('.perf-mode-btn').forEach((b) => {
          b.style.borderColor = b.getAttribute('data-mode') === mode ? '#f3cf70' : 'rgba(212,175,55,0.35)';
        });
      });
    });
  }

  /**
   * 3D Fayton Səfər Seçimi (Bakı / Şəki / Şuşa)
   */
  showFaytonModal(currentCityId, cities = [], playerGold = 0, fareByCity = {}, onSelectCity, onOpenWorldMap) {
    if (!this.modalEl) return;
    this.marketOpen = false;
    this.inventoryOpen = false;
    this.mapOpen = true;

    const cards = cities
      .map((c) => {
        const isHere = c.city_id === currentCityId;
        const baseFare = fareByCity[c.city_id] ?? 25;
        return `
          <div class="lotm-plate" style="padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid ${isHere ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.65)'};background:rgba(24,18,12,0.88);border-radius:8px;">
            <div>
              <div style="font-size:16px;font-weight:700;color:#f5e1b8;">${c.display_name}</div>
              <div style="font-size:12px;color:#cbb893;margin-top:3px;">${c.era_name}</div>
              <div style="font-size:12px;color:#d4a442;margin-top:4px;">Faytonçu haqqı: <strong>${baseFare} qızıl</strong> (+ seçilən yol xərci)</div>
            </div>
            ${
              isHere
                ? `<span style="font-size:12px;color:#a89a82;padding:6px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:6px;">Hazırki Şəhər</span>`
                : `<button class="btn-primary fayton-go-btn" data-city-id="${c.city_id}" data-fare="${baseFare}" style="white-space:nowrap;">${baseFare} Q. Ödə & Get</button>`
            }
          </div>
        `;
      })
      .join('');

    this.modalEl.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card lotm-plate" style="max-width:580px;width:92vw;padding:22px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <h2 style="margin:0;color:#f3cf70;font-size:21px;">🐎 Faytonçu · Pullu Şəhərlərarası Səfər</h2>
              <p style="margin:4px 0 0;font-size:13px;color:#cbb893;">Xəzinəniz: <strong style="color:#f5d26b;">${playerGold} qızıl</strong> — Faytonçu sizi istədiyiniz şəhərə çatdırır.</p>
            </div>
            <button id="fayton-close-btn" class="btn-ghost">Bağla</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
            <label style="display:flex;flex-direction:column;gap:2px;padding:8px;border:1px solid rgba(212,175,55,0.4);border-radius:6px;cursor:pointer;background:rgba(16,12,8,0.7);font-size:12px;color:#e8dac0;">
              <span><input type="radio" name="fayton-mode" value="normal" checked /> <strong>Normal</strong></span>
              <span style="color:#a89a82;font-size:11px;">Balanslı xərc & müddət</span>
            </label>
            <label style="display:flex;flex-direction:column;gap:2px;padding:8px;border:1px solid rgba(212,175,55,0.4);border-radius:6px;cursor:pointer;background:rgba(16,12,8,0.7);font-size:12px;color:#e8dac0;">
              <span><input type="radio" name="fayton-mode" value="guarded" /> <strong>Mühafizəli</strong></span>
              <span style="color:#a89a82;font-size:11px;">+12 q. · aşağı itki riski</span>
            </label>
            <label style="display:flex;flex-direction:column;gap:2px;padding:8px;border:1px solid rgba(212,175,55,0.4);border-radius:6px;cursor:pointer;background:rgba(16,12,8,0.7);font-size:12px;color:#e8dac0;">
              <span><input type="radio" name="fayton-mode" value="rushed" /> <strong>Tələsik</strong></span>
              <span style="color:#a89a82;font-size:11px;">+10 q. · 28% daha sürətli</span>
            </label>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin:14px 0;">
            ${cards}
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
            <button id="fayton-worldmap-btn" class="btn-ghost">Qədim Xəritəni Aç</button>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#fayton-close-btn')?.addEventListener('click', () => {
      this.closeAllModals();
    });
    this.modalEl.querySelector('#fayton-worldmap-btn')?.addEventListener('click', () => {
      this.closeAllModals();
      onOpenWorldMap?.();
    });
    this.modalEl.querySelectorAll('.fayton-go-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cityId = btn.getAttribute('data-city-id');
        const fare = Number(btn.getAttribute('data-fare')) || 25;
        const mode = this.modalEl.querySelector('input[name="fayton-mode"]:checked')?.value || 'normal';
        this.closeAllModals();
        onSelectCity?.(cityId, mode, fare);
      });
    });
  }
}
