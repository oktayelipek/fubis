import * as THREE from 'three';

/**
 * Power-Up System
 * Types: SHIELD (invincibility), DOUBLE (2x score), SHATTER (destroy obstacles on touch)
 * Spawns periodically on the track, collected on player collision.
 */

export const POWERUP_TYPES = {
  SHIELD: 'SHIELD',     // Invincibility — hasarsızlık
  DOUBLE: 'DOUBLE',     // 2x score — 2x puan
  SHATTER: 'SHATTER',   // Destroy on touch — paramparça etme
};

const POWERUP_CONFIG = {
  [POWERUP_TYPES.SHIELD]: {
    color: 0x00ffff,
    emissive: 0x006688,
    duration: 5,
    label: '🛡️ SHIELD',
  },
  [POWERUP_TYPES.DOUBLE]: {
    color: 0xffcc00,
    emissive: 0x886600,
    duration: 8,
    label: '⚡ 2X SCORE',
  },
  [POWERUP_TYPES.SHATTER]: {
    color: 0xff3300,
    emissive: 0x881100,
    duration: 6,
    label: '💥 SHATTER',
  },
};

class PowerUp {
  constructor(scene) {
    // Diamond-shaped (rotated cube)
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
      shininess: 120,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    this.active = false;
    this.type = null;

    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.7, 0.05, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.mesh.add(this.ring);

    this.boundingBox = new THREE.Box3();
    this.baseY = 1.2;
    scene.add(this.mesh);
  }

  activate(x, z, speed, type) {
    const config = POWERUP_CONFIG[type];
    this.type = type;
    this.mesh.position.set(x, this.baseY, z);
    this.mesh.visible = true;
    this.active = true;
    this.speed = speed;

    // Apply type color
    this.mesh.material.color.setHex(config.color);
    this.mesh.material.emissive.setHex(config.emissive);
    this.ring.material.color.setHex(config.color);
  }

  deactivate() {
    this.mesh.visible = false;
    this.active = false;
    this.type = null;
  }

  update(dt) {
    if (!this.active) return;
    this.mesh.position.z += this.speed * dt;

    // Float animation
    this.mesh.position.y = this.baseY + Math.sin(Date.now() * 0.004) * 0.3;

    // Spin
    this.mesh.rotation.y += 3 * dt;
    this.ring.rotation.x += 2 * dt;
    this.ring.rotation.z += 1.5 * dt;

    // Pulse ring
    const pulse = 0.3 + Math.sin(Date.now() * 0.006) * 0.15;
    this.ring.material.opacity = pulse;

    this.boundingBox.setFromObject(this.mesh);
    this.boundingBox.expandByScalar(0.2); // slightly generous pickup
  }
}

export class PowerUpManager {
  constructor(scene, poolSize = 10) {
    this.scene = scene;
    this.pool = [];
    this.spawnTimer = 0;
    this.spawnInterval = 8; // seconds between spawn attempts
    this.spawnZ = -80;
    this.despawnZ = 10;
    this.trackWidth = 10;

    // Active power-up state
    this.activePowerUp = null;  // { type, timeLeft }

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new PowerUp(scene));
    }
  }

  _getInactive() {
    return this.pool.find(p => !p.active) || null;
  }

  _randomType() {
    const types = Object.values(POWERUP_TYPES);
    return types[Math.floor(Math.random() * types.length)];
  }

  update(dt, score) {
    const difficulty = Math.min(score / 50, 3);
    const currentSpeed = 15 + difficulty * 5;

    // Spawn timer
    this.spawnTimer += dt;
    const interval = Math.max(5, this.spawnInterval - difficulty * 0.5);
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      if (Math.random() < 0.6) { // 60% chance to spawn
        const pu = this._getInactive();
        if (pu) {
          const halfTrack = this.trackWidth / 2 - 1;
          const x = (Math.random() * 2 - 1) * halfTrack;
          pu.activate(x, this.spawnZ, currentSpeed, this._randomType());
        }
      }
    }

    // Update pool
    for (const pu of this.pool) {
      if (!pu.active) continue;
      pu.update(dt);
      if (pu.mesh.position.z > this.despawnZ) {
        pu.deactivate();
      }
    }

    // Tick active power-up duration
    if (this.activePowerUp) {
      this.activePowerUp.timeLeft -= dt;
      if (this.activePowerUp.timeLeft <= 0) {
        this.activePowerUp = null;
      }
    }
  }

  checkCollision(playerBBox) {
    for (const pu of this.pool) {
      if (!pu.active) continue;
      if (playerBBox.intersectsBox(pu.boundingBox)) {
        const type = pu.type;
        const config = POWERUP_CONFIG[type];
        pu.deactivate();
        // Activate power-up
        this.activePowerUp = {
          type,
          timeLeft: config.duration,
          label: config.label,
          color: config.color,
        };
        return { type, color: config.color, position: pu.mesh.position.clone() };
      }
    }
    return null;
  }

  hasShield() {
    return this.activePowerUp?.type === POWERUP_TYPES.SHIELD;
  }

  hasDouble() {
    return this.activePowerUp?.type === POWERUP_TYPES.DOUBLE;
  }

  hasShatter() {
    return this.activePowerUp?.type === POWERUP_TYPES.SHATTER;
  }

  getActiveInfo() {
    return this.activePowerUp;
  }

  reset() {
    for (const pu of this.pool) {
      pu.deactivate();
    }
    this.activePowerUp = null;
    this.spawnTimer = 0;
  }
}
