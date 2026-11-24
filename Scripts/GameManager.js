import { EventBus } from './EventBus.js';
import { DataLoader } from './DataLoader.js';
import { TradeAndQuestManager } from './TradeAndQuestManager.js';
import { HistoricalEventManager } from './HistoricalEventManager.js';
import { Merchant } from './Merchant.js';
import { Guard } from './Guard.js';
import { Thief } from './Thief.js';

import { StoryIntroScene } from '../Scenes/Story_Intro.js';
import { WorldAzerbaijanScene } from '../Scenes/World_Azerbaijan.js';
import { UIManager } from '../UI/UIManager.js';
import { AudioManager } from '../Audio/AudioManager.js';

/**
 * GameManager — Bütün səhnələri (Story_Intro ↔ World_Azerbaijan),
 * Core AI sistemlərini, GTA/Qədim Xəritə kamera rejimlərini, UI və Audio modullarını birləşdirir.
 */
export class GameManager {
  constructor({ sceneRoot, uiRoot }) {
    this.sceneRoot = sceneRoot;
    this.uiRoot = uiRoot;

    this.eventBus = new EventBus();
    this.data = new DataLoader();
    this.tradeManager = new TradeAndQuestManager(this.data, this.eventBus);
    this.historicalEvents = new HistoricalEventManager(this.data, this.tradeManager, this.eventBus);

    this.merchant = new Merchant(this.eventBus, this.tradeManager);
    this.guard = new Guard(this.merchant, this.tradeManager, this.eventBus);
    this.thief = new Thief(this.merchant, this.tradeManager, this.eventBus);

    this.audio = new AudioManager(this.eventBus);
    this.ui = new UIManager(this.uiRoot, this.eventBus, this.data);

    this.currentSceneName = null;
    this.storyScene = null;
    this.worldScene = null;
    this.cameraMode = 'map'; // 'map' (Qədim 3D Xəritə) | 'gta' (GTA Yaxın 3D Sürüş)

    this.paused = false;
    this.rafId = null;
    this.lastTime = 0;

    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('story:complete', () => {
      this.audio.init();
      this.loadWorldScene();
    });

    this.eventBus.on('state:updated', (snapshot) => {
      this.ui.updateHUD({ ...snapshot, cameraMode: this.cameraMode });
      if (this.ui.isMarketOpen() && snapshot.currentCity) {
        this.ui.showMarket(snapshot.currentCity, snapshot);
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
          ? 'GTA 3D Sürüş Rejimi: W/S sür, A/D döndər (V ilə xəritəyə qayıt)'
          : 'Qədim 3D Xəritə Görünüşü: İstənilən yerə kliklə və ya 2 kliklə içinə en!',
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

    this.eventBus.on('market:open', () => {
      const snap = this.tradeManager.getSnapshot();
      if (!snap.currentCity) {
        this.ui.showToast('Bazar açmaq üçün şəhər zonasına yaxınlaşın.', 'info');
        return;
      }
      this.paused = true;
      this.merchant.clearWaypoint();
      this.ui.showMarket(snap.currentCity, snap);
    });

    this.eventBus.on('market:close', () => {
      this.ui.hideMarket();
      this.paused = false;
    });

    this.eventBus.on('trade:buy', ({ cityId, itemId }) => {
      this.tradeManager.buyItem(cityId, itemId, 1);
    });

    this.eventBus.on('trade:sell', ({ cityId, itemId }) => {
      this.tradeManager.sellItem(cityId, itemId, 1);
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
        this.tradeManager.getSnapshot(),
        this.merchant.position,
        this.worldScene ? this.worldScene.getCityPositions() : null
      );
      this.paused = isOpen;
    });

    this.eventBus.on('map:navigate_city', (cityId) => {
      const cities = this.worldScene?.getCityPositions();
      const target = cities?.[cityId];
      if (!target) return;
      if (this.ui.mapOpen) {
        this.ui.toggleMapChronicle(this.tradeManager.getSnapshot(), this.merchant.position, cities);
        this.paused = false;
      }
      this.merchant.setWaypoint(target.x, target.z);
      if (this.worldScene?.setWaypointVisual) {
        this.worldScene.setWaypointVisual(target.x, target.z);
      }
      this.eventBus.emit('camera:set_mode', 'gta');
      this.ui.showToast(`GPS marşrutu quruldu: ${target.label}`, 'info');
    });

    this.eventBus.on('world:click_move', ({ x, z, enterGTA }) => {
      if (!this.paused) {
        this.merchant.setWaypoint(x, z);
        if (enterGTA && this.cameraMode !== 'gta') {
          this.eventBus.emit('camera:set_mode', 'gta');
        }
      }
    });

    this.eventBus.on('world:trigger_event_now', () => {
      if (!this.paused && this.worldScene) {
        this.historicalEvents.triggerRoadEncounter(
          this.merchant.position,
          this.worldScene.getCityPositions()
        );
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

    // Qısa klaviatura düymələri: E (Bazar), M (2D Salnamə), V (GTA ↔ Qədim Xəritə)
    window.addEventListener('keydown', (e) => {
      if (this.currentSceneName !== 'World_Azerbaijan') return;
      if (e.code === 'KeyE') {
        if (this.ui.isMarketOpen()) {
          this.eventBus.emit('market:close');
        } else if (!this.paused) {
          this.eventBus.emit('market:open');
        }
      } else if (e.code === 'KeyM') {
        this.eventBus.emit('ui:toggle_map');
      } else if (e.code === 'KeyV' && !this.paused) {
        this.eventBus.emit('camera:toggle_mode');
      } else if (e.code === 'Escape' && this.ui.isMarketOpen()) {
        this.eventBus.emit('market:close');
      }
    });
  }

  async start() {
    this.loadStoryScene();
  }

  loadStoryScene() {
    this._stopLoop();
    if (this.worldScene) {
      this.worldScene.unmount();
      this.worldScene = null;
    }
    this.ui.unmount();
    this.currentSceneName = 'Story_Intro';

    this.storyScene = new StoryIntroScene(this.sceneRoot, this.eventBus, this.data);
    this.storyScene.mount();
  }

  async loadWorldScene() {
    if (this.storyScene) {
      this.storyScene.unmount();
      this.storyScene = null;
    }

    this.currentSceneName = 'World_Azerbaijan';
    this.cameraMode = 'map';
    this.merchant.setControlMode('map');

    this.worldScene = new WorldAzerbaijanScene(this.sceneRoot, this.eventBus, this.data, this);
    await this.worldScene.mount();

    const cities = this.worldScene.getCityPositions();
    if (cities?.City_Baku) {
      this.merchant.setPosition(
        cities.City_Baku.x - 2,
        cities.City_Baku.z + 2,
        (x, z) => this.worldScene.getTerrainHeight(x, z)
      );
      this.guard.position.x = this.merchant.position.x - 3.2;
      this.guard.position.z = this.merchant.position.z + 2.2;
    }

    this.merchant.attachControls();
    this.ui.mount();
    this.tradeManager.emitState();
    this.audio.playCityMusic('audio_baku_shirvan');

    this.lastTime = performance.now();
    this._startLoop();
  }

  _startLoop() {
    const tick = (now) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

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
