import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/Cinematic_Bazaar_25D.js
 * HƏQİQİ 3D PROYEKSİYALI DƏRİNLİK QABIĞI (3D Projected Depth-Shell Mesh) + FƏRDİ MƏKAN HƏRƏKƏT PROFİLLƏRİ:
 * - Artıq 2D düz ekran şəkli deyil: hər məkan 140×84 seqmentli HƏQİQİ 3D DƏRİNLİK TORUNA (Depth-Displaced 3D Shell)
 *   proyeksiyalanır! Döşəmə pikselləri real Y=0 (və ya Qala Bürcündə yüksələn yamac!) müstəvisinə kilidlənir,
 *   yan tağlar/sütunlar önə çıxır, Qız Qalası/dəniz/dağlar arxada dərinlikdə qalır.
 * - Real Three.js PerspectiveCamera 3D məkanda tacirin arxasınca irəliləyir, yanlara dönür və yamaclara qalxır —
 *   tacirin ayaqları daş döşəmədə sürüşmədən bütün memarlıq əsl 3D perspektivdə hərəkət edir!
 * - Bakının hər 6 məkanı fərqli kamera davranışı, fərqli yeriş sürəti/ritmi, fərqli əyri/yamac trayektoriyası,
 *   fərdi sərhəd trapesiyası və qadağan zolaqlarına (`blockedZones`) malikdir (`B` düyməsi ilə canlı görünür!).
 */

const ENABLE_PLACEHOLDER_NPCS = false;

const CITY_CULTURE_STYLES = {
  City_Baku: {
    label: 'Bakı',
    exposure: 1.38,
    glowTint: [1.0, 0.76, 0.34],
    lanternHex: 0xffb347,
    dustHex: 0xffe4a8,
    accentMode: 'baku_sun_fire',
  },
  City_Shamakhi: {
    label: 'Şamaxı',
    exposure: 1.36,
    glowTint: [0.42, 0.92, 0.95],
    lanternHex: 0x4fd2d6,
    dustHex: 0xaef0f2,
    accentMode: 'shamakhi_turquoise',
  },
  City_Sheki: {
    label: 'Şəki',
    exposure: 1.36,
    glowTint: [0.98, 0.84, 0.42],
    lanternHex: 0xffc858,
    dustHex: 0xe6f8c8,
    accentMode: 'sheki_shebeke',
  },
  City_Ganja: {
    label: 'Gəncə',
    exposure: 1.34,
    glowTint: [1.0, 0.62, 0.3],
    lanternHex: 0xff9442,
    dustHex: 0xffcfa0,
    accentMode: 'ganja_copper',
  },
  City_Shusha: {
    label: 'Şuşa',
    exposure: 1.34,
    glowTint: [0.98, 0.66, 0.48],
    lanternHex: 0xf4a862,
    dustHex: 0xdce0f5,
    accentMode: 'shusha_mist',
  },
  City_Lankaran: {
    label: 'Lənkəran',
    exposure: 1.36,
    glowTint: [1.0, 0.72, 0.36],
    lanternHex: 0xffa846,
    dustHex: 0xffe09c,
    accentMode: 'lankaran_orchard',
  },
  Mission_Bridge_North: {
    label: 'Şimal Quldur Körpüsü',
    exposure: 1.24,
    glowTint: [1.0, 0.56, 0.24],
    lanternHex: 0xff8c36,
    dustHex: 0xffc488,
    accentMode: 'shusha_mist',
  },
  Mission_Bridge_South: {
    label: 'Cənub Qaçaq Körpüsü',
    exposure: 1.22,
    glowTint: [1.0, 0.62, 0.28],
    lanternHex: 0xff9a3c,
    dustHex: 0xd0dced,
    accentMode: 'shamakhi_turquoise',
  },
  Mission_Field_North: {
    label: 'Şimal Dağ Tarlası',
    exposure: 1.36,
    glowTint: [1.0, 0.82, 0.42],
    lanternHex: 0xffc458,
    dustHex: 0xf6f0c0,
    accentMode: 'sheki_shebeke',
  },
  Mission_Field_South: {
    label: 'Cənub Nar Zəmiləri',
    exposure: 1.36,
    glowTint: [1.0, 0.72, 0.34],
    lanternHex: 0xffaa44,
    dustHex: 0xffe2a2,
    accentMode: 'lankaran_orchard',
  },
};

/**
 * Hər məkan şablonunun öz fərdi 3D kamera proyeksiya dərinliyi, fərdi xarakter hərəkət sürəti/ritmi,
 * yamac hündürlüyü (`slopeRise`), əyri oxu (`curveX`), hərəkət sərhədi və qadağan zolaqları!
 */
