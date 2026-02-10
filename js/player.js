import * as THREE from 'three';

/**
 * Player Cube Entity
 * Handles lateral movement, jump physics, visual appearance,
 * and power-up visual states (invincibility, shatter).
 */
export class Player {
  constructor(scene) {
    // Track boundaries
    this.trackWidth = 10;

    // Movement
    this.moveSpeed = 12;

    // Jump physics
    this.jumpForce = 12;
    this.gravity = 30;
    this.velocityY = 0;
    this.isGrounded = true;
    this.groundY = 0.6;

    // Create mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.baseMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      emissive: 0x006666,
      emissiveIntensity: 0.8,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(geometry, this.baseMaterial);
    this.mesh.position.set(0, this.groundY, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Glow effect (slightly larger translucent cube)
    const glowGeometry = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
    });
    this.glow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.mesh.add(this.glow);

    // Shield sphere (shown during invincibility)
    const shieldGeo = new THREE.SphereGeometry(1.0, 16, 12);
    this.shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    this.shield = new THREE.Mesh(shieldGeo, this.shieldMaterial);
    this.mesh.add(this.shield);

    // Collision bounding box
    this.boundingBox = new THREE.Box3();

    // Store base colors for reset
    this._baseColor = 0x00ffff;
    this._baseEmissive = 0x006666;
  }

  update(dt, inputActions, activePowerUp = null) {
    // Lateral movement
    if (inputActions.moveLeft) {
      this.mesh.position.x -= this.moveSpeed * dt;
    }
    if (inputActions.moveRight) {
      this.mesh.position.x += this.moveSpeed * dt;
    }

    // Clamp to track boundaries
    const halfTrack = this.trackWidth / 2 - 0.5;
    this.mesh.position.x = THREE.MathUtils.clamp(
      this.mesh.position.x,
      -halfTrack,
      halfTrack
    );

    // Jump physics
    if (!this.isGrounded) {
      this.velocityY -= this.gravity * dt;
      this.mesh.position.y += this.velocityY * dt;
      if (this.mesh.position.y <= this.groundY) {
        this.mesh.position.y = this.groundY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    // Visual rotation animation
    this.mesh.rotation.y += 0.8 * dt;
    this.mesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.1;

    // Power-up visual effects
    this._updatePowerUpVisuals(activePowerUp);

    // Update bounding box
    this.boundingBox.setFromObject(this.mesh);
    this.boundingBox.expandByScalar(-0.1);
  }

  _updatePowerUpVisuals(activePowerUp) {
    if (!activePowerUp) {
      // Reset to base
      this.baseMaterial.color.setHex(this._baseColor);
      this.baseMaterial.emissive.setHex(this._baseEmissive);
      this.baseMaterial.emissiveIntensity = 0.8;
      this.glowMaterial.color.setHex(this._baseColor);
      this.glowMaterial.opacity = 0.12 + Math.sin(Date.now() * 0.005) * 0.05;
      this.shieldMaterial.opacity = 0;
      return;
    }

    const t = Date.now();

    switch (activePowerUp.type) {
      case 'SHIELD':
        // Cyan shield bubble + rapid pulse
        this.shieldMaterial.opacity = 0.15 + Math.sin(t * 0.008) * 0.1;
        this.shield.rotation.y += 0.03;
        this.shield.rotation.x += 0.02;
        this.glowMaterial.color.setHex(0x00ffff);
        this.glowMaterial.opacity = 0.2 + Math.sin(t * 0.006) * 0.1;
        // Blink when about to expire
        if (activePowerUp.timeLeft < 1.5) {
          this.shieldMaterial.opacity *= (Math.sin(t * 0.03) > 0 ? 1 : 0.2);
        }
        break;

      case 'DOUBLE':
        // Gold glow
        this.baseMaterial.emissive.setHex(0xaa8800);
        this.baseMaterial.emissiveIntensity = 0.8 + Math.sin(t * 0.006) * 0.3;
        this.glowMaterial.color.setHex(0xffcc00);
        this.glowMaterial.opacity = 0.2 + Math.sin(t * 0.005) * 0.08;
        this.shieldMaterial.opacity = 0;
        if (activePowerUp.timeLeft < 2) {
          this.baseMaterial.emissiveIntensity *= (Math.sin(t * 0.03) > 0 ? 1 : 0.3);
        }
        break;

      case 'SHATTER':
        // Red/orange aggressive glow
        this.baseMaterial.emissive.setHex(0xcc3300);
        this.baseMaterial.emissiveIntensity = 1.0 + Math.sin(t * 0.008) * 0.4;
        this.glowMaterial.color.setHex(0xff3300);
        this.glowMaterial.opacity = 0.25 + Math.sin(t * 0.007) * 0.1;
        this.shieldMaterial.opacity = 0;
        if (activePowerUp.timeLeft < 1.5) {
          this.baseMaterial.emissiveIntensity *= (Math.sin(t * 0.03) > 0 ? 1 : 0.3);
        }
        break;
    }
  }

  jump() {
    if (this.isGrounded) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
      return true;
    }
    return false;
  }

  reset() {
    this.mesh.position.set(0, this.groundY, 0);
    this.velocityY = 0;
    this.isGrounded = true;
    this.mesh.rotation.set(0, 0, 0);
    this.baseMaterial.color.setHex(this._baseColor);
    this.baseMaterial.emissive.setHex(this._baseEmissive);
    this.baseMaterial.emissiveIntensity = 0.8;
    this.glowMaterial.color.setHex(this._baseColor);
    this.shieldMaterial.opacity = 0;
  }

  get position() {
    return this.mesh.position;
  }
}
