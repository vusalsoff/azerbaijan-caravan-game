import { DataLoader } from './DataLoader.js';
import { EventBus } from './EventBus.js';
import { TradeAndQuestManager } from './TradeAndQuestManager.js';
import { HistoricalEventManager } from './HistoricalEventManager.js';
import { Merchant } from './Merchant.js';
import { Guard } from './Guard.js';
import { Thief } from './Thief.js';
import { UIManager } from '../UI/UIManager.js';
import { AudioManager } from '../Audio/AudioManager.js';
import { StoryIntroScene } from '../Scenes/Story_Intro.js';
import { WorldAzerbaijanScene } from '../Scenes/World_Azerbaijan.js';
import { CaravanseraiBazaarScene } from '../Scenes/Caravanserai_Bazaar.js';

/**
 * GameManager — Bütün səhnələri, Karvan Heybəsini, Bazar ticarətini və tarixi hadisələri birləşdirir.
 */
export class GameManager {
  constructor(opts, maybeUiRoot) {
    if (opts && typeof opts === 'object' && 'sceneRoot' in opts) {
      this.sceneRoot = opts.sceneRoot;
      this.uiRoot = opts.uiRoot;
    } else {
      this.sceneRoot = opts;
      this.uiRoot = maybeUiRoot;
    }

    this.eventBus = new EventBus();
    this.data = new DataLoader();
    this.audio = new AudioManager();

    this.tradeManager = new TradeAndQuestManager(this.data, this.eventBus);
    this.historicalEvents = new HistoricalEventManager(this.data, this.tradeManager, this.eventBus);

    this.merchant = new Merchant(this.eventBus, this.tradeManager);
    this.guard = new Guard(this.merchant, this.tradeManager, this.eventBus);
    this.thief = new Thief(this.merchant, this.tradeManager, this.eventBus);

    this.ui = new UIManager(this.uiRoot, this.eventBus, this.data, this.tradeManager);

    this.storyScene = null;
    this.worldScene = null;
    this.bazaarScene = null;
    this.currentSceneName = 'Story_Intro';
    this.bazaarCityId = 'City_Baku';

    this.cameraMode = 'map';
    this.bazaarProximity = null;
    this.paused = false;
    this.rafId = null;
    this.lastTime = performance.now();

    this._bindEvents();
  }

  _getUIState(snapshot) {
    return {
      ...snapshot,
      cameraMode: this.cameraMode,
      sceneName: this.currentSceneName,
      bazaarProximity: this.bazaarProximity,
    };
  }

