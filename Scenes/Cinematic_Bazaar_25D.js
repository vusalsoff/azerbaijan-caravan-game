import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/Cinematic_Bazaar_25D.js
 * 6 Şəhər × 5 Xüsusi Məkan · Gücləndirilmiş 10-Addımlı 3D Parallax Occlusion (POM) + Dərinlik Dumanı:
 * - Hazırda NPC-siz təmiz 3D effekt və məkan kəşfiyyatı rejimi (`ENABLE_PLACEHOLDER_NPCS = false`) —
 *   3D rəssam dostunun özəl `.glb` NPC modelləri gəldikcə hazır slotlara 1 sətirlə qoşulacaq.
 * - Hər 6 şəhərin (Bakı, Şamaxı, Şəki, Gəncə, Şuşa, Lənkəran) 5 fərqli memarlıq məkanı var!
 * - 10-addımlı GLSL Relief/POM raymarch + Real 3D Kamera Dolly-In (dərinliyə getdikcə məkan açılır)
 *   + Hər məkanın havasına uyğun `THREE.FogExp2` dərinlik dumanı (tacir uzaqlaşdıqca dumanın içinə qarışır!).
 */

const ENABLE_PLACEHOLDER_NPCS = false;

const ROOM_TEMPLATES = {
  baku_courtyard: {
    baseImage: './images/bazaar_baku_25d',
    camPos: [0, 1.82, 13.4],
    lookAt: [0, 3.35, -12.0],
    zRange: [-8.8, 6.8],
    xBounds: [-3.6, 3.2, 0.9, 0.6],
    sunColor: 0xffd79a,
    sunPos: [14, 17, 7],
    sunBaseIntensity: 2.35,
    ambientSky: 0xffe6bd,
    ambientGround: 0x2d1f14,
    ambientIntensity: 0.92,
    fogColor: 0x3b2c1d,
    fogDensity: 0.014,
    useDynamicSunZone: true,
    lanterns: [
      { pos: [-4.4, 2.6, 1.4], uv: [0.12, 0.56], color: 0xffa442, intensity: 2.5 },
      { pos: [4.2, 2.5, 1.8], uv: [0.89, 0.56], color: 0xffa84c, intensity: 2.4 },
    ],
  },
  shamakhi_courtyard: {
    baseImage: './images/bazaar_shamakhi_25d',
    camPos: [0, 1.72, 13.0],
    lookAt: [0, 3.85, -12.0],
    zRange: [-8.4, 6.6],
    xBounds: [-3.5, 3.5, 0.85, 0.85],
    sunColor: 0xc2d4ec,
    sunPos: [8, 16, 4],
    sunBaseIntensity: 1.85,
    ambientSky: 0x8ea6c4,
    ambientGround: 0x221b16,
    ambientIntensity: 0.88,
    fogColor: 0x232a36,
    fogDensity: 0.02,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.2, 2.5, 1.6], uv: [0.13, 0.52], color: 0xffaa44, intensity: 3.1 },
      { pos: [4.2, 2.5, 1.6], uv: [0.88, 0.52], color: 0xffaa44, intensity: 3.1 },
    ],
  },
  sheki_courtyard: {
    baseImage: './images/bazaar_sheki_25d',
    camPos: [0, 1.84, 13.4],
    lookAt: [0, 3.25, -12.0],
    zRange: [-8.6, 6.8],
    xBounds: [-3.4, 3.0, 0.85, 0.8],
    sunColor: 0xffdf9e,
    sunPos: [10, 17, 5],
    sunBaseIntensity: 2.3,
    ambientSky: 0xdfefd8,
    ambientGround: 0x2a2117,
    ambientIntensity: 0.92,
    fogColor: 0x383628,
    fogDensity: 0.015,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.3, 2.5, 1.5], uv: [0.14, 0.55], color: 0xffa842, intensity: 2.6 },
      { pos: [4.3, 2.5, 1.5], uv: [0.88, 0.55], color: 0xffa842, intensity: 2.6 },
    ],
  },
  ganja_courtyard: {
    baseImage: './images/bazaar_ganja_25d',
    camPos: [0, 1.74, 13.0],
    lookAt: [0, 3.85, -12.0],
    zRange: [-8.6, 6.6],
    xBounds: [-3.4, 3.4, 0.9, 0.9],
    sunColor: 0xffca82,
    sunPos: [-11, 15, 6],
    sunBaseIntensity: 2.2,
    ambientSky: 0xf2d1a8,
    ambientGround: 0x301d12,
    ambientIntensity: 0.9,
    fogColor: 0x3b2619,
    fogDensity: 0.017,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.2, 2.6, 1.6], uv: [0.09, 0.58], color: 0xffa23e, intensity: 2.8 },
      { pos: [4.2, 2.6, 1.6], uv: [0.92, 0.58], color: 0xffa23e, intensity: 2.8 },
    ],
  },
  shusha_courtyard: {
    baseImage: './images/bazaar_shusha_25d',
    camPos: [0, 1.6, 12.4],
    lookAt: [0, 4.45, -12.0],
    zRange: [-8.2, 6.4],
    xBounds: [-3.3, 3.3, 0.9, 0.9],
    sunColor: 0xf5cc9c,
    sunPos: [8, 15, 4],
    sunBaseIntensity: 2.05,
    ambientSky: 0xcbc2d8,
    ambientGround: 0x261e1a,
    ambientIntensity: 0.9,
    fogColor: 0x342f38,
    fogDensity: 0.02,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.2, 2.5, 1.6], uv: [0.11, 0.56], color: 0xffa642, intensity: 3.0 },
      { pos: [4.2, 2.5, 1.6], uv: [0.91, 0.56], color: 0xffa642, intensity: 3.0 },
    ],
  },
  lankaran_courtyard: {
    baseImage: './images/bazaar_lankaran_25d',
    camPos: [0, 1.68, 12.8],
    lookAt: [0, 4.05, -12.0],
    zRange: [-8.2, 6.4],
    xBounds: [-3.2, 3.2, 0.85, 0.85],
    sunColor: 0xffc47a,
    sunPos: [6, 15, 2],
    sunBaseIntensity: 2.1,
    ambientSky: 0xdcc5a2,
    ambientGround: 0x2b1d13,
    ambientIntensity: 0.9,
    fogColor: 0x33261b,
    fogDensity: 0.018,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.0, 2.6, 1.5], uv: [0.24, 0.58], color: 0xffa43c, intensity: 3.0 },
      { pos: [4.0, 2.6, 1.5], uv: [0.78, 0.58], color: 0xffa43c, intensity: 3.0 },
    ],
  },
  covered_arcade: {
    baseImage: './images/bazaar_baku_carpet_25d',
    camPos: [0, 1.56, 12.2],
    lookAt: [0, 4.72, -12.0],
    zRange: [-7.2, 5.8],
    xBounds: [-2.35, 2.35, 0.75, 0.75],
    sunColor: 0xffcb7e,
    sunPos: [5.5, 14.0, 2.0],
    sunBaseIntensity: 2.1,
    ambientSky: 0xdfb174,
    ambientGround: 0x26180d,
    ambientIntensity: 0.92,
    fogColor: 0x2c1f13,
    fogDensity: 0.022,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-3.2, 2.8, 1.8], uv: [0.22, 0.72], color: 0xffa23c, intensity: 3.2 },
      { pos: [3.2, 2.8, -0.8], uv: [0.78, 0.72], color: 0xffaa44, intensity: 3.1 },
    ],
  },
  divan_palace: {
    baseImage: './images/bazaar_baku_palace_25d',
    camPos: [0, 1.72, 13.0],
    lookAt: [0, 3.8, -12.0],
    zRange: [-4.8, 6.2],
    xBounds: [-3.2, 3.2, 0.45, 0.45],
    sunColor: 0xffd288,
    sunPos: [3.0, 16.0, 1.0],
    sunBaseIntensity: 1.95,
    ambientSky: 0xb08c5e,
    ambientGround: 0x21170f,
    ambientIntensity: 0.88,
    fogColor: 0x261c14,
    fogDensity: 0.02,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.2, 2.2, 2.0], uv: [0.15, 0.48], color: 0xffa642, intensity: 2.9 },
      { pos: [4.2, 2.2, 2.0], uv: [0.85, 0.48], color: 0xffa642, intensity: 2.9 },
    ],
  },
  caspian_harbor: {
    baseImage: './images/room_baku_harbor_25d',
    camPos: [0, 1.62, 12.6],
    lookAt: [0, 4.3, -12.0],
    zRange: [-8.0, 6.0],
    xBounds: [-2.3, 1.45, 0.5, 0.4],
    sunColor: 0xffbe72,
    sunPos: [10, 12, -8],
    sunBaseIntensity: 2.05,
    ambientSky: 0xb39a84,
    ambientGround: 0x1b2024,
    ambientIntensity: 0.88,
    fogColor: 0x2a2c32,
    fogDensity: 0.022,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-3.2, 1.9, 3.2], uv: [0.1, 0.44], color: 0xff9e38, intensity: 3.3 },
      { pos: [-2.4, 2.0, -1.2], uv: [0.28, 0.48], color: 0xffaa44, intensity: 2.8 },
    ],
  },
  fortress_rampart: {
    baseImage: './images/room_fortress_rampart_25d',
    camPos: [0, 1.62, 12.6],
    lookAt: [0, 4.35, -12.0],
    zRange: [-7.8, 6.0],
    xBounds: [-2.2, 1.45, 0.6, 0.5],
    sunColor: 0xffbc78,
    sunPos: [12, 13, -6],
    sunBaseIntensity: 2.0,
    ambientSky: 0x9c8fa8,
    ambientGround: 0x211d1c,
    ambientIntensity: 0.86,
    fogColor: 0x332b34,
    fogDensity: 0.021,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-3.0, 2.4, 2.6], uv: [0.15, 0.56], color: 0xff8c2e, intensity: 3.5 },
      { pos: [-2.2, 2.4, -1.6], uv: [0.31, 0.55], color: 0xff9636, intensity: 3.0 },
    ],
  },
  mountain_pass_bazaar: {
    baseImage: './images/bazaar_quba_25d',
    camPos: [0, 1.66, 12.6],
    lookAt: [0, 4.15, -12.0],
    zRange: [-8.2, 6.4],
    xBounds: [-3.3, 3.3, 0.8, 0.8],
    sunColor: 0xffe0aa,
    sunPos: [-12, 16, 6],
    sunBaseIntensity: 2.25,
    ambientSky: 0xdbe6f0,
    ambientGround: 0x2b221a,
    ambientIntensity: 0.92,
    fogColor: 0x3d3b38,
    fogDensity: 0.016,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.2, 2.6, 1.6], uv: [0.09, 0.58], color: 0xffa642, intensity: 2.8 },
      { pos: [4.2, 2.6, 1.6], uv: [0.92, 0.58], color: 0xffa642, intensity: 2.8 },
    ],
  },
  mausoleum_square: {
    baseImage: './images/bazaar_nakhchivan_25d',
    camPos: [0, 1.74, 13.0],
    lookAt: [0, 3.85, -12.0],
    zRange: [-7.4, 6.4],
    xBounds: [-3.2, 3.2, 0.8, 0.8],
    sunColor: 0xffa862,
    sunPos: [-10, 13, -4],
    sunBaseIntensity: 2.15,
    ambientSky: 0xe6a87c,
    ambientGround: 0x2d190f,
    ambientIntensity: 0.88,
    fogColor: 0x3c2518,
    fogDensity: 0.019,
    useDynamicSunZone: false,
    lanterns: [
      { pos: [-4.0, 2.5, 1.5], uv: [0.18, 0.52], color: 0xffa23c, intensity: 3.1 },
      { pos: [4.0, 2.5, 1.5], uv: [0.83, 0.52], color: 0xffa23c, intensity: 3.1 },
    ],
  },
};

