import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CARPET_PALETTES = {
  karabakh: { bg: '#7b191d', border: '#d9a441', inner: '#1c2b4a', accent: '#f3dfb6' },
  quba: { bg: '#162749', border: '#e0b04b', inner: '#9b3822', accent: '#f5e7c8' },
  shirvan: { bg: '#164d3e', border: '#d9a844', inner: '#6e1d26', accent: '#f2e0ba' },
  sheki: { bg: '#1a5a66', border: '#e3b34c', inner: '#992632', accent: '#f7e6bf' },
  ganja: { bg: '#9c6b1c', border: '#75181c', inner: '#1f365c', accent: '#f5e4bc' },
};

/**
 * Prefabs/ModelLoader.js
 * - public/models/*.glb fayllarını GLTFLoader ilə yükləyir və keşləyir.
 * - Dinamik Azərbaycan Xalçası Rəng/Naxış Variant sistemi:
 *   public/textures/carpets/carpet_<region>.png varsa onu yükləyir,
 *   yoxdursa 5 bölgəyə (karabakh, quba, shirvan, sheki, ganja) uyğun prosedural xalça teksturası yaradır.
 */
export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.cache = new Map();
    this.pending = new Map();
    this.carpetTextureCache = new Map();
  }

  async loadOptionalGLB(modelName, scale = 1) {
    if (this.cache.has(modelName)) {
      const cached = this.cache.get(modelName);
      if (!cached) return null;
      const clone = cached.clone(true);
      clone.scale.setScalar(scale);
      return clone;
    }

    if (this.pending.has(modelName)) {
      const base = await this.pending.get(modelName);
      if (!base) return null;
      const clone = base.clone(true);
      clone.scale.setScalar(scale);
      return clone;
    }

    const loadPromise = this._fetchAndParse(modelName);
    this.pending.set(modelName, loadPromise);

    try {
      const base = await loadPromise;
      this.cache.set(modelName, base);
      if (!base) return null;
      const clone = base.clone(true);
      clone.scale.setScalar(scale);
      return clone;
    } finally {
      this.pending.delete(modelName);
    }
  }

  async preloadModels(modelNames = []) {
    await Promise.all(modelNames.map((name) => this.loadOptionalGLB(name, 1)));
  }

  /**
   * 5 fərqli Azərbaycan xalçası variantından (karabakh, quba, shirvan, sheki, ganja)
   * tekstura qaytarır (əvvəlcə public/textures/carpets/carpet_<region>.png yoxlayır).
   */
  async loadCarpetTexture(regionKey = 'karabakh') {
    const key = CARPET_PALETTES[regionKey] ? regionKey : 'karabakh';
    if (this.carpetTextureCache.has(key)) {
      return this.carpetTextureCache.get(key);
    }

    const url = `./textures/carpets/carpet_${key}.png`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        const tex = await this.textureLoader.loadAsync(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        this.carpetTextureCache.set(key, tex);
        return tex;
      }
    } catch {
      // Prosedural Azərbaycan xalça teksturasına keç
    }

    const proc = this._createProceduralCarpetTexture(key);
    this.carpetTextureCache.set(key, proc);
    return proc;
  }

  /**
   * İstənilən xalça/stend 3D modelinin xalça hissələrinə seçilmiş bölgə naxışını tətbiq edir.
   */
  async applyCarpetVariant(object3D, regionKey = 'karabakh') {
    if (!object3D) return object3D;
    const tex = await this.loadCarpetTexture(regionKey);
    const pal = CARPET_PALETTES[regionKey] || CARPET_PALETTES.karabakh;

    object3D.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const name = (node.name || '').toLowerCase();
      const matName = (node.material.name || '').toLowerCase();
      const isCarpetPart =
        name.includes('carpet') ||
        name.includes('rug') ||
        name.includes('cloth') ||
        matName.includes('carpet') ||
        matName.includes('rug');

      if (isCarpetPart) {
        const cloned = node.material.clone();
        cloned.map = tex;
        cloned.color = new THREE.Color('#ffffff');
        cloned.roughness = 0.85;
        cloned.needsUpdate = true;
        node.material = cloned;
      } else if (name.includes('banner') || name.includes('accent')) {
        const cloned = node.material.clone();
        cloned.color = new THREE.Color(pal.bg);
        node.material = cloned;
      }
    });
    return object3D;
  }

  _createProceduralCarpetTexture(regionKey) {
    const pal = CARPET_PALETTES[regionKey] || CARPET_PALETTES.karabakh;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, size, size);

    // Kənar haşiyələr
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 22;
    ctx.strokeRect(20, 20, size - 40, size - 40);

    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(46, 46, size - 92, size - 92);

    // Mərkəzi romb (göl) medalyonları
    const drawMedallion = (cx, cy, r) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.78, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.78, 0);
      ctx.closePath();
      ctx.fillStyle = pal.inner;
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.strokeStyle = pal.border;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -r * 0.45);
      ctx.lineTo(r * 0.35, 0);
      ctx.lineTo(0, r * 0.45);
      ctx.lineTo(-r * 0.35, 0);
      ctx.closePath();
      ctx.fillStyle = pal.accent;
      ctx.fill();
      ctx.restore();
    };

    drawMedallion(size / 2, size / 2, 125);
    drawMedallion(size / 2, 115, 48);
    drawMedallion(size / 2, size - 115, 48);
    drawMedallion(120, size / 2, 42);
    drawMedallion(size - 120, size / 2, 42);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  async _fetchAndParse(modelName) {
    const url = `./models/${modelName}.glb`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) return null;

      const gltf = await this.loader.loadAsync(url);
      const scene = gltf.scene;
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (obj.material) {
            obj.material.needsUpdate = true;
          }
        }
      });
      return scene;
    } catch {
      return null;
    }
  }
}
