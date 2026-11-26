/**
 * Audio/AudioManager.js
 * 6 Azərbaycan şəhərinin hər biri üçün ayrıca MP3 musiqi faylı + Web Audio API ehtiyat sintezi
 * və səs effektləri / Azərbaycan dilində səsləndirmə (Voiceover) idarəetməsi.
 *
 * Şəhər → Musiqi Faylı (public/audio/<trackId>.mp3):
 *   - Bakı     (City_Baku)     → audio_baku_shirvan.mp3
 *   - Şamaxı   (City_Shamakhi) → audio_shamakhi_shirvan.mp3
 *   - Şəki     (City_Sheki)    → audio_sheki_silk.mp3
 *   - Gəncə    (City_Ganja)    → audio_ganja_nizami.mp3
 *   - Şuşa     (City_Shusha)   → audio_shusha_mugham.mp3
 *   - Lənkəran (City_Lankaran) → audio_lankaran_caspian.mp3
 */

export const CITY_MUSIC_MAP = {
  City_Baku: { trackId: 'audio_baku_shirvan', file: 'public/audio/audio_baku_shirvan.mp3', label: 'Bakı · Şirvanşahlar Motivi' },
  City_Shamakhi: { trackId: 'audio_shamakhi_shirvan', file: 'public/audio/audio_shamakhi_shirvan.mp3', label: 'Şamaxı · Firuzəyi Karvansaray Motivi' },
  City_Sheki: { trackId: 'audio_sheki_silk', file: 'public/audio/audio_sheki_silk.mp3', label: 'Şəki · İpək Yolu Motivi' },
  City_Ganja: { trackId: 'audio_ganja_nizami', file: 'public/audio/audio_ganja_nizami.mp3', label: 'Gəncə · Nizami İntibahı Motivi' },
  City_Shusha: { trackId: 'audio_shusha_mugham', file: 'public/audio/audio_shusha_mugham.mp3', label: 'Şuşa · Qarabağ Muğamı Motivi' },
  City_Lankaran: { trackId: 'audio_lankaran_caspian', file: 'public/audio/audio_lankaran_caspian.mp3', label: 'Lənkəran · Cənub Xəzər Motivi' },
};

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
  // Quba / Segah-Şüştər Şahdağ dağ motivi
  audio_quba_mountain: {
    droneFreq: 164.81, // E3
    scale: [329.63, 349.23, 392.0, 415.3, 493.88, 523.25, 587.33, 659.25],
    pattern: [0, 2, 4, 3, 2, 1, 2, 0, 4, 5, 6, 4, 3, 2, 1, 0],
    tempoMs: 590,
    timbre: 'tar',
  },
  // Gəncə / Rast-Mahur Nizami İntibahı motivi
  audio_ganja_nizami: {
    droneFreq: 138.59, // C#3
    scale: [277.18, 311.13, 349.23, 369.99, 415.3, 466.16, 523.25, 554.37],
    pattern: [0, 2, 3, 4, 5, 4, 2, 3, 4, 6, 5, 4, 2, 1, 0, 2],
    tempoMs: 540,
    timbre: 'oud',
  },
  // Naxçıvan / Hümayun-Bayatı Atabəylər motivi
  audio_nakhchivan_atabeg: {
    droneFreq: 110.0, // A2
    scale: [220.0, 233.08, 277.18, 293.66, 329.63, 349.23, 415.3, 440.0],
    pattern: [0, 1, 2, 3, 4, 3, 2, 1, 4, 5, 4, 3, 2, 1, 0, 1],
    tempoMs: 650,
    timbre: 'kamancha',
  },
  // Şamaxı / Şur-Şirvan Firuzəyi Karvansaray motivi
  audio_shamakhi_shirvan: {
    droneFreq: 138.59, // C#3
    scale: [277.18, 293.66, 329.63, 369.99, 415.3, 440.0, 493.88, 554.37],
    pattern: [0, 2, 3, 4, 2, 1, 3, 2, 4, 5, 4, 3, 1, 0, 2, 1],
    tempoMs: 575,
    timbre: 'tar',
  },
  // Lənkəran / Cənub Xəzər Sahili motivi
  audio_lankaran_caspian: {
    droneFreq: 146.83, // D3
    scale: [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 554.37, 587.33],
    pattern: [0, 1, 3, 4, 5, 4, 3, 1, 4, 6, 5, 3, 2, 1, 0, 2],
    tempoMs: 600,
    timbre: 'oud',
  },
};