  _bindEvents() {
    this.eventBus.on('story:complete', () => {
      this.audio.init();
      this.loadBazaarScene('City_Baku');
    });

    this.eventBus.on('scene:enter_bazaar', (cityId) => {
      const targetCity = cityId || this.tradeManager.currentCityId || 'City_Baku';
      this.loadBazaarScene(targetCity);
    });

    this.eventBus.on('scene:exit_to_world', () => {
      this.loadWorldScene(this.bazaarCityId);
    });

    this.eventBus.on('bazaar:proximity', (item) => {
      this.bazaarProximity = item;
      this.ui.updateHUD(this._getUIState(this.tradeManager.getSnapshot()));
    });

    this.eventBus.on('state:updated', (snapshot) => {
      const enriched = this._getUIState(snapshot);
      this.ui.updateHUD(enriched);
      if (this.ui.isMarketOpen() && snapshot.currentCity) {
        this.ui.showMarket(snapshot.currentCity, enriched, {
          dockedRight: this.currentSceneName === 'Caravanserai_Bazaar',
        });
      } else if (this.ui.isInventoryOpen()) {
        this.ui.renderInventoryModal(enriched);
      }
    });

    this.eventBus.on('camera:set_mode', (mode) => {
      const next = mode === 'gta' ? 'gta' : 'map';
      if (this.cameraMode === next) return;
      this.cameraMode = next;
      this.merchant.setControlMode(next);
      if (this.worldScene?.setCameraMode) {
        this.worldScene.setCameraMode(next);
      }
      this.ui.showToast(
        next === 'gta'
          ? 'Yaxın Karvan Baxışı: W/S hərəkət, A/D istiqamət (V ilə xəritəyə qayıdış).'
          : 'Qədim Xəritə Baxışı: Səfər üçün istənilən nöqtəyə klikləyin.',
        'info'
      );
      this.tradeManager.emitState();
    });

    this.eventBus.on('camera:toggle_mode', () => {
      this.eventBus.emit('camera:set_mode', this.cameraMode === 'map' ? 'gta' : 'map');
    });

    this.eventBus.on('ui:toast', ({ message, type }) => {
      this.ui.showToast(message, type);
    });

    this.eventBus.on('audio:play_city', (trackId) => {
      this.audio.playCityMusic(trackId);
    });

    this.eventBus.on('audio:sfx', (sfxName) => {
      this.audio.playSFX(sfxName);
    });

    this.eventBus.on('audio:toggle_mute', () => {
      const muted = this.audio.toggleMute();
      this.ui.setMuted(muted);
    });

    this.eventBus.on('market:open', (opts = {}) => {
      const snap = this.tradeManager.getSnapshot();
      if (!snap.currentCity) {
        this.ui.showToast('Yaxınlıqda tacir piştaxtası yoxdur — şəhər mənzilinə yaxınlaşın.', 'info');
        return;
      }

      if (this.currentSceneName === 'Caravanserai_Bazaar' && this.bazaarScene) {
        const focusTarget =
          opts.interactable ||
          this.bazaarProximity ||
          this.bazaarScene.interactables.find((x) => x.type === 'market');
        if (focusTarget?.npcPos) {
          this.bazaarScene.setDialogueFocus(focusTarget);
        }
        if (focusTarget?.defaultItem) {
          this.ui.selectedMarketItemId = focusTarget.defaultItem;
        }
        this.ui.dockedMarketTab = 'stall';
      } else {
        this.paused = true;
        this.merchant.clearWaypoint();
      }

      this.ui.showMarket(snap.currentCity, this._getUIState(snap), {
        dockedRight: this.currentSceneName === 'Caravanserai_Bazaar',
      });
    });

    this.eventBus.on('market:close', () => {
      this.ui.hideMarket();
      if (this.bazaarScene) {
        this.bazaarScene.setDialogueFocus(null);
      }
      this.paused = false;
    });

    this.eventBus.on('ui:toggle_inventory', () => {
      if (this.bazaarScene && this.ui.isMarketOpen()) {
        this.bazaarScene.setDialogueFocus(null);
      }
      const isOpen = this.ui.toggleInventory(this._getUIState(this.tradeManager.getSnapshot()));
      this.paused = isOpen && this.currentSceneName === 'World_Azerbaijan';
    });

    this.eventBus.on('trade:buy', ({ cityId, itemId, qty = 1 }) => {
      this.tradeManager.buyItem(cityId, itemId, qty);
    });

    this.eventBus.on('trade:sell', ({ cityId, itemId, qty = 1 }) => {
      this.tradeManager.sellItem(cityId, itemId, qty);
    });

    this.eventBus.on('trade:discard', ({ itemId, qty = 1 }) => {
      this.tradeManager.discardItem(itemId, qty);
    });

    this.eventBus.on('trade:haggle', ({ cityId, itemId }) => {
      this.tradeManager.haggleItem(cityId, itemId);
    });

    this.eventBus.on('game:reset', () => {
      this.tradeManager.resetProgress();
    });

    this.eventBus.on('encounter:quest', ({ quest, npc }) => {
      this.paused = true;
      this.merchant.clearWaypoint();
      this.audio.playSFX('quest');
      this.ui.showQuest(quest, npc);
    });

    this.eventBus.on('quest:accept', (quest) => {
      this.tradeManager.acceptQuest(quest);
      this.paused = false;
    });

    this.eventBus.on('quest:decline', () => {
      this.paused = false;
    });

    this.eventBus.on('encounter:historical_event', ({ event, npc }) => {
      this.paused = true;
      this.merchant.clearWaypoint();
      this.audio.playSFX('quest');
      this.ui.showHistoricalEvent(event, npc);
    });

    this.eventBus.on('event:choose', ({ event, choiceIndex }) => {
      this.tradeManager.applyHistoricalEventChoice(event, choiceIndex);
      this.paused = false;
    });

    this.eventBus.on('ui:toggle_map', () => {
      const isOpen = this.ui.toggleMapChronicle(
        this._getUIState(this.tradeManager.getSnapshot()),
        this.merchant.position,
        this.worldScene ? this.worldScene.getCityPositions() : null
      );
      this.paused = isOpen && this.currentSceneName === 'World_Azerbaijan';
    });

    this.eventBus.on('map:navigate_city', (cityId) => {
      if (this.currentSceneName === 'Caravanserai_Bazaar') {
        if (this.ui.mapOpen) {
          this.ui.toggleMapChronicle(this.tradeManager.getSnapshot(), this.merchant.position, null);
          this.paused = false;
        }
        this.loadWorldScene(this.bazaarCityId).then(() => {
          this.eventBus.emit('map:navigate_city', cityId);
        });
        return;
      }
      const cities = this.worldScene?.getCityPositions();
      const target = cities?.[cityId];
      if (!target) return;
      if (this.ui.mapOpen) {
        this.ui.toggleMapChronicle(this.tradeManager.getSnapshot(), this.merchant.position, cities);
        this.paused = false;
      }
      if (this.worldScene?.startFastTravelToCity) {
        this.worldScene.startFastTravelToCity(cityId);
        return;
      }
      this.merchant.setWaypoint(target.x, target.z);
      if (this.worldScene?.setWaypointVisual) {
        this.worldScene.setWaypointVisual(target.x, target.z);
      }
      this.ui.showToast(`Marşrut müəyyən edildi: ${target.label}`, 'info');
    });

    this.eventBus.on('world:click_move', ({ x, z, enterGTA }) => {
      if (!this.paused) {
        this.merchant.setWaypoint(x, z);
        if (enterGTA && this.cameraMode !== 'gta') {
          this.eventBus.emit('camera:set_mode', 'gta');
        }
      }
    });

    this.eventBus.on('world:fast_travel_complete', ({ fromCityId, toCityId, daysElapsed }) => {
      const report = this.tradeManager.completeFastTravel(fromCityId, toCityId, daysElapsed);
      if (report && !this.tradeManager.victoryReached) {
        this.paused = true;
        this.audio.playSFX('coin');
        this.ui.showFastTravelSummary(report);
      }
    });

    this.eventBus.on('fast_travel:dismiss', () => {
      this.paused = false;
    });

    this.eventBus.on('world:trigger_event_now', () => {
      if (!this.paused) {
        const cityMap =
          this.currentSceneName === 'Caravanserai_Bazaar' && this.bazaarCityId
            ? { [this.bazaarCityId]: { x: this.merchant.position.x, z: this.merchant.position.z } }
            : this.worldScene
            ? this.worldScene.getCityPositions()
            : null;
        this.historicalEvents.triggerRoadEncounter(this.merchant.position, cityMap);
      }
    });

    this.eventBus.on('game:victory', (snapshot) => {
      this.paused = true;
      this.ui.showVictory(snapshot);
    });

    this.eventBus.on('game:continue_after_win', () => {
      this.tradeManager.dismissVictory();
      this.paused = false;
    });

    window.addEventListener('keydown', (e) => {
      // Basılı tutulan düymələrin (məs. E, I, M, V) təkrar-təkrar spam etməsini tam blokla
      if (e.repeat) return;

      if (this.currentSceneName === 'Caravanserai_Bazaar') {
        if (e.code === 'KeyE') {
          if (this.ui.isMarketOpen()) {
            this.eventBus.emit('market:close');
          } else if (this.bazaarProximity?.type === 'exit_to_map') {
            this.eventBus.emit('scene:exit_to_world');
          } else if (this.bazaarProximity?.type === 'market') {
            this.eventBus.emit('market:open', { interactable: this.bazaarProximity });
          } else {
            this.ui.showToast('Sövdələşmək üçün tacir və ya bağban piştaxtasına yaxınlaşın.', 'info');
          }
        } else if (e.code === 'KeyI' || e.code === 'Tab') {
          if (e.code === 'Tab') e.preventDefault();
          this.eventBus.emit('ui:toggle_inventory');
        } else if (e.code === 'KeyX' && !this.ui.isAnyModalOpen()) {
          this.eventBus.emit('scene:exit_to_world');
        } else if (e.code === 'KeyM') {
          this.eventBus.emit('ui:toggle_map');
        } else if (e.code === 'Escape') {
          if (this.ui.isMarketOpen()) this.eventBus.emit('market:close');
          else if (this.ui.isInventoryOpen()) this.eventBus.emit('ui:toggle_inventory');
          else if (this.ui.mapOpen) this.eventBus.emit('ui:toggle_map');
        }
        return;
      }

      if (this.currentSceneName !== 'World_Azerbaijan') return;

      if (e.code === 'KeyE') {
        if (this.ui.isMarketOpen()) {
          this.eventBus.emit('market:close');
        } else if (!this.paused) {
          this.eventBus.emit('market:open');
        }
      } else if (e.code === 'KeyI' || e.code === 'Tab') {
        if (e.code === 'Tab') e.preventDefault();
        this.eventBus.emit('ui:toggle_inventory');
      } else if (e.code === 'KeyM') {
        this.eventBus.emit('ui:toggle_map');
      } else if (e.code === 'KeyV' && !this.paused) {
        this.eventBus.emit('camera:toggle_mode');
      } else if (e.code === 'Escape') {
        if (this.ui.isMarketOpen()) this.eventBus.emit('market:close');
        else if (this.ui.isInventoryOpen()) this.eventBus.emit('ui:toggle_inventory');
        else if (this.ui.mapOpen) this.eventBus.emit('ui:toggle_map');
      }
    });
  }