const ROOM_TEMPLATES = {
  // 1. BAKI — İÇƏRİŞƏHƏR HƏYƏTİ: Geniş meydan izləmə + günəş/kölgə keçidi
  baku_courtyard: {
    baseImage: './images/bazaar_baku_25d',
    camPos: [0, 1.84, 13.4],
    lookAt: [0, 3.32, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.8, farDist: 44.0, maxGroundDist: 28.0 },
    movement: {
      profileName: 'Geniş Meydan İzləmə',
      speed: 4.55,
      animScale: 1.12,
      followX: 0.44,
      followZ: 0.36,
      followY: 0.14,
      lookX: 0.24,
      lookUpOnApproach: 0.45,
      camRollAmp: 0.0,
      slopeRise: 0.0,
      curveX: 0.0,
    },
    zRange: [-7.6, 6.2],
    xBounds: [-3.35, 2.7, 0.85, 0.55],
    blockedZones: [
      { x: 2.75, z: 3.4, rx: 1.15, rz: 2.2, label: 'Meyvə & Nar Səbətləri' },
      { x: -3.6, z: 2.8, rx: 0.78, rz: 2.8, label: 'Sol Tağ Sütunları' },
    ],
    sunColor: 0xffe4b0,
    sunPos: [14, 17, 7],
    sunBaseIntensity: 2.65,
    ambientSky: 0xfff0cf,
    ambientGround: 0x4a3420,
    ambientIntensity: 1.15,
    fogColor: 0x6b5134,
    fogDensity: 0.009,
    exposureMul: 1.06,
    useDynamicSunZone: true,
    isInterior: false,
    lanterns: [
      { pos: [-4.4, 2.6, 1.4], uv: [0.12, 0.56], color: 0xffb34e, intensity: 2.8 },
      { pos: [4.2, 2.5, 1.8], uv: [0.89, 0.56], color: 0xffb656, intensity: 2.7 },
    ],
  },

  // 2. BAKI — BUXARA ÖRTÜLÜ XALÇA BAZARI: Dar tağlı dəhlizdə dərin 3D Tunel Dolly irəliləyişi!
  covered_arcade: {
    baseImage: './images/bazaar_baku_carpet_25d',
    camPos: [0, 1.56, 12.2],
    lookAt: [0, 4.68, -12.0],
    liveFov: 37,
    refFov: 48,
    depthShell: { nearDist: 5.8, farDist: 38.0, maxGroundDist: 26.0 },
    movement: {
      profileName: 'Tağlı Dəhliz Tunel-Dolly',
      speed: 3.45,
      animScale: 0.94,
      followX: 0.24,
      followZ: 0.58, // Dərin 3D tunel boyunca irəli sürüşən kamera!
      followY: 0.1,
      lookX: 0.15,
      lookUpOnApproach: -0.2,
      camRollAmp: 0.0,
      slopeRise: 0.0,
      curveX: 0.0,
    },
    zRange: [-6.6, 5.4],
    xBounds: [-1.72, 1.72, 0.62, 0.62],
    blockedZones: [
      { x: -2.15, z: 3.0, rx: 0.95, rz: 2.35, label: 'Sol Xalça Piştaxtası' },
      { x: 2.15, z: 3.0, rx: 0.95, rz: 2.35, label: 'Sağ Mis & Ədviyyat Masası' },
    ],
    sunColor: 0xffd692,
    sunPos: [5.5, 14.0, 2.0],
    sunBaseIntensity: 2.35,
    ambientSky: 0xebd0a2,
    ambientGround: 0x382414,
    ambientIntensity: 1.1,
    fogColor: 0x453220,
    fogDensity: 0.014,
    exposureMul: 1.04,
    useDynamicSunZone: false,
    isInterior: true,
    lanterns: [
      { pos: [-3.2, 2.8, 1.8], uv: [0.22, 0.72], color: 0xffaa44, intensity: 3.4 },
      { pos: [3.2, 2.8, -0.8], uv: [0.78, 0.72], color: 0xffb24c, intensity: 3.3 },
    ],
  },

  // 3. BAKI — ŞİRVANŞAHLAR DİVANXANASI: Ağırbaşlı saray yürüşü + taxta baxan əzəmətli kamera yüksəlişi!
  divan_palace: {
    baseImage: './images/bazaar_baku_palace_25d',
    camPos: [0, 1.72, 13.0],
    lookAt: [0, 3.8, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.4, farDist: 40.0, maxGroundDist: 24.0 },
    movement: {
      profileName: 'Təntənəli Saray Yürüşü',
      speed: 2.9, // Qırmızı xalça üstündə ağırbaşlı, sakit mərasim addımı!
      animScale: 0.82,
      followX: 0.28,
      followZ: 0.34,
      followY: 0.16,
      lookX: 0.18,
      lookUpOnApproach: 0.95, // Taxta yaxınlaşdıqca kamera yuxarı — günbəzə və taxta doğru açılır!
      camRollAmp: 0.0,
      slopeRise: 0.0,
      curveX: 0.0,
    },
    zRange: [-3.8, 5.8],
    xBounds: [-2.65, 2.65, 0.45, 0.45],
    blockedZones: [
      { x: 0.0, z: -4.9, rx: 2.25, rz: 1.35, label: 'Şirvanşah Taxt Kürsüsü' },
      { x: -3.05, z: 1.2, rx: 0.78, rz: 2.1, label: 'Sol Saray Şamdanları' },
      { x: 3.05, z: 1.2, rx: 0.78, rz: 2.1, label: 'Sağ Saray Şamdanları' },
    ],
    sunColor: 0xffdc9a,
    sunPos: [3.0, 16.0, 1.0],
    sunBaseIntensity: 2.25,
    ambientSky: 0xcfa878,
    ambientGround: 0x332418,
    ambientIntensity: 1.06,
    fogColor: 0x3d2e20,
    fogDensity: 0.013,
    exposureMul: 1.06,
    useDynamicSunZone: false,
    isInterior: true,
    lanterns: [
      { pos: [-4.2, 2.2, 2.0], uv: [0.15, 0.48], color: 0xffae4a, intensity: 3.2 },
      { pos: [4.2, 2.2, 2.0], uv: [0.85, 0.48], color: 0xffae4a, intensity: 3.2 },
    ],
  },

  // 4. BAKI — XƏZƏR LİMANI: Asimmetrik sola çəkilmiş sahil körpüsü + dəniz kənarı qadağan zolağı + yüngül dəniz dalğası!
  caspian_harbor: {
    baseImage: './images/room_baku_harbor_25d',
    camPos: [0, 1.62, 12.6],
    lookAt: [0, 4.3, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.0, farDist: 46.0, maxGroundDist: 28.0 },
    movement: {
      profileName: 'Asimmetrik Liman Körpüsü',
      speed: 3.95,
      animScale: 1.04,
      followX: 0.34,
      followZ: 0.52,
      followY: 0.12,
      lookX: 0.22,
      lookUpOnApproach: 0.2,
      camRollAmp: 0.0085, // Dəniz sahilində zərif külək/gəmi nəfəsi effekti!
      slopeRise: 0.0,
      curveX: -0.35, // Körpü perspektivdə uzaq dəniz qapısına doğru yüngül sola meyillənir!
    },
    zRange: [-7.2, 5.6],
    xBounds: [-1.85, 0.72, 0.45, 0.25],
    blockedZones: [
      { x: -2.25, z: 3.6, rx: 1.05, rz: 2.35, label: 'Liman Sandıqları & Neft Tuluqları' },
      { x: 1.7, z: 0.0, rx: 1.05, rz: 8.5, label: 'Xəzər Dənizi Suyu (Keçilməz)' },
    ],
    sunColor: 0xffcc84,
    sunPos: [10, 12, -8],
    sunBaseIntensity: 2.3,
    ambientSky: 0xc9b29a,
    ambientGround: 0x2a343b,
    ambientIntensity: 1.05,
    fogColor: 0x3f434a,
    fogDensity: 0.014,
    exposureMul: 1.06,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-3.2, 1.9, 3.2], uv: [0.1, 0.44], color: 0xffa842, intensity: 3.5 },
      { pos: [-2.4, 2.0, -1.2], uv: [0.28, 0.48], color: 0xffb24c, intensity: 3.1 },
    ],
  },

  // 5. BAKI — QIZ QALASI BÜRCLƏRİ: REAL 3D YAMACA QALXAN ƏYRİ QALA YOLU (Y hündürlüyü artır!)
  fortress_rampart: {
    baseImage: './images/room_fortress_rampart_25d',
    camPos: [0, 1.62, 12.6],
    lookAt: [0, 4.35, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 5.8, farDist: 48.0, maxGroundDist: 26.0 },
    movement: {
      profileName: 'Yüksələn Əyri Qala Yolu',
      speed: 3.6,
      animScale: 0.98,
      followX: 0.34,
      followZ: 0.5,
      followY: 0.72, // Tacir qala yamacına qalxdıqca kamera da onunla real 3D yüksəlir!
      lookX: 0.25,
      lookUpOnApproach: 0.55,
      camRollAmp: 0.0,
      slopeRise: 1.05, // Arxa bürcə doğru 1.05m real 3D yüksəliş!
      curveX: 0.45, // Qala divarı uzaqda sağa doğru qıvrılır!
    },
    zRange: [-8.2, 5.6],
    xBounds: [-2.15, 0.68, 0.65, 0.35],
    blockedZones: [
      { x: 1.72, z: 0.0, rx: 0.95, rz: 9.2, label: 'Uçurum Məhəccəri (Keçilməz)' },
      { x: -2.85, z: 1.0, rx: 0.72, rz: 8.5, label: 'Məşəlli Qala Divarı' },
    ],
    sunColor: 0xffc888,
    sunPos: [12, 13, -6],
    sunBaseIntensity: 2.25,
    ambientSky: 0xb6a8c4,
    ambientGround: 0x332d2b,
    ambientIntensity: 1.04,
    fogColor: 0x4a404c,
    fogDensity: 0.015,
    exposureMul: 1.05,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-3.0, 2.4, 2.6], uv: [0.15, 0.56], color: 0xff9838, intensity: 3.6 },
      { pos: [-2.2, 2.4, -1.6], uv: [0.31, 0.55], color: 0xffa242, intensity: 3.2 },
    ],
  },

  // 6. BAKI — ATƏŞGAH & NEFT-DUZ YOLU: Geniş 3D Orbital Dönüşlü Abidə Meydanı (sürətli açıq yol!)
  mausoleum_square: {
    baseImage: './images/bazaar_nakhchivan_25d',
    camPos: [0, 1.74, 13.0],
    lookAt: [0, 3.85, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.4, farDist: 44.0, maxGroundDist: 26.0 },
    movement: {
      profileName: 'Geniş Orbital Abidə Baxışı',
      speed: 4.85, // Açıq karvan meydanında çevik sürət!
      animScale: 1.2,
      followX: 0.55, // Sola-sağa gəzdikcə abidə arxadakı dağlara qarşı güclü 3D fırlanır!
      followZ: 0.42,
      followY: 0.14,
      lookX: 0.3,
      lookUpOnApproach: 0.35,
      camRollAmp: 0.0,
      slopeRise: 0.0,
      curveX: 0.0,
    },
    zRange: [-6.0, 6.0],
    xBounds: [-2.9, 2.9, 0.72, 0.72],
    blockedZones: [
      { x: 0.0, z: -7.0, rx: 1.85, rz: 1.45, label: 'Mərkəzi Abidə Bünövrəsi' },
      { x: -3.05, z: 4.0, rx: 1.12, rz: 1.85, label: 'Sol Duz & Neft Kisələri' },
      { x: 3.05, z: 4.1, rx: 1.08, rz: 1.65, label: 'Sağ Zəfəran Qabları' },
    ],
    sunColor: 0xffb874,
    sunPos: [-10, 13, -4],
    sunBaseIntensity: 2.35,
    ambientSky: 0xf0ba90,
    ambientGround: 0x422618,
    ambientIntensity: 1.06,
    fogColor: 0x543624,
    fogDensity: 0.013,
    exposureMul: 1.04,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.0, 2.5, 1.5], uv: [0.18, 0.52], color: 0xffac44, intensity: 3.2 },
      { pos: [4.0, 2.5, 1.5], uv: [0.83, 0.52], color: 0xffac44, intensity: 3.2 },
    ],
  },

  // DİGƏR ŞƏHƏR MEYDANLARI (Eyni real 3D Depth-Shell mühərriki + fərdi hərəkət zolaqları ilə!)
  shamakhi_courtyard: {
    baseImage: './images/bazaar_shamakhi_25d',
    camPos: [0, 1.72, 13.0],
    lookAt: [0, 3.85, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.5, farDist: 44.0, maxGroundDist: 27.0 },
    movement: { profileName: 'Şirvan Meydan İzləmə', speed: 4.4, animScale: 1.1, followX: 0.44, followZ: 0.38, followY: 0.14, lookX: 0.24, lookUpOnApproach: 0.35, camRollAmp: 0, slopeRise: 0, curveX: 0 },
    zRange: [-7.6, 6.2],
    xBounds: [-3.2, 3.2, 0.8, 0.8],
    blockedZones: [
      { x: -3.25, z: 2.4, rx: 1.0, rz: 2.4, label: 'Sol Ədviyyat Kisələri' },
      { x: 3.35, z: 2.6, rx: 0.95, rz: 2.2, label: 'Sağ Sandıqlar' },
    ],
    sunColor: 0xd0e4f8,
    sunPos: [8, 16, 4],
    sunBaseIntensity: 2.15,
    ambientSky: 0x9ec0de,
    ambientGround: 0x332b24,
    ambientIntensity: 1.05,
    fogColor: 0x384659,
    fogDensity: 0.013,
    exposureMul: 1.04,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.2, 2.5, 1.6], uv: [0.13, 0.52], color: 0xffb24c, intensity: 3.2 },
      { pos: [4.2, 2.5, 1.6], uv: [0.88, 0.52], color: 0x52d4d8, intensity: 3.1 },
    ],
  },
  sheki_courtyard: {
    baseImage: './images/bazaar_sheki_25d',
    camPos: [0, 1.84, 13.4],
    lookAt: [0, 3.25, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.6, farDist: 44.0, maxGroundDist: 28.0 },
    movement: { profileName: 'Bulaqlı Həyət İzləmə', speed: 4.3, animScale: 1.08, followX: 0.42, followZ: 0.38, followY: 0.14, lookX: 0.22, lookUpOnApproach: 0.3, camRollAmp: 0, slopeRise: 0, curveX: 0 },
    zRange: [-7.8, 6.4],
    xBounds: [-3.1, 2.9, 0.85, 0.75],
    blockedZones: [
      { x: 2.1, z: 1.45, rx: 1.45, rz: 1.35, label: 'Səkkizguşəli Daş Bulaq' },
      { x: -3.05, z: 5.1, rx: 1.25, rz: 1.45, label: 'Halva Piştaxtası' },
    ],
    sunColor: 0xffe8b0,
    sunPos: [10, 17, 5],
    sunBaseIntensity: 2.5,
    ambientSky: 0xe6f5de,
    ambientGround: 0x3d3020,
    ambientIntensity: 1.12,
    fogColor: 0x4f4e3c,
    fogDensity: 0.01,
    exposureMul: 1.02,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.3, 2.5, 1.5], uv: [0.14, 0.55], color: 0xffb04a, intensity: 2.8 },
      { pos: [4.3, 2.5, 1.5], uv: [0.88, 0.55], color: 0xffb04a, intensity: 2.8 },
    ],
  },
  ganja_courtyard: {
    baseImage: './images/bazaar_ganja_25d',
    camPos: [0, 1.74, 13.0],
    lookAt: [0, 3.85, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.5, farDist: 44.0, maxGroundDist: 27.0 },
    movement: { profileName: 'Çinarlı Xiyaban Dolly', speed: 4.45, animScale: 1.1, followX: 0.4, followZ: 0.45, followY: 0.14, lookX: 0.22, lookUpOnApproach: 0.35, camRollAmp: 0, slopeRise: 0, curveX: 0 },
    zRange: [-7.8, 6.2],
    xBounds: [-2.8, 2.8, 0.8, 0.8],
    blockedZones: [
      { x: -2.65, z: -0.6, rx: 0.85, rz: 0.95, label: 'Sol Çinar Ağacı' },
      { x: 2.65, z: -0.6, rx: 0.85, rz: 0.95, label: 'Sağ Çinar Ağacı' },
    ],
    sunColor: 0xffd596,
    sunPos: [-11, 15, 6],
    sunBaseIntensity: 2.4,
    ambientSky: 0xf7dbb8,
    ambientGround: 0x442a1a,
    ambientIntensity: 1.08,
    fogColor: 0x543825,
    fogDensity: 0.012,
    exposureMul: 1.02,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.2, 2.6, 1.6], uv: [0.09, 0.58], color: 0xffa844, intensity: 3.0 },
      { pos: [4.2, 2.6, 1.6], uv: [0.92, 0.58], color: 0xffa844, intensity: 3.0 },
    ],
  },
  shusha_courtyard: {
    baseImage: './images/bazaar_shusha_25d',
    camPos: [0, 1.6, 12.4],
    lookAt: [0, 4.45, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.2, farDist: 46.0, maxGroundDist: 26.0 },
    movement: { profileName: 'Qala Meydanı Yürüşü', speed: 4.15, animScale: 1.05, followX: 0.4, followZ: 0.44, followY: 0.14, lookX: 0.22, lookUpOnApproach: 0.4, camRollAmp: 0, slopeRise: 0, curveX: 0 },
    zRange: [-7.4, 6.0],
    xBounds: [-2.85, 2.7, 0.85, 0.85],
    blockedZones: [
      { x: 2.95, z: 3.2, rx: 1.05, rz: 2.1, label: 'Sağ Misgərlik Piştaxtası' },
      { x: -3.2, z: 3.4, rx: 0.9, rz: 2.4, label: 'Sol Xalça Məhəccəri' },
    ],
    sunColor: 0xfad8ae,
    sunPos: [8, 15, 4],
    sunBaseIntensity: 2.25,
    ambientSky: 0xd8d0e8,
    ambientGround: 0x362b26,
    ambientIntensity: 1.08,
    fogColor: 0x4c4654,
    fogDensity: 0.015,
    exposureMul: 1.04,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.2, 2.5, 1.6], uv: [0.11, 0.56], color: 0xffad4a, intensity: 3.2 },
      { pos: [4.2, 2.5, 1.6], uv: [0.91, 0.56], color: 0xffad4a, intensity: 3.2 },
    ],
  },
  lankaran_courtyard: {
    baseImage: './images/bazaar_lankaran_25d',
    camPos: [0, 1.68, 12.8],
    lookAt: [0, 4.05, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.3, farDist: 44.0, maxGroundDist: 26.0 },
    movement: { profileName: 'Bağlı Qala Yürüşü', speed: 4.2, animScale: 1.06, followX: 0.4, followZ: 0.42, followY: 0.14, lookX: 0.22, lookUpOnApproach: 0.35, camRollAmp: 0, slopeRise: 0, curveX: 0 },
    zRange: [-7.4, 6.0],
    xBounds: [-2.7, 2.7, 0.8, 0.8],
    blockedZones: [
      { x: -2.85, z: 3.8, rx: 1.15, rz: 2.0, label: 'Sol Nar Səbətləri' },
      { x: 2.95, z: 3.8, rx: 1.1, rz: 1.9, label: 'Sağ Samovarlar' },
    ],
    sunColor: 0xffd088,
    sunPos: [6, 15, 2],
    sunBaseIntensity: 2.35,
    ambientSky: 0xe8d4b2,
    ambientGround: 0x3d291a,
    ambientIntensity: 1.08,
    fogColor: 0x4c3926,
    fogDensity: 0.013,
    exposureMul: 1.03,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.0, 2.6, 1.5], uv: [0.24, 0.58], color: 0xffac44, intensity: 3.1 },
      { pos: [4.0, 2.6, 1.5], uv: [0.78, 0.58], color: 0xffac44, intensity: 3.1 },
    ],
  },
  mountain_pass_bazaar: {
    baseImage: './images/bazaar_quba_25d',
    camPos: [0, 1.66, 12.6],
    lookAt: [0, 4.15, -12.0],
    liveFov: 38,
    refFov: 48,
    depthShell: { nearDist: 6.4, farDist: 48.0, maxGroundDist: 27.0 },
    movement: { profileName: 'Dağ Aşırımı Bazarı', speed: 4.35, animScale: 1.08, followX: 0.42, followZ: 0.4, followY: 0.14, lookX: 0.24, lookUpOnApproach: 0.4, camRollAmp: 0, slopeRise: 0, curveX: 0 },
    zRange: [-7.4, 6.0],
    xBounds: [-2.85, 2.85, 0.75, 0.75],
    blockedZones: [
      { x: -3.15, z: 3.5, rx: 1.05, rz: 2.3, label: 'Sol Alma Səbətləri' },
      { x: 3.15, z: 3.5, rx: 1.05, rz: 2.3, label: 'Sağ Yun və Alma Səbətləri' },
    ],
    sunColor: 0xffe6b6,
    sunPos: [-12, 16, 6],
    sunBaseIntensity: 2.45,
    ambientSky: 0xe4eff8,
    ambientGround: 0x3c3024,
    ambientIntensity: 1.1,
    fogColor: 0x54524d,
    fogDensity: 0.011,
    exposureMul: 1.0,
    useDynamicSunZone: false,
    isInterior: false,
    lanterns: [
      { pos: [-4.2, 2.6, 1.6], uv: [0.09, 0.58], color: 0xffae4a, intensity: 3.0 },
      { pos: [4.2, 2.6, 1.6], uv: [0.92, 0.58], color: 0xffae4a, intensity: 3.0 },
    ],
  },
};

