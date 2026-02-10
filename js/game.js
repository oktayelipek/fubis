import * as THREE from 'three';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { ObstacleManager } from './obstacles.js';
import { Environment } from './environment.js';
import { AudioManager } from './audio.js';
import { PowerUpManager, POWERUP_TYPES } from './powerups.js';
import { ParticleSystem } from './particles.js';

/**
 * Main Game Controller
 * Manages game state, loop, score, power-ups, particles, and all subsystems.
 */

const STATE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

class Game {
  constructor() {
    // DOM references
    this.canvas = document.getElementById('game-canvas');
    this.scoreEl = document.getElementById('score-value');
    this.highScoreEl = document.getElementById('highscore-value');
    this.menuScreen = document.getElementById('menu-screen');
    this.gameOverScreen = document.getElementById('gameover-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.newHighEl = document.getElementById('new-high');
    this.powerupIndicator = document.getElementById('powerup-indicator');
    this.powerupIcon = document.getElementById('powerup-icon');
    this.powerupLabel = document.getElementById('powerup-label');
    this.powerupTimerFill = document.getElementById('powerup-timer-fill');

    // Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();

    // Camera — third-person follow
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.cameraOffset = new THREE.Vector3(0, 8, 10);
    this.cameraLookOffset = new THREE.Vector3(0, 0, -15);
    this.camera.position.copy(this.cameraOffset);

    // Subsystems
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.player = new Player(this.scene);
    this.obstacles = new ObstacleManager(this.scene);
    this.environment = new Environment(this.scene);
    this.powerups = new PowerUpManager(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Game state
    this.state = STATE.MENU;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('cubeDodgeHighScore')) || 0;
    this.scoreTimer = 0;
    this.lastMilestone = 0;

    // Timing
    this.clock = new THREE.Clock();
    this.fixedTimeStep = 1 / 60;
    this.accumulator = 0;

    // Camera shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Display high score
    this.highScoreEl.textContent = this.highScore;

    // Events
    window.addEventListener('resize', () => this._onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.PLAYING) {
        this.clock.stop();
      } else if (!document.hidden && this.state === STATE.PLAYING) {
        this.clock.start();
      }
    });

