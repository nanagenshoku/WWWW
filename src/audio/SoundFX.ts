/**
 * Procedural Web Audio Synthesizer for Fireball 3D
 * Generates custom sounds for fireball casting, explosions, charging, hits, and fanfare.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.5;
  private chargeOsc: OscillatorNode | null = null;
  private chargeGain: GainNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.chargeGain) {
      this.chargeGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Sound when casting a fireball: punchy noise burst + pitch-dropping sine whoosh
   */
  public playFireballLaunch(power: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.masterVolume;

    // Sub whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 * power, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.28);

    gain.gain.setValueAtTime(0.4 * master, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);

    // Fiery hiss/rush using filtered noise
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 * power, t);
    filter.frequency.linearRampToValueAtTime(300, t + 0.25);
    filter.Q.value = 3.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35 * master * Math.min(power, 2), t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.25);
  }

  /**
   * Start charging energy: rising frequency pulsating tone
   */
  public startCharging() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.stopCharging();

    const t = this.ctx.currentTime;
    this.chargeOsc = this.ctx.createOscillator();
    this.chargeGain = this.ctx.createGain();

    this.chargeOsc.type = 'sawtooth';
    this.chargeOsc.frequency.setValueAtTime(140, t);
    this.chargeOsc.frequency.linearRampToValueAtTime(540, t + 1.5);

    // Low pass filter to make it warm and mystic
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(1200, t + 1.5);

    this.chargeGain.gain.setValueAtTime(0.01, t);
    this.chargeGain.gain.linearRampToValueAtTime(0.25 * this.masterVolume, t + 0.4);

    this.chargeOsc.connect(filter);
    filter.connect(this.chargeGain);
    this.chargeGain.connect(this.ctx.destination);

    this.chargeOsc.start(t);
  }

  public updateChargePitch(ratio: number) {
    if (!this.chargeOsc || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.chargeOsc.frequency.setValueAtTime(140 + ratio * 420, t);
  }

  public stopCharging() {
    if (this.chargeGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.chargeGain.gain.linearRampToValueAtTime(0.001, t + 0.05);
      setTimeout(() => {
        if (this.chargeOsc) {
          try {
            this.chargeOsc.stop();
            this.chargeOsc.disconnect();
          } catch {
            // Already stopped
          }
          this.chargeOsc = null;
        }
      }, 60);
    }
  }

  /**
   * Fireball impact explosion: heavy bass punch, rumbling distortion, and crackle.
   * Keeps sub-bass strictly in rumble territory (<95Hz) so it never sounds like a siren or alarm tone.
   */
  public playExplosion(intensity: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.masterVolume;
    const clampedIntensity = Math.min(Math.max(intensity, 0.5), 3);

    // Deep sub bass impact - strictly low rumble (80-95Hz down to 25Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    const startFreq = Math.min(95, 75 + clampedIntensity * 7);
    subOsc.frequency.setValueAtTime(startFreq, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.45);

    subGain.gain.setValueAtTime(0.75 * master * Math.min(clampedIntensity, 1.4), t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.5);

    // Crackle / burst noise
    const duration = 0.45 * clampedIntensity;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6 * master, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + duration);
  }

  /**
   * Heavy TNT Barrel Explosion: Deep visceral rumble, explosive shockwave roar, and wood splinter crackle.
   * Zero sine alarm tones or siren sweeps.
   */
  public playBarrelExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.masterVolume;

    // 1. Heavy Sub-Bass Thud (Deep boom without siren sweep)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + 0.55);

    subGain.gain.setValueAtTime(0.85 * master, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.6);

    // 2. Thick Explosive Roar (Low-passed filtered noise)
    const duration = 0.55;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.16));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(70, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7 * master, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + duration);

    // 3. Crisp Wood Splinters / Barrel Shrapnel Snap (Quick high-frequency crunch)
    const splinterDuration = 0.14;
    const splinterSize = Math.floor(this.ctx.sampleRate * splinterDuration);
    const splinterBuffer = this.ctx.createBuffer(1, splinterSize, this.ctx.sampleRate);
    const splinterData = splinterBuffer.getChannelData(0);
    for (let i = 0; i < splinterSize; i++) {
      splinterData[i] = (Math.random() * 2 - 1) * (1 - i / splinterSize);
    }
    const splinterNoise = this.ctx.createBufferSource();
    splinterNoise.buffer = splinterBuffer;
    const splinterFilter = this.ctx.createBiquadFilter();
    splinterFilter.type = 'highpass';
    splinterFilter.frequency.value = 1600;

    const splinterGain = this.ctx.createGain();
    splinterGain.gain.setValueAtTime(0.35 * master, t);
    splinterGain.gain.exponentialRampToValueAtTime(0.001, t + splinterDuration);

    splinterNoise.connect(splinterFilter);
    splinterFilter.connect(splinterGain);
    splinterGain.connect(this.ctx.destination);
    splinterNoise.start(t);
    splinterNoise.stop(t + splinterDuration);
  }

  /**
   * Hit impact tick for successful damage confirmation (subtle tactile tap, no electronic alarm beep)
   */
  public playHitMarker() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.045);

    gain.gain.setValueAtTime(0.12 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Enemy death / shatter sound
   */
  public playEnemyDeath(type: string = 'normal') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'frost_golem') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    }

    gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Arcane Crystal Pickup: Shimmering magical chime chord
   */
  public playCrystalPickup() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [587.33, 880, 1174.66]; // D5, A5, D6 harmonic chime
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);

      gain.gain.setValueAtTime(0.18 * this.masterVolume, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.28);
    });
  }

  /**
   * Legacy alias for destructibles - routes to crystal chime without alarm tone
   */
  public playShatter() {
    this.playCrystalPickup();
  }

  /**
   * Player hurt sound
   */
  public playPlayerHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(90, t + 0.18);

    gain.gain.setValueAtTime(0.35 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Wave clear fanfare chime
   */
  public playWaveClear() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2 * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * Spell switch chime
   */
  public playSwitchSpell() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.08);

    gain.gain.setValueAtTime(0.15 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Portal warp sound effect
   */
  public playPortalWarp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    gain.gain.setValueAtTime(0.25 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Fountain healing chime
   */
  public playFountainHeal() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = t + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.18 * this.masterVolume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }
}

export const sounds = new SoundSystem();
