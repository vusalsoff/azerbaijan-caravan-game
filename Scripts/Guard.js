/**
 * Guard (AI Qoruyucu) — Tacirin yanında hərəkət edir,
 * yaxınlaşan Oğruları aşkarlayıb avtomatik qarşısını kəsir.
 */
export class Guard {
  constructor(merchant, tradeManager, eventBus) {
    this.tag = 'Guard';
    this.merchant = merchant;
    this.tradeManager = tradeManager;
    this.eventBus = eventBus;

    this.position = { x: merchant.position.x - 3.2, y: 0, z: merchant.position.z + 2.4 };
    this.yaw = 0;
    this.mesh = null;

    this.followSpeed = 15.5;
    this.interceptSpeed = 20.5;
    this.baseDetectRadius = 16;
    this.interceptRadius = 2.7;
    this.state = 'following'; // 'following' | 'intercepting'
  }

  setMesh(mesh) {
    this.mesh = mesh;
    if (this.mesh) {
      this.mesh.name = 'Guard';
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }
  }

  update(dt, getTerrainHeight, thief) {
    const detectRadius = this.tradeManager.getGuardBoostActive()
      ? this.baseDetectRadius + 7
      : this.baseDetectRadius;

    let targetX = this.merchant.position.x - Math.cos(this.merchant.yaw) * 3.0 - Math.sin(this.merchant.yaw) * 1.8;
    let targetZ = this.merchant.position.z + Math.sin(this.merchant.yaw) * 3.0 - Math.cos(this.merchant.yaw) * 1.8;
    let moveSpeed = this.followSpeed * this.tradeManager.getSpeedMultiplier();

    // Oğru aktivdirsə və qovalayırsa, Qoruyucu müdaxilə edir
    if (thief && thief.isActive && thief.state === 'chasing') {
      const distToThief = Math.hypot(
        thief.position.x - this.position.x,
        thief.position.z - this.position.z
      );
      const thiefDistToMerchant = Math.hypot(
        thief.position.x - this.merchant.position.x,
        thief.position.z - this.merchant.position.z
      );

      if (distToThief <= detectRadius || thiefDistToMerchant <= detectRadius) {
        this.state = 'intercepting';
        targetX = thief.position.x;
        targetZ = thief.position.z;
        moveSpeed = this.interceptSpeed;

        if (distToThief <= this.interceptRadius) {
          thief.repel(this.position);
          this.tradeManager.recordThiefRepelled();
          this.eventBus.emit('guard:repelled_thief', { position: { ...this.position } });
          this.state = 'following';
        }
      } else {
        this.state = 'following';
      }
    } else {
      this.state = 'following';
    }

    const dx = targetX - this.position.x;
    const dz = targetZ - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.35) {
      const step = Math.min(dist, moveSpeed * dt);
      this.position.x += (dx / dist) * step;
      this.position.z += (dz / dist) * step;
      this.yaw = Math.atan2(dx, dz);
    }

    this.position.y = getTerrainHeight ? getTerrainHeight(this.position.x, this.position.z) : 0;

    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      this.mesh.rotation.y = this.yaw;
      if (dist > 0.5) {
        this.mesh.position.y += Math.abs(Math.sin(performance.now() * 0.01)) * 0.14;
      }
    }
  }
}
