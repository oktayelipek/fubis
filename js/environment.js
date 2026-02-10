import * as THREE from 'three';

/**
 * Visual Environment
 * Infinite scrolling ground, starfield particles, lighting, and fog.
 */
export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.groundSegments = [];
    this.segmentLength = 40;
    this.numSegments = 5;
    this.scrollSpeed = 15;

    this._createLighting();
    this._createGround();
    this._createStarfield();
    this._createSideWalls();

    // Fog for depth
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);
    scene.background = new THREE.Color(0x0a0a1a);
  }

  _createLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x222244, 0.6);
    this.scene.add(ambient);

    // Main directional (moonlight)
    const dirLight = new THREE.DirectionalLight(0x4488ff, 1.0);
    dirLight.position.set(-5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    // Point lights for neon ambiance
    const pointLeft = new THREE.PointLight(0x00ffff, 1.5, 30);
    pointLeft.position.set(-8, 5, -10);
    this.scene.add(pointLeft);

    const pointRight = new THREE.PointLight(0xff0066, 1.5, 30);
    pointRight.position.set(8, 5, -20);
    this.scene.add(pointRight);
  }

  _createGround() {
    // Grid-line ground material
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, 256, 256);

    // Grid lines
    ctx.strokeStyle = '#1a3a5c';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let i = 0; i <= 256; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    // Brighter center line
    ctx.strokeStyle = '#00ccff33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 8);

    for (let i = 0; i < this.numSegments; i++) {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(12, this.segmentLength),
        new THREE.MeshPhongMaterial({
          map: texture,
          shininess: 50,
          specular: 0x111133,
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.z = -i * this.segmentLength + this.segmentLength / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);
      this.groundSegments.push(ground);
    }
  }

  _createStarfield() {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = 10 + Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150 - 30;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  _createSideWalls() {
    // Left wall glow strip
    const wallGeo = new THREE.BoxGeometry(0.1, 1, 200);
    const leftMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
    });
    const leftWall = new THREE.Mesh(wallGeo, leftMat);
    leftWall.position.set(-6, 0.5, -60);
    this.scene.add(leftWall);

    const rightMat = new THREE.MeshBasicMaterial({
      color: 0xff0066,
      transparent: true,
      opacity: 0.3,
    });
    const rightWall = new THREE.Mesh(wallGeo, rightMat);
    rightWall.position.set(6, 0.5, -60);
    this.scene.add(rightWall);
  }

  update(dt, gameSpeed) {
    // Scroll ground segments
    const scrollDelta = gameSpeed * dt;
    for (const segment of this.groundSegments) {
      segment.position.z += scrollDelta;
      if (segment.position.z > this.segmentLength) {
        segment.position.z -= this.numSegments * this.segmentLength;
      }
    }

    // Twinkle stars
    if (this.stars) {
      this.stars.rotation.y += 0.0001;
    }
  }
}
