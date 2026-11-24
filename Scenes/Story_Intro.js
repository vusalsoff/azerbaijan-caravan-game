/**
 * Scenes/Story_Intro.js
 * Azərbaycanın tarixi dövrlərini (Qobustan e.ə., VI əsr Qafqaz Albaniyası,
 * XII əsr Şirvanşahlar/Gəncə, XVIII–XIX əsr Şəki və Şuşa) vizual 2D tarixi xəritə,
 * SVG illüstrasiyalar və atmosferik Canvas fonu ilə təqdim edən 4 slaydlı giriş səhnəsi.
 */

const SLIDES = [
  {
    id: 'gobustan',
    era: 'Eramızdan əvvəl (XII–VIII minillik)',
    title: 'Odlar Yurdunun Qədim Karvan Yolları',
    text: 'Min illər öncə Qobustan qayalarından başlayaraq bu torpaqlar Şərq ilə Qərbi birləşdirən ticarət və mədəniyyət körpüsü olub. Qayıq təsvirləri və Yallı rəqsləri qədim səyyahların izini yaşadır.',
    accent: '#d4873f',
    badge: 'I Fəsil · Qobustan',
    mapPoint: { x: 242, y: 128, label: 'Qobustan' },
    routeProgress: 0.22,
  },
  {
    id: 'albania',
    era: 'VI əsr — Qafqaz Albaniyası',
    title: 'Qəbələdən Uzanan İpək Yolu Salnaməsi',
    text: 'VI əsrdə Qafqaz Albaniyasının paytaxtı Qəbələ Böyük İpək Yolunun şimal qolunda mühüm ticarət mərkəzinə çevrildi. Dağ aşırımlarından gələn karvanlar gümüş sikkələr və nadir mallar daşıyırdı.',
    accent: '#289e82',
    badge: 'II Fəsil · Qafqaz Albaniyası',
    mapPoint: { x: 152, y: 76, label: 'Qəbələ' },
    routeProgress: 0.48,
  },
  {
    id: 'shirvan',
    era: 'XII əsr — Şirvanşahlar və Gəncə İntibahı',
    title: 'Qız Qalası, Nizami İrsi və Xəzər Limanları',
    text: 'XII əsrdə Bakı, Şamaxı və Gəncə Şərqin parlayan elm, sənət və ticarət mərkəzləri idi. Abşeron duzu, qara nefti və aşıqların saz sədaları karvan yollarını bəzəyirdi.',
    accent: '#3b82b6',
    badge: 'III Fəsil · Şirvanşahlar',
    mapPoint: { x: 256, y: 112, label: 'Bakı · Şirvan' },
    routeProgress: 0.74,
  },
  {
    id: 'khanates',
    era: 'XVIII–XIX əsrlər — Şəki və Şuşa Xanlıqları',
    title: 'İpək, Şəbəkə, Muğam və Qarabağ Atları',
    text: 'Şəki Karvansarayının ipəyi və halvası, Şuşanın Qarabağ xalçaları və sürətli Qarabağ atları tacirlərə sərvət qazandırırdı. İndi növbə sənindir: 1000 Qızıl topla, qorun və salnaməni kəşf et!',
    accent: '#e5b84b',
    badge: 'IV Fəsil · Şəki və Şuşa',
    mapPoint: { x: 118, y: 138, label: 'Şəki & Şuşa' },
    routeProgress: 1.0,
  },
];