const LOCATION_ROOMS = {
  City_Baku: {
    isMission: false,
    palaceTitle: 'Şirvanşahlar Divanxanası Qəbulu',
    gateLabel: 'Qoşa Qala Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'İçərişəhər', title: 'Multani Karvansarayı Həyəti', template: 'baku_courtyard', tint: [1.05, 1.02, 0.96], role: 'courtyard' },
      { id: 'bukhara_market', shortTitle: 'Buxara', title: 'Buxara Örtülü Xalça Bazarı', template: 'covered_arcade', tint: [1.06, 1.02, 0.94], role: 'market' },
      { id: 'palace_hall', shortTitle: 'Şirvanşahlar', title: 'Şirvanşahlar Divanxanası', template: 'divan_palace', tint: [1.05, 1.01, 0.94], role: 'palace' },
      { id: 'caspian_port', shortTitle: 'Xəzər Limanı', title: 'Bakı Dəniz Limanı & Fənər', template: 'caspian_harbor', tint: [1.04, 1.02, 0.97], role: 'explore' },
      { id: 'maiden_tower', shortTitle: 'Qız Qalası', title: 'Qız Qalası Müdafiə Bürcləri', template: 'fortress_rampart', tint: [1.06, 1.01, 0.94], role: 'explore' },
      { id: 'ateshgah_road', shortTitle: 'Atəşgah Yolu', title: 'Abşeron Neft & Duz Yolu', template: 'mausoleum_square', tint: [1.05, 0.98, 0.92], role: 'explore' },
    ],
  },
  City_Shamakhi: {
    isMission: false,
    palaceTitle: 'Şamaxı Şirvanşah Divanı Qəbulu',
    gateLabel: 'Şirvan Karvan Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Şirvan Həyəti', title: 'Firuzəyi Günbəzli Karvansaray', template: 'shamakhi_courtyard', tint: [1.0, 1.02, 1.04], role: 'courtyard' },
      { id: 'juma_bazaar', shortTitle: 'Cümə Bazarı', title: 'Şamaxı İpək & Venesiya Rəstəsi', template: 'covered_arcade', tint: [0.91, 1.04, 1.1], role: 'market' },
      { id: 'palace_hall', shortTitle: 'Şirvan Divanı', title: 'Şamaxı Hökmdar Divanxanası', template: 'divan_palace', tint: [0.91, 1.03, 1.1], role: 'palace' },
      { id: 'yeddi_gunbez', shortTitle: 'Yeddi Günbəz', title: 'Yeddi Günbəz Türbə Meydanı', template: 'mausoleum_square', tint: [0.96, 1.01, 1.05], role: 'explore' },
      { id: 'gulustan_fort', shortTitle: 'Gülüstan Qalası', title: 'Gülüstan Qalası Bürcləri', template: 'fortress_rampart', tint: [0.94, 1.01, 1.08], role: 'explore' },
    ],
  },
  City_Sheki: {
    isMission: false,
    palaceTitle: 'Şəki Xan Sarayı Qəbulu',
    gateLabel: 'Karvansaray Darvazası · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Yuxarı Karvansaray', title: 'Şəki Yuxarı Karvansarayı', template: 'sheki_courtyard', tint: [1.0, 1.03, 0.99], role: 'courtyard' },
      { id: 'silk_row', shortTitle: 'İpək Rəstəsi', title: 'Şəki İpək & Halva Çarşısı', template: 'covered_arcade', tint: [0.95, 1.07, 0.98], role: 'market' },
      { id: 'palace_hall', shortTitle: 'Xan Sarayı', title: 'Şəki Xan Sarayı · Şəbəkə Zalı', template: 'divan_palace', tint: [0.95, 1.07, 1.0], role: 'palace' },
      { id: 'kish_pass', shortTitle: 'Kiş Aşırımı', title: 'Kiş Kəndi & Dağ Bazarı', template: 'mountain_pass_bazaar', tint: [1.0, 1.02, 0.99], role: 'explore' },
      { id: 'gelersen_fort', shortTitle: 'Gələrsən-Görərsən', title: 'Gələrsən-Görərsən Qalası', template: 'fortress_rampart', tint: [0.94, 1.04, 0.99], role: 'explore' },
    ],
  },
  City_Ganja: {
    isMission: false,
    palaceTitle: 'Cavad Xan Divanı Qəbulu',
    gateLabel: 'Gəncə Qala Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Şah Abbas', title: 'Gəncə Şah Abbas Karvansarayı', template: 'ganja_courtyard', tint: [1.03, 0.99, 0.96], role: 'courtyard' },
      { id: 'chokek_market', shortTitle: 'Çökək Rəstə', title: 'Gəncə Misgər & Saxsı Çarşısı', template: 'covered_arcade', tint: [1.1, 0.94, 0.87], role: 'market' },
      { id: 'palace_hall', shortTitle: 'Cavad Xan', title: 'Gəncə Xanlığı Divanxanası', template: 'divan_palace', tint: [1.09, 0.95, 0.88], role: 'palace' },
      { id: 'nizami_square', shortTitle: 'Nizami Məqbərəsi', title: 'Nizami Gəncəvi Türbə Meydanı', template: 'mausoleum_square', tint: [1.05, 0.98, 0.93], role: 'explore' },
      { id: 'ganja_walls', shortTitle: 'Gəncə Qalası', title: 'Qədim Gəncə Qala Divarları', template: 'fortress_rampart', tint: [1.08, 0.95, 0.88], role: 'explore' },
    ],
  },
  City_Shusha: {
    isMission: false,
    palaceTitle: 'Pənahəli Xan Sarayı Qəbulu',
    gateLabel: 'Gəncə Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Şuşa Qalası', title: 'Yuxarı Gövhər Ağa Meydanı', template: 'shusha_courtyard', tint: [0.98, 0.99, 1.04], role: 'courtyard' },
      { id: 'rasta_bazaar', shortTitle: 'Rasta Bazar', title: 'Şuşa Rasta Xalça Bazarı', template: 'covered_arcade', tint: [0.95, 0.95, 1.09], role: 'market' },
      { id: 'palace_hall', shortTitle: 'Pənahəli Xan', title: 'Qarabağ Xanı Divanxanası', template: 'divan_palace', tint: [0.95, 0.94, 1.09], role: 'palace' },
      { id: 'cidir_duzu', shortTitle: 'Cıdır Düzü', title: 'Cıdır Düzü Qala Bürcləri', template: 'fortress_rampart', tint: [0.97, 0.98, 1.06], role: 'explore' },
      { id: 'isa_bulagi', shortTitle: 'İsa Bulağı', title: 'İsa Bulağı Dağ Yaylaq Bazarı', template: 'mountain_pass_bazaar', tint: [0.96, 0.98, 1.05], role: 'explore' },
    ],
  },
  City_Lankaran: {
    isMission: false,
    palaceTitle: 'Mirəhməd Xan Divan Qəbulu',
    gateLabel: 'Cənub Karvan Qapısı · Qədim Xəritəyə Çıx',
    rooms: [
      { id: 'courtyard', shortTitle: 'Dairəvi Qala', title: 'Lənkəran Dairəvi Qala Meydanı', template: 'lankaran_courtyard', tint: [1.03, 1.01, 0.95], role: 'courtyard' },
      { id: 'lankaran_caravanserai', shortTitle: 'Lənkəran Karvansarayı', title: 'Talış Ədviyyat & Çay Karvansarayı', template: 'covered_arcade', tint: [1.06, 1.03, 0.88], role: 'market' },
      { id: 'palace_hall', shortTitle: 'Mirəhməd Xan', title: 'Talış Xanlığı Divan Zalı', template: 'divan_palace', tint: [1.05, 1.02, 0.89], role: 'palace' },
      { id: 'south_port', shortTitle: 'Sahil Limanı', title: 'Lənkəran Xəzər Sahil Limanı', template: 'caspian_harbor', tint: [0.96, 1.04, 0.96], role: 'explore' },
      { id: 'hirkan_fort', shortTitle: 'Hirkan Qalası', title: 'Hirkan Dağ Sərhəd Qalası', template: 'fortress_rampart', tint: [1.0, 1.03, 0.93], role: 'explore' },
    ],
  },
  Mission_Bridge_North: {
    isMission: true,
    missionPrompt: 'Şimal Körpüsü Quldurları ilə Üzləş',
    gateLabel: 'Körpüdən Qədim Xəritəyə Qayıt',
    rooms: [
      { id: 'courtyard', shortTitle: 'Körpü Keçidi', title: 'Şimal Daş Körpüsü · Quldur Pusqusu', template: 'fortress_rampart', tint: [1.02, 0.94, 0.92], role: 'mission' },
      { id: 'bandit_camp', shortTitle: 'Quldur Düşərgəsi', title: 'Körpü Altı Gizli Düşərgə', template: 'covered_arcade', tint: [0.96, 0.9, 0.88], role: 'mission' },
    ],
  },
  Mission_Bridge_South: {
    isMission: true,
    missionPrompt: 'Cənub Körpüsü Qaçaqçıları ilə Danış',
    gateLabel: 'Cənub Körpüsündən Xəritəyə Qayıt',
    rooms: [
      { id: 'courtyard', shortTitle: 'Cənub Körpüsü', title: 'Cənub Daş Körpüsü · Gecə Rüsumu', template: 'caspian_harbor', tint: [0.94, 0.98, 1.04], role: 'mission' },
      { id: 'smuggler_vault', shortTitle: 'Qaçaq Anbarı', title: 'Sahil Gizli Anbarı', template: 'covered_arcade', tint: [0.92, 0.98, 1.04], role: 'mission' },
    ],
  },
  Mission_Field_North: {
    isMission: true,
    missionPrompt: 'Dağ Bağbanı ilə Məhsul Missiyası',
    gateLabel: 'Tarladan Qədim Xəritəyə Qayıt',
    rooms: [
      { id: 'courtyard', shortTitle: 'Alma Yamacı', title: 'Şimal Dağ Yamacı & Meyvə Bağı', template: 'mountain_pass_bazaar', tint: [1.0, 1.04, 0.96], role: 'mission' },
      { id: 'farmer_yard', shortTitle: 'Bağban Həyəti', title: 'Dağ Kəndi Karvan Dayanacağı', template: 'sheki_courtyard', tint: [1.0, 1.03, 0.96], role: 'mission' },
    ],
  },
  Mission_Field_South: {
    isMission: true,
    missionPrompt: 'Nar Zəmiləri Sahibi ilə Görüş',
    gateLabel: 'Zəmilərdən Qədim Xəritəyə Qayıt',
    rooms: [
      { id: 'courtyard', shortTitle: 'Nar Zəmiləri', title: 'Cənub Nar & Zəfəran Bağları', template: 'lankaran_courtyard', tint: [1.04, 1.0, 0.93], role: 'mission' },
      { id: 'valley_road', shortTitle: 'Kənd Karvan Yolu', title: 'Düzənlik Məhsul Toplanışı', template: 'mausoleum_square', tint: [1.03, 1.0, 0.94], role: 'mission' },
    ],
  },
};