    this._setupStartHandlers();
    this._animate();
  }

  _setupStartHandlers() {
    const startGame = (e) => {
      if (this.state === STATE.MENU) {
        e.preventDefault();
        this.audio.init();
        this.audio.resume();
        this._startGame();
      } else if (this.state === STATE.GAME_OVER) {
        e.preventDefault();
        this._startGame();
      }
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        startGame(e);
      }
    });

    this.canvas.addEventListener('touchstart', startGame);
    this.menuScreen.addEventListener('click', startGame);
    this.gameOverScreen.addEventListener('click', startGame);
  }

  _startGame() {
    this.state = STATE.PLAYING;
    this.score = 0;
    this.scoreTimer = 0;
    this.lastMilestone = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.scoreEl.textContent = '0';
    this.player.reset();
    this.obstacles.reset();
    this.powerups.reset();
    this.particles.reset();
    this.clock.start();
    this.menuScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this._hidePowerUpIndicator();
  }

  _gameOver() {
    this.state = STATE.GAME_OVER;
    this.audio.playHit();

    // Explode the player visually
    this.particles.spawnExplosion(this.player.position.clone(), 50);
    this._triggerShake(0.5, 0.3);

    const isNewHigh = this.score > this.highScore;
    if (isNewHigh) {
      this.highScore = this.score;
      localStorage.setItem('cubeDodgeHighScore', this.highScore);
      this.highScoreEl.textContent = this.highScore;
    }

    this.finalScoreEl.textContent = this.score;
    this.newHighEl.classList.toggle('hidden', !isNewHigh);
    this.gameOverScreen.classList.remove('hidden');
    this._hidePowerUpIndicator();
  }

  _triggerShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _updateCamera(dt) {
    // Smooth follow player
    const targetPos = new THREE.Vector3(
      this.player.position.x * 0.5,
      this.cameraOffset.y + this.player.position.y * 0.3,
      this.cameraOffset.z
    );
    this.camera.position.lerp(targetPos, 0.08);

    const lookTarget = new THREE.Vector3(
      this.player.position.x * 0.3,
      this.player.position.y + 1,
      this.cameraLookOffset.z
    );
    this.camera.lookAt(lookTarget);

    // Camera shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const shake = this.shakeIntensity * (this.shakeDuration / 0.3);
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.5;
    }
  }

  // --- Power-up HUD ---
  _showPowerUpIndicator(info) {
    this.powerupIndicator.classList.remove('hidden', 'shield', 'double', 'shatter');
    this.powerupTimerFill.classList.remove('shield', 'double', 'shatter');

    const typeClass = info.type.toLowerCase();
    this.powerupIndicator.classList.add(typeClass);
    this.powerupTimerFill.classList.add(typeClass);

    const icons = { SHIELD: '🛡️', DOUBLE: '⚡', SHATTER: '💥' };
    this.powerupIcon.textContent = icons[info.type] || '✦';
    this.powerupLabel.textContent = info.label;
  }

  _updatePowerUpIndicator(info) {
    if (!info) {
      this._hidePowerUpIndicator();
      return;
    }
    const config = { SHIELD: 5, DOUBLE: 8, SHATTER: 6 };
    const maxDuration = config[info.type] || 5;
    const pct = Math.max(0, (info.timeLeft / maxDuration) * 100);
    this.powerupTimerFill.style.width = pct + '%';
  }

  _hidePowerUpIndicator() {
    this.powerupIndicator.classList.add('hidden');
  }

  // --- Main update ---
  _update(dt) {
    if (this.state !== STATE.PLAYING) return;

    // Handle jump
    if (this.input.consumeJump()) {
      if (this.player.jump()) {
        this.audio.playJump();
      }
    }

    // Difficulty & speed
    const difficulty = Math.min(this.score / 50, 3);
    const gameSpeed = 15 + difficulty * 5;

    // Get active power-up info
    const activePU = this.powerups.getActiveInfo();

    // Update subsystems
    this.player.update(dt, this.input.actions, activePU);
    this.obstacles.update(dt, this.score);
    this.powerups.update(dt, this.score);
    this.particles.update(dt);
    this.environment.update(dt, gameSpeed);

    // --- Score increment ---
    this.scoreTimer += dt;
    if (this.scoreTimer >= 0.1) {
      this.scoreTimer = 0;
      const points = this.powerups.hasDouble() ? 2 : 1;
      this.score += points;
      this.scoreEl.textContent = this.score;

      // Milestone sounds
      const milestone = Math.floor(this.score / 50);
      if (milestone > this.lastMilestone) {
        this.lastMilestone = milestone;
        this.audio.playMilestone();
      }
    }

    // --- Power-up collision ---
    const puPickup = this.powerups.checkCollision(this.player.boundingBox);
    if (puPickup) {
      this.audio.playPickup();
      this.particles.spawnPickup(puPickup.position, puPickup.color);
      this._showPowerUpIndicator(this.powerups.getActiveInfo());
    }

    // Update power-up HUD
    this._updatePowerUpIndicator(this.powerups.getActiveInfo());

    // --- Obstacle collision ---
    const hit = this.obstacles.checkCollision(this.player.boundingBox);
    if (hit) {
      if (this.powerups.hasShatter()) {
        // SHATTER: destroy the obstacle with particles
        this.particles.spawnShatter(hit.position, hit.color, 25);
        this.obstacles.destroyObstacle(hit.obstacle);
        this.audio.playShatter();
        this.score += 5; // bonus points for shattering
        this.scoreEl.textContent = this.score;
      } else if (this.powerups.hasShield()) {
        // SHIELD: pass through, destroy obstacle silently
        this.particles.spawnShatter(hit.position, 0x00ffff, 12);
        this.obstacles.destroyObstacle(hit.obstacle);
      } else {
        // Normal hit or explosive hit
        if (hit.isExplosive) {
          this.particles.spawnExplosion(hit.position, 50);
          this.audio.playExplosion();
          this._triggerShake(0.8, 0.4);
        }
        this._gameOver();
        return;
      }
    }

    // Camera
    this._updateCamera(dt);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    if (this.state === STATE.PLAYING) {
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.1);

      this.accumulator += dt;
      while (this.accumulator >= this.fixedTimeStep) {
        this._update(this.fixedTimeStep);
        this.accumulator -= this.fixedTimeStep;
      }

      // Update particles outside fixed step for smoothness
      // (already updated inside _update, but render interpolation)
    } else {
      // Idle animation for menu / game over
      this.clock.getDelta();
      this.environment.update(0.016, 5);
      this.particles.update(0.016);
      this.player.mesh.rotation.y += 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Boot
const game = new Game();
