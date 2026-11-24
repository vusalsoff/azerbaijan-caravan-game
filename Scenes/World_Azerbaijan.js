/**
 * Scenes/World_Azerbaijan.js
 * Sürətli Səfər (Fast-Travel) və Strateji Karvan Xəritəsi:
 * - ChatGPT ilə hazırlanmış illüstrasiyalı Qədim Azərbaycan Xəritəsini (`public/images/ancient_azerbaijan_map.jpg`)
 *   tam çərçivədə göstərir və şəhər möhürlərini rəsmdəki qalalara (Bakı Qız Qalası, Şəki, Şuşa/Qarabağ qalası) dəqiq oturdur.
 * - Şəhərə klikləndikdə rəsmdəki daş körpülər və nöqtəli karvan cığırı boyunca sürətli səfər (Fast-Travel) icra edir
 *   və sonda qısa «Mənzil Yekunu» hesabatı çıxarıb 3D Şəhər səhnəsinə keçid təklif edir.
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

    this.worldMinX = -62;
    this.worldMaxX = 56;
    this.worldMinZ = -42;
    this.worldMaxZ = 42;

    // Rəsmdəki abidələrin dəqiq koordinatları:
    // Bakı (Abşeron Qız Qalası: u≈0.755, v≈0.485), Şəki (Dağ ətəyi: u≈0.465, v≈0.275), Şuşa (Qərb Qalası: u≈0.155, v≈0.445)
    this.cityPositions = {
      City_Baku: {
        x: this._uToWorldX(0.755),
        z: this._vToWorldZ(0.485),
        u: 0.755,
        v: 0.485,
        radius: 8.5,
        label: 'Bakı · İçərişəhər',
        short: 'Bakı',
      },
      City_Sheki: {
        x: this._uToWorldX(0.465),
        z: this._vToWorldZ(0.275),
        u: 0.465,
        v: 0.275,
        radius: 8.5,
        label: 'Şəki · Karvansaray',
        short: 'Şəki',
      },
      City_Shusha: {
        x: this._uToWorldX(0.155),
        z: this._vToWorldZ(0.445),
        u: 0.155,
        v: 0.445,
        radius: 8.5,
        label: 'Şuşa · Qala Şəhəri',
        short: 'Şuşa',
      },
    };

    // Rəsmdəki qırmızı nöqtəli karvan cığırları və daş körpülərdən keçən dəqiq Fast-Travel marşrutları (u, v)
    this.uvRoutes = {
      'City_Baku->City_Sheki': [
        [0.755, 0.485],
        [0.72, 0.512],
        [0.625, 0.435],
        [0.54, 0.358],
        [0.465, 0.275],
      ],
      'City_Baku->City_Shusha': [
        [0.755, 0.485],
        [0.72, 0.512],
        [0.585, 0.578],
        [0.435, 0.618],
        [0.296, 0.695], // Cənub daş körpüsü
        [0.215, 0.585],
        [0.155, 0.445],
      ],
      'City_Sheki->City_Shusha': [
        [0.465, 0.275],
        [0.395, 0.305],
        [0.286, 0.356], // Şimal daş körpüsü
        [0.215, 0.402],
        [0.155, 0.445],
      ],
    };

    this.cameraMode = 'map';
    this.waypoint = null;
    this.hoveredCityId = null;
    this.elapsed = 0;

    // Aktiv Sürətli Səfər (Fast-Travel) animasiya vəziyyəti
    this.fastTravel = null; // { fromCityId, toCityId, pathWorld, progress, duration, daysElapsed }

    this.mapRect = { x: 0, y: 0, w: 1280, h: 720 };

    this._onResize = () => this._handleResize();
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onContextMenu = (e) => e.preventDefault();
  }

  _uToWorldX(u) {
    return this.worldMinX + u * (this.worldMaxX - this.worldMinX);
  }

  _vToWorldZ(v) {
    return this.worldMinZ + v * (this.worldMaxZ - this.worldMinZ);
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
    const absheronPeninsula = 10.5 * Math.exp(-((z + 1) * (z + 1)) / 42);
    const wave = Math.sin(z * 0.12) * 1.8;
    return 25.0 + absheronPeninsula + wave;
  }

  getTerrainHeight(x, z) {
    return x > this._getCoastlineX(z) ? -1.0 : 1.0;
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
      x: this._uToWorldX(u),
      z: this._vToWorldZ(v),
    };
  }

  async _tryLoadCustomMapImage() {
    const candidates = [
      './images/ancient_azerbaijan_map.jpg',
      './images/ancient_azerbaijan_map.png',
      './images/ancient_azerbaijan_map.webp',
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
        // Digər formata keç
      }
    }
    return null;
  }

  async mount() {
    this.isMounted = false;
    this.fastTravel = null;
    this.container.innerHTML = '';

    this.gameManager.merchant.setMesh(null);
    this.gameManager.guard.setMesh(null);
    this.gameManager.thief.setMesh(null);
    this.gameManager.merchant.setControlMode('map');

    this.rootEl = document.createElement('div');
    this.rootEl.style.cssText =
      'position:relative;width:100%;height:100%;background:#0b0805;overflow:hidden;';

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:crosshair;';
    this.ctx = this.canvas.getContext('2d');
    this.rootEl.appendChild(this.canvas);
    this.container.appendChild(this.rootEl);

    this.customMapImg = await this._tryLoadCustomMapImage();
    if (!this.customMapImg) {
      this._buildFallbackParchment();
    }
    this._handleResize();

    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);

    this.isMounted = true;
  }

  _buildFallbackParchment() {
    const off = document.createElement('canvas');
    off.width = 1600;
    off.height = 900;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#c8ad7f';
    ctx.fillRect(0, 0, 1600, 900);
    ctx.fillStyle = '#214858';
    ctx.fillRect(1160, 0, 440, 900);
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

    const imgAspect =
      this.customMapImg && this.customMapImg.naturalHeight > 0
        ? this.customMapImg.naturalWidth / this.customMapImg.naturalHeight
        : 16 / 9;

    const padX = 14;
    const padTop = 62;
    const padBottom = 54;
    const availW = Math.max(320, w - padX * 2);
    const availH = Math.max(220, h - padTop - padBottom);

    let mw = availW;
    let mh = mw / imgAspect;
    if (mh > availH) {
      mh = availH;
      mw = mh * imgAspect;
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
      if (Math.hypot(sx - p.sx, sy - p.sy) <= 30) {
        return cityId;
      }
    }
    return null;
  }

  _getRouteWorldPoints(fromCityId, toCityId) {
    const directKey = `${fromCityId}->${toCityId}`;
    const revKey = `${toCityId}->${fromCityId}`;
    let uvList = null;

    if (this.uvRoutes[directKey]) {
      uvList = this.uvRoutes[directKey];
    } else if (this.uvRoutes[revKey]) {
      uvList = [...this.uvRoutes[revKey]].reverse();
    }

    if (uvList) {
      return uvList.map(([u, v]) => ({ x: this._uToWorldX(u), z: this._vToWorldZ(v) }));
    }

    const m = this.gameManager.merchant.position;
    const target = this.cityPositions[toCityId];
    return [
      { x: m.x, z: m.z },
      { x: target.x, z: target.z },
    ];
  }

  startFastTravelToCity(targetCityId) {
    if (this.fastTravel) return;
    const target = this.cityPositions[targetCityId];
    if (!target) return;

    const currentCityId = this.gameManager.tradeManager.currentCityId;
    if (currentCityId === targetCityId) {
      this.eventBus.emit('scene:enter_bazaar', targetCityId);
      return;
    }

    // Yaxın şəhərdən başlayırsa rəsmdəki körpülü marşrutu götür
    let nearestOriginId = currentCityId;
    if (!nearestOriginId) {
      let bestD = Infinity;
      for (const [cid, c] of Object.entries(this.cityPositions)) {
        const d = Math.hypot(this.gameManager.merchant.position.x - c.x, this.gameManager.merchant.position.z - c.z);
        if (d < 14 && d < bestD) {
          bestD = d;
          nearestOriginId = cid;
        }
      }
    }

    const pathWorld = nearestOriginId
      ? this._getRouteWorldPoints(nearestOriginId, targetCityId)
      : [
          { x: this.gameManager.merchant.position.x, z: this.gameManager.merchant.position.z },
          { x: target.x, z: target.z },
        ];

    // Məsafəyə uyğun gün hesabı (1.2 – 2.1 gün)
    let totalDist = 0;
    for (let i = 0; i < pathWorld.length - 1; i++) {
      totalDist += Math.hypot(pathWorld[i + 1].x - pathWorld[i].x, pathWorld[i + 1].z - pathWorld[i].z);
    }
    const daysElapsed = Math.max(1.0, Math.min(2.4, totalDist / 42));

    this.gameManager.merchant.clearWaypoint();
    this.fastTravel = {
      fromCityId: nearestOriginId,
      toCityId: targetCityId,
      pathWorld,
      progress: 0,
      duration: 1.85,
      daysElapsed,
    };

    this.eventBus.emit('ui:toast', {
      message: `Sürətli karvan səfəri başladı: ${target.label}...`,
      type: 'info',
    });
  }

  _samplePolyline(pts, t) {
    if (pts.length === 1) return pts[0];
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      segs.push(len);
      total += len;
    }
    if (total < 1e-4) return pts[pts.length - 1];

    let targetLen = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segs.length; i++) {
      if (targetLen <= segs[i] || i === segs.length - 1) {
        const localT = segs[i] > 1e-4 ? targetLen / segs[i] : 1;
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * localT,
          z: pts[i].z + (pts[i + 1].z - pts[i].z) * localT,
        };
      }
      targetLen -= segs[i];
    }
    return pts[pts.length - 1];
  }

  _handlePointerMove(e) {
    if (this.fastTravel) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hitCity = this._findCityAtScreen(sx, sy);
    this.hoveredCityId = hitCity;
    this.canvas.style.cursor = hitCity ? 'pointer' : 'crosshair';
  }

  _handlePointerDown(e) {
    if (e.button !== 0 || this.fastTravel || this.gameManager.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Şəhər möhürünə klikləndikdə: Sürətli Səfər (Fast-Travel) və ya 3D Karvansaraya giriş!
    const hitCityId = this._findCityAtScreen(sx, sy);
    if (hitCityId) {
      this.startFastTravelToCity(hitCityId);
      return;
    }

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

  _drawActiveRoute(ctx, merchant) {
    if (this.fastTravel) {
      const screenPts = this.fastTravel.pathWorld.map((p) => this._worldToScreen(p.x, p.z));
      ctx.save();
      ctx.strokeStyle = 'rgba(138, 28, 24, 0.9)';
      ctx.lineWidth = 3.2;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -this.elapsed * 32;
      ctx.beginPath();
      screenPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    const target = merchant.targetPos;
    if (!target) return;

    const from = this._worldToScreen(merchant.position.x, merchant.position.z);
    const to = this._worldToScreen(target.x, target.z);

    ctx.save();
    ctx.strokeStyle = '#7e2323';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -this.elapsed * 18;
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#7e2323';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(to.sx, to.sy, 7.5, 0, Math.PI * 2);
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

      if (isCurrent || isHovered) {
        ctx.strokeStyle = isCurrent ? 'rgba(156, 36, 32, 0.72)' : 'rgba(232, 188, 102, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 23, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Qırmızı surğuç möhürü (şəklin üzərindəki rəsmi örtməməsi üçün zərif ölçüdə)
      ctx.fillStyle = isCurrent ? '#8b2424' : isVisited ? '#612220' : '#2b1e14';
      ctx.strokeStyle = isHovered ? '#ffe09c' : '#dab060';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Səkkizguşəli ulduz naxışı
      ctx.strokeStyle = '#f5e4c6';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(-5.5, -5.5, 11, 11);
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-5.5, -5.5, 11, 11);
      ctx.restore();

      // Şəhər adı və Sürətli Səfər ipucu
      ctx.font = '700 14.5px "Cormorant Garamond", Georgia, serif';
      const actionHint = isCurrent ? '3D Karvansaray' : 'Sürətli Səfər';
      const labelText = `${c.label} · [${actionHint}]`;
      const tw = ctx.measureText(labelText).width;
      const boxW = tw + 18;
      const boxH = 23;

      ctx.fillStyle = 'rgba(18, 12, 8, 0.9)';
      ctx.strokeStyle = isCurrent ? '#e0b35c' : 'rgba(207, 163, 85, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-boxW / 2, -41, boxW, boxH);
      ctx.strokeRect(-boxW / 2, -41, boxW, boxH);

      ctx.fillStyle = '#f6e8ce';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, -29.5);

      ctx.restore();
    }
  }

  _drawCaravanToken(ctx) {
    const merchant = this.gameManager.merchant;
    const mp = this._worldToScreen(merchant.position.x, merchant.position.z);

    ctx.save();
    ctx.translate(mp.sx, mp.sy);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.arc(0, 3, 15.5, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
    grad.addColorStop(0, '#52381b');
    grad.addColorStop(1, '#1e1309');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#f0ca7d';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Karvan dəvəsi / atlı silueti
    ctx.strokeStyle = '#faecd2';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.quadraticCurveTo(-2, -6, 2.2, 1);
    ctx.lineTo(5, -4.2);
    ctx.lineTo(7, -3.2);
    ctx.moveTo(-4.8, 2);
    ctx.lineTo(-5.2, 6.8);
    ctx.moveTo(-1.2, 2);
    ctx.lineTo(-0.8, 6.8);
    ctx.moveTo(2.2, 1.4);
    ctx.lineTo(2.2, 6.8);
    ctx.stroke();

    ctx.font = '700 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = 'rgba(18, 12, 8, 0.92)';
    ctx.strokeStyle = '#cfa355';
    ctx.lineWidth = 1;
    ctx.fillRect(-30, 18, 60, 16);
    ctx.strokeRect(-30, 18, 60, 16);
    ctx.fillStyle = '#f5e6c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.fastTravel ? 'SƏFƏRDƏ...' : 'KARVANIN', 0, 26);

    ctx.restore();
  }

  update(dt) {
    if (!this.isMounted || !this.ctx || !this.canvas) return;
    this.elapsed += dt;

    // Sürətli Səfər (Fast-Travel) irəliləyişi
    if (this.fastTravel) {
      this.fastTravel.progress += dt / this.fastTravel.duration;
      const t = Math.min(1, this.fastTravel.progress);
      // Hamar sürətlənmə-yavaşlama (smoothstep)
      const eased = t * t * (3 - 2 * t);
      const pt = this._samplePolyline(this.fastTravel.pathWorld, eased);
      this.gameManager.merchant.position.x = pt.x;
      this.gameManager.merchant.position.z = pt.z;
      this.gameManager.guard.position.x = pt.x - 2.2;
      this.gameManager.guard.position.z = pt.z + 1.8;

      if (t >= 1) {
        const done = this.fastTravel;
        this.fastTravel = null;
        this.eventBus.emit('world:fast_travel_complete', {
          fromCityId: done.fromCityId,
          toCityId: done.toCityId,
          daysElapsed: done.daysElapsed,
        });
      }
    }

    const ctx = this.ctx;
    const w = this.rootEl.clientWidth || window.innerWidth;
    const h = this.rootEl.clientHeight || window.innerHeight;

    ctx.fillStyle = '#0b0805';
    ctx.fillRect(0, 0, w, h);

    const { x, y, w: mw, h: mh } = this.mapRect;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 32;
    ctx.fillStyle = '#1b120a';
    ctx.fillRect(x, y, mw, mh);
    ctx.restore();

    if (this.customMapImg) {
      ctx.drawImage(this.customMapImg, x, y, mw, mh);
    } else if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, x, y, mw, mh);
    }

    this._drawActiveRoute(ctx, this.gameManager.merchant);
    this._drawCitySeals(ctx);
    this._drawCaravanToken(ctx);
  }

  unmount() {
    this.isMounted = false;
    this.fastTravel = null;
    window.removeEventListener('resize', this._onResize);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
    this.container.innerHTML = '';
    this.rootEl = null;
    this.canvas = null;
    this.ctx = null;
  }
}