const AUDIO_SETTINGS_KEY = 'karva_audio_settings_v1';

export class AudioManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicFilter = null;
    this.muted = false;
    this.musicMuted = false;
    this.sfxMuted = false;
    this.voMuted = false;
    this.musicVolume = 0.65;
    this.sfxVolume = 0.85;
    this.voVolume = 0.9;
    this.currentTrack = null;
    this.loopTimer = null;
    this.stepIdx = 0;
    this.externalAudio = null;
    this.voiceoverAudio = null;
    this._musicSeq = 0;
    this._voSeq = 0;
    this._pendingAutoplayRetry = false;
    this._loadSettings();
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.musicVolume === 'number') this.musicVolume = Math.max(0, Math.min(1, s.musicVolume));
      if (typeof s.sfxVolume === 'number') this.sfxVolume = Math.max(0, Math.min(1, s.sfxVolume));
      if (typeof s.voVolume === 'number') this.voVolume = Math.max(0, Math.min(1, s.voVolume));
      if (typeof s.musicMuted === 'boolean') this.musicMuted = s.musicMuted;
      if (typeof s.sfxMuted === 'boolean') this.sfxMuted = s.sfxMuted;
      if (typeof s.voMuted === 'boolean') this.voMuted = s.voMuted;
      this.muted = this.musicMuted && this.sfxMuted && this.voMuted;
    } catch {
      // ignore
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem(
        AUDIO_SETTINGS_KEY,
        JSON.stringify({
          musicVolume: this.musicVolume,
          sfxVolume: this.sfxVolume,
          voVolume: this.voVolume,
          musicMuted: this.musicMuted,
          sfxMuted: this.sfxMuted,
          voMuted: this.voMuted,
        })
      );
    } catch {
      // ignore
    }
  }

  getSettings() {
    return {
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      voVolume: this.voVolume,
      musicMuted: this.musicMuted,
      sfxMuted: this.sfxMuted,
      voMuted: this.voMuted,
    };
  }

  _syncGains() {
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.musicGain) {
        this.musicGain.gain.setValueAtTime(this.muted || this.musicMuted ? 0 : this.musicVolume, now);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(this.muted || this.sfxMuted ? 0 : this.sfxVolume, now);
      }
    }
    if (this.externalAudio) {
      const duck = this.voiceoverAudio ? 0.35 : 1;
      this.externalAudio.volume = this.muted || this.musicMuted ? 0 : this.musicVolume * 0.5 * duck;
    }
    if (this.voiceoverAudio) {
      this.voiceoverAudio.volume = this.muted || this.voMuted ? 0 : this.voVolume;
    }
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, Number(v)));
    this._syncGains();
    this._saveSettings();
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(v)));
    this._syncGains();
    this._saveSettings();
  }

  setVoVolume(v) {
    this.voVolume = Math.max(0, Math.min(1, Number(v)));
    this._syncGains();
    this._saveSettings();
  }

  setMusicMuted(b) {
    this.musicMuted = Boolean(b);
    this.muted = this.musicMuted && this.sfxMuted && this.voMuted;
    this._syncGains();
    this._saveSettings();
  }

  setSfxMuted(b) {
    this.sfxMuted = Boolean(b);
    this.muted = this.musicMuted && this.sfxMuted && this.voMuted;
    this._syncGains();
    this._saveSettings();
  }

  setVoMuted(b) {
    this.voMuted = Boolean(b);
    if (this.voMuted) this.stopVoiceover();
    this.muted = this.musicMuted && this.sfxMuted && this.voMuted;
    this._syncGains();
    this._saveSettings();
  }

  toggleVoMute() {
    this.setVoMuted(!this.voMuted);
    return this.voMuted;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.muted || this.musicMuted ? 0 : this.musicVolume;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.muted || this.sfxMuted ? 0 : this.sfxVolume;
        this.sfxGain.connect(this.masterGain);

        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 1850;
        this.musicFilter.connect(this.musicGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playCityMusic(trackId) {
    if (!trackId) return;
    if (this.currentTrack === trackId && (this.externalAudio || this.loopTimer)) return;
    this.currentTrack = trackId;
    const seq = ++this._musicSeq;
    this._stopCurrentMusic();

    this._tryExternalAudio(trackId, seq).then((started) => {
      if (started || seq !== this._musicSeq || this.currentTrack !== trackId) return;
      this._startProceduralMusic(trackId);
    });
  }

  /**
   * Səsləndirmə (Voiceover) oxudur: public/audio/vo/<voId>.mp3 (və ya .ogg).
   * Fayl mövcud deyilsə səssizcə və konsol xətası atmadan ötürür.
   */
  async playVoiceover(voId) {
    if (!voId || this.muted || this.voMuted) return false;
    this.stopVoiceover();
    const seq = ++this._voSeq;

    for (const ext of ['mp3', 'ogg']) {
      const url = `./audio/vo/${voId}.${ext}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (seq !== this._voSeq) return false;
        if (res.ok && ct.startsWith('audio/')) {
          const el = new Audio(url);
          el.volume = this.muted || this.voMuted ? 0 : this.voVolume;
          el.addEventListener('ended', () => {
            if (this.voiceoverAudio === el) {
              this.voiceoverAudio = null;
              this._syncGains();
            }
          });
          this.voiceoverAudio = el;
          this._syncGains();
          await el.play().catch(() => {});
          return true;
        }
      } catch {
        // Səs faylı hələ yoxdursa səssizcə ötür
      }
    }
    return false;
  }

  stopVoiceover() {
    this._voSeq += 1;
    if (this.voiceoverAudio) {
      try {
        this.voiceoverAudio.pause();
        this.voiceoverAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.voiceoverAudio = null;
      this._syncGains();
    }
  }

  async _tryExternalAudio(trackId, seq) {
    for (const ext of ['mp3', 'ogg']) {
      const url = `./audio/${trackId}.${ext}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (seq !== this._musicSeq) return true;
        if (res.ok && ct.startsWith('audio/')) {
          const el = new Audio(url);
          el.loop = true;
          const duck = this.voiceoverAudio ? 0.35 : 1;
          el.volume = this.muted || this.musicMuted ? 0 : this.musicVolume * 0.5 * duck;
          this.externalAudio = el;
          const playPromise = el.play();
          if (playPromise) {
            await playPromise.catch(() => {
              // İlk klikdən əvvəl brauzer autoplay-i bloklayarsa, ilk toxunuşda bu şəhərin musiqisini dərhal başlat
              if (!this._pendingAutoplayRetry) {
                this._pendingAutoplayRetry = true;
                const resumeFn = () => {
                  this._pendingAutoplayRetry = false;
                  if (this.externalAudio && this.externalAudio.paused && !this.muted && !this.musicMuted) {
                    this.externalAudio.play().catch(() => {});
                  }
                };
                window.addEventListener('pointerdown', resumeFn, { once: true });
                window.addEventListener('keydown', resumeFn, { once: true });
              }
            });
          }
          if (seq !== this._musicSeq) {
            el.pause();
            if (this.externalAudio === el) this.externalAudio = null;
            return true;
          }
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
      if (this.muted || this.musicMuted || !this.ctx || this.ctx.state !== 'running') return;
      const idx = cfg.pattern[this.stepIdx % cfg.pattern.length];
      const freq = cfg.scale[idx % cfg.scale.length];

      if (this.stepIdx % 4 === 0) {
        this._playDrone(cfg.droneFreq, 0.12, (cfg.tempoMs * 3.8) / 1000);
      }
      this._playMughamNote(freq, cfg.timbre, 0.22, 0.72);
      this.stepIdx += 1;
    };

    this.loopTimer = setInterval(tick, cfg.tempoMs);
  }

  playSFX(sfxName) {
    if (this.muted || this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;

    switch (sfxName) {
      case 'step':
        this._playNoiseBurst(0.14, 0.045, 420);
        break;
      case 'horse':
        this._playNoiseBurst(0.22, 0.07, 300);
        setTimeout(() => this._playNoiseBurst(0.18, 0.06, 360), 110);
        break;
      case 'fayton_ride':
        this._playNoiseBurst(0.20, 0.06, 280);
        setTimeout(() => this._playNoiseBurst(0.16, 0.055, 340), 120);
        setTimeout(() => this._playPluck(155, 0.08, 0.14, 'sawtooth'), 60);
        break;
      case 'ui':
        this._playPluck(620, 0.14, 0.08, 'sine');
        break;
      case 'coin':
      case 'trade':
        this._playPluck(783.99, 0.22, 0.16, 'sine');
        setTimeout(() => this._playPluck(1046.5, 0.22, 0.24, 'triangle'), 65);
        break;
      case 'haggle_ok':
        this._playPluck(587.33, 0.22, 0.16, 'triangle');
        setTimeout(() => this._playPluck(880.0, 0.24, 0.26, 'triangle'), 75);
        break;
      case 'haggle_fail':
        this._playPluck(261.63, 0.20, 0.18, 'sawtooth');
        setTimeout(() => this._playPluck(220.0, 0.20, 0.22, 'sawtooth'), 100);
        break;
      case 'quest':
        this._playPluck(440.0, 0.20, 0.18, 'triangle');
        setTimeout(() => this._playPluck(659.25, 0.22, 0.28, 'triangle'), 95);
        break;
      case 'alert':
        this._playPluck(196.0, 0.22, 0.18, 'sawtooth');
        setTimeout(() => this._playPluck(164.81, 0.22, 0.24, 'sawtooth'), 130);
        break;
      case 'guard':
        this._playPluck(392.0, 0.20, 0.15, 'triangle');
        setTimeout(() => this._playPluck(587.33, 0.22, 0.22, 'triangle'), 75);
        break;
      case 'seal':
      case 'scroll':
        this._playNoiseBurst(0.08, 0.09, 900);
        setTimeout(() => this._playPluck(329.63, 0.15, 0.22, 'sine'), 40);
        break;
      case 'whisper':
        this._playNoiseBurst(0.18, 0.04, 650);
        setTimeout(() => this._playPluck(293.66, 0.12, 0.3, 'sine'), 70);
        break;
      case 'bell':
        this._playPluck(880.0, 0.18, 0.45, 'sine');
        setTimeout(() => this._playPluck(1318.5, 0.12, 0.35, 'sine'), 45);
        break;
      case 'victory':
      case 'victory_small':
        [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
          setTimeout(() => this._playPluck(f, 0.22, 0.36, 'triangle'), i * 105);
        });
        break;
      default:
        this._playPluck(523.25, 0.16, 0.12, 'triangle');
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
    gain.connect(this.sfxGain || this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  _playNoiseBurst(volume = 0.04, duration = 0.05, cutoffHz = 320) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoffHz;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain || this.ctx.destination);
    src.start();
  }

  toggleMute() {
    const next = !(this.musicMuted && this.sfxMuted);
    this.musicMuted = next;
    this.sfxMuted = next;
    this.muted = next;
    this._syncGains();
    this._saveSettings();
    return this.muted;
  }
}
