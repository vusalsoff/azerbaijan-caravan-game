import * as THREE from 'three';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/World_Azerbaijan.js
 * Qədimi perqament kartoqrafiya üslubunda 3D Azərbaycan xəritəsi:
 * - 2048x1536 prosedural qədimi perqament teksturası (kompas gülü, izohipslər, yazı xəttatlığı, Xəzər sahili)
 * - 3D relyef, taxta-bürünc xəritə masası çərçivəsi, animasiyalı gəmi, yellənən şəhər bayraqları
 * - Təkərləri fırlanan, atlı və toz izli animasiyalı Karvan
 * - GTA V məntiqi: Xəritənin içinə klikləyəndə qızılı GPS marşrutu çəkir və kamera axıcı şəkildə
 *   karvanın arxasına enərək 3D GTA sürüş rejiminə keçir (V / scroll ilə qədim xəritəyə qayıdır).
 */
export class WorldAzerbaijanScene {
  constructor(container, eventBus, data, gameManager) {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.gameManager = gameManager;
    this.modelLoader = new ModelLoader();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.terrainMesh = null;
    this.seaMesh = null;
    this.seaBasePositions = null;

    this.mapWidth = 148;
    this.mapDepth = 104;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.cityPositions = {
      City_Baku: { x: 28, z: 4, radius: 9.0, label: 'Bakı · İçərişəhər' },
      City_Sheki: { x: -16, z: -20, radius: 9.0, label: 'Şəki · Karvansaray' },
      City_Shusha: { x: -24, z: 16, radius: 9.0, label: 'Şuşa · Qala Şəhəri' },
    };

    // Kamera rejimi və GTA animasiyalı keçid (0 = Qədim Xəritə, 1 = GTA Yaxın 3D)
    this.cameraMode = 'map';
    this.gtaBlend = 0;
    this.gtaOrbitOffset = 0;
    this.isRightDragging = false;
    this.lastMouseX = 0;
    this.camLookTarget = new THREE.Vector3(10, 1, 2);

    // Animasiya massivləri
    this.elapsed = 0;
    this.clouds = [];
    this.cityRings = [];
    this.cityFlags = [];
    this.npcMarkers = [];
    this.roadCurves = [];
    this.caravanParts = { wheels: [], horseLegs: [], horseHead: null, banner: null };
    this.caspianShip = null;
    this.dustPuffs = [];
    this.dustTimer = 0;

    // GTA GPS Waypoint + dinamik qızılı marşrut xətti
    this.waypointGroup = null;
    this.waypointRing = null;
    this.waypointBeam = null;
    this.gpsLine = null;

    this._onResize = () => this._handleResize();
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onPointerUp = () => {
      this.isRightDragging = false;
    };
    this._onWheel = (e) => this._handleWheel(e);
    this._onContextMenu = (e) => e.preventDefault();
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getCityPositions() {
    return this.cityPositions;
  }

  setCameraMode(mode) {
    this.cameraMode = mode === 'gta' ? 'gta' : 'map';
    if (this.cameraMode === 'map') {
      this.gtaOrbitOffset = 0;
    }
  }

  setWaypointVisual(x, z) {
    if (!this.waypointGroup) return;
    const y = this.getTerrainHeight(x, z);
    this.waypointGroup.position.set(x, y + 0.18, z);
    this.waypointGroup.visible = true;
  }

  _getCoastlineX(z) {
    const absheronPeninsula = 6.8 * Math.exp(-((z - 4) * (z - 4)) / 52);
    const wave = Math.sin(z * 0.13) * 2.0 + Math.cos(z * 0.06) * 1.4;
    return 33.5 + absheronPeninsula + wave;
  }

  getTerrainHeight(x, z) {
    const coastX = this._getCoastlineX(z);
    if (x > coastX + 2.5) {
      return -1.4;
    }

    const greaterCaucasus =
      Math.exp(-(((x + 8) * (x + 8)) / 780 + ((z + 33) * (z + 33)) / 210)) * 9.6 +
      Math.exp(-(((x + 28) * (x + 28)) / 420 + ((z + 28) * (z + 28)) / 180)) * 6.4;

    const lesserCaucasus =
      Math.exp(-(((x + 33) * (x + 33)) / 480 + ((z - 19) * (z - 19)) / 360)) * 7.2;

    const shushaPlateau =
      Math.exp(-(((x + 24) * (x + 24)) / 160 + ((z - 16) * (z - 16)) / 160)) * 2.4;

    const absheronRidge =
      Math.exp(-(((x - 26) * (x - 26)) / 140 + ((z - 5) * (z - 5)) / 140)) * 1.1;

    const kuraLowland =
      Math.exp(-(((x - 2) * (x - 2)) / 380 + ((z - 4) * (z - 4)) / 260)) * 0.55;

    const gentleHills =
      Math.sin(x * 0.085) * Math.cos(z * 0.095) * 0.6 +
      Math.sin((x + z) * 0.16) * 0.22 +
      0.75;

    const distToCoast = coastX - x;
    const coastFade = distToCoast < 7 ? Math.max(0, distToCoast / 7) : 1;

    let h =
      (greaterCaucasus + lesserCaucasus + shushaPlateau + absheronRidge + gentleHills - kuraLowland) *
      coastFade;

    for (const key of Object.keys(this.cityPositions)) {
      const c = this.cityPositions[key];
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < 6.8) {
        const blend = Math.max(0, 1 - d / 6.8);
        const targetH = key === 'City_Baku' ? 1.0 : key === 'City_Sheki' ? 2.2 : 2.8;
        h = h * (1 - blend * 0.72) + targetH * (blend * 0.72);
      }
    }

    return distToCoast <= 0 ? Math.max(-1.4, h - 0.55) : Math.max(0.18, h);
  }

