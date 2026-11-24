import * as THREE from 'three';
import { ModelLoader } from '../Prefabs/ModelLoader.js';

/**
 * Scenes/World_Azerbaijan.js
 * Müasir Müze / Memarlıq üslubunda Abstrakt Topoqrafik 3D Azərbaycan Xəritəsi:
 * - Faceted (kristallik memarlıq kəsimli) pilləli relyef və qızılı Marching Squares izohips xətləri
 * - 3D parlaq firuzəyi Kür-Araz çay kanalları, safir Xəzər səthi və qızılı sahil konturu
 * - İşıqlı İpək Yolu TubeGeometry marşrutları və hərəkətli karvan işıq impulsları
 * - Obsidian-qoz plintus, fırçalanmış bürünc çərçivə və fırlanan Astrolab dərəcə halqaları
 * - Bakı, Şəki və Şuşanın vahid abstrakt memarlıq abidələri + GTA V kamera keçidi
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
    this.isMounted = false;

    this.mapOriginX = -2;
    this.mapWidth = 118;
    this.mapDepth = 82;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.cityPositions = {
      City_Baku: { x: 28, z: 4, radius: 9.0, label: 'Bakı · İçərişəhər' },
      City_Sheki: { x: -16, z: -20, radius: 9.0, label: 'Şəki · Karvansaray' },
      City_Shusha: { x: -24, z: 16, radius: 9.0, label: 'Şuşa · Qala Şəhəri' },
    };

    // Kamera rejimi və GTA V axıcı keçid (0 = Abstrakt 3D Xəritə, 1 = GTA Arxa 3D)
    this.cameraMode = 'map';
    this.gtaBlend = 0;
    this.gtaOrbitOffset = 0;
    this.isRightDragging = false;
    this.lastMouseX = 0;
    this.camLookTarget = new THREE.Vector3(2, 1.2, 0);

    // Animasiya massivləri
    this.elapsed = 0;
    this.cityRings = [];
    this.cityOuterRings = [];
    this.npcMarkers = [];
    this.roadCurves = [];
    this.roadPulses = [];
    this.astrolabeRings = [];
    this.caravanParts = { wheels: [], horseLegs: [], horseHead: null, banner: null };
    this.caspianVessel = null;
    this.dustPuffs = [];
    this.dustTimer = 0;

    // GTA GPS Waypoint + dinamik işıqlı 3D marşrut lenti
    this.waypointGroup = null;
    this.waypointRing = null;
    this.waypointOuterRing = null;
    this.waypointBeam = null;
    this.gpsMesh = null;
    this._lastGpsKey = '';

    this._createdTextures = [];
    this.cityHeights = {};

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
    this.waypointGroup.position.set(x, y + 0.16, z);
    this.waypointGroup.visible = true;
  }

  _getCoastlineX(z) {
    const absheronPeninsula = 7.4 * Math.exp(-((z - 4) * (z - 4)) / 48);
    const wave = Math.sin(z * 0.13) * 1.9 + Math.cos(z * 0.06) * 1.3;
    return 33.5 + absheronPeninsula + wave;
  }

  _rawTerrainHeight(x, z) {
    const coastX = this._getCoastlineX(z);
    if (x > coastX + 2.2) {
      return -1.45;
    }

    const greaterCaucasus =
      Math.exp(-(((x + 8) * (x + 8)) / 680 + ((z + 32) * (z + 32)) / 180)) * 9.5 +
      Math.exp(-(((x + 28) * (x + 28)) / 360 + ((z + 27) * (z + 27)) / 150)) * 6.4;

    const lesserCaucasus =
      Math.exp(-(((x + 36) * (x + 36)) / 380 + ((z - 22) * (z - 22)) / 280)) * 7.2;

    const shushaPlateau =
      Math.exp(-(((x + 24) * (x + 24)) / 150 + ((z - 16) * (z - 16)) / 150)) * 1.8;

    const absheronRidge =
      Math.exp(-(((x - 26) * (x - 26)) / 130 + ((z - 5) * (z - 5)) / 130)) * 1.05;

    const kuraLowland =
      Math.exp(-(((x - 2) * (x - 2)) / 360 + ((z - 3) * (z - 3)) / 240)) * 0.55;

    const gentleHills =
      Math.sin(x * 0.09) * Math.cos(z * 0.095) * 0.45 +
      Math.sin((x + z) * 0.15) * 0.16 +
      0.85;

    const distToCoast = coastX - x;
    const coastFade = distToCoast < 6.5 ? Math.max(0, distToCoast / 6.5) : 1;

    let h =
      (greaterCaucasus + lesserCaucasus + shushaPlateau + absheronRidge + gentleHills - kuraLowland) *
      coastFade;

    if (distToCoast <= 0) {
      return Math.max(-1.45, h - 0.65);
    }

    // Pilləli abstrakt topoqrafik relyef
    const step = 0.85;
    const quantized = Math.floor(h / step) * step;
    const frac = (h - quantized) / step;
    const smoothStep = quantized + step * Math.pow(frac, 0.5);
    h = h * 0.52 + smoothStep * 0.48;

    return Math.max(0.24, h);
  }

  _initCityHeights() {
    for (const key of Object.keys(this.cityPositions)) {
      const c = this.cityPositions[key];
      const natural = this._rawTerrainHeight(c.x, c.z);
      this.cityHeights[key] = Math.max(1.0, Math.min(4.2, natural));
    }
  }

  getTerrainHeight(x, z) {
    let h = this._rawTerrainHeight(x, z);
    if (h <= 0.08) return h;

    for (const key of Object.keys(this.cityPositions)) {
      const c = this.cityPositions[key];
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < 5.6) {
        const blend = Math.max(0, 1 - d / 5.6);
        const smoothBlend = blend * blend * (3 - 2 * blend);
        const targetH = this.cityHeights[key] ?? h;
        h = h * (1 - smoothBlend * 0.88) + targetH * (smoothBlend * 0.88);
      }
    }

    return Math.max(0.22, h);
  }

  async mount() {
    this.isMounted = false;
    this.container.innerHTML = '';
    this._initCityHeights();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070d16);
    this.scene.fog = new THREE.FogExp2(0x070d16, 0.0022);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.5, 480);
    this.camera.position.set(4, 90, 68);
    this.camLookTarget.set(2, 1.0, 0);
    this.camera.lookAt(this.camLookTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.container.appendChild(this.renderer.domElement);

    this._buildLights();
    this._buildAbstractTerrain();
    this._buildCoastlineContour();
    this._buildAbstractRivers();
    this._buildAbstractTablePlinth();
    this._buildSilkRoadSplines();
    this._buildAbstractCaspianVessel();
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

    this.isMounted = true;
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xbbe2fa, 0x1a2636, 0.92);
    this.scene.add(hemi);

    // İsti qalereya günəş işığı (kəskin memarlıq kəsimlərini vurğulayır)
    const keyLight = new THREE.DirectionalLight(0xffe4b8, 1.85);
    keyLight.position.set(52, 88, 36);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -82;
    keyLight.shadow.camera.right = 82;
    keyLight.shadow.camera.top = 70;
    keyLight.shadow.camera.bottom = -70;
    keyLight.shadow.bias = -0.0004;
    this.scene.add(keyLight);

    // Soyuq firuzəyi Xəzər rim işığı
    const rimLight = new THREE.DirectionalLight(0x4be0ec, 0.72);
    rimLight.position.set(68, 30, -38);
    this.scene.add(rimLight);

    // Qərb mis-qızılı doldurma işığı
    const fillLight = new THREE.DirectionalLight(0xdf985c, 0.5);
    fillLight.position.set(-64, 34, 24);
    this.scene.add(fillLight);
  }

  /**
   * 2048×1536 Yüksək Dəqiqlikli Abstrakt Kartoqrafiya Teksturası:
   * - İncə memarlıq koordinat şəbəkəsi
   * - Marching Squares ilə parlaq qızılı izohips xətləri
   * - Xəzər sularında zərif kartoqrafik kompaz & tipografiya
   */
  _createAbstractMapTexture() {
    const W = 2048;
    const H = 1536;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const minX = this.mapOriginX - this.mapWidth / 2;
    const minZ = -this.mapDepth / 2;
    const toPx = (wx, wz) => ({
      px: ((wx - minX) / this.mapWidth) * W,
      py: ((wz - minZ) / this.mapDepth) * H,
    });

    // Parlaq neytral memarlıq baza (vertex rənglərini boğmur)
    ctx.fillStyle = '#f2f4f5';
    ctx.fillRect(0, 0, W, H);

    // 1. Koordinat meridian/paralel şəbəkəsi
    ctx.strokeStyle = 'rgba(210, 172, 92, 0.16)';
    ctx.lineWidth = 1.25;
    for (let wx = -60; wx <= 55; wx += 8) {
      const a = toPx(wx, minZ);
      const b = toPx(wx, minZ + this.mapDepth);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }
    for (let wz = -40; wz <= 40; wz += 8) {
      const a = toPx(minX, wz);
      const b = toPx(minX + this.mapWidth, wz);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // 2. Marching Squares ilə kəskin qızılı topoqrafik izohipslər
    const gx = 280;
    const gz = 196;
    const grid = new Float32Array((gx + 1) * (gz + 1));
    for (let j = 0; j <= gz; j++) {
      const wz = minZ + (j / gz) * this.mapDepth;
      for (let i = 0; i <= gx; i++) {
        const wx = minX + (i / gx) * this.mapWidth;
        grid[j * (gx + 1) + i] = this.getTerrainHeight(wx, wz);
      }
    }

    const levels = [0.6, 1.25, 1.95, 2.75, 3.6, 4.5, 5.5, 6.6, 7.8, 9.0];
    const interp = (a, b, va, vb, lvl) => {
      const denom = vb - va;
      const t = Math.abs(denom) < 1e-5 ? 0.5 : (lvl - va) / denom;
      return a + (b - a) * Math.max(0, Math.min(1, t));
    };

    for (let li = 0; li < levels.length; li++) {
      const lvl = levels[li];
      const isMajor = li % 2 === 1;
      ctx.strokeStyle = isMajor ? 'rgba(255, 224, 146, 0.88)' : 'rgba(235, 206, 142, 0.45)';
      ctx.lineWidth = isMajor ? 2.6 : 1.3;
      ctx.beginPath();

      for (let j = 0; j < gz; j++) {
        const py0 = (j / gz) * H;
        const py1 = ((j + 1) / gz) * H;
        for (let i = 0; i < gx; i++) {
          const px0 = (i / gx) * W;
          const px1 = ((i + 1) / gx) * W;
          const idx = j * (gx + 1) + i;
          const v0 = grid[idx];
          const v1 = grid[idx + 1];
          const v2 = grid[idx + (gx + 1) + 1];
          const v3 = grid[idx + (gx + 1)];

          const c0 = v0 >= lvl ? 1 : 0;
          const c1 = v1 >= lvl ? 1 : 0;
          const c2 = v2 >= lvl ? 1 : 0;
          const c3 = v3 >= lvl ? 1 : 0;
          if (c0 === c1 && c1 === c2 && c2 === c3) continue;

          const pts = [];
          if (c0 !== c1) pts.push([interp(px0, px1, v0, v1, lvl), py0]);
          if (c1 !== c2) pts.push([px1, interp(py0, py1, v1, v2, lvl)]);
          if (c2 !== c3) pts.push([interp(px1, px0, v2, v3, lvl), py1]);
          if (c3 !== c0) pts.push([px0, interp(py1, py0, v3, v0, lvl)]);

          if (pts.length >= 2) {
            ctx.moveTo(pts[0][0], pts[0][1]);
            ctx.lineTo(pts[1][0], pts[1][1]);
            if (pts.length === 4) {
              ctx.moveTo(pts[2][0], pts[2][1]);
              ctx.lineTo(pts[3][0], pts[3][1]);
            }
          }
        }
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    this._createdTextures.push(tex);
    return tex;
  }

  _buildAbstractTerrain() {
    const segX = 144;
    const segZ = 100;
    const baseGeo = new THREE.PlaneGeometry(this.mapWidth, this.mapDepth, segX, segZ);
    baseGeo.rotateX(-Math.PI / 2);

    const basePos = baseGeo.attributes.position;
    const baseCols = new Float32Array(basePos.count * 3);

    const cDeepSea = new THREE.Color('#0c2235');
    const cCoast = new THREE.Color('#2c6b66');
    const cLowland = new THREE.Color('#3b7a68');
    const cFoothill = new THREE.Color('#9c8e56');
    const cPlateau = new THREE.Color('#be734c');
    const cHighland = new THREE.Color('#9e5742');
    const cPeak = new THREE.Color('#f4efe6');
    const c = new THREE.Color();

    for (let i = 0; i < basePos.count; i++) {
      const wx = basePos.getX(i) + this.mapOriginX;
      const wz = basePos.getZ(i);
      const y = this.getTerrainHeight(wx, wz);

      basePos.setX(i, wx);
      basePos.setY(i, y);

      if (y <= 0.08) {
        c.copy(cDeepSea);
      } else if (y < 0.75) {
        c.lerpColors(cCoast, cLowland, y / 0.75);
      } else if (y < 2.2) {
        c.lerpColors(cLowland, cFoothill, (y - 0.75) / 1.45);
      } else if (y < 4.2) {
        c.lerpColors(cFoothill, cPlateau, (y - 2.2) / 2.0);
      } else if (y < 6.4) {
        c.lerpColors(cPlateau, cHighland, (y - 4.2) / 2.2);
      } else {
        c.lerpColors(cHighland, cPeak, Math.min(1, (y - 6.4) / 2.9));
      }

      baseCols[i * 3] = c.r;
      baseCols[i * 3 + 1] = c.g;
      baseCols[i * 3 + 2] = c.b;
    }

    baseGeo.setAttribute('color', new THREE.BufferAttribute(baseCols, 3));

    // Kristallik abstrakt memarlıq fasetləri
    const geo = baseGeo.toNonIndexed();
    baseGeo.dispose();
    geo.computeVertexNormals();

    const mapTex = this._createAbstractMapTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: mapTex,
      vertexColors: true,
      flatShading: true,
      roughness: 0.62,
      metalness: 0.14,
    });

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.terrainMesh.name = 'AzerbaijanTerrain';
    this.scene.add(this.terrainMesh);

    // Xəzər Dənizi Safir-Şüşə Səthi
    const seaGeo = new THREE.PlaneGeometry(this.mapWidth, this.mapDepth, 68, 48);
    seaGeo.rotateX(-Math.PI / 2);
    const seaPos = seaGeo.attributes.position;
    for (let i = 0; i < seaPos.count; i++) {
      seaPos.setX(i, seaPos.getX(i) + this.mapOriginX);
    }
    this.seaBasePositions = Float32Array.from(seaPos.array);

    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x124d69,
      emissive: 0x072434,
      emissiveIntensity: 0.45,
      flatShading: true,
      roughness: 0.2,
      metalness: 0.48,
      transparent: true,
      opacity: 0.92,
    });
    this.seaMesh = new THREE.Mesh(seaGeo, seaMat);
    this.seaMesh.position.y = -0.16;
    this.seaMesh.receiveShadow = true;
    this.scene.add(this.seaMesh);
  }

  _buildCoastlineContour() {
    const pts = [];
    for (let z = -this.mapDepth * 0.48; z <= this.mapDepth * 0.48; z += 1.2) {
      const cx = this._getCoastlineX(z);
      pts.push(new THREE.Vector3(cx - 0.12, 0.28, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 120, 0.18, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x5ee9ef,
      transparent: true,
      opacity: 0.9,
    });
    this.scene.add(new THREE.Mesh(tubeGeo, tubeMat));
  }

  /**
   * 3D İşıqlı Kür və Araz su kanalları
   */
  _buildAbstractRivers() {
    const makeRiver = (coords, radius) => {
      const dense = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const [x0, z0] = coords[i];
        const [x1, z1] = coords[i + 1];
        for (let s = 0; s < 10; s++) {
          const t = s / 10;
          const x = x0 + (x1 - x0) * t;
          const z = z0 + (z1 - z0) * t;
          dense.push(new THREE.Vector3(x, this.getTerrainHeight(x, z) + 0.16, z));
        }
      }
      const [lx, lz] = coords[coords.length - 1];
      dense.push(new THREE.Vector3(lx, this.getTerrainHeight(lx, lz) + 0.16, lz));

      const curve = new THREE.CatmullRomCurve3(dense);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 64, radius, 6, false),
        new THREE.MeshStandardMaterial({
          color: 0x45dce5,
          emissive: 0x1eaab8,
          emissiveIntensity: 0.55,
          roughness: 0.2,
          metalness: 0.4,
        })
      );
      this.scene.add(mesh);
    };

    makeRiver(
      [
        [-50, -25],
        [-31, -15],
        [-13, -6],
        [4, 2],
        [18, 12],
        [35, 23],
      ],
      0.26
    );
    makeRiver(
      [
        [-45, 30],
        [-23, 23],
        [-3, 15],
        [18, 12],
      ],
      0.21
    );
  }

  /**
   * Müze / Astrolab Xəritə Masası Postamenti:
   * Obsidian alt gövdə, qızılı bürünc çərçivə, künc bürcləri və fırlanan astrolab halqaları
   */
  _buildAbstractTablePlinth() {
    const group = new THREE.Group();
    const ox = this.mapOriginX;

    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f1622,
      roughness: 0.5,
      metalness: 0.4,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe3b152,
      roughness: 0.26,
      metalness: 0.86,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(this.mapWidth + 5.5, 4.8, this.mapDepth + 5.5),
      plinthMat
    );
    base.position.set(ox, -3.1, 0);
    base.receiveShadow = true;
    group.add(base);

    const fw = this.mapWidth + 6.4;
    const fd = this.mapDepth + 6.4;
    const rails = [
      { w: fw, d: 0.85, x: ox, z: -fd / 2 },
      { w: fw, d: 0.85, x: ox, z: fd / 2 },
      { w: 0.85, d: fd, x: ox - fw / 2, z: 0 },
      { w: 0.85, d: fd, x: ox + fw / 2, z: 0 },
    ];
    for (const r of rails) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.w, 1.45, r.d), brassMat);
      mesh.position.set(r.x, -0.35, r.z);
      group.add(mesh);
    }

    // Künc qızılı astrolab qülləcikləri
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const corner = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 2.2, 8), brassMat);
        corner.position.set(ox + sx * (fw / 2), 0.1, sz * (fd / 2));
        group.add(corner);
      }
    }

    // Xarici fırlanan Astrolab halqaları (masa ətrafında tam görünür)
    const outerR = Math.hypot(fw / 2, fd / 2) + 3.0;
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(outerR - 0.45, outerR, 96),
      new THREE.MeshBasicMaterial({
        color: 0xe3b152,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.36,
      })
    );
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.set(ox, -1.5, 0);
    group.add(ring1);
    this.astrolabeRings.push({ mesh: ring1, speed: 0.04 });

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(outerR + 2.8, outerR + 3.15, 96),
      new THREE.MeshBasicMaterial({
        color: 0x52d6e0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.24,
      })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.set(ox, -1.7, 0);
    group.add(ring2);
    this.astrolabeRings.push({ mesh: ring2, speed: -0.028 });

    this.scene.add(group);
  }

  _buildSilkRoadSplines() {
    const routes = [
      [
        [28, 4],
        [15, -3],
        [1, -11],
        [-16, -20],
      ],
      [
        [28, 4],
        [10, 10],
        [-7, 13],
        [-24, 16],
      ],
      [
        [-16, -20],
        [-23, -10],
        [-27, 2],
        [-24, 16],
      ],
    ];

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xf6c65b,
      emissive: 0xbe7d1f,
      emissiveIntensity: 0.68,
      roughness: 0.32,
      metalness: 0.65,
    });

    routes.forEach((waypoints, rIdx) => {
      const dense = [];
      for (let i = 0; i < waypoints.length - 1; i++) {
        const [x0, z0] = waypoints[i];
        const [x1, z1] = waypoints[i + 1];
        for (let s = 0; s < 14; s++) {
          const t = s / 14;
          const x = x0 + (x1 - x0) * t;
          const z = z0 + (z1 - z0) * t;
          dense.push(new THREE.Vector3(x, this.getTerrainHeight(x, z) + 0.26, z));
        }
      }
      const [lx, lz] = waypoints[waypoints.length - 1];
      dense.push(new THREE.Vector3(lx, this.getTerrainHeight(lx, lz) + 0.26, lz));

      const curve = new THREE.CatmullRomCurve3(dense);
      this.roadCurves.push(curve);

      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.23, 6, false), ribbonMat);
      tube.receiveShadow = true;
      this.scene.add(tube);

      for (let k = 0; k < 2; k++) {
        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xfff0b5 })
        );
        this.scene.add(pulse);
        this.roadPulses.push({
          mesh: pulse,
          curve,
          t: (k * 0.5 + rIdx * 0.17) % 1,
          speed: 0.085 + rIdx * 0.015,
        });
      }
    });
  }

  _buildAbstractCaspianVessel() {
    const vessel = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xe3b152,
      roughness: 0.28,
      metalness: 0.8,
    });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf7f2e8,
      emissive: 0x3b7684,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });

    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.4, 4), hullMat);
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(0.85, 1, 0.48);
    hull.position.y = 0.24;
    vessel.add(hull);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.1, 6), hullMat);
    mast.position.y = 1.6;
    vessel.add(mast);

    const sail = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 3), sailMat);
    sail.position.set(0, 1.85, 0.15);
    sail.scale.set(0.14, 1, 0.9);
    vessel.add(sail);

    const wake = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.45, 24),
      new THREE.MeshBasicMaterial({
        color: 0x6ce8ef,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
    );
    wake.rotation.x = -Math.PI / 2;
    wake.position.y = 0.06;
    vessel.add(wake);

    vessel.position.set(46, 0.16, 14);
    this.scene.add(vessel);
    this.caspianVessel = vessel;
  }

  _createModernLabelSprite(text, accentHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(10, 17, 27, 0.9)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(14, 18, 532, 84, 42);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.arc(54, 60, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f6efe2';
    ctx.font = '700 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 82, 62);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._createdTextures.push(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(11.0, 2.5, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  _buildCityArchitecture(cityId, accentHex) {
    const g = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xe6d8be,
      roughness: 0.58,
      metalness: 0.16,
      flatShading: true,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe6b655,
      roughness: 0.28,
      metalness: 0.84,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.65,
      roughness: 0.28,
    });

    if (cityId === 'City_Baku') {
      // Abstrakt Qız Qalası + Alov Ucluğu + İçərişəhər divarları
      const curtain = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 1.1, 8), stoneMat);
      curtain.position.y = 0.55;
      curtain.castShadow = true;
      g.add(curtain);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.38, 4.6, 18), stoneMat);
      tower.position.set(0, 2.3, 0);
      tower.castShadow = true;
      g.add(tower);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.35, 18), brassMat);
      crown.position.y = 4.65;
      g.add(crown);

      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), glowMat);
      flame.scale.set(0.85, 2.0, 0.85);
      flame.position.y = 5.75;
      g.add(flame);
    } else if (cityId === 'City_Sheki') {
      // Şəki Xan Sarayı abstrakt pavilyon + şəbəkə zolağı
      const hall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.25, 2.5), stoneMat);
      hall.position.y = 1.12;
      hall.castShadow = true;
      g.add(hall);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.5, 4), brassMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 2.95;
      roof.castShadow = true;
      g.add(roof);

      const glassBand = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.9, 2.56), glowMat);
      glassBand.position.y = 1.25;
      g.add(glassBand);
    } else {
      // Şuşa Qalası bürcləri + Xarı Bülbül abstrakt simvolu
      const keep = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 2.8), stoneMat);
      keep.position.y = 1.1;
      keep.castShadow = true;
      g.add(keep);

      for (const bx of [-2.15, 2.15]) {
        const bastion = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.92, 3.25, 10), brassMat);
        bastion.position.set(bx, 1.62, 0.85);
        bastion.castShadow = true;
        g.add(bastion);
      }

      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), glowMat);
      crest.position.set(0, 3.45, 0);
      g.add(crest);
    }

    return g;
  }

  async _buildCities() {
    const configs = [
      { id: 'City_Baku', ringColor: 0xf4c158, hex: '#f4c158', labelOffsetY: 9.8 },
      { id: 'City_Sheki', ringColor: 0x45d3a3, hex: '#45d3a3', labelOffsetY: 8.6 },
      { id: 'City_Shusha', ringColor: 0xb985f5, hex: '#b985f5', labelOffsetY: 8.8 },
    ];

    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x15202f,
      roughness: 0.42,
      metalness: 0.55,
    });

    for (const cfg of configs) {
      const pos = this.cityPositions[cfg.id];
      const y = this.getTerrainHeight(pos.x, pos.z);
      const group = new THREE.Group();
      group.name = cfg.id;
      group.position.set(pos.x, y, pos.z);

      // Yamaca oturan dərin obsidian-bürünc memarlıq ətəyi
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 4.4, 1.5, 28), plinthMat);
      plinth.position.y = -0.35;
      plinth.receiveShadow = true;
      plinth.castShadow = true;
      group.add(plinth);

      // İkili konsentrik işıqlı şəhər halqaları
      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(pos.radius - 0.55, pos.radius - 0.15, 48),
        new THREE.MeshBasicMaterial({
          color: cfg.ringColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78,
        })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.25;
      group.add(innerRing);
      this.cityRings.push(innerRing);

      const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(4.35, 4.75, 36, 1, 0, Math.PI * 1.35),
        new THREE.MeshBasicMaterial({
          color: cfg.ringColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.position.y = 0.42;
      group.add(outerRing);
      this.cityOuterRings.push(outerRing);

      // Yuxarıya uzanan incə işıq sütunu
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.36, 11.5, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: cfg.ringColor,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      pillar.position.y = 6.0;
      group.add(pillar);

      const monument = this._buildCityArchitecture(cfg.id, cfg.hex);
      monument.position.y = 0.4;
      group.add(monument);

      const labelSprite = this._createModernLabelSprite(pos.label, cfg.hex);
      labelSprite.position.set(0, cfg.labelOffsetY, 0);
      group.add(labelSprite);

      this.scene.add(group);
    }
  }

  _buildDynamicNPCMarkers() {
    const defaultNPCs = [
      { role: 'NPC_Historian', color: '#9c7bf2', curveIdx: 0, t: 0.28 },
      { role: 'NPC_Ashig', color: '#42d49c', curveIdx: 0, t: 0.65 },
      { role: 'NPC_Craftsman', color: '#e88b48', curveIdx: 2, t: 0.45 },
      { role: 'NPC_Traveler', color: '#56d1db', curveIdx: 1, t: 0.36 },
      { role: 'PadishahNPC', color: '#f4c158', curveIdx: 1, t: 0.72 },
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

      markerGroup.add(this._createStylizedUnit(item.color, 0xf4e8d2));

      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.46, 0),
        new THREE.MeshBasicMaterial({ color: item.color })
      );
      beacon.position.y = 3.25;
      markerGroup.add(beacon);

      const aura = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.4, 28),
        new THREE.MeshBasicMaterial({
          color: item.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
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

  _buildWaypointAndGPS() {
    this.waypointGroup = new THREE.Group();
    this.waypointGroup.visible = false;

    this.waypointRing = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.45, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd65e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
      })
    );
    this.waypointRing.rotation.x = -Math.PI / 2;
    this.waypointGroup.add(this.waypointRing);

    this.waypointOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(1.85, 2.15, 32),
      new THREE.MeshBasicMaterial({
        color: 0x56dce2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
    );
    this.waypointOuterRing.rotation.x = -Math.PI / 2;
    this.waypointGroup.add(this.waypointOuterRing);

    this.waypointBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.72, 12, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd65e,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.waypointBeam.position.y = 6.0;
    this.waypointGroup.add(this.waypointBeam);

    const pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.2, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd65e })
    );
    pin.rotation.x = Math.PI;
    pin.position.y = 1.65;
    this.waypointGroup.add(pin);

    this.scene.add(this.waypointGroup);

    const initCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
    const gpsMat = new THREE.MeshBasicMaterial({
      color: 0xffd452,
      transparent: true,
      opacity: 0.92,
    });
    this.gpsMesh = new THREE.Mesh(new THREE.TubeGeometry(initCurve, 4, 0.24, 6, false), gpsMat);
    this.gpsMesh.visible = false;
    this.scene.add(this.gpsMesh);
  }

  async _buildCharacters() {
    const merchantMesh =
      (await this.modelLoader.loadOptionalGLB('merchant_caravan', 1.0)) ||
      this._createAnimatedCaravan();

    const caravanHalo = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.55, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd564,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
      })
    );
    caravanHalo.rotation.x = -Math.PI / 2;
    caravanHalo.position.y = 0.14;
    merchantMesh.add(caravanHalo);

    this.scene.add(merchantMesh);
    this.gameManager.merchant.setMesh(merchantMesh);

    const guardMesh =
      (await this.modelLoader.loadOptionalGLB('guard', 1.0)) ||
      this._createStylizedUnit(0x3a9bd4, 0xf2e2c8);
    this.scene.add(guardMesh);
    this.gameManager.guard.setMesh(guardMesh);

    const thiefMesh =
      (await this.modelLoader.loadOptionalGLB('thief', 1.0)) ||
      this._createStylizedUnit(0xc93b3b, 0x261d1a);
    this.scene.add(thiefMesh);
    this.gameManager.thief.setMesh(thiefMesh);
  }

  _createAnimatedCaravan() {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4722, roughness: 0.78 });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xf0c766,
      roughness: 0.55,
      metalness: 0.12,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2d1d12, roughness: 0.85 });
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x9b5a2e, roughness: 0.68 });

    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 2.5), woodMat);
    cart.position.set(0, 0.9, -0.5);
    cart.castShadow = true;
    g.add(cart);

    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 2.4, 12, 1, false, 0, Math.PI),
      canopyMat
    );
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 1.32, -0.5);
    canopy.castShadow = true;
    g.add(canopy);

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

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 6), wheelMat);
    pole.position.set(0.75, 2.35, -1.5);
    g.add(pole);

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xc93b2b, side: THREE.DoubleSide })
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
      new THREE.CylinderGeometry(0.44, 0.64, 1.5, 12),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.15 })
    );
    body.position.y = 0.8;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.55 })
    );
    head.position.y = 1.85;
    head.castShadow = true;
    g.add(head);
    return g;
  }

  _spawnDustPuff(x, y, z) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xf4cf76, transparent: true, opacity: 0.48 })
    );
    puff.position.set(x + (Math.random() - 0.5) * 0.7, y + 0.3, z + (Math.random() - 0.5) * 0.7);
    this.scene.add(puff);
    this.dustPuffs.push({ mesh: puff, life: 0.75 });
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
      if (pt.y < 0.08) return;

      this.setWaypointVisual(pt.x, pt.z);
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
    if (!this.gpsMesh) return;
    const target = this.gameManager.merchant.targetPos;
    if (!target) {
      this.gpsMesh.visible = false;
      if (this.waypointGroup) this.waypointGroup.visible = false;
      this._lastGpsKey = '';
      return;
    }

    const m = this.gameManager.merchant.position;
    if (Math.hypot(target.x - m.x, target.z - m.z) < 0.4) {
      this.gpsMesh.visible = false;
      return;
    }

    const key = `${m.x.toFixed(1)},${m.z.toFixed(1)}->${target.x.toFixed(1)},${target.z.toFixed(1)}`;
    if (key === this._lastGpsKey && this.gpsMesh.visible) return;
    this._lastGpsKey = key;

    const pts = [];
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = m.x + (target.x - m.x) * t;
      const z = m.z + (target.z - m.z) * t;
      pts.push(new THREE.Vector3(x, this.getTerrainHeight(x, z) + 0.5, z));
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    this.gpsMesh.geometry.dispose();
    this.gpsMesh.geometry = new THREE.TubeGeometry(curve, 32, 0.24, 6, false);
    this.gpsMesh.visible = true;
  }

  update(dt) {
    if (!this.isMounted || !this.renderer || !this.scene || !this.camera) return;
    this.elapsed += dt;

    // 1. Xəzər dalğa animasiyası
    if (this.seaMesh && this.seaBasePositions) {
      const pos = this.seaMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = this.seaBasePositions[i * 3];
        const bz = this.seaBasePositions[i * 3 + 2];
        pos.setY(
          i,
          Math.sin(bx * 0.16 + this.elapsed * 1.4) * 0.09 +
            Math.cos(bz * 0.14 + this.elapsed * 1.1) * 0.07
        );
      }
      pos.needsUpdate = true;
    }

    // 2. Astrolab halqaları & İpək Yolu işıq impulsları
    for (const r of this.astrolabeRings) {
      r.mesh.rotation.z += r.speed * dt;
    }
    for (const p of this.roadPulses) {
      p.t = (p.t + dt * p.speed) % 1;
      const pos = p.curve.getPoint(p.t);
      p.mesh.position.copy(pos);
      p.mesh.position.y += 0.24;
    }

    // 3. Abstrakt Xəzər gəmisi
    if (this.caspianVessel) {
      const ang = this.elapsed * 0.22;
      const sx = 45 + Math.cos(ang) * 4.5;
      const sz = 8 + Math.sin(ang * 0.7) * 18;
      const dx = -Math.sin(ang) * 4.5;
      const dz = Math.cos(ang * 0.7) * 18 * 0.7;
      this.caspianVessel.position.set(sx, 0.12 + Math.sin(this.elapsed * 2.2) * 0.1, sz);
      this.caspianVessel.rotation.y = Math.atan2(dx, dz);
      this.caspianVessel.rotation.z = Math.sin(this.elapsed * 2.5) * 0.05;
    }

    // 4. Karvan animasiyası
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

    // Qızılı toz zərrəcikləri
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const p = this.dustPuffs[i];
      p.life -= dt;
      p.mesh.position.y += dt * 0.9;
      p.mesh.scale.addScalar(dt * 1.1);
      p.mesh.material.opacity = Math.max(0, p.life * 0.55);
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
    for (const outer of this.cityOuterRings) {
      outer.rotation.z += dt * 0.55;
    }
    for (const item of this.npcMarkers) {
      item.beacon.rotation.y += dt * 1.8;
      item.beacon.position.y = 3.25 + Math.sin(this.elapsed * 2.8 + item.phase) * 0.26;
    }

    // 6. Waypoint & GTA GPS lenti
    if (this.waypointGroup && this.waypointGroup.visible) {
      this.waypointRing.scale.setScalar(1 + Math.sin(this.elapsed * 4.5) * 0.14);
      this.waypointOuterRing.scale.setScalar(1 - Math.sin(this.elapsed * 4.5) * 0.1);
      this.waypointBeam.rotation.y += dt * 1.5;
    }
    this._updateGPSLine();

    // 7. GTA V axıcı kamera keçidi (Abstrakt Xəritə ↔ GTA Arxa 3D)
    const targetBlend = this.cameraMode === 'gta' ? 1 : 0;
    this.gtaBlend += (targetBlend - this.gtaBlend) * Math.min(1, dt * 3.4);

    const mPos = merchant.position;
    const mapCamPos = new THREE.Vector3(mPos.x * 0.12 + 4, 90, mPos.z * 0.12 + 68);
    const mapLookAt = new THREE.Vector3(mPos.x * 0.14 + 3, 1.0, mPos.z * 0.14);

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

    const t = this.gtaBlend * this.gtaBlend * (3 - 2 * this.gtaBlend);
    const desiredCam = new THREE.Vector3().lerpVectors(mapCamPos, gtaCamPos, t);
    const desiredLook = new THREE.Vector3().lerpVectors(mapLookAt, gtaLookAt, t);

    this.camera.position.lerp(desiredCam, Math.min(1, dt * 5.5));
    this.camLookTarget.lerp(desiredLook, Math.min(1, dt * 6.5));
    this.camera.lookAt(this.camLookTarget);

    this.renderer.render(this.scene, this.camera);
  }

  unmount() {
    this.isMounted = false;
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
