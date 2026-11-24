/**
 * Scenes/World_Azerbaijan.js
 * 2D Qədim İllüstrasiyalı Azərbaycan Xəritəsi (Şəkil üzərində hərəkət edən Karvan ikonu):
 * - Əgər `public/images/ancient_azerbaijan_map.png` (və ya .jpg / .webp) mövcuddursa, birbaşa həmin şəkli fon kimi yükləyir!
 * - Şəkil hələ əlavə edilməyibsə, qədim əlyazma-perqament (Lord of the Mysteries × Şirvanşah-Qarabağ Divan Atlası)
 *   üslubunda yüksək detallı mürəkkəb-qravür Azərbaycan xəritəsi çəkir.
 * - Üzərində yalnız zərif İpək Yolu marşrutu, şəhər surğuç möhürləri (Bakı, Şəki, Şuşa),
 *   yolçu/rəvayətçi nişanları və hamar sürüşən Karvan / Keşikçi / Quldur ikonları hərəkət edir.
 */
export class WorldAzerbaijanScene {
  constructor(container, eventBus, data, gameManager) {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.gameManager = gameManager;

    this.rootEl = null;
    this.canvas = null;
    this.ctx = null;
    this.bgCanvas = null;
    this.customMapImg = null;
    this.isMounted = false;

    // Dünya koordinat sistemi (Merchant.js bounds ilə tam uyğun: [-58..44] x [-38..38])
    this.worldMinX = -62;
    this.worldMaxX = 56;
    this.worldMinZ = -42;
    this.worldMaxZ = 42;

    this.cityPositions = {
      City_Baku: { x: 28, z: 4, radius: 9.0, label: 'Bakı · İçərişəhər', short: 'Bakı', era: 'Şirvanşahlar Limanı' },
      City_Sheki: { x: -16, z: -20, radius: 9.0, label: 'Şəki · Karvansaray', short: 'Şəki', era: 'İpək Mənzili' },
      City_Shusha: { x: -24, z: 16, radius: 9.0, label: 'Şuşa · Qala Şəhəri', short: 'Şuşa', era: 'Qarabağ Qalası' },
    };

    this.routes = [
      [
        [28, 4],
        [14, -4],
        [0, -12],
        [-16, -20],
      ],
      [
        [28, 4],
        [9, 10],
        [-8, 14],
        [-24, 16],
      ],
      [
        [-16, -20],
        [-23, -8],
        [-26, 4],
        [-24, 16],
      ],
    ];

    this.roadLandmarks = [
      { label: 'Qobustan Qayaları', x: 20, z: 14 },
      { label: 'Şamaxı Dərələri', x: 9, z: -5 },
      { label: 'Qəbələ Aşırımı', x: -3, z: -15 },
      { label: 'Gəncəbasar', x: -32, z: -2 },
      { label: 'Bərdə Qovşağı', x: -9, z: 9 },
      { label: 'Muğan Düzü', x: 11, z: 24 },
    ];

    this.cameraMode = 'map';
    this.waypoint = null;
    this.hoveredCityId = null;
    this.elapsed = 0;

    // Ekran daxilində xəritə vərəqinin düzbucaqlısı (16:10 / 16:9 nisbəti qorunur)
    this.mapRect = { x: 0, y: 0, w: 1280, h: 800 };

    this._onResize = () => this._handleResize();
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onDblClick = (e) => this._handleDblClick(e);
    this._onContextMenu = (e) => e.preventDefault();
  }

  getScene() {
    return null;
  }

  getCamera() {
    return null;
  }

  getCityPositions() {
    return this.cityPositions;
  }

  setCameraMode() {
    this.cameraMode = 'map';
  }

  setWaypointVisual(x, z) {
    this.waypoint = { x, z };
  }

  _getCoastlineX(z) {
    const absheronPeninsula = 7.6 * Math.exp(-((z - 4) * (z - 4)) / 46);
    const wave = Math.sin(z * 0.12) * 2.0 + Math.cos(z * 0.06) * 1.4;
    return 33.5 + absheronPeninsula + wave;
  }

