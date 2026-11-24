import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Prefabs/ModelLoader.js
 * public/models/*.glb fayllarını GLTFLoader ilə yükləyir və keşləyir;
 * fayl tapılmasa null qaytarır ki, səhnə Three.js fallback modelləri ilə işləsin.
 */
export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.pending = new Map();
  }

  /**
   * İstəyə bağlı .glb modelini yükləyir və verilmiş miqyasla klonlayır.
   * @param {string} modelName - Fayl adı (.glb uzantısız)
   * @param {number} scale - Miqyas əmsalı
   * @returns {Promise<import('three').Group | null>}
   */
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
