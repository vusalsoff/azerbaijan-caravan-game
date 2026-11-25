import * as THREE from 'three';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/Cinematic_Bazaar_25D.js
 * Çox-Bucaqlı «Offline DLSS 5» 2.5D Kinematik Dərinlik + Canlı 3D Mühərrik:
 * - 3 fərqli göz səviyyəli kinematik bucaq:
 *     1) courtyard       — Bakı Karvansarayı Həyəti & Qız Qalası
 *     2) carpet_gallery  — Xalça və İpək Qalereyası (Fənər işıqlı yaxın ticarət planı)
 *     3) palace_hall     — Şirvanşahlar Divan Zalı (Şəbəkə işıqlı saray qəbulu)
 * - Hər bucaqda 6-addımlı GLSL Relief/Depth Parallax + Normal-Map canlı fənər işığı + Glow nəfəsi
 * - Həyətdə günəş şüası ↔ kölgə zonasına görə 3D Tacirin işıqlandırması real vaxtda dəyişir!
 */

const ANGLE_CONFIGS = {
  courtyard: {
    id: 'courtyard',
    title: 'I. Karvansaray Həyəti',
    baseImage: './images/bazaar_baku_25d',
    camPos: [0, 2.32, 14.2],
    lookAt: [0, 1.72, -12.0],
    fov: 43,
    spawnPos: [0.0, 0, 4.4],
    spawnYaw: Math.PI,
    zRange: [-10.2, 7.2],
    xBoundsFn: (z) => {
      const tBack = (7.2 - z) / 17.4;
      return [-4.2 + tBack * 1.15, 3.3 - tBack * 0.45];
    },
    sunColor: 0xffd79a,
    sunPos: [14, 17, 7],
    sunBaseIntensity: 2.35,
    ambientSky: 0xffe6bd,
    ambientGround: 0x2d1f14,
    ambientIntensity: 0.85,
    shadowOpacity: 0.48,
    lanterns: [
      { pos: [-4.6, 2.6, 1.2], uv: [0.11, 0.58], color: 0xffa442, intensity: 2.4 },
      { pos: [4.2, 2.5, 2.0], uv: [0.90, 0.57], color: 0xffa84c, intensity: 2.3 },
    ],
    useDynamicSunZone: true,
    showSunbeams: true,
    playerScaleHeight: 1.84,
  },
  carpet_gallery: {
    id: 'carpet_gallery',
    title: 'II. Xalça Qalereyası',
    baseImage: './images/bazaar_baku_carpet_25d',
    camPos: [-0.4, 1.95, 10.6],
    lookAt: [0.4, 1.48, -6.0],
    fov: 41,
    spawnPos: [-1.72, 0, 3.45],
    spawnYaw: 2.25, // Piştaxtadakı Baş Tacirə tərəf dönür
    zRange: [0.2, 5.4],
    xBoundsFn: (z) => {
      const t = (5.4 - z) / 5.2;
      return [-3.7 + t * 0.5, 0.25 - t * 0.4];
    },
    sunColor: 0xffb35c,
    sunPos: [4.5, 6.2, 3.0],
    sunBaseIntensity: 1.55,
    ambientSky: 0x855e3a,
    ambientGround: 0x1d130b,
    ambientIntensity: 0.78,
    shadowOpacity: 0.42,
    lanterns: [
      { pos: [-2.8, 3.0, 2.0], uv: [0.32, 0.74], color: 0xff9e38, intensity: 3.2 },
      { pos: [2.6, 3.2, 1.4], uv: [0.84, 0.78], color: 0xffaa44, intensity: 3.1 },
    ],
    useDynamicSunZone: false,
    showSunbeams: false,
    playerScaleHeight: 2.38,
  },
  palace_hall: {
    id: 'palace_hall',
    title: 'III. Divan Zalı',
    baseImage: './images/bazaar_baku_palace_25d',
    camPos: [0, 2.25, 13.6],
    lookAt: [0, 1.78, -10.0],
    fov: 43,
    spawnPos: [0.0, 0, 4.8],
    spawnYaw: Math.PI,
    zRange: [-4.8, 6.8],
    xBoundsFn: (z) => {
      const t = (6.8 - z) / 11.6;
      return [-3.8 + t * 0.4, 3.8 - t * 0.4];
    },
    sunColor: 0xffd288,
    sunPos: [3.0, 16.0, -4.0],
    sunBaseIntensity: 1.65,
    ambientSky: 0x9c7b52,
    ambientGround: 0x1f160f,
    ambientIntensity: 0.78,
    shadowOpacity: 0.44,
    lanterns: [
      { pos: [-4.4, 2.1, 2.0], uv: [0.15, 0.48], color: 0xffa642, intensity: 2.8 },
      { pos: [4.4, 2.1, 2.0], uv: [0.85, 0.48], color: 0xffa642, intensity: 2.8 },
    ],
    useDynamicSunZone: false,
    showSunbeams: true,
    playerScaleHeight: 2.0,
  },
};

