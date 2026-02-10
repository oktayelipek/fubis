import * as THREE from 'three';

/**
 * Particle Effects System
 * Object-pooled particles for shatter, explosion, and power-up effects.
 */

class Particle {
  constructor(scene) {
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
    this.active = false;
    this.velocity = new THREE.Vector3();
    this.life = 0;
    this.maxLife = 1;
    this.scene = scene;
    scene.add(this.mesh);
  }

  activate(position, velocity, color, life = 1, size = 0.15) {
    this.mesh.position.copy(position);
    this.velocity.copy(velocity);
    this.mesh.material.color.setHex(color);
    this.mesh.material.opacity = 1;
    this.mesh.scale.setScalar(size / 0.15);
    this.mesh.visible = true;
    this.active = true;
    this.life = life;
    this.maxLife = life;
  }

  deactivate() {
    this.mesh.visible = false;
    this.active = false;
  }

  update(dt) {
    if (!this.active) return;

    // Move
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

    // Gravity
    this.velocity.y -= 15 * dt;

    // Spin
    this.mesh.rotation.x += 8 * dt;
    this.mesh.rotation.z += 6 * dt;

    // Fade
    this.life -= dt;
    const t = Math.max(0, this.life / this.maxLife);
    this.mesh.material.opacity = t;
    this.mesh.scale.setScalar(t * (this.mesh.scale.x / Math.max(t, 0.01)));

    if (this.life <= 0) {
      this.deactivate();
    }
  }
}

export class ParticleSystem {
  constructor(scene, poolSize = 200) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Particle(scene));
    }
  }

  _getInactive() {
    return this.pool.find(p => !p.active) || null;
  }

  /**
   * Shatter effect — cube breaks into small pieces
   */
  spawnShatter(position, color = 0xff0055, count = 20) {
    for (let i = 0; i < count; i++) {
      const p = this._getInactive();
      if (!p) break;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 12
      );
      const size = 0.08 + Math.random() * 0.15;
      p.activate(position.clone(), vel, color, 0.8 + Math.random() * 0.5, size);
    }
  }

  /**
   * Explosion effect — larger, more violent burst
   */
  spawnExplosion(position, count = 40) {
    const colors = [0xff3300, 0xff6600, 0xffcc00, 0xff0000];
    for (let i = 0; i < count; i++) {
      const p = this._getInactive();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.6;
      const force = 6 + Math.random() * 10;
      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.sin(upAngle) * force,
        Math.cos(upAngle) * force + 3,
        Math.sin(angle) * Math.sin(upAngle) * force
      );
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 0.1 + Math.random() * 0.25;
      p.activate(position.clone(), vel, color, 0.6 + Math.random() * 0.6, size);
    }
  }

  /**
   * Power-up pickup sparkle effect
   */
  spawnPickup(position, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const p = this._getInactive();
      if (!p) break;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 6 + 3,
        (Math.random() - 0.5) * 6
      );
      p.activate(position.clone(), vel, color, 0.5 + Math.random() * 0.3, 0.1);
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.active) p.update(dt);
    }
  }

  reset() {
    for (const p of this.pool) {
      p.deactivate();
    }
  }
}
