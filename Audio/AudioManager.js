/**
 * Audio/AudioManager.js
 * Web Audio API əsaslı Azərbaycan lad/məqam ruhlu bölgə musiqiləri
 * (audio_baku_shirvan, audio_sheki_silk, audio_shusha_mugham) və səs effektləri.
 * İstəyə bağlı olaraq public/audio/<trackId>.mp3/.ogg fayllarını da dəstəkləyir.
 */

const TRACK_CONFIGS = {
  // Şirvan / Şur-Rast ab-havalı Xəzər sahili motivi
  audio_baku_shirvan: {
    droneFreq: 130.81, // C3
    scale: [261.63, 293.66, 311.13, 349.23, 392.0, 415.3, 493.88, 523.25],
    pattern: [0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 2, 3, 1, 0, 2],
    tempoMs: 560,
    timbre: 'oud',
  },
  // Şəki / Bayatı-Şiraz İpək Yolu dağ motivi
  audio_sheki_silk: {
    droneFreq: 146.83, // D3
    scale: [293.66, 329.63, 349.23, 392.0, 440.0, 466.16, 523.25, 587.33],
    pattern: [0, 1, 2, 4, 5, 4, 3, 2, 4, 6, 5, 4, 2, 1, 0, 2],
    tempoMs: 620,
    timbre: 'tar',
  },
  // Şuşa / Çahargah-Hümayun Qarabağ muğam motivi
  audio_shusha_mugham: {
    droneFreq: 123.47, // B2
    scale: [246.94, 261.63, 311.13, 329.63, 369.99, 392.0, 466.16, 493.88],
    pattern: [0, 1, 2, 4, 3, 2, 5, 4, 2, 1, 3, 2, 1, 0, 2, 1],
    tempoMs: 680,
    timbre: 'kamancha',
  },
};

export class AudioManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.ctx = null;
    this.masterGain = null;
    this.musicFilter = null;
    this.muted = false;
    this.currentTrack = null;
    this.loopTimer = null;
    this.stepIdx = 0;
    this.externalAudio = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.85;
        this.masterGain.connect(this.ctx.destination);

        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 1850;
        this.musicFilter.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playCityMusic(trackId) {
    if (this.currentTrack === trackId) return;
    this.currentTrack = trackId;
    this._stopCurrentMusic();

    this._tryExternalAudio(trackId).then((started) => {
      if (started || this.currentTrack !== trackId) return;
      this._startProceduralMusic(trackId);
    });
  }

  async _tryExternalAudio(trackId) {
    for (const ext of ['mp3', 'ogg']) {
      const url = `./audio/${trackId}.${ext}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          const el = new Audio(url);
          el.loop = true;
          el.volume = this.muted ? 0 : 0.35;
          await el.play().catch(() => {});
          this.externalAudio = el;
          return true;
        }
      } catch {
        // Fallback to procedural Web Audio API
      }
    }
    return false;
  }

  _stopCurrentMusic() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.externalAudio) {
      this.externalAudio.pause();
      this.externalAudio = null;
    }
  }

  _startProceduralMusic(trackId) {
    const cfg = TRACK_CONFIGS[trackId] || TRACK_CONFIGS.audio_baku_shirvan;
    this.stepIdx = 0;

    const tick = () => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const idx = cfg.pattern[this.stepIdx % cfg.pattern.length];
      const freq = cfg.scale[idx % cfg.scale.length];

      if (this.stepIdx % 4 === 0) {
        this._playDrone(cfg.droneFreq, 0.025, (cfg.tempoMs * 3.8) / 1000);
      }
      this._playMughamNote(freq, cfg.timbre, 0.042, 0.72);
      this.stepIdx += 1;
    };

    this.loopTimer = setInterval(tick, cfg.tempoMs);
  }

  playSFX(sfxName) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    switch (sfxName) {
      case 'coin':
      case 'trade':
        this._playPluck(783.99, 0.08, 0.14, 'sine');
        setTimeout(() => this._playPluck(1046.5, 0.08, 0.22, 'triangle'), 65);
        break;
      case 'haggle_ok':
        this._playPluck(587.33, 0.08, 0.14, 'triangle');
        setTimeout(() => this._playPluck(880.0, 0.09, 0.24, 'triangle'), 75);
        break;
      case 'haggle_fail':
        this._playPluck(261.63, 0.08, 0.18, 'sawtooth');
        setTimeout(() => this._playPluck(220.0, 0.08, 0.22, 'sawtooth'), 100);
        break;
      case 'quest':
        this._playPluck(440.0, 0.075, 0.18, 'triangle');
        setTimeout(() => this._playPluck(659.25, 0.085, 0.28, 'triangle'), 95);
        break;
      case 'alert':
        this._playPluck(196.0, 0.1, 0.18, 'sawtooth');
        setTimeout(() => this._playPluck(164.81, 0.1, 0.24, 'sawtooth'), 130);
        break;
      case 'guard':
        this._playPluck(392.0, 0.08, 0.15, 'triangle');
        setTimeout(() => this._playPluck(587.33, 0.085, 0.22, 'triangle'), 75);
        break;
      case 'victory':
      case 'victory_small':
        [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
          setTimeout(() => this._playPluck(f, 0.09, 0.36, 'triangle'), i * 105);
        });
        break;
      default:
        this._playPluck(523.25, 0.06, 0.12, 'triangle');
    }
  }

  _playMughamNote(freq, timbre, volume, duration) {
    if (!this.ctx || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = timbre === 'kamancha' ? 'sawtooth' : timbre === 'tar' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (timbre === 'kamancha') {
      osc.frequency.linearRampToValueAtTime(freq * 1.008, now + duration * 0.45);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + (timbre === 'kamancha' ? 0.09 : 0.018));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  _playDrone(freq, volume, duration) {
    if (!this.ctx || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  _playPluck(freq, volume = 0.06, duration = 0.3, type = 'triangle') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);
    }
    if (this.externalAudio) {
      this.externalAudio.volume = this.muted ? 0 : 0.35;
    }
    return this.muted;
  }
}