function buildLocationAngleMap(locationId) {
  const aliases = { City_Quba: 'City_Shamakhi', City_Nakhchivan: 'City_Lankaran' };
  const resolvedId = aliases[locationId] || locationId;
  const spec = LOCATION_ROOMS[resolvedId] || LOCATION_ROOMS.City_Baku;
  const culture = CITY_CULTURE_STYLES[resolvedId] || CITY_CULTURE_STYLES.City_Baku;

  const angleMap = {};
  const roomList = [];

  spec.rooms.forEach((rm, idx) => {
    const tpl = ROOM_TEMPLATES[rm.template] || ROOM_TEMPLATES.baku_courtyard;
    const [xMin0, xMax0, xMinBack, xMaxBack] = tpl.xBounds;
    const [zMin, zMax] = tpl.zRange;
    const zSpan = Math.max(1, zMax - zMin);
    const mv = tpl.movement;

    const getDepthT = (z) => Math.max(0, Math.min(1, (zMax - z) / zSpan));
    const getFloorY = (z) => getDepthT(z) * (mv.slopeRise || 0);
    const getCurveOffsetX = (z) => {
      const t = getDepthT(z);
      return t * t * (mv.curveX || 0);
    };

    const nextRoom = spec.rooms[(idx + 1) % spec.rooms.length];
    let portals = [];
    if (rm.id === 'courtyard') {
      if (spec.rooms.length >= 2) {
        portals.push({
          id: 'portal_to_r1',
          label: `${spec.rooms[1].title} · Keçid`,
          targetAngle: spec.rooms[1].id,
          pos: [xMin0 + 0.35, 0, -1.8],
          triggerRadius: 1.25,
          ringColor: 0xe6be68,
        });
      }
      if (spec.rooms.length >= 3) {
        portals.push({
          id: 'portal_to_r2',
          label: `${spec.rooms[2].title} · Keçid`,
          targetAngle: spec.rooms[2].id,
          pos: [xMin0 + 0.9, 0, -5.2],
          triggerRadius: 1.3,
          ringColor: 0xd46a54,
        });
      }
      if (spec.rooms.length >= 4) {
        portals.push({
          id: 'portal_to_r3',
          label: `${spec.rooms[3].title} · Keçid`,
          targetAngle: spec.rooms[3].id,
          pos: [xMax0 - 0.35, 0, -2.0],
          triggerRadius: 1.25,
          ringColor: 0x6cb8cf,
        });
      }
    } else {
      const backCurve = getCurveOffsetX(zMin + 0.55);
      // Yan-otaqlarda yalnız uzaq çıxış qapısından həyətə qayıdış portalı saxla ki, düz yeriyəndə təsadüfən otaq dəyişməsin!
      portals = [
        {
          id: 'portal_return_courtyard',
          label: `${spec.rooms[0].title} · Qayıt`,
          targetAngle: 'courtyard',
          pos: [backCurve, 0, zMin + 0.55],
          triggerRadius: 1.25,
          ringColor: 0xf4cf76,
        },
      ];
    }

    angleMap[rm.id] = {
      id: rm.id,
      shortTitle: rm.shortTitle,
      title: rm.title,
      role: rm.role,
      baseImage: tpl.baseImage,
      camPos: tpl.camPos,
      lookAt: tpl.lookAt,
      liveFov: tpl.liveFov || 38,
      refFov: tpl.refFov || 48,
      depthShell: tpl.depthShell || { nearDist: 6.4, farDist: 44.0, maxGroundDist: 26.0 },
      movement: mv,
      spawnPos: [getCurveOffsetX(Math.min(4.0, zMax - 1.4)), 0, Math.min(4.0, zMax - 1.4)],
      spawnYaw: Math.PI,
      zRange: tpl.zRange,
      blockedZones: tpl.blockedZones || [],
      getDepthT,
      getFloorY,
      getCurveOffsetX,
      xBoundsFn: (z) => {
        const tBack = getDepthT(z);
        const shift = getCurveOffsetX(z);
        return [xMin0 + tBack * xMinBack + shift, xMax0 - tBack * xMaxBack + shift];
      },
      sunColor: tpl.sunColor,
      sunPos: tpl.sunPos,
      sunBaseIntensity: tpl.sunBaseIntensity,
      ambientSky: tpl.ambientSky,
      ambientGround: tpl.ambientGround,
      ambientIntensity: tpl.ambientIntensity,
      fogColor: tpl.fogColor,
      fogDensity: tpl.fogDensity,
      exposure: culture.exposure * (tpl.exposureMul || 1.0),
      glowTint: new THREE.Color(...culture.glowTint),
      shadowOpacity: 0.42,
      lanterns: tpl.lanterns,
      useDynamicSunZone: Boolean(tpl.useDynamicSunZone),
      isInterior: Boolean(tpl.isInterior),
      tint: new THREE.Color(...rm.tint),
      playerScaleHeight: rm.template === 'covered_arcade' ? 1.76 : rm.template === 'divan_palace' ? 1.88 : 1.84,
      portals,
    };

    roomList.push({ id: rm.id, shortTitle: rm.shortTitle, title: rm.title });
  });

  return { spec, culture, angleMap, roomList };
}

