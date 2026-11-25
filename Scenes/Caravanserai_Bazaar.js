import * as THREE from 'three';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

const CITY_THEMES = {
  City_Baku: {
    skyHex: 0xd8c39e,
    fogHex: 0xe2cca4,
    stoneHex: 0xebd7b7,
    trimHex: 0x9c7b50,
    tileHex: 0x2f7496,
    plasterWarmHex: 0xdfcaa4,
    plasterOchreHex: 0xc9a675,
    hasShebeke: false,
    extraTrees: false,
  },
  City_Sheki: {
    skyHex: 0xc5dae0,
    fogHex: 0xd2e1e6,
    stoneHex: 0xc47e62,
    trimHex: 0x5c3422,
    tileHex: 0x9c422c,
    plasterWarmHex: 0xe8d5b8,
    plasterOchreHex: 0xd49b72,
    hasShebeke: true,
    extraTrees: true,
  },
  City_Shusha: {
    skyHex: 0xc9d4df,
    fogHex: 0xd6dfe8,
    stoneHex: 0xbac0c7,
    trimHex: 0x676f78,
    tileHex: 0x264e73,
    plasterWarmHex: 0xdbe0e5,
    plasterOchreHex: 0x9aa3ad,
    hasShebeke: false,
    extraTrees: true,
  },
};

/**
 * Scenes/Caravanserai_Bazaar.js
 * "İRS — Tacirin Yolu" konseptinə uyğun günəşli 3D Tarixi Azərbaycan Karvansarayı:
 * - Oynanıla bilən 3D Tacir (WASD ilə sərbəst yeriyir, addım animasiyası, papaq & naxışlı çuxa)
 * - Çiyinüstü 3D RPG kamerası (siçanla fırlatma + Tacirlə danışanda kinematik konsept bucağı)
 * - Daş tağlı karvansaray həyəti, dalğalanan kölgəliklər, xalça tezgahı, mis səhənglər,
 *   alma/armud səbətləri, Bazar Taciri, Kəndli Bağban, Qoruyucu və Xəritə Çıxış Qapısı.
 */
const CITY_LAYOUTS = {
  City_Baku: {
    spawn: [0, 7.5, Math.PI],
    fountain: [-7.2, 3.2],
    hasMonument: false,
    carpetStall: [0.8, -3.2, 0],
    carpetNpc: [0.9, -4.6, 0],
    carpetInteract: [0.8, -2.1],
    fruitStall: [-4.8, -1.8, 0],
    fruitNpc: [-5.2, -3.2, 0.35],
    fruitInteract: [-4.5, -0.6],
  },
  City_Sheki: {
    spawn: [5.0, 7.2, Math.PI + 0.35],
    fountain: [0.0, 2.2],
    hasMonument: false,
    carpetStall: [-5.0, -2.8, 0.35],
    carpetNpc: [-5.4, -4.2, 0.35],
    carpetInteract: [-4.5, -1.6],
    fruitStall: [5.0, -2.0, -0.3],
    fruitNpc: [5.4, -3.4, -0.35],
    fruitInteract: [4.5, -0.8],
  },
  City_Shusha: {
    spawn: [-4.8, 7.2, Math.PI - 0.35],
    fountain: [0.0, 2.0],
    hasMonument: true,
    carpetStall: [4.8, -2.8, -0.35],
    carpetNpc: [5.2, -4.2, -0.35],
    carpetInteract: [4.3, -1.6],
    fruitStall: [-5.0, 1.6, 0.35],
    fruitNpc: [-5.6, 0.2, 0.35],
    fruitInteract: [-4.2, 2.2],
  },
};

export class CaravanseraiBazaarScene {
  constructor(container, eventBus, data, gameManager, cityId = 'City_Baku') {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.gameManager = gameManager;
    this.cityId = cityId;
    this.city = data.getCityById(cityId) || data.cities[0];
    this.cityLayout = CITY_LAYOUTS[cityId] || CITY_LAYOUTS.City_Baku;
    this.modelLoader = new ModelLoader();

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // 3D Tacir vəziyyəti
    const [sx, sz, syaw] = this.cityLayout.spawn;
    this.player = {
      group: null,
      pos: new THREE.Vector3(sx, 0, sz),
      yaw: syaw,
      speed: 5.2,
      walkPhase: 0,
      isMoving: false,
      parts: { leftLeg: null, rightLeg: null, leftArm: null, rightArm: null, torso: null },
      mixer: null,
      actions: {},
      activeActionName: null,
    };

    // Kamera (3-cü şəxs RPG + söhbət çiyinüstü rejimi)
    this.camYaw = 0; // 0 = -Z istiqamətinə baxır
    this.camPitch = 0.24;
    this.camPos = new THREE.Vector3(1.6, 3.2, 12.2);
    this.camLook = new THREE.Vector3(0, 1.5, 0);
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    // Söhbət fokus rejimi ("İRS" konsept çərçivəsi)
    this.dialogueFocus = null; // { npcPos: Vector3, stallFilter: string }

    // İnteraktiv obyektlər & animasiyalar
    this.interactables = [];
    this.nearestInteractable = null;
    this.canopies = [];
    this.animatedNPCs = [];
    this.dustPoints = null;
    this.elapsed = 0;
    this.keys = new Set();

    // Kadr-başına yaddaş ayırmamaq üçün təkrar istifadə olunan vektorlar
    this._tmpForward = new THREE.Vector3();
    this._tmpRight = new THREE.Vector3();
    this._tmpDesiredPos = new THREE.Vector3();
    this._tmpDesiredLook = new THREE.Vector3();
    this._tmpDir = new THREE.Vector3();

    this._onResize = () => this._handleResize();
    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => {
      this.keys.clear();
      this.isDragging = false;
    };
    this._onPointerDown = (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    };
    this._onPointerMove = (e) => {
      if (!this.isDragging || this.dialogueFocus) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.camYaw -= dx * 0.0065;
      this.camPitch = Math.max(0.06, Math.min(0.62, this.camPitch + dy * 0.0045));
    };
    this._onPointerUp = () => {
      this.isDragging = false;
    };
    this._onContextMenu = (e) => e.preventDefault();
  }

  getNearestInteractable() {
    return this.nearestInteractable;
  }

