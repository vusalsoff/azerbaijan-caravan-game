import * as THREE from 'three';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/Caravanserai_Bazaar.js
 * "İRS — Tacirin Yolu" konseptinə uyğun günəşli 3D Tarixi Azərbaycan Karvansarayı:
 * - Oynanıla bilən 3D Tacir (WASD ilə sərbəst yeriyir, addım animasiyası, papaq & naxışlı çuxa)
 * - Çiyinüstü 3D RPG kamerası (siçanla fırlatma + Tacirlə danışanda kinematik konsept bucağı)
 * - Daş tağlı karvansaray həyəti, dalğalanan kölgəliklər, xalça tezgahı, mis səhənglər,
 *   alma/armud səbətləri, Bazar Taciri, Kəndli Bağban, Qoruyucu və Xəritə Çıxış Qapısı.
 */
export class CaravanseraiBazaarScene {
  constructor(container, eventBus, data, gameManager, cityId = 'City_Baku') {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.gameManager = gameManager;
    this.cityId = cityId;
    this.city = data.getCityById(cityId) || data.cities[0];
    this.modelLoader = new ModelLoader();

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // 3D Tacir vəziyyəti
    this.player = {
      group: null,
      pos: new THREE.Vector3(0, 0, 7.5),
      yaw: Math.PI, // Bazar tezgahına (-Z) tərəf baxır
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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd8c39e);
    this.scene.fog = new THREE.FogExp2(0xe2cca4, 0.014);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.2, 180);
    this.camera.position.copy(this.camPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    const hemi = new THREE.HemisphereLight(0xfff1d4, 0x805d3b, 0.95);
    this.scene.add(hemi);

    // İsti günorta-axşamüstü günəş işığı (karvansaray tağlarından kölgələr)
    const sun = new THREE.DirectionalLight(0xffe2ad, 2.0);
    sun.position.set(18, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Bazar tezgahına isti əks işıq
    const warmFill = new THREE.PointLight(0xffb85c, 1.35, 18);
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
      11,
      11
    );
    const floorMat = pbrOpts
      ? new THREE.MeshStandardMaterial({ ...pbrOpts, roughness: 0.92, metalness: 0.04 })
      : new THREE.MeshStandardMaterial({
          map: this._createCobblestoneTexture(),
          roughness: 0.9,
          metalness: 0.04,
        });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Həyətin mərkəzində kiçik tarixi daş hovuz (Şəki/Şamaxı karvansaray üslubu)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbda178, roughness: 0.85 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.55, 0.65, 8), stoneMat);
    basin.position.set(-7.2, 0.32, 3.2);
    basin.castShadow = true;
    basin.receiveShadow = true;
    this.scene.add(basin);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.95, 1.95, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b8ea5, roughness: 0.15, metalness: 0.25 })
    );
    water.position.set(-7.2, 0.56, 3.2);
    this.scene.add(water);
  }

  /**
   * İkimərtəbəli daş tağlı Karvansaray divarları, mavi kaşı bəzəkləri, günbəz və çıxış qapısı
   */
  async _buildCaravanseraiArchitecture() {
    const pbrWall = await this.modelLoader.loadPBRMaterialOptions(
      'stone_wall',
      'coral_stone_wall',
      2.2,
      1.8
    );
    const stoneMat = pbrWall
      ? new THREE.MeshStandardMaterial({ ...pbrWall, color: 0xebd7b7, roughness: 0.88 })
      : new THREE.MeshStandardMaterial({ map: this._createSandstoneTexture(), roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x9c7b50, roughness: 0.8 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x265d82, roughness: 0.35, metalness: 0.15 });
    const woodDoorMat = new THREE.MeshStandardMaterial({ color: 0x4f2e17, roughness: 0.85 });

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

    // 4 tərəfli karvansaray həyəti
    buildArcadeWall(26, 0, -11, 0, false); // Şimal (əsas bazar sırası)
    buildArcadeWall(26, 0, 14, Math.PI, true); // Cənub (Xəritəyə çıxış qapısı!)
    buildArcadeWall(25, -13, 1.5, Math.PI / 2, false); // Qərb
    buildArcadeWall(25, 13, 1.5, -Math.PI / 2, false); // Şərq

    // Arxa planda tarixi günbəz, minarə və yaşıl sərv ağacları
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 3.8, 16), stoneMat);
    domeBase.position.set(-7, 9.2, -16);
    this.scene.add(domeBase);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x3b768f, roughness: 0.45 })
    );
    dome.position.set(-7, 11.1, -16);
    this.scene.add(dome);

    const cypressMat = new THREE.MeshStandardMaterial({ color: 0x325e34, roughness: 0.9 });
    for (const [tx, tz, h] of [
      [-11, -16, 11],
      [-2, -17, 10],
      [9, -16, 12],
      [17, -6, 11],
      [-17, -4, 10.5],
    ]) {
      const tree = new THREE.Mesh(new THREE.ConeGeometry(1.4, h, 8), cypressMat);
      tree.position.set(tx, h / 2 + 2, tz);
      this.scene.add(tree);
    }

    // Çıxış qapısı interaksiyası (Qədim 3D Xəritəyə qayıtmaq üçün)
    this.interactables.push({
      id: 'gate_world_map',
      type: 'exit_to_map',
      label: 'Qədim 3D Xəritəyə Çıx',
      pos: new THREE.Vector3(0, 0, 12.2),
      radius: 3.4,
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
  async _buildBazaarStallsAndProps() {
    const carpetVariant = this.city?.carpet_variant || 'karabakh';
    const mainCarpetTex = await this.modelLoader.loadCarpetTexture(carpetVariant);
    const secondCarpetTex = await this.modelLoader.loadCarpetTexture('quba');
    const thirdCarpetTex = await this.modelLoader.loadCarpetTexture('shirvan');

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c361a, roughness: 0.85 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xc27738, roughness: 0.3, metalness: 0.82 });

    // --- 1. ƏSAS XALÇA TEZGAHI (Mərkəzdə, z = -3.2) ---
    const stallGroup = new THREE.Group();
    stallGroup.position.set(0.8, 0, -3.2);

    const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 1.75), woodMat);
    table.position.y = 0.52;
    table.castShadow = true;
    table.receiveShadow = true;
    stallGroup.add(table);

    // Tezgahın üstünə sərilmiş böyük naxışlı Azərbaycan xalçası
    const drapedCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 0.08, 2.15),
      new THREE.MeshStandardMaterial({ map: mainCarpetTex, roughness: 0.88 })
    );
    drapedCarpet.position.set(0, 1.08, 0.16);
    drapedCarpet.rotation.x = 0.08;
    drapedCarpet.castShadow = true;
    stallGroup.add(drapedCarpet);

    // Ön tərəfdən sallanan xalça hissəsi
    const frontHang = new THREE.Mesh(
      new THREE.PlaneGeometry(3.3, 0.95),
      new THREE.MeshStandardMaterial({ map: mainCarpetTex, side: THREE.DoubleSide, roughness: 0.88 })
    );
    frontHang.position.set(0, 0.62, 1.2);
    stallGroup.add(frontHang);

    // Arxa divardan asılan əlavə 2 fərqli bölgə xalçası (Quba & Şirvan)
    const wallCarpet1 = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 3.2),
      new THREE.MeshStandardMaterial({ map: secondCarpetTex, side: THREE.DoubleSide, roughness: 0.9 })
    );
    wallCarpet1.position.set(2.8, 2.8, -1.6);
    wallCarpet1.rotation.y = -0.35;
    stallGroup.add(wallCarpet1);

    const wallCarpet2 = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.9),
      new THREE.MeshStandardMaterial({ map: thirdCarpetTex, side: THREE.DoubleSide, roughness: 0.9 })
    );
    wallCarpet2.position.set(-2.5, 2.7, -1.7);
    wallCarpet2.rotation.y = 0.3;
    stallGroup.add(wallCarpet2);

    // Bükülmüş ipək və xalça rulonları
    const rollColors = [0x22686c, 0x8f252c, 0xc79238, 0x3b4d7c];
    rollColors.forEach((col, i) => {
      const roll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 1.25, 12),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 })
      );
      roll.rotation.z = Math.PI / 2;
      roll.position.set(1.9, 1.2 + i * 0.28, -0.35);
      roll.castShadow = true;
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

    // --- BAZAR TACİRİ NPC (Xalça tezgahının arxasında, gülümsəyən ağsaqqal) ---
    const elderTrader = this._createDetailedHuman({
      coatColor: 0x2a4866,
      sashColor: 0xd4a442,
      hatType: 'turban',
      hatColor: 0xe3d3b0,
      hasBeard: true,
    });
    elderTrader.position.set(0.9, 0, -4.6);
    elderTrader.rotation.y = 0; // Oyunçuya tərəf (+Z)
    this.scene.add(elderTrader);
    this.animatedNPCs.push({ group: elderTrader, phase: 0, baseY: 0 });

    const primaryLuxuryItem =
      this.city?.goods?.find((g) => g.item_id === 'carpet' || g.category === 'luxury')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'carpet';

    this.interactables.push({
      id: 'trader_carpet',
      type: 'market',
      label: `Baş Tacirlə Sövdələş (${this.city?.short_name || 'Bazar'})`,
      pos: new THREE.Vector3(0.8, 0, -2.1),
      npcPos: new THREE.Vector3(0.9, 1.45, -4.4),
      radius: 3.6,
      defaultItem: primaryLuxuryItem,
    });

    // --- 2. KƏND TƏSƏRRÜFATI / MEYVƏ TEZGAHI (Sol tərəfdə, alma/armud/nar səbətləri!) ---
    const fruitGroup = new THREE.Group();
    fruitGroup.position.set(-4.8, 0, -1.8);

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

    const glbCrates = await this.modelLoader.loadOptionalGLB('prop_bazaar_crates', 1.15);
    if (glbCrates) {
      glbCrates.position.set(-2.2, 0, -1.1);
      glbCrates.rotation.y = 0.4;
      fruitGroup.add(glbCrates);
    }
    this.scene.add(fruitGroup);

    const farmerNPC = this._createDetailedHuman({
      coatColor: 0x4b6e3c,
      sashColor: 0xb8562b,
      hatType: 'papaq',
      hatColor: 0x4e3722,
      hasBeard: false,
    });
    farmerNPC.position.set(-5.2, 0, -3.2);
    farmerNPC.rotation.y = 0.35;
    this.scene.add(farmerNPC);
    this.animatedNPCs.push({ group: farmerNPC, phase: 2.1, baseY: 0 });

    const primaryAgriItem =
      this.city?.goods?.find((g) => g.category === 'agriculture')?.item_id ||
      this.city?.goods?.[0]?.item_id ||
      'apple';

    this.interactables.push({
      id: 'trader_farmer',
      type: 'market',
      label: 'Bağbanla Sövdələş (Bağ Nemətləri)',
      pos: new THREE.Vector3(-4.5, 0, -0.6),
      npcPos: new THREE.Vector3(-5.0, 1.45, -3.0),
      radius: 3.4,
      defaultItem: primaryAgriItem,
    });

    // --- 3. QORUYUCU & KARVAN ARABASI (Həyətin sağ/arxa hissəsində canlı atmosfer) ---
    const guardModel =
      (await this.modelLoader.loadOptionalGLB('guard', 1.15)) ||
      this._createDetailedHuman({
        coatColor: 0x266c96,
        sashColor: 0xd9a841,
        hatType: 'papaq',
        hatColor: 0x2e2116,
      });
    guardModel.position.set(6.4, 0, 2.2);
    guardModel.rotation.y = -0.8;
    this.scene.add(guardModel);

    const wagonModel = await this.modelLoader.loadOptionalGLB('merchant_caravan', 1.2);
    if (wagonModel) {
      wagonModel.position.set(6.8, 0, 7.2);
      wagonModel.rotation.y = -2.4;
      this.scene.add(wagonModel);
    }

    // Yaxınlıqda əlavə xalça tezgahı .glb-si (əgər varsa)
    const extraStall = await this.modelLoader.loadOptionalGLB('prop_carpet_stall', 1.15);
    if (extraStall) {
      await this.modelLoader.applyCarpetVariant(extraStall, 'ganja');
      extraStall.position.set(7.8, 0, -4.2);
      extraStall.rotation.y = -0.6;
      this.scene.add(extraStall);
    }
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

  async _buildPlayableMerchant() {
    // Blender-də hazırlanmış detallı "İRS" Taciri (merchant_hero.glb — Idle & Walk animasiyalı)
    const loaded = await this.modelLoader.loadAnimatedGLB('merchant_hero', 1.05);
    let mesh;

    if (loaded) {
      mesh = loaded.model;
      mesh.name = 'Merchant';
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
      mesh = this._createDetailedHuman({
        coatColor: 0x4f3422,
        sashColor: 0x8f2924,
        hatType: 'papaq',
        hatColor: 0x332114,
        hasBeard: false,
      });
      this.player.parts = mesh.userData.parts;
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

    // 1. Parça kölgəliklərin küləkdə yumşaq dalğalanması
    for (const c of this.canopies) {
      c.mesh.position.y = c.baseY + Math.sin(this.elapsed * 1.8 + c.phase) * 0.06;
    }

    // 2. NPC-lərin canlı nəfəs/jest animasiyası
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
      const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));

      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
        moveX += forward.x;
        moveZ += forward.z;
      }
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
        moveX -= forward.x;
        moveZ -= forward.z;
      }
      if (this.keys.has('KeyD')) {
        moveX += right.x;
        moveZ += right.z;
      }
      if (this.keys.has('KeyA')) {
        moveX -= right.x;
        moveZ -= right.z;
      }
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyQ')) {
        this.camYaw += dt * 1.9;
      }
      if (this.keys.has('ArrowRight')) {
        this.camYaw -= dt * 1.9;
      }
    }

    const len = Math.hypot(moveX, moveZ);
    this.player.isMoving = len > 0.01;

    if (this.player.isMoving) {
      const nx = moveX / len;
      const nz = moveZ / len;
      const step = this.player.speed * dt;
      const candX = Math.max(-10.8, Math.min(10.8, this.player.pos.x + nx * step));
      const candZ = Math.max(-8.2, Math.min(12.6, this.player.pos.z + nz * step));

      // Bütün bazar köşkləri, meyvə səbətləri, küplər, sandıqlar, araba və hovuz üçün sürüşməli toqquşma yoxlaması
      if (!this._isBlockedAt(candX, this.player.pos.z)) {
        this.player.pos.x = candX;
      }
      if (!this._isBlockedAt(this.player.pos.x, candZ)) {
        this.player.pos.z = candZ;
      }

      const targetYaw = Math.atan2(nx, nz);
      let diff = targetYaw - this.player.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.yaw += diff * Math.min(1, dt * 11);

      this.player.walkPhase += dt * 10.5;
    }

    // Addım və skelet animasiyası
    if (this.player.group) {
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
    let desiredCamPos;
    let desiredLookAt;

    if (this.dialogueFocus) {
      // Konsept şəklinizdəki kinematik çiyinüstü ticarət bucağı (Tacir solda, Bazar Taciri ortada, sağda UI!)
      const pPos = this.player.pos;
      const nPos = this.dialogueFocus.npcPos;
      const dir = new THREE.Vector3().subVectors(nPos, pPos).setY(0).normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x);

      desiredCamPos = new THREE.Vector3()
        .copy(pPos)
        .addScaledVector(dir, -2.55)
        .addScaledVector(right, 0.95)
        .add(new THREE.Vector3(0, 1.95, 0));

      desiredLookAt = new THREE.Vector3()
        .lerpVectors(pPos, nPos, 0.65)
        .addScaledVector(right, 0.75)
        .add(new THREE.Vector3(0, 1.38, 0));
    } else {
      // 3-cü şəxs GTA-üslublu çiyinüstü RPG kamerası (sağ çiyin üzərindən detallı baxış)
      const camDist = 3.85;
      const rightX = Math.cos(this.camYaw) * 0.58;
      const rightZ = -Math.sin(this.camYaw) * 0.58;

      desiredCamPos = new THREE.Vector3(
        this.player.pos.x + Math.sin(this.camYaw) * camDist * Math.cos(this.camPitch) + rightX,
        this.player.pos.y + 1.65 + Math.sin(this.camPitch) * camDist,
        this.player.pos.z + Math.cos(this.camYaw) * camDist * Math.cos(this.camPitch) + rightZ
      );

      desiredLookAt = new THREE.Vector3(
        this.player.pos.x - Math.sin(this.camYaw) * 3.2 + rightX * 0.35,
        this.player.pos.y + 1.48,
        this.player.pos.z - Math.cos(this.camYaw) * 3.2 + rightZ * 0.35
      );
    }

    this.camPos.lerp(desiredCamPos, Math.min(1, dt * 6.5));
    this.camLook.lerp(desiredLookAt, Math.min(1, dt * 7.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.renderer.render(this.scene, this.camera);
  }

  _isBlockedAt(x, z) {
    // 1. Mərmər fəvvarə hovuzu (-7.2, 3.2) və keşikçi / NPC nöqtələri
    if (Math.hypot(x + 7.2, z - 3.2) < 2.75) return true;
    if (Math.hypot(x - 6.4, z - 2.2) < 0.78) return true;
    if (Math.hypot(x + 5.2, z + 3.2) < 0.75) return true;

    // 2. Əsas xalça tezgahı + sağ önündəki mis səhənglər
    if (x > -1.55 && x < 3.15 && z > -4.85 && z < -1.25) return true;

    // 3. Sol meyvə səbətləri və taxta bazar sandıqları
    if (x > -7.55 && x < -3.35 && z > -3.55 && z < -0.75) return true;

    // 4. Sağ arxadakı karvan arabası və əlavə xalça stendi
    if (x > 5.35 && x < 8.35 && z > 5.45 && z < 8.95) return true;
    if (x > 6.3 && x < 9.3 && z > -5.5 && z < -2.9) return true;

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
