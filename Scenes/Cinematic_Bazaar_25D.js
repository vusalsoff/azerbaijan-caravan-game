import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/Cinematic_Bazaar_25D.js
 * 6 Şəhərlik Canlı 2.5D Kinematik Mühərrik:
 * - Hər 6 Azərbaycan şəhəri (Bakı, Quba, Şəki, Gəncə, Şuşa, Naxçıvan) öz geniş 2.5D memarlıq fonu,
 *   dəqiq üfüq-uyğunluqlu (horizon-matched) kamerası və öz adlı canlı 3D NPC-ləri ilə işləyir!
 * - İzləyən kamera (Pan + Dolly) + 6-addımlı GLSL Relief Parallax + Normal-Map dinamik işıq
 * - Tağlardan/qapılardan yeriyərək avtomatik kinematik bucaq keçidi (Həyət ↔ Pasaj ↔ Divan)
 */

const NPC_PALETTES = {
  carpet_master: { coat: 0x1e3556, trim: 0xe2b65c, papaq: 0x1a1714 },
  gardener: { coat: 0x22442e, trim: 0xd6a04c, papaq: 0x1f1914 },
  fayton: { coat: 0x2a2d36, trim: 0xc98a4a, papaq: 0x151414 },
  silk_merchant: { coat: 0x521c36, trim: 0xe4b85e, papaq: 0x1e1815 },
  spice_broker: { coat: 0x54351a, trim: 0x6ea666, papaq: 0x1e1813 },
  vizier: { coat: 0x611720, trim: 0xf0c866, papaq: 0x1a1411 },
  palace_guard: { coat: 0x1e2028, trim: 0xc2984e, papaq: 0x121214 },
};

const CITY_PROFILES = {
  City_Baku: {
    courtyardImage: './images/bazaar_baku_25d',
    courtyardTitle: 'Karvansaray Həyəti',
    palaceTitle: 'Şirvanşahlar Divan Qəbulu',
    gateLabel: 'Qız Qalası Darvazası · Qədim Xəritəyə Çıx',
    camPos: [0, 1.82, 13.4],
    lookAt: [0, 3.35, -12.0],
    sunColor: 0xffd79a,
    sunPos: [14, 17, 7],
    sunBaseIntensity: 2.35,
    ambientSky: 0xffe6bd,
    ambientGround: 0x2d1f14,
    ambientIntensity: 0.9,
    useDynamicSunZone: true,
    showSunbeams: true,
    tint: new THREE.Color(1.0, 1.0, 1.0),
    npcs: [
      { id: 'trader_carpet', npcName: 'Hacı Səlim', npcRole: 'Baş Xalça Taciri', palette: 'carpet_master', defaultItem: 'carpet' },
      { id: 'trader_farmer', npcName: 'Usta Kərim', npcRole: 'Bağban və Misgər', palette: 'gardener', defaultItem: 'grape' },
      { id: 'fayton_station', npcName: 'Faytonçu Bəhram', npcRole: 'Şəhərlərarası Səfər', palette: 'fayton' },
    ],
  },
  City_Quba: {
    courtyardImage: './images/bazaar_quba_25d',
    courtyardTitle: 'Quba Dağ Bazarı',
    palaceTitle: 'Quba Xan Divanı Qəbulu',
    gateLabel: 'Şahdağ Darvazası · Qədim Xəritəyə Çıx',
    camPos: [0, 1.66, 12.6],
    lookAt: [0, 4.15, -12.0],
    sunColor: 0xffe0aa,
    sunPos: [-12, 16, 6],
    sunBaseIntensity: 2.25,
    ambientSky: 0xdbe6f0,
    ambientGround: 0x2b221a,
    ambientIntensity: 0.92,
    useDynamicSunZone: false,
    showSunbeams: false,
    tint: new THREE.Color(1.0, 1.0, 1.0),
    npcs: [
      { id: 'trader_carpet', npcName: 'Usta Səməd', npcRole: 'Quba-Çıraq Xalçaçısı', palette: 'carpet_master', defaultItem: 'carpet' },
      { id: 'trader_farmer', npcName: 'Bağban Murad', npcRole: 'Dağ Alması və Bal', palette: 'gardener', defaultItem: 'apple' },
      { id: 'fayton_station', npcName: 'Dağ Faytonçusu', npcRole: 'Şəhərlərarası Səfər', palette: 'fayton' },
    ],
  },
  City_Sheki: {
    courtyardImage: './images/bazaar_sheki_25d',
    courtyardTitle: 'Yuxarı Karvansaray',
    palaceTitle: 'Şəki Xan Sarayı Qəbulu',
    gateLabel: 'Karvansaray Qapısı · Qədim Xəritəyə Çıx',
    camPos: [0, 1.84, 13.4],
    lookAt: [0, 3.25, -12.0],
    sunColor: 0xffdf9e,
    sunPos: [10, 17, 5],
    sunBaseIntensity: 2.3,
    ambientSky: 0xdfefd8,
    ambientGround: 0x2a2117,
    ambientIntensity: 0.92,
    useDynamicSunZone: false,
    showSunbeams: false,
    tint: new THREE.Color(1.0, 1.0, 1.0),
    npcs: [
      { id: 'trader_carpet', npcName: 'İpəkçi Qasım', npcRole: 'Şəki İpək Ustası', palette: 'silk_merchant', defaultItem: 'silk' },
      { id: 'trader_farmer', npcName: 'Halvaçı Nəsib', npcRole: 'Şəki Halvası və Armud', palette: 'gardener', defaultItem: 'halva', pos: [1.32, 0, 3.35] },
      { id: 'fayton_station', npcName: 'Faytonçu Teymur', npcRole: 'Şəhərlərarası Səfər', palette: 'fayton' },
    ],
  },
  City_Ganja: {
    courtyardImage: './images/bazaar_ganja_25d',
    courtyardTitle: 'Şah Abbas Karvansarayı',
    palaceTitle: 'Gəncə Bəylərbəyi Qəbulu',
    gateLabel: 'Gəncə Darvazası · Qədim Xəritəyə Çıx',
    camPos: [0, 1.74, 13.0],
    lookAt: [0, 3.85, -12.0],
    sunColor: 0xffca82,
    sunPos: [-11, 15, 6],
    sunBaseIntensity: 2.2,
    ambientSky: 0xf2d1a8,
    ambientGround: 0x301d12,
    ambientIntensity: 0.9,
    useDynamicSunZone: false,
    showSunbeams: false,
    tint: new THREE.Color(1.0, 1.0, 1.0),
    npcs: [
      { id: 'trader_carpet', npcName: 'Dəftərdar Əli', npcRole: 'Nizami Yurdu Taciri', palette: 'carpet_master', defaultItem: 'silk' },
      { id: 'trader_farmer', npcName: 'Misgər Fərhad', npcRole: 'Saxsı və Bağ Nemətləri', palette: 'spice_broker', defaultItem: 'pomegranate' },
      { id: 'fayton_station', npcName: 'Karvanbaşı Rəşid', npcRole: 'Şəhərlərarası Səfər', palette: 'fayton' },
    ],
  },
  City_Shusha: {
    courtyardImage: './images/bazaar_shusha_25d',
    courtyardTitle: 'Şuşa Qala Meydanı',
    palaceTitle: 'Qarabağ Xanı Qəbulu',
    gateLabel: 'Gəncə Qapısı · Qədim Xəritəyə Çıx',
    camPos: [0, 1.6, 12.4],
    lookAt: [0, 4.45, -12.0],
    sunColor: 0xf5cc9c,
    sunPos: [8, 15, 4],
    sunBaseIntensity: 2.05,
    ambientSky: 0xcbc2d8,
    ambientGround: 0x261e1a,
    ambientIntensity: 0.9,
    useDynamicSunZone: false,
    showSunbeams: false,
    tint: new THREE.Color(1.0, 1.0, 1.0),
    npcs: [
      { id: 'trader_carpet', npcName: 'Usta Bəhmən', npcRole: 'Qarabağ Xalçaçısı', palette: 'vizier', defaultItem: 'carpet' },
      { id: 'trader_farmer', npcName: 'Atçı Rüstəm', npcRole: 'Qarabağ Atı Ləvazimatı', palette: 'fayton', defaultItem: 'horse_gear' },
      { id: 'fayton_station', npcName: 'Qala Faytonçusu', npcRole: 'Şəhərlərarası Səfər', palette: 'gardener' },
    ],
  },
  City_Nakhchivan: {
    courtyardImage: './images/bazaar_nakhchivan_25d',
    courtyardTitle: 'Möminə Xatun Meydanı',
    palaceTitle: 'Atabəylər Divan Qəbulu',
    gateLabel: 'Qərb Karvan Qapısı · Qədim Xəritəyə Çıx',
    camPos: [0, 1.74, 13.0],
    lookAt: [0, 3.85, -12.0],
    sunColor: 0xffa862,
    sunPos: [-10, 13, -4],
    sunBaseIntensity: 2.15,
    ambientSky: 0xe6a87c,
    ambientGround: 0x2d190f,
    ambientIntensity: 0.88,
    useDynamicSunZone: false,
    showSunbeams: false,
    tint: new THREE.Color(1.0, 1.0, 1.0),
    npcs: [
      { id: 'trader_carpet', npcName: 'Kəndxuda Yusif', npcRole: 'Duzdağ Kristal Taciri', palette: 'carpet_master', defaultItem: 'salt' },
      { id: 'trader_farmer', npcName: 'Zəfərançı Məcid', npcRole: 'Ədviyyat və Dağ Balı', palette: 'spice_broker', defaultItem: 'honey' },
      { id: 'fayton_station', npcName: 'Qərb Karvançısı', npcRole: 'Şəhərlərarası Səfər', palette: 'fayton' },
    ],
  },
};

