/**
 * Merchant (Tacir) — Oyunçunun idarə etdiyi karvan.
 * İki rejimi dəstəkləyir:
 * - 'map' (Qədim 3D Xəritə): WASD/Oxlar şimal-cənub-şərq-qərb hərəkəti + kliklə GTA GPS marşrutu
 * - 'gta' (GTA Yaxın 3D Sürüş): W/S irəli-geri, A/D sükan döndərmə + kliklə GPS avtomatik gediş
 */
export class Merchant {
  constructor(eventBus, tradeManager) {
    this.tag = 'Merchant';
    this.eventBus = eventBus;
    this.tradeManager = tradeManager;

    this.position = { x: 26, y: 0, z: 6 };
    this.yaw = -Math.PI * 0.65;
    this.baseSpeed = 14.5;
    this.turnSpeed = 2.4;
    this.isMoving = false;
    this.currentSpeed = 0;
    this.distanceTraveled = 0;

    this.controlMode = 'map'; // 'map' | 'gta'
    this.targetPos = null;
    this.keys = new Set();
    this.mesh = null;

    this.bounds = { minX: -58, maxX: 44, minZ: -38, maxZ: 38 };

    this._onKeyDown = (e) => {
      const code = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        this.keys.add(code);
        this.targetPos = null;
      }
    };

    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
  }

  setControlMode(mode) {
    this.controlMode = mode === 'gta' ? 'gta' : 'map';
  }

  attachControls() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detachControls() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.keys.clear();
  }

  setMesh(mesh) {
    this.mesh = mesh;
    if (this.mesh) {
      this.mesh.name = 'Merchant';
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      this.mesh.rotation.y = this.yaw;
    }
  }

  setPosition(x, z, getTerrainHeight) {
    this.position.x = x;
    this.position.z = z;
    this.position.y = getTerrainHeight ? getTerrainHeight(x, z) : 0;
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }
  }

  setWaypoint(x, z) {
    this.targetPos = {
      x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x)),
      z: Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, z)),
    };
  }

  clearWaypoint() {
    this.targetPos = null;
  }

  update(dt, getTerrainHeight, cityPositions) {
    const maxSpeed = this.baseSpeed * this.tradeManager.getSpeedMultiplier();
    let dx = 0;
    let dz = 0;
    let movedBySteer = false;

    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    if (this.controlMode === 'gta' && (up || down || left || right)) {
      // GTA məntiqi: A/D döndərir, W/S irəli-geri aparır
      if (left) this.yaw += this.turnSpeed * dt;
      if (right) this.yaw -= this.turnSpeed * dt;

      const throttle = (up ? 1 : 0) - (down ? 0.6 : 0);
      if (Math.abs(throttle) > 0.01) {
        dx = Math.sin(this.yaw) * throttle;
        dz = Math.cos(this.yaw) * throttle;
        movedBySteer = true;
      }
    } else {
      if (up) dz -= 1;
      if (down) dz += 1;
      if (left) dx -= 1;
      if (right) dx += 1;
    }

    // Kliklənmiş GTA GPS marşrutu ilə avtomatik hərəkət
    if (!movedBySteer && dx === 0 && dz === 0 && this.targetPos) {
      const tx = this.targetPos.x - this.position.x;
      const tz = this.targetPos.z - this.position.z;
      const dist = Math.hypot(tx, tz);
      if (dist < 1.1) {
        this.targetPos = null;
      } else {
        dx = tx / dist;
        dz = tz / dist;
      }
    }

    const len = Math.hypot(dx, dz);
    this.isMoving = len > 0.01;
    this.currentSpeed = 0;

    if (this.isMoving) {
      const normX = dx / len;
      const normZ = dz / len;
      const stepSpeed = movedBySteer ? maxSpeed * Math.min(1, len) : maxSpeed;
      const step = stepSpeed * dt;

      const candX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x + normX * step));
      const candZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.position.z + normZ * step));
      const candH = getTerrainHeight ? getTerrainHeight(candX, candZ) : 0.5;

      // Xəzər dənizinə girməmək üçün su sərhədini yoxla
      if (candH > 0.08) {
        const moved = Math.hypot(candX - this.position.x, candZ - this.position.z);
        this.distanceTraveled += moved;
        this.currentSpeed = moved / Math.max(dt, 0.001);
        this.position.x = candX;
        this.position.z = candZ;
      } else {
        this.targetPos = null;
      }

      if (!movedBySteer) {
        const targetYaw = Math.atan2(normX, normZ);
        let diff = targetYaw - this.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.yaw += diff * Math.min(1, dt * 8.5);
      }
    }

    this.position.y = getTerrainHeight ? getTerrainHeight(this.position.x, this.position.z) : 0;

    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      this.mesh.rotation.y = this.yaw;
      if (this.isMoving) {
        this.mesh.position.y += Math.abs(Math.sin(this.distanceTraveled * 1.6)) * 0.14;
      }
    }

    // Şəhər trigger yoxlaması
    let insideCityId = null;
    if (cityPositions) {
      for (const [cityId, info] of Object.entries(cityPositions)) {
        const d = Math.hypot(this.position.x - info.x, this.position.z - info.z);
        if (d <= (info.radius || 8.5)) {
          insideCityId = cityId;
          break;
        }
      }
    }
    this.tradeManager.setCurrentCity(insideCityId);
  }
}