function renderEraIllustration(slideId, accent) {
  switch (slideId) {
    case 'gobustan':
      return `
        <svg viewBox="0 0 280 150" width="100%" height="100%" aria-label="Qobustan qayaüstü rəsmləri">
          <defs>
            <linearGradient id="gob-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#331d12"/>
              <stop offset="100%" stop-color="#141923"/>
            </linearGradient>
          </defs>
          <rect width="280" height="150" rx="12" fill="url(#gob-sky)"/>
          <circle cx="215" cy="42" r="22" fill="${accent}" opacity="0.25"/>
          <circle cx="215" cy="42" r="13" fill="${accent}" opacity="0.75"/>
          <path d="M0 120 Q55 70 115 104 T225 88 L280 118 L280 150 L0 150 Z" fill="#2a1d17"/>
          <path d="M25 130 Q95 92 175 122 T280 124 L280 150 L0 150 Z" fill="#1b1411"/>
          <!-- Qobustan qayıq petroqlifi -->
          <path d="M72 104 Q112 122 154 102" fill="none" stroke="#f0c27b" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M88 108 L88 94 M102 111 L102 95 M116 111 L116 95 M130 109 L130 95" stroke="#f0c27b" stroke-width="2" stroke-linecap="round"/>
          <circle cx="88" cy="90" r="2.6" fill="#f0c27b"/>
          <circle cx="102" cy="91" r="2.6" fill="#f0c27b"/>
          <circle cx="116" cy="91" r="2.6" fill="#f0c27b"/>
          <circle cx="130" cy="91" r="2.6" fill="#f0c27b"/>
          <!-- Dağ keçisi petroqlifi -->
          <path d="M188 112 L204 112 M191 112 L189 122 M201 112 L203 122 M204 112 L209 105 M209 105 Q203 95 194 98" fill="none" stroke="#e5b84b" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`;
    case 'albania':
      return `
        <svg viewBox="0 0 280 150" width="100%" height="100%" aria-label="Qafqaz Albaniyası Qəbələ">
          <defs>
            <linearGradient id="alb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#123133"/>
              <stop offset="100%" stop-color="#0e1621"/>
            </linearGradient>
          </defs>
          <rect width="280" height="150" rx="12" fill="url(#alb-sky)"/>
          <polygon points="0,120 48,54 96,105 150,42 208,104 252,62 280,98 280,150 0,150" fill="#172b30"/>
          <polygon points="150,42 136,62 150,58 164,62" fill="#d9eef0" opacity="0.5"/>
          <!-- Qəbələ Qala tağları -->
          <rect x="65" y="78" width="150" height="58" rx="3" fill="#283d42" stroke="${accent}" stroke-width="1.2"/>
          <path d="M90 136 L90 104 A14 14 0 0 1 118 104 L118 136 Z" fill="#0e1621"/>
          <path d="M126 136 L126 98 A14 14 0 0 1 154 98 L154 136 Z" fill="#e5b84b" opacity="0.24"/>
          <path d="M162 136 L162 104 A14 14 0 0 1 190 104 L190 136 Z" fill="#0e1621"/>
          <rect x="62" y="70" width="14" height="12" fill="#324c52"/>
          <rect x="133" y="70" width="14" height="12" fill="#324c52"/>
          <rect x="204" y="70" width="14" height="12" fill="#324c52"/>
          <!-- Gümüş sikkə -->
          <circle cx="232" cy="40" r="14" fill="none" stroke="#c8dce6" stroke-width="2" stroke-dasharray="3 2"/>
          <circle cx="232" cy="40" r="9" fill="#c8dce6" opacity="0.2"/>
        </svg>`;
    case 'shirvan':
      return `
        <svg viewBox="0 0 280 150" width="100%" height="100%" aria-label="XII əsr Şirvanşahlar və Qız Qalası">
          <defs>
            <linearGradient id="shi-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#172c46"/>
              <stop offset="100%" stop-color="#101824"/>
            </linearGradient>
          </defs>
          <rect width="280" height="150" rx="12" fill="url(#shi-sky)"/>
          <!-- Xəzər dənizi -->
          <rect x="0" y="114" width="280" height="36" fill="#184e70" opacity="0.7"/>
          <path d="M10 126 Q40 121 70 126 T130 126 T190 126 T250 126" fill="none" stroke="#7ec8e3" stroke-width="1.3" opacity="0.5"/>
          <!-- Şirvanşahlar günbəzi -->
          <path d="M52 114 L52 84 L104 84 L104 114 Z" fill="#c8a974"/>
          <path d="M62 84 Q78 52 94 84 Z" fill="#d9b97e"/>
          <!-- Qız Qalası -->
          <rect x="132" y="42" width="44" height="72" rx="4" fill="#d8bc88"/>
          <rect x="172" y="54" width="12" height="60" fill="#bfa270"/>
          <line x1="132" y1="54" x2="176" y2="54" stroke="#8f754c" stroke-width="2"/>
          <line x1="132" y1="68" x2="176" y2="68" stroke="#8f754c" stroke-width="2"/>
          <line x1="132" y1="82" x2="176" y2="82" stroke="#8f754c" stroke-width="2"/>
          <line x1="132" y1="96" x2="176" y2="96" stroke="#8f754c" stroke-width="2"/>
          <!-- Aypara -->
          <circle cx="228" cy="40" r="12" fill="#e5b84b"/>
          <circle cx="233" cy="37" r="10" fill="#15263d"/>
        </svg>`;
    default:
      return `
        <svg viewBox="0 0 280 150" width="100%" height="100%" aria-label="Şəki şəbəkəsi və Şuşa qalası">
          <defs>
            <linearGradient id="kha-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2c2138"/>
              <stop offset="100%" stop-color="#111722"/>
            </linearGradient>
          </defs>
          <rect width="280" height="150" rx="12" fill="url(#kha-sky)"/>
          <!-- Şəbəkə gül motivi (sol) -->
          <g transform="translate(68,74)">
            <circle r="38" fill="none" stroke="#e5b84b" stroke-width="2"/>
            <polygon points="0,-34 10,-10 34,0 10,10 0,34 -10,10 -34,0 -10,-10" fill="#e5b84b" opacity="0.28" stroke="#e5b84b" stroke-width="1.4"/>
            <polygon points="0,-24 17,-17 24,0 17,17 0,24 -17,17 -24,0 -17,-17" fill="#38b28b" opacity="0.35" stroke="#38b28b" stroke-width="1.2"/>
            <circle r="8" fill="#d94f4f" opacity="0.8"/>
          </g>
          <!-- Şuşa Qalası silueti (sağ) -->
          <path d="M134 134 L134 86 L150 86 L150 94 L162 94 L162 80 L182 80 L182 94 L194 94 L194 86 L210 86 L210 94 L228 94 L228 74 L248 74 L248 134 Z" fill="#9a8c7c"/>
          <path d="M168 134 L168 110 A12 12 0 0 1 192 110 L192 134 Z" fill="#181b24"/>
          <rect x="234" y="54" width="8" height="20" fill="#b4a696"/>
          <polygon points="232,54 238,44 244,54" fill="#e5b84b"/>
        </svg>`;
  }
}