  setCityWaypoint(wp) {
    if (!this.scene) return;
    if (!wp) {
      if (this.waypointBeacon) {
        this.waypointBeacon.visible = false;
      }
      return;
    }
    if (!this.waypointBeacon) {
      const geo = new THREE.CylinderGeometry(0.18, 0.32, 4.5, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf3cf70,
        transparent: true,
        opacity: 0.45,
      });
      this.waypointBeacon = new THREE.Mesh(geo, mat);
      this.scene.add(this.waypointBeacon);
    }
    this.waypointBeacon.position.set(wp.x, 2.25, wp.z);
    this.waypointBeacon.visible = true;
  }

  setDialogueFocus(target) {
    this.dialogueFocus = target;
    if (target && this.player.group) {
      // Tacir söhbət etdiyi şəxsə tərəf dönsün
      const dx = target.npcPos.x - this.player.pos.x;
      const dz = target.npcPos.z - this.player.pos.z;
      this.player.yaw = Math.atan2(dx, dz);
      this.player.group.rotation.y = this.player.yaw;
    }
  }

  _handleKeyDown(e) {
    const code = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ'].includes(code)) {
      this.keys.add(code);
    }
  }

  async mount() {
    this.container.innerHTML = '';

    const theme = CITY_THEMES[this.cityId] || CITY_THEMES.City_Baku;
    this.cityTheme = theme;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.skyHex);
    this.scene.fog = new THREE.FogExp2(theme.fogHex, 0.013);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.2, 180);
    this.camera.position.copy(this.camPos);

    const perfMode = localStorage.getItem('karva_perf_mode') || 'fast';
    this.renderer = new THREE.WebGLRenderer({ antialias: perfMode !== 'fast', powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(perfMode === 'fast' ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = perfMode !== 'fast';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.container.appendChild(this.renderer.domElement);

    this._buildSkyAndLighting();
    await this._buildCourtyardFloor();
    await this._buildCaravanseraiArchitecture();
    this._buildHangingCanopies();
    this._buildFloatingDust();
    await this._buildBazaarStallsAndProps();
    await this._buildPlayableMerchant();

    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    dom.addEventListener('contextmenu', this._onContextMenu);
  }

  _buildSkyAndLighting() {
    // Qızılı günəşli göy günbəzi
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 64;
    skyCanvas.height = 256;
    const sctx = skyCanvas.getContext('2d');
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#4f86b8');
    grad.addColorStop(0.55, '#9ec3db');
    grad.addColorStop(0.82, '#f2d39c');
    grad.addColorStop(1, '#e8b976');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(115, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
    );
    this.scene.add(sky);

    // Real fotoskan səma (Yüksək rejimdə PMREM mühit əksi aktivdir, Sürətli rejimdə donmasız fon)
    new THREE.TextureLoader().load('./images/sky_puresky.jpg', (eqTex) => {
      if (!this.scene || !this.renderer) return;
      eqTex.mapping = THREE.EquirectangularReflectionMapping;
      eqTex.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = eqTex;
      const perfMode = localStorage.getItem('karva_perf_mode') || 'fast';
      if (perfMode !== 'fast') {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromEquirectangular(eqTex).texture;
        this.scene.environmentIntensity = 0.6;
        pmrem.dispose();
      }
    });

    const hemi = new THREE.HemisphereLight(0xfff1d4, 0x805d3b, 0.95);
    this.scene.add(hemi);

    // İsti günorta-axşamüstü günəş işığı (karvansaray tağlarından kölgələr)
    const sun = new THREE.DirectionalLight(0xffe2ad, 2.0);
    sun.position.set(18, 28, 16);
    sun.castShadow = true;
    const perfMode = localStorage.getItem('karva_perf_mode') || 'fast';
    const smSize = perfMode === 'fast' ? 512 : 1024;
    sun.shadow.mapSize.set(smSize, smSize);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.0005;
    this.sunLight = sun;
    this.scene.add(sun);

    // Bazar tezgahına isti əks işıq
    const warmFill = new THREE.PointLight(0xffb85c, 1.6, 18);
    warmFill.position.set(0, 3.8, -1.5);
    this.scene.add(warmFill);
  }

  _createCobblestoneTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, 0, size, size);

    let seed = 77;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const rows = 10;
    const cols = 8;
    const rh = size / rows;
    const cw = size / cols;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + offset + 3;
        const y = r * rh + 3;
        const shade = 165 + Math.floor((rand() - 0.5) * 44);
        const warmR = Math.min(255, shade + 24);
        const warmG = Math.min(255, shade + 8);
        const warmB = Math.max(80, shade - 22);
        ctx.fillStyle = `rgb(${warmR},${warmG},${warmB})`;
        ctx.beginPath();
        ctx.roundRect(x, y, cw - 6, rh - 6, 8);
        ctx.fill();

        ctx.strokeStyle = 'rgba(78, 56, 36, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(9, 9);
    return tex;
  }

  _createSandstoneTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c8aa7e';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 32) {
      const off = ((y / 32) % 2) * 32;
      for (let x = -32; x < size; x += 64) {
        const delta = ((x * 7 + y * 13) % 24) - 12;
        ctx.fillStyle = `rgb(${205 + delta}, ${178 + delta}, ${134 + delta})`;
        ctx.fillRect(x + off + 2, y + 2, 60, 28);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    return tex;
  }

  async _buildCourtyardFloor() {
    const pbrOpts = await this.modelLoader.loadPBRMaterialOptions(
      'cobblestone',
      'cobblestone_floor_08',
      26,
      26
    );
    const floorMat = pbrOpts
      ? new THREE.MeshStandardMaterial({ ...pbrOpts, roughness: 0.92, metalness: 0.04 })
      : new THREE.MeshStandardMaterial({
          map: this._createCobblestoneTexture(),
          roughness: 0.9,
          metalness: 0.04,
        });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Həyətdə şəhərə uyğun mərkəzi abidə və ya fəvvarə hovuzu
    const [fx, fz] = this.cityLayout.fountain;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbda178, roughness: 0.85 });
    if (this.cityLayout.hasMonument) {
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.9, 8), stoneMat);
      plinth.position.set(fx, 0.45, fz);
      this.scene.add(plinth);
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.72, 3.6, 8), stoneMat);
      obelisk.position.set(fx, 2.6, fz);
      this.scene.add(obelisk);
      const cap = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({ color: 0xc9963b, metalness: 0.7, roughness: 0.35 })
      );
      cap.position.set(fx, 4.75, fz);
      this.scene.add(cap);
    } else {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.55, 0.65, 8), stoneMat);
      basin.position.set(fx, 0.32, fz);
      this.scene.add(basin);

      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(1.95, 1.95, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x3b8ea5, roughness: 0.15, metalness: 0.25 })
      );
      water.position.set(fx, 0.56, fz);
      this.scene.add(water);
    }
  }

  /**
   * İkimərtəbəli daş tağlı Karvansaray divarları, mavi kaşı bəzəkləri, günbəz və çıxış qapısı
   */
  async _buildCaravanseraiArchitecture() {
    const [pbrWall, pbrWood, pbrCeramic] = await Promise.all([
      this.modelLoader.loadPBRMaterialOptions('stone_wall', 'coral_stone_wall', 2.2, 1.8),
      this.modelLoader.loadPBRMaterialOptions('wood', 'medieval_wood', 2.0, 2.0),
      this.modelLoader.loadPBRMaterialOptions('ceramic', 'ceramic_roof_01', 2.5, 2.5),
    ]);
    const theme = this.cityTheme || CITY_THEMES.City_Baku;
    const stoneMat = pbrWall
      ? new THREE.MeshStandardMaterial({ ...pbrWall, color: theme.stoneHex, roughness: 0.88 })
      : new THREE.MeshStandardMaterial({ map: this._createSandstoneTexture(), color: theme.stoneHex, roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: theme.trimHex, roughness: 0.8 });
    const tileMat = pbrCeramic
      ? new THREE.MeshStandardMaterial({ ...pbrCeramic, color: theme.tileHex, roughness: 0.35, metalness: 0.12 })
      : new THREE.MeshStandardMaterial({ color: theme.tileHex, roughness: 0.35, metalness: 0.15 });
    const woodDoorMat = pbrWood
      ? new THREE.MeshStandardMaterial({ ...pbrWood, roughness: 0.82 })
      : new THREE.MeshStandardMaterial({ color: 0x4f2e17, roughness: 0.85 });
    this._sharedWoodMat = woodDoorMat;
    this._sharedTileMat = tileMat;
    this._sharedStoneMat = stoneMat;
    this._sharedTrimMat = trimMat;

    const buildArcadeWall = (length, posX, posZ, rotY, hasGate = false) => {
      const group = new THREE.Group();
      group.position.set(posX, 0, posZ);
      group.rotation.y = rotY;

      const bayCount = 5;
      const bayWidth = length / bayCount;

      // Arxa divar (qapı yerində açıq)
      for (let i = 0; i < bayCount; i++) {
        const bx = -length / 2 + bayWidth * (i + 0.5);
        const isCenter = hasGate && i === 2;

        // Sütun
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.6, 1.1), stoneMat);
        pillar.position.set(bx - bayWidth / 2, 3.8, 0);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        group.add(pillar);

        // 1-ci mərtəbə tağ üstü & 2-ci mərtəbə eyvanı
        const beam1 = new THREE.Mesh(new THREE.BoxGeometry(bayWidth, 1.15, 1.05), stoneMat);
        beam1.position.set(bx, 4.1, 0);
        beam1.castShadow = true;
        group.add(beam1);

        const beam2 = new THREE.Mesh(new THREE.BoxGeometry(bayWidth, 1.1, 1.05), trimMat);
        beam2.position.set(bx, 7.3, 0);
        beam2.castShadow = true;
        group.add(beam2);

        // Mavi-qızılı kaşı ornament zolağı (Şamaxı/Şirvan üslubu)
        const tileStrip = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.6, 0.35, 1.12), tileMat);
        tileStrip.position.set(bx, 4.4, 0);
        group.add(tileStrip);

        if (!isCenter) {
          const backWall = new THREE.Mesh(new THREE.BoxGeometry(bayWidth, 7.5, 0.6), stoneMat);
          backWall.position.set(bx, 3.75, -2.4);
          backWall.receiveShadow = true;
          group.add(backWall);
        } else {
          // Karvansaray böyük çıxış qapısı (Qədim Xəritəyə çıxış)
          const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.6, 0.25), woodDoorMat);
          doorL.position.set(bx - 1.65, 1.8, -0.6);
          doorL.rotation.y = 0.45;
          group.add(doorL);

          const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.6, 0.25), woodDoorMat);
          doorR.position.set(bx + 1.65, 1.8, -0.6);
          doorR.rotation.y = -0.45;
          group.add(doorR);
        }
      }

      // Son sütun
      const endPillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.6, 1.1), stoneMat);
      endPillar.position.set(length / 2, 3.8, 0);
      endPillar.castShadow = true;
      group.add(endPillar);

      this.scene.add(group);
    };

    // 4 tərəfli karvansaray həyəti (Şimalda Şah / Xan Sarayına açılan tağ, Cənubda Çöl Bazara çıxış!)
    buildArcadeWall(26, 0, -11, 0, true); // Şimal (Şah / Xan Sarayına giriş tağı!)
    buildArcadeWall(26, 0, 14, Math.PI, true); // Cənub (Çöl Bazara çıxış qapısı!)
    buildArcadeWall(25, -13, 1.5, Math.PI / 2, false); // Qərb
    buildArcadeWall(25, 13, 1.5, -Math.PI / 2, false); // Şərq

    // Şimal tağından girilən Şah / Xan Sarayı Həyəti və Qəbul Zalı (z = -12 .. -26)
    await this._buildEnterablePalace(stoneMat, trimMat, tileMat, woodDoorMat);

    // Şəki şəhərində 2-ci mərtəbə taxta Şəbəkə vitraj pəncərələri
    if (theme.hasShebeke) {
      const shebekeColors = [0xb8292f, 0x225c8a, 0xd69b27, 0x276e45];
      for (let i = -9; i <= 9; i += 4.5) {
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 1.45, 0.12),
          new THREE.MeshStandardMaterial({
            color: shebekeColors[Math.abs(Math.round(i)) % shebekeColors.length],
            emissive: 0x221208,
            roughness: 0.25,
            metalness: 0.15,
          })
        );
        glass.position.set(i, 5.75, -10.45);
        this.scene.add(glass);
      }
    }

    // Mini-xəritədəki Qərb Bağça Həyəti (x = -24..-14, z = -9..12, ortada 8-bucaqlı firuzəyi fəvvarə!)
    const gardenGroup = new THREE.Group();
    const gardenFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 22),
      new THREE.MeshStandardMaterial({ color: 0x4b6b38, roughness: 0.95 })
    );
    gardenFloor.rotation.x = -Math.PI / 2;
    gardenFloor.position.set(-19.5, 0.02, 1.5);
    gardenFloor.receiveShadow = true;
    gardenGroup.add(gardenFloor);

    const gWallW = new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.2, 24), stoneMat);
    gWallW.position.set(-25.2, 2.6, 1.5);
    gWallW.castShadow = true;
    gardenGroup.add(gWallW);
    for (const gz of [-10.5, 13.5]) {
      const gWallNS = new THREE.Mesh(new THREE.BoxGeometry(12.5, 5.2, 1.0), stoneMat);
      gWallNS.position.set(-19.5, 2.6, gz);
      gWallNS.castShadow = true;
      gardenGroup.add(gWallNS);
    }

    const gBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.6, 8), stoneMat);
    gBasin.position.set(-19.2, 0.3, 1.5);
    gardenGroup.add(gBasin);
    const gWater = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b8ea5, roughness: 0.15, metalness: 0.25 })
    );
    gWater.position.set(-19.2, 0.54, 1.5);
    gardenGroup.add(gWater);
    this.scene.add(gardenGroup);

    // Arxa planda tarixi günbəz, minarə və yaşıl sərv ağacları
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 3.8, 16), stoneMat);
    domeBase.position.set(-7, 9.2, -16);
    this.scene.add(domeBase);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      tileMat
    );
    dome.position.set(-7, 11.1, -16);
    this.scene.add(dome);

    // Yüngül və təbii görünüşlü prosedural 3D sərv / çinar ağacları (performanslı, paylaşılan geometriya)
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x523824, roughness: 0.92 });
    const cypressLeafMatA = new THREE.MeshStandardMaterial({ color: 0x2d5430, roughness: 0.88 });
    const cypressLeafMatB = new THREE.MeshStandardMaterial({ color: 0x386336, roughness: 0.88 });
    const broadLeafMatA = new THREE.MeshStandardMaterial({ color: 0x456e35, roughness: 0.86 });
    const broadLeafMatB = new THREE.MeshStandardMaterial({ color: 0x567d3b, roughness: 0.86 });
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 1.0, 7);
    const foliageGeo = new THREE.DodecahedronGeometry(1.0, 1);

    this._placeNormalizedTree = async (modelName, x, z, targetHeight = 9.0, rotY = 0) => {
      const tree = new THREE.Group();
      const isFir = modelName === 'fir_tree_01';
      const trunkH = targetHeight * (isFir ? 0.24 : 0.42);
      const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
      trunk.scale.set(targetHeight * 0.085, trunkH, targetHeight * 0.085);
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      tree.add(trunk);

      if (isFir) {
        // Şərq/Azərbaycan sərv ağacı (çoxqatlı üzvi ellipsoid/dodekaedr klasteri)
        const tiers = 5;
        for (let i = 0; i < tiers; i++) {
          const t = i / (tiers - 1);
          const rad = targetHeight * (0.14 - t * 0.075);
          const hScale = targetHeight * (0.22 - t * 0.04);
          const clump = new THREE.Mesh(foliageGeo, i % 2 === 0 ? cypressLeafMatA : cypressLeafMatB);
          clump.scale.set(rad, hScale, rad);
          clump.position.set(
            Math.sin(i * 2.1 + rotY) * rad * 0.14,
            trunkH * 0.9 + i * (targetHeight * 0.145),
            Math.cos(i * 2.1 + rotY) * rad * 0.14
          );
          clump.rotation.set(i * 0.3, i * 0.9, 0);
          clump.castShadow = true;
          tree.add(clump);
        }
      } else {
        // Geniş çətirli çinar / bağ ağacı
        const mainRad = targetHeight * 0.27;
        const offsets = [
          [0, 0.62, 0, 1.12, 0.82, 1.08, broadLeafMatA],
          [0.52, 0.36, 0.28, 0.72, 0.64, 0.72, broadLeafMatB],
          [-0.48, 0.42, -0.25, 0.68, 0.62, 0.7, broadLeafMatB],
          [0.12, 0.95, -0.15, 0.62, 0.55, 0.62, broadLeafMatA],
        ];
        for (const [ox, oy, oz, sx, sy, sz, mat] of offsets) {
          const crown = new THREE.Mesh(foliageGeo, mat);
          crown.scale.set(mainRad * sx, mainRad * sy, mainRad * sz);
          crown.position.set(mainRad * ox, trunkH + mainRad * oy, mainRad * oz);
          crown.rotation.y = ox * 2.3;
          crown.castShadow = true;
          tree.add(crown);
        }
      }

      tree.position.set(x, 0, z);
      tree.rotation.y = rotY;
      this.scene.add(tree);
    };

    const treeSpecs = [
      { model: 'fir_tree_01', x: -11, z: -15, h: 10.5, rot: 0.3 },
      { model: 'island_tree_01', x: -2, z: -16, h: 9.5, rot: 1.1 },
      { model: 'fir_tree_01', x: 9, z: -15, h: 11.0, rot: 2.2 },
      { model: 'island_tree_01', x: 16, z: -6, h: 9.5, rot: 0.7 },
      { model: 'fir_tree_01', x: -16, z: -4, h: 10.0, rot: 1.8 },
    ];
    for (const ts of treeSpecs) {
      await this._placeNormalizedTree(ts.model, ts.x, ts.z, ts.h, ts.rot);
    }

    // Çöl karvan yolunun sonunda Qədim 3D Xəritəyə çıxış nişanı (z = 37)
    this.interactables.push({
      id: 'gate_world_map',
      type: 'exit_to_map',
      label: 'Qədim 3D Xəritəyə Çıx (Karvan Yolu)',
      pos: new THREE.Vector3(0, 0, 36.5),
      radius: 3.8,
    });
  }

  _buildHangingCanopies() {
    const colors = [0x993824, 0xc7944e, 0x802a1d, 0xd4b27a];
    const positions = [
      { x: -4.5, y: 5.5, z: -4.5, w: 9, d: 3.6, rot: 0.14 },
      { x: 4.5, y: 5.7, z: -3.2, w: 9, d: 3.4, rot: -0.1 },
      { x: -2.0, y: 5.8, z: 3.5, w: 11, d: 3.2, rot: 0.08 },
      { x: 5.5, y: 5.4, z: 5.5, w: 8.5, d: 3.2, rot: -0.12 },
    ];

    positions.forEach((p, idx) => {
      const geo = new THREE.PlaneGeometry(p.w, p.d, 10, 4);
      geo.rotateX(-Math.PI / 2);
      const posAttr = geo.attributes.position;
      // Ortadan yumşaq sallanma (parça effekti)
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i) / (p.w / 2);
        const vz = posAttr.getZ(i) / (p.d / 2);
        posAttr.setY(i, -0.45 * (1 - vx * vx) * (1 - vz * vz * 0.4));
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: colors[idx % colors.length],
          side: THREE.DoubleSide,
          roughness: 0.85,
        })
      );
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.rot;
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.canopies.push({ mesh, baseY: p.y, phase: idx * 1.4 });
    });
  }

  _buildFloatingDust() {
    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = 0.6 + Math.random() * 6.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffe4a8,
        size: 0.08,
        transparent: true,
        opacity: 0.55,
      })
    );
    this.scene.add(this.dustPoints);
  }

  /**
   * Konsept şəklinizdəki əsas Xalça Tezgahı + Mis Səhənglər + Alma/Armud Səbətləri
   * + Bazar Taciri, Bağban NPC və Qoruyucu
   */
  /**
   * Qalınlığı, parça dalğası, toxunuş bump-ı və saçaqları olan real 3D xalça yaradır.
   */
  _create3DCarpetMesh(width, height, mapTex, bumpTex, { withRod = false, withFringe = true, drapeAmp = 0.045 } = {}) {
    const group = new THREE.Group();
    const thickness = 0.036;
    const geom = new THREE.BoxGeometry(width, height, thickness, 16, 20, 1);

    // Təbii parça sallanma dalğası (yuxarıdan asılan xalça kimi)
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const normY = (height * 0.5 - vy) / height; // 0 (üst) -> 1 (alt)
      const wave = Math.sin(vx * 2.4 + 0.5) * drapeAmp * normY + Math.cos(vy * 3.1) * (drapeAmp * 0.35) * normY;
      pos.setZ(i, pos.getZ(i) + wave);
    }
    geom.computeVertexNormals();

    const carpetMat = new THREE.MeshStandardMaterial({
      map: mapTex,
      bumpMap: bumpTex || null,
      bumpScale: bumpTex ? 0.038 : 0,
      roughness: 0.92,
      metalness: 0.0,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x3b2316,
      bumpMap: bumpTex || null,
      bumpScale: bumpTex ? 0.02 : 0,
      roughness: 0.95,
    });
    const mesh = new THREE.Mesh(geom, [edgeMat, edgeMat, edgeMat, edgeMat, carpetMat, carpetMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (withRod) {
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x422613, roughness: 0.75 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9963b, roughness: 0.3, metalness: 0.85 });
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, width + 0.28, 12), rodMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, height * 0.5 + 0.03, 0);
      rod.castShadow = true;
      group.add(rod);

      for (const side of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), brassMat);
        cap.position.set(side * (width * 0.5 + 0.16), height * 0.5 + 0.03, 0);
        group.add(cap);
      }
    }

    if (withFringe) {
      const fringeMat = new THREE.MeshStandardMaterial({ color: 0xe6dac1, roughness: 0.96 });
      const count = Math.max(12, Math.floor(width * 14));
      const step = (width * 0.94) / count;
      const fringeGeom = new THREE.BoxGeometry(0.022, 0.11, 0.014);
      for (let i = 0; i <= count; i++) {
        const fx = -width * 0.47 + i * step;
        const fz = Math.sin(fx * 2.4 + 0.5) * drapeAmp;
        const tassel = new THREE.Mesh(fringeGeom, fringeMat);
        tassel.position.set(fx, -height * 0.5 - 0.05, fz);
        tassel.rotation.z = Math.sin(i * 1.7) * 0.08;
        group.add(tassel);
      }
    }

    return group;
  }

  async _buildBazaarStallsAndProps() {
    const carpetVariant = this.city?.carpet_variant || 'karabakh';
    const [mainCarpetTex, secondCarpetTex, thirdCarpetTex, ganjaCarpetTex, weaveBumpTex] = await Promise.all([
      this.modelLoader.loadCarpetTexture(carpetVariant),
      this.modelLoader.loadCarpetTexture('quba'),
      this.modelLoader.loadCarpetTexture('shirvan'),
      this.modelLoader.loadCarpetTexture('ganja'),
      this.modelLoader.loadCarpetWeaveBump(),
    ]);

    const woodMat = this._sharedWoodMat || new THREE.MeshStandardMaterial({ color: 0x5c361a, roughness: 0.85 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xc27738, roughness: 0.3, metalness: 0.82 });

    // --- 1. ƏSAS XALÇA TEZGAHI (şəhər planına uyğun mövqedə) ---
    const [csx, csz, csRot] = this.cityLayout.carpetStall;
    const stallGroup = new THREE.Group();
    stallGroup.position.set(csx, 0, csz);
    stallGroup.rotation.y = csRot;

    const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 1.75), woodMat);
    table.position.y = 0.52;
    table.castShadow = true;
    table.receiveShadow = true;
    stallGroup.add(table);

    // Tezgahın üstünə sərilmiş böyük naxışlı 3D Azərbaycan xalçası
    const drapedCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 0.06, 2.15),
      new THREE.MeshStandardMaterial({
        map: mainCarpetTex,
        bumpMap: weaveBumpTex || null,
        bumpScale: weaveBumpTex ? 0.035 : 0,
        roughness: 0.92,
      })
    );
    drapedCarpet.position.set(0, 1.07, 0.16);
    drapedCarpet.rotation.x = 0.08;
    drapedCarpet.castShadow = true;
    drapedCarpet.receiveShadow = true;
    stallGroup.add(drapedCarpet);

    // Ön tərəfdən sallanan saçaqlı 3D xalça hissəsi
    const frontHang = this._create3DCarpetMesh(3.3, 0.95, mainCarpetTex, weaveBumpTex, {
      withRod: false,
      withFringe: true,
      drapeAmp: 0.025,
    });
    frontHang.position.set(0, 0.61, 1.21);
    stallGroup.add(frontHang);

    // Arxa divardan asılan əlavə 2 fərqli bölgənin real 3D xalçası (Quba & Şirvan)
    const wallCarpet1 = this._create3DCarpetMesh(2.2, 3.2, secondCarpetTex, weaveBumpTex, {
      withRod: true,
      withFringe: true,
      drapeAmp: 0.055,
    });
    wallCarpet1.position.set(2.8, 2.8, -1.6);
    wallCarpet1.rotation.y = -0.35;
    stallGroup.add(wallCarpet1);

    const wallCarpet2 = this._create3DCarpetMesh(2.0, 2.9, thirdCarpetTex, weaveBumpTex, {
      withRod: true,
      withFringe: true,
      drapeAmp: 0.05,
    });
    wallCarpet2.position.set(-2.5, 2.7, -1.7);
    wallCarpet2.rotation.y = 0.3;
    stallGroup.add(wallCarpet2);

    // Bükülmüş naxışlı 3D xalça rulonları
    const rollTextures = [mainCarpetTex, secondCarpetTex, thirdCarpetTex, ganjaCarpetTex];
    rollTextures.forEach((rTex, i) => {
      const roll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 1.28, 16),
        new THREE.MeshStandardMaterial({
          map: rTex,
          bumpMap: weaveBumpTex || null,
          bumpScale: weaveBumpTex ? 0.03 : 0,
          roughness: 0.9,
        })
      );
      roll.rotation.z = Math.PI / 2;
      roll.position.set(1.9, 1.2 + i * 0.28, -0.35);
      roll.castShadow = true;
      roll.receiveShadow = true;
      stallGroup.add(roll);
    });

    // Ön sağda parlayan Mis və Saxsı Səhənglər (Poly Haven CC0 .glb varsa yalnız onu göstər)
    const glbJugs = await this.modelLoader.loadOptionalGLB('prop_copper_jugs', 1.35);
    if (glbJugs) {
      glbJugs.position.set(1.65, 0, 1.55);
      stallGroup.add(glbJugs);
    } else {
      for (const [jx, jz, sc] of [
        [1.1, 1.55, 1.0],
        [1.65, 1.4, 1.25],
        [2.1, 1.65, 0.85],
      ]) {
        const jug = new THREE.Group();
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28 * sc, 14, 12), copperMat);
        belly.position.y = 0.34 * sc;
        belly.scale.set(1, 1.2, 1);
        belly.castShadow = true;
        jug.add(belly);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * sc, 0.14 * sc, 0.42 * sc, 10), copperMat);
        neck.position.y = 0.75 * sc;
        jug.add(neck);

        jug.position.set(jx, 0, jz);
        stallGroup.add(jug);
      }
    }

    this.scene.add(stallGroup);

    // Poly Haven real 3D fənər, antik saxsı vaza və mis qablar
    const [lanternTable, antiqueVase, brassPot] = await Promise.all([
      this.modelLoader.loadOptionalGLB('Lantern_01', 1.25),
      this.modelLoader.loadOptionalGLB('antique_ceramic_vase_01', 1.5),
      this.modelLoader.loadOptionalGLB('brass_pot_01', 1.35),
    ]);
    if (lanternTable) {
      lanternTable.position.set(-0.65, 1.08, -2.55);
      this.scene.add(lanternTable);
    }
    if (antiqueVase) {
      antiqueVase.position.set(-1.35, 0, -2.05);
      this.scene.add(antiqueVase);
    }
    if (brassPot) {
      brassPot.position.set(2.35, 0, -1.95);
      this.scene.add(brassPot);
    }

    // --- BAZAR TACİRİ NPC (Hər biri fərqli geyim, saqqal/çalma/qalxan aksesuarlı real 3D insan) ---
    this.npcMixers = [];
    this.minimapMarkers = [];
    const spawnRealNPC = async ({ coatHex, sashHex, pos, rotY, phase = 0, role = 'merchant' }) => {
      const customName =
        role === 'guard'
          ? 'guard_turnaround'
          : role === 'elder'
            ? 'elder_turnaround'
            : role === 'farmer'
              ? 'farmer_turnaround'
              : role === 'merchant'
                ? 'craftsman_turnaround'
                : null;
      const customModel = customName ? await this.modelLoader.loadAnimatedGLB(customName, 1.05) : null;
      const loaded = customModel || (await this.modelLoader.loadAnimatedGLB('merchant_hero', 1.05));
      if (loaded?.model) {
        const npc = loaded.model;
        if (!customModel) {
          const targetCoat = new THREE.Color(coatHex);
          const targetSash = new THREE.Color(sashHex);
          let headBone = null;
          let hipsBone = null;

          npc.traverse((obj) => {
            if (obj.isBone) {
              if (obj.name === 'Head') headBone = obj;
              if (obj.name === 'Hips') hipsBone = obj;
            }
            if (!obj.isMesh || !obj.material) return;
            const oName = (obj.name || '').toLowerCase();
            if (['guard', 'elder', 'farmer', 'merchant'].includes(role) && oName.includes('papaq')) {
              obj.visible = false;
              return;
            }
            const mat = obj.material.clone();
            const mName = (mat.name || '').toLowerCase();

            if (role === 'guard') {
              if (mName.includes('chukha') || oName.includes('chukha') || oName.includes('sleeve')) {
                mat.color.setHex(0x889098);
                mat.metalness = 0.52;
                mat.roughness = 0.45;
              } else if (mName.includes('arkh') || oName.includes('arkh')) {
                mat.color.setHex(0x466873);
                mat.roughness = 0.85;
              } else if (mName.includes('qursaq') || oName.includes('qursaq')) {
                mat.color.setHex(0x4a3121);
              }
            } else if (role === 'elder') {
              // Tünd göy naxışlı çuxa, tünd qırmızı alt geyim, qızılı-oxra qurşaq
              if (mName.includes('chukha') || oName.includes('chukha') || oName.includes('sleeve')) {
                mat.color.setHex(0x283652);
              } else if (mName.includes('arkh') || oName.includes('arkh')) {
                mat.color.setHex(0x6e2428);
              } else if (mName.includes('qursaq') || oName.includes('qursaq')) {
                mat.color.setHex(0xc99c4a);
              }
            } else if (role === 'farmer') {
              // Zeytun-yaşıl jilet, terrakota don, krem önlük
              if (mName.includes('chukha') || oName.includes('chukha')) {
                mat.color.setHex(0x4f5b38);
              } else if (oName.includes('sleeve') || mName.includes('arkh') || oName.includes('arkh')) {
                mat.color.setHex(0x9e533c);
              } else if (mName.includes('qursaq') || oName.includes('qursaq')) {
                mat.color.setHex(0xe3d6be);
              }
            } else if (role === 'merchant') {
              // Usta/tacir: boz-göy jilet, krem qollar, köhnə dəri önlük
              if (mName.includes('chukha') || oName.includes('chukha')) {
                mat.color.setHex(0x3f4957);
              } else if (oName.includes('sleeve') || mName.includes('arkh') || oName.includes('arkh')) {
                mat.color.setHex(0xd9ccb4);
              } else if (mName.includes('qursaq') || oName.includes('qursaq')) {
                mat.color.setHex(0x784a2a);
              }
            } else if (mName.includes('sash') || mName.includes('belt') || mName.includes('trim') || oName.includes('sash')) {
              mat.color.lerp(targetSash, 0.8);
            } else if (
              !mName.includes('skin') &&
              !mName.includes('face') &&
              !mName.includes('hair') &&
              !mName.includes('beard') &&
              !mName.includes('boot')
            ) {
              mat.color.lerp(targetCoat, 0.65);
            }
            obj.material = mat;
          });

          // Roluna görə baş geyimi və aksesuarlar (Head & Hips sümüklərinə bağlı)
          if (role === 'guard' && headBone) {
            const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, metalness: 0.78, roughness: 0.3 });
            const mailMat = new THREE.MeshStandardMaterial({ color: 0x6b727a, metalness: 0.6, roughness: 0.48 });

            const helmetDome = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.22, 16), steelMat);
            helmetDome.position.set(0, 0.19, 0.0);
            headBone.add(helmetDome);

            const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.018, 0.06, 8), steelMat);
            spire.position.set(0, 0.31, 0.0);
            headBone.add(spire);

            const aventail = new THREE.Mesh(
              new THREE.CylinderGeometry(0.118, 0.135, 0.14, 14, 1, true, Math.PI * 0.2, Math.PI * 1.6),
              mailMat
            );
            aventail.material.side = THREE.DoubleSide;
            aventail.position.set(0, 0.06, -0.01);
            headBone.add(aventail);
          } else if (role === 'elder' && headBone) {
            const turbanMat = new THREE.MeshStandardMaterial({ color: 0xebe0c8, roughness: 0.82 });
            const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.045, 12, 22), turbanMat);
            wrap.rotation.x = Math.PI / 2 - 0.08;
            wrap.position.set(0, 0.135, 0.005);
            headBone.add(wrap);

            const crown = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), turbanMat);
            crown.position.set(0, 0.145, 0);
            crown.scale.set(0.95, 0.78, 1.0);
            headBone.add(crown);

            const greyBeard = new THREE.Mesh(
              new THREE.ConeGeometry(0.065, 0.11, 10),
              new THREE.MeshStandardMaterial({ color: 0xcfcac2, roughness: 0.9 })
            );
            greyBeard.rotation.x = Math.PI;
            greyBeard.position.set(0, -0.02, 0.085);
            headBone.add(greyBeard);
          } else if (role === 'farmer' && headBone) {
            const scarfMat = new THREE.MeshStandardMaterial({ color: 0xe6dac2, roughness: 0.85 });
            const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.122, 14, 10), scarfMat);
            scarf.position.set(0, 0.12, -0.015);
            scarf.scale.set(0.96, 0.88, 1.05);
            headBone.add(scarf);
          } else if (role === 'merchant' && headBone) {
            const skullCap = new THREE.Mesh(
              new THREE.SphereGeometry(0.114, 14, 10),
              new THREE.MeshStandardMaterial({ color: 0x6e3f24, roughness: 0.85 })
            );
            skullCap.position.set(0, 0.135, -0.005);
            skullCap.scale.set(0.96, 0.65, 1.0);
            headBone.add(skullCap);
          }

          if (role === 'elder' && hipsBone) {
            const pouch = new THREE.Mesh(
              new THREE.SphereGeometry(0.055, 10, 8),
              new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.75 })
            );
            pouch.scale.set(0.85, 1.25, 0.75);
            pouch.position.set(-0.18, -0.05, 0.08);
            hipsBone.add(pouch);
          }
        }

        // Roluna görə əlavə aksesuarlar (qalxan, səbət)
        if (role === 'guard') {
          const shieldGroup = new THREE.Group();
          const shieldWood = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.04, 18),
            new THREE.MeshStandardMaterial({ color: 0x3b2818, roughness: 0.8 })
          );
          shieldWood.rotation.z = Math.PI / 2;
          shieldGroup.add(shieldWood);
          const shieldBoss = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0xc29238, metalness: 0.85, roughness: 0.25 })
          );
          shieldBoss.position.x = -0.04;
          shieldGroup.add(shieldBoss);
          shieldGroup.position.set(-0.36, 1.15, 0.08);
          shieldGroup.rotation.y = 0.25;
          npc.add(shieldGroup);
        } else if (role === 'farmer') {
          const pouch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.12, 0.22, 10),
            new THREE.MeshStandardMaterial({ color: 0x9c6e3b, roughness: 0.92 })
          );
          pouch.position.set(0.32, 0.92, 0.08);
          npc.add(pouch);
        }

        npc.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = false; // Performans üçün kütləvi NPC kölgələrini söndür
            obj.frustumCulled = true;
          }
        });
        npc.position.copy(pos);
        npc.rotation.y = rotY;
        this.scene.add(npc);
        if (loaded.animations?.length) {
          const mixer = new THREE.AnimationMixer(npc);
          const idleClip =
            loaded.animations.find((c) => /idle/i.test(c.name)) || loaded.animations[0];
          const action = mixer.clipAction(idleClip);
          action.time = phase;
          action.play();
          this.npcMixers.push({ mixer, pos: npc.position });
        }
        return npc;
      }
      const fallback = this._createDetailedHuman({
        coatColor: coatHex,
        sashColor: sashHex,
        hatType: role === 'elder' ? 'turban' : 'papaq',
        hatColor: 0x3a2414,
        hasBeard: role === 'elder',
      });
      fallback.position.copy(pos);
      fallback.rotation.y = rotY;
      this.scene.add(fallback);
      this.animatedNPCs.push({ group: fallback, phase, baseY: 0 });
      return fallback;
    };
    this._spawnRealNPC = spawnRealNPC;

    const [cnx, cnz, cnRot] = this.cityLayout.carpetNpc;
    const [cix, ciz] = this.cityLayout.carpetInteract;
    await spawnRealNPC({
      coatHex: 0x1e3f6e,
      sashHex: 0xd4a442,
      pos: new THREE.Vector3(cnx, 0, cnz),
      rotY: cnRot,
      phase: 0.4,
      role: 'elder',
    });
    this.minimapMarkers.push({ x: cnx, z: cnz, color: '#f3c65f', radius: 4.5 });

    const primaryLuxuryItem =
      this.city?.goods?.find((g) => g.item_id === 'carpet' || g.category === 'luxury')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'carpet';

    this.interactables.push({
      id: 'trader_carpet',
      type: 'market',
      label: `Baş Tacirlə Sövdələş (${this.city?.short_name || 'Bazar'})`,
      pos: new THREE.Vector3(cix, 0, ciz),
      npcPos: new THREE.Vector3(cnx, 1.45, cnz + 0.2),
      radius: 3.6,
      defaultItem: primaryLuxuryItem,
    });

    // --- 2. KƏND TƏSƏRRÜFATI / MEYVƏ TEZGAHI (şəhər planına uyğun mövqedə) ---
    const [fsx, fsz, fsRot] = this.cityLayout.fruitStall;
    const fruitGroup = new THREE.Group();
    fruitGroup.position.set(fsx, 0, fsz);
    fruitGroup.rotation.y = fsRot;

    const glbBaskets = await this.modelLoader.loadOptionalGLB('prop_fruit_baskets', 1.45);
    if (glbBaskets) {
      glbBaskets.position.set(0, 0, 0.25);
      fruitGroup.add(glbBaskets);
    } else {
      const basketMat = new THREE.MeshStandardMaterial({ color: 0x9c6e3b, roughness: 0.92 });
      const fruitConfigs = [
        { x: -0.9, z: 0.7, fruitColor: 0xc92a2a },
        { x: 0.4, z: 1.0, fruitColor: 0xc2b838 },
        { x: 1.4, z: 0.3, fruitColor: 0x9e1b32 },
      ];
      for (const fc of fruitConfigs) {
        const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.62, 12), basketMat);
        basket.position.set(fc.x, 0.31, fc.z);
        basket.castShadow = true;
        fruitGroup.add(basket);

        const fMat = new THREE.MeshStandardMaterial({ color: fc.fruitColor, roughness: 0.45 });
        for (let i = 0; i < 9; i++) {
          const ang = (i / 9) * Math.PI * 2;
          const rad = i === 0 ? 0 : 0.28;
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), fMat);
          fruit.position.set(fc.x + Math.cos(ang) * rad, 0.66 + (i % 2) * 0.08, fc.z + Math.sin(ang) * rad);
          fruitGroup.add(fruit);
        }
      }
    }

    const [glbCrates] = await Promise.all([
      this.modelLoader.loadOptionalGLB('prop_bazaar_crates', 1.15),
    ]);
    if (glbCrates) {
      glbCrates.position.set(-2.2, 0, -1.1);
      glbCrates.rotation.y = 0.4;
      fruitGroup.add(glbCrates);
    }
    const barrel1 = this._createWoodenBarrel(woodMat, 1.0);
    barrel1.position.set(-2.8, 0, 0.35);
    fruitGroup.add(barrel1);
    const barrel2 = this._createWoodenBarrel(woodMat, 0.92);
    barrel2.position.set(-3.4, 0, -0.45);
    fruitGroup.add(barrel2);
    this.scene.add(fruitGroup);

    const [fnx, fnz, fnRot] = this.cityLayout.fruitNpc;
    const [fix, fiz] = this.cityLayout.fruitInteract;
    await spawnRealNPC({
      coatHex: 0x3b6b34,
      sashHex: 0xb8562b,
      pos: new THREE.Vector3(fnx, 0, fnz),
      rotY: fnRot,
      phase: 1.7,
      role: 'farmer',
    });
    this.minimapMarkers.push({ x: fnx, z: fnz, color: '#69c469', radius: 4.5 });

    const primaryAgriItem =
      this.city?.goods?.find((g) => g.category === 'agriculture')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'apple';

    this.interactables.push({
      id: 'trader_farmer',
      type: 'market',
      label: 'Bağbanla Sövdələş (Bağ Nemətləri)',
      pos: new THREE.Vector3(fix, 0, fiz),
      npcPos: new THREE.Vector3(fnx, 1.45, fnz + 0.2),
      radius: 3.4,
      defaultItem: primaryAgriItem,
    });

    // --- 3. QORUYUCU & KARVAN ARABASI (Həyətin sağ/arxa hissəsində real 3D atmosfer) ---
    const guardNPC = await spawnRealNPC({
      coatHex: 0x1e4466,
      sashHex: 0xd9a841,
      pos: new THREE.Vector3(6.4, 0, 2.2),
      rotY: -0.8,
      phase: 2.4,
      role: 'guard',
    });
    this.minimapMarkers.push({ x: 6.4, z: 2.2, color: '#4da6ff', radius: 4 });
    // Keşikçinin əlinə real taxta və bürünc ucluqlu nizə
    const spearGroup = new THREE.Group();
    const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 2.35, 10), woodMat);
    spearShaft.position.y = 1.18;
    spearShaft.castShadow = true;
    spearGroup.add(spearShaft);
    const spearTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.85, roughness: 0.25 })
    );
    spearTip.position.y = 2.45;
    spearGroup.add(spearTip);
    spearGroup.position.set(0.45, 0, 0.18);
    guardNPC.add(spearGroup);

    // Real PBR taxta təkərli Karvan Arabası + Poly Haven sandıq & çəllək yükü
    const wagonGroup = new THREE.Group();
    wagonGroup.position.set(6.8, 0, 7.2);
    wagonGroup.rotation.y = -2.4;

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2c2e33, metalness: 0.78, roughness: 0.42 });
    const wagonBed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 3.4), woodMat);
    wagonBed.position.y = 0.78;
    wagonBed.castShadow = true;
    wagonBed.receiveShadow = true;
    wagonGroup.add(wagonBed);

    // Yan taxta bortlar
    for (const sx of [-0.98, 0.98]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 3.35), woodMat);
      sideWall.position.set(sx, 1.18, 0);
      sideWall.castShadow = true;
      wagonGroup.add(sideWall);
    }
    const backBoard = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.65, 0.12), woodMat);
    backBoard.position.set(0, 1.18, -1.65);
    backBoard.castShadow = true;
    wagonGroup.add(backBoard);

    // Ön qoşqu qolları
    for (const sx of [-0.55, 0.55]) {
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 1.8), woodMat);
      shaft.position.set(sx, 0.76, 2.45);
      shaft.rotation.x = 0.12;
      shaft.castShadow = true;
      wagonGroup.add(shaft);
    }

    // Dəmir çənbərli və millərli 4 taxta təkər
    for (const [wx, wz, wr] of [
      [-1.12, 1.05, 0.58],
      [1.12, 1.05, 0.58],
      [-1.14, -1.05, 0.66],
      [1.14, -1.05, 0.66],
    ]) {
      const wheel = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(wr, 0.06, 10, 20), ironMat);
      rim.rotation.y = Math.PI / 2;
      rim.castShadow = true;
      wheel.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), woodMat);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      for (let s = 0; s < 6; s++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, wr * 1.9, 6), woodMat);
        spoke.rotation.x = (s / 6) * Math.PI;
        wheel.add(spoke);
      }
      wheel.position.set(wx, wr, wz);
      wagonGroup.add(wheel);
    }

    // Kətan parça çadır örtüyü (PBR fabric)
    const pbrFabric = await this.modelLoader.loadPBRMaterialOptions('fabric', 'fabric_pattern_07', 2.0, 2.0);
    const canopyMat = new THREE.MeshStandardMaterial({
      ...(pbrFabric || {}),
      color: 0xd9c7a3,
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    const canopyGeo = new THREE.CylinderGeometry(1.08, 1.08, 3.25, 16, 1, true, 0, Math.PI);
    canopyGeo.rotateZ(Math.PI / 2);
    canopyGeo.rotateY(Math.PI / 2);
    const wagonCanopy = new THREE.Mesh(canopyGeo, canopyMat);
    wagonCanopy.position.set(0, 1.5, -0.05);
    wagonCanopy.castShadow = true;
    wagonGroup.add(wagonCanopy);

    // Arabanın içinə real sandıq, yeşik və taxta çəllək yükü
    const [wagonChest, wagonCrate] = await Promise.all([
      this.modelLoader.loadOptionalGLB('treasure_chest', 0.95),
      this.modelLoader.loadOptionalGLB('wooden_crate_01', 0.95),
    ]);
    if (wagonChest) {
      wagonChest.position.set(-0.32, 0.88, 0.65);
      wagonChest.rotation.y = 0.25;
      wagonGroup.add(wagonChest);
    }
    if (wagonCrate) {
      wagonCrate.position.set(0.38, 0.88, -0.55);
      wagonGroup.add(wagonCrate);
    }
    const wagonBarrel = this._createWoodenBarrel(woodMat, 0.78);
    wagonBarrel.position.set(-0.35, 0.88, -0.8);
    wagonGroup.add(wagonBarrel);
    this.scene.add(wagonGroup);

    // Sağ tərəfdə real Poly Haven taxta masa + Gəncə 3D saçaqlı xalça stendi
    const extraStallGroup = new THREE.Group();
    extraStallGroup.position.set(7.8, 0, -4.2);
    extraStallGroup.rotation.y = -0.6;

    const realTable = await this.modelLoader.loadOptionalGLB('WoodenTable_02', 1.35);
    if (realTable) {
      extraStallGroup.add(realTable);
    } else {
      const fbTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.3), woodMat);
      fbTable.position.y = 0.475;
      fbTable.castShadow = true;
      extraStallGroup.add(fbTable);
    }
    const ganjaHang = this._create3DCarpetMesh(1.9, 2.4, ganjaCarpetTex, weaveBumpTex, {
      withRod: true,
      withFringe: true,
      drapeAmp: 0.045,
    });
    ganjaHang.position.set(0, 2.25, -0.85);
    extraStallGroup.add(ganjaHang);

    const ganjaTableY = realTable ? 1.04 : 0.96;
    const ganjaTableRug = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.04, 1.05),
      new THREE.MeshStandardMaterial({
        map: ganjaCarpetTex,
        bumpMap: weaveBumpTex || null,
        bumpScale: weaveBumpTex ? 0.035 : 0,
        roughness: 0.92,
      })
    );
    ganjaTableRug.position.set(0, ganjaTableY, 0.05);
    ganjaTableRug.castShadow = true;
    extraStallGroup.add(ganjaTableRug);

    const extraPot = await this.modelLoader.loadOptionalGLB('brass_pot_01', 1.2);
    if (extraPot) {
      extraPot.position.set(0.65, ganjaTableY + 0.01, 0.15);
      extraStallGroup.add(extraPot);
    }
    this.scene.add(extraStallGroup);

    // --- 4. ÇÖL BAZAR KÜÇƏSİ & KARVAN YOLU (Cənub qapısından çölə çıxış: z = 14..40) ---
    // Yol kənarı taxta dirəklər və işıqlı bürünc fənərlər (performans üçün emissive işıq)
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    const lanternGlowGeo = new THREE.SphereGeometry(0.11, 8, 6);
    const lanternPromises = [];
    for (const lz of [18, 27, 35]) {
      for (const lx of [-4.4, 4.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.2, 8), woodMat);
        post.position.set(lx, 1.6, lz);
        post.castShadow = true;
        this.scene.add(post);

        const glow = new THREE.Mesh(lanternGlowGeo, lanternGlowMat);
        glow.position.set(lx, 3.38, lz);
        this.scene.add(glow);

        lanternPromises.push(
          this.modelLoader.loadOptionalGLB('Lantern_01', 1.15).then((streetLantern) => {
            if (streetLantern) {
              streetLantern.position.set(lx, 3.2, lz);
              this.scene.add(streetLantern);
            }
          })
        );
      }
    }
    await Promise.all(lanternPromises);

    // Çöl İpək & Ədviyyat Tezgahı (x = -7.5, z = 22)
    const outerStall = new THREE.Group();
    outerStall.position.set(-7.5, 0, 22);
    outerStall.rotation.y = 0.45;
    const outerTable = await this.modelLoader.loadOptionalGLB('WoodenTable_02', 1.35);
    if (outerTable) {
      outerStall.add(outerTable);
    }
    const outerRug = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.04, 1.05),
      new THREE.MeshStandardMaterial({
        map: secondCarpetTex,
        bumpMap: weaveBumpTex || null,
        bumpScale: weaveBumpTex ? 0.035 : 0,
        roughness: 0.92,
      })
    );
    outerRug.position.set(0, 1.04, 0.05);
    outerStall.add(outerRug);

    const outerVase = await this.modelLoader.loadOptionalGLB('antique_ceramic_vase_01', 1.35);
    if (outerVase) {
      outerVase.position.set(-0.6, 1.05, 0);
      outerStall.add(outerVase);
    }
    this.scene.add(outerStall);

    // Çöl Bazar Taciri NPC
    await spawnRealNPC({
      coatHex: 0x752328,
      sashHex: 0xe0b44c,
      pos: new THREE.Vector3(-8.4, 0, 23.4),
      rotY: 0.65,
      phase: 1.1,
      role: 'merchant',
    });
    this.minimapMarkers.push({ x: -8.4, z: 23.4, color: '#ff8c42', radius: 4.5 });

    this.interactables.push({
      id: 'trader_outer',
      type: 'market',
      label: 'Çöl Bazar Taciri ilə Sövdələş',
      pos: new THREE.Vector3(-6.2, 0, 21.8),
      npcPos: new THREE.Vector3(-8.2, 1.45, 23.2),
      radius: 3.6,
      defaultItem: primaryLuxuryItem,
    });

    // Çöl Karvan Təchizat Anbarı (x = 7.2, z = 22.5)
    const [outChest, outCrate] = await Promise.all([
      this.modelLoader.loadOptionalGLB('treasure_chest', 1.15),
      this.modelLoader.loadOptionalGLB('wooden_crate_01', 1.15),
    ]);
    if (outChest) {
      outChest.position.set(7.2, 0, 22.5);
      outChest.rotation.y = -0.5;
      this.scene.add(outChest);
    }
    const outBarrel = this._createWoodenBarrel(woodMat, 1.05);
    outBarrel.position.set(8.4, 0, 23.2);
    this.scene.add(outBarrel);
    if (outCrate) {
      outCrate.position.set(6.4, 0, 23.8);
      this.scene.add(outCrate);
    }

    // Yol kənarı yaşıllıq ağacları (evlərin arasında və küçə boyu)
    const outerTreeSpecs = [
      { model: 'island_tree_01', x: -8.6, z: 17.5, h: 7.5, rot: 0.5 },
      { model: 'fir_tree_01', x: 8.6, z: 18.0, h: 9.0, rot: 1.7 },
      { model: 'fir_tree_01', x: -8.8, z: 27.5, h: 9.5, rot: 2.4 },
      { model: 'island_tree_01', x: 8.6, z: 28.5, h: 7.8, rot: 0.9 },
      { model: 'island_tree_01', x: -8.5, z: 34.8, h: 8.0, rot: 1.4 },
      { model: 'fir_tree_01', x: 8.5, z: 34.8, h: 9.2, rot: 2.9 },
      { model: 'fir_tree_01', x: -16.0, z: 24.0, h: 10.5, rot: 0.8 },
      { model: 'island_tree_01', x: 16.5, z: 25.0, h: 9.0, rot: 2.1 },
      { model: 'fir_tree_01', x: -6.5, z: 44.5, h: 9.5, rot: 1.2 },
      { model: 'fir_tree_01', x: 6.5, z: 44.5, h: 9.8, rot: 2.6 },
    ];
    for (const ots of outerTreeSpecs) {
      await this._placeNormalizedTree?.(ots.model, ots.x, ots.z, ots.h, ots.rot);
    }

    // Mini-xəritədəki kimi sıx və canlı Orta Əsr Bakı / Şirvan Çöl Bazar Məhəlləsi + Qala Qapısı
    this._buildOuterBazaarTown({
      woodMat,
      carpetTex: mainCarpetTex,
      secondCarpetTex,
      ganjaCarpetTex,
      weaveBumpTex,
    });
    this.minimapMarkers.push({ x: 0, z: 36.5, color: '#4ee6d4', radius: 5 });
  }

  /**
   * Mini-xəritəyə (bazaar_satellite_map.png) uyğun Çöl Bazar küçəsi:
   * - Hər iki tərəfdə 1 və 2 mərtəbəli daş/gil-suvaq bazar evləri, dükanlar, eyvanlar və mavi günbəzlər
   * - Rəngarəng parça kölgəliklər, küçə piştaxtaları, xalçalar, səbətlər, küplər və çəlləklər
   * - Z=37.5-də möhtəşəm Qala Qapısı (bürclər və qala divarları)
   */
  _createWoodenBarrel(woodMat, scale = 1.0) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.88, 12), woodMat);
    body.position.y = 0.44;
    body.castShadow = true;
    g.add(body);
    const hoopMat = new THREE.MeshStandardMaterial({ color: 0x2c2e33, metalness: 0.75, roughness: 0.45 });
    for (const hy of [0.16, 0.44, 0.72]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.02, 6, 14), hoopMat);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = hy;
      g.add(hoop);
    }
    g.scale.setScalar(scale);
    return g;
  }

  _buildOuterBazaarTown({ woodMat, carpetTex, secondCarpetTex, ganjaCarpetTex, weaveBumpTex }) {
    const theme = this.cityTheme || CITY_THEMES.City_Baku;
    const stoneMat = this._sharedStoneMat || new THREE.MeshStandardMaterial({ color: theme.stoneHex, roughness: 0.88 });
    const trimMat = this._sharedTrimMat || new THREE.MeshStandardMaterial({ color: theme.trimHex, roughness: 0.8 });
    const tileMat = this._sharedTileMat || new THREE.MeshStandardMaterial({ color: theme.tileHex, roughness: 0.35, metalness: 0.12 });
    const plasterWarmMat = new THREE.MeshStandardMaterial({ color: theme.plasterWarmHex, roughness: 0.9 });
    const plasterOchreMat = new THREE.MeshStandardMaterial({ color: theme.plasterOchreHex, roughness: 0.88 });
    const terracottaRoofMat = new THREE.MeshStandardMaterial({ color: 0xa65336, roughness: 0.85 });
    const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x1e150e, roughness: 0.95 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8963c, roughness: 0.3, metalness: 0.8 });
    const clayMat = new THREE.MeshStandardMaterial({ color: 0xb0633b, roughness: 0.8 });
    const awningMats = [
      new THREE.MeshStandardMaterial({ color: 0x993522, roughness: 0.88, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0xc99242, roughness: 0.88, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x265c78, roughness: 0.88, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x7d2924, roughness: 0.88, side: THREE.DoubleSide }),
    ];

    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10);
    const domeGeo = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);

    const addBuilding = ({
      x,
      z,
      w,
      d,
      h,
      facing = 1, // +1: +X (küçəyə), -1: -X (küçəyə), 0: +Z
      mat = stoneMat,
      hasDome = false,
      hasTerracotta = false,
      hasBalcony = false,
      hasAwning = false,
      awningIdx = 0,
      hasShopfront = true,
    }) => {
      const b = new THREE.Group();
      b.position.set(x, 0, z);

      // Əsas bina gövdəsi
      const body = new THREE.Mesh(unitBox, mat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      b.add(body);

      // Dam haşiyəsi (parapet)
      const parapet = new THREE.Mesh(unitBox, trimMat);
      parapet.scale.set(w + 0.18, 0.35, d + 0.18);
      parapet.position.y = h + 0.15;
      b.add(parapet);

      // Çıxıntılı taxta dam tirləri (Qədim Şirvan/Şəki memarlığı)
      if (facing !== 0) {
        const beamCount = Math.max(2, Math.floor(d / 1.8));
        for (let i = 0; i < beamCount; i++) {
          const bz = -d / 2 + 0.9 + (i * (d - 1.8)) / Math.max(1, beamCount - 1);
          const beam = new THREE.Mesh(unitBox, woodMat);
          beam.scale.set(0.55, 0.14, 0.14);
          beam.position.set(facing * (w / 2 + 0.18), h - 0.25, bz);
          b.add(beam);
        }
      }

      // Mavi kaşı günbəz və ya kirəmit dam
      if (hasDome) {
        const drum = new THREE.Mesh(unitCyl, trimMat);
        const dr = Math.min(w, d) * 0.28;
        drum.scale.set(dr, 0.75, dr);
        drum.position.y = h + 0.5;
        b.add(drum);

        const dome = new THREE.Mesh(domeGeo, tileMat);
        dome.scale.setScalar(dr * 0.98);
        dome.position.y = h + 0.85;
        dome.castShadow = true;
        b.add(dome);
      } else if (hasTerracotta) {
        const roof = new THREE.Mesh(unitBox, terracottaRoofMat);
        roof.scale.set(w * 0.92, 0.28, d * 0.92);
        roof.position.y = h + 0.25;
        b.add(roof);
      }

      // Küçəyə baxan tərəfdə dükan tağı, pəncərələr, eyvan və kölgəlik
      if (facing !== 0) {
        const faceX = facing * (w / 2 + 0.03);
        if (hasShopfront) {
          const door = new THREE.Mesh(unitBox, darkInteriorMat);
          door.scale.set(0.12, 2.5, Math.min(2.4, d * 0.42));
          door.position.set(faceX, 1.25, 0);
          b.add(door);

          const frame = new THREE.Mesh(unitBox, woodMat);
          frame.scale.set(0.16, 0.18, Math.min(2.7, d * 0.46));
          frame.position.set(faceX, 2.55, 0);
          b.add(frame);
        }

        // 2-ci mərtəbə pəncərələri və taxta eyvan
        if (h >= 6.0) {
          for (const wz of [-d * 0.26, d * 0.26]) {
            const win = new THREE.Mesh(unitBox, darkInteriorMat);
            win.scale.set(0.12, 1.15, 0.85);
            win.position.set(faceX, h - 1.85, wz);
            b.add(win);

            const sill = new THREE.Mesh(unitBox, woodMat);
            sill.scale.set(0.2, 0.1, 1.0);
            sill.position.set(faceX + facing * 0.04, h - 2.45, wz);
            b.add(sill);
          }

          if (hasBalcony) {
            const balcFloor = new THREE.Mesh(unitBox, woodMat);
            balcFloor.scale.set(0.95, 0.14, d * 0.56);
            balcFloor.position.set(facing * (w / 2 + 0.45), 3.6, 0);
            balcFloor.castShadow = true;
            b.add(balcFloor);

            const balcRail = new THREE.Mesh(unitBox, woodMat);
            balcRail.scale.set(0.1, 0.72, d * 0.56);
            balcRail.position.set(facing * (w / 2 + 0.88), 4.0, 0);
            b.add(balcRail);
          }
        }

        // Parça kölgəlik (bazar dükanı çardağı)
        if (hasAwning) {
          const awning = new THREE.Mesh(unitBox, awningMats[awningIdx % awningMats.length]);
          awning.scale.set(2.3, 0.08, d * 0.72);
          awning.position.set(facing * (w / 2 + 1.05), 3.05, 0);
          awning.rotation.z = -facing * 0.22;
          awning.castShadow = true;
          b.add(awning);

          for (const pz of [-d * 0.32, d * 0.32]) {
            const pole = new THREE.Mesh(unitCyl, woodMat);
            pole.scale.set(0.06, 2.8, 0.06);
            pole.position.set(facing * (w / 2 + 2.05), 1.4, pz);
            b.add(pole);
          }
        }
      }

      this.scene.add(b);
    };

    // 1) Küçənin SOL tərəfi (x ≈ -11..-14, z = 16..36) — x = -7.5, z = 22 tezgahı üçün boşluq saxlanılır
    const leftBuildings = [
      { x: -12.8, z: 16.5, w: 4.8, d: 5.2, h: 6.8, mat: plasterWarmMat, hasDome: true, hasBalcony: true, hasAwning: true, awningIdx: 0 },
      { x: -13.4, z: 22.2, w: 4.4, d: 5.4, h: 4.6, mat: stoneMat, hasTerracotta: true, hasAwning: false },
      { x: -12.6, z: 28.2, w: 5.0, d: 5.6, h: 7.2, mat: plasterOchreMat, hasBalcony: true, hasAwning: true, awningIdx: 1 },
      { x: -12.5, z: 34.0, w: 4.8, d: 5.0, h: 5.2, mat: stoneMat, hasDome: true, hasAwning: true, awningIdx: 2 },
    ];
    for (const cfg of leftBuildings) {
      addBuilding({ ...cfg, facing: 1 });
    }

    // 2) Küçənin SAĞ tərəfi (x ≈ +11..+14, z = 16..36) — x = 7.2, z = 22.5 anbarı üçün boşluq saxlanılır
    const rightBuildings = [
      { x: 12.8, z: 16.8, w: 4.8, d: 5.4, h: 6.4, mat: stoneMat, hasTerracotta: true, hasAwning: true, awningIdx: 2 },
      { x: 13.4, z: 22.5, w: 4.4, d: 5.2, h: 4.8, mat: plasterOchreMat, hasDome: true, hasAwning: false },
      { x: 12.6, z: 28.5, w: 5.0, d: 5.6, h: 7.4, mat: plasterWarmMat, hasBalcony: true, hasAwning: true, awningIdx: 3 },
      { x: 12.5, z: 34.2, w: 4.8, d: 4.8, h: 5.0, mat: stoneMat, hasTerracotta: true, hasAwning: true, awningIdx: 0 },
    ];
    for (const cfg of rightBuildings) {
      addBuilding({ ...cfg, facing: -1 });
    }

    // 3) Arxa məhəllə binaları (Karvansarayın sağ/sol yanı və 2-ci sıra küçə evləri — boş üfüqü tam bağlayır)
    const backdropBuildings = [
      // Sol 2-ci sıra
      { x: -21.0, z: 16.0, w: 6.5, d: 7.0, h: 8.2, mat: stoneMat, hasDome: true },
      { x: -21.5, z: 25.0, w: 7.0, d: 8.0, h: 6.8, mat: plasterWarmMat, hasTerracotta: true },
      { x: -20.5, z: 34.0, w: 6.5, d: 7.5, h: 7.8, mat: plasterOchreMat },
      // Sağ 2-ci sıra
      { x: 21.0, z: 16.5, w: 6.5, d: 7.2, h: 7.6, mat: plasterOchreMat },
      { x: 21.5, z: 25.5, w: 7.0, d: 7.8, h: 8.6, mat: stoneMat, hasDome: true },
      { x: 20.5, z: 34.5, w: 6.5, d: 7.2, h: 6.5, mat: plasterWarmMat, hasTerracotta: true },
      // Karvansarayın yan məhəllələri
      { x: -20.5, z: 5.5, w: 6.8, d: 8.5, h: 7.4, mat: plasterWarmMat, hasDome: true },
      { x: -20.5, z: -5.5, w: 6.8, d: 8.5, h: 8.0, mat: stoneMat },
      { x: 20.5, z: 5.5, w: 6.8, d: 8.5, h: 7.2, mat: stoneMat, hasTerracotta: true },
      { x: 20.5, z: -5.5, w: 6.8, d: 8.5, h: 8.4, mat: plasterOchreMat, hasDome: true },
    ];
    for (const cfg of backdropBuildings) {
      addBuilding({ ...cfg, facing: 0, hasShopfront: false });
    }

    // 4) Küçə boyu əlavə piştaxtalar, xalçalar, küplər, səbətlər və yeşiklər
    const rugMats = [
      new THREE.MeshStandardMaterial({ map: carpetTex, bumpMap: weaveBumpTex || null, bumpScale: 0.03, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ map: secondCarpetTex, bumpMap: weaveBumpTex || null, bumpScale: 0.03, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ map: ganjaCarpetTex, bumpMap: weaveBumpTex || null, bumpScale: 0.03, roughness: 0.92 }),
    ];

    const stallSpots = [
      { x: -7.4, z: 16.6, rot: 0.12, rugIdx: 0 },
      { x: 7.4, z: 16.8, rot: -0.15, rugIdx: 1 },
      { x: -7.2, z: 28.6, rot: 0.1, rugIdx: 2 },
      { x: 7.2, z: 28.8, rot: -0.12, rugIdx: 0 },
      { x: -7.2, z: 33.8, rot: 0.18, rugIdx: 1 },
      { x: 7.2, z: 33.8, rot: -0.18, rugIdx: 2 },
    ];

    for (let i = 0; i < stallSpots.length; i++) {
      const sp = stallSpots[i];
      const st = new THREE.Group();
      st.position.set(sp.x, 0, sp.z);
      st.rotation.y = sp.rot;

      // Taxta piştaxta masası
      const top = new THREE.Mesh(unitBox, woodMat);
      top.scale.set(1.3, 0.12, 2.4);
      top.position.y = 0.88;
      top.castShadow = true;
      st.add(top);

      for (const lx of [-0.5, 0.5]) {
        for (const lz of [-1.0, 1.0]) {
          const leg = new THREE.Mesh(unitBox, woodMat);
          leg.scale.set(0.1, 0.88, 0.1);
          leg.position.set(lx, 0.44, lz);
          st.add(leg);
        }
      }

      // Üstündə xalça örtüyü
      const rug = new THREE.Mesh(unitBox, rugMats[sp.rugIdx]);
      rug.scale.set(1.15, 0.04, 1.8);
      rug.position.y = 0.96;
      st.add(rug);

      // Mis və saxsı küplər / səbətlər
      const pot = new THREE.Mesh(unitCyl, i % 2 === 0 ? brassMat : clayMat);
      pot.scale.set(0.22, 0.48, 0.22);
      pot.position.set(0.1, 1.18, -0.55);
      st.add(pot);

      const crate = new THREE.Mesh(unitBox, trimMat);
      crate.scale.set(0.75, 0.65, 0.75);
      crate.position.set(sp.x < 0 ? -0.9 : 0.9, 0.32, 0.9);
      crate.castShadow = true;
      st.add(crate);

      this.scene.add(st);
    }

    // Həyətdə və Çöl Bazar küçəsində real skeletli 3D insanlar (keşikçilər, ustalar, bağbanlar, ağsaqqallar)
    if (this._spawnRealNPC) {
      const crowdSpecs = [
        [-2.8, 13.6, 0.25, 0x767c84, 0x4a3121, 'guard'],
        [2.8, 13.6, -0.25, 0x767c84, 0x4a3121, 'guard'],
        [-3.6, 5.2, 0.9, 0x3f4957, 0x784a2a, 'merchant'],
        [3.8, -1.2, -1.2, 0x283652, 0xc99c4a, 'elder'],
        [-6.2, 17.5, 1.3, 0x3f4957, 0x784a2a, 'merchant'],
        [6.1, 18.0, -1.3, 0x4f5b38, 0xe3d6be, 'farmer'],
        [6.1, 28.5, -1.4, 0x3f4957, 0x784a2a, 'merchant'],
        [-6.0, 29.2, 1.35, 0x283652, 0xc99c4a, 'elder'],
        [-6.1, 33.4, 1.2, 0x4f5b38, 0xe3d6be, 'farmer'],
        [6.1, 34.0, -1.2, 0x3f4957, 0x784a2a, 'merchant'],
      ];
      Promise.all(
        crowdSpecs.map(([nx, nz, ry, coat, sash, role], idx) =>
          this._spawnRealNPC({
            coatHex: coat,
            sashHex: sash,
            pos: new THREE.Vector3(nx, 0, nz),
            rotY: ry,
            phase: idx * 0.55,
            role,
          })
        )
      );
      if (this._pendingPalaceNpcs?.length) {
        Promise.all(this._pendingPalaceNpcs.map((spec) => this._spawnRealNPC(spec)));
        this._pendingPalaceNpcs = null;
      }
    }

    // 5) Z = 37.5-də Möhtəşəm Şirvan Qala Qapısı + İki Qala Bürcü + Qala Divarları
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 37.8);

    // Sol və sağ qala divarları
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(unitBox, stoneMat);
      wall.scale.set(24, 6.2, 2.2);
      wall.position.set(side * 16.5, 3.1, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      gateGroup.add(wall);

      // Divar dişləri (crenellations)
      for (let cx = 6.5; cx <= 27.5; cx += 2.2) {
        const merlon = new THREE.Mesh(unitBox, trimMat);
        merlon.scale.set(1.1, 0.95, 1.2);
        merlon.position.set(side * cx, 6.65, 0);
        gateGroup.add(merlon);
      }

      // Qala qapısının yan bürcləri (Qız Qalası üslubu)
      const tower = new THREE.Mesh(unitCyl, stoneMat);
      tower.scale.set(2.1, 10.2, 2.1);
      tower.position.set(side * 4.8, 5.1, 0);
      tower.castShadow = true;
      tower.receiveShadow = true;
      gateGroup.add(tower);

      const towerBand = new THREE.Mesh(unitCyl, tileMat);
      towerBand.scale.set(2.16, 0.55, 2.16);
      towerBand.position.set(side * 4.8, 8.6, 0);
      gateGroup.add(towerBand);

      const towerCap = new THREE.Mesh(unitCyl, trimMat);
      towerCap.scale.set(2.3, 0.6, 2.3);
      towerCap.position.set(side * 4.8, 10.3, 0);
      gateGroup.add(towerCap);
    }

    // Qapının üst tağ kirişi və kaşı bəzəyi
    const gateHeader = new THREE.Mesh(unitBox, stoneMat);
    gateHeader.scale.set(7.2, 2.4, 2.1);
    gateHeader.position.set(0, 6.2, 0);
    gateHeader.castShadow = true;
    gateGroup.add(gateHeader);

    const gateTile = new THREE.Mesh(unitBox, tileMat);
    gateTile.scale.set(6.4, 0.55, 2.22);
    gateTile.position.set(0, 5.6, 0);
    gateGroup.add(gateTile);

    // Açıq taxta qala qapı tayları
    for (const side of [-1, 1]) {
      const gateDoor = new THREE.Mesh(unitBox, woodMat);
      gateDoor.scale.set(1.8, 4.6, 0.25);
      gateDoor.position.set(side * 2.55, 2.3, 0.95);
      gateDoor.rotation.y = side * -0.55;
      gateDoor.castShadow = true;
      gateGroup.add(gateDoor);
    }

    this.scene.add(gateGroup);

    // 6) Şəhərə məxsus unikal 3D abidə və təbii fon (Bakı Qız Qalası, Şəki Qafqaz Dağları, Şuşa Qalası)
    this._buildCityLandmark(stoneMat, trimMat, tileMat, woodMat);

    // 7) 3D Atlı Fayton (Şəhərlərarası səfər üçün — Çöl Bazar küçəsində hazır dayanıb)
    this._buildFaytonCarriage(woodMat);

    // 8) Minilə bilən Qarabağ Atı (Faytonun qarşısında — x = -3.1, z = 17.5)
    this._buildRideableHorse();

    // 9) Qala Qapısından sonrakı Geniş Karvan Meydanı, Liman İskələsi və Üfüq Təpələri (z = 38 .. 78)
    this._buildOuterHarborAndHills(stoneMat, trimMat, tileMat, woodMat);
  }

  _createSculptedHorse(coatHex = 0x7a4224, hasSaddle = false) {
    const horse = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.68 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1a110b, roughness: 0.92 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.85 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: 0x7d2924, roughness: 0.72 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a442, metalness: 0.72, roughness: 0.35 });

    // Üzvi kapsul bədən (döş + sağrı)
    const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.92, 6, 12), coatMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.06, 0);
    horse.add(barrel);

    // Daralan boyun və baş/burun
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, 0.66, 10), coatMat);
    neck.position.set(0, 1.44, 0.56);
    neck.rotation.x = 0.52;
    horse.add(neck);

    const skull = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 5, 10), coatMat);
    skull.rotation.x = Math.PI / 2 + 0.42;
    skull.position.set(0, 1.66, 0.84);
    horse.add(skull);

    // Qulaqlar və yal
    for (const ex of [-0.06, 0.06]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 6), coatMat);
      ear.position.set(ex, 1.82, 0.74);
      horse.add(ear);
    }
    const mane = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.52, 4, 8), maneMat);
    mane.position.set(0, 1.5, 0.46);
    mane.rotation.x = 0.52;
    horse.add(mane);

    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.56, 4, 8), maneMat);
    tail.position.set(0, 0.94, -0.72);
    tail.rotation.x = -0.3;
    horse.add(tail);

    if (hasSaddle) {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.52), saddleMat);
      saddle.position.set(0, 1.33, 0.02);
      horse.add(saddle);
      const stirrup = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.08), goldMat);
      stirrup.position.set(0, 1.04, 0.05);
      horse.add(stirrup);
    }

    const legs = [];
    for (const [lx, lz] of [
      [-0.14, 0.44],
      [0.14, 0.44],
      [-0.14, -0.44],
      [0.14, -0.44],
    ]) {
      const leg = new THREE.Group();
      leg.position.set(lx, 0.92, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.042, 0.84, 8), coatMat);
      upper.position.y = -0.42;
      leg.add(upper);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.1, 8), hoofMat);
      hoopPos: hoof.position.y = -0.87;
      leg.add(hoof);
      horse.add(leg);
      legs.push(leg);
    }

    horse.userData.legs = legs;
    return horse;
  }

  _buildRideableHorse() {
    const horse = this._createSculptedHorse(0x824422, true);
    horse.position.set(-3.1, 0, 17.5);
    horse.rotation.y = 0;

    this.scene.add(horse);
    this.rideableHorse = horse;
    this.interactables.push({
      id: 'horse_mount',
      type: 'horse_mount',
      label: 'Ata Min (Sürətli Gəzinti)',
      pos: horse.position,
      radius: 3.6,
    });
    this.minimapMarkers.push({ x: -3.1, z: 17.5, color: '#e0a838', radius: 4.5 });
  }

  toggleMountHorse() {
    if (!this.rideableHorse || !this.player.group) return false;
    this.player.mountedHorse = !this.player.mountedHorse;
    if (this.player.mountedHorse) {
      this.player.pos.x = this.rideableHorse.position.x;
      this.player.pos.z = this.rideableHorse.position.z;
      this.player.yaw = this.rideableHorse.rotation.y;
      this.player.speed = 9.6;
      this.eventBus.emit('audio:sfx', 'horse');
      this.eventBus.emit('ui:toast', {
        message: 'Qarabağ atına mindiniz! (Enmək üçün R düyməsini basın)',
        type: 'info',
      });
    } else {
      this.player.speed = 5.2;
      this.player.pos.y = 0;
      this.player.pos.x += Math.cos(this.player.yaw) * 1.1;
      for (const leg of this.rideableHorse.userData.legs || []) {
        leg.rotation.x = 0;
      }
      this.eventBus.emit('ui:toast', { message: 'Atdan endiniz.', type: 'info' });
    }
    return this.player.mountedHorse;
  }

  _buildOuterHarborAndHills(stoneMat, trimMat, tileMat, woodMat) {
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const plasterMat = new THREE.MeshStandardMaterial({ color: 0xdcc59e, roughness: 0.9 });
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x8f7a56, roughness: 0.96 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xf2e6cf, roughness: 0.85, side: THREE.DoubleSide });
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x993522, roughness: 0.88, side: THREE.DoubleSide });

    // Qala qapısından sonrakı Liman Məhəlləsi (z = 40 .. 58) — hər iki tərəf sıx binalar və çardaqlar
    for (const [bx, bz, bw, bd, bh, hasAwning] of [
      [-10.5, 42.5, 5.5, 5.5, 6.4, true],
      [10.5, 42.5, 5.5, 5.5, 6.8, true],
      [-10.8, 49.0, 5.8, 6.0, 5.4, true],
      [10.8, 49.0, 5.8, 6.0, 7.0, true],
      [-11.0, 55.5, 6.2, 5.5, 6.0, false],
      [11.0, 55.5, 6.2, 5.5, 5.6, false],
      [-20.5, 45.0, 7.5, 8.0, 7.5, false],
      [20.5, 45.0, 7.5, 8.0, 7.2, false],
      [-20.5, 54.0, 7.5, 8.0, 6.8, false],
    ]) {
      const b = new THREE.Mesh(unitBox, Math.abs(bx) > 15 ? plasterMat : stoneMat);
      b.scale.set(bw, bh, bd);
      b.position.set(bx, bh / 2, bz);
      this.scene.add(b);

      const roof = new THREE.Mesh(unitBox, trimMat);
      roof.scale.set(bw + 0.2, 0.35, bd + 0.2);
      roof.position.set(bx, bh + 0.15, bz);
      this.scene.add(roof);

      if (hasAwning) {
        const dir = bx < 0 ? 1 : -1;
        const aw = new THREE.Mesh(unitBox, awningMat);
        aw.scale.set(2.2, 0.08, bd * 0.72);
        aw.position.set(bx + dir * (bw / 2 + 1.0), 3.0, bz);
        aw.rotation.z = -dir * 0.22;
        this.scene.add(aw);
      }
    }

    // Liman Sahil Divarı (z = 59) və Şərqdə Dəniz İskələsi + Yelkənli Gəmilər
    const seawall = new THREE.Mesh(unitBox, stoneMat);
    seawall.scale.set(80, 1.4, 2.2);
    seawall.position.set(0, 0.7, 60.0);
    this.scene.add(seawall);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 100),
      new THREE.MeshStandardMaterial({ color: 0x1e5c78, roughness: 0.25, metalness: 0.3 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(20, 0.04, 110);
    this.scene.add(water);

    const pier = new THREE.Mesh(unitBox, woodMat);
    pier.scale.set(4.2, 0.45, 16);
    pier.position.set(0, 0.45, 68);
    this.scene.add(pier);

    for (const [sx, sz, sry] of [
      [-9, 72, 0.35],
      [9, 74, -0.25],
      [28, 68, 0.15],
    ]) {
      const ship = new THREE.Group();
      ship.position.set(sx, 0.3, sz);
      ship.rotation.y = sry;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 8.5), woodMat);
      hull.position.y = 0.6;
      ship.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 8), woodMat);
      mast.position.y = 4.2;
      ship.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.4), sailMat);
      sail.position.set(0, 4.6, 0.25);
      ship.add(sail);
      this.scene.add(ship);
    }

    // Uzaq təpələr (oyun sahəsindən kənarda, z = -78 və x = ±75)
    for (const [hx, hz, hr, hh] of [
      [-75, 20, 28, 16],
      [-75, -25, 30, 18],
      [-28, -76, 32, 18],
      [25, -76, 32, 18],
    ]) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 8), hillMat);
      hill.position.set(hx, hh * 0.45, hz);
      this.scene.add(hill);
    }
  }

  applyPerformanceMode(mode = 'fast') {
    if (!this.renderer) return;
    const isFast = mode === 'fast';
    this.renderer.setPixelRatio(isFast ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !isFast;
    if (this.sunLight && !isFast) {
      this.sunLight.shadow.mapSize.set(1024, 1024);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }
    this._handleResize();
  }

  /**
   * Şimal tağından girilən Şah / Xan Sarayı Həyəti və Qəbul Zalı (z = -12 .. -25.5)
   */
  async _buildEnterablePalace(stoneMat, trimMat, tileMat, woodMat) {
    const palaceGroup = new THREE.Group();
    const isBaku = this.cityId === 'City_Baku';
    const isSheki = this.cityId === 'City_Sheki';
    const palaceTitle = isBaku
      ? 'Şirvanşahlar Şah Sarayı'
      : isSheki
      ? 'Şəki Xan Sarayı'
      : 'Şuşa Qarabağ Xan Sarayı';
    const rulerLabel = isBaku
      ? 'Şirvanşahla Görüş'
      : isSheki
      ? 'Şəki Xanı ilə Görüş'
      : 'Qarabağ Xanı ilə Görüş';

    // Mərmər / Daş Saray Döşəməsi
    const floorMat = new THREE.MeshStandardMaterial({
      color: isBaku ? 0xd8c8a8 : isSheki ? 0xcfb997 : 0xc7bba6,
      roughness: 0.72,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22.4, 14.2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.025, -18.5);
    floor.receiveShadow = true;
    palaceGroup.add(floor);

    // Qırmızı-qızılı Saray Xalça Yolu (North Arch z = -11.8 -> Taxt z = -22.5)
    const carpetMat = new THREE.MeshStandardMaterial({
      color: isBaku ? 0x7b1d24 : isSheki ? 0x8c2424 : 0x6b1822,
      roughness: 0.88,
    });
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 10.6), carpetMat);
    carpet.position.set(0, 0.04, -17.1);
    carpet.receiveShadow = true;
    palaceGroup.add(carpet);

    const carpetBorder = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 0.02, 10.95),
      trimMat
    );
    carpetBorder.position.set(0, 0.032, -17.1);
    palaceGroup.add(carpetBorder);

    // Saray Ətraf Divarları (Şimal, Qərb, Şərq)
    const wallH = 6.2;
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(22.8, wallH, 0.9), stoneMat);
    northWall.position.set(0, wallH / 2, -25.4);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    palaceGroup.add(northWall);

    for (const sideX of [-11.2, 11.2]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.9, wallH, 14.4), stoneMat);
      sideWall.position.set(sideX, wallH / 2, -18.2);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      palaceGroup.add(sideWall);
    }

    // Sütunlar və Tağlı Eyvan
    for (const px of [-7.5, -4.0, 4.0, 7.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 5.2, 10), stoneMat);
      col.position.set(px, 2.6, -21.0);
      col.castShadow = true;
      palaceGroup.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), trimMat);
      cap.position.set(px, 5.35, -21.0);
      palaceGroup.add(cap);
    }

    // Şəhərə məxsus Saray bəzəkləri (Bakı: Firuzəyi günbəz; Şəki: Şəbəkə pəncərə; Şuşa: Qala dişləri)
    if (isBaku) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(3.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        tileMat
      );
      dome.position.set(0, 6.2, -23.4);
      palaceGroup.add(dome);
    } else if (isSheki) {
      const colors = [0xb8292f, 0x225c8a, 0xd69b27, 0x276e45];
      for (let i = -2; i <= 2; i++) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(2.8, 2.6, 0.16),
          new THREE.MeshStandardMaterial({
            color: colors[Math.abs(i) % colors.length],
            emissive: 0x241206,
            roughness: 0.25,
          })
        );
        win.position.set(i * 3.6, 3.2, -24.88);
        palaceGroup.add(win);
      }
    } else {
      for (let bx = -10; bx <= 10; bx += 2.5) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.95), stoneMat);
        merlon.position.set(bx, wallH + 0.5, -25.4);
        palaceGroup.add(merlon);
      }
    }

    // Taxt Səhnəsi (Dais + Taxt)
    const dais = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 3.8), stoneMat);
    dais.position.set(0, 0.21, -22.7);
    dais.receiveShadow = true;
    palaceGroup.add(dais);

    const throneBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 1.1), woodMat);
    throneBase.position.set(0, 0.8, -23.3);
    palaceGroup.add(throneBase);

    const throneBack = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.85, 0.22), trimMat);
    throneBack.position.set(0, 1.55, -23.8);
    palaceGroup.add(throneBack);

    // Məşəl / Fənər dayaqları
    for (const lx of [-3.6, 3.6]) {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.4, 8), trimMat);
      stand.position.set(lx, 0.7, -20.8);
      palaceGroup.add(stand);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa33 })
      );
      flame.position.set(lx, 1.5, -20.8);
      palaceGroup.add(flame);
    }

    this.scene.add(palaceGroup);

    // Saray Heyəti: Şah / Xan, Vəzir və Saray Mühafizəçisi (_spawnRealNPC təyin olunduqda spawn edilir)
    this._pendingPalaceNpcs = [
      {
        coatHex: isBaku ? 0x6e1b24 : isSheki ? 0x1f4f6b : 0x4a235a,
        sashHex: 0xe3b84c,
        pos: new THREE.Vector3(0, 0.42, -22.3),
        rotY: 0,
        phase: 0.4,
        role: isBaku ? 'elder' : 'merchant',
      },
      {
        coatHex: 0x2c3e50,
        sashHex: 0xd4a342,
        pos: new THREE.Vector3(-2.7, 0.02, -20.6),
        rotY: 0.35,
        phase: 1.7,
        role: 'elder',
      },
      {
        coatHex: 0x5a1e1e,
        sashHex: 0xc89b3c,
        pos: new THREE.Vector3(2.7, 0.02, -20.6),
        rotY: -0.35,
        phase: 2.8,
        role: 'guard',
      },
    ];

    // E düyməsi ilə Saray Qəbulu
    this.interactables.push({
      id: 'palace_audience',
      type: 'palace_audience',
      label: rulerLabel,
      palaceTitle,
      pos: new THREE.Vector3(0, 0, -20.2),
      radius: 3.6,
    });
  }

  _buildCityLandmark(stoneMat, trimMat, tileMat, woodMat) {
    if (this.cityId === 'City_Baku') {
      // Bakı: Şərqdə Qız Qalası, Şirvanşahlar Şah Sarayı və Xəzər Dənizi
      const tower = new THREE.Group();
      tower.position.set(22, 0, -18);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.1, 18, 18), stoneMat);
      body.position.y = 9;
      tower.add(body);
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 16.5, 4.2), stoneMat);
      buttress.position.set(-2.6, 8.25, 0);
      tower.add(buttress);
      const topRim = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 0.9, 18), trimMat);
      topRim.position.y = 18.2;
      tower.add(topRim);
      this.scene.add(tower);

      // Bakı Şah Sarayı (Şimal-şərqdə tağlı saray və qızılı günbəz)
      const palace = new THREE.Group();
      palace.position.set(-19, 0, -20);
      const pHall = new THREE.Mesh(new THREE.BoxGeometry(12, 7.2, 8), stoneMat);
      pHall.position.y = 3.6;
      palace.add(pHall);
      const pPortal = new THREE.Mesh(new THREE.BoxGeometry(4.4, 8.6, 1.4), trimMat);
      pPortal.position.set(0, 4.3, 4.2);
      palace.add(pPortal);
      const pDome = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), tileMat);
      pDome.position.set(0, 7.2, 0);
      palace.add(pDome);
      this.scene.add(palace);
    } else if (this.cityId === 'City_Sheki') {
      // Şəki: Arxada qarlı Qafqaz dağları və Şəki Xan Sarayı
      const mtnMat = new THREE.MeshStandardMaterial({ color: 0x627368, roughness: 0.95 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef3f7, roughness: 0.85 });
      for (const [mx, mz, mr, mh] of [
        [-28, -46, 18, 28],
        [-4, -52, 22, 34],
        [24, -48, 19, 30],
        [-38, -28, 15, 22],
        [38, -26, 16, 24],
      ]) {
        const mtn = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mtnMat);
        mtn.position.set(mx, mh * 0.45, mz);
        this.scene.add(mtn);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(mr * 0.36, mh * 0.34, 7), snowMat);
        cap.position.set(mx, mh * 0.78, mz);
        this.scene.add(cap);
      }

      // Şəki Xan Sarayı (ikimərtəbəli şəbəkəli fasad, kirəmit dam və eyvan)
      const palace = new THREE.Group();
      palace.position.set(-19, 0, -18);
      const pBase = new THREE.Mesh(new THREE.BoxGeometry(12, 7.2, 7), stoneMat);
      pBase.position.y = 3.6;
      palace.add(pBase);
      const pRoof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.2, 4), tileMat);
      pRoof.rotation.y = Math.PI / 4;
      pRoof.position.y = 8.8;
      palace.add(pRoof);
      const shebeke = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, 3.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xc93838, emissive: 0x2b0c0c, roughness: 0.3 })
      );
      shebeke.position.set(0, 4.0, 3.6);
      palace.add(shebeke);
      this.scene.add(palace);
    } else {
      // Şuşa: Qarabağ qayalıqları və Şuşa Xan Sarayı (qoşa qala bürcləri)
      const cliffMat = new THREE.MeshStandardMaterial({ color: 0x7e848c, roughness: 0.94 });
      for (const [cx, cz, cw, ch] of [
        [-34, -36, 20, 24],
        [0, -48, 28, 28],
        [34, -36, 20, 25],
      ]) {
        const cliff = new THREE.Mesh(new THREE.CylinderGeometry(cw * 0.65, cw, ch, 7), cliffMat);
        cliff.position.set(cx, ch * 0.45, cz);
        this.scene.add(cliff);
      }
      const palace = new THREE.Group();
      palace.position.set(20, 0, -18);
      const pHall = new THREE.Mesh(new THREE.BoxGeometry(11, 7.5, 7), stoneMat);
      pHall.position.y = 3.75;
      palace.add(pHall);
      for (const tx of [-5.5, 5.5]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 11.5, 12), trimMat);
        t.position.set(tx, 5.75, 3.2);
        palace.add(t);
      }
      this.scene.add(palace);
    }
  }

  _buildFaytonCarriage(woodMat) {
    const fayton = new THREE.Group();
    fayton.position.set(3.1, 0, 17.5);
    fayton.rotation.y = 0; // +Z (Qala Qapısı / Karvan yolu istiqamətində)

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5c1f1c, roughness: 0.65 });
    const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4a442, roughness: 0.35, metalness: 0.75 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x241914, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2c2e33, metalness: 0.8, roughness: 0.4 });
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x4d2b18, roughness: 0.78 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1a110b, roughness: 0.9 });

    // Fayton gövdəsi və oturacağı
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 2.3), woodMat);
    chassis.position.y = 0.72;
    chassis.castShadow = true;
    fayton.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.95, 1.45), bodyMat);
    cabin.position.set(0, 1.25, -0.25);
    cabin.castShadow = true;
    fayton.add(cabin);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 1.48, 12, 1, false, 0, Math.PI), leatherMat);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(0, 1.72, -0.25);
    roof.castShadow = true;
    fayton.add(roof);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 0.55), leatherMat);
    seat.position.set(0, 1.05, 0.82);
    fayton.add(seat);

    // 4 Fırlanan Fayton Təkəri
    this.faytonWheels = [];
    for (const [wx, wz, wr] of [
      [-0.86, 0.72, 0.5],
      [0.86, 0.72, 0.5],
      [-0.88, -0.78, 0.62],
      [0.88, -0.78, 0.62],
    ]) {
      const wheel = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(wr, 0.045, 8, 18), ironMat);
      rim.rotation.y = Math.PI / 2;
      rim.castShadow = true;
      wheel.add(rim);
      for (let s = 0; s < 6; s++) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, wr * 1.9, 6), trimGoldMat);
        sp.rotation.x = (s / 6) * Math.PI;
        wheel.add(sp);
      }
      wheel.position.set(wx, wr, wz);
      fayton.add(wheel);
      this.faytonWheels.push(wheel);
    }

    // Qoşqu qolları və 2 Kəhər Karvan Atı (heykəltəraşlıq kapsul formalı)
    this.faytonHorses = [];
    for (const hx of [-0.52, 0.52]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 2.2), woodMat);
      pole.position.set(hx * 0.65, 0.75, 1.9);
      fayton.add(pole);

      const horse = this._createSculptedHorse(0x4a2916, false);
      horse.position.set(hx, 0, 2.55);
      fayton.add(horse);
      this.faytonHorses.push({ group: horse, legs: horse.userData.legs || [] });
    }

    // Faytonçu (sürücü — real skeletli 3D model)
    if (this._spawnRealNPC) {
      this._spawnRealNPC({
        coatHex: 0x3f4957,
        sashHex: 0x784a2a,
        pos: new THREE.Vector3(0, 0.88, 0.82),
        rotY: 0,
        phase: 0.3,
        role: 'merchant',
      }).then((driver) => {
        if (driver) {
          driver.scale.setScalar(0.85);
          fayton.add(driver);
        }
      });
    }

    this.scene.add(fayton);
    this.faytonGroup = fayton;
    this.faytonDeparture = null;

    this.interactables.push({
      id: 'fayton_travel',
      type: 'fayton',
      label: 'Faytona Min (Bakı · Şəki · Şuşa)',
      pos: new THREE.Vector3(3.1, 0, 17.5),
      radius: 4.2,
    });
    this.minimapMarkers.push({ x: 3.1, z: 17.5, color: '#f5d76e', radius: 5 });
  }

  startFaytonDeparture(onDone) {
    if (!this.faytonGroup || this.faytonDeparture) {
      onDone?.();
      return;
    }
    if (this.player.group) {
      this.player.group.visible = false;
    }
    this.faytonDeparture = {
      startTime: performance.now(),
      lastSfxTime: 0,
      duration: 4.2,
      startZ: this.faytonGroup.position.z,
      endZ: 58.0,
      onDone,
    };
    this.eventBus.emit('audio:sfx', 'fayton_ride');
  }

  /**
   * Detallı 3D İnsan / Tacir fiquru (papaq / çalma, naxışlı çuxa, kəmər, qızıl kisəsi, qollar və ayaqlar)
   */
  _createDetailedHuman({ coatColor, sashColor, hatType = 'papaq', hatColor = 0x3a2414, hasBeard = false }) {
    const g = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.78 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd9a946, roughness: 0.45, metalness: 0.35 });
    const sashMat = new THREE.MeshStandardMaterial({ color: sashColor, roughness: 0.72 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb087, roughness: 0.65 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x2e1c11, roughness: 0.85 });
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.92 });

    // Ayaqlar
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.85, 8), bootMat);
    leftLeg.position.set(-0.16, 0.42, 0);
    leftLeg.castShadow = true;
    g.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.85, 8), bootMat);
    rightLeg.position.set(0.16, 0.42, 0);
    rightLeg.castShadow = true;
    g.add(rightLeg);

    // Çuxa gövdəsi + uzun ətək
    const torso = new THREE.Group();
    torso.position.y = 1.18;

    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.39, 1.05, 12), coatMat);
    coat.castShadow = true;
    torso.add(coat);

    // Qızılı şaquli naxış zolağı
    const goldStrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.62), trimMat);
    goldStrip.position.y = -0.02;
    torso.add(goldStrip);

    // Bel kəməri + dəri pul kisəsi
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.2, 12), sashMat);
    sash.position.y = -0.18;
    torso.add(sash);

    const pouch = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x6e4322, roughness: 0.85 })
    );
    pouch.position.set(0.28, -0.32, -0.14);
    torso.add(pouch);

    // Qollar
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.72, 8), coatMat);
    leftArm.position.set(-0.36, 0.06, 0);
    leftArm.rotation.z = 0.14;
    leftArm.castShadow = true;
    torso.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.72, 8), coatMat);
    rightArm.position.set(0.36, 0.06, 0);
    rightArm.rotation.z = -0.14;
    rightArm.castShadow = true;
    torso.add(rightArm);

    // Baş
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skinMat);
    head.position.y = 0.72;
    head.castShadow = true;
    torso.add(head);

    if (hasBeard) {
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xc9c4bc, roughness: 0.9 })
      );
      beard.position.set(0, 0.6, 0.12);
      beard.scale.set(0.95, 1.15, 0.8);
      torso.add(beard);
    }

    // Papaq və ya Çalma
    if (hatType === 'turban') {
      const turban = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.11, 10, 16), hatMat);
      turban.rotation.x = Math.PI / 2;
      turban.position.y = 0.87;
      torso.add(turban);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hatMat);
      cap.position.y = 0.89;
      torso.add(cap);
    } else {
      const papaq = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.27, 14), hatMat);
      papaq.position.y = 0.92;
      papaq.castShadow = true;
      torso.add(papaq);
    }

    g.add(torso);
    g.userData.parts = { leftLeg, rightLeg, leftArm, rightArm, torso };
    return g;
  }

  /**
   * İstifadəçinin təqdim etdiyi 10-bucaqlı konsept vərəqinə uyğun 3D KARVA Taciri:
   * - Krem çalma + tünd qırmızı naxışlı araxçın
   * - Qısa qara saqqal
   * - Qızılı haşiyəli isti-qəhvəyi yun çuxa, krem alt köynək manjetləri
   * - Tünd qırmızı saçaqlı bel qurşağı + dəri kəmər və qızıl kisəsi
   * - Gen şalvar və qəhvəyi dəri çəkmələr
   */
  _createTurnaroundMerchant() {
    const g = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x6b472d, roughness: 0.88 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc49a5b, roughness: 0.55, metalness: 0.18 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xe6dac3, roughness: 0.85 });
    const sashMat = new THREE.MeshStandardMaterial({ color: 0x7d2929, roughness: 0.8 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x4a3121, roughness: 0.78 });
    const trousersMat = new THREE.MeshStandardMaterial({ color: 0x573a25, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a882, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.92 });
    const turbanMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 0.82 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x752624, roughness: 0.78 });

    // Ayaqlar (gen şalvar + dəri çəkmə)
    const buildLeg = (xOffset) => {
      const leg = new THREE.Group();
      leg.position.set(xOffset, 0.84, 0);

      const salvar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.48, 10), trousersMat);
      salvar.position.y = -0.22;
      salvar.castShadow = true;
      leg.add(salvar);

      const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.36, 10), leatherMat);
      bootShaft.position.y = -0.62;
      bootShaft.castShadow = true;
      leg.add(bootShaft);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), leatherMat);
      foot.position.set(0, -0.79, 0.05);
      foot.castShadow = true;
      leg.add(foot);
      return leg;
    };

    const leftLeg = buildLeg(-0.15);
    const rightLeg = buildLeg(0.15);
    g.add(leftLeg, rightLeg);

    // Gövdə qrupu
    const torso = new THREE.Group();
    torso.position.y = 1.18;

    // Üst çuxa gövdəsi
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.66, 12), coatMat);
    coat.position.y = 0.06;
    coat.castShadow = true;
    torso.add(coat);

    // Dizə qədər uzanan çuxa ətəyi (hərəkətdə ayaqları gizlətməyən kəsim)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.44, 12, 1, true), coatMat);
    skirt.material = coatMat.clone();
    skirt.material.side = THREE.DoubleSide;
    skirt.position.y = -0.36;
    skirt.castShadow = true;
    torso.add(skirt);

    // Qızılı haşiyə (alt ətək + ön yaxalıq)
    const hemTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.36, 0.06, 12, 1, true), trimMat);
    hemTrim.material = trimMat.clone();
    hemTrim.material.side = THREE.DoubleSide;
    hemTrim.position.y = -0.55;
    torso.add(hemTrim);

    const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.85, 0.03), trimMat);
    frontTrim.position.set(0.03, -0.14, 0.27);
    torso.add(frontTrim);

    // Krem alt köynək yaxalığı
    const shirtCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10), shirtMat);
    shirtCollar.position.set(0, 0.38, 0.04);
    torso.add(shirtCollar);

    // Tünd qırmızı bel qurşağı + sağ tərəfdən sallanan saçaqlı ucu
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.285, 0.16, 14), sashMat);
    sash.position.y = -0.14;
    torso.add(sash);

    const sashTail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.03), sashMat);
    sashTail.position.set(-0.22, -0.38, 0.16);
    sashTail.rotation.z = 0.12;
    torso.add(sashTail);

    // Dəri kəmər və sol tərəfdə qızıl kisəsi
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.282, 0.282, 0.04, 14), leatherMat);
    belt.position.y = -0.12;
    torso.add(belt);

    const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), leatherMat);
    pouch.scale.set(0.85, 1.25, 0.75);
    pouch.position.set(0.27, -0.24, 0.12);
    torso.add(pouch);

    // Qollar (qızılı manjet + krem köynək qolu + əl)
    const buildArm = (xOffset) => {
      const arm = new THREE.Group();
      arm.position.set(xOffset, 0.32, 0);

      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 9), coatMat);
      sleeve.position.y = -0.18;
      sleeve.castShadow = true;
      arm.add(sleeve);

      const cuffTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.045, 9), trimMat);
      cuffTrim.position.y = -0.37;
      arm.add(cuffTrim);

      const underSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.12, 8), shirtMat);
      underSleeve.position.y = -0.43;
      arm.add(underSleeve);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
      hand.position.y = -0.51;
      arm.add(hand);
      return arm;
    };

    const leftArm = buildArm(-0.31);
    const rightArm = buildArm(0.31);
    torso.add(leftArm, rightArm);

    // Baş, qara saqqal, tünd qırmızı araxçın və krem çalma
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), skinMat);
    head.position.y = 0.56;
    head.castShadow = true;
    torso.add(head);

    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 8), hairMat);
    beard.position.set(0, 0.50, 0.045);
    beard.scale.set(0.92, 0.95, 0.85);
    torso.add(beard);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 10), capMat);
    cap.position.y = 0.67;
    cap.castShadow = true;
    torso.add(cap);

    const turban = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.072, 10, 18), turbanMat);
    turban.rotation.x = Math.PI / 2 - 0.1;
    turban.position.set(0, 0.65, 0.01);
    turban.castShadow = true;
    torso.add(turban);

    g.add(torso);
    g.userData.parts = { leftLeg, rightLeg, leftArm, rightArm, torso };
    return g;
  }

  async _buildPlayableMerchant() {
    // 1) Əgər xüsusi merchant_turnaround.glb varsa onu yüklə, yoxdursa rigged Blender merchant_hero.glb-ni
    // istifadəçinin konsept vərəqinə (krem çalma + tünd qırmızı araxçın, isti qəhvəyi çuxa, tünd qırmızı qurşaq) uyğunlaşdır
    const customLoaded = await this.modelLoader.loadAnimatedGLB('merchant_turnaround', 1.05);
    const loaded = customLoaded || (await this.modelLoader.loadAnimatedGLB('merchant_hero', 1.05));
    const isCustom = Boolean(customLoaded);
    let mesh;

    if (loaded) {
      mesh = loaded.model;
      mesh.name = 'Merchant';

      if (!isCustom) {
        let headBone = null;
        let hipsBone = null;
        mesh.traverse((obj) => {
          if (obj.isBone) {
            if (obj.name === 'Head') headBone = obj;
            if (obj.name === 'Hips') hipsBone = obj;
          }
          if (!obj.isMesh) return;
          const oName = (obj.name || '').toLowerCase();
          if (oName.includes('papaq')) {
            obj.visible = false;
            return;
          }
          if (obj.material) {
            const mat = obj.material.clone();
            const mName = (mat.name || '').toLowerCase();
            if (mName.includes('chukha') || oName.includes('chukha') || oName.includes('sleeve')) {
              mat.color.setHex(0x8c6345);
            } else if (mName.includes('qursaq') || oName.includes('qursaq')) {
              mat.color.setHex(0x8f2c2c);
            } else if (mName.includes('arkh') || oName.includes('arkh')) {
              mat.color.setHex(0xe8dcc4);
            }
            obj.material = mat;
          }
        });

        // Baş sümüyünə krem çalma + tünd qırmızı araxçın tax
        if (headBone) {
          const turbanGroup = new THREE.Group();
          const turbanMat = new THREE.MeshStandardMaterial({ color: 0xebe0c8, roughness: 0.82 });
          const capMat = new THREE.MeshStandardMaterial({ color: 0x7d2624, roughness: 0.78 });
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 12), capMat);
          cap.position.set(0, 0.145, -0.005);
          cap.scale.set(0.95, 0.82, 1.02);
          turbanGroup.add(cap);

          const wrap1 = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.044, 12, 24), turbanMat);
          wrap1.rotation.x = Math.PI / 2 - 0.12;
          wrap1.position.set(0, 0.125, 0.005);
          turbanGroup.add(wrap1);

          const wrap2 = new THREE.Mesh(new THREE.TorusGeometry(0.116, 0.036, 10, 22), turbanMat);
          wrap2.rotation.x = Math.PI / 2 + 0.08;
          wrap2.rotation.y = 0.25;
          wrap2.position.set(0, 0.145, 0.005);
          turbanGroup.add(wrap2);

          headBone.add(turbanGroup);
        }

        // Bel sümüyünə dəri qızıl kisəsi əlavə et
        if (hipsBone) {
          const pouch = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.75 })
          );
          pouch.scale.set(0.85, 1.25, 0.75);
          pouch.position.set(0.18, -0.05, 0.08);
          hipsBone.add(pouch);
        }
      }

      if (loaded.animations && loaded.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(mesh);
        this.player.mixer = mixer;

        const idleClip =
          THREE.AnimationClip.findByName(loaded.animations, 'Idle') || loaded.animations[0];
        const walkClip =
          THREE.AnimationClip.findByName(loaded.animations, 'Walk') ||
          loaded.animations[1] ||
          loaded.animations[0];

        if (idleClip) {
          this.player.actions.Idle = mixer.clipAction(idleClip);
          this.player.actions.Idle.play();
          this.player.activeActionName = 'Idle';
        }
        if (walkClip && walkClip !== idleClip) {
          this.player.actions.Walk = mixer.clipAction(walkClip);
          this.player.actions.Walk.setEffectiveTimeScale(1.15);
        }
      }
    } else {
      mesh = this._createTurnaroundMerchant();
      mesh.name = 'Merchant';
      this.player.parts = mesh.userData.parts;
      this.player.mixer = null;
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
    if (prevAction) {
      prevAction.crossFadeTo(nextAction, 0.2, true);
    }
    this.player.activeActionName = targetName;
  }

  _handleResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  update(dt) {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.elapsed += dt;

    // 0. 3D Fayton gediş animasiyası (uzun yol: Çöl Bazar -> Qala Qapısı -> Liman Yolu, at & təkər səsləri ilə)
    if (this.faytonDeparture && this.faytonGroup) {
      const nowMs = performance.now();
      const t = Math.min(
        1,
        (nowMs - this.faytonDeparture.startTime) / (this.faytonDeparture.duration * 1000)
      );
      if (nowMs - (this.faytonDeparture.lastSfxTime || 0) >= 460) {
        this.faytonDeparture.lastSfxTime = nowMs;
        this.eventBus.emit('audio:sfx', 'fayton_ride');
      }
      const eased = t * t * (3 - 2 * t);
      this.faytonGroup.position.z =
        this.faytonDeparture.startZ + (this.faytonDeparture.endZ - this.faytonDeparture.startZ) * eased;

      for (const w of this.faytonWheels || []) {
        w.rotation.x += dt * 9.0;
      }
      for (const h of this.faytonHorses || []) {
        h.legs.forEach((leg, idx) => {
          leg.rotation.x = Math.sin(this.elapsed * 14 + idx * 1.6) * 0.45;
        });
      }

      const fz = this.faytonGroup.position.z;
      const fx = this.faytonGroup.position.x;
      this.camera.position.set(fx - 3.6, 3.2, fz - 5.2);
      this.camera.lookAt(fx, 1.4, fz + 2.2);
      this.renderer.render(this.scene, this.camera);

      if (t >= 1) {
        const cb = this.faytonDeparture.onDone;
        this.faytonDeparture = null;
        cb?.();
      }
      return;
    }

    // 1. Parça kölgəliklərin küləkdə yumşaq dalğalanması
    for (const c of this.canopies) {
      c.mesh.position.y = c.baseY + Math.sin(this.elapsed * 1.8 + c.phase) * 0.06;
    }

    // 2. NPC-lərin canlı nəfəs/jest animasiyası (yalnız oyunçuya yaxın olanları yenilə — donmasız FPS!)
    if (this.npcMixers?.length) {
      const px = this.player.pos.x;
      const pz = this.player.pos.z;
      for (const entry of this.npcMixers) {
        if (entry?.mixer) {
          const dx = entry.pos.x - px;
          const dz = entry.pos.z - pz;
          if (dx * dx + dz * dz < 484) {
            entry.mixer.update(dt);
          }
        } else if (typeof entry?.update === 'function') {
          entry.update(dt);
        }
      }
    }
    for (const npc of this.animatedNPCs) {
      const p = npc.group.userData.parts;
      if (p?.torso) {
        p.torso.position.y = 1.18 + Math.sin(this.elapsed * 2.2 + npc.phase) * 0.025;
      }
      if (p?.rightArm) {
        p.rightArm.rotation.x = -0.35 + Math.sin(this.elapsed * 2.0 + npc.phase) * 0.16;
      }
    }

    // 3. Günəş toz dənəcikləri
    if (this.dustPoints) {
      this.dustPoints.rotation.y += dt * 0.025;
    }

    // 4. Oynanıla bilən 3D Tacirin hərəkəti (söhbət və ya mücrü açıq deyilsə)
    let moveX = 0;
    let moveZ = 0;
    const modalBlocking = this.gameManager?.ui?.isInventoryOpen?.() || this.gameManager?.ui?.mapOpen;
    if (!this.dialogueFocus && !modalBlocking) {
      const forward = this._tmpForward.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const right = this._tmpRight.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));

      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
        moveX += forward.x;
        moveZ += forward.z;
      }
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
        moveX -= forward.x;
        moveZ -= forward.z;
      }
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
        moveX += right.x;
        moveZ += right.z;
      }
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
        moveX -= right.x;
        moveZ -= right.z;
      }
      if (this.keys.has('KeyQ')) {
        // Kameranı qəhrəmanın arxasına yumşaq qaytar
        this.camYaw = this.player.yaw + Math.PI;
      }
    }

    const len = Math.hypot(moveX, moveZ);
    this.player.isMoving = len > 0.01;

    if (this.player.isMoving) {
      const nx = moveX / len;
      const nz = moveZ / len;
      const step = this.player.speed * dt;
      const candX = Math.max(-28.0, Math.min(28.0, this.player.pos.x + nx * step));
      const candZ = Math.max(-24.0, Math.min(56.0, this.player.pos.z + nz * step));

      // Atda və ya piyada toqquşma yoxlaması (atda daha geniş radius ki binaya girməsin)
      const isBlocked = (tx, tz) => {
        if (this._isBlockedAt(tx, tz)) return true;
        if (this.player.mountedHorse) {
          return (
            this._isBlockedAt(tx + 0.65, tz) ||
            this._isBlockedAt(tx - 0.65, tz) ||
            this._isBlockedAt(tx, tz + 0.75) ||
            this._isBlockedAt(tx, tz - 0.75)
          );
        }
        return false;
      };
      if (!isBlocked(candX, this.player.pos.z)) {
        this.player.pos.x = candX;
      }
      if (!isBlocked(this.player.pos.x, candZ)) {
        this.player.pos.z = candZ;
      }

      const targetYaw = Math.atan2(nx, nz);
      let diff = targetYaw - this.player.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.yaw += diff * Math.min(1, dt * 11);

      const prevPhase = this.player.walkPhase;
      this.player.walkPhase += dt * 10.5;
      if (Math.floor(prevPhase / Math.PI) !== Math.floor(this.player.walkPhase / Math.PI)) {
        this.eventBus.emit('audio:sfx', 'step');
      }
    }

    // Addım, at sürmə və skelet animasiyası
    if (this.player.group) {
      if (this.player.mountedHorse && this.rideableHorse) {
        this.rideableHorse.position.set(this.player.pos.x, 0, this.player.pos.z);
        this.rideableHorse.rotation.y = this.player.yaw;
        this.player.group.position.set(this.player.pos.x, 0.85, this.player.pos.z);
        this.player.group.rotation.y = this.player.yaw;
        for (let i = 0; i < (this.rideableHorse.userData.legs || []).length; i++) {
          const leg = this.rideableHorse.userData.legs[i];
          leg.rotation.x = this.player.isMoving ? Math.sin(this.player.walkPhase * 1.2 + i * 1.55) * 0.52 : 0;
        }
        if (this.player.mixer) {
          this._switchPlayerAnimation('Idle');
          this.player.mixer.update(dt);
        }
      } else {
        this.player.group.position.copy(this.player.pos);
        this.player.group.rotation.y = this.player.yaw;

        if (this.player.mixer) {
          this._switchPlayerAnimation(this.player.isMoving ? 'Walk' : 'Idle');
          this.player.mixer.update(dt);
        } else {
          const p = this.player.parts;
          const swing = this.player.isMoving ? Math.sin(this.player.walkPhase) * 0.55 : 0;
          if (p.leftLeg) p.leftLeg.rotation.x = swing;
          if (p.rightLeg) p.rightLeg.rotation.x = -swing;
          if (p.leftArm) p.leftArm.rotation.x = -swing * 0.7;
          if (p.rightArm) p.rightArm.rotation.x = swing * 0.7;
          if (p.torso) {
            p.torso.position.y = 1.18 + (this.player.isMoving ? Math.abs(Math.cos(this.player.walkPhase)) * 0.05 : 0);
          }
        }
      }
    }

    // 5. Ən yaxın interaktiv nöqtəni tap (Tacir, Bağban, Çıxış Qapısı)
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

    // 6. Kamera: Çiyinüstü 3D Tacir baxışı ↔ Söhbət konsept bucağı
    const desiredCamPos = this._tmpDesiredPos;
    const desiredLookAt = this._tmpDesiredLook;

    if (this.dialogueFocus) {
      // Konsept şəklinizdəki kinematik çiyinüstü ticarət bucağı (Tacir solda, Bazar Taciri ortada, sağda UI!)
      const pPos = this.player.pos;
      const nPos = this.dialogueFocus.npcPos;
      const dir = this._tmpDir.subVectors(nPos, pPos).setY(0).normalize();
      const right = this._tmpRight.set(-dir.z, 0, dir.x);

      desiredCamPos
        .copy(pPos)
        .addScaledVector(dir, -2.55)
        .addScaledVector(right, 0.95);
      desiredCamPos.y += 1.95;

      desiredLookAt
        .lerpVectors(pPos, nPos, 0.65)
        .addScaledVector(right, 0.75);
      desiredLookAt.y += 1.38;
    } else {
      // 3-cü şəxs GTA-üslublu çiyinüstü RPG kamerası (sağ çiyin üzərindən detallı baxış)
      const camDist = 3.85;
      const rightX = Math.cos(this.camYaw) * 0.58;
      const rightZ = -Math.sin(this.camYaw) * 0.58;

      desiredCamPos.set(
        this.player.pos.x + Math.sin(this.camYaw) * camDist * Math.cos(this.camPitch) + rightX,
        this.player.pos.y + 1.65 + Math.sin(this.camPitch) * camDist,
        this.player.pos.z + Math.cos(this.camYaw) * camDist * Math.cos(this.camPitch) + rightZ
      );

      // Kamera divara girməsin və dar küçədə qəhrəmana yaxınlaşsın
      desiredCamPos.y = Math.max(1.05, desiredCamPos.y);
      if (this.player.pos.z < 12.8) {
        desiredCamPos.x = Math.max(-11.4, Math.min(11.4, desiredCamPos.x));
        desiredCamPos.z = Math.max(-9.4, Math.min(12.6, desiredCamPos.z));
      } else {
        desiredCamPos.x = Math.max(-5.2, Math.min(5.2, desiredCamPos.x));
      }

      desiredLookAt.set(
        this.player.pos.x - Math.sin(this.camYaw) * 3.2 + rightX * 0.35,
        this.player.pos.y + 1.48,
        this.player.pos.z - Math.cos(this.camYaw) * 3.2 + rightZ * 0.35
      );
    }

    this.camPos.lerp(desiredCamPos, Math.min(1, dt * 6.5));
    this.camLook.lerp(desiredLookAt, Math.min(1, dt * 7.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.gameManager?.ui?.updateMinimap?.({
      x: this.player.pos.x,
      z: this.player.pos.z,
      yaw: this.player.yaw,
      markers: this.minimapMarkers || [],
      cityName: this.city?.short_name || '',
      cityId: this.cityId,
    });

    this.renderer.render(this.scene, this.camera);
  }

  _isBlockedAt(x, z) {
    // 0. Karvansaray divarları (Cənub qapısı |x| < 2.2 və Şimal Saray tağı |x| < 2.2 açıqdır!)
    if (z < -12.6) {
      if (Math.abs(x) > 10.5 || z < -24.0) return true;
    } else if (z <= -9.6 && z >= -12.6) {
      if (Math.abs(x) >= 2.15) return true;
    } else if (z < 12.6) {
      if (x < -11.0 || x > 11.0) return true;
    }
    if (z >= 12.6 && z <= 15.5) {
      if (Math.abs(x) >= 2.15) return true;
    }

    // 1. Mərmər fəvvarə hovuzu / abidə və keşikçi nöqtəsi
    const [fx, fz] = this.cityLayout.fountain;
    if (Math.hypot(x - fx, z - fz) < 2.65) return true;
    if (Math.hypot(x - 6.4, z - 2.2) < 0.78) return true;

    // 2. Əsas xalça tezgahı + meyvə səbətləri (şəhər planına görə dinamik)
    const [csx, csz] = this.cityLayout.carpetStall;
    if (Math.abs(x - csx) < 2.2 && Math.abs(z - csz) < 1.55) return true;

    const [fsx, fsz] = this.cityLayout.fruitStall;
    if (Math.abs(x - fsx) < 2.1 && Math.abs(z - fsz) < 1.5) return true;

    // 4. Sağ arxadakı karvan arabası və əlavə xalça stendi
    if (x > 5.35 && x < 8.35 && z > 5.45 && z < 8.95) return true;
    if (x > 6.3 && x < 9.3 && z > -5.5 && z < -2.9) return true;

    // 5. Çöl bazar stendi, təchizat anbarı, Fayton, At, küçə evləri, Qala Qapısı və Liman
    if (x > -9.2 && x < -5.8 && z > 20.5 && z < 23.8) return true;
    if (x > 5.8 && x < 9.2 && z > 21.5 && z < 24.8) return true;
    // Fayton və qoşulu 2 at (x = 2.0..4.2, z = 16.0..21.6)
    if (x > 1.9 && x < 4.3 && z > 15.8 && z < 21.8) return true;
    // Minilməmiş atın toqquşması (piyada atın içindən keçməsin)
    if (!this.player.mountedHorse && this.rideableHorse) {
      const hx = this.rideableHorse.position.x;
      const hz = this.rideableHorse.position.z;
      if (Math.hypot(x - hx, z - hz) < 1.15) return true;
    }
    if (z > 15.5) {
      // Çöl bazar taciri və təchizat anbarı cibləri açıqdır, qalan yan binalar/piştaxtalar bağlıdır
      const inOuterStallPocket = x <= -5.5 && x >= -10.0 && z >= 19.2 && z <= 25.2;
      const inDepotPocket = x >= 5.5 && x <= 10.0 && z >= 19.5 && z <= 25.6;
      if (z < 37.0 && !inOuterStallPocket && !inDepotPocket && Math.abs(x) > 5.5) return true;
      if (z >= 36.5 && z <= 39.0 && Math.abs(x) > 2.55) return true;
      if (z > 39.0 && Math.abs(x) > 6.6) return true;
      if (z > 57.6) return true;
    }

    return false;
  }

  unmount() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    if (this.renderer) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this._onPointerDown);
      dom.removeEventListener('contextmenu', this._onContextMenu);
      this.renderer.dispose();
    }
    this.container.innerHTML = '';
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