/**
 * HƏQİQİ 3D PROYEKSİYALI DƏRİNLİK QABIĞI VERTEX ŞEYDERİ:
 * Hər piksel/təpə nöqtəsini referans kamera şüası boyunca `_depth.png` və Y=0 (və yamac) döşəmə müstəvisinə
 * real 3D dünya koordinatlarına proyeksiya edir — nəticədə 3D kamera tərpəndikcə bütün otaq REAL 3D perspektivdə hərəkət edir!
 */
const SHELL_3D_VERT = /* glsl */ `
  uniform sampler2D uDepthMap;
  uniform vec3 uRefPos;
  uniform vec3 uRefForward;
  uniform vec3 uRefRight;
  uniform vec3 uRefUp;
  uniform float uRefTanHalfFov;
  uniform float uShellAspect;
  uniform float uNearDist;
  uniform float uFarDist;
  uniform float uMaxGroundDist;
  uniform float uSlopeRise;

  varying vec2 vUv;
  varying float vWorldDepth;

  void main() {
    vUv = uv;
    vec2 ndc = uv * 2.0 - 1.0;

    // Referans kameranın həmin pikselə düşən 3D şüası
    vec3 rayDir = normalize(
      uRefForward
      + uRefRight * (ndc.x * uRefTanHalfFov * uShellAspect)
      + uRefUp    * (ndc.y * uRefTanHalfFov)
    );

    float d = texture2D(uDepthMap, uv).r;
    float shellDist = mix(uFarDist, uNearDist, pow(clamp(d, 0.0, 1.0), 1.15));

    // Döşəmə piksellərini real Y=0 (və ya Qala yamacı) müstəvisinə kilidlə ki, tacirin ayaqları sürüşməsin!
    float rawGroundDist = (rayDir.y < -0.015) ? (-uRefPos.y / rayDir.y) : uFarDist;
    float groundDist = clamp(rawGroundDist, 4.2, uMaxGroundDist);

    float belowHorizon = smoothstep(-0.01, -0.085, rayDir.y);
    float centerCorridor = 1.0 - smoothstep(0.45, 0.90, abs(ndc.x));
    float floorLock = belowHorizon * centerCorridor;

    float finalDist = mix(shellDist, min(groundDist, shellDist + 2.5), floorLock);
    vec3 worldPos = uRefPos + rayDir * finalDist;

    // Yüksələn Qala yamacında (uSlopeRise > 0) döşəmə təpələrini uyğun qaldır
    if (uSlopeRise > 0.01 && floorLock > 0.05) {
      float zFactor = clamp((6.0 - worldPos.z) / 13.0, 0.0, 1.0);
      worldPos.y += zFactor * uSlopeRise * floorLock;
    }

    vWorldDepth = finalDist;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

// Real 3D Depth-Shell Fragment Şeyderi: Normal-Map fənər işığı + Səhər ↔ Gecə + sRGB çıxış
const SHELL_3D_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uColorMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uGlowMap;

  uniform float uTime;
  uniform vec2 uPlayerUV;
  uniform float uPlayerDepth;
  uniform vec3 uCityTint;
  uniform vec3 uGlowTint;
  uniform float uExposure;
  uniform float uNightMix;
  uniform vec2 uLanternA;
  uniform vec2 uLanternB;
  uniform float uFade;

  varying vec2 vUv;
  varying float vWorldDepth;

  void main() {
    vec2 pUv = clamp(vUv, 0.002, 0.998);
    vec3 color = texture2D(uColorMap, pUv).rgb * uCityTint;
    vec3 normalTex = texture2D(uNormalMap, pUv).rgb * 2.0 - 1.0;
    vec3 N = normalize(vec3(normalTex.x * 1.24, normalTex.y * 1.24, max(0.26, normalTex.z)));
    float glow = texture2D(uGlowMap, pUv).r;

    // Səhər (parlaq gün işığı) ↔ Gecə (dərin mistik qaranlıq + güclü fənərlər)
    vec3 nightGrade = pow(max(color, vec3(0.0001)), vec3(2.15, 2.10, 1.90)) * vec3(0.28, 0.32, 0.44);
    vec3 gradedBase = mix(color, nightGrade, uNightMix);

    float flickerA = 0.88 + 0.12 * sin(uTime * 5.1 + pUv.x * 19.0) * cos(uTime * 3.0 + pUv.y * 11.0);
    float flickerB = 0.91 + 0.09 * sin(uTime * 7.4 + pUv.x * 31.0);
    float nightGlowBoost = mix(0.42, 1.32, uNightMix);
    vec3 lanternBloom = uGlowTint * glow * (nightGlowBoost * flickerA);

    vec3 lDir1 = normalize(vec3(uLanternA - pUv, 0.20));
    float dist1 = length((uLanternA - pUv) * vec2(1.4, 1.0));
    float att1 = exp(-dist1 * 3.6) * flickerA;
    float diff1 = max(dot(N, lDir1), 0.0);

    vec3 lDir2 = normalize(vec3(uLanternB - pUv, 0.20));
    float dist2 = length((uLanternB - pUv) * vec2(1.4, 1.0));
    float att2 = exp(-dist2 * 3.6) * flickerB;
    float diff2 = max(dot(N, lDir2), 0.0);

    vec2 playerLight = uPlayerUV + vec2(0.0, 0.04);
    vec3 lDirP = normalize(vec3(playerLight - pUv, 0.20));
    float distP = length((playerLight - pUv) * vec2(1.35, 1.65));
    float attP = exp(-distP * mix(5.0, 3.7, uNightMix)) * (0.38 + 0.55 * uPlayerDepth) * (0.94 + 0.06 * sin(uTime * 4.2));
    float diffP = max(dot(N, lDirP), 0.0);

    float dynMul = mix(0.22, 0.56, uNightMix);
    vec3 dynamicLight =
      uGlowTint * (diff1 * att1 * dynMul + diff2 * att2 * dynMul + diffP * attP * (dynMul * 1.15));

    float expNow = mix(uExposure, uExposure * 0.84, uNightMix);
    vec3 finalCol = (gradedBase + lanternBloom + dynamicLight * (gradedBase + vec3(0.14 * uNightMix))) * expNow;
    finalCol = finalCol / (vec3(1.0) + finalCol * 0.26);

    float vig = smoothstep(1.05, 0.28, length((pUv - 0.5) * vec2(1.04, 1.02)));
    finalCol *= mix(mix(0.88, 0.64, uNightMix), 1.04, vig);
    finalCol *= clamp(uFade, 0.0, 1.0);

    gl_FragColor = vec4(finalCol, 1.0);
    #include <colorspace_fragment>
  }
`;