function renderAzerbaijanMapSVG(slide) {
  const cities = [
    { id: 'gobustan', x: 242, y: 128, label: 'Qobustan' },
    { id: 'albania', x: 152, y: 76, label: 'Qəbələ' },
    { id: 'shirvan', x: 256, y: 112, label: 'Bakı' },
    { id: 'sheki', x: 124, y: 66, label: 'Şəki' },
    { id: 'shusha', x: 118, y: 138, label: 'Şuşa' },
  ];

  return `
    <svg viewBox="0 0 320 200" width="100%" height="100%" aria-label="Azərbaycan Tarixi Xəritəsi">
      <defs>
        <linearGradient id="map-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#132233"/>
          <stop offset="100%" stop-color="#0b131e"/>
        </linearGradient>
        <linearGradient id="caspian-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#174c70"/>
          <stop offset="100%" stop-color="#0f314a"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" rx="12" fill="url(#map-bg)" stroke="rgba(229,184,75,0.28)" stroke-width="1"/>
      <!-- Xəzər dənizi (Şərq) -->
      <path d="M235 0 L320 0 L320 200 L248 200 Q232 168 238 140 Q246 122 268 112 Q245 100 232 72 Q220 38 235 0 Z" fill="url(#caspian-sea)"/>
      <text x="282" y="168" fill="#78b7d9" font-size="9" font-family="serif" opacity="0.8" text-anchor="middle">XƏZƏR</text>
      <text x="282" y="179" fill="#78b7d9" font-size="9" font-family="serif" opacity="0.8" text-anchor="middle">DƏNİZİ</text>

      <!-- Azərbaycan relyef konturu -->
      <path d="M36 62 Q78 36 138 42 Q196 46 232 72 Q246 100 268 112 Q244 122 238 140 Q232 168 242 186 L186 184 Q152 160 112 162 Q68 156 48 124 Q24 94 36 62 Z"
            fill="#1f342c" stroke="#48755d" stroke-width="1.4"/>

      <!-- Böyük Qafqaz & Kiçik Qafqaz dağ silsiləsi -->
      <path d="M56 58 L72 44 L88 56 L108 42 L126 56 L148 44 L168 60" fill="none" stroke="#8ea89b" stroke-width="1.6" opacity="0.65"/>
      <path d="M58 112 L74 98 L90 114 L106 100 L120 118" fill="none" stroke="#8ea89b" stroke-width="1.5" opacity="0.6"/>

      <!-- Kür çayı -->
      <path d="M64 78 Q128 96 182 118 T236 154" fill="none" stroke="#3c8fb5" stroke-width="2" opacity="0.65"/>

      <!-- Karvan marşrutu -->
      <path d="M256 112 Q210 92 152 76 T124 66 Q116 102 118 138 Q186 138 242 128"
            fill="none" stroke="${slide.accent}" stroke-width="2.2" stroke-dasharray="5 4" opacity="0.9"/>

      <!-- Şəhər / Dövr nöqtələri -->
      ${cities
        .map((c) => {
          const isFocus =
            c.id === slide.id ||
            (slide.id === 'khanates' && (c.id === 'sheki' || c.id === 'shusha'));
          return `
            <g>
              ${
                isFocus
                  ? `<circle cx="${c.x}" cy="${c.y}" r="11" fill="${slide.accent}" opacity="0.28"/>`
                  : ''
              }
              <circle cx="${c.x}" cy="${c.y}" r="${isFocus ? 4.8 : 3.2}" fill="${isFocus ? slide.accent : '#e5b84b'}" stroke="#0c131d" stroke-width="1.2"/>
              <text x="${c.x}" y="${c.y - 8}" fill="${isFocus ? '#fff3d1' : '#b7c4d4'}" font-size="${isFocus ? 9.5 : 8}" font-weight="${isFocus ? '700' : '500'}" text-anchor="middle">${c.label}</text>
            </g>`;
        })
        .join('')}
    </svg>`;
}