const CITY_TINTS = {
  City_Baku: { tint: new THREE.Color(1.0, 1.0, 1.0), palaceTitle: 'Şirvanşahlar Sarayı Qəbulu' },
  City_Sheki: { tint: new THREE.Color(0.92, 0.99, 1.04), palaceTitle: 'Şəki Xan Sarayı Qəbulu' },
  City_Shusha: { tint: new THREE.Color(0.94, 0.94, 1.02), palaceTitle: 'Qarabağ Xanı Qəbulu' },
};

const BACKDROP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const BACKDROP_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uGlowMap;

  uniform vec2 uParallax;
  uniform float uZoom;
  uniform float uAspectRatio;
  uniform float uTime;
  uniform vec2 uPlayerUV;
  uniform float uPlayerDepth;
  uniform vec3 uCityTint;
  uniform vec2 uLanternA;
  uniform vec2 uLanternB;
  uniform float uFade;

  varying vec2 vUv;

  vec2 computeCoverUv(vec2 uv) {
    vec2 centered = uv - 0.5;
    if (uAspectRatio > 1.0) {
      centered.y /= uAspectRatio;
    } else {
      centered.x *= uAspectRatio;
    }
    centered *= (0.935 / max(0.85, uZoom));
    return centered + 0.5;
  }

  void main() {
    vec2 baseUv = computeCoverUv(vUv);

    vec2 pUv = baseUv;
    float depth = 0.0;
    for (int i = 0; i < 6; i++) {
      depth = texture2D(uDepthMap, clamp(pUv, 0.002, 0.998)).r;
      float shift = (depth - 0.35);
      vec2 targetUv = baseUv - uParallax * shift;
      pUv = mix(pUv, targetUv, 0.55);
    }

    pUv = clamp(pUv, 0.002, 0.998);
    vec3 color = texture2D(uColorMap, pUv).rgb * uCityTint;
    vec3 normalTex = texture2D(uNormalMap, pUv).rgb * 2.0 - 1.0;
    vec3 N = normalize(vec3(normalTex.x * 1.15, normalTex.y * 1.15, max(0.25, normalTex.z)));
    float glow = texture2D(uGlowMap, pUv).r;

    float flickerA = 0.86 + 0.14 * sin(uTime * 5.3 + pUv.x * 19.0) * cos(uTime * 3.1 + pUv.y * 11.0);
    float flickerB = 0.90 + 0.10 * sin(uTime * 7.8 + pUv.x * 31.0);
    vec3 lanternBloom = vec3(1.0, 0.66, 0.24) * glow * (0.50 * flickerA);

    vec3 lDir1 = normalize(vec3(uLanternA - pUv, 0.18));
    float dist1 = length((uLanternA - pUv) * vec2(1.45, 1.0));
    float att1 = exp(-dist1 * 4.2) * flickerA;
    float diff1 = max(dot(N, lDir1), 0.0);

    vec3 lDir2 = normalize(vec3(uLanternB - pUv, 0.18));
    float dist2 = length((uLanternB - pUv) * vec2(1.45, 1.0));
    float att2 = exp(-dist2 * 4.2) * flickerB;
    float diff2 = max(dot(N, lDir2), 0.0);

    vec2 playerLight = uPlayerUV + vec2(0.0, 0.05);
    vec3 lDirP = normalize(vec3(playerLight - pUv, 0.22));
    float distP = length((playerLight - pUv) * vec2(1.45, 1.8));
    float attP = exp(-distP * 5.8) * (0.35 + 0.5 * uPlayerDepth) * (0.94 + 0.06 * sin(uTime * 4.2));
    float diffP = max(dot(N, lDirP), 0.0);

    vec3 dynamicWarmLight =
      vec3(1.0, 0.72, 0.34) * (diff1 * att1 * 0.25 + diff2 * att2 * 0.25 + diffP * attP * 0.22);

    vec3 finalCol = color + lanternBloom + dynamicWarmLight * color;

    float vig = smoothstep(0.95, 0.28, length((vUv - 0.5) * vec2(1.15, 1.05)));
    finalCol *= mix(0.74, 1.03, vig);
    finalCol *= clamp(uFade, 0.0, 1.0);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export class CinematicBazaar25DScene {
  constructor(container, eventBus, data, gameManager, cityId = 'City_Baku') {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.gameManager = gameManager;
    this.cityId = cityId;
    this.city = data.getCityById(cityId) || data.cities[0];
    this.cityTheme = CITY_TINTS[cityId] || CITY_TINTS.City_Baku;
    this.modelLoader = new ModelLoader();
    this.textureLoader = new THREE.TextureLoader();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.isMounted = false;

    this.activeAngleId = 'courtyard';
    this.angleCfg = ANGLE_CONFIGS.courtyard;
    this.angleTexCache = new Map();
    this.fadeAlpha = 1.0;
    this.isTransitioning = false;
    this.angleBarEl = null;

    this.backdropMesh = null;
    this.backdropUniforms = null;
    this.imageAspect = 16 / 9;

    // 3D Tacir vəziyyəti
    this.player = {
      group: null,
      baseNormScale: 1.0,
      pos: new THREE.Vector3(0.0, 0, 4.4),
      yaw: Math.PI,
      speed: 4.4,
      walkPhase: 0,
      isMoving: false,
      targetPos: null,
      mountedHorse: false,
      mixer: null,
      actions: {},
      activeActionName: null,
    };

    this.baseCamPos = new THREE.Vector3(...this.angleCfg.camPos);
    this.baseLookAt = new THREE.Vector3(...this.angleCfg.lookAt);
    this.mouseNorm = { x: 0, y: 0 };
    this.smoothParallax = new THREE.Vector2(0, 0);
    this.smoothZoom = 1.0;

    this.dialogueFocus = null;
    this.interactables = [];
    this.interactGroup = null;
    this.interactRings = [];
    this.nearestInteractable = null;

    this.hemiLight = null;
    this.sunLight = null;
    this.rimLight = null;
    this.flickerLights = [];
    this.floorMesh = null;
    this.dustPoints = null;
    this.sunBeamGroup = null;
    this.clickRipple = null;
    this.clickRippleLife = 0;

    this.elapsed = 0;
    this.keys = new Set();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._createdTextures = [];

    this._onResize = () => this._handleResize();
    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onContextMenu = (e) => e.preventDefault();
  }

  getNearestInteractable() {
    return this.nearestInteractable;
  }

  setDialogueFocus(target) {
    this.dialogueFocus = target;
    if (target) {
      this.player.targetPos = null;
      if (target.id === 'trader_carpet' && this.activeAngleId !== 'carpet_gallery') {
        this.switchAngle('carpet_gallery');
      } else if (this.player.group && target.npcPos) {
        const dx = target.npcPos.x - this.player.pos.x;
        const dz = target.npcPos.z - this.player.pos.z;
        this.player.yaw = Math.atan2(dx, dz);
        this.player.group.rotation.y = this.player.yaw;
      }
    }
  }

  setCityWaypoint(wp) {
    if (!wp) {
      this.player.targetPos = null;
      return;
    }
    this._setWalkTarget(wp.x, wp.z);
  }

  toggleMountHorse() {
    this.eventBus.emit('ui:toast', {
      message: 'At sürmə funksiyası «Klassik 3D» rejimində aktivdir — yuxarıdan keçid edə bilərsiniz.',
      type: 'info',
    });
  }

  startFaytonDeparture(onArrive) {
    this.player.targetPos = null;
    setTimeout(() => {
      if (typeof onArrive === 'function') onArrive();
    }, 650);
  }

  applyPerformanceMode(mode) {
    if (!this.renderer) return;
    this.renderer.setPixelRatio(mode === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1.25);
  }

  _handleKeyDown(e) {
    const code = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      this.keys.add(code);
      this.player.targetPos = null;
    }
  }

  _handlePointerMove(e) {
    if (!this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    this.mouseNorm.x = Math.max(-1, Math.min(1, nx));
    this.mouseNorm.y = Math.max(-1, Math.min(1, ny));
  }

  _handlePointerDown(e) {
    if (e.button !== 0 || !this.floorMesh || !this.camera || this.dialogueFocus || this.isTransitioning) return;
    if (this.gameManager?.ui?.isAnyModalOpen?.()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.floorMesh);
    if (hits.length > 0) {
      const pt = hits[0].point;
      this._setWalkTarget(pt.x, pt.z);
    }
  }

  _clampWalkable(x, z) {
    const [zMin, zMax] = this.angleCfg.zRange;
    const cz = Math.max(zMin, Math.min(zMax, z));
    const [xMin, xMax] = this.angleCfg.xBoundsFn(cz);
    const cx = Math.max(xMin, Math.min(xMax, x));
    return { x: cx, z: cz };
  }

  _setWalkTarget(x, z) {
    const clamped = this._clampWalkable(x, z);
    this.player.targetPos = new THREE.Vector3(clamped.x, 0, clamped.z);
    if (this.clickRipple) {
      this.clickRipple.position.set(clamped.x, 0.04, clamped.z);
      this.clickRipple.visible = true;
      this.clickRippleLife = 1.0;
    }
  }

  async _loadTextureSafe(url, isColor = false) {
    return new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (tex) => {
          if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          this._createdTextures.push(tex);
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  async _loadAngleTextures(angleId) {
    if (this.angleTexCache.has(angleId)) {
      return this.angleTexCache.get(angleId);
    }
    const cfg = ANGLE_CONFIGS[angleId] || ANGLE_CONFIGS.courtyard;
    const base = cfg.baseImage;
    const [colorMap, depthMap, normalMap, glowMap] = await Promise.all([
      this._loadTextureSafe(`${base}.jpg`, true),
      this._loadTextureSafe(`${base}_depth.png`, false),
      this._loadTextureSafe(`${base}_normal.png`, false),
      this._loadTextureSafe(`${base}_glow.png`, false),
    ]);
    const bundle = { colorMap, depthMap, normalMap, glowMap };
    this.angleTexCache.set(angleId, bundle);
    return bundle;
  }

  async mount() {
    this.isMounted = false;
    this.container.innerHTML = '';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0907);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(this.angleCfg.fov, w / h, 0.2, 120);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.container.appendChild(this.renderer.domElement);

    await this._buildDepthParallaxBackdrop();
    this._buildLights();
    this._buildShadowFloorAndAtmosphere();
    this._rebuildHotspotsForAngle(this.activeAngleId);
    await this._buildPlayableMerchant();
    this._buildAngleSwitcherOverlay();

    // Digər bucaqların teksturalarını arxa fonda sakitcə keşlə (keçid anında ləngimə olmasın)
    this._loadAngleTextures('carpet_gallery');
    this._loadAngleTextures('palace_hall');

    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this._onPointerMove);
    dom.addEventListener('pointerdown', this._onPointerDown);
    dom.addEventListener('contextmenu', this._onContextMenu);

    this.isMounted = true;
  }

  _buildAngleSwitcherOverlay() {
    if (this.angleBarEl) this.angleBarEl.remove();
    const bar = document.createElement('div');
    bar.id = 'cinematic-angle-bar';
    bar.style.cssText =
      'position:fixed;bottom:68px;left:50%;transform:translateX(-50%);z-index:18;display:flex;gap:6px;padding:4px 8px;background:rgba(16,12,8,0.88);border:1px solid rgba(207,163,85,0.45);border-radius:3px;pointer-events:auto;';

    for (const id of ['courtyard', 'carpet_gallery', 'palace_hall']) {
      const cfg = ANGLE_CONFIGS[id];
      const btn = document.createElement('button');
      btn.dataset.angle = id;
      btn.textContent = cfg.title;
      btn.className = id === this.activeAngleId ? 'btn-primary' : 'btn-secondary';
      btn.style.cssText = 'padding:4px 10px;font-size:11.5px;';
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.switchAngle(id);
      });
      bar.appendChild(btn);
    }

    this.container.appendChild(bar);
    this.angleBarEl = bar;
  }

  _refreshAngleBarHighlight() {
    if (!this.angleBarEl) return;
    this.angleBarEl.querySelectorAll('button[data-angle]').forEach((btn) => {
      btn.className = btn.dataset.angle === this.activeAngleId ? 'btn-primary' : 'btn-secondary';
    });
  }

  /**
   * Müxtəlif 2.5D kinematik bucaqlar arasında (Həyət ↔ Xalça Qalereyası ↔ Divan Zalı)
   * hamar qaralma-açılma (crossfade) keçidi
   */
  async switchAngle(angleId) {
    if (!ANGLE_CONFIGS[angleId] || angleId === this.activeAngleId || this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.targetPos = null;

    // 1. Qısa kinematik fade-out
    const texPromise = this._loadAngleTextures(angleId);
    const fadeOutSteps = 8;
    for (let i = 1; i <= fadeOutSteps; i++) {
      this.fadeAlpha = 1 - i / fadeOutSteps;
      if (this.backdropUniforms) this.backdropUniforms.uFade.value = this.fadeAlpha;
      await new Promise((r) => setTimeout(r, 18));
    }

    const bundle = await texPromise;
    if (!this.isMounted) return;

    // 2. Yeni bucağın tekstura, kamera, işıq və hotspotlarını tətbiq et
    this.activeAngleId = angleId;
    this.angleCfg = ANGLE_CONFIGS[angleId];
    this.baseCamPos.set(...this.angleCfg.camPos);
    this.baseLookAt.set(...this.angleCfg.lookAt);
    this.camera.fov = this.angleCfg.fov;
    this.camera.updateProjectionMatrix();

    if (bundle.colorMap?.image?.width && bundle.colorMap?.image?.height) {
      this.imageAspect = bundle.colorMap.image.width / bundle.colorMap.image.height;
    }

    if (this.backdropUniforms) {
      if (bundle.colorMap) this.backdropUniforms.uColorMap.value = bundle.colorMap;
      if (bundle.depthMap) this.backdropUniforms.uDepthMap.value = bundle.depthMap;
      if (bundle.normalMap) this.backdropUniforms.uNormalMap.value = bundle.normalMap;
      if (bundle.glowMap) this.backdropUniforms.uGlowMap.value = bundle.glowMap;
      this.backdropUniforms.uLanternA.value.set(...this.angleCfg.lanterns[0].uv);
      this.backdropUniforms.uLanternB.value.set(...this.angleCfg.lanterns[1].uv);
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.backdropUniforms.uAspectRatio.value = (w / Math.max(1, h)) / this.imageAspect;
    }

    // İşıqları yeni məkana uyğunlaşdır
    if (this.hemiLight) {
      this.hemiLight.color.setHex(this.angleCfg.ambientSky);
      this.hemiLight.groundColor.setHex(this.angleCfg.ambientGround);
      this.hemiLight.intensity = this.angleCfg.ambientIntensity;
    }
    if (this.sunLight) {
      this.sunLight.color.setHex(this.angleCfg.sunColor);
      this.sunLight.position.set(...this.angleCfg.sunPos);
      this.sunLight.intensity = this.angleCfg.sunBaseIntensity;
    }
    if (this.floorMesh) {
      this.floorMesh.material.opacity = this.angleCfg.shadowOpacity;
    }
    if (this.sunBeamGroup) {
      this.sunBeamGroup.visible = this.angleCfg.showSunbeams;
    }
    this.angleCfg.lanterns.forEach((lCfg, idx) => {
      if (this.flickerLights[idx]) {
        this.flickerLights[idx].light.position.set(...lCfg.pos);
        this.flickerLights[idx].light.color.setHex(lCfg.color);
        this.flickerLights[idx].base = lCfg.intensity;
      }
    });

    // Taciri yeni bucağın başlanğıc nöqtəsinə yerləşdir
    this.player.pos.set(...this.angleCfg.spawnPos);
    this.player.yaw = this.angleCfg.spawnYaw;
    if (this.player.group) {
      this.player.group.scale.setScalar(this.player.baseNormScale * (this.angleCfg.playerScaleHeight / 1.84));
      this.player.group.position.copy(this.player.pos);
      this.player.group.rotation.y = this.player.yaw;
    }

    this._rebuildHotspotsForAngle(angleId);
    this._refreshAngleBarHighlight();

    // 3. Hamar fade-in
    const fadeInSteps = 10;
    for (let i = 1; i <= fadeInSteps; i++) {
      this.fadeAlpha = i / fadeInSteps;
      if (this.backdropUniforms) this.backdropUniforms.uFade.value = this.fadeAlpha;
      await new Promise((r) => setTimeout(r, 18));
    }
    this.fadeAlpha = 1.0;
    if (this.backdropUniforms) this.backdropUniforms.uFade.value = 1.0;
    this.isTransitioning = false;
  }

  async _buildDepthParallaxBackdrop() {
    const bundle = await this._loadAngleTextures(this.activeAngleId);
    if (bundle.colorMap?.image?.width && bundle.colorMap?.image?.height) {
      this.imageAspect = bundle.colorMap.image.width / bundle.colorMap.image.height;
    }

    const fallbackTex = () => {
      const data = new Uint8Array([128, 128, 255, 255]);
      const t = new THREE.DataTexture(data, 1, 1);
      t.needsUpdate = true;
      this._createdTextures.push(t);
      return t;
    };

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.backdropUniforms = {
      uColorMap: { value: bundle.colorMap || fallbackTex() },
      uDepthMap: { value: bundle.depthMap || fallbackTex() },
      uNormalMap: { value: bundle.normalMap || fallbackTex() },
      uGlowMap: { value: bundle.glowMap || fallbackTex() },
      uParallax: { value: new THREE.Vector2(0, 0) },
      uZoom: { value: 1.0 },
      uAspectRatio: { value: (w / Math.max(1, h)) / this.imageAspect },
      uTime: { value: 0 },
      uPlayerUV: { value: new THREE.Vector2(0.5, 0.25) },
      uPlayerDepth: { value: 0.6 },
      uCityTint: { value: this.cityTheme.tint.clone() },
      uLanternA: { value: new THREE.Vector2(...this.angleCfg.lanterns[0].uv) },
      uLanternB: { value: new THREE.Vector2(...this.angleCfg.lanterns[1].uv) },
      uFade: { value: 1.0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.backdropUniforms,
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.backdropMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.backdropMesh.frustumCulled = false;
    this.backdropMesh.renderOrder = -100;
    this.scene.add(this.backdropMesh);
  }

  _buildLights() {
    this.hemiLight = new THREE.HemisphereLight(
      this.angleCfg.ambientSky,
      this.angleCfg.ambientGround,
      this.angleCfg.ambientIntensity
    );
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(this.angleCfg.sunColor, this.angleCfg.sunBaseIntensity);
    this.sunLight.position.set(...this.angleCfg.sunPos);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -14;
    this.sunLight.shadow.camera.right = 14;
    this.sunLight.shadow.camera.top = 14;
    this.sunLight.shadow.camera.bottom = -14;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    this.flickerLights = [];
    this.angleCfg.lanterns.forEach((lCfg, idx) => {
      const pt = new THREE.PointLight(lCfg.color, lCfg.intensity, 14, 1.45);
      pt.position.set(...lCfg.pos);
      this.scene.add(pt);
      this.flickerLights.push({ light: pt, base: lCfg.intensity, phase: idx * 2.3 + 0.5 });
    });

    this.rimLight = new THREE.DirectionalLight(0xffcb80, 0.8);
    this.rimLight.position.set(0, 6, -15);
    this.scene.add(this.rimLight);
  }

  _buildShadowFloorAndAtmosphere() {
    const floorGeo = new THREE.PlaneGeometry(24, 34);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.ShadowMaterial({ opacity: this.angleCfg.shadowOpacity });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, 0, -2);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    const rippleGeo = new THREE.RingGeometry(0.24, 0.285, 36);
    rippleGeo.rotateX(-Math.PI / 2);
    this.clickRipple = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({
        color: 0xdca854,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.clickRipple.visible = false;
    this.scene.add(this.clickRipple);

    this.sunBeamGroup = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd58a,
      transparent: true,
      opacity: 0.042,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const [bx, bz, rotZ] of [
      [-1.5, 1.5, 0.46],
      [-0.2, -3.0, 0.44],
      [0.8, -6.5, 0.42],
    ]) {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 16), beamMat);
      beam.position.set(bx, 5.8, bz);
      beam.rotation.z = rotZ;
      beam.rotation.y = 0.25;
      this.sunBeamGroup.add(beam);
    }
    this.scene.add(this.sunBeamGroup);

    // Yumşaq dairəvi qızılı toz zərrəcikləri (kvadrat nöqtələr əvəzinə kinematik işıq tozu)
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 32;
    dustCanvas.height = 32;
    const dctx = dustCanvas.getContext('2d');
    const grad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0.0, 'rgba(255, 232, 178, 0.95)');
    grad.addColorStop(0.35, 'rgba(246, 198, 118, 0.55)');
    grad.addColorStop(1.0, 'rgba(246, 198, 118, 0.0)');
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, 32, 32);
    const dustTex = new THREE.CanvasTexture(dustCanvas);
    this._createdTextures.push(dustTex);

    const count = 88;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10.5;
      positions[i * 3 + 1] = 0.3 + Math.random() * 5.2;
      positions[i * 3 + 2] = -9.5 + Math.random() * 17.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffd996,
      map: dustTex,
      size: 0.145,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustPoints);
  }

  _rebuildHotspotsForAngle(angleId) {
    if (this.interactGroup) {
      this.interactGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.scene.remove(this.interactGroup);
    }
    this.interactGroup = new THREE.Group();
    this.interactables = [];
    this.interactRings = [];
    this.nearestInteractable = null;

    const primaryLuxury =
      this.city?.goods?.find((g) => g.item_id === 'carpet' || g.category === 'luxury')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'carpet';
    const primaryAgri =
      this.city?.goods?.find((g) => g.category === 'agriculture')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'pomegranate';

    let defs = [];
    if (angleId === 'courtyard') {
      defs = [
        {
          id: 'trader_carpet',
          type: 'market',
          label: `Baş Tacirlə Sövdələş (${this.city?.short_name || 'Bazar'})`,
          pos: new THREE.Vector3(-3.3, 0, 0.8),
          npcPos: new THREE.Vector3(-4.8, 1.4, 0.6),
          radius: 2.8,
          defaultItem: primaryLuxury,
          ringColor: 0xe6be68,
        },
        {
          id: 'trader_farmer',
          type: 'market',
          label: 'Bağbanla Sövdələş (Meyvə və Mis)',
          pos: new THREE.Vector3(2.8, 0, 2.2),
          npcPos: new THREE.Vector3(4.5, 1.35, 2.0),
          radius: 2.8,
          defaultItem: primaryAgri,
          ringColor: 0x8cc87c,
        },
        {
          id: 'palace_gate',
          type: 'palace_audience',
          label: this.cityTheme.palaceTitle,
          palaceTitle: this.cityTheme.palaceTitle,
          pos: new THREE.Vector3(-2.7, 0, -5.8),
          npcPos: new THREE.Vector3(-4.2, 1.5, -6.2),
          radius: 2.7,
          ringColor: 0xc95e50,
        },
        {
          id: 'fayton_station',
          type: 'fayton',
          label: 'Faytonçu · Şəhərlərarası Səfər',
          pos: new THREE.Vector3(2.4, 0, -6.0),
          npcPos: new THREE.Vector3(3.8, 1.5, -6.2),
          radius: 2.7,
          ringColor: 0x6cb8cf,
        },
        {
          id: 'exit_gate',
          type: 'exit_to_map',
          label: 'Qız Qalası Darvazası · Qədim Xəritəyə Çıx',
          pos: new THREE.Vector3(0.0, 0, -9.4),
          npcPos: new THREE.Vector3(0.0, 1.6, -12.0),
          radius: 2.9,
          ringColor: 0xf4cf76,
        },
      ];
    } else if (angleId === 'carpet_gallery') {
      defs = [
        {
          id: 'trader_carpet',
          type: 'market',
          label: `Baş Tacirlə Sövdələş (${this.city?.short_name || 'Bazar'})`,
          pos: new THREE.Vector3(-0.6, 0, 2.2),
          npcPos: new THREE.Vector3(1.6, 1.45, 0.2),
          radius: 3.4,
          defaultItem: primaryLuxury,
          ringColor: 0xe6be68,
        },
      ];
    } else if (angleId === 'palace_hall') {
      defs = [
        {
          id: 'palace_throne',
          type: 'palace_audience',
          label: this.cityTheme.palaceTitle,
          palaceTitle: this.cityTheme.palaceTitle,
          pos: new THREE.Vector3(0.0, 0, -3.5),
          npcPos: new THREE.Vector3(0.0, 1.8, -8.0),
          radius: 3.6,
          ringColor: 0xd96b54,
        },
      ];
    }

    for (const def of defs) {
      this.interactables.push(def);

      const ringGeo = new THREE.RingGeometry(0.56, 0.595, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.ringColor,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(def.pos.x, 0.025, def.pos.z);
      this.interactGroup.add(ring);

      const innerGeo = new THREE.RingGeometry(0.28, 0.305, 36);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = ringMat.clone();
      innerMat.opacity = 0.16;
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(def.pos.x, 0.03, def.pos.z);
      this.interactGroup.add(inner);

      this.interactRings.push({ id: def.id, outer: ring, inner });
    }

    this.scene.add(this.interactGroup);
    this.eventBus.emit('bazaar:proximity', null);
  }

  async _buildPlayableMerchant() {
    const animated = await this.modelLoader.loadAnimatedGLB('merchant_hero', 1.0);
    let mesh = null;

    if (animated?.model) {
      mesh = animated.model;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 0.05) {
        this.player.baseNormScale = 1.84 / size.y;
        mesh.scale.multiplyScalar(this.player.baseNormScale);
      }
      const aligned = new THREE.Box3().setFromObject(mesh);
      mesh.position.y -= aligned.min.y;

      if (animated.animations && animated.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(mesh);
        this.player.mixer = mixer;
        for (const clip of animated.animations) {
          const action = mixer.clipAction(clip);
          this.player.actions[clip.name] = action;
          if (clip.name.toLowerCase().includes('idle')) this.player.actions.Idle = action;
          if (clip.name.toLowerCase().includes('walk')) this.player.actions.Walk = action;
        }
        const firstAction = this.player.actions.Idle || mixer.clipAction(animated.animations[0]);
        if (firstAction) {
          firstAction.play();
          this.player.activeActionName = 'Idle';
        }
      }
    } else {
      mesh = new THREE.Group();
      const coat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.38, 1.35, 14),
        new THREE.MeshStandardMaterial({ color: 0x3b1815, roughness: 0.82 })
      );
      coat.position.y = 0.85;
      coat.castShadow = true;
      mesh.add(coat);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 14, 12),
        new THREE.MeshStandardMaterial({ color: 0xdfb18a, roughness: 0.65 })
      );
      head.position.y = 1.66;
      head.castShadow = true;
      mesh.add(head);
    }

    mesh.position.copy(this.player.pos);
    mesh.rotation.y = this.player.yaw;
    this.scene.add(mesh);
    this.player.group = mesh;
  }

  _switchPlayerAnimation(targetName) {
    if (!this.player.mixer || this.player.activeActionName === targetName) return;
    const nextAction = this.player.actions[targetName];
    const prevAction = this.player.actions[this.player.activeActionName];
    if (!nextAction) return;

    nextAction.reset().setEffectiveTimeScale(targetName === 'Walk' ? 1.12 : 1.0).setEffectiveWeight(1).play();
    if (prevAction) prevAction.crossFadeTo(nextAction, 0.2, true);
    this.player.activeActionName = targetName;
  }

  _handleResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.backdropUniforms) {
      this.backdropUniforms.uAspectRatio.value = (w / Math.max(1, h)) / this.imageAspect;
    }
  }

  update(dt) {
    if (!this.isMounted || !this.renderer || !this.scene || !this.camera) return;
    this.elapsed += dt;

    // 1. 3D Tacirin hərəkəti
    let moveX = 0;
    let moveZ = 0;
    const modalBlocking = this.gameManager?.ui?.isInventoryOpen?.() || this.gameManager?.ui?.mapOpen;

    if (!this.dialogueFocus && !modalBlocking && !this.isTransitioning) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;

      if (moveX === 0 && moveZ === 0 && this.player.targetPos) {
        const dx = this.player.targetPos.x - this.player.pos.x;
        const dz = this.player.targetPos.z - this.player.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.22) {
          this.player.targetPos = null;
        } else {
          moveX = dx / dist;
          moveZ = dz / dist;
        }
      }
    }

    const len = Math.hypot(moveX, moveZ);
    this.player.isMoving = len > 0.01;

    if (this.player.isMoving) {
      const nx = moveX / len;
      const nz = moveZ / len;
      const step = this.player.speed * dt;
      const clamped = this._clampWalkable(this.player.pos.x + nx * step, this.player.pos.z + nz * step);
      this.player.pos.x = clamped.x;
      this.player.pos.z = clamped.z;

      const targetYaw = Math.atan2(nx, nz);
      let diff = targetYaw - this.player.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.yaw += diff * Math.min(1, dt * 10);
      this.player.walkPhase += dt * 9.5;
    }

    if (this.player.group) {
      this.player.group.position.copy(this.player.pos);
      this.player.group.rotation.y = this.player.yaw;
      if (this.player.mixer) {
        this._switchPlayerAnimation(this.player.isMoving ? 'Walk' : 'Idle');
        this.player.mixer.update(dt);
      }
    }

    // 2. Dinamik Günəş Şüası ↔ Kölgə Zonası İşıqlandırması (Tacir həyətdə kölgəyə girəndə real qaralır!)
    if (this.sunLight && this.angleCfg.useDynamicSunZone) {
      // Şəkildə diaqonal günəş sol daşlara düşür (x < -0.35 - z*0.14), sağ tərəf tağ kölgəsindədir
      const sunBoundaryX = -0.35 - this.player.pos.z * 0.14;
      const sunFactor = Math.max(0, Math.min(1, (sunBoundaryX - this.player.pos.x + 1.4) / 2.8));
      const targetSun = 0.72 + sunFactor * 1.95;
      this.sunLight.intensity += (targetSun - this.sunLight.intensity) * Math.min(1, dt * 5.0);
    }

    // 3. Yaxın interaktiv nöqtə
    let best = null;
    let bestDist = Infinity;
    for (const item of this.interactables) {
      const d = Math.hypot(this.player.pos.x - item.pos.x, this.player.pos.z - item.pos.z);
      if (d <= item.radius && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best?.id !== this.nearestInteractable?.id) {
      this.nearestInteractable = best;
      this.eventBus.emit('bazaar:proximity', best);
    }

    for (const r of this.interactRings) {
      const isNear = best?.id === r.id;
      const pulse = 0.2 + Math.sin(this.elapsed * 2.2) * 0.06;
      r.outer.material.opacity = isNear ? 0.48 : pulse;
      r.inner.material.opacity = isNear ? 0.32 : pulse * 0.68;
      r.outer.scale.setScalar(isNear ? 1.08 : 1.0);
      r.inner.rotation.y = this.elapsed * 0.45;
    }

    if (this.clickRipple && this.clickRipple.visible) {
      this.clickRippleLife -= dt * 1.4;
      if (this.clickRippleLife <= 0) {
        this.clickRipple.visible = false;
      } else {
        const s = 1 + (1 - this.clickRippleLife) * 0.85;
        this.clickRipple.scale.setScalar(s);
        this.clickRipple.material.opacity = this.clickRippleLife * 0.7;
      }
    }

    // 4. Fənər titrəməsi & toz zərrəcikləri
    for (const fl of this.flickerLights) {
      fl.light.intensity = fl.base * (0.9 + Math.sin(this.elapsed * 5.8 + fl.phase) * 0.1);
    }
    if (this.dustPoints) {
      const posAttr = this.dustPoints.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + dt * 0.14;
        if (y > 5.6) y = 0.35;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 5. Kamera + GLSL 3D Depth-Parallax sinxronizasiyası
    const targetParX = this.player.pos.x * 0.0048 + this.mouseNorm.x * 0.0105;
    const targetParY = -this.mouseNorm.y * 0.006 + (this.player.pos.z - 2.0) * 0.0007;
    this.smoothParallax.x += (targetParX - this.smoothParallax.x) * Math.min(1, dt * 4.5);
    this.smoothParallax.y += (targetParY - this.smoothParallax.y) * Math.min(1, dt * 4.5);

    const targetZoom = this.dialogueFocus ? 1.06 : 1.0 + Math.max(0, (4.5 - this.player.pos.z) * 0.003);
    this.smoothZoom += (targetZoom - this.smoothZoom) * Math.min(1, dt * 3.5);

    this.camera.position.set(
      this.baseCamPos.x + this.smoothParallax.x * 22.0,
      this.baseCamPos.y - this.smoothParallax.y * 9.5,
      this.baseCamPos.z - (this.smoothZoom - 1.0) * 13.0
    );
    this.camera.lookAt(
      this.baseLookAt.x + this.smoothParallax.x * 6.0,
      this.baseLookAt.y,
      this.baseLookAt.z
    );

    if (this.backdropUniforms) {
      this.backdropUniforms.uTime.value = this.elapsed;
      this.backdropUniforms.uParallax.value.copy(this.smoothParallax);
      this.backdropUniforms.uZoom.value = this.smoothZoom;

      const proj = this.player.pos.clone().add(new THREE.Vector3(0, 1.1, 0)).project(this.camera);
      this.backdropUniforms.uPlayerUV.value.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5);
      this.backdropUniforms.uPlayerDepth.value = Math.max(
        0.15,
        Math.min(1.0, (this.player.pos.z + 10.5) / 18.0)
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  unmount() {
    this.isMounted = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    if (this.angleBarEl) {
      this.angleBarEl.remove();
      this.angleBarEl = null;
    }
    if (this.renderer) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointermove', this._onPointerMove);
      dom.removeEventListener('pointerdown', this._onPointerDown);
      dom.removeEventListener('contextmenu', this._onContextMenu);
      this.renderer.dispose();
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    for (const tex of this._createdTextures) tex.dispose();
    this._createdTextures = [];
    this.angleTexCache.clear();
    this.container.innerHTML = '';
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
