import * as THREE from 'three';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/Cinematic_Bazaar_25D.js
 * «Offline DLSS 5» Məntiqli 2.5D Kinematik + Arxada Canlı 3D Mühərrik:
 * - Göz səviyyəsində fotorealistik tarixi fon (`bazaar_<city>_25d.jpg`)
 * - GLSL 6-addımlı Relief/Depth Parallax Şaderi (`*_depth.png`): Tacir yeridikcə və ya siçan hərəkət etdikcə
 *   ön sütunlar, tağlar və uzaq Qız Qalası əsl 3D dərinlik fərqi ilə sürüşür!
 * - Canlı Normal-Map İşıqlandırma (`*_normal.png`) + Fənər Nəfəsi (`*_glow.png`):
 *   Tacirin əl fənəri və tağlardakı mis çıraqlar daş döşəmə və sütunların fakturasını real vaxtda işıqlandırır.
 * - Perspektivə tam oturdulmuş görünməz 3D `ShadowMaterial` daş döşəmə, animasiyalı 3D Tacir (`merchant_hero.glb`),
 *   real günəş kölgəsi, günəş şüaları, qızılı toz zərrəcikləri, kliklə yerimə və WASD idarəetməsi.
 */

const CITY_25D_CONFIGS = {
  City_Baku: {
    baseImage: './images/bazaar_baku_25d',
    tint: new THREE.Color(1.0, 1.0, 1.0),
    sunColor: 0xffd79a,
    sunPos: [14, 17, 7],
    ambientSky: 0xffe6bd,
    ambientGround: 0x3b2818,
    palaceTitle: 'Şirvanşahlar Sarayı Qəbulu',
    gateLabel: 'Qız Qalası Darvazası · Qədim Xəritəyə Çıx',
  },
  City_Sheki: {
    baseImage: './images/bazaar_baku_25d',
    tint: new THREE.Color(0.92, 0.99, 1.04),
    sunColor: 0xffe4be,
    sunPos: [13, 18, 8],
    ambientSky: 0xdff0f5,
    ambientGround: 0x362a20,
    palaceTitle: 'Şəki Xan Sarayı Qəbulu',
    gateLabel: 'Dağ Aşırımı Darvazası · Qədim Xəritəyə Çıx',
  },
  City_Shusha: {
    baseImage: './images/bazaar_baku_25d',
    tint: new THREE.Color(0.94, 0.94, 1.02),
    sunColor: 0xffe0b5,
    sunPos: [14, 17, 7],
    ambientSky: 0xd8e0ec,
    ambientGround: 0x2d2a30,
    palaceTitle: 'Qarabağ Xanı Qəbulu',
    gateLabel: 'Gəncə Qapısı · Qədim Xəritəyə Çıx',
  },
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

  uniform vec2 uParallax;      // Kamera/siçan 3D parallaks ofseti
  uniform float uZoom;         // Yüngül nəfəs/fokus yaxınlaşması
  uniform float uAspectRatio;  // screenAspect / imageAspect (cover crop üçün)
  uniform float uTime;
  uniform vec2 uPlayerUV;      // 3D Tacirin ekrandakı proyeksiyası (dinamik fənər işığı)
  uniform float uPlayerDepth;  // Tacirin dərinlik yaxınlığı
  uniform vec3 uCityTint;

  varying vec2 vUv;

  // Ekran nisbətini korlamadan 16:9 şəkli tam ekran (cover) yerləşdirir
  vec2 computeCoverUv(vec2 uv) {
    vec2 centered = uv - 0.5;
    if (uAspectRatio > 1.0) {
      centered.y /= uAspectRatio;
    } else {
      centered.x *= uAspectRatio;
    }
    // Parallaks kənarlarının kəsilməməsi üçün 6% təhlükəsizlik kənarı (overscan)
    centered *= (0.935 / max(0.85, uZoom));
    return centered + 0.5;
  }

  void main() {
    vec2 baseUv = computeCoverUv(vUv);

    // 6-addımlı Relief / Depth Parallax: ön sütunlar və səbətlər uzaq Qız Qalasından daha güclü sürüşür!
    vec2 pUv = baseUv;
    float depth = 0.0;
    for (int i = 0; i < 6; i++) {
      depth = texture2D(uDepthMap, clamp(pUv, 0.002, 0.998)).r;
      // 0.35 pivot nöqtəsi: orta plan sabit qalır, ön plan əks, uzaq plan yumşaq istiqamətdə sürüşür
      float shift = (depth - 0.35);
      vec2 targetUv = baseUv - uParallax * shift;
      pUv = mix(pUv, targetUv, 0.55);
    }

    pUv = clamp(pUv, 0.002, 0.998);
    vec3 color = texture2D(uColorMap, pUv).rgb * uCityTint;
    vec3 normalTex = texture2D(uNormalMap, pUv).rgb * 2.0 - 1.0;
    vec3 N = normalize(vec3(normalTex.x * 1.15, normalTex.y * 1.15, max(0.25, normalTex.z)));
    float glow = texture2D(uGlowMap, pUv).r;

    // 1. Tağ fənərlərinin canlı, titrəyən od nəfəsi
    float flickerA = 0.86 + 0.14 * sin(uTime * 5.3 + pUv.x * 19.0) * cos(uTime * 3.1 + pUv.y * 11.0);
    float flickerB = 0.90 + 0.10 * sin(uTime * 7.8 + pUv.x * 31.0);
    vec3 lanternBloom = vec3(1.0, 0.66, 0.24) * glow * (0.48 * flickerA);

    // 2. Dinamik fənər işıqlarının normal-xəritəli daş və kərpic səthinə real-time düşməsi
    vec2 leftLantern = vec2(0.11, 0.58);
    vec2 rightLantern = vec2(0.90, 0.57);
    vec2 playerLight = uPlayerUV + vec2(0.0, 0.05);

    vec3 lDir1 = normalize(vec3(leftLantern - pUv, 0.18));
    float dist1 = length((leftLantern - pUv) * vec2(1.5, 1.0));
    float att1 = exp(-dist1 * 4.4) * flickerA;
    float diff1 = max(dot(N, lDir1), 0.0);

    vec3 lDir2 = normalize(vec3(rightLantern - pUv, 0.18));
    float dist2 = length((rightLantern - pUv) * vec2(1.5, 1.0));
    float att2 = exp(-dist2 * 4.4) * flickerB;
    float diff2 = max(dot(N, lDir2), 0.0);

    // Tacir yeridikcə ətrafındakı daş döşəməni yumşaq isti işıqla canlandırır
    vec3 lDirP = normalize(vec3(playerLight - pUv, 0.22));
    float distP = length((playerLight - pUv) * vec2(1.45, 1.8));
    float attP = exp(-distP * 6.0) * (0.35 + 0.5 * uPlayerDepth) * (0.94 + 0.06 * sin(uTime * 4.2));
    float diffP = max(dot(N, lDirP), 0.0);

    vec3 dynamicWarmLight =
      vec3(1.0, 0.72, 0.34) * (diff1 * att1 * 0.24 + diff2 * att2 * 0.24 + diffP * attP * 0.22);

    vec3 finalCol = color + lanternBloom + dynamicWarmLight * color;

    // İncə kinematik kənar kölgəsi (Lord of the Mysteries atmosferi)
    float vig = smoothstep(0.95, 0.28, length((vUv - 0.5) * vec2(1.15, 1.05)));
    finalCol *= mix(0.76, 1.03, vig);

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
    this.cfg = CITY_25D_CONFIGS[cityId] || CITY_25D_CONFIGS.City_Baku;
    this.modelLoader = new ModelLoader();
    this.textureLoader = new THREE.TextureLoader();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.isMounted = false;

    this.backdropMesh = null;
    this.backdropUniforms = null;
    this.imageAspect = 16 / 9;

    // 3D Tacir vəziyyəti (real 3D perspektiv döşəməsi üzərində gəzir)
    this.player = {
      group: null,
      pos: new THREE.Vector3(0.0, 0, 4.6),
      yaw: Math.PI, // Arxa tağa/həyətə baxır
      speed: 4.5,
      walkPhase: 0,
      isMoving: false,
      targetPos: null,
      mountedHorse: false,
      parts: { leftLeg: null, rightLeg: null, leftArm: null, rightArm: null, torso: null },
      mixer: null,
      actions: {},
      activeActionName: null,
    };

    // Kamera & 3D Parallaks parametrləri (şəklin göz səviyyəli perspektivinə tam uyğun)
    this.baseCamPos = new THREE.Vector3(0, 2.32, 14.2);
    this.baseLookAt = new THREE.Vector3(0, 1.72, -12.0);
    this.mouseNorm = { x: 0, y: 0 };
    this.smoothParallax = new THREE.Vector2(0, 0);
    this.smoothZoom = 1.0;

    this.dialogueFocus = null;
    this.interactables = [];
    this.interactRings = [];
    this.nearestInteractable = null;
    this.dustPoints = null;
    this.sunBeams = [];
    this.flickerLights = [];
    this.clickRipple = null;
    this.clickRippleLife = 0;

    this.elapsed = 0;
    this.keys = new Set();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.floorMesh = null;
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
    if (target && this.player.group) {
      this.player.targetPos = null;
      const dx = target.npcPos.x - this.player.pos.x;
      const dz = target.npcPos.z - this.player.pos.z;
      this.player.yaw = Math.atan2(dx, dz);
      this.player.group.rotation.y = this.player.yaw;
    }
  }

  // Klassik 3D ilə tam API uyğunluğu üçün metodlar
  setCityWaypoint(wp) {
    if (!wp) {
      this.player.targetPos = null;
      return;
    }
    this._setWalkTarget(wp.x, wp.z);
  }

  toggleMountHorse() {
    this.eventBus.emit('ui:toast', {
      message: 'At sürmə funksiyası «Klassik 3D» rejimində aktivdir — yuxarıdan dəyişə bilərsiniz.',
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
    if (e.button !== 0 || !this.floorMesh || !this.camera || this.dialogueFocus) return;
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
    // Şəkildəki daş döşəmənin sol sütun xətti və sağ meyvə səbətləri arasındakı real trapesiya sərhədi
    const cz = Math.max(-10.2, Math.min(7.2, z));
    // Arxaya getdikcə (-Z) koridor perspektivdə bir az daralır
    const tBack = (7.2 - cz) / 17.4; // 0 (ön) -> 1 (arxa tağ)
    const minX = -4.2 + tBack * 1.15;
    const maxX = 3.3 - tBack * 0.45;
    const cx = Math.max(minX, Math.min(maxX, x));
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

  async mount() {
    this.isMounted = false;
    this.container.innerHTML = '';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0b08);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(43, w / h, 0.2, 120);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    await this._buildDepthParallaxBackdrop();
    this._buildLights();
    this._buildShadowFloorAndAtmosphere();
    this._buildInteractableHotspots();
    await this._buildPlayableMerchant();

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

  async _buildDepthParallaxBackdrop() {
    const base = this.cfg.baseImage;
    const [colorMap, depthMap, normalMap, glowMap] = await Promise.all([
      this._loadTextureSafe(`${base}.jpg`, true),
      this._loadTextureSafe(`${base}_depth.png`, false),
      this._loadTextureSafe(`${base}_normal.png`, false),
      this._loadTextureSafe(`${base}_glow.png`, false),
    ]);

    if (colorMap?.image?.width && colorMap?.image?.height) {
      this.imageAspect = colorMap.image.width / colorMap.image.height;
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
      uColorMap: { value: colorMap || fallbackTex() },
      uDepthMap: { value: depthMap || fallbackTex() },
      uNormalMap: { value: normalMap || fallbackTex() },
      uGlowMap: { value: glowMap || fallbackTex() },
      uParallax: { value: new THREE.Vector2(0, 0) },
      uZoom: { value: 1.0 },
      uAspectRatio: { value: (w / Math.max(1, h)) / this.imageAspect },
      uTime: { value: 0 },
      uPlayerUV: { value: new THREE.Vector2(0.5, 0.25) },
      uPlayerDepth: { value: 0.6 },
      uCityTint: { value: this.cfg.tint.clone() },
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
    // Şəkildəki isti axşamüstü günəş işığı (yuxarı sağdan sol sütunlara düşür)
    const hemi = new THREE.HemisphereLight(this.cfg.ambientSky, this.cfg.ambientGround, 0.92);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(this.cfg.sunColor, 2.25);
    sun.position.set(...this.cfg.sunPos);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    // Sol xalça qalereyası və sağ meyvə/mis köşkündəki titrəyən bürünc fənərlər
    const leftLantern = new THREE.PointLight(0xffa442, 2.2, 13, 1.5);
    leftLantern.position.set(-4.6, 2.6, 1.2);
    this.scene.add(leftLantern);
    this.flickerLights.push({ light: leftLantern, base: 2.2, phase: 0.4 });

    const rightLantern = new THREE.PointLight(0xffa84c, 2.1, 13, 1.5);
    rightLantern.position.set(4.2, 2.5, 2.0);
    this.scene.add(rightLantern);
    this.flickerLights.push({ light: rightLantern, base: 2.1, phase: 2.7 });

    // Arxa tağdan gələn qızılı əks işıq (3D tacirin siluetini kəskinləşdirir)
    const rim = new THREE.DirectionalLight(0xffcb80, 0.85);
    rim.position.set(0, 6, -15);
    this.scene.add(rim);
  }

  _buildShadowFloorAndAtmosphere() {
    // Görünməz 3D kölgə tutucu döşəmə (şəkildəki daşların üstünə canlı 3D kölgə salır)
    const floorGeo = new THREE.PlaneGeometry(24, 34);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.46 });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, 0, -2);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Kliklənən yerin zərif qızılı dairəsi
    const rippleGeo = new THREE.RingGeometry(0.28, 0.42, 28);
    rippleGeo.rotateX(-Math.PI / 2);
    this.clickRipple = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({
        color: 0xe8be6e,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.clickRipple.visible = false;
    this.scene.add(this.clickRipple);

    // Zərif diaqonal günəş şüaları (şəkildəki işıq bucağına uyğun)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd58a,
      transparent: true,
      opacity: 0.045,
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
      this.scene.add(beam);
      this.sunBeams.push(beam);
    }

    // Havada süzülən incə qızılı toz zərrəcikləri
    const count = 110;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10.5;
      positions[i * 3 + 1] = 0.3 + Math.random() * 5.2;
      positions[i * 3 + 2] = -9.5 + Math.random() * 17.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffe2a6,
      size: 0.075,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustPoints);
  }

  _buildInteractableHotspots() {
    const primaryLuxury =
      this.city?.goods?.find((g) => g.item_id === 'carpet' || g.category === 'luxury')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'carpet';
    const primaryAgri =
      this.city?.goods?.find((g) => g.category === 'agriculture')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'pomegranate';

    const defs = [
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
        label: this.cfg.palaceTitle,
        palaceTitle: this.cfg.palaceTitle,
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
        label: this.cfg.gateLabel,
        pos: new THREE.Vector3(0.0, 0, -9.4),
        npcPos: new THREE.Vector3(0.0, 1.6, -12.0),
        radius: 2.9,
        ringColor: 0xf4cf76,
      },
    ];

    for (const def of defs) {
      this.interactables.push(def);

      // Daş döşəmənin üzərində zərif həkk olunmuş bürünc nişan halqası
      const ringGeo = new THREE.RingGeometry(0.68, 0.84, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.ringColor,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(def.pos.x, 0.03, def.pos.z);
      this.scene.add(ring);

      const innerGeo = new THREE.RingGeometry(0.32, 0.38, 24);
      innerGeo.rotateX(-Math.PI / 2);
      const inner = new THREE.Mesh(innerGeo, ringMat.clone());
      inner.position.set(def.pos.x, 0.035, def.pos.z);
      this.scene.add(inner);

      this.interactRings.push({ id: def.id, outer: ring, inner, baseColor: def.ringColor });
    }
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
        const normScale = 1.84 / size.y;
        mesh.scale.multiplyScalar(normScale);
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
      // Yüksək kontrastlı fallback siluet
      mesh = new THREE.Group();
      const coat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.42, 1.35, 14),
        new THREE.MeshStandardMaterial({ color: 0x7b2024, roughness: 0.72 })
      );
      coat.position.y = 0.85;
      coat.castShadow = true;
      mesh.add(coat);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 12),
        new THREE.MeshStandardMaterial({ color: 0xdfb18a, roughness: 0.65 })
      );
      head.position.y = 1.68;
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

    // 1. 3D Tacirin hərəkəti (WASD və ya kliklənmiş nöqtəyə avtomatik gediş)
    let moveX = 0;
    let moveZ = 0;
    const modalBlocking = this.gameManager?.ui?.isInventoryOpen?.() || this.gameManager?.ui?.mapOpen;

    if (!this.dialogueFocus && !modalBlocking) {
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

    // 2. Ən yaxın interaktiv nöqtəni tap (Baş Tacir, Bağban, Saray, Fayton, Çıxış Darvazası)
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

    // İnteraktiv bürünc halqaların incə nəfəsi
    for (const r of this.interactRings) {
      const isNear = best?.id === r.id;
      const pulse = 0.42 + Math.sin(this.elapsed * 2.4) * 0.12;
      r.outer.material.opacity = isNear ? 0.92 : pulse;
      r.outer.scale.setScalar(isNear ? 1.14 : 1.0);
      r.inner.rotation.y = this.elapsed * 0.4;
    }

    // Klik dalğası
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

    // 3. Dinamik fənər işıqlarının titrəməsi & toz zərrəcikləri
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

    // 4. Kamera + GLSL 3D Depth-Parallax sinxronizasiyası!
    // Tacir sağa-sola/irəli getdikcə və siçan hərəkət etdikcə həm 3D kamera, həm də fonun dərinlik şaderi birlikdə sürüşür!
    const targetParX = this.player.pos.x * 0.0052 + this.mouseNorm.x * 0.011;
    const targetParY = -this.mouseNorm.y * 0.0065 + (this.player.pos.z - 2.0) * 0.0008;
    this.smoothParallax.x += (targetParX - this.smoothParallax.x) * Math.min(1, dt * 4.5);
    this.smoothParallax.y += (targetParY - this.smoothParallax.y) * Math.min(1, dt * 4.5);

    const targetZoom = this.dialogueFocus ? 1.075 : 1.0 + Math.max(0, (4.5 - this.player.pos.z) * 0.0035);
    this.smoothZoom += (targetZoom - this.smoothZoom) * Math.min(1, dt * 3.5);

    // 3D kameranın xətti hərəkəti dərinlik şaderinin parallaksına tam bağlanır
    this.camera.position.set(
      this.baseCamPos.x + this.smoothParallax.x * 24.0,
      this.baseCamPos.y - this.smoothParallax.y * 10.0,
      this.baseCamPos.z - (this.smoothZoom - 1.0) * 14.0
    );
    this.camera.lookAt(
      this.baseLookAt.x + this.smoothParallax.x * 6.5,
      this.baseLookAt.y,
      this.baseLookAt.z
    );

    if (this.backdropUniforms) {
      this.backdropUniforms.uTime.value = this.elapsed;
      this.backdropUniforms.uParallax.value.copy(this.smoothParallax);
      this.backdropUniforms.uZoom.value = this.smoothZoom;

      // Tacirin 3D mövqeyini ekran UV koordinatına çevirib dinamik fənər işığını şaderə ötür
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
    this.container.innerHTML = '';
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