export class StoryIntroScene {
  constructor(container, eventBus, data) {
    this.container = container;
    this.eventBus = eventBus;
    this.data = data;
    this.slideIndex = 0;
    this.root = null;
    this.canvas = null;
    this.rafId = null;
    this._onKeyDown = (e) => this._handleKeyDown(e);
  }

  mount() {
    this.root = document.createElement('div');
    this.root.className = 'story-intro-overlay';
    this.root.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
    this.container.innerHTML = '';
    this.container.appendChild(this.root);

    window.addEventListener('keydown', this._onKeyDown);
    this.render();
  }

  _handleKeyDown(e) {
    if (e.code === 'ArrowRight') {
      if (this.slideIndex < SLIDES.length - 1) {
        this.slideIndex += 1;
        this.render();
      }
    } else if (e.code === 'ArrowLeft') {
      if (this.slideIndex > 0) {
        this.slideIndex -= 1;
        this.render();
      }
    } else if (e.code === 'Enter' && this.slideIndex === SLIDES.length - 1) {
      this.eventBus.emit('story:complete');
    }
  }

  _startAmbientCanvas(accent) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const canvas = this.root?.querySelector('#story-ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = this.root.clientWidth || window.innerWidth;
      canvas.height = this.root.clientHeight || window.innerHeight;
    };
    resize();