function buildAngleConfigsForCity(cityProfile) {
  return {
    courtyard: {
      id: 'courtyard',
      title: cityProfile.courtyardTitle,
      baseImage: cityProfile.courtyardImage,
      camPos: cityProfile.camPos,
      lookAt: cityProfile.lookAt,
      fov: 43,
      baseZoom: 1.08,
      spawnPos: [0.0, 0, 4.4],
      spawnYaw: Math.PI,
      zRange: [-8.8, 6.8],
      xBoundsFn: (z) => {
        const tBack = (6.8 - z) / 15.6;
        return [-3.6 + tBack * 0.9, 3.2 - tBack * 0.6];
      },
      sunColor: cityProfile.sunColor,
      sunPos: cityProfile.sunPos,
      sunBaseIntensity: cityProfile.sunBaseIntensity,
      ambientSky: cityProfile.ambientSky,
      ambientGround: cityProfile.ambientGround,
      ambientIntensity: cityProfile.ambientIntensity,
      shadowOpacity: 0.45,
      lanterns: [
        { pos: [-4.4, 2.6, 1.4], uv: [0.12, 0.56], color: 0xffa442, intensity: 2.5 },
        { pos: [4.2, 2.5, 1.8], uv: [0.89, 0.56], color: 0xffa84c, intensity: 2.4 },
      ],
      useDynamicSunZone: cityProfile.useDynamicSunZone,
      showSunbeams: cityProfile.showSunbeams,
      playerScaleHeight: 1.84,
      portals: [
        {
          id: 'portal_to_carpet',
          label: 'Xalça və İpək Pasajına Daxil Ol',
          targetAngle: 'carpet_gallery',
          pos: [-3.3, 0, -2.2],
          triggerRadius: 1.35,
          ringColor: 0xe6be68,
        },
        {
          id: 'portal_to_palace',
          label: `${cityProfile.palaceTitle} · Divan Zalı`,
          targetAngle: 'palace_hall',
          pos: [-2.4, 0, -6.2],
          triggerRadius: 1.45,
          ringColor: 0xd46a54,
        },
      ],
    },
    carpet_gallery: {
      id: 'carpet_gallery',
      title: 'Xalça və İpək Pasajı',
      baseImage: './images/bazaar_baku_carpet_25d',
      // Üfüq dəqiq rəsmdəki arxa işıqlı qapı astanasına (~71% hündürlük) uyğunlaşdırılıb!
      camPos: [0, 1.56, 12.2],
      lookAt: [0, 4.72, -12.0],
      fov: 43,
      baseZoom: 1.08,
      spawnPos: [0.0, 0, 4.2],
      spawnYaw: Math.PI,
      zRange: [-7.2, 5.8],
      xBoundsFn: (z) => {
        const tBack = (5.8 - z) / 13.0;
        return [-2.35 + tBack * 0.75, 2.35 - tBack * 0.75];
      },
      sunColor: 0xffcb7e,
      sunPos: [5.5, 14.0, 2.0],
      sunBaseIntensity: 2.1,
      ambientSky: 0xdfb174,
      ambientGround: 0x26180d,
      ambientIntensity: 0.92,
      shadowOpacity: 0.46,
      lanterns: [
        { pos: [-3.2, 2.8, 1.8], uv: [0.22, 0.72], color: 0xffa23c, intensity: 3.1 },
        { pos: [3.2, 2.8, -0.8], uv: [0.78, 0.72], color: 0xffaa44, intensity: 3.0 },
      ],
      useDynamicSunZone: false,
      showSunbeams: false, // Rəsmin özündə real tavan günəş şüaları var
      playerScaleHeight: 1.78,
      portals: [
        {
          id: 'portal_back_courtyard_far',
          label: `${cityProfile.courtyardTitle} · Çıxış`,
          targetAngle: 'courtyard',
          pos: [0.0, 0, -6.7],
          triggerRadius: 1.45,
          ringColor: 0xf4cf76,
        },
      ],
    },
    palace_hall: {
      id: 'palace_hall',
      title: cityProfile.palaceTitle,
      baseImage: './images/bazaar_baku_palace_25d',
      camPos: [0, 1.72, 13.0],
      lookAt: [0, 3.8, -12.0],
      fov: 43,
      baseZoom: 1.08,
      spawnPos: [0.0, 0, 4.5],
      spawnYaw: Math.PI,
      zRange: [-4.6, 6.2],
      xBoundsFn: (z) => {
        const t = (6.2 - z) / 10.8;
        return [-3.2 + t * 0.45, 3.2 - t * 0.45];
      },
      sunColor: 0xffd288,
      sunPos: [3.0, 16.0, 1.0],
      sunBaseIntensity: 1.95,
      ambientSky: 0xb08c5e,
      ambientGround: 0x21170f,
      ambientIntensity: 0.88,
      shadowOpacity: 0.45,
      lanterns: [
        { pos: [-4.2, 2.2, 2.0], uv: [0.15, 0.48], color: 0xffa642, intensity: 2.9 },
        { pos: [4.2, 2.2, 2.0], uv: [0.85, 0.48], color: 0xffa642, intensity: 2.9 },
      ],
      useDynamicSunZone: false,
      showSunbeams: false,
      playerScaleHeight: 1.84,
      portals: [
        {
          id: 'portal_palace_back',
          label: `${cityProfile.courtyardTitle} · Qayıt`,
          targetAngle: 'courtyard',
          pos: [0.0, 0, 5.9],
          triggerRadius: 1.25,
          ringColor: 0xe6be68,
        },
      ],
    },
  };
}

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
    centered *= (0.91 / max(0.85, uZoom));
    return centered + 0.5;
  }

  void main() {
    vec2 baseUv = computeCoverUv(vUv);

    vec2 pUv = baseUv;
    float depth = 0.0;
    for (int i = 0; i < 6; i++) {
      depth = texture2D(uDepthMap, clamp(pUv, 0.002, 0.998)).r;
      float shift = 0.25 + (depth - 0.30) * 1.15;
      vec2 targetUv = baseUv - uParallax * shift;
      pUv = mix(pUv, targetUv, 0.58);
    }

    pUv = clamp(pUv, 0.002, 0.998);
    vec3 color = texture2D(uColorMap, pUv).rgb * uCityTint;
    vec3 normalTex = texture2D(uNormalMap, pUv).rgb * 2.0 - 1.0;
    vec3 N = normalize(vec3(normalTex.x * 1.18, normalTex.y * 1.18, max(0.25, normalTex.z)));
    float glow = texture2D(uGlowMap, pUv).r;

    float flickerA = 0.86 + 0.14 * sin(uTime * 5.3 + pUv.x * 19.0) * cos(uTime * 3.1 + pUv.y * 11.0);
    float flickerB = 0.90 + 0.10 * sin(uTime * 7.8 + pUv.x * 31.0);
    vec3 lanternBloom = vec3(1.0, 0.66, 0.24) * glow * (0.52 * flickerA);

    vec3 lDir1 = normalize(vec3(uLanternA - pUv, 0.18));
    float dist1 = length((uLanternA - pUv) * vec2(1.45, 1.0));
    float att1 = exp(-dist1 * 4.1) * flickerA;
    float diff1 = max(dot(N, lDir1), 0.0);

    vec3 lDir2 = normalize(vec3(uLanternB - pUv, 0.18));
    float dist2 = length((uLanternB - pUv) * vec2(1.45, 1.0));
    float att2 = exp(-dist2 * 4.1) * flickerB;
    float diff2 = max(dot(N, lDir2), 0.0);

    vec2 playerLight = uPlayerUV + vec2(0.0, 0.05);
    vec3 lDirP = normalize(vec3(playerLight - pUv, 0.22));
    float distP = length((playerLight - pUv) * vec2(1.45, 1.8));
    float attP = exp(-distP * 5.6) * (0.35 + 0.5 * uPlayerDepth) * (0.94 + 0.06 * sin(uTime * 4.2));
    float diffP = max(dot(N, lDirP), 0.0);

    vec3 dynamicWarmLight =
      vec3(1.0, 0.72, 0.34) * (diff1 * att1 * 0.26 + diff2 * att2 * 0.26 + diffP * attP * 0.24);

    vec3 finalCol = color + lanternBloom + dynamicWarmLight * color;

    float vig = smoothstep(0.96, 0.28, length((vUv - 0.5) * vec2(1.12, 1.04)));
    finalCol *= mix(0.75, 1.03, vig);
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
    this.cityProfile = CITY_PROFILES[cityId] || CITY_PROFILES.City_Baku;
    this.angleConfigs = buildAngleConfigsForCity(this.cityProfile);

    this.modelLoader = new ModelLoader();
    this.textureLoader = new THREE.TextureLoader();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.isMounted = false;

    this.activeAngleId = 'courtyard';
    this.angleCfg = this.angleConfigs.courtyard;
    this.angleTexCache = new Map();
    this.fadeAlpha = 1.0;
    this.isTransitioning = false;
    this.portalCooldown = 1.5;

    this.backdropMesh = null;
    this.backdropUniforms = null;
    this.imageAspect = 16 / 9;

    this.heroTemplate = null;

    this.player = {
      group: null,
      baseNormScale: 1.0,
      pos: new THREE.Vector3(0.0, 0, 4.4),
      yaw: Math.PI,
      speed: 4.5,
      walkPhase: 0,
      isMoving: false,
      targetPos: null,
      pendingInteraction: null,
      mountedHorse: false,
      mixer: null,
      actions: {},
      activeActionName: null,
    };

    this.npcGroup = null;
    this.liveNPCs = [];
    this.hoveredNPC = null;
    this.npcTagEl = null;

    this.foregroundGroup = null;
    this.hangingLanterns = [];

    this.baseCamPos = new THREE.Vector3(...this.angleCfg.camPos);
    this.baseLookAt = new THREE.Vector3(...this.angleCfg.lookAt);
    this.mouseNorm = { x: 0, y: 0 };
    this.smoothParallax = new THREE.Vector2(0, 0);
    this.smoothZoom = this.angleCfg.baseZoom;

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
      this.player.pendingInteraction = null;
      if (this.player.group && target.npcPos) {
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
      message: 'At sürmə funksiyası «Klassik 3D» rejimində aktivdir — yuxarı sağdakı «🏛️ 3D» düyməsindən keçə bilərsiniz.',
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
      this.player.pendingInteraction = null;
    }
  }

  _handlePointerMove(e) {
    if (!this.renderer || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    this.mouseNorm.x = Math.max(-1, Math.min(1, nx));
    this.mouseNorm.y = Math.max(-1, Math.min(1, ny));

    if (this.liveNPCs.length > 0 && !this.dialogueFocus && !this.gameManager?.ui?.isAnyModalOpen?.()) {
      this.pointer.set(nx, -ny);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hitboxes = this.liveNPCs.map((n) => n.hitbox).filter(Boolean);
      const hits = this.raycaster.intersectObjects(hitboxes, false);
      const hitNpc = hits.length > 0 ? hits[0].object.userData.npcRef : null;
      this.hoveredNPC = hitNpc;
      this.renderer.domElement.style.cursor = hitNpc ? 'pointer' : 'default';
    } else {
      this.hoveredNPC = null;
      if (this.renderer) this.renderer.domElement.style.cursor = 'default';
    }
  }

  _triggerInteractable(def) {
    if (!def) return;
    if (def.type === 'market') {
      this.eventBus.emit('market:open', { interactable: def });
    } else if (def.type === 'palace_audience') {
      this.eventBus.emit('palace:audience');
    } else if (def.type === 'fayton') {
      this.eventBus.emit('fayton:open');
    } else if (def.type === 'exit_to_map') {
      this.eventBus.emit('scene:exit_to_world');
    } else if (def.type === 'angle_portal' && def.targetAngle) {
      this.switchAngle(def.targetAngle);
    }
  }

  _handlePointerDown(e) {
    if (e.button !== 0 || !this.floorMesh || !this.camera || this.dialogueFocus || this.isTransitioning) return;
    if (this.gameManager?.ui?.isAnyModalOpen?.()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // 1. Canlı 3D NPC-yə klikləndikdə düz qarşısına yeriyib sövdələşməni aç
    const hitboxes = this.liveNPCs.map((n) => n.hitbox).filter(Boolean);
    if (hitboxes.length > 0) {
      const npcHits = this.raycaster.intersectObjects(hitboxes, false);
      if (npcHits.length > 0) {
        const npc = npcHits[0].object.userData.npcRef;
        if (npc?.def) {
          const dist = Math.hypot(this.player.pos.x - npc.def.pos.x, this.player.pos.z - npc.def.pos.z);
          if (dist <= Math.max(2.2, npc.def.radius * 0.85)) {
            this._triggerInteractable(npc.def);
          } else {
            const dirX = this.player.pos.x - npc.def.pos.x;
            const dirZ = this.player.pos.z - npc.def.pos.z;
            const d = Math.max(0.01, Math.hypot(dirX, dirZ));
            this._setWalkTarget(npc.def.pos.x + (dirX / d) * 1.4, npc.def.pos.z + (dirZ / d) * 1.4);
            this.player.pendingInteraction = npc.def;
          }
          return;
        }
      }
    }

    // 2. Döşəməyə klikləndikdə ora yeri
    const hits = this.raycaster.intersectObject(this.floorMesh);
    if (hits.length > 0) {
      const pt = hits[0].point;
      this.player.pendingInteraction = null;
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
      this.clickRipple.position.set(clamped.x, 0.035, clamped.z);
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
    const cfg = this.angleConfigs[angleId] || this.angleConfigs.courtyard;
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
    this.renderer.toneMappingExposure = 1.07;
    this.container.appendChild(this.renderer.domElement);

    // Diegetic NPC ad etiketi birbaşa body üzərində (z-index 25, heç vaxt kəsilmir)
    if (this.npcTagEl) this.npcTagEl.remove();
    this.npcTagEl = document.createElement('div');
    this.npcTagEl.className = 'npc-diegetic-tag';
    this.npcTagEl.style.zIndex = '25';
    this.npcTagEl.style.opacity = '0';
    document.body.appendChild(this.npcTagEl);

    await this._buildDepthParallaxBackdrop();
    this._buildLights();
    this._buildShadowFloorAndAtmosphere();
    this._buildForegroundFrame();
    await this._buildPlayableMerchant();
    this._rebuildHotspotsAndNPCs(this.activeAngleId);

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

  _buildForegroundFrame() {
    this.foregroundGroup = new THREE.Group();
    this.hangingLanterns = [];

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.55, metalness: 0.78 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x997236, roughness: 0.36, metalness: 0.85 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffca6e, transparent: true, opacity: 0.92 });

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 4.35, 5.2, 8.2);

      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.35, 6), ironMat);
      chain.position.y = -0.68;
      pivot.add(chain);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 6), brassMat);
      cap.position.y = -1.42;
      pivot.add(cap);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 6), ironMat);
      body.position.y = -1.68;
      pivot.add(body);

      const glowCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), flameMat.clone());
      glowCore.position.y = -1.68;
      pivot.add(glowCore);

      const bottomTip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 6), brassMat);
      bottomTip.rotation.x = Math.PI;
      bottomTip.position.y = -1.92;
      pivot.add(bottomTip);

      this.foregroundGroup.add(pivot);
      this.hangingLanterns.push({ pivot, glowCore, phase: side > 0 ? 1.7 : 0.0 });
    }

    this.scene.add(this.foregroundGroup);
  }

  async switchAngle(angleId, customSpawn = null) {
    if (!this.angleConfigs[angleId] || angleId === this.activeAngleId || this.isTransitioning) return;
    this.isTransitioning = true;
    this.portalCooldown = 1.8;
    this.player.targetPos = null;
    this.player.pendingInteraction = null;
    this.dialogueFocus = null;

    const texPromise = this._loadAngleTextures(angleId);
    const fadeOutSteps = 8;
    for (let i = 1; i <= fadeOutSteps; i++) {
      this.fadeAlpha = 1 - i / fadeOutSteps;
      if (this.backdropUniforms) this.backdropUniforms.uFade.value = this.fadeAlpha;
      await new Promise((r) => setTimeout(r, 17));
    }

    const bundle = await texPromise;
    if (!this.isMounted) return;

    this.activeAngleId = angleId;
    this.angleCfg = this.angleConfigs[angleId];
    this.baseCamPos.set(...this.angleCfg.camPos);
    this.baseLookAt.set(...this.angleCfg.lookAt);
    this.camera.fov = this.angleCfg.fov;
    this.camera.updateProjectionMatrix();
    this.smoothZoom = this.angleCfg.baseZoom;

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

    const sp = customSpawn || this.angleCfg.spawnPos;
    this.player.pos.set(sp[0], 0, sp[2]);
    this.player.yaw = this.angleCfg.spawnYaw;
    if (this.player.group) {
      this.player.group.scale.setScalar(this.player.baseNormScale * (this.angleCfg.playerScaleHeight / 1.84));
      this.player.group.position.copy(this.player.pos);
      this.player.group.rotation.y = this.player.yaw;
    }

    this._rebuildHotspotsAndNPCs(angleId);
    this.eventBus.emit('bazaar:angle_changed', { angleId, title: this.angleCfg.title });

    const fadeInSteps = 10;
    for (let i = 1; i <= fadeInSteps; i++) {
      this.fadeAlpha = i / fadeInSteps;
      if (this.backdropUniforms) this.backdropUniforms.uFade.value = this.fadeAlpha;
      await new Promise((r) => setTimeout(r, 17));
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
      uZoom: { value: this.angleCfg.baseZoom },
      uAspectRatio: { value: (w / Math.max(1, h)) / this.imageAspect },
      uTime: { value: 0 },
      uPlayerUV: { value: new THREE.Vector2(0.5, 0.25) },
      uPlayerDepth: { value: 0.6 },
      uCityTint: { value: this.cityProfile.tint.clone() },
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
      const pt = new THREE.PointLight(lCfg.color, lCfg.intensity, 16, 1.35);
      pt.position.set(...lCfg.pos);
      this.scene.add(pt);
      this.flickerLights.push({ light: pt, base: lCfg.intensity, phase: idx * 2.3 + 0.5 });
    });

    this.rimLight = new THREE.DirectionalLight(0xffcf88, 0.9);
    this.rimLight.position.set(0, 6, -15);
    this.scene.add(this.rimLight);
  }

  _buildShadowFloorAndAtmosphere() {
    const floorGeo = new THREE.PlaneGeometry(28, 38);
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

    // Kənarı yumşaq əriyən günəş şüası teksturası (sərt düz xətt kənarları olmasın)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 128;
    beamCanvas.height = 128;
    const bctx = beamCanvas.getContext('2d');
    const bgrad = bctx.createLinearGradient(0, 0, 128, 0);
    bgrad.addColorStop(0.0, 'rgba(255, 215, 138, 0.0)');
    bgrad.addColorStop(0.5, 'rgba(255, 215, 138, 0.42)');
    bgrad.addColorStop(1.0, 'rgba(255, 215, 138, 0.0)');
    bctx.fillStyle = bgrad;
    bctx.fillRect(0, 0, 128, 128);
    const beamTex = new THREE.CanvasTexture(beamCanvas);
    this._createdTextures.push(beamTex);

    this.sunBeamGroup = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const [bx, bz, rotZ] of [
      [-1.5, 1.5, 0.46],
      [-0.2, -3.0, 0.44],
    ]) {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 16), beamMat);
      beam.position.set(bx, 5.8, bz);
      beam.rotation.z = rotZ;
      beam.rotation.y = 0.25;
      this.sunBeamGroup.add(beam);
    }
    this.sunBeamGroup.visible = Boolean(this.angleCfg.showSunbeams);
    this.scene.add(this.sunBeamGroup);

    // Yumşaq dairəvi qızılı toz zərrəcikləri
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

    const count = 84;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11.0;
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
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustPoints);
  }

  _spawnLive3DNPC(def, idx) {
    if (!this.heroTemplate?.model) return null;
    const palette = NPC_PALETTES[def.palette] || NPC_PALETTES.carpet_master;
    const clone = SkeletonUtils.clone(this.heroTemplate.model);

    clone.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mat = child.material.clone();
      const mName = (mat.name || child.name || '').toLowerCase();
      if (mName.includes('chukha') || mName.includes('coat') || mName.includes('mantle') || mName.includes('sleeve')) {
        mat.color = new THREE.Color(palette.coat);
        if (mat.map) mat.color.lerp(new THREE.Color(0xffffff), 0.25);
      } else if (mName.includes('gold') || mName.includes('clasp') || mName.includes('chain') || mName.includes('trim')) {
        mat.color = new THREE.Color(palette.trim);
      } else if (mName.includes('papaq') || mName.includes('hat')) {
        mat.color = new THREE.Color(palette.papaq);
      }
      child.material = mat;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const npcScale = this.player.baseNormScale * ((this.angleCfg.playerScaleHeight * (def.scaleMul || 1.0)) / 1.84);
    clone.scale.setScalar(npcScale);
    clone.position.set(def.pos.x, 0, def.pos.z);
    clone.rotation.y = def.baseYaw ?? 0;

    let mixer = null;
    if (this.heroTemplate.animations?.length > 0) {
      mixer = new THREE.AnimationMixer(clone);
      const idleClip =
        this.heroTemplate.animations.find((c) => c.name.toLowerCase().includes('idle')) ||
        this.heroTemplate.animations[0];
      if (idleClip) {
        const action = mixer.clipAction(idleClip);
        action.play();
        action.time = (idx + 1) * 1.37;
      }
    }

    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 2.0, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.set(def.pos.x, 1.0, def.pos.z);

    const npcObj = {
      id: def.id,
      def,
      group: clone,
      mixer,
      hitbox,
      baseYaw: def.baseYaw ?? 0,
      currentYaw: def.baseYaw ?? 0,
    };
    hitbox.userData.npcRef = npcObj;

    this.npcGroup.add(clone);
    this.npcGroup.add(hitbox);
    return npcObj;
  }

  _rebuildHotspotsAndNPCs(angleId) {
    if (this.interactGroup) {
      this.interactGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.scene.remove(this.interactGroup);
    }
    if (this.npcGroup) {
      this.npcGroup.traverse((o) => {
        if (o.geometry && o.userData?.npcRef) o.geometry.dispose();
        if (o.material && !Array.isArray(o.material)) o.material.dispose();
      });
      this.scene.remove(this.npcGroup);
    }

    this.interactGroup = new THREE.Group();
    this.npcGroup = new THREE.Group();
    this.interactables = [];
    this.interactRings = [];
    this.liveNPCs = [];
    this.hoveredNPC = null;
    this.nearestInteractable = null;

    const primaryLuxury =
      this.city?.goods?.find((g) => g.item_id === 'carpet' || g.category === 'luxury')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'carpet';
    const primaryAgri =
      this.city?.goods?.find((g) => g.category === 'agriculture')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'pomegranate';

    const cNpcs = this.cityProfile.npcs;
    let defs = [];
    if (angleId === 'courtyard') {
      defs = [
        {
          id: 'trader_carpet',
          type: 'market',
          npcName: cNpcs[0].npcName,
          npcRole: cNpcs[0].npcRole,
          palette: cNpcs[0].palette,
          label: `${cNpcs[0].npcName} · Sövdələş (${this.city?.short_name || 'Bazar'})`,
          pos: new THREE.Vector3(-2.75, 0, 1.9),
          npcPos: new THREE.Vector3(-2.75, 1.5, 1.9),
          baseYaw: 1.35,
          radius: 2.8,
          defaultItem: cNpcs[0].defaultItem || primaryLuxury,
          ringColor: 0xd9ad58,
          spawnNPC: true,
        },
        {
          id: 'trader_farmer',
          type: 'market',
          npcName: cNpcs[1].npcName,
          npcRole: cNpcs[1].npcRole,
          palette: cNpcs[1].palette,
          label: `${cNpcs[1].npcName} · Sövdələş`,
          pos: new THREE.Vector3(...(cNpcs[1].pos || [2.45, 0, 2.55])),
          npcPos: new THREE.Vector3(...(cNpcs[1].pos ? [cNpcs[1].pos[0], 1.5, cNpcs[1].pos[2]] : [2.45, 1.5, 2.55])),
          baseYaw: -1.35,
          radius: 2.8,
          defaultItem: cNpcs[1].defaultItem || primaryAgri,
          ringColor: 0x82be74,
          spawnNPC: true,
        },
        {
          id: 'fayton_station',
          type: 'fayton',
          npcName: cNpcs[2].npcName,
          npcRole: cNpcs[2].npcRole,
          palette: cNpcs[2].palette,
          label: `${cNpcs[2].npcName} · Şəhərlərarası Səfər`,
          pos: new THREE.Vector3(2.0, 0, -4.6),
          npcPos: new THREE.Vector3(2.0, 1.5, -4.6),
          baseYaw: -0.55,
          radius: 2.8,
          ringColor: 0x6cb8cf,
          spawnNPC: true,
        },
        {
          id: 'exit_gate',
          type: 'exit_to_map',
          label: this.cityProfile.gateLabel,
          pos: new THREE.Vector3(0.0, 0, -8.2),
          npcPos: new THREE.Vector3(0.0, 1.6, -11.0),
          radius: 2.7,
          ringColor: 0xf4cf76,
          spawnNPC: false,
        },
      ];
    } else if (angleId === 'carpet_gallery') {
      // Hər 3 canlı NPC dəqiq daş döşəmənin sol və sağ piştaxtalarının qarşısında dayanır
      defs = [
        {
          id: 'trader_carpet',
          type: 'market',
          npcName: cNpcs[0].npcName,
          npcRole: 'Xalça və İpək Ustası',
          palette: 'carpet_master',
          label: `${cNpcs[0].npcName} · Xalça və İpək`,
          pos: new THREE.Vector3(-1.85, 0, 2.15),
          npcPos: new THREE.Vector3(-1.85, 1.5, 2.15),
          baseYaw: 1.4,
          radius: 2.85,
          defaultItem: primaryLuxury,
          ringColor: 0xd9ad58,
          spawnNPC: true,
        },
        {
          id: 'trader_silk',
          type: 'market',
          npcName: 'İpəkçi Səid',
          npcRole: 'Misgər və Parça Ustası',
          palette: 'silk_merchant',
          label: 'İpəkçi Səidlə Sövdələş',
          pos: new THREE.Vector3(1.85, 0, 0.95),
          npcPos: new THREE.Vector3(1.85, 1.5, 0.95),
          baseYaw: -1.4,
          radius: 2.85,
          defaultItem: 'silk',
          ringColor: 0xc97b54,
          spawnNPC: true,
        },
        {
          id: 'trader_spice',
          type: 'market',
          npcName: 'Ədviyyatçı Mirzə',
          npcRole: 'Zəfəran və Bağ Nemətləri',
          palette: 'spice_broker',
          label: 'Ədviyyatçı Mirzə ilə Sövdələş',
          pos: new THREE.Vector3(-1.55, 0, -2.55),
          npcPos: new THREE.Vector3(-1.55, 1.5, -2.55),
          baseYaw: 1.35,
          radius: 2.75,
          defaultItem: primaryAgri,
          ringColor: 0x82be74,
          spawnNPC: true,
        },
      ];
    } else if (angleId === 'palace_hall') {
      defs = [
        {
          id: 'palace_throne',
          type: 'palace_audience',
          npcName: 'Baş Vəzir Mirzə Rəhim',
          npcRole: this.cityProfile.palaceTitle,
          palette: 'vizier',
          label: this.cityProfile.palaceTitle,
          palaceTitle: this.cityProfile.palaceTitle,
          pos: new THREE.Vector3(0.0, 0, -2.8),
          npcPos: new THREE.Vector3(0.0, 1.6, -2.8),
          baseYaw: 0.0,
          radius: 3.2,
          ringColor: 0xd96b54,
          spawnNPC: true,
        },
        {
          id: 'palace_guard',
          type: 'palace_audience',
          npcName: 'Saray Keşikçisi',
          npcRole: 'Divan Mühafizəsi',
          palette: 'palace_guard',
          label: 'Divan Qəbuluna Yazıl',
          palaceTitle: this.cityProfile.palaceTitle,
          pos: new THREE.Vector3(-2.15, 0, -1.2),
          npcPos: new THREE.Vector3(-2.15, 1.6, -1.2),
          baseYaw: 0.7,
          radius: 2.5,
          ringColor: 0xb08b46,
          spawnNPC: true,
        },
      ];
    }

    for (const p of this.angleCfg.portals || []) {
      defs.push({
        id: p.id,
        type: 'angle_portal',
        targetAngle: p.targetAngle,
        label: p.label,
        pos: new THREE.Vector3(p.pos[0], 0, p.pos[2]),
        npcPos: new THREE.Vector3(p.pos[0], 1.5, p.pos[2]),
        radius: p.triggerRadius + 0.85,
        ringColor: p.ringColor || 0xe6be68,
        spawnNPC: false,
      });
    }

    defs.forEach((def, idx) => {
      this.interactables.push(def);

      if (def.spawnNPC) {
        const npcObj = this._spawnLive3DNPC(def, idx);
        if (npcObj) this.liveNPCs.push(npcObj);
      }

      const ringGeo = new THREE.RingGeometry(0.48, 0.515, 44);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.ringColor,
        transparent: true,
        opacity: def.spawnNPC ? 0.16 : 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(def.pos.x, 0.022, def.pos.z);
      this.interactGroup.add(ring);

      const innerGeo = new THREE.RingGeometry(0.24, 0.265, 32);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = ringMat.clone();
      innerMat.opacity = def.spawnNPC ? 0.1 : 0.18;
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(def.pos.x, 0.026, def.pos.z);
      this.interactGroup.add(inner);

      this.interactRings.push({ id: def.id, outer: ring, inner, isNPC: Boolean(def.spawnNPC) });
    });

    this.scene.add(this.interactGroup);
    this.scene.add(this.npcGroup);
    this.eventBus.emit('bazaar:proximity', null);
  }

  async _buildPlayableMerchant() {
    const animated = await this.modelLoader.loadAnimatedGLB('merchant_hero', 1.0);
    let mesh = null;

    if (animated?.model) {
      this.heroTemplate = animated;
      mesh = SkeletonUtils.clone(animated.model);

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

    nextAction.reset().setEffectiveTimeScale(targetName === 'Walk' ? 1.15 : 1.0).setEffectiveWeight(1).play();
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
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);

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
        if (dist < 0.24) {
          this.player.targetPos = null;
          if (this.player.pendingInteraction) {
            const pending = this.player.pendingInteraction;
            this.player.pendingInteraction = null;
            this._triggerInteractable(pending);
          }
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

    // 2. Avtomatik Tağ/Qapı Keçidi
    if (this.portalCooldown <= 0 && !this.isTransitioning && !this.dialogueFocus && !modalBlocking && this.player.isMoving) {
      for (const p of this.angleCfg.portals || []) {
        const pd = Math.hypot(this.player.pos.x - p.pos[0], this.player.pos.z - p.pos[2]);
        if (pd <= p.triggerRadius) {
          this.switchAngle(p.targetAngle);
          break;
        }
      }
    }

    // 3. Canlı 3D NPC-lərin nəfəsalması və oyunçuya tərəf dönməsi
    for (const npc of this.liveNPCs) {
      if (npc.mixer) npc.mixer.update(dt);
      const dx = this.player.pos.x - npc.def.pos.x;
      const dz = this.player.pos.z - npc.def.pos.z;
      const dist = Math.hypot(dx, dz);
      const desiredYaw = dist < 5.0 ? Math.atan2(dx, dz) : npc.baseYaw;
      let diff = desiredYaw - npc.currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      npc.currentYaw += diff * Math.min(1, dt * 4.5);
      npc.group.rotation.y = npc.currentYaw;
    }

    // 4. Dinamik Günəş Şüası ↔ Kölgə Zonası İşıqlandırması
    if (this.sunLight && this.angleCfg.useDynamicSunZone) {
      const sunBoundaryX = -0.35 - this.player.pos.z * 0.14;
      const sunFactor = Math.max(0, Math.min(1, (sunBoundaryX - this.player.pos.x + 1.4) / 2.8));
      const targetSun = 0.72 + sunFactor * 1.95;
      this.sunLight.intensity += (targetSun - this.sunLight.intensity) * Math.min(1, dt * 5.0);
    }

    // 5. Yaxın interaktiv nöqtə & diegetic NPC etiketi
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

    // Hover və ya 3.8m yaxınlıqdakı NPC üzərində zərif ad etiketi göstər
    let tagTarget = this.hoveredNPC;
    if (!tagTarget) {
      let minNpcD = 3.8;
      for (const n of this.liveNPCs) {
        const nd = Math.hypot(this.player.pos.x - n.def.pos.x, this.player.pos.z - n.def.pos.z);
        if (nd < minNpcD) {
          minNpcD = nd;
          tagTarget = n;
        }
      }
    }
    if (this.npcTagEl) {
      if (tagTarget && !this.dialogueFocus && !this.gameManager?.ui?.isAnyModalOpen?.()) {
        const headWorld = new THREE.Vector3(tagTarget.def.pos.x, 2.2, tagTarget.def.pos.z);
        headWorld.project(this.camera);
        const rect = this.renderer.domElement.getBoundingClientRect();
        const sx = rect.left + (headWorld.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-headWorld.y * 0.5 + 0.5) * rect.height;
        this.npcTagEl.innerHTML = `${tagTarget.def.npcName}<small>${tagTarget.def.npcRole}</small>`;
        this.npcTagEl.style.left = `${sx}px`;
        this.npcTagEl.style.top = `${sy}px`;
        this.npcTagEl.style.opacity = '1';
      } else {
        this.npcTagEl.style.opacity = '0';
      }
    }

    for (const r of this.interactRings) {
      const isNear = best?.id === r.id;
      const basePulse = r.isNPC ? 0.14 : 0.24;
      const pulse = basePulse + Math.sin(this.elapsed * 2.2) * 0.05;
      r.outer.material.opacity = isNear ? 0.48 : pulse;
      r.inner.material.opacity = isNear ? 0.3 : pulse * 0.65;
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
        this.clickRipple.material.opacity = this.clickRippleLife * 0.5;
      }
    }

    for (const fl of this.flickerLights) {
      fl.light.intensity = fl.base * (0.9 + Math.sin(this.elapsed * 5.8 + fl.phase) * 0.1);
    }
    for (const hl of this.hangingLanterns) {
      hl.pivot.rotation.z = Math.sin(this.elapsed * 1.15 + hl.phase) * 0.045;
      hl.pivot.rotation.x = Math.cos(this.elapsed * 0.85 + hl.phase) * 0.02;
      hl.glowCore.material.opacity = 0.78 + Math.sin(this.elapsed * 6.4 + hl.phase) * 0.18;
    }
    if (this.dustPoints) {
      const posAttr = this.dustPoints.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + dt * 0.13;
        if (y > 5.6) y = 0.35;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 7. İzləyən Kamera (Pan + Dolly) + GLSL 3D Depth-Parallax sinxronizasiyası
    const targetParX = this.player.pos.x * 0.0108 + this.mouseNorm.x * 0.0082;
    const targetParY = -this.mouseNorm.y * 0.005 + (this.player.pos.z - 2.0) * 0.001;
    this.smoothParallax.x += (targetParX - this.smoothParallax.x) * Math.min(1, dt * 3.8);
    this.smoothParallax.y += (targetParY - this.smoothParallax.y) * Math.min(1, dt * 3.8);

    const depthZoom = Math.max(0, (4.8 - this.player.pos.z) * 0.0045);
    const targetZoom = this.dialogueFocus
      ? this.angleCfg.baseZoom + 0.07
      : this.angleCfg.baseZoom + depthZoom;
    this.smoothZoom += (targetZoom - this.smoothZoom) * Math.min(1, dt * 3.2);

    const breatheY = Math.sin(this.elapsed * 0.72) * 0.022;
    this.camera.position.set(
      this.baseCamPos.x + this.smoothParallax.x * 24.0,
      this.baseCamPos.y - this.smoothParallax.y * 8.5 + breatheY,
      this.baseCamPos.z - (this.smoothZoom - this.angleCfg.baseZoom) * 14.0
    );
    this.camera.lookAt(
      this.baseLookAt.x + this.smoothParallax.x * 9.0,
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
    if (this.npcTagEl) {
      this.npcTagEl.remove();
      this.npcTagEl = null;
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
