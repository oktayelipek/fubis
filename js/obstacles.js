import * as THREE from 'three';

/**
 * Obstacle Pool System
 * Object pooling pattern to avoid GC spikes.
 * Supports normal and explosive obstacle types.
 */

const OBSTACLE_COLORS = [
  0xff0055, // Hot pink
  0xff6600, // Orange
  0xffcc00, // Gold
  0x00ff88, // Mint
  0x0088ff, // Blue
  0xff3366, // Rose
];

const EXPLOSIVE_COLOR = 0xff0000;

class Obstacle {
  constructor(scene) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 0.4,
      shininess: 80,
      transparent: true,
      opacity: 0.85,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    this.active = false;
    this.speed = 0;
    this.isExplosive = false;
    this.rotSpeed = new THREE.Vector3();
    this.boundingBox = new THREE.Box3();

    // Explosive warning indicator (pulsing inner glow)
    const warningGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const warningMat = new THREE.MeshBasicMaterial({
      color: EXPLOSIVE_COLOR,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    this.warningMesh = new THREE.Mesh(warningGeo, warningMat);
    this.mesh.add(this.warningMesh);

    scene.add(this.mesh);
  }

  activate(x, z, speed, explosive = false) {
    this.mesh.position.set(x, 0.6 + Math.random() * 1.5, z);
    this.mesh.visible = true;
    this.active = true;
    this.speed = speed;
    this.isExplosive = explosive;

    if (explosive) {
      // Explosive: red/orange pulsing cube
      this.mesh.material.color.setHex(EXPLOSIVE_COLOR);
      this.mesh.material.emissive.setHex(0xcc3300);
      this.mesh.material.emissiveIntensity = 0.8;
      this.warningMesh.material.opacity = 0.3;
      const scale = 0.9 + Math.random() * 0.3;
      this.mesh.scale.set(scale, scale, scale);
    } else {
      // Normal: random color
      const colorIndex = Math.floor(Math.random() * OBSTACLE_COLORS.length);
      this.mesh.material.color.setHex(OBSTACLE_COLORS[colorIndex]);
      this.mesh.material.emissive.setHex(OBSTACLE_COLORS[colorIndex]);
      this.mesh.material.emissiveIntensity = 0.4;
      this.warningMesh.material.opacity = 0;
      const scale = 0.7 + Math.random() * 0.7;
      this.mesh.scale.set(scale, scale, scale);
    }

    // Randomize rotation speed
    this.rotSpeed.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
  }

  deactivate() {
    this.mesh.visible = false;
    this.active = false;
    this.isExplosive = false;
  }

  update(dt) {
    if (!this.active) return;
    this.mesh.position.z += this.speed * dt;
    this.mesh.rotation.x += this.rotSpeed.x * dt;
    this.mesh.rotation.y += this.rotSpeed.y * dt;
    this.mesh.rotation.z += this.rotSpeed.z * dt;

    // Explosive pulsing
    if (this.isExplosive) {
      const pulse = 0.2 + Math.sin(Date.now() * 0.01) * 0.15;
      this.warningMesh.material.opacity = pulse;
      this.mesh.material.emissiveIntensity = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
    }

    this.boundingBox.setFromObject(this.mesh);
  }

  getColor() {
    return this.mesh.material.color.getHex();
  }
}

export class ObstacleManager {
  constructor(scene, poolSize = 40) {
    this.scene = scene;
    this.pool = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.baseSpeed = 15;
    this.spawnZ = -80;
    this.despawnZ = 10;
    this.trackWidth = 10;

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Obstacle(scene));
    }
  }

  _getInactive() {
    return this.pool.find(o => !o.active) || null;
  }

  _spawnObstacle(speed, forceExplosive = false) {
    const obstacle = this._getInactive();
    if (!obstacle) return;

    const halfTrack = this.trackWidth / 2 - 1;
    const x = (Math.random() * 2 - 1) * halfTrack;

    // 15% chance of explosive, or forced
    const explosive = forceExplosive || Math.random() < 0.15;
    obstacle.activate(x, this.spawnZ, speed, explosive);
  }

  update(dt, score) {
    const difficulty = Math.min(score / 50, 3);
    const currentSpeed = this.baseSpeed + difficulty * 5;
    const currentInterval = Math.max(0.3, this.spawnInterval - difficulty * 0.25);

    this.spawnTimer += dt;
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this._spawnObstacle(currentSpeed);

      if (difficulty > 1 && Math.random() < 0.3) {
        this._spawnObstacle(currentSpeed);
      }
      if (difficulty > 2.5 && Math.random() < 0.2) {
        this._spawnObstacle(currentSpeed);
      }
    }

    for (const obstacle of this.pool) {
      if (!obstacle.active) continue;
      obstacle.update(dt);
      if (obstacle.mesh.position.z > this.despawnZ) {
        obstacle.deactivate();
      }
    }
  }

  /**
   * Check collision with player. Returns collision info or null.
   * { obstacle, isExplosive, position, color }
   */
  checkCollision(playerBBox) {
    for (const obstacle of this.pool) {
      if (!obstacle.active) continue;
      if (playerBBox.intersectsBox(obstacle.boundingBox)) {
        return {
          obstacle,
          isExplosive: obstacle.isExplosive,
          position: obstacle.mesh.position.clone(),
          color: obstacle.getColor(),
        };
      }
    }
    return null;
  }

  /**
   * Destroy an obstacle (used by SHATTER power-up)
   */
  destroyObstacle(obstacle) {
    obstacle.deactivate();
  }

  /**
   * Get all active obstacles near player for shatter radius check
   */
  getActiveObstacles() {
    return this.pool.filter(o => o.active);
  }

  reset() {
    for (const obstacle of this.pool) {
      obstacle.deactivate();
    }
    this.spawnTimer = 0;
  }
}