// Hər 6 şəhər üçün 5 fərqli xüsusi məkan (100% özəl adlandırma və keçidlərlə)
const CITY_FIVE_ROOMS = {
  City_Baku: {
    palaceTitle: 'Şirvanşahlar Divan Qəbulu',
    gateLabel: 'Qız Qalası Darvazası · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Həyət', title: 'Karvansaray Həyəti', template: 'baku_courtyard', tint: [1.0, 1.0, 1.0] },
      { id: 'carpet_gallery', shortTitle: 'Pasaj', title: 'Xalça və İpək Pasajı', template: 'covered_arcade', tint: [1.0, 1.0, 1.0] },
      { id: 'palace_hall', shortTitle: 'Divan', title: 'Şirvanşahlar Divan Zalı', template: 'divan_palace', tint: [1.0, 1.0, 1.0] },
      { id: 'harbor', shortTitle: 'Liman', title: 'Xəzər Limanı & Dəniz Darvazası', template: 'caspian_harbor', tint: [1.0, 1.0, 1.0] },
      { id: 'rampart', shortTitle: 'Bürc', title: 'Qız Qalası Müdafiə Bürcləri', template: 'fortress_rampart', tint: [1.03, 0.99, 0.94] },
    ],
  },
  City_Shamakhi: {
    palaceTitle: 'Şamaxı Şirvan Divan Qəbulu',
    gateLabel: 'Şirvan Karvan Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Həyət', title: 'Firuzəyi Karvansaray', template: 'shamakhi_courtyard', tint: [1.0, 1.0, 1.0] },
      { id: 'carpet_gallery', shortTitle: 'Pasaj', title: 'Şirvan Xalça Pasajı', template: 'covered_arcade', tint: [0.96, 1.0, 1.04] },
      { id: 'palace_hall', shortTitle: 'Divan', title: 'Şamaxı Divan Zalı', template: 'divan_palace', tint: [0.95, 1.0, 1.05] },
      { id: 'mausoleum', shortTitle: 'Türbə', title: 'Yeddi Günbəz & Qədim Meydan', template: 'mausoleum_square', tint: [1.0, 0.98, 0.96] },
      { id: 'rampart', shortTitle: 'Gülüstan', title: 'Gülüstan Qalası Bürcləri', template: 'fortress_rampart', tint: [0.96, 0.98, 1.03] },
    ],
  },
  City_Sheki: {
    palaceTitle: 'Şəki Xan Sarayı Qəbulu',
    gateLabel: 'Karvansaray Darvazası · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Həyət', title: 'Yuxarı Karvansaray', template: 'sheki_courtyard', tint: [1.0, 1.0, 1.0] },
      { id: 'carpet_gallery', shortTitle: 'İpək', title: 'Şəki İpək və Halva Pasajı', template: 'covered_arcade', tint: [0.96, 1.02, 0.98] },
      { id: 'palace_hall', shortTitle: 'Divan', title: 'Şəki Xan Divan Zalı', template: 'divan_palace', tint: [0.95, 1.03, 1.0] },
      { id: 'mountain_pass', shortTitle: 'Yaylaq', title: 'Qafqaz Dağ Aşırımı Bazarı', template: 'mountain_pass_bazaar', tint: [1.0, 1.0, 1.0] },
      { id: 'rampart', shortTitle: 'Qala', title: 'Gələrsən-Görərsən Bürcləri', template: 'fortress_rampart', tint: [0.94, 1.0, 0.98] },
    ],
  },
  City_Ganja: {
    palaceTitle: 'Gəncə Bəylərbəyi Qəbulu',
    gateLabel: 'Gəncə Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Həyət', title: 'Şah Abbas Karvansarayı', template: 'ganja_courtyard', tint: [1.0, 1.0, 1.0] },
      { id: 'carpet_gallery', shortTitle: 'Pasaj', title: 'Sənətkarlar və Saxsı Pasajı', template: 'covered_arcade', tint: [1.04, 0.97, 0.94] },
      { id: 'palace_hall', shortTitle: 'Divan', title: 'Gəncə Bəylərbəyi Zalı', template: 'divan_palace', tint: [1.03, 0.97, 0.94] },
      { id: 'mausoleum', shortTitle: 'Nizami', title: 'Qədim Türbə & Mədrəsə Meydanı', template: 'mausoleum_square', tint: [1.02, 0.99, 0.96] },
      { id: 'rampart', shortTitle: 'Bürc', title: 'Gəncə Qala Divarları', template: 'fortress_rampart', tint: [1.03, 0.96, 0.92] },
    ],
  },
  City_Shusha: {
    palaceTitle: 'Qarabağ Xanı Qəbulu',
    gateLabel: 'Gəncə Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Meydan', title: 'Şuşa Qala Meydanı', template: 'shusha_courtyard', tint: [1.0, 1.0, 1.0] },
      { id: 'carpet_gallery', shortTitle: 'Xalça', title: 'Qarabağ Xalça Pasajı', template: 'covered_arcade', tint: [0.97, 0.97, 1.03] },
      { id: 'palace_hall', shortTitle: 'Divan', title: 'Pənahəli Xan Divan Zalı', template: 'divan_palace', tint: [0.96, 0.96, 1.04] },
      { id: 'rampart', shortTitle: 'Cıdır', title: 'Cıdır Düzü Qala Bürcləri', template: 'fortress_rampart', tint: [1.0, 1.0, 1.0] },
      { id: 'mountain_pass', shortTitle: 'Yaylaq', title: 'Qarabağ Dağ Bazarı', template: 'mountain_pass_bazaar', tint: [0.97, 0.98, 1.03] },
    ],
  },
  City_Lankaran: {
    palaceTitle: 'Talış Xanı Divan Qəbulu',
    gateLabel: 'Cənub Karvan Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Qala', title: 'Dairəvi Qala Meydanı', template: 'lankaran_courtyard', tint: [1.0, 1.0, 1.0] },
      { id: 'carpet_gallery', shortTitle: 'Pasaj', title: 'Ədviyyat və İpək Pasajı', template: 'covered_arcade', tint: [1.02, 1.0, 0.95] },
      { id: 'palace_hall', shortTitle: 'Divan', title: 'Talış Xanı Divan Zalı', template: 'divan_palace', tint: [1.02, 0.99, 0.95] },
      { id: 'harbor', shortTitle: 'Liman', title: 'Cənub Xəzər Limanı', template: 'caspian_harbor', tint: [0.96, 1.02, 0.98] },
      { id: 'rampart', shortTitle: 'Bürc', title: 'Sərhəd Qala Bürcləri', template: 'fortress_rampart', tint: [0.98, 1.0, 0.95] },
    ],
  },
};