  /**
   * Merchant.js su sərhədini yoxlamaq üçün `getTerrainHeight(x, z) > 0.08` şərtini işlədir.
   * Quruda 1.0, Xəzər dənizində -1.0 qaytarırıq.
   */
  getTerrainHeight(x, z) {
    const coastX = this._getCoastlineX(z);
    return x > coastX ? -1.0 : 1.0;
  }

  _worldToScreen(wx, wz) {
    const u = (wx - this.worldMinX) / (this.worldMaxX - this.worldMinX);
    const v = (wz - this.worldMinZ) / (this.worldMaxZ - this.worldMinZ);
    return {
      sx: this.mapRect.x + u * this.mapRect.w,
      sy: this.mapRect.y + v * this.mapRect.h,
    };
  }

  _screenToWorld(sx, sy) {
    const u = (sx - this.mapRect.x) / (this.mapRect.w || 1);
    const v = (sy - this.mapRect.y) / (this.mapRect.h || 1);
    return {
      x: this.worldMinX + u * (this.worldMaxX - this.worldMinX),
      z: this.worldMinZ + v * (this.worldMaxZ - this.worldMinZ),
    };
  }

  async _tryLoadCustomMapImage() {
    const candidates = [
      './images/ancient_azerbaijan_map.png',
      './images/ancient_azerbaijan_map.jpg',
      './images/ancient_azerbaijan_map.webp',
      './images/map.png',
    ];

    for (const url of candidates) {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        const ctype = head.headers.get('content-type') || '';
        if (!head.ok || !ctype.startsWith('image/')) continue;

        const img = await new Promise((resolve) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => resolve(null);
          el.src = url;
        });
        if (img) return img;
      } catch {
        // Növbəti namizədə keç
      }
    }
    return null;
  }

  async mount() {
    this.isMounted = false;
    this.container.innerHTML = '';

    // 3D meş istinadlarını təmizlə (2D ikon rejimi)
    this.gameManager.merchant.setMesh(null);
    this.gameManager.guard.setMesh(null);
    this.gameManager.thief.setMesh(null);
    this.gameManager.merchant.setControlMode('map');

    this.rootEl = document.createElement('div');
    this.rootEl.style.cssText =
      'position:relative;width:100%;height:100%;background:#0c0906;overflow:hidden;';

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:crosshair;';
    this.ctx = this.canvas.getContext('2d');
    this.rootEl.appendChild(this.canvas);
    this.container.appendChild(this.rootEl);

    this.customMapImg = await this._tryLoadCustomMapImage();
    this._buildProceduralParchmentBuffer();
    this._handleResize();

    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('dblclick', this._onDblClick);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);

    this.isMounted = true;
  }

  /**
   * İstifadəçinin xüsusi şəkli hələ qovluğa atılmayıbsa, yüksək sənətkarlıqla çəkilmiş
   * qədim perqament və mürəkkəb qravürlü Azərbaycan xəritəsini bir dəfə buferdə hazırlayır.
   */
  _buildProceduralParchmentBuffer() {
    const W = 1920;
    const H = 1200;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d');

    const toPx = (wx, wz) => ({
      x: ((wx - this.worldMinX) / (this.worldMaxX - this.worldMinX)) * W,
      y: ((wz - this.worldMinZ) / (this.worldMaxZ - this.worldMinZ)) * H,
    });

    // 1. Qədim tünd-kəhrəba əlyazma perqamenti fonu
    const bgGrad = ctx.createRadialGradient(W * 0.44, H * 0.5, 90, W * 0.5, H * 0.5, W * 0.72);
    bgGrad.addColorStop(0, '#d7c197');
    bgGrad.addColorStop(0.55, '#bfa373');
    bgGrad.addColorStop(0.88, '#8d7047');
    bgGrad.addColorStop(1, '#4b3720');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Perqament lifləri və qədim yaşlanma ləkələri
    let seed = 4099;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 95; i++) {
      const rx = rand() * W;
      const ry = rand() * H;
      const rr = 35 + rand() * 190;
      const g = ctx.createRadialGradient(rx, ry, 4, rx, ry, rr);
      g.addColorStop(0, 'rgba(68, 44, 22, 0.085)');
      g.addColorStop(1, 'rgba(68, 44, 22, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }

    // İncə kağız toxuması cızıqları
    ctx.strokeStyle = 'rgba(72, 48, 24, 0.045)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Xəzər Dənizi (Şərq sahili və mürəkkəbli dalğa ştrixləri)
    ctx.save();
    ctx.beginPath();
    const firstCoast = toPx(this._getCoastlineX(this.worldMinZ), this.worldMinZ);
    ctx.moveTo(firstCoast.x, firstCoast.y);
    for (let wz = this.worldMinZ; wz <= this.worldMaxZ; wz += 1.2) {
      const p = toPx(this._getCoastlineX(wz), wz);
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(W, 0);
    ctx.closePath();

    const seaGrad = ctx.createLinearGradient(W * 0.72, 0, W, 0);
    seaGrad.addColorStop(0, '#365563');
    seaGrad.addColorStop(0.35, '#27424f');
    seaGrad.addColorStop(1, '#182b35');
    ctx.fillStyle = seaGrad;
    ctx.fill();

    // Sahil boyu qədim xəritə paralel su xətləri (portolan üslubu)
    for (let offset = 6; offset <= 26; offset += 6.5) {
      ctx.strokeStyle = `rgba(218, 198, 158, ${0.34 - offset * 0.009})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let wz = this.worldMinZ; wz <= this.worldMaxZ; wz += 1.5) {
        const p = toPx(this._getCoastlineX(wz), wz);
        if (wz === this.worldMinZ) ctx.moveTo(p.x + offset, p.y);
        else ctx.lineTo(p.x + offset, p.y);
      }
      ctx.stroke();
    }

    // Əsas mürəkkəb sahil konturu
    ctx.strokeStyle = '#2d1d10';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    for (let wz = this.worldMinZ; wz <= this.worldMaxZ; wz += 1.2) {
      const p = toPx(this._getCoastlineX(wz), wz);
      if (wz === this.worldMinZ) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Portolan Rumba (Kompas şüaları) Xətləri
    const compassCenter = toPx(45, -22);
    ctx.save();
    ctx.strokeStyle = 'rgba(54, 38, 20, 0.13)';
    ctx.lineWidth = 1;
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(compassCenter.x, compassCenter.y);
      ctx.lineTo(compassCenter.x + Math.cos(ang) * W * 1.3, compassCenter.y + Math.sin(ang) * W * 1.3);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Kür və Araz Çayları (Qədim mürəkkəb xəttatlığı ilə)
    const drawInkRiver = (pts, width) => {
      const pxPts = pts.map(([wx, wz]) => toPx(wx, wz));
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(42, 68, 78, 0.35)';
      ctx.lineWidth = width + 5;
      ctx.beginPath();
      pxPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.strokeStyle = '#2b4f5e';
      ctx.lineWidth = width;
      ctx.beginPath();
      pxPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    };

    drawInkRiver(
      [
        [-58, -26],
        [-42, -19],
        [-24, -10],
        [-7, -3],
        [6, 3],
        [19, 13],
        [35, 23],
      ],
      4.8
    );
    drawInkRiver(
      [
        [-52, 33],
        [-30, 26],
        [-11, 18],
        [6, 14],
        [19, 13],
      ],
      3.8
    );

    // 5. Əl ilə çəkilmiş Qədim Dağ Silsilələri (Böyük və Kiçik Qafqaz, Talış)
    const drawMountainPeak = (cx, cy, scale = 1) => {
      const w = 36 * scale;
      const h = 24 * scale;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - w, cy + h * 0.45);
      ctx.quadraticCurveTo(cx - w * 0.35, cy - h * 0.5, cx, cy - h);
      ctx.quadraticCurveTo(cx + w * 0.35, cy - h * 0.5, cx + w, cy + h * 0.45);

      // Sol yamac kölgələməsi
      const shade = ctx.createLinearGradient(cx - w, cy, cx + w * 0.4, cy);
      shade.addColorStop(0, 'rgba(66, 44, 24, 0.36)');
      shade.addColorStop(0.5, 'rgba(92, 64, 36, 0.18)');
      shade.addColorStop(1, 'rgba(92, 64, 36, 0)');
      ctx.fillStyle = shade;
      ctx.fill();

      ctx.strokeStyle = '#3c2815';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy + h * 0.45);
      ctx.quadraticCurveTo(cx - w * 0.35, cy - h * 0.5, cx, cy - h);
      ctx.quadraticCurveTo(cx + w * 0.35, cy - h * 0.5, cx + w, cy + h * 0.45);
      ctx.stroke();

      // Zirvədən enən qravür ştrixi
      ctx.strokeStyle = 'rgba(60, 40, 21, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.lineTo(cx - w * 0.22, cy + h * 0.32);
      ctx.moveTo(cx - w * 0.2, cy - h * 0.45);
      ctx.lineTo(cx - w * 0.48, cy + h * 0.35);
      ctx.stroke();
      ctx.restore();
    };

    const greaterCaucasusPeaks = [
      [-48, -34, 1.15],
      [-39, -31, 1.35],
      [-30, -33, 1.45],
      [-21, -29, 1.3],
      [-12, -28, 1.48],
      [-3, -25, 1.32],
      [6, -21, 1.2],
      [14, -16, 1.05],
      [21, -11, 0.88],
    ];
    for (const [mx, mz, sc] of greaterCaucasusPeaks) {
      const p = toPx(mx, mz);
      drawMountainPeak(p.x, p.y, sc);
    }

    const lesserCaucasusPeaks = [
      [-48, 8, 1.15],
      [-41, 14, 1.35],
      [-34, 19, 1.4],
      [-39, 25, 1.25],
      [-30, 27, 1.18],
      [-21, 25, 1.05],
      [18, 34, 0.95],
      [24, 36, 1.05],
    ];
    for (const [mx, mz, sc] of lesserCaucasusPeaks) {
      const p = toPx(mx, mz);
      drawMountainPeak(p.x, p.y, sc);
    }

    // 6. Xəzərdə Qədim Yelkənli Gəmi Qravürü və Kompas Gülü
    const drawCompassRose = (cx, cy, r) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#d8be90';
      ctx.fillStyle = '#d8be90';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 4);
        const len = i % 2 === 0 ? r * 1.18 : r * 0.76;
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(r * 0.14, 0);
        ctx.lineTo(0, r * 0.14);
        ctx.closePath();
        ctx.fillStyle = i === 0 ? '#a8382b' : '#dfd8bd';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(-r * 0.14, 0);
        ctx.lineTo(0, r * 0.14);
        ctx.closePath();
        ctx.fillStyle = 'rgba(28, 20, 12, 0.65)';
        ctx.fill();
        ctx.restore();
      }
      ctx.font = '700 16px Georgia, serif';
      ctx.fillStyle = '#efe2c4';
      ctx.textAlign = 'center';
      ctx.fillText('Ş', 0, -r * 1.3);
      ctx.restore();
    };
    drawCompassRose(compassCenter.x, compassCenter.y, 52);

    // Gəmi eskizi
    const shipP = toPx(46, 15);
    ctx.save();
    ctx.translate(shipP.x, shipP.y);
    ctx.strokeStyle = 'rgba(228, 208, 170, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-26, 8);
    ctx.quadraticCurveTo(0, 20, 26, 8);
    ctx.lineTo(18, 18);
    ctx.lineTo(-18, 18);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -28);
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(22, -8, 4, 4);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 7. Bölgə Adları (Xəttatlıq üslubunda solğun mürəkkəb)
    ctx.save();
    ctx.textAlign = 'center';
    const writeRegion = (wx, wz, title, size = 24, angle = 0, color = 'rgba(54, 34, 16, 0.58)') => {
      const p = toPx(wx, wz);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = color;
      ctx.fillText(title, 0, 0);
      ctx.restore();
    };

    writeRegion(-18, -32, 'B Ö Y Ü K   Q A F Q A Z', 23, 0.14);
    writeRegion(-37, 22, 'K İ Ç İ K   Q A F Q A Z', 21, -0.24);
    writeRegion(14, -7, 'Ş İ R V A N', 26, -0.06);
    writeRegion(-2, 4, 'K Ü R — A R A Z   O V A L I Ğ I', 21, 0.08);
    writeRegion(-22, 9, 'Q A R A B A Ğ', 25, -0.08);
    writeRegion(46, 2, 'X Ə Z Ə R   D Ə N İ Z İ', 25, -0.04, 'rgba(226, 208, 174, 0.58)');

    for (const lm of this.roadLandmarks) {
      const p = toPx(lm.x, lm.z);
      ctx.fillStyle = 'rgba(64, 42, 22, 0.65)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'italic 500 16px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(lm.label, p.x, p.y - 9);
    }
    ctx.restore();

    // 8. Xarici İkiqat Bürünc-Mürəkkəb Haşiyə və Künc Nişanları
    ctx.save();
    ctx.strokeStyle = '#342211';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.strokeStyle = '#8c6b34';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.restore();

    this.bgCanvas = off;
  }

  _handleResize() {
    if (!this.canvas || !this.rootEl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.rootEl.clientWidth || window.innerWidth;
    const h = this.rootEl.clientHeight || window.innerHeight;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Xəritə vərəqini ekranın içində tam mütənasib (kənarlarda incə tünd çərçivə ilə) yerləşdir
    const targetAspect = 16 / 10;
    const padX = 18;
    const padTop = 66;
    const padBottom = 58;
    const availW = Math.max(320, w - padX * 2);
    const availH = Math.max(240, h - padTop - padBottom);

    let mw = availW;
    let mh = mw / targetAspect;
    if (mh > availH) {
      mh = availH;
      mw = mh * targetAspect;
    }

    this.mapRect = {
      x: (w - mw) * 0.5,
      y: padTop + (availH - mh) * 0.5,
      w: mw,
      h: mh,
    };
  }

  _findCityAtScreen(sx, sy) {
    for (const [cityId, c] of Object.entries(this.cityPositions)) {
      const p = this._worldToScreen(c.x, c.z);
      if (Math.hypot(sx - p.sx, sy - p.sy) <= 28) {
        return cityId;
      }
    }
    return null;
  }

  _handlePointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hitCity = this._findCityAtScreen(sx, sy);
    this.hoveredCityId = hitCity;
    this.canvas.style.cursor = hitCity ? 'pointer' : 'crosshair';
  }

  _handlePointerDown(e) {
    if (e.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Şəhər möhürünə klikləndikdə
    const hitCityId = this._findCityAtScreen(sx, sy);
    if (hitCityId) {
      const city = this.cityPositions[hitCityId];
      // Artıq həmin şəhərin daxilindəyiksə, birbaşa 3D Karvansaraya daxil ola bilər və ya mərkəzinə yönələr
      if (this.gameManager.tradeManager.currentCityId === hitCityId) {
        this.eventBus.emit('scene:enter_bazaar', hitCityId);
        return;
      }
      this.waypoint = { x: city.x, z: city.z };
      this.eventBus.emit('world:click_move', { x: city.x, z: city.z, enterGTA: false });
      this.eventBus.emit('ui:toast', {
        message: `Karvan istiqaməti: ${city.label}`,
        type: 'info',
      });
      return;
    }

    // Xəritə hüdudları daxilində quru nöqtəsinə klikləndikdə
    if (
      sx < this.mapRect.x ||
      sx > this.mapRect.x + this.mapRect.w ||
      sy < this.mapRect.y ||
      sy > this.mapRect.y + this.mapRect.h
    ) {
      return;
    }

    const world = this._screenToWorld(sx, sy);
    if (this.getTerrainHeight(world.x, world.z) <= 0.08) {
      this.eventBus.emit('ui:toast', {
        message: 'Karvan Xəzər sularına girə bilməz — quru mənzili seçin.',
        type: 'warn',
      });
      return;
    }

    this.waypoint = { x: world.x, z: world.z };
    this.eventBus.emit('world:click_move', { x: world.x, z: world.z, enterGTA: false });
  }

  _handleDblClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const hitCityId = this._findCityAtScreen(e.clientX - rect.left, e.clientY - rect.top);
    if (hitCityId && this.gameManager.tradeManager.currentCityId === hitCityId) {
      this.eventBus.emit('scene:enter_bazaar', hitCityId);
    }
  }

  _drawSilkRoadTrails(ctx) {
    ctx.save();
    for (const route of this.routes) {
      const pts = route.map(([wx, wz]) => this._worldToScreen(wx, wz));

      ctx.strokeStyle = 'rgba(52, 32, 14, 0.55)';
      ctx.lineWidth = 3.6;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(218, 174, 88, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawActiveRoute(ctx, merchant) {
    const target = merchant.targetPos;
    if (!target) {
      this.waypoint = null;
      return;
    }

    const from = this._worldToScreen(merchant.position.x, merchant.position.z);
    const to = this._worldToScreen(target.x, target.z);

    ctx.save();
    ctx.strokeStyle = '#7e2323';
    ctx.lineWidth = 2.8;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -this.elapsed * 18;
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hədəf X möhürü
    ctx.strokeStyle = '#7e2323';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(to.sx, to.sy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.sx - 4.5, to.sy - 4.5);
    ctx.lineTo(to.sx + 4.5, to.sy + 4.5);
    ctx.moveTo(to.sx + 4.5, to.sy - 4.5);
    ctx.lineTo(to.sx - 4.5, to.sy + 4.5);
    ctx.stroke();
    ctx.restore();
  }

  _drawCitySeals(ctx) {
    const currentCityId = this.gameManager.tradeManager.currentCityId;
    const visited = this.gameManager.tradeManager.visitedCityIds;

    for (const [cityId, c] of Object.entries(this.cityPositions)) {
      const p = this._worldToScreen(c.x, c.z);
      const isCurrent = currentCityId === cityId;
      const isHovered = this.hoveredCityId === cityId;
      const isVisited = visited.has(cityId);

      ctx.save();
      ctx.translate(p.sx, p.sy);

      // Xarici şəhər təsir dairəsi (zərif mürəkkəb halqası)
      if (isCurrent || isHovered) {
        ctx.strokeStyle = isCurrent ? 'rgba(142, 38, 34, 0.55)' : 'rgba(207, 163, 85, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Surğuç möhürü medalyonu
      ctx.fillStyle = isCurrent ? '#8b2424' : isVisited ? '#5e2220' : '#2a1e14';
      ctx.strokeStyle = isHovered ? '#f3d38c' : '#d4aa5c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Daxili səkkizguşəli ulduz həkkaklığı
      ctx.strokeStyle = '#f2dfc0';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-6.5, -6.5, 13, 13);
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-6.5, -6.5, 13, 13);
      ctx.restore();

      // Şəhər lövhəsi (əlyazma etiketi)
      ctx.font = '700 15px "Cormorant Garamond", Georgia, serif';
      const labelText = isCurrent ? `${c.label} · [Karvansaraya Gir]` : c.label;
      const tw = ctx.measureText(labelText).width;
      const boxW = tw + 20;
      const boxH = 24;

      ctx.fillStyle = 'rgba(18, 13, 9, 0.9)';
      ctx.strokeStyle = isCurrent ? '#d9a44e' : 'rgba(196, 152, 76, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-boxW / 2, -44, boxW, boxH);
      ctx.strokeRect(-boxW / 2, -44, boxW, boxH);

      ctx.fillStyle = '#f4e6cb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, -32);

      ctx.restore();
    }
  }

  _drawCaravanAndUnits(ctx) {
    const merchant = this.gameManager.merchant;
    const guard = this.gameManager.guard;
    const thief = this.gameManager.thief;

    // 1. Keşikçi ikonu (qalxan nişanı)
    if (guard) {
      const gp = this._worldToScreen(guard.position.x, guard.position.z);
      ctx.save();
      ctx.translate(gp.sx, gp.sy);
      ctx.fillStyle = '#1f3f4f';
      ctx.strokeStyle = '#d4ad60';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#e9dcc2';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(4, -2);
      ctx.lineTo(3, 3.2);
      ctx.lineTo(0, 5);
      ctx.lineTo(-3, 3.2);
      ctx.lineTo(-4, -2);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // 2. Quldur pusqusu ikonu (yalnız aktiv olduqda görünür)
    if (thief && thief.isActive) {
      const tp = this._worldToScreen(thief.position.x, thief.position.z);
      ctx.save();
      ctx.translate(tp.sx, tp.sy);
      ctx.fillStyle = '#7a1c1c';
      ctx.strokeStyle = '#f0b8a8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#fff0ea';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 4);
      ctx.moveTo(4, -4);
      ctx.lineTo(-4, 4);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Əsas Karvan İkonu (Bürünc medalyon içində hərəkət edən karvan silueti)
    const mp = this._worldToScreen(merchant.position.x, merchant.position.z);
    ctx.save();
    ctx.translate(mp.sx, mp.sy);

    // Zərif kölgə
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 3, 16, 0, Math.PI * 2);
    ctx.fill();

    // Bürünc-qızılı əsas karvan möhürü
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
    grad.addColorStop(0, '#4a3319');
    grad.addColorStop(1, '#1e140b');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ebc476';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Karvan dəvəsi / yük atı vektor silueti
    ctx.strokeStyle = '#f8e9cb';
    ctx.fillStyle = '#f8e9cb';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // Gövdə və hörgüc/yük tayı
    ctx.moveTo(-6.5, 2);
    ctx.quadraticCurveTo(-2, -6.5, 2.5, 1);
    ctx.lineTo(5.5, -4.5);
    ctx.lineTo(7.5, -3.5);
    // Ayaqlar
    ctx.moveTo(-5, 2);
    ctx.lineTo(-5.5, 7);
    ctx.moveTo(-1.5, 2);
    ctx.lineTo(-1, 7);
    ctx.moveTo(2.5, 1.5);
    ctx.lineTo(2.5, 7);
    ctx.stroke();

    // "Karvanın" alt etiketi
    ctx.font = '700 12.5px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = '#18110b';
    ctx.strokeStyle = '#cfa355';
    ctx.lineWidth = 1;
    ctx.fillRect(-31, 19, 62, 17);
    ctx.strokeRect(-31, 19, 62, 17);
    ctx.fillStyle = '#f5e6c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KARVANIN', 0, 27.5);

    ctx.restore();
  }

  update(dt) {
    if (!this.isMounted || !this.ctx || !this.canvas) return;
    this.elapsed += dt;

    const ctx = this.ctx;
    const w = this.rootEl.clientWidth || window.innerWidth;
    const h = this.rootEl.clientHeight || window.innerHeight;

    // 1. Arxa qaranlıq masa fonu
    ctx.fillStyle = '#0c0906';
    ctx.fillRect(0, 0, w, h);

    // 2. Xəritə şəkli (varsa istifadəçinin şəkli, yoxsa əlyazma perqament xəritəsi)
    const { x, y, w: mw, h: mh } = this.mapRect;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 36;
    ctx.fillStyle = '#1d140c';
    ctx.fillRect(x, y, mw, mh);
    ctx.restore();

    if (this.customMapImg) {
      ctx.drawImage(this.customMapImg, x, y, mw, mh);
    } else if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, x, y, mw, mh);
    }

    // Xəritə kənarlarında zərif vinyet və bürünc çərçivə
    ctx.save();
    ctx.strokeStyle = 'rgba(207, 163, 85, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, mw, mh);
    ctx.strokeStyle = 'rgba(20, 14, 9, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, mw - 8, mh - 8);
    ctx.restore();

    // 3. İpək Yolu izləri, aktiv marşrut, şəhər möhürləri və hərəkət edən Karvan ikonu
    this._drawSilkRoadTrails(ctx);
    this._drawActiveRoute(ctx, this.gameManager.merchant);
    this._drawCitySeals(ctx);
    this._drawCaravanAndUnits(ctx);
  }

  unmount() {
    this.isMounted = false;
    window.removeEventListener('resize', this._onResize);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('dblclick', this._onDblClick);
      this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
    this.container.innerHTML = '';
    this.rootEl = null;
    this.canvas = null;
    this.ctx = null;
  }
}