export class CinematicBazaar25DScene {
  constructor(container, eventBus, data, gameManager, cityId = 'City_Baku') {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.gameManager = gameManager;
    this.cityId = cityId;
    this.isMissionScene = String(cityId).startsWith('Mission_');
    this.city = !this.isMissionScene ? data.getCityById(cityId) || data.cities[0] : data.cities[0];

    const built = buildLocationAngleMap(cityId);
    this.citySpec = built.spec;
    this.cultureStyle = built.culture;
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

    this.targetNightMix = 0.0;
    this.currentNightMix = 0.0;

    this.showWalkBoundsDebug = false;
    this.debugBoundsGroup = null;
    this.debugHudEl = null;

    this.shellMesh = null;
    this.shellUniforms = null;
    this.imageAspect = 16 / 9;

    this.player = {
      group: null,
      baseNormScale: 1.0,
      pos: new THREE.Vector3(0.0, 0, 4.0),
      yaw: Math.PI,
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
    this.culturalAccentGroup = null;
    this.culturalAnimItems = [];

    this.baseCamPos = new THREE.Vector3(...this.angleCfg.camPos);
    this.baseLookAt = new THREE.Vector3(...this.angleCfg.lookAt);
    this.liveCamPos = this.baseCamPos.clone();
    this.liveLookAt = this.baseLookAt.clone();
    this.mouseNorm = { x: 0, y: 0 };

    this.dialogueFocus = null;
    this.interactables = [];
    this.interactGroup = null;
    this.interactRings = [];
    this.nearestInteractable = null;

    this.hemiLight = null;
    this.sunLight = null;
    this.rimLight = null;
    this.playerLanternLight = null;
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

  getLocationLabel() {
    return this.cultureStyle.label;
  }

  getRoomList() {
    return this.roomList;
  }

  setTimeOfDay(mode, immediate = false) {
    this.targetNightMix = mode === 'night' ? 1.0 : 0.0;
    if (immediate) {
      this.currentNightMix = this.targetNightMix;
      if (this.shellUniforms) this.shellUniforms.uNightMix.value = this.currentNightMix;
      this._applyTimeLighting();
    }
  }

  getNearestInteractable() {
    return this.nearestInteractable;
  }

  setDialogueFocus(target) {
    this.dialogueFocus = target;
    if (target) this.player.targetPos = null;
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
    } else if (code === 'KeyB' && !e.repeat && !this.gameManager?.ui?.isAnyModalOpen?.()) {
      this.showWalkBoundsDebug = !this.showWalkBoundsDebug;
      this._rebuildWalkBoundsDebug();
      this.eventBus.emit('ui:toast', {
        message: this.showWalkBoundsDebug
          ? `3D Sərhəd & Hərəkət Profili AÇIQ: ${this.angleCfg.movement.profileName}`
          : '3D Sərhəd Göstəricisi bağlandı.',
        type: 'info',
      });
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
    let cz = Math.max(zMin, Math.min(zMax, z));
    const [xMin, xMax] = this.angleCfg.xBoundsFn(cz);
    let cx = Math.max(xMin, Math.min(xMax, x));

    for (const obs of this.angleCfg.blockedZones || []) {
      const dx = (cx - obs.x) / Math.max(0.1, obs.rx);
      const dz = (cz - obs.z) / Math.max(0.1, obs.rz);
      const distSq = dx * dx + dz * dz;
      if (distSq < 1.0) {
        const dist = Math.sqrt(distSq) || 0.001;
        cx = obs.x + (dx / dist) * obs.rx * 1.02;
        cz = obs.z + (dz / dist) * obs.rz * 1.02;
      }
    }

    cz = Math.max(zMin, Math.min(zMax, cz));
    const [xMin2, xMax2] = this.angleCfg.xBoundsFn(cz);
    cx = Math.max(xMin2, Math.min(xMax2, cx));
    const cy = this.angleCfg.getFloorY(cz);
    return { x: cx, y: cy, z: cz };
  }

  _setWalkTarget(x, z) {
    const clamped = this._clampWalkable(x, z);
    this.player.targetPos = new THREE.Vector3(clamped.x, clamped.y, clamped.z);
    if (this.clickRipple) {
      this.clickRipple.position.set(clamped.x, clamped.y + 0.035, clamped.z);
      this.clickRipple.visible = true;
      this.clickRippleLife = 1.0;
    }
  }

  _rebuildWalkBoundsDebug() {
    if (this.debugBoundsGroup) {
      this.debugBoundsGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.scene.remove(this.debugBoundsGroup);
      this.debugBoundsGroup = null;
    }
    if (this.debugHudEl) {
      this.debugHudEl.style.display = this.showWalkBoundsDebug ? 'block' : 'none';
    }
    if (!this.showWalkBoundsDebug || !this.scene) return;

    this.debugBoundsGroup = new THREE.Group();
    const [zMin, zMax] = this.angleCfg.zRange;

    // Əyri və yamaclı hərəkət sərhədini 16 addımda dəqiq çək (yaşıl)
    const leftEdge = [];
    const rightEdge = [];
    for (let i = 0; i <= 16; i++) {
      const z = zMax - (i / 16) * (zMax - zMin);
      const y = this.angleCfg.getFloorY(z) + 0.045;
      const [xMin, xMax] = this.angleCfg.xBoundsFn(z);
      leftEdge.push(new THREE.Vector3(xMin, y, z));
      rightEdge.push(new THREE.Vector3(xMax, y, z));
    }
    const loopPts = [...leftEdge, ...rightEdge.reverse(), leftEdge[0]];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(loopPts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x52e078 });
    this.debugBoundsGroup.add(new THREE.Line(lineGeo, lineMat));

    // Qırmızı hərəkət etməmə zolaqları
    for (const obs of this.angleCfg.blockedZones || []) {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const oz = obs.z + Math.sin(a) * obs.rz;
        const oy = this.angleCfg.getFloorY(oz) + 0.055;
        pts.push(new THREE.Vector3(obs.x + Math.cos(a) * obs.rx, oy, oz));
      }
      const oGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const oMat = new THREE.LineBasicMaterial({ color: 0xf24e4e });
      this.debugBoundsGroup.add(new THREE.Line(oGeo, oMat));
    }

    this.scene.add(this.debugBoundsGroup);
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

  /**
   * 3D Dərinlik Qabığı üçün referans kamera basis vektorlarını hesabla və overscan marjasını təmin et
   */
  _syncShellReferenceCamera() {
    if (!this.shellUniforms) return;
    const refPos = new THREE.Vector3(...this.angleCfg.camPos);
    const refLook = new THREE.Vector3(...this.angleCfg.lookAt);
    const forward = new THREE.Vector3().subVectors(refLook, refPos).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const viewAspect = w / Math.max(1, h);

    // Hər ölçüdə ekranda 3D kamera hərəkət edərkən kənarda qara boşluq görünməməsi üçün ≥25% overscan marjası
    const baseRefTan = Math.tan(THREE.MathUtils.degToRad(this.angleCfg.refFov * 0.5));
    const aspectCover = Math.max(1.0, (viewAspect / this.imageAspect) * 1.16);
    const refTan = baseRefTan * aspectCover;

    this.shellUniforms.uRefPos.value.copy(refPos);
    this.shellUniforms.uRefForward.value.copy(forward);
    this.shellUniforms.uRefRight.value.copy(right);
    this.shellUniforms.uRefUp.value.copy(up);
    this.shellUniforms.uRefTanHalfFov.value = refTan;
    this.shellUniforms.uShellAspect.value = this.imageAspect;
    this.shellUniforms.uNearDist.value = this.angleCfg.depthShell.nearDist;
    this.shellUniforms.uFarDist.value = this.angleCfg.depthShell.farDist;
    this.shellUniforms.uMaxGroundDist.value = this.angleCfg.depthShell.maxGroundDist;
    this.shellUniforms.uSlopeRise.value = this.angleCfg.movement.slopeRise || 0.0;
  }

  async mount() {
    this.isMounted = false;
    this.container.innerHTML = '';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x14100c);
    this.scene.fog = new THREE.FogExp2(this.angleCfg.fogColor, this.angleCfg.fogDensity);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(this.angleCfg.liveFov, w / h, 0.2, 160);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.appendChild(this.renderer.domElement);

    // 3D Hərəkət & Sərhəd telemetriya paneli (yalnız B basılanda görünür)
    if (this.debugHudEl) this.debugHudEl.remove();
    this.debugHudEl = document.createElement('div');
    this.debugHudEl.style.cssText =
      'display:none;position:fixed;left:14px;bottom:84px;z-index:26;padding:6px 10px;background:rgba(14,10,7,0.88);border:1px solid rgba(82,224,120,0.65);border-radius:3px;color:#d6f5de;font-family:monospace;font-size:11px;line-height:1.45;pointer-events:none;';
    document.body.appendChild(this.debugHudEl);

    await this._buildProjected3DShell();
    this._buildLights();
    this._buildShadowFloorAndAtmosphere();
    this._buildForegroundFrame();
    this._rebuildCulturalAccents();
    await this._buildPlayableMerchant();
    this._rebuildHotspots(this.activeAngleId);
    this._applyTimeLighting();

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

  _applyTimeLighting() {
    const n = this.currentNightMix;
    if (this.hemiLight) {
      const daySky = new THREE.Color(this.angleCfg.ambientSky);
      const nightSky = new THREE.Color(0x283652);
      this.hemiLight.color.copy(daySky).lerp(nightSky, n);
      this.hemiLight.intensity = THREE.MathUtils.lerp(this.angleCfg.ambientIntensity, 0.42, n);
    }
    if (this.sunLight && !this.angleCfg.useDynamicSunZone) {
      this.sunLight.intensity = THREE.MathUtils.lerp(this.angleCfg.sunBaseIntensity, 0.55, n);
    }
    if (this.playerLanternLight) {
      this.playerLanternLight.intensity = THREE.MathUtils.lerp(0.18, 1.15, n);
    }
    if (this.scene?.fog) {
      const dayFog = new THREE.Color(this.angleCfg.fogColor);
      const nightFog = new THREE.Color(0x0b0e16);
      this.scene.fog.color.copy(dayFog).lerp(nightFog, n);
      this.scene.fog.density = THREE.MathUtils.lerp(this.angleCfg.fogDensity, this.angleCfg.fogDensity * 1.65, n);
    }
  }

  _buildForegroundFrame() {
    this.foregroundGroup = new THREE.Group();
    this.hangingLanterns = [];

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.55, metalness: 0.78 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xa67e3c, roughness: 0.34, metalness: 0.85 });
    const flameMat = new THREE.MeshBasicMaterial({
      color: this.cultureStyle.lanternHex,
      transparent: true,
      opacity: 0.92,
    });

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

