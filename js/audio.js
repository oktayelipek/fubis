/**
 * Procedural Audio System
 * Uses Web Audio API with user-interaction initialization.
 * All sounds are synthesized — no external files needed.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  _playTone(freq, duration, type = 'square', volume = 0.3) {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playHit() {
    if (!this.initialized) return;
    // Noise burst for impact
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime);
  }

  playExplosion() {
    if (!this.initialized) return;
    // Deep boom + noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.4);

    // Noise layer
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.6;
    }
    const source = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    source.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    source.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    source.start(this.ctx.currentTime);
  }

  playPickup() {
    if (!this.initialized) return;
    // Sparkle ascending arpeggio
    const notes = [660, 880, 1100, 1320];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.12, 'sine', 0.2), i * 50);
    });
  }

  playShatter() {
    if (!this.initialized) return;
    // Quick crunch
    this._playTone(200, 0.08, 'sawtooth', 0.25);
    setTimeout(() => this._playTone(100, 0.1, 'square', 0.2), 30);
  }

  playScore() {
    this._playTone(880, 0.1, 'sine', 0.15);
    setTimeout(() => this._playTone(1100, 0.15, 'sine', 0.15), 80);
  }

  playMilestone() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.2), i * 100);
    });
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