  async start() {
    this.loadStoryScene();
  }

  _clearActiveScenes() {
    this._stopLoop();
    this.ui.closeAllModals();
    this.paused = false;
    this.bazaarProximity = null;
    if (this.storyScene) {
      this.storyScene.unmount();
      this.storyScene = null;
    }
    if (this.worldScene) {
      this.worldScene.unmount();
      this.worldScene = null;
    }
    if (this.bazaarScene) {
      this.bazaarScene.unmount();
      this.bazaarScene = null;
    }
  }

  loadStoryScene() {
    this._clearActiveScenes();
    this.ui.unmount();
    this.currentSceneName = 'Story_Intro';

    this.storyScene = new StoryIntroScene(this.sceneRoot, this.eventBus, this.data);
    this.storyScene.mount();
  }

  async loadBazaarScene(cityId = 'City_Baku') {
    this._clearActiveScenes();
    this.currentSceneName = 'Caravanserai_Bazaar';
    this.bazaarCityId = cityId;

    this.bazaarScene = new CaravanseraiBazaarScene(this.sceneRoot, this.eventBus, this.data, this, cityId);
    await this.bazaarScene.mount();

    this.ui.mount();
    this.tradeManager.setCurrentCity(cityId);
    this.tradeManager.emitState();

    const city = this.data.getCityById(cityId);
    if (city) {
      this.audio.playCityMusic(city.music_track);
    }

    this.lastTime = performance.now();
    this._startLoop();
  }