  _rebuildCulturalAccents() {
    if (this.culturalAccentGroup) {
      this.culturalAccentGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.scene.remove(this.culturalAccentGroup);
    }
    this.culturalAccentGroup = new THREE.Group();
    this.culturalAnimItems = [];

    const makeSoftGradientTex = (rgbaCenter) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0.0, rgbaCenter);
      g.addColorStop(0.55, rgbaCenter.replace(/[\d.]+\)$/, '0.18)'));
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      this._createdTextures.push(tex);
      return tex;
    };

    const mode = this.cultureStyle.accentMode;

    if (mode === 'sheki_shebeke' && this.angleCfg.isInterior) {
      const stainColors = [
        'rgba(220, 48, 64, 0.55)',
        'rgba(48, 148, 232, 0.55)',
        'rgba(52, 198, 118, 0.50)',
        'rgba(248, 192, 64, 0.55)',
      ];
      stainColors.forEach((col, i) => {
        const tex = makeSoftGradientTex(col);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.75, 1.75),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.48,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(-1.3 + i * 0.9, 0.032, 2.2 - i * 1.15);
        this.culturalAccentGroup.add(mesh);
        this.culturalAnimItems.push({ mesh, kind: 'pulse', baseOpacity: 0.45, phase: i * 1.1 });
      });
    } else if (mode === 'shusha_mist') {
      const mistTex = makeSoftGradientTex('rgba(210, 218, 238, 0.32)');
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(7.5, 2.8),
          new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.22, depthWrite: false })
        );
        m.position.set(-3.5 + i * 2.4, 0.8 + (i % 2) * 0.5, -2.5 - i * 1.4);
        this.culturalAccentGroup.add(m);
        this.culturalAnimItems.push({ mesh: m, kind: 'drift', speed: 0.22 + i * 0.05, baseX: m.position.x });
      }
    } else if (mode === 'shamakhi_turquoise') {
      const turqTex = makeSoftGradientTex('rgba(64, 212, 218, 0.42)');
      for (const [tx, tz] of [
        [-2.2, -1.2],
        [2.2, -1.2],
      ]) {
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(2.6, 2.6),
          new THREE.MeshBasicMaterial({
            map: turqTex,
            transparent: true,
            opacity: 0.34,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        glow.position.set(tx, 2.6, tz);
        this.culturalAccentGroup.add(glow);
        this.culturalAnimItems.push({ mesh: glow, kind: 'pulse', baseOpacity: 0.32, phase: tx });
      }
    } else if (mode === 'baku_sun_fire' && !this.angleCfg.isInterior) {
      const sunTex = makeSoftGradientTex('rgba(255, 224, 152, 0.40)');
      const sunPool = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 3.8),
        new THREE.MeshBasicMaterial({
          map: sunTex,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      sunPool.rotation.x = -Math.PI / 2;
      sunPool.position.set(-1.3, 0.03, 2.6);
      this.culturalAccentGroup.add(sunPool);
      this.culturalAnimItems.push({ mesh: sunPool, kind: 'pulse', baseOpacity: 0.32, phase: 0.4 });
    }

    this.scene.add(this.culturalAccentGroup);
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
      if (this.shellUniforms) this.shellUniforms.uFade.value = this.fadeAlpha;
      await new Promise((r) => setTimeout(r, 17));
    }

    const bundle = await texPromise;
    if (!this.isMounted) return;

    this.activeAngleId = angleId;
    this.angleCfg = this.angleConfigs[angleId];
    this.baseCamPos.set(...this.angleCfg.camPos);
    this.baseLookAt.set(...this.angleCfg.lookAt);
    this.liveCamPos.copy(this.baseCamPos);
    this.liveLookAt.copy(this.baseLookAt);
    this.camera.fov = this.angleCfg.liveFov;
    this.camera.updateProjectionMatrix();

    if (bundle.colorMap?.image?.width && bundle.colorMap?.image?.height) {
      this.imageAspect = bundle.colorMap.image.width / bundle.colorMap.image.height;
    }

    if (this.shellUniforms) {
      if (bundle.colorMap) this.shellUniforms.uColorMap.value = bundle.colorMap;
      if (bundle.depthMap) this.shellUniforms.uDepthMap.value = bundle.depthMap;
      if (bundle.normalMap) this.shellUniforms.uNormalMap.value = bundle.normalMap;
      if (bundle.glowMap) this.shellUniforms.uGlowMap.value = bundle.glowMap;
      this.shellUniforms.uCityTint.value.copy(this.angleCfg.tint);
      this.shellUniforms.uGlowTint.value.copy(this.angleCfg.glowTint);
      this.shellUniforms.uExposure.value = this.angleCfg.exposure;
      this.shellUniforms.uLanternA.value.set(...this.angleCfg.lanterns[0].uv);
      this.shellUniforms.uLanternB.value.set(...this.angleCfg.lanterns[1].uv);
      this._syncShellReferenceCamera();
    }

    if (this.sunLight) {
      this.sunLight.color.setHex(this.angleCfg.sunColor);
      this.sunLight.position.set(...this.angleCfg.sunPos);
    }
    if (this.floorMesh) {
      this.floorMesh.material.opacity = this.angleCfg.shadowOpacity;
      // Yamaclı otaqda kölgə müstəvisini də yamaca uyğun əy!
      const rise = this.angleCfg.movement.slopeRise || 0;
      const span = Math.max(1, this.angleCfg.zRange[1] - this.angleCfg.zRange[0]);
      this.floorMesh.rotation.x = Math.atan2(rise, span);
      this.floorMesh.position.y = rise * 0.35;
    }
    this.angleCfg.lanterns.forEach((lCfg, idx) => {
      if (this.flickerLights[idx]) {
        this.flickerLights[idx].light.position.set(...lCfg.pos);
        this.flickerLights[idx].light.color.setHex(lCfg.color);
        this.flickerLights[idx].base = lCfg.intensity;
      }
    });

    this._applyTimeLighting();

    const sp = customSpawn || this.angleCfg.spawnPos;
    const safeSp = this._clampWalkable(sp[0], sp[2]);
    this.player.pos.set(safeSp.x, safeSp.y, safeSp.z);
    this.player.yaw = this.angleCfg.spawnYaw;
    if (this.player.group) {
      this.player.group.scale.setScalar(this.player.baseNormScale * (this.angleCfg.playerScaleHeight / 1.84));
      this.player.group.position.copy(this.player.pos);
      this.player.group.rotation.y = this.player.yaw;
    }

    this._rebuildCulturalAccents();
    this._rebuildHotspots(angleId);
    this._rebuildWalkBoundsDebug();
    this.eventBus.emit('bazaar:angle_changed', { angleId, title: this.angleCfg.title });

    const fadeInSteps = 10;
    for (let i = 1; i <= fadeInSteps; i++) {
      this.fadeAlpha = i / fadeInSteps;
      if (this.shellUniforms) this.shellUniforms.uFade.value = this.fadeAlpha;
      await new Promise((r) => setTimeout(r, 17));
    }
    this.fadeAlpha = 1.0;
    if (this.shellUniforms) this.shellUniforms.uFade.value = 1.0;
    this.isTransitioning = false;
  }

  /**
   * 140×84 seqmentli Həqiqi 3D Dərinlik Qabığı (Projected 3D World Shell)
   */
  async _buildProjected3DShell() {
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

    this.shellUniforms = {
      uColorMap: { value: bundle.colorMap || fallbackTex() },
      uDepthMap: { value: bundle.depthMap || fallbackTex() },
      uNormalMap: { value: bundle.normalMap || fallbackTex() },
      uGlowMap: { value: bundle.glowMap || fallbackTex() },
      uRefPos: { value: new THREE.Vector3() },
      uRefForward: { value: new THREE.Vector3(0, 0, -1) },
      uRefRight: { value: new THREE.Vector3(1, 0, 0) },
      uRefUp: { value: new THREE.Vector3(0, 1, 0) },
      uRefTanHalfFov: { value: 0.45 },
      uShellAspect: { value: this.imageAspect },
      uNearDist: { value: this.angleCfg.depthShell.nearDist },
      uFarDist: { value: this.angleCfg.depthShell.farDist },
      uMaxGroundDist: { value: this.angleCfg.depthShell.maxGroundDist },
      uSlopeRise: { value: this.angleCfg.movement.slopeRise || 0.0 },
      uTime: { value: 0 },
      uPlayerUV: { value: new THREE.Vector2(0.5, 0.25) },
      uPlayerDepth: { value: 0.6 },
      uCityTint: { value: this.angleCfg.tint.clone() },
      uGlowTint: { value: this.angleCfg.glowTint.clone() },
      uExposure: { value: this.angleCfg.exposure },
      uNightMix: { value: this.currentNightMix },
      uLanternA: { value: new THREE.Vector2(...this.angleCfg.lanterns[0].uv) },
      uLanternB: { value: new THREE.Vector2(...this.angleCfg.lanterns[1].uv) },
      uFade: { value: 1.0 },
    };

    this._syncShellReferenceCamera();

    const mat = new THREE.ShaderMaterial({
      uniforms: this.shellUniforms,
      vertexShader: SHELL_3D_VERT,
      fragmentShader: SHELL_3D_FRAG,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });

    // 140×84 yüksək dəqiqlikli 3D relyef toru (real kamera hərəkətində axıcı 3D perspektiv!)
    const shellGeo = new THREE.PlaneGeometry(2, 2, 140, 84);
    this.shellMesh = new THREE.Mesh(shellGeo, mat);
    this.shellMesh.frustumCulled = false;
    this.shellMesh.renderOrder = -100;
    this.scene.add(this.shellMesh);
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

    this.playerLanternLight = new THREE.PointLight(0xffb454, 0.18, 7.5, 1.5);
    this.playerLanternLight.position.set(0.55, 1.25, 3.6);
    this.scene.add(this.playerLanternLight);

    this.flickerLights = [];
    this.angleCfg.lanterns.forEach((lCfg, idx) => {
      const pt = new THREE.PointLight(lCfg.color, lCfg.intensity, 16, 1.35);
      pt.position.set(...lCfg.pos);
      this.scene.add(pt);
      this.flickerLights.push({ light: pt, base: lCfg.intensity, phase: idx * 2.3 + 0.5 });
    });

    this.rimLight = new THREE.DirectionalLight(0xffd89c, 1.0);
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
        color: 0xe6bc64,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.clickRipple.visible = false;
    this.scene.add(this.clickRipple);

    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 32;
    dustCanvas.height = 32;
    const dctx = dustCanvas.getContext('2d');
    const grad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0.0, 'rgba(255, 240, 198, 0.95)');
    grad.addColorStop(0.35, 'rgba(250, 208, 134, 0.55)');
    grad.addColorStop(1.0, 'rgba(250, 208, 134, 0.0)');
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, 32, 32);
    const dustTex = new THREE.CanvasTexture(dustCanvas);
    this._createdTextures.push(dustTex);

    const count = 82;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11.0;
      positions[i * 3 + 1] = 0.3 + Math.random() * 5.2;
      positions[i * 3 + 2] = -9.5 + Math.random() * 17.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: this.cultureStyle.dustHex,
      map: dustTex,
      size: 0.14,
      transparent: true,
      opacity: 0.4,
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

    const role = this.angleCfg.role;
    const defs = [];

    if (this.citySpec.isMission) {
      defs.push(
        {
          id: 'mission_point',
          type: 'mission_encounter',
          label: this.citySpec.missionPrompt || 'Xüsusi Missiya Hadisəsi',
          pos: new THREE.Vector3(0.0, 0, -1.2),
          npcPos: new THREE.Vector3(0.0, 1.5, -2.5),
          radius: 2.8,
          ringColor: 0xe6884c,
        },
        {
          id: 'exit_gate',
          type: 'exit_to_map',
          label: this.citySpec.gateLabel,
          pos: new THREE.Vector3(0.0, 0, this.angleCfg.zRange[1] - 0.5),
          npcPos: new THREE.Vector3(0.0, 1.6, 8.0),
          radius: 2.2,
          ringColor: 0xf4cf76,
        }
      );
    } else if (role === 'courtyard') {
      defs.push(
        {
          id: 'market_stall_zone',
          type: 'market',
          label: `Bazar Dəftəri & Ticarət (${this.city?.short_name || 'Bazar'})`,
          pos: new THREE.Vector3(-2.1, 0, 2.0),
          npcPos: new THREE.Vector3(-3.2, 1.5, 2.0),
          radius: 2.4,
          defaultItem: primaryLuxury,
          ringColor: 0xd9ad58,
        },
        {
          id: 'fayton_station',
          type: 'fayton',
          label: 'Fayton Dayanacağı · Şəhərlərarası Səfər',
          pos: new THREE.Vector3(1.5, 0, 2.3),
          npcPos: new THREE.Vector3(2.8, 1.5, 2.3),
          radius: 2.3,
          ringColor: 0x6cb8cf,
        },
        {
          id: 'exit_gate',
          type: 'exit_to_map',
          label: this.citySpec.gateLabel,
          pos: new THREE.Vector3(0.0, 0, this.angleCfg.zRange[0] + 0.6),
          npcPos: new THREE.Vector3(0.0, 1.6, -11.0),
          radius: 2.5,
          ringColor: 0xf4cf76,
        }
      );
    } else if (role === 'market') {
      defs.push({
        id: 'market_arcade_zone',
        type: 'market',
        label: `${this.angleCfg.title} · Sövdələş`,
        pos: new THREE.Vector3(-0.95, 0, 1.5),
        npcPos: new THREE.Vector3(-2.2, 1.5, 1.5),
        radius: 2.6,
        defaultItem: primaryLuxury,
        ringColor: 0xd9ad58,
      });
    } else if (role === 'palace') {
      defs.push({
        id: 'palace_throne',
        type: 'palace_audience',
        label: this.citySpec.palaceTitle,
        palaceTitle: this.citySpec.palaceTitle,
        pos: new THREE.Vector3(0.0, 0, -2.4),
        npcPos: new THREE.Vector3(0.0, 1.6, -5.0),
        radius: 2.9,
        ringColor: 0xd96b54,
      });
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
      });
    }

    for (const def of defs) {
      const fy = this.angleCfg.getFloorY(def.pos.z);
      def.pos.y = fy;
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
      ring.position.set(def.pos.x, fy + 0.022, def.pos.z);
      this.interactGroup.add(ring);

      const innerGeo = new THREE.RingGeometry(0.22, 0.245, 32);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = ringMat.clone();
      innerMat.opacity = 0.14;
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(def.pos.x, fy + 0.026, def.pos.z);
      this.interactGroup.add(inner);

      this.interactRings.push({ id: def.id, outer: ring, inner });
    }

    if (ENABLE_PLACEHOLDER_NPCS) {
      // Özəl 3D NPC modelləri gəldikdə burada qoşulacaq
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

    const safeSp = this._clampWalkable(this.player.pos.x, this.player.pos.z);
    this.player.pos.set(safeSp.x, safeSp.y, safeSp.z);
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

    const animScale = targetName === 'Walk' ? this.angleCfg.movement.animScale || 1.12 : 1.0;
    nextAction.reset().setEffectiveTimeScale(animScale).setEffectiveWeight(1).play();
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
    this._syncShellReferenceCamera();
  }

  update(dt) {
    if (!this.isMounted || !this.renderer || !this.scene || !this.camera) return;
    this.elapsed += dt;
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);

    // Səhər ↔ Gecə hamar animasiyası
    if (Math.abs(this.targetNightMix - this.currentNightMix) > 0.001) {
      this.currentNightMix += (this.targetNightMix - this.currentNightMix) * Math.min(1, dt * 3.5);
      if (this.shellUniforms) this.shellUniforms.uNightMix.value = this.currentNightMix;
      this._applyTimeLighting();
    }

    const mv = this.angleCfg.movement;
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
      const step = (mv.speed || 4.4) * dt;
      const clamped = this._clampWalkable(this.player.pos.x + nx * step, this.player.pos.z + nz * step);
      this.player.pos.set(clamped.x, clamped.y, clamped.z);

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
    if (this.playerLanternLight) {
      this.playerLanternLight.position.set(this.player.pos.x + 0.55, this.player.pos.y + 1.25, this.player.pos.z - 0.45);
    }

    if (this.portalCooldown <= 0 && !this.isTransitioning && !this.dialogueFocus && !modalBlocking && this.player.isMoving) {
      for (const p of this.angleCfg.portals || []) {
        const pd = Math.hypot(this.player.pos.x - p.pos[0], this.player.pos.z - p.pos[2]);
        if (pd <= p.triggerRadius) {
          this.switchAngle(p.targetAngle);
          break;
        }
      }
    }

    if (this.sunLight && this.angleCfg.useDynamicSunZone) {
      const sunBoundaryX = -0.35 - this.player.pos.z * 0.14;
      const sunFactor = Math.max(0, Math.min(1, (sunBoundaryX - this.player.pos.x + 1.4) / 2.8));
      const daySun = 1.25 + sunFactor * 1.65;
      const targetSun = THREE.MathUtils.lerp(daySun, 0.45, this.currentNightMix);
      this.sunLight.intensity += (targetSun - this.sunLight.intensity) * Math.min(1, dt * 5.0);
    }

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

    for (const item of this.culturalAnimItems) {
      if (item.kind === 'pulse') {
        item.mesh.material.opacity = item.baseOpacity * (0.85 + Math.sin(this.elapsed * 1.8 + item.phase) * 0.15);
      } else if (item.kind === 'drift') {
        item.mesh.position.x = item.baseX + Math.sin(this.elapsed * item.speed) * 1.4;
      }
    }

    const nightLanternBoost = THREE.MathUtils.lerp(1.0, 1.65, this.currentNightMix);
    for (const fl of this.flickerLights) {
      fl.light.intensity = fl.base * nightLanternBoost * (0.91 + Math.sin(this.elapsed * 5.8 + fl.phase) * 0.09);
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

    // REAL 3D KAMERA İZLƏMƏSİ: Hər məkanın öz fərdi 3D kamera davranışı (Pan + Forward Dolly + Yamac Yüksəlişi + Baxış)!
    const depthT = this.angleCfg.getDepthT(this.player.pos.z);
    const zOffsetFromSpawn = this.angleCfg.spawnPos[2] - this.player.pos.z; // Dərinə getdikcə müsbət

    const desiredCamX =
      this.baseCamPos.x +
      this.player.pos.x * (mv.followX || 0.4) +
      this.mouseNorm.x * 0.52;
    const desiredCamY =
      this.baseCamPos.y +
      this.player.pos.y * (mv.followY || 0.15) -
      this.mouseNorm.y * 0.24 +
      Math.sin(this.elapsed * 0.72) * 0.025;
    const desiredCamZ =
      this.baseCamPos.z -
      Math.max(-0.5, zOffsetFromSpawn * (mv.followZ || 0.42)) -
      (this.dialogueFocus ? 1.4 : 0);

    const desiredLookX =
      this.baseLookAt.x +
      this.player.pos.x * (mv.lookX || 0.22) +
      this.mouseNorm.x * 0.65;
    const desiredLookY =
      this.baseLookAt.y +
      this.player.pos.y * 0.65 +
      depthT * (mv.lookUpOnApproach || 0.3) -
      this.mouseNorm.y * 0.32;
    const desiredLookZ = this.baseLookAt.z;

    const camLerp = Math.min(1, dt * 3.8);
    this.liveCamPos.x += (desiredCamX - this.liveCamPos.x) * camLerp;
    this.liveCamPos.y += (desiredCamY - this.liveCamPos.y) * camLerp;
    this.liveCamPos.z += (desiredCamZ - this.liveCamPos.z) * camLerp;

    this.liveLookAt.x += (desiredLookX - this.liveLookAt.x) * camLerp;
    this.liveLookAt.y += (desiredLookY - this.liveLookAt.y) * camLerp;
    this.liveLookAt.z += (desiredLookZ - this.liveLookAt.z) * camLerp;

    this.camera.position.copy(this.liveCamPos);
    this.camera.lookAt(this.liveLookAt);
    if (mv.camRollAmp > 0) {
      this.camera.rotation.z += Math.sin(this.elapsed * 0.85) * mv.camRollAmp;
    }

    if (this.shellUniforms) {
      this.shellUniforms.uTime.value = this.elapsed;
      const proj = this.player.pos.clone().add(new THREE.Vector3(0, 1.1, 0)).project(this.camera);
      this.shellUniforms.uPlayerUV.value.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5);
      this.shellUniforms.uPlayerDepth.value = Math.max(0.15, Math.min(1.0, 1.0 - depthT * 0.72));
    }

    if (this.showWalkBoundsDebug && this.debugHudEl) {
      this.debugHudEl.innerHTML =
        `<b>3D Profil:</b> ${mv.profileName}<br/>` +
        `<b>Sürət:</b> ${mv.speed} · <b>DollyZ:</b> ${mv.followZ} · <b>Yamac:</b> +${mv.slopeRise || 0}m<br/>` +
        `<b>Tacir 3D:</b> X=${this.player.pos.x.toFixed(2)} Y=${this.player.pos.y.toFixed(2)} Z=${this.player.pos.z.toFixed(2)} · <b>Qadağan:</b> ${(this.angleCfg.blockedZones || []).length}`;
    }

    this.renderer.render(this.scene, this.camera);
  }

  unmount() {
    this.isMounted = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    if (this.debugHudEl) {
      this.debugHudEl.remove();
      this.debugHudEl = null;
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