    const particles = Array.from({ length: 38 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 2.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.18 - Math.random() * 0.38,
      alpha: 0.2 + Math.random() * 0.55,
    }));

    const draw = () => {
      this.rafId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
  }

  render() {
    const slide = SLIDES[this.slideIndex];
    const isLast = this.slideIndex === SLIDES.length - 1;

    this.root.innerHTML = `
      <div class="story-backdrop" style="
        position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 50% 25%, ${slide.accent}33, #0b111b 72%);
        padding:20px;overflow-y:auto;
      ">
        <canvas id="story-ambient-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>

        <div class="story-card" style="
          position:relative;z-index:2;max-width:880px;width:100%;
          background:rgba(15,22,34,0.92);
          border:1px solid rgba(229,184,75,0.45);border-radius:20px;
          padding:28px 32px;box-shadow:0 24px 64px rgba(0,0,0,0.62);
          backdrop-filter:blur(10px);
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
            <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${slide.accent}28;border:1px solid ${slide.accent};color:#f6efe3;font-size:13px;letter-spacing:0.04em;">
              ${slide.badge} · ${slide.era}
            </span>
            <span style="font-size:12px;color:#9fb0c5;">
              Slayd ${this.slideIndex + 1} / ${SLIDES.length}
            </span>
          </div>

          <h1 style="font-family:var(--font-display);font-size:28px;color:var(--gold);margin-bottom:12px;line-height:1.25;">
            ${slide.title}
          </h1>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:18px;">
            <div style="background:rgba(9,14,22,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:10px;">
              <div style="font-size:11px;color:#a8b8cc;margin-bottom:6px;letter-spacing:0.05em;text-transform:uppercase;">
                Dövrün İllüstrasiyası
              </div>
              <div style="height:150px;">${renderEraIllustration(slide.id, slide.accent)}</div>
            </div>

            <div style="background:rgba(9,14,22,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:10px;">
              <div style="font-size:11px;color:#a8b8cc;margin-bottom:6px;letter-spacing:0.05em;text-transform:uppercase;">
                2D Tarixi Xəritə & Karvan Yolu
              </div>
              <div style="height:150px;">${renderAzerbaijanMapSVG(slide)}</div>
            </div>
          </div>

          <p style="font-size:15.5px;line-height:1.68;color:#dce4ef;margin-bottom:22px;text-align:center;">
            ${slide.text}
          </p>

          <div style="display:flex;justify-content:center;gap:8px;margin-bottom:20px;">
            ${SLIDES.map(
              (s, idx) => `
              <button data-slide-idx="${idx}" aria-label="${s.badge}" style="
                width:${idx === this.slideIndex ? '30px' : '10px'};height:8px;border-radius:999px;border:none;cursor:pointer;
                background:${idx === this.slideIndex ? 'var(--gold)' : 'rgba(255,255,255,0.22)'};
                transition:all 0.25s;
              "></button>`
            ).join('')}
          </div>

          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            ${
              this.slideIndex > 0
                ? `<button id="story-prev" class="btn-secondary">← Geri</button>`
                : ''
            }
            ${
              !isLast
                ? `<button id="story-next" class="btn-primary">Növbəti →</button>
                   <button id="story-skip" class="btn-ghost">Keç və Başla</button>`
                : `<button id="story-start" class="btn-primary" style="font-size:16px;padding:13px 32px;">Səyahətə Başla →</button>`
            }
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#story-prev')?.addEventListener('click', () => {
      this.slideIndex = Math.max(0, this.slideIndex - 1);
      this.render();
    });

    this.root.querySelector('#story-next')?.addEventListener('click', () => {
      this.slideIndex = Math.min(SLIDES.length - 1, this.slideIndex + 1);
      this.render();
    });

    this.root.querySelectorAll('[data-slide-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.slideIndex = Number(btn.getAttribute('data-slide-idx'));
        this.render();
      });
    });

    const startGame = () => this.eventBus.emit('story:complete');
    this.root.querySelector('#story-skip')?.addEventListener('click', startGame);
    this.root.querySelector('#story-start')?.addEventListener('click', startGame);

    this._startAmbientCanvas(slide.accent);
  }

  unmount() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }
}
