/**
 * Thief (AI Oğru / Quldur) — Yolda təsadüfi pusqu qurur,
 * Qoruyucu qarşısını kəsməsə Tacirdən mal və ya qızıl oğurlayıb qaçır.
 */
export class Thief {
  constructor(merchant, tradeManager, eventBus) {
    this.tag = 'Thief';
    this.merchant = merchant;
    this.tradeManager = tradeManager;
    this.eventBus = eventBus;

    this.position = { x: 0, y: -20, z: 0 };
    this.yaw = 0;
    this.mesh = null;

    this.isActive = false;
    this.state = 'idle'; // 'idle' | 'chasing' | 'fleeing'
    this.chaseSpeed = 13.8;
    this.fleeSpeed = 22;
    this.stealRadius = 2.3;

    this.spawnCooldown = 16; // İlk pusqu ~16 saniyə yol getdikdən sonra
    this.fleeTarget = { x: 0, z: 0 };
    this.fleeTimer = 0;
  }

  setMesh(mesh) {
    this.mesh = mesh;
    if (this.mesh) {
      this.mesh.name = 'Thief';
      this.mesh.visible = false;
    }
  }

  spawnAmbush(getTerrainHeight) {
    // Tacirin qarşısında və ya yan tərəfində, amma Qoruyucunun dərhal çatmaması üçün müəyyən məsafədə çıxır
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 6;
    const sx = Math.max(-55, Math.min(50, this.merchant.position.x + Math.cos(angle) * dist));
    const sz = Math.max(-35, Math.min(35, this.merchant.position.z + Math.sin(angle) * dist));

    this.position.x = sx;
    this.position.z = sz;
    this.position.y = getTerrainHeight ? getTerrainHeight(sx, sz) : 0;

    this.isActive = true;
    this.state = 'chasing';
    if (this.mesh) {
      this.mesh.visible = true;
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }

    this.eventBus.emit('audio:sfx', 'alert');
    this.eventBus.emit('ui:toast', {
      message: 'Diqqət! Yolda quldur pusqusu! Qoruyucu müdaxilə edir...',
      type: 'danger',
    });
    this.eventBus.emit('thief:spawned', { position: { ...this.position } });
  }

  repel(fromPos) {
    if (!this.isActive) return;
    const dx = this.position.x - fromPos.x;
    const dz = this.position.z - fromPos.z;
    const len = Math.hypot(dx, dz) || 1;

    this.state = 'fleeing';
    this.fleeTimer = 3.2;
    this.fleeTarget = {
      x: this.position.x + (dx / len) * 40,
      z: this.position.z + (dz / len) * 40,
    };
  }

  despawn() {
    this.isActive = false;
    this.state = 'idle';
    this.spawnCooldown = 22 + Math.random() * 14;
    if (this.mesh) {
      this.mesh.visible = false;
    }
  }

  update(dt, getTerrainHeight) {
    // Şəhər içi təhlükəsiz zonadır — oğru qaçır
    if (this.tradeManager.currentCityId) {
      if (this.isActive && this.state === 'chasing') {
        this.repel(this.merchant.position);
      }
      if (!this.isActive) return;
    }

    if (!this.isActive) {
      if (this.merchant.isMoving && !this.tradeManager.currentCityId) {
        this.spawnCooldown -= dt;
        if (this.spawnCooldown <= 0) {
          this.spawnAmbush(getTerrainHeight);
        }
      }
      return;
    }

    if (this.state === 'chasing') {
      const dx = this.merchant.position.x - this.position.x;
      const dz = this.merchant.position.z - this.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= this.stealRadius) {
        this.tradeManager.stealFromCaravan();
        this.repel(this.merchant.position);
      } else if (dist > 45) {
        // Çox uzaqlaşdısa itir
        this.despawn();
        return;
      } else {
        const step = this.chaseSpeed * dt;
        this.position.x += (dx / dist) * step;
        this.position.z += (dz / dist) * step;
        this.yaw = Math.atan2(dx, dz);
      }
    } else if (this.state === 'fleeing') {
      this.fleeTimer -= dt;
      const dx = this.fleeTarget.x - this.position.x;
      const dz = this.fleeTarget.z - this.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const step = this.fleeSpeed * dt;
      this.position.x += (dx / dist) * step;
      this.position.z += (dz / dist) * step;
      this.yaw = Math.atan2(dx, dz);

      if (this.fleeTimer <= 0) {
        this.despawn();
        return;
      }
    }

    this.position.y = getTerrainHeight ? getTerrainHeight(this.position.x, this.position.z) : 0;
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      this.mesh.rotation.y = this.yaw;
    }
  }
}