  async loadWorldScene(spawnNearCityId = 'City_Baku') {
    this._clearActiveScenes();
    this.currentSceneName = 'World_Azerbaijan';
    this.cameraMode = 'map';
    this.merchant.setControlMode('map');

    this.worldScene = new WorldAzerbaijanScene(this.sceneRoot, this.eventBus, this.data, this);
    await this.worldScene.mount();

    const cities = this.worldScene.getCityPositions();
    const spawnCity = cities?.[spawnNearCityId] || cities?.City_Baku;
    if (spawnCity) {
      this.merchant.setPosition(
        spawnCity.x - 2,
        spawnCity.z + 2,
        (x, z) => this.worldScene.getTerrainHeight(x, z)
      );
      this.guard.position.x = this.merchant.position.x - 3.2;
      this.guard.position.z = this.merchant.position.z + 2.2;
    }

    this.merchant.attachControls();
    this.ui.mount();
    this.tradeManager.emitState();

    this.lastTime = performance.now();
    this._startLoop();
  }

  _startLoop() {
    const tick = (now) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.currentSceneName === 'Caravanserai_Bazaar' && this.bazaarScene) {
        if (!this.paused) {
          this.tradeManager.update(dt * 0.35);
        }
        this.bazaarScene.update(dt);
        return;
      }

      if (this.worldScene) {
        if (!this.paused) {
          const getH = (x, z) => this.worldScene.getTerrainHeight(x, z);
          const cityPos = this.worldScene.getCityPositions();

          this.tradeManager.update(dt);
          this.merchant.update(dt, getH, cityPos);
          this.thief.update(dt, getH);
          this.guard.update(dt, getH, this.thief);
          this.historicalEvents.update(dt, this.merchant, cityPos);
        }
        this.worldScene.update(dt);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.merchant.detachControls();
  }
}