function buildCityAngleMap(cityId) {
  const aliases = { City_Quba: 'City_Shamakhi', City_Nakhchivan: 'City_Lankaran' };
  const resolvedId = aliases[cityId] || cityId;
  const spec = CITY_FIVE_ROOMS[resolvedId] || CITY_FIVE_ROOMS.City_Baku;

  const angleMap = {};
  const roomList = [];

  spec.rooms.forEach((rm, idx) => {
    const tpl = ROOM_TEMPLATES[rm.template] || ROOM_TEMPLATES.baku_courtyard;
    const [xMin0, xMax0, xMinBack, xMaxBack] = tpl.xBounds;
    const [zMin, zMax] = tpl.zRange;
    const zSpan = Math.max(1, zMax - zMin);

    const nextRoom = spec.rooms[(idx + 1) % spec.rooms.length];
    const portals =
      rm.id === 'courtyard'
        ? [
            {
              id: 'portal_to_arcade',
              label: `${spec.rooms[1].title} · Keçid`,
              targetAngle: spec.rooms[1].id,
              pos: [xMin0 + 0.35, 0, -2.0],
              triggerRadius: 1.35,
              ringColor: 0xe6be68,
            },
            {
              id: 'portal_to_palace',
              label: `${spec.rooms[2].title} · Keçid`,
              targetAngle: spec.rooms[2].id,
              pos: [xMin0 + 1.0, 0, -5.8],
              triggerRadius: 1.4,
              ringColor: 0xd46a54,
            },
            {
              id: 'portal_to_special4',
              label: `${spec.rooms[3].title} · Keçid`,
              targetAngle: spec.rooms[3].id,
              pos: [xMax0 - 0.5, 0, -2.2],
              triggerRadius: 1.35,
              ringColor: 0x6cb8cf,
            },
          ]
        : [
            {
              id: 'portal_return_courtyard',
              label: `${spec.rooms[0].title} · Qayıt`,
              targetAngle: 'courtyard',
              pos: [0.0, 0, zMin + 0.65],
              triggerRadius: 1.45,
              ringColor: 0xf4cf76,
            },
            {
              id: 'portal_next_room',
              label: `${nextRoom.title} · Keçid`,
              targetAngle: nextRoom.id,
              pos: [xMax0 - 0.12, 0, 0.2],
              triggerRadius: 0.9,
              ringColor: 0x82be74,
            },
          ];

    angleMap[rm.id] = {
      id: rm.id,
      shortTitle: rm.shortTitle,
      title: rm.title,
      baseImage: tpl.baseImage,
      camPos: tpl.camPos,
      lookAt: tpl.lookAt,
      fov: 43,
      baseZoom: 1.07,
      spawnPos: [0.0, 0, Math.min(4.4, zMax - 1.6)],
      spawnYaw: Math.PI,
      zRange: tpl.zRange,
      xBoundsFn: (z) => {
        const tBack = (zMax - z) / zSpan;
        return [xMin0 + tBack * xMinBack, xMax0 - tBack * xMaxBack];
      },
      sunColor: tpl.sunColor,
      sunPos: tpl.sunPos,
      sunBaseIntensity: tpl.sunBaseIntensity,
      ambientSky: tpl.ambientSky,
      ambientGround: tpl.ambientGround,
      ambientIntensity: tpl.ambientIntensity,
      fogColor: tpl.fogColor,
      fogDensity: tpl.fogDensity,
      shadowOpacity: 0.48,
      lanterns: tpl.lanterns,
      useDynamicSunZone: Boolean(tpl.useDynamicSunZone),
      tint: new THREE.Color(...rm.tint),
      playerScaleHeight: rm.id === 'carpet_gallery' ? 1.78 : 1.84,
      portals,
    };

    roomList.push({ id: rm.id, shortTitle: rm.shortTitle, title: rm.title });
  });

  return { spec, angleMap, roomList };
}