  async mount() {
    this.container.innerHTML = '';

    this.scene = new THREE.Scene();
    // İsti şam işığı / qədim karvansaray xəritə masası atmosferi
    this.scene.background = new THREE.Color(0x231a12);
    this.scene.fog = new THREE.FogExp2(0x2a1f15, 0.0042);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.5, 420);
    this.camera.position.set(4, 72, 62);
    this.camLookTarget.set(4, 1, 2);
    this.camera.lookAt(this.camLookTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    this._buildLights();
    this._buildAntiqueParchmentTerrain();
    this._buildMapTableFrame();
    this._buildAntiqueCaravanRoads();
    this._buildCaspianShip();
    this._buildAntiqueClouds();
    await this._buildCities();
    this._buildDynamicNPCMarkers();
    this._buildWaypointAndGPS();
    await this._buildCharacters();

    window.addEventListener('resize', this._onResize);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    dom.addEventListener('wheel', this._onWheel, { passive: false });
    dom.addEventListener('contextmenu', this._onContextMenu);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xffe9c2, 0x4b3522, 0.95);
    this.scene.add(hemi);

    // İsti qızılı masa/günəş işığı
    const sun = new THREE.DirectionalLight(0xffdfb0, 1.55);
    sun.position.set(48, 82, 34);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -85;
    sun.shadow.camera.right = 85;
    sun.shadow.camera.top = 75;
    sun.shadow.camera.bottom = -75;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Yumşaq əks işıq
    const fill = new THREE.DirectionalLight(0xd2a872, 0.4);
    fill.position.set(-55, 38, -30);
    this.scene.add(fill);
  }

  /**
   * 2048×1536 Qədimi Perqament Kartoqrafiya Teksturası yaradır:
   * kağız teksturası, yaşlanma ləkələri, kompas gülü, rumba xətləri,
   * mürəkkəbli dağ ştrixləri, Kür çayı, Xəzər sahil dalğaları və qədim yazılar.
   */
  _createAntiqueMapTexture() {
    const W = 2048;
    const H = 1536;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const toPx = (wx, wz) => ({
      px: ((wx + this.mapWidth / 2) / this.mapWidth) * W,
      py: ((wz + this.mapDepth / 2) / this.mapDepth) * H,
    });

    // 1. Qədim perqament əsas fonu
    const bgGrad = ctx.createRadialGradient(W * 0.45, H * 0.5, 120, W * 0.5, H * 0.5, W * 0.72);
    bgGrad.addColorStop(0, '#ebd9b1');
    bgGrad.addColorStop(0.55, '#d8be8c');
    bgGrad.addColorStop(1, '#a98555');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Çay ləkələri və perqament dənəvərliyi
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 65; i++) {
      const cx = rand() * W;
      const cy = rand() * H;
      const r = 40 + rand() * 190;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      g.addColorStop(0, 'rgba(122, 82, 42, 0.09)');
      g.addColorStop(1, 'rgba(122, 82, 42, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Xırda kağız teksturası
    ctx.fillStyle = 'rgba(72, 46, 20, 0.05)';
    for (let i = 0; i < 3500; i++) {
      ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 3, 1 + rand() * 2);
    }

    // 3. Relyef hündürlüyünə görə köhnə akvarel rəngləndirməsi və izohipslər
    const step = 16;
    for (let py = 0; py < H; py += step) {
      for (let px = 0; px < W; px += step) {
        const wx = (px / W) * this.mapWidth - this.mapWidth / 2;
        const wz = (py / H) * this.mapDepth - this.mapDepth / 2;
        const y = this.getTerrainHeight(wx, wz);

        if (y < 0.08) {
          // Köhnə dəniz xəritəsi mavi-firuzəyi mürəkkəb
          ctx.fillStyle = 'rgba(42, 84, 98, 0.72)';
          ctx.fillRect(px, py, step + 1, step + 1);
        } else if (y > 6.5) {
          // Qafqaz zirvələri (açıq qədim boz-krem)
          ctx.fillStyle = 'rgba(130, 100, 68, 0.36)';
          ctx.fillRect(px, py, step + 1, step + 1);
        } else if (y > 3.2) {
          // Dağlıq yamaclar (isti qəhvəyi-zeytun)
          ctx.fillStyle = 'rgba(148, 114, 65, 0.24)';
          ctx.fillRect(px, py, step + 1, step + 1);
        } else if (y > 1.3) {
          // Vadilər (solğun qədim zeytun tonu)
          ctx.fillStyle = 'rgba(116, 126, 78, 0.16)';
          ctx.fillRect(px, py, step + 1, step + 1);
        }
      }
    }

    // 4. Xəzər sahil xətti — qədim mürəkkəb qıvrımları (sahil ştrixləri)
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      for (let wz = -this.mapDepth / 2; wz <= this.mapDepth / 2; wz += 1.2) {
        const coastX = this._getCoastlineX(wz) + ring * 2.1;
        const p = toPx(coastX, wz);
        if (wz === -this.mapDepth / 2) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      ctx.strokeStyle =
        ring === 0 ? 'rgba(62, 38, 18, 0.85)' : `rgba(46, 78, 92, ${0.42 - ring * 0.09})`;
      ctx.lineWidth = ring === 0 ? 5 : 2;
      ctx.stroke();
    }

    // 5. Qədim xəritə rumba xətləri (Portolan naviqasiya toru)
    const compassCenter = toPx(55, 16);
    ctx.save();
    ctx.strokeStyle = 'rgba(82, 52, 24, 0.16)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(compassCenter.px, compassCenter.py);
      ctx.lineTo(compassCenter.px + Math.cos(ang) * 2400, compassCenter.py + Math.sin(ang) * 2400);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Kartoqrafik dağ ştrixləri (əllə çəkilmiş qədim dağ piktoqramları)
    ctx.strokeStyle = 'rgba(78, 49, 24, 0.48)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 90; i++) {
      const wx = -58 + rand() * 84;
      const wz = -44 + rand() * 86;
      const h = this.getTerrainHeight(wx, wz);
      if (h < 3.4) continue;
      const p = toPx(wx, wz);
      const mw = 14 + h * 2.2;
      const mh = 11 + h * 1.9;
      ctx.beginPath();
      ctx.moveTo(p.px - mw, p.py + mh * 0.4);
      ctx.quadraticCurveTo(p.px - mw * 0.2, p.py - mh * 0.9, p.px, p.py - mh);
      ctx.quadraticCurveTo(p.px + mw * 0.25, p.py - mh * 0.8, p.px + mw, p.py + mh * 0.4);
      ctx.stroke();
      // Kölgə ştrixi
      ctx.beginPath();
      ctx.moveTo(p.px, p.py - mh);
      ctx.lineTo(p.px + mw * 0.45, p.py + mh * 0.3);
      ctx.stroke();
    }

    // 7. Kür çayı (mürəkkəblə çəkilmiş çay xətti)
    const riverPts = [
      [-48, -11],
      [-26, -5],
      [-6, 2],
      [14, 11],
      [27, 21],
      [39, 29],
    ].map(([x, z]) => toPx(x, z));

    ctx.beginPath();
    ctx.moveTo(riverPts[0].px, riverPts[0].py);
    for (let i = 1; i < riverPts.length - 1; i++) {
      const mx = (riverPts[i].px + riverPts[i + 1].px) / 2;
      const my = (riverPts[i].py + riverPts[i + 1].py) / 2;
      ctx.quadraticCurveTo(riverPts[i].px, riverPts[i].py, mx, my);
    }
    const lastR = riverPts[riverPts.length - 1];
    ctx.lineTo(lastR.px, lastR.py);
    ctx.strokeStyle = 'rgba(38, 86, 108, 0.72)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220, 232, 230, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 8. Qədim qırmızı-qızılı qırıq-qırıq İpək Yolu xətləri
    const b = this.cityPositions.City_Baku;
    const s = this.cityPositions.City_Sheki;
    const sh = this.cityPositions.City_Shusha;
    const inkRoutes = [
      [toPx(b.x, b.z), toPx(8, -10), toPx(s.x, s.z)],
      [toPx(b.x, b.z), toPx(4, 14), toPx(sh.x, sh.z)],
      [toPx(s.x, s.z), toPx(-24, -2), toPx(sh.x, sh.z)],
    ];

    ctx.save();
    ctx.setLineDash([18, 12]);
    ctx.strokeStyle = 'rgba(138, 42, 24, 0.78)';
    ctx.lineWidth = 6;
    for (const [p0, p1, p2] of inkRoutes) {
      ctx.beginPath();
      ctx.moveTo(p0.px, p0.py);
      ctx.quadraticCurveTo(p1.px, p1.py, p2.px, p2.py);
      ctx.stroke();
    }
    ctx.restore();

    // 9. Kompas Gülü (Xəzər Dənizi üzərində zərif qızılı-mürəkkəb kompas)
    ctx.save();
    ctx.translate(compassCenter.px, compassCenter.py);
    ctx.strokeStyle = 'rgba(235, 200, 124, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const len = i % 2 === 0 ? 78 : 52;
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, -14);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? '#d94d32' : '#e6c278';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.lineTo(-12, 0);
      ctx.lineTo(0, -14);
      ctx.closePath();
      ctx.fillStyle = '#4e3319';
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#f5dfb0';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ş', 0, -96);
    ctx.fillText('C', 0, 114);
    ctx.fillText('ŞQ', 112, 10);
    ctx.fillText('Q', -106, 10);
    ctx.restore();

    // 10. Qədim xəttatlıq bölgə yazıları
    ctx.save();
    ctx.textAlign = 'center';
    const labels = [
      { text: 'BÖYÜK QAFQAZ DAĞLARI', x: -10, z: -36, size: 32, color: 'rgba(68, 40, 18, 0.72)' },
      { text: 'KÜR-ARAZ OVALIĞI', x: 3, z: 3, size: 28, color: 'rgba(78, 48, 22, 0.56)' },
      { text: 'QARABAĞ YAYLASI', x: -34, z: 26, size: 28, color: 'rgba(68, 40, 18, 0.68)' },
      { text: 'ŞİRVAN DİYARI', x: 16, z: -8, size: 25, color: 'rgba(78, 48, 22, 0.58)' },
      { text: 'XƏZƏR DƏNİZİ', x: 54, z: -18, size: 38, color: 'rgba(232, 212, 168, 0.72)' },
      { text: 'BÖYÜK İPƏK YOLU', x: -6, z: 18, size: 22, color: 'rgba(128, 38, 22, 0.64)' },
    ];
    for (const lb of labels) {
      const p = toPx(lb.x, lb.z);
      ctx.font = `italic bold ${lb.size}px Georgia, serif`;
      ctx.fillStyle = lb.color;
      ctx.fillText(lb.text, p.px, p.py);
    }
    ctx.restore();

    // 11. Perqament kənar ornament çərçivəsi (dərəcə cədvəli)
    ctx.strokeStyle = 'rgba(58, 34, 14, 0.85)';
    ctx.lineWidth = 10;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 42, W - 84, H - 84);

    // Kənar vinyet (köhnə yanmış kağız effekti)
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.34, W / 2, H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(42, 24, 10, 0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  _buildAntiqueParchmentTerrain() {
    const segX = 128;
    const segZ = 92;

    const geo = new THREE.PlaneGeometry(this.mapWidth, this.mapDepth, segX, segZ);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    const parchmentTex = this._createAntiqueMapTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: parchmentTex,
      roughness: 0.92,
      metalness: 0.04,
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Qədim dəniz xəritəsi üslubunda animasiyalı Xəzər səthi
    const seaGeo = new THREE.PlaneGeometry(66, this.mapDepth - 2, 32, 44);
    seaGeo.rotateX(-Math.PI / 2);
    this.seaBasePositions = Float32Array.from(seaGeo.attributes.position.array);

    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x264e5e,
      roughness: 0.35,
      metalness: 0.18,
      transparent: true,
      opacity: 0.72,
    });
    this.seaMesh = new THREE.Mesh(seaGeo, seaMat);
    this.seaMesh.position.set(57, 0.06, 0);
    this.seaMesh.receiveShadow = true;
    this.scene.add(this.seaMesh);
  }

  _buildMapTableFrame() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b2515, roughness: 0.78, metalness: 0.12 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99c46, roughness: 0.38, metalness: 0.75 });

    const w = this.mapWidth + 6;
    const d = this.mapDepth + 6;
    const h = 3.6;

    // 4 tərəfli qədim taxta masa çərçivəsi
    const bars = [
      { sx: w, sy: h, sz: 3.4, x: 0, z: -d / 2 + 1.5 },
      { sx: w, sy: h, sz: 3.4, x: 0, z: d / 2 - 1.5 },
      { sx: 3.4, sy: h, sz: d, x: -w / 2 + 1.5, z: 0 },
      { sx: 3.4, sy: h, sz: d, x: w / 2 - 1.5, z: 0 },
    ];

    for (const b of bars) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.sx, b.sy, b.sz), woodMat);
      m.position.set(b.x, 0.3, b.z);
      m.receiveShadow = true;
      this.scene.add(m);
    }

    // 4 küncdə bürünc bəzəklər
    for (const cx of [-w / 2 + 1.5, w / 2 - 1.5]) {
      for (const cz of [-d / 2 + 1.5, d / 2 - 1.5]) {
        const corner = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 4.1, 8), brassMat);
        corner.position.set(cx, 0.4, cz);
        this.scene.add(corner);
      }
    }
  }

  _buildAntiqueCaravanRoads() {
    const b = this.cityPositions.City_Baku;
    const s = this.cityPositions.City_Sheki;
    const h = this.cityPositions.City_Shusha;

    const routeDefs = [
      [new THREE.Vector3(b.x, 0, b.z), new THREE.Vector3(8, 0, -10), new THREE.Vector3(s.x, 0, s.z)],
      [new THREE.Vector3(b.x, 0, b.z), new THREE.Vector3(4, 0, 14), new THREE.Vector3(h.x, 0, h.z)],
      [new THREE.Vector3(s.x, 0, s.z), new THREE.Vector3(-24, 0, -2), new THREE.Vector3(h.x, 0, h.z)],
    ];

    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c3b1e, roughness: 0.85 });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd26a });

    this.roadCurves = [];
    for (const pts of routeDefs) {
      const curve = new THREE.CatmullRomCurve3(pts);
      this.roadCurves.push(curve);

      // Yol boyunca qədim karvan nişangah məşəlləri
      for (let i = 1; i <= 3; i++) {
        const pt = curve.getPoint(i / 4);
        const y = this.getTerrainHeight(pt.x, pt.z);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.35, 6), postMat);
        post.position.set(pt.x + 1.3, y + 0.65, pt.z + 1.0);
        post.castShadow = true;
        this.scene.add(post);

        const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), lanternMat);
        lantern.position.set(pt.x + 1.3, y + 1.45, pt.z + 1.0);
        this.scene.add(lantern);
      }
    }
  }

  /**
   * Xəzər dənizində üzən qədim ticarət gəmisi (animasiyalı)
   */
  _buildCaspianShip() {
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.7, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x5d391e, roughness: 0.85 })
    );
    hull.position.y = 0.35;
    hull.castShadow = true;
    ship.add(hull);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.0, 6),
      new THREE.MeshStandardMaterial({ color: 0x422814 })
    );
    mast.position.y = 1.9;
    ship.add(mast);

    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf4e4c1, side: THREE.DoubleSide, roughness: 0.8 })
    );
    sail.position.set(0, 2.0, 0.12);
    sail.castShadow = true;
    ship.add(sail);

    ship.position.set(50, 0.15, -4);
    this.scene.add(ship);
    this.caspianShip = ship;
  }

  _buildAntiqueClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf6ead0,
      roughness: 0.95,
      transparent: true,
      opacity: 0.32,
    });

    for (let i = 0; i < 8; i++) {
      const cluster = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), cloudMat);
        puff.position.set((p - 1) * 2.4, (p % 2) * 0.4, (p % 2) * 0.7);
        puff.scale.set(1.35, 0.48, 0.95);
        cluster.add(puff);
      }
      cluster.position.set(-55 + i * 16, 26 + (i % 3) * 2.5, -34 + ((i * 19) % 68));
      cluster.userData.speed = 0.65 + (i % 3) * 0.28;
      this.scene.add(cluster);
      this.clouds.push(cluster);
    }
  }

  _createAntiqueLabelSprite(text, accentColor = '#e5b84b') {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 78;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(30, 21, 13, 0.88)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(10, 10, 340, 58, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8ebd0';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 180, 40);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(10.5, 2.3, 1);
    return sprite;
  }

  _buildCityArchitectureFallback(cityId, flagColor) {
    const g = new THREE.Group();
    const sandstone = new THREE.MeshStandardMaterial({ color: 0xd6b57c, roughness: 0.76, metalness: 0.08 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x8f6636, roughness: 0.55, metalness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xdcb04c, roughness: 0.35, metalness: 0.65 });

    // Bürünc podium altlığı (qədim masa miniatürü effekti)
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.9, 0.65, 16), bronze);
    plinth.position.y = 0.32;
    plinth.receiveShadow = true;
    g.add(plinth);

    if (cityId === 'City_Baku') {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.0, 6.4, 18), sandstone);
      tower.position.set(0, 3.5, 0);
      tower.castShadow = true;
      g.add(tower);

      const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.15, 5.4, 1.5), bronze);
      buttress.position.set(1.55, 3.0, 0.3);
      buttress.castShadow = true;
      g.add(buttress);

      const palace = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.3, 2.8), sandstone);
      palace.position.set(-2.5, 1.5, 1.1);
      palace.castShadow = true;
      g.add(palace);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        goldMat
      );
      dome.position.set(-2.5, 2.65, 1.1);
      g.add(dome);
    } else if (cityId === 'City_Sheki') {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.7, 3.4), sandstone);
      hall.position.set(0, 1.7, 0);
      hall.castShadow = true;
      g.add(hall);

      const shebeke = new THREE.Mesh(
        new THREE.BoxGeometry(4.3, 1.45, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x2f9978, emissive: 0x164a3a, roughness: 0.25 })
      );
      shebeke.position.set(0, 1.75, 1.72);
      g.add(shebeke);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.3, 1.9, 4),
        new THREE.MeshStandardMaterial({ color: 0x9b4626, roughness: 0.72 })
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 3.95, 0);
      roof.castShadow = true;
      g.add(roof);
    } else {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.5, 1.25), sandstone);
      wall.position.set(0, 1.6, 1.3);
      wall.castShadow = true;
      g.add(wall);

      for (const sx of [-2.6, 2.6]) {
        const bastion = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.1, 3.8, 12), bronze);
        bastion.position.set(sx, 2.2, 1.3);
        bastion.castShadow = true;
        g.add(bastion);
      }

      const mosque = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.4, 2.8), sandstone);
      mosque.position.set(0, 1.55, -1.2);
      mosque.castShadow = true;
      g.add(mosque);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        goldMat
      );
      dome.position.set(0, 2.75, -1.2);
      g.add(dome);
    }

    // Yellənən qədim şəhər bayrağı (animasiyalı)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6), bronze);
    pole.position.set(2.4, 5.2, -1.5);
    g.add(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.9, 6, 1),
      new THREE.MeshStandardMaterial({ color: flagColor, side: THREE.DoubleSide, roughness: 0.6 })
    );
    flag.position.set(3.3, 6.2, -1.5);
    g.add(flag);
    this.cityFlags.push({ mesh: flag, phase: Math.random() * Math.PI * 2 });

    return g;
  }

  async _buildCities() {
    const configs = [
      { id: 'City_Baku', model: 'city_baku', ringColor: 0xe5b84b, flagColor: 0xb83728, hex: '#e5b84b' },
      { id: 'City_Sheki', model: 'city_sheki', ringColor: 0x3eb38b, flagColor: 0x268a6a, hex: '#55cfa3' },
      { id: 'City_Shusha', model: 'city_shusha', ringColor: 0xb985e8, flagColor: 0x7c4bb0, hex: '#c89bf0' },
    ];

    for (const cfg of configs) {
      const pos = this.cityPositions[cfg.id];
      const y = this.getTerrainHeight(pos.x, pos.z);
      const group = new THREE.Group();
      group.name = cfg.id;
      group.position.set(pos.x, y, pos.z);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(pos.radius - 0.55, pos.radius, 48),
        new THREE.MeshBasicMaterial({
          color: cfg.ringColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      group.add(ring);
      this.cityRings.push(ring);

      const loaded = await this.modelLoader.loadOptionalGLB(cfg.model, 1.8);
      if (loaded) {
        group.add(loaded);
      } else {
        group.add(this._buildCityArchitectureFallback(cfg.id, cfg.flagColor));
      }

      const labelSprite = this._createAntiqueLabelSprite(pos.label, cfg.hex);
      labelSprite.position.set(0, 8.8, 0);
      group.add(labelSprite);

      this.scene.add(group);
    }
  }

  _buildDynamicNPCMarkers() {
    const defaultNPCs = [
      { role: 'NPC_Historian', color: '#8f6bd4', curveIdx: 0, t: 0.28 },
      { role: 'NPC_Ashig', color: '#38a875', curveIdx: 0, t: 0.65 },
      { role: 'NPC_Craftsman', color: '#c9713b', curveIdx: 2, t: 0.45 },
      { role: 'NPC_Traveler', color: '#4c969c', curveIdx: 1, t: 0.36 },
      { role: 'PadishahNPC', color: '#e5b84b', curveIdx: 1, t: 0.72 },
    ];

    for (const item of defaultNPCs) {
      const curve = this.roadCurves[item.curveIdx];
      if (!curve) continue;
      const pt = curve.getPoint(item.t);
      const x = pt.x + 2.0;
      const z = pt.z - 1.5;
      const y = this.getTerrainHeight(x, z);

      const markerGroup = new THREE.Group();
      markerGroup.name = item.role;
      markerGroup.position.set(x, y, z);

      markerGroup.add(this._createStylizedUnit(item.color, 0xf2dec0));

      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshBasicMaterial({ color: item.color })
      );
      beacon.position.y = 3.2;
      markerGroup.add(beacon);

      const aura = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.38, 24),
        new THREE.MeshBasicMaterial({
          color: item.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.16;
      markerGroup.add(aura);

      this.scene.add(markerGroup);
      this.npcMarkers.push({
        group: markerGroup,
        beacon,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * GTA Waypoint (işıq sütunu + halqa) və dinamik GPS marşrut xətti
   */
  _buildWaypointAndGPS() {
    this.waypointGroup = new THREE.Group();
    this.waypointGroup.visible = false;

    this.waypointRing = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd257,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      })
    );
    this.waypointRing.rotation.x = -Math.PI / 2;
    this.waypointGroup.add(this.waypointRing);

    this.waypointBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.75, 11, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd257,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.waypointBeam.position.y = 5.5;
    this.waypointGroup.add(this.waypointBeam);

    const pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.15, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd257 })
    );
    pin.rotation.x = Math.PI;
    pin.position.y = 1.6;
    this.waypointGroup.add(pin);

    this.scene.add(this.waypointGroup);

    // Dinamik GTA qızılı GPS marşrut xətti
    const gpsGeo = new THREE.BufferGeometry();
    const gpsMat = new THREE.LineBasicMaterial({
      color: 0xffcf48,
      transparent: true,
      opacity: 0.92,
    });
    this.gpsLine = new THREE.Line(gpsGeo, gpsMat);
    this.gpsLine.visible = false;
    this.scene.add(this.gpsLine);
  }

  async _buildCharacters() {
    const merchantMesh =
      (await this.modelLoader.loadOptionalGLB('merchant_caravan', 1.0)) ||
      this._createAnimatedCaravan();
    this.scene.add(merchantMesh);
    this.gameManager.merchant.setMesh(merchantMesh);

    const guardMesh =
      (await this.modelLoader.loadOptionalGLB('guard', 1.0)) ||
      this._createStylizedUnit(0x286e9c, 0xe8d5b5);
    this.scene.add(guardMesh);
    this.gameManager.guard.setMesh(guardMesh);

    const thiefMesh =
      (await this.modelLoader.loadOptionalGLB('thief', 1.0)) ||
      this._createStylizedUnit(0xa82e2e, 0x241c18);
    this.scene.add(thiefMesh);
    this.gameManager.thief.setMesh(thiefMesh);
  }

  /**
   * Animasiyalı Karvan: araba + 4 fırlanan təkər + öndə at + yellənən qızılı bayraq
   */
  _createAnimatedCaravan() {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b3e1e, roughness: 0.85 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe6be63, roughness: 0.65 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x3b2210, roughness: 0.9 });
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x8f5228, roughness: 0.72 });

    // Araba gövdəsi
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 2.5), woodMat);
    cart.position.set(0, 0.9, -0.5);
    cart.castShadow = true;
    g.add(cart);

    // İpək örtük
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 2.4, 12, 1, false, 0, Math.PI),
      canopyMat
    );
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 1.32, -0.5);
    canopy.castShadow = true;
    g.add(canopy);

    // 4 fırlanan təkər
    this.caravanParts.wheels = [];
    for (const wx of [-0.95, 0.95]) {
      for (const wz of [-1.3, 0.3]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.18, 12), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.44, wz);
        wheel.castShadow = true;
        g.add(wheel);
        this.caravanParts.wheels.push(wheel);
      }
    }

    // Öndə karvanı çəkən Qarabağ atı (irəli +Z istiqamətində)
    const horseBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 1.45), horseMat);
    horseBody.position.set(0, 1.05, 1.85);
    horseBody.castShadow = true;
    g.add(horseBody);

    const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.4), horseMat);
    horseNeck.position.set(0, 1.5, 2.45);
    horseNeck.rotation.x = 0.32;
    g.add(horseNeck);
    this.caravanParts.horseHead = horseNeck;

    this.caravanParts.horseLegs = [];
    for (const lx of [-0.2, 0.2]) {
      for (const lz of [1.35, 2.3]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.85, 6), horseMat);
        leg.position.set(lx, 0.42, lz);
        g.add(leg);
        this.caravanParts.horseLegs.push(leg);
      }
    }

    // Yellənən karvan bayrağı
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 6), wheelMat);
    pole.position.set(0.75, 2.35, -1.5);
    g.add(pole);

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xb83527, side: THREE.DoubleSide })
    );
    banner.position.set(0.75, 3.05, -2.0);
    banner.rotation.y = Math.PI / 2;
    g.add(banner);
    this.caravanParts.banner = banner;

    return g;
  }

  _createStylizedUnit(bodyColor, headColor) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.65, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.65 })
    );
    body.position.y = 0.8;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.6 })
    );
    head.position.y = 1.85;
    head.castShadow = true;
    g.add(head);
    return g;
  }

  _spawnDustPuff(x, y, z) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xd9be8a, transparent: true, opacity: 0.55 })
    );
    puff.position.set(x + (Math.random() - 0.5) * 0.7, y + 0.3, z + (Math.random() - 0.5) * 0.7);
    this.scene.add(puff);
    this.dustPuffs.push({ mesh: puff, life: 0.85 });
  }

  _handlePointerDown(e) {
    if (e.button === 2) {
      this.isRightDragging = true;
      this.lastMouseX = e.clientX;
      return;
    }
    if (e.button !== 0) return;
    if (!this.terrainMesh || !this.camera) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.terrainMesh);
    if (hits.length > 0) {
      const pt = hits[0].point;
      if (pt.y < 0.08) return; // Xəzər dənizinə klikləməni məhdudlaşdır

      this.setWaypointVisual(pt.x, pt.z);
      // Qədim xəritənin içinə basanda GTA məntiqi ilə yaxınlaşsın və GPS marşrutu ilə getsin!
      const enterGTA = this.cameraMode === 'map';
      this.eventBus.emit('world:click_move', { x: pt.x, z: pt.z, enterGTA });
    }
  }

  _handlePointerMove(e) {
    if (!this.isRightDragging || this.cameraMode !== 'gta') return;
    const dx = e.clientX - this.lastMouseX;
    this.lastMouseX = e.clientX;
    this.gtaOrbitOffset -= dx * 0.008;
  }

  _handleWheel(e) {
    e.preventDefault();
    if (e.deltaY < -20 && this.cameraMode === 'map') {
      this.eventBus.emit('camera:set_mode', 'gta');
    } else if (e.deltaY > 20 && this.cameraMode === 'gta') {
      this.eventBus.emit('camera:set_mode', 'map');
    }
  }

  _handleResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _updateGPSLine() {
    const target = this.gameManager.merchant.targetPos;
    if (!target) {
      if (this.gpsLine) this.gpsLine.visible = false;
      if (this.waypointGroup) this.waypointGroup.visible = false;
      return;
    }

    const m = this.gameManager.merchant.position;
    const pts = [];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = m.x + (target.x - m.x) * t;
      const z = m.z + (target.z - m.z) * t;
      const y = this.getTerrainHeight(x, z) + 0.45;
      pts.push(new THREE.Vector3(x, y, z));
    }
    this.gpsLine.geometry.dispose();
    this.gpsLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.gpsLine.visible = true;
  }

  update(dt) {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.elapsed += dt;

    // 1. Xəzər dalğa animasiyası
    if (this.seaMesh && this.seaBasePositions) {
      const pos = this.seaMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = this.seaBasePositions[i * 3];
        const bz = this.seaBasePositions[i * 3 + 2];
        pos.setY(
          i,
          Math.sin(bx * 0.16 + this.elapsed * 1.4) * 0.1 +
            Math.cos(bz * 0.14 + this.elapsed * 1.1) * 0.08
        );
      }
      pos.needsUpdate = true;
    }

    // 2. Xəzər gəmisi animasiyası
    if (this.caspianShip) {
      const ang = this.elapsed * 0.22;
      const sx = 50 + Math.cos(ang) * 7.5;
      const sz = -4 + Math.sin(ang * 0.7) * 18;
      const dx = -Math.sin(ang) * 7.5;
      const dz = Math.cos(ang * 0.7) * 18 * 0.7;
      this.caspianShip.position.set(sx, 0.18 + Math.sin(this.elapsed * 2.2) * 0.12, sz);
      this.caspianShip.rotation.y = Math.atan2(dx, dz);
      this.caspianShip.rotation.z = Math.sin(this.elapsed * 2.5) * 0.06;
    }

    // 3. Bulud axını & bayraq yellənməsi
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 76) cloud.position.x = -76;
    }

    for (const f of this.cityFlags) {
      f.mesh.rotation.y = Math.sin(this.elapsed * 3.4 + f.phase) * 0.28;
    }

    // 4. Karvan animasiyası (təkərlər, at ayaqları, bayraq, toz izi)
    const merchant = this.gameManager.merchant;
    if (merchant.isMoving) {
      for (const w of this.caravanParts.wheels) {
        w.rotation.x += dt * 7.5;
      }
      this.caravanParts.horseLegs.forEach((leg, idx) => {
        leg.rotation.x = Math.sin(this.elapsed * 12 + idx * Math.PI * 0.5) * 0.45;
      });
      if (this.caravanParts.horseHead) {
        this.caravanParts.horseHead.rotation.x = 0.32 + Math.sin(this.elapsed * 10) * 0.12;
      }
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.14;
        this._spawnDustPuff(merchant.position.x, merchant.position.y, merchant.position.z);
      }
    }
    if (this.caravanParts.banner) {
      this.caravanParts.banner.rotation.y = Math.PI / 2 + Math.sin(this.elapsed * 5.2) * 0.22;
    }

    // Toz dənəcikləri
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const p = this.dustPuffs[i];
      p.life -= dt;
      p.mesh.position.y += dt * 0.9;
      p.mesh.scale.addScalar(dt * 1.1);
      p.mesh.material.opacity = Math.max(0, p.life * 0.6);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.dustPuffs.splice(i, 1);
      }
    }

    // 5. Şəhər halqaları & NPC markerləri
    const pulse = 0.55 + Math.sin(this.elapsed * 2.6) * 0.22;
    for (const ring of this.cityRings) {
      ring.material.opacity = pulse;
    }
    for (const item of this.npcMarkers) {
      item.beacon.rotation.y += dt * 1.8;
      item.beacon.position.y = 3.2 + Math.sin(this.elapsed * 2.8 + item.phase) * 0.26;
    }

    // 6. Waypoint & GTA GPS xətti
    if (this.waypointGroup && this.waypointGroup.visible) {
      this.waypointRing.scale.setScalar(1 + Math.sin(this.elapsed * 4.5) * 0.14);
      this.waypointBeam.rotation.y += dt * 1.5;
    }
    this._updateGPSLine();

    // 7. GTA V üslubunda axıcı kamera keçidi (Qədim 3D Xəritə ↔ GTA Arxa 3D Sürüş)
    const targetBlend = this.cameraMode === 'gta' ? 1 : 0;
    this.gtaBlend += (targetBlend - this.gtaBlend) * Math.min(1, dt * 3.4);

    const mPos = merchant.position;

    // Qədim 3D Xəritə baxış nöqtəsi (bütün Azərbaycan xəritəsini göstərir, yüngül karvan izləməsi ilə)
    const mapCamPos = new THREE.Vector3(mPos.x * 0.28 + 3, 74, mPos.z * 0.28 + 56);
    const mapLookAt = new THREE.Vector3(mPos.x * 0.35 + 2, 1.0, mPos.z * 0.35);

    // GTA 3D Arxa Sürüş kamerası (karvanın arxasında alçaqdan izləyir)
    const camAngle = merchant.yaw + this.gtaOrbitOffset;
    const gtaDist = 14.5;
    const gtaHeight = 7.4;
    const gtaCamPos = new THREE.Vector3(
      mPos.x - Math.sin(camAngle) * gtaDist,
      mPos.y + gtaHeight,
      mPos.z - Math.cos(camAngle) * gtaDist
    );
    const gtaLookAt = new THREE.Vector3(
      mPos.x + Math.sin(camAngle) * 5.0,
      mPos.y + 2.2,
      mPos.z + Math.cos(camAngle) * 5.0
    );

    // Smoothstep (GTA V swoop effekti)
    const t = this.gtaBlend * this.gtaBlend * (3 - 2 * this.gtaBlend);
    const desiredCam = new THREE.Vector3().lerpVectors(mapCamPos, gtaCamPos, t);
    const desiredLook = new THREE.Vector3().lerpVectors(mapLookAt, gtaLookAt, t);

    this.camera.position.lerp(desiredCam, Math.min(1, dt * 5.5));
    this.camLookTarget.lerp(desiredLook, Math.min(1, dt * 6.5));
    this.camera.lookAt(this.camLookTarget);

    this.renderer.render(this.scene, this.camera);
  }

  unmount() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    if (this.renderer) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this._onPointerDown);
      dom.removeEventListener('wheel', this._onWheel);
      dom.removeEventListener('contextmenu', this._onContextMenu);
      this.renderer.dispose();
    }
    this.container.innerHTML = '';
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
