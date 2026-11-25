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

    // Yeni İllüstrasiyalı Qədim Azərbaycan Xəritəsindəki 6 Abidənin Dəqiq Koordinatları:
    this.cityPositions = {
      City_Baku: {
        x: this._uToWorldX(0.835),
        z: this._vToWorldZ(0.46),
        u: 0.835,
        v: 0.46,
        radius: 7.2,
        label: 'Bakı · İçərişəhər',
        short: 'Bakı',
      },
      City_Shamakhi: {
        x: this._uToWorldX(0.572),
        z: this._vToWorldZ(0.395),
        u: 0.572,
        v: 0.395,
        radius: 7.2,
        label: 'Şamaxı · Şirvan Karvansarayı',
        short: 'Şamaxı',
      },
      City_Sheki: {
        x: this._uToWorldX(0.422),
        z: this._vToWorldZ(0.215),
        u: 0.422,
        v: 0.215,
        radius: 7.2,
        label: 'Şəki · Yuxarı Karvansaray',
        short: 'Şəki',
      },
      City_Ganja: {
        x: this._uToWorldX(0.212),
        z: this._vToWorldZ(0.375),
        u: 0.212,
        v: 0.375,
        radius: 7.2,
        label: 'Gəncə · Şah Abbas',
        short: 'Gəncə',
      },
      City_Shusha: {
        x: this._uToWorldX(0.262),
        z: this._vToWorldZ(0.58),
        u: 0.262,
        v: 0.58,
        radius: 7.2,
        label: 'Şuşa · Qala Şəhəri',
        short: 'Şuşa',
      },
      City_Lankaran: {
        x: this._uToWorldX(0.648),
        z: this._vToWorldZ(0.775),
        u: 0.648,
        v: 0.775,
        radius: 7.2,
        label: 'Lənkəran · Dairəvi Qala',
        short: 'Lənkəran',
      },
    };

    // Xəritədəki 4 Xüsusi Yol & Kiçik Missiya Nöqtəsi (2 Quldur Körpüsü + 2 Tarla/Bağ zonası)
    this.specialSpots = [
      {
        id: 'Bridge_North',
        kind: 'bridge',
        u: 0.395,
        v: 0.468,
        label: 'Şimal Daş Körpüsü',
        subtitle: '⚠ Quldur Pusqusu / Rüsum Hadisəsi',
      },
      {
        id: 'Bridge_South',
        kind: 'bridge',
        u: 0.54,
        v: 0.602,
        label: 'Cənub Daş Körpüsü',
        subtitle: '⚠ Gecə Qaçaq Keçidi',
      },
      {
        id: 'Field_North',
        kind: 'field',
        u: 0.415,
        v: 0.318,
        label: 'Şimal Yamac Tarlası',
        subtitle: '🌾 Kiçik Bağban Missiyası',
      },
      {
        id: 'Field_South',
        kind: 'field',
        u: 0.505,
        v: 0.665,
        label: 'Cənub Nar Zəmiləri',
        subtitle: '🌾 Məhsul & Karvan Dəstəyi',
      },
    ];
    this.hoveredSpotId = null;

    // Yeni xəritədəki qırmızı nöqtəli karvan yolları və iki daş körpüdən keçən dəqiq marşrutlar
    this.uvRoutes = {
      'City_Baku->City_Shamakhi': [
        [0.835, 0.46],
        [0.765, 0.485],
        [0.685, 0.435],
        [0.572, 0.395],
      ],
      'City_Shamakhi->City_Sheki': [
        [0.572, 0.395],
        [0.495, 0.312],
        [0.422, 0.215],
      ],
      'City_Sheki->City_Ganja': [
        [0.422, 0.215],
        [0.335, 0.295],
        [0.212, 0.375],
      ],
      'City_Ganja->City_Shusha': [
        [0.212, 0.375],
        [0.238, 0.478],
        [0.262, 0.58],
      ],
      'City_Shamakhi->City_Shusha': [
        [0.572, 0.395],
        [0.48, 0.428],
        [0.395, 0.468], // Şimal Daş Körpüsü
        [0.328, 0.528],
        [0.262, 0.58],
      ],
      'City_Baku->City_Shusha': [
        [0.835, 0.46],
        [0.765, 0.485],
        [0.665, 0.555],
        [0.54, 0.602], // Cənub Daş Körpüsü
        [0.405, 0.642],
        [0.262, 0.58],
      ],
      'City_Shusha->City_Lankaran': [
        [0.262, 0.58],
        [0.388, 0.642],
        [0.505, 0.712],
        [0.648, 0.775],
      ],
      'City_Baku->City_Lankaran': [
        [0.835, 0.46],
        [0.755, 0.515],
        [0.655, 0.568],
        [0.54, 0.602], // Cənub Daş Körpüsü
        [0.585, 0.695],
        [0.648, 0.775],
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

  _findSpecialSpotAtScreen(sx, sy) {
    for (const spot of this.specialSpots || []) {
      const p = this._worldToScreen(this._uToWorldX(spot.u), this._vToWorldZ(spot.v));
      if (Math.hypot(sx - p.sx, sy - p.sy) <= 22) {
        return spot;
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
    const hitSpot = hitCity ? null : this._findSpecialSpotAtScreen(sx, sy);
    this.hoveredCityId = hitCity;
    this.hoveredSpotId = hitSpot ? hitSpot.id : null;
    this.canvas.style.cursor = hitCity || hitSpot ? 'pointer' : 'crosshair';
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

    // Körpü quldur pusqusu və ya Tarla kiçik missiya nöqtəsinə klikləndikdə hadisə başlat!
    const hitSpot = this._findSpecialSpotAtScreen(sx, sy);
    if (hitSpot) {
      this.eventBus.emit('ui:toast', {
        message: `${hitSpot.label}: ${hitSpot.subtitle}`,
        type: hitSpot.kind === 'bridge' ? 'warn' : 'info',
      });
      this.eventBus.emit('world:trigger_event_now', { spotId: hitSpot.id, spotKind: hitSpot.kind });
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
    const currentCityId = this.gameManager.tradeManager.currentCityId;
    const visited = this.gameManager.tradeManager.visitedCityIds;

    // Bütün əsas karvan yollarını vəziyyətinə görə fərqli xətt forması ilə çək
    for (const [key, uvList] of Object.entries(this.uvRoutes)) {
      const [aId, bId] = key.split('->');
      const isHoveredEdge =
        this.hoveredCityId &&
        currentCityId &&
        ((aId === currentCityId && bId === this.hoveredCityId) ||
          (bId === currentCityId && aId === this.hoveredCityId));
      const isBothKnown = visited.has(aId) && visited.has(bId);
      const pts = uvList.map(([u, v]) => this._worldToScreen(this._uToWorldX(u), this._vToWorldZ(v)));

      ctx.save();
      if (isHoveredEdge) {
        ctx.strokeStyle = '#f3cf70';
        ctx.lineWidth = 3.6;
        ctx.setLineDash([]);
      } else if (isBothKnown) {
        ctx.strokeStyle = 'rgba(184, 134, 52, 0.55)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([5, 5]);
      } else {
        // Bilinməyən yol — natamam cızıq
        ctx.strokeStyle = 'rgba(120, 96, 66, 0.42)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([2, 6]);
      }
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
      ctx.stroke();
      ctx.setLineDash([]);

      // Təhlükəli dağ/körpü keçidi xəbərdarlıq nişanı
      if (pts.length >= 3) {
        const mid = pts[Math.floor(pts.length / 2)];
        ctx.fillStyle = isHoveredEdge ? '#c97a2b' : 'rgba(130, 82, 34, 0.75)';
        ctx.beginPath();
        ctx.moveTo(mid.sx, mid.sy - 7);
        ctx.lineTo(mid.sx + 6, mid.sy + 4);
        ctx.lineTo(mid.sx - 6, mid.sy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff5dc';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', mid.sx, mid.sy);
      }
      ctx.restore();
    }

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

      // Şəhər adı: xəritəni örtməmək üçün normalda yığcam ad, hover/aktiv olduqda tam etiket
      ctx.font = '700 13.5px "Cormorant Garamond", Georgia, serif';
      const actionHint = isCurrent ? 'Karvansaray' : 'Səfər';
      const labelText = isHovered || isCurrent ? `${c.short} · [${actionHint}]` : c.short;
      const tw = ctx.measureText(labelText).width;
      const boxW = tw + 16;
      const boxH = 21;

      ctx.fillStyle = 'rgba(18, 12, 8, 0.88)';
      ctx.strokeStyle = isCurrent ? '#e0b35c' : 'rgba(207, 163, 85, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-boxW / 2, -39, boxW, boxH);
      ctx.strokeRect(-boxW / 2, -39, boxW, boxH);

      ctx.fillStyle = '#f6e8ce';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, -28.5);

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
    this._drawSpecialSpots(ctx);
    this._drawCaravanToken(ctx);
    this._drawHoverRouteAndCityCard(ctx);
  }

  _drawSpecialSpots(ctx) {
    for (const spot of this.specialSpots || []) {
      const p = this._worldToScreen(this._uToWorldX(spot.u), this._vToWorldZ(spot.v));
      const isHovered = this.hoveredSpotId === spot.id;
      const isBridge = spot.kind === 'bridge';

      ctx.save();
      ctx.translate(p.sx, p.sy);

      const pulse = 1 + Math.sin(this.elapsed * 3.0) * 0.08;
      ctx.fillStyle = isBridge ? 'rgba(138, 34, 28, 0.9)' : 'rgba(34, 88, 46, 0.9)';
      ctx.strokeStyle = isHovered ? '#ffe5a3' : isBridge ? '#e2965c' : '#96d488';
      ctx.lineWidth = isHovered ? 2.2 : 1.5;

      // Romb (qədim xəritə nişanı)
      ctx.beginPath();
      const r = (isHovered ? 12 : 9.5) * pulse;
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff5df';
      ctx.font = '700 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBridge ? '⚔' : '✦', 0, 0.5);

      if (isHovered) {
        ctx.font = '700 13px "Cormorant Garamond", Georgia, serif';
        const txt = `${spot.label} · ${spot.subtitle}`;
        const tw = ctx.measureText(txt).width;
        const bw = tw + 16;
        ctx.fillStyle = 'rgba(18, 12, 8, 0.94)';
        ctx.strokeStyle = '#cfa355';
        ctx.lineWidth = 1.1;
        ctx.fillRect(-bw / 2, -36, bw, 22);
        ctx.strokeRect(-bw / 2, -36, bw, 22);
        ctx.fillStyle = '#f8e9ca';
        ctx.fillText(txt, 0, -25);
      }

      ctx.restore();
    }
  }

  _drawHoverRouteAndCityCard(ctx) {
    if (!this.hoveredCityId || this.fastTravel) return;
    const tm = this.gameManager.tradeManager;
    const city = this.data.getCityById(this.hoveredCityId);
    const posInfo = this.cityPositions[this.hoveredCityId];
    if (!city || !posInfo) return;

    const currentCityId = tm.currentCityId;
    const isCurrent = currentCityId === this.hoveredCityId;
    const visited = tm.visitedCityIds.has(this.hoveredCityId);
    const intel = tm.cityPriceIntel?.[this.hoveredCityId];
    const ageDays = intel ? Math.max(0, tm.gameDay - intel.day) : null;

    // Aktiv sifarişlər
    const questsForCity = (tm.activeQuests || []).filter((q) => q.target_city === this.hoveredCityId);

    // Sağ üst küncdə Səfər və Şəhər Məlumat Kartı
    const cardW = 290;
    const cardH = isCurrent ? 185 : 235;
    const cx = Math.min((this.rootEl.clientWidth || 1200) - cardW - 18, this.mapRect.x + this.mapRect.w - cardW - 12);
    const cy = this.mapRect.y + 12;

    ctx.save();
    ctx.fillStyle = 'rgba(22, 16, 10, 0.94)';
    ctx.strokeStyle = '#cfa355';
    ctx.lineWidth = 1.6;
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeRect(cx, cy, cardW, cardH);

    ctx.fillStyle = '#f3cf70';
    ctx.font = '700 16px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(isCurrent ? `${city.short_name} (Hazırki Şəhər)` : `${city.short_name} · Səfər Planı`, cx + 14, cy + 12);

    ctx.fillStyle = '#e8dac0';
    ctx.font = '12.5px "Spectral", Georgia, serif';
    let ly = cy + 38;
    const line = (txt, color = '#e8dac0') => {
      ctx.fillStyle = color;
      ctx.fillText(txt, cx + 14, ly);
      ly += 19;
    };

    line(`Yerli nüfuz: ${tm.charisma} · Aktiv sifariş: ${questsForCity.length}`);
    if (!visited) {
      line('Qiymət məlumatı: Naməlum (səfər edin)', '#d4a442');
    } else if (ageDays === 0) {
      line('Qiymət məlumatı: Bugün yenilənib', '#7ec97e');
    } else {
      line(`Qiymət məlumatı: ${ageDays ?? '?'} gün əvvəl`, '#d4a442');
    }

    const topGoods = city.goods?.slice(0, 2).map((g) => g.name).join(', ') || '—';
    line(`Əsas mallar: ${topGoods}`);

    if (!isCurrent) {
      const pts = currentCityId ? this._getRouteWorldPoints(currentCityId, this.hoveredCityId) : [];
      let dist = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        dist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      }
      const estDays = Math.max(1.0, Math.min(2.4, dist / 42)).toFixed(1);
      const minCost = Math.round(Number(estDays) * 8);
      const maxCost = minCost + 6;

      ly += 4;
      line(`Təxmini müddət: ${estDays} gün`, '#f5e6c8');
      line(`Yol xərci: ${minCost}–${maxCost} qızıl · Səth: Torpaq/Daş`);
      line(`Təhlükə: Orta · Dayanacaq: 1 karvansaray`);

      // Təzəlik xəbərdarlığı
      const perishableRisk = Object.entries(tm.inventoryBatches || {}).some(([, arr]) =>
        arr.some((b) => b.daysLeft !== null && b.daysLeft <= Number(estDays) + 0.5)
      );
      if (perishableRisk) {
        line('⚠ Tez xarab olan yük yolda tükənə bilər!', '#e06c5c');
      }
    }
    ctx.restore();
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