const BACKDROP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

// Gücləndirilmiş 10-Addımlı 3D Parallax Occlusion Mapping (POM) + Dinamik Fənər Normal-Map Şeyderi
const BACKDROP_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uGlowMap;

  uniform vec2 uParallax;
  uniform float uZoom;
  uniform float uDolly;
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
    centered *= (0.90 / max(0.85, uZoom));
    return centered + 0.5;
  }

  void main() {
    vec2 baseUv = computeCoverUv(vUv);

    // 10-addımlı dərinlik raymarching + irəli-geri Dolly zamanı ön plan sütunlarının kənara açılması!
    vec2 pUv = baseUv;
    float depth = 0.0;
    vec2 radial = (baseUv - 0.5);
    for (int i = 0; i < 10; i++) {
      depth = texture2D(uDepthMap, clamp(pUv, 0.002, 0.998)).r;
      float curvedDepth = pow(clamp(depth, 0.0, 1.0), 1.22);
      // Həm yan pan paralaksı, həm də dərinliyə doğru getdikcə ön plan genişlənməsi (3D Dolly-POM)
      float lateralShift = 0.24 + (curvedDepth - 0.28) * 1.48;
      vec2 dollyExpansion = radial * uDolly * (curvedDepth - 0.22) * 0.28;
      vec2 targetUv = baseUv - uParallax * lateralShift - dollyExpansion;
      pUv = mix(pUv, targetUv, 0.48);
    }

    pUv = clamp(pUv, 0.002, 0.998);
    vec3 color = texture2D(uColorMap, pUv).rgb * uCityTint;
    vec3 normalTex = texture2D(uNormalMap, pUv).rgb * 2.0 - 1.0;
    vec3 N = normalize(vec3(normalTex.x * 1.25, normalTex.y * 1.25, max(0.24, normalTex.z)));
    float glow = texture2D(uGlowMap, pUv).r;

    float flickerA = 0.86 + 0.14 * sin(uTime * 5.3 + pUv.x * 19.0) * cos(uTime * 3.1 + pUv.y * 11.0);
    float flickerB = 0.90 + 0.10 * sin(uTime * 7.8 + pUv.x * 31.0);
    vec3 lanternBloom = vec3(1.0, 0.66, 0.24) * glow * (0.55 * flickerA);

    vec3 lDir1 = normalize(vec3(uLanternA - pUv, 0.18));
    float dist1 = length((uLanternA - pUv) * vec2(1.45, 1.0));
    float att1 = exp(-dist1 * 4.0) * flickerA;
    float diff1 = max(dot(N, lDir1), 0.0);

    vec3 lDir2 = normalize(vec3(uLanternB - pUv, 0.18));
    float dist2 = length((uLanternB - pUv) * vec2(1.45, 1.0));
    float att2 = exp(-dist2 * 4.0) * flickerB;
    float diff2 = max(dot(N, lDir2), 0.0);

    // 3D Tacirin öz fənər parıltısı yaxın daş divarları və sütunları canlı işıqlandırır
    vec2 playerLight = uPlayerUV + vec2(0.0, 0.05);
    vec3 lDirP = normalize(vec3(playerLight - pUv, 0.20));
    float distP = length((playerLight - pUv) * vec2(1.45, 1.75));
    float attP = exp(-distP * 5.2) * (0.4 + 0.55 * uPlayerDepth) * (0.94 + 0.06 * sin(uTime * 4.2));
    float diffP = max(dot(N, lDirP), 0.0);

    vec3 dynamicWarmLight =
      vec3(1.0, 0.72, 0.34) * (diff1 * att1 * 0.28 + diff2 * att2 * 0.28 + diffP * attP * 0.30);

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

    const built = buildCityAngleMap(cityId);
    this.citySpec = built.spec;
    this.angleConfigs = built.angleMap;
    this.roomList = built.roomList;

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
    this.portalCooldown = 1.6;

    this.backdropMesh = null;
    this.backdropUniforms = null;
    this.imageAspect = 16 / 9;

    this.player = {
      group: null,
      baseNormScale: 1.0,
      pos: new THREE.Vector3(0.0, 0, 4.4),
      yaw: Math.PI,
      speed: 4.6,
      walkPhase: 0,
      isMoving: false,
      targetPos: null,
      mountedHorse: false,
      mixer: null,
      actions: {},
      activeActionName: null,
    };

    this.foregroundGroup = null;
    this.hangingLanterns = [];

    this.baseCamPos = new THREE.Vector3(...this.angleCfg.camPos);
    this.baseLookAt = new THREE.Vector3(...this.angleCfg.lookAt);
    this.mouseNorm = { x: 0, y: 0 };
    this.smoothParallax = new THREE.Vector2(0, 0);
    this.smoothZoom = this.angleCfg.baseZoom;
    this.smoothDolly = 0.0;

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

  getRoomList() {
    return this.roomList;
  }

  getNearestInteractable() {
    return this.nearestInteractable;
  }

  setDialogueFocus(target) {
    this.dialogueFocus = target;
    if (target) {
      this.player.targetPos = null;
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
      message: 'At sürmə funksiyası «🏛️ 3D» Klassik rejimdə aktivdir.',
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
    // Real atmosferik dərinlik dumanı: 3D tacir məkanın dərinliyinə getdikcə havaya təbii qarışır!
    this.scene.fog = new THREE.FogExp2(this.angleCfg.fogColor, this.angleCfg.fogDensity);

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

    await this._buildDepthParallaxBackdrop();
    this._buildLights();
    this._buildShadowFloorAndAtmosphere();
    this._buildForegroundFrame();
    await this._buildPlayableMerchant();
    this._rebuildHotspots(this.activeAngleId);

    // Şəhərin qalan 4 məkanını arxa fonda sakitcə keşlə
    for (const rm of this.roomList) {
      if (rm.id !== this.activeAngleId) this._loadAngleTextures(rm.id);
    }

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
    this.smoothDolly = 0.0;

    if (this.scene) {
      this.scene.fog = new THREE.FogExp2(this.angleCfg.fogColor, this.angleCfg.fogDensity);
    }

    if (bundle.colorMap?.image?.width && bundle.colorMap?.image?.height) {
      this.imageAspect = bundle.colorMap.image.width / bundle.colorMap.image.height;
    }

    if (this.backdropUniforms) {
      if (bundle.colorMap) this.backdropUniforms.uColorMap.value = bundle.colorMap;
      if (bundle.depthMap) this.backdropUniforms.uDepthMap.value = bundle.depthMap;
      if (bundle.normalMap) this.backdropUniforms.uNormalMap.value = bundle.normalMap;
      if (bundle.glowMap) this.backdropUniforms.uGlowMap.value = bundle.glowMap;
      this.backdropUniforms.uCityTint.value.copy(this.angleCfg.tint);
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

    this._rebuildHotspots(angleId);
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
      uDolly: { value: 0.0 },
      uAspectRatio: { value: (w / Math.max(1, h)) / this.imageAspect },
      uTime: { value: 0 },
      uPlayerUV: { value: new THREE.Vector2(0.5, 0.25) },
      uPlayerDepth: { value: 0.6 },
      uCityTint: { value: this.angleCfg.tint.clone() },
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

    const count = 88;
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

  _rebuildHotspots(angleId) {
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

    const defs = [];
    if (angleId === 'courtyard') {
      defs.push(
        {
          id: 'market_stall_zone',
          type: 'market',
          label: `Bazar Dəftəri & Ticarət (${this.city?.short_name || 'Bazar'})`,
          pos: new THREE.Vector3(-2.4, 0, 2.0),
          npcPos: new THREE.Vector3(-3.4, 1.5, 2.0),
          radius: 2.5,
          defaultItem: primaryLuxury,
          ringColor: 0xd9ad58,
        },
        {
          id: 'fayton_station',
          type: 'fayton',
          label: 'Fayton Dayanacağı · Şəhərlərarası Səfər',
          pos: new THREE.Vector3(2.2, 0, 2.2),
          npcPos: new THREE.Vector3(3.2, 1.5, 2.2),
          radius: 2.5,
          ringColor: 0x6cb8cf,
        },
        {
          id: 'exit_gate',
          type: 'exit_to_map',
          label: this.citySpec.gateLabel,
          pos: new THREE.Vector3(0.0, 0, -7.8),
          npcPos: new THREE.Vector3(0.0, 1.6, -11.0),
          radius: 2.6,
          ringColor: 0xf4cf76,
        }
      );
    } else if (angleId === 'carpet_gallery') {
      defs.push({
        id: 'market_arcade_zone',
        type: 'market',
        label: `Örtülü Bazar Ticarəti (${this.city?.short_name || 'Bazar'})`,
        pos: new THREE.Vector3(-1.45, 0, 1.6),
        npcPos: new THREE.Vector3(-2.4, 1.5, 1.6),
        radius: 2.7,
        defaultItem: primaryLuxury,
        ringColor: 0xd9ad58,
      });
    } else if (angleId === 'palace_hall') {
      defs.push({
        id: 'palace_throne',
        type: 'palace_audience',
        label: this.citySpec.palaceTitle,
        palaceTitle: this.citySpec.palaceTitle,
        pos: new THREE.Vector3(0.0, 0, -2.6),
        npcPos: new THREE.Vector3(0.0, 1.6, -5.0),
        radius: 3.0,
        ringColor: 0xd96b54,
      });
    }

    // Məkanlararası avtomatik keçid portalları
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
      });
    }

    for (const def of defs) {
      this.interactables.push(def);

      const ringGeo = new THREE.RingGeometry(0.46, 0.495, 44);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.ringColor,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(def.pos.x, 0.022, def.pos.z);
      this.interactGroup.add(ring);

      const innerGeo = new THREE.RingGeometry(0.22, 0.245, 32);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = ringMat.clone();
      innerMat.opacity = 0.14;
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(def.pos.x, 0.026, def.pos.z);
      this.interactGroup.add(inner);

      this.interactRings.push({ id: def.id, outer: ring, inner });
    }

    if (ENABLE_PLACEHOLDER_NPCS) {
      // 3D dostunun özəl .glb NPC modelləri gəldikdə burada qoşulacaq
    }

    this.scene.add(this.interactGroup);
    this.eventBus.emit('bazaar:proximity', null);
  }

  async _buildPlayableMerchant() {
    const animated = await this.modelLoader.loadAnimatedGLB('merchant_hero', 1.0);
    let mesh = null;

    if (animated?.model) {
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

    // 3. Dinamik Günəş Şüası ↔ Kölgə Zonası İşıqlandırması
    if (this.sunLight && this.angleCfg.useDynamicSunZone) {
      const sunBoundaryX = -0.35 - this.player.pos.z * 0.14;
      const sunFactor = Math.max(0, Math.min(1, (sunBoundaryX - this.player.pos.x + 1.4) / 2.8));
      const targetSun = 0.72 + sunFactor * 1.95;
      this.sunLight.intensity += (targetSun - this.sunLight.intensity) * Math.min(1, dt * 5.0);
    }

    // 4. Yaxın interaktiv nöqtə
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
      const pulse = 0.2 + Math.sin(this.elapsed * 2.2) * 0.05;
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

    // 5. Fənər titrəməsi & toz zərrəcikləri
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

    // 6. Güclü 3D İzləyən Kamera (Lateral Pan + Volumetric Forward Dolly + 10-addımlı POM sinxronizasiyası!)
    const [zMin, zMax] = this.angleCfg.zRange;
    const depthProgress = Math.max(0, Math.min(1, (zMax - this.player.pos.z) / Math.max(1, zMax - zMin)));

    const targetParX = this.player.pos.x * 0.0135 + this.mouseNorm.x * 0.011;
    const targetParY = -this.mouseNorm.y * 0.0065 + (depthProgress - 0.3) * 0.006;
    this.smoothParallax.x += (targetParX - this.smoothParallax.x) * Math.min(1, dt * 3.6);
    this.smoothParallax.y += (targetParY - this.smoothParallax.y) * Math.min(1, dt * 3.6);

    const targetDolly = this.dialogueFocus ? 0.55 : depthProgress * 0.82;
    this.smoothDolly += (targetDolly - this.smoothDolly) * Math.min(1, dt * 2.8);

    const targetZoom = this.angleCfg.baseZoom + this.smoothDolly * 0.16;
    this.smoothZoom += (targetZoom - this.smoothZoom) * Math.min(1, dt * 3.0);

    const breatheY = Math.sin(this.elapsed * 0.72) * 0.022;
    this.camera.position.set(
      this.baseCamPos.x + this.smoothParallax.x * 26.0,
      this.baseCamPos.y - this.smoothParallax.y * 9.0 + breatheY,
      this.baseCamPos.z - this.smoothDolly * 2.25
    );
    this.camera.lookAt(
      this.baseLookAt.x + this.smoothParallax.x * 10.5,
      this.baseLookAt.y,
      this.baseLookAt.z
    );

    if (this.backdropUniforms) {
      this.backdropUniforms.uTime.value = this.elapsed;
      this.backdropUniforms.uParallax.value.copy(this.smoothParallax);
      this.backdropUniforms.uZoom.value = this.smoothZoom;
      this.backdropUniforms.uDolly.value = this.smoothDolly;

      const proj = this.player.pos.clone().add(new THREE.Vector3(0, 1.1, 0)).project(this.camera);
      this.backdropUniforms.uPlayerUV.value.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5);
      this.backdropUniforms.uPlayerDepth.value = Math.max(0.15, Math.min(1.0, 1.0 - depthProgress * 0.75));
    }

    this.renderer.render(this.scene, this.camera);
  }

  unmount() {
    this.isMounted = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
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
