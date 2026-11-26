import { renderSeljukStarDivider, renderSigil, renderCityCrest, renderButaWing } from '../UI/AntiqueIcons.js';

/**
 * Scenes/Story_Intro.js
 * Qədim Divan Salnaməsi üslubunda (Lord of the Mysteries × Tarixi Azərbaycan)
 * 4 fəsillik giriş əlyazması: Qobustan, Qafqaz Albaniyası, Şirvanşahlar və Xanlıqlar dövrü.
 */

const SLIDES = [
  {
    id: 'gobustan',
    era: 'Eramızdan əvvəl XII–VIII minillik',
    title: 'Daş Yaddaşı və İlk Səyyahların İzi',
    text: 'Min illər öncə Qobustan qayalarına həkk olunmuş günəş qayıqları və ocaq nəğmələri bu torpağın alın yazısını müəyyən etdi: Şərq ilə Qərbin qovuşduğu sirli keçid. Hər daş cızığında qədim karvanların səssiz andı yaşayır.',
    whisper: '«Daşa yazılan iz silinməz; yolu tanıyan yolçu azmaz.»',
    accent: '#c89646',
    badge: 'I Vərəq · Qobustan Qayaları',
  },
  {
    id: 'albania',
    era: 'VI əsr · Qafqaz Albaniyası Divanı',
    title: 'Qəbələ Darvazaları və Dağ Aşırımları',
    text: 'Uca Qafqaz aşırımlarından enən karvanlar qədim Qəbələ qalasında nəfəs dərir, gümüş sikkələr qarşılığında ipək, duz və ədviyyat dəyişirdi. Sərhəd keşikçilərinin məşəlləri dumanlı dərələrdə yeganə bələdçi idi.',
    whisper: '«Dağ yolu səbri sınayar, mənzil başı fərasəti mükafatlandırar.»',
    accent: '#5ca38a',
    badge: 'II Vərəq · Qəbələ Karvan Qovşağı',
  },
  {
    id: 'shirvan',
    era: 'XII–XV əsrlər · Şirvanşahlar və İntibah',
    title: 'Qız Qalası, Abşeron Quyuları və Nizami Hikməti',
    text: 'Bakı limanından qalxan yelkənlər, Abşeronun möhürlü neft tuluqları və Gəncə-Şamaxı sənətkarlarının şöhrəti İpək Yolunun ürəyində döyünürdü. Karvansaray həyətlərində hər sövdələşmə bir sınaq, hər söz bir tərəzi idi.',
    whisper: '«Söz danışanda, əmtəə tərəzidə, tacir isə dar gündə tanınar.»',
    accent: '#cfa355',
    badge: 'III Vərəq · Şirvanşahlar Möhürü',
  },
  {
    id: 'khanates',
    era: 'XVIII–XIX əsrlər · Şəki və Qarabağ Xanlıqları',
    title: 'Şəbəkə İşığı, Çələbi İlməsi və Köhlən Sürəti',
    text: 'Şəki Karvansarayının xam ipəyi və ustad halvası, Şuşanın Çələbi xalçaları və köhlən atları böyük sərvətin açarıdır. İndi heybə sənin, tərəzi sənindir: 1000 qızıl xəzinə topla, bağ nemətlərini vaxtında çatdır və qədim salnaməni tamamla.',
    whisper: '«Halal malın bərəkəti yolda, fərasətli tacirin adı salnamədə qalar.»',
    accent: '#d9a84e',
    badge: 'IV Vərəq · Tacirin Əhdi',
  },
];

function renderEraIllustration(slideId, accent) {
  switch (slideId) {
    case 'gobustan':
      return `
        <svg viewBox="0 0 280 146" width="100%" height="100%" aria-label="Qobustan qayaüstü təsvirləri">
          <rect width="280" height="146" fill="#140e09"/>
          <circle cx="218" cy="40" r="20" fill="${accent}" opacity="0.16"/>
          <circle cx="218" cy="40" r="11" fill="none" stroke="${accent}" stroke-width="1.4"/>
          <path d="M0 118 Q58 68 118 102 T228 86 L280 114 L280 146 L0 146 Z" fill="#211710" stroke="rgba(207,163,85,0.22)"/>
          <path d="M68 102 Q112 120 158 100" fill="none" stroke="#e0ba72" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M86 106 V92 M100 109 V93 M114 109 V93 M128 107 V93" stroke="#e0ba72" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M188 110 H204 M191 110 L189 120 M201 110 L203 120 M204 110 L209 103 Q203 93 194 96" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`;
    case 'albania':
      return `
        <svg viewBox="0 0 280 146" width="100%" height="100%" aria-label="Qəbələ darvazaları">
          <rect width="280" height="146" fill="#12100d"/>
          <polygon points="0,118 48,52 96,102 150,38 208,100 252,60 280,96 280,146 0,146" fill="#1c1813" stroke="rgba(207,163,85,0.2)"/>
          <rect x="68" y="76" width="144" height="56" fill="#241c14" stroke="${accent}" stroke-width="1.2"/>
          <path d="M126 132 V96 A14 14 0 0 1 154 96 V132 Z" fill="#120d09" stroke="#cfa355" stroke-width="1.1"/>
          <circle cx="230" cy="38" r="12" fill="none" stroke="#cfa355" stroke-width="1.4" stroke-dasharray="3 2"/>
        </svg>`;
    case 'shirvan':
      return `
        <svg viewBox="0 0 280 146" width="100%" height="100%" aria-label="Şirvanşahlar və Qız Qalası">
          <rect width="280" height="146" fill="#130e0a"/>
          <rect x="0" y="114" width="280" height="32" fill="#132634" opacity="0.75"/>
          <path d="M54 114 V84 H104 V114 Z" fill="#2e2216" stroke="#cfa355" stroke-width="1.1"/>
          <path d="M64 84 Q79 54 94 84 Z" fill="#3d2d1d" stroke="#cfa355" stroke-width="1.1"/>
          <rect x="134" y="42" width="42" height="72" fill="#38291a" stroke="#e0ba72" stroke-width="1.3"/>
          <line x1="134" y1="58" x2="176" y2="58" stroke="#cfa355" stroke-width="1.1" opacity="0.6"/>
          <line x1="134" y1="76" x2="176" y2="76" stroke="#cfa355" stroke-width="1.1" opacity="0.6"/>
          <line x1="134" y1="94" x2="176" y2="94" stroke="#cfa355" stroke-width="1.1" opacity="0.6"/>
        </svg>`;
    default:
      return `
        <svg viewBox="0 0 280 146" width="100%" height="100%" aria-label="Şəki şəbəkəsi və Şuşa qalası">
          <rect width="280" height="146" fill="#140e0a"/>
          <g transform="translate(72,73)">
            <circle r="35" fill="none" stroke="#cfa355" stroke-width="1.5"/>
            <rect x="-22" y="-22" width="44" height="44" fill="none" stroke="#cfa355" stroke-width="1.2"/>
            <rect x="-22" y="-22" width="44" height="44" transform="rotate(45)" fill="rgba(207,163,85,0.12)" stroke="#e0ba72" stroke-width="1.2"/>
            <circle r="6" fill="#7e2323" stroke="#e0ba72" stroke-width="1.1"/>
          </g>
          <path d="M138 130 V86 H154 V94 H166 V80 H186 V94 H198 V86 H214 V94 H230 V74 H248 V130 Z" fill="#2d2116" stroke="#cfa355" stroke-width="1.2"/>
        </svg>`;
  }
}

function renderAzerbaijanManuscriptMapSVG(slide) {
  const cities = [
    { id: 'gobustan', x: 242, y: 128, label: 'Qobustan' },
    { id: 'albania', x: 152, y: 76, label: 'Qəbələ' },
    { id: 'shirvan', x: 256, y: 110, label: 'Bakı' },
    { id: 'sheki', x: 122, y: 64, label: 'Şəki' },
    { id: 'shusha', x: 116, y: 138, label: 'Şuşa' },
  ];

  return `
    <svg viewBox="0 0 320 146" width="100%" height="100%" aria-label="Qədim Azərbaycan Əlyazma Xəritəsi">
      <rect width="320" height="146" fill="#16100b"/>
      <path d="M238 0 H320 V146 H246 Q234 122 240 102 Q248 90 268 82 Q245 72 234 50 Q224 24 238 0 Z" fill="#112430"/>
      <text x="284" y="128" fill="#8caab8" font-size="8.5" font-family="Georgia, serif" font-style="italic" text-anchor="middle">Xəzər</text>
      <path d="M36 46 Q78 24 138 30 Q196 34 232 54 Q246 76 268 84 Q244 94 238 108 Q232 126 240 138 L184 136 Q150 120 112 122 Q68 118 48 94 Q24 70 36 46 Z"
            fill="#261c13" stroke="#8c6b34" stroke-width="1.2"/>
      <path d="M256 110 Q210 88 152 76 T122 64 Q114 98 116 138 Q186 136 242 128"
            fill="none" stroke="${slide.accent}" stroke-width="1.8" stroke-dasharray="4 3"/>
      ${cities
        .map((c) => {
          const isFocus =
            c.id === slide.id ||
            (slide.id === 'khanates' && (c.id === 'sheki' || c.id === 'shusha'));
          const cy = Math.min(134, Math.round(c.y * 0.88));
          return `
            <g>
              ${isFocus ? `<circle cx="${c.x}" cy="${cy}" r="9" fill="${slide.accent}" opacity="0.24"/>` : ''}
              <circle cx="${c.x}" cy="${cy}" r="${isFocus ? 4.2 : 2.8}" fill="${isFocus ? '#7e2323' : '#cfa355'}" stroke="#f3e4c6" stroke-width="1"/>
              <text x="${c.x}" y="${cy - 7}" fill="${isFocus ? '#f6e8cc' : '#b5a182'}" font-size="8.5" font-family="Georgia, serif" text-anchor="middle">${c.label}</text>
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
    if (e.repeat) return;
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

  _startAmbientCanvas() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const canvas = this.root?.querySelector('#story-ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = this.root.clientWidth || window.innerWidth;
    canvas.height = this.root.clientHeight || window.innerHeight;

    const motes = Array.from({ length: 44 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.9 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.18 - Math.random() * 0.42,
      alpha: 0.16 + Math.random() * 0.48,
      warm: i % 3 === 0 ? '#f0863a' : '#f4cf78',
    }));

    const draw = () => {
      this.rafId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of motes) {
        p.x += p.vx + Math.sin(p.y * 0.015) * 0.12;
        p.y += p.vy;
        if (p.y < -8) {
          p.y = canvas.height + 8;
          p.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.warm;
        ctx.shadowColor = p.warm;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };
    draw();
  }

  render() {
    if (!this.showSlides) {
      const houses = [
        { id: 'City_Baku', name: 'Bakı' },
        { id: 'City_Shamakhi', name: 'Şamaxı' },
        { id: 'City_Sheki', name: 'Şəki' },
        { id: 'City_Ganja', name: 'Gəncə' },
        { id: 'City_Shusha', name: 'Şuşa' },
        { id: 'City_Lankaran', name: 'Lənkəran' },
      ];
      this.root.innerHTML = `
        <div class="karva-title-screen">
          <div class="karva-title-bg" style="background-image:url('./images/bazaar_baku_25d.jpg');"></div>
          <div class="karva-title-vignette"></div>
          <canvas id="story-ambient-canvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;"></canvas>

          <div class="cinema-corner-filigree tl"></div>
          <div class="cinema-corner-filigree tr"></div>
          <div class="cinema-corner-filigree bl"></div>
          <div class="cinema-corner-filigree br"></div>

          <div class="karva-title-topbar">
            <span class="karva-era-ribbon">${renderSigil('flame', 15)} ODLAR YURDU · XVI ƏSR İPƏK YOLU</span>
            <span class="karva-era-ribbon">${renderSigil('seal', 14)} ŞİRVANŞAHLAR & XANLIQLAR DİVANI</span>
          </div>

          <div class="karva-title-stage">
            <img src="./images/karva_logo.png" alt="KARVA" class="karva-title-logo" />
            <div class="karva-title-subtitle">
              ${renderButaWing('left', 26)}
              <span>Azərbaycan Karvan Ticarəti</span>
              ${renderButaWing('right', 26)}
            </div>
            <div style="width:100%;">${renderSeljukStarDivider()}</div>
            <p class="karva-title-motto">«Altı qala, bir salnamə — tərəzi, ipək və qılınc arasında böyük yol.»</p>

            <div class="karva-title-actions">
              <button id="title-play-btn" class="btn-primary karva-cta-royal">
                ${renderSigil('gate', 18)}
                <span>KARVANA BAŞLA</span>
              </button>
              <div class="karva-title-row">
                <button id="title-settings-btn" class="btn-secondary" style="padding:10px 14px;font-size:13.5px;">
                  ⚙ Ayarlar
                </button>
                <a id="title-prompts-btn" href="https://vusalsoff.github.io/azerbaijan-caravan-game/" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="padding:10px 14px;font-size:13.5px;text-decoration:none;" title="44 Məkanlı 2.5D/3D Şəkil Prompt Kataloqu">
                  🖼️ 44 Prompt
                </a>
              </div>
              <button id="title-story-btn" class="btn-ghost" style="font-size:13px;padding:8px 16px;">
                ${renderSigil('scroll', 14)}
                <span>Tarixi Salnamə (Giriş Hekayəsi)</span>
              </button>
            </div>
          </div>

          <div class="karva-houses-bar">
            ${houses
              .map(
                (h) => `
              <span class="karva-house-chip">
                ${renderCityCrest(h.id, 22)}
                <span>${h.name}</span>
              </span>`
              )
              .join('')}
          </div>
        </div>
      `;

      this.root.querySelector('#title-play-btn')?.addEventListener('click', () => {
        this.eventBus.emit('story:complete');
      });
      this.root.querySelector('#title-settings-btn')?.addEventListener('click', () => {
        this.eventBus.emit('ui:open_settings');
      });
      this.root.querySelector('#title-story-btn')?.addEventListener('click', () => {
        this.showSlides = true;
        this.render();
      });
      this._startAmbientCanvas();
      return;
    }

    const slide = SLIDES[this.slideIndex];
    const isLast = this.slideIndex === SLIDES.length - 1;

    this.root.innerHTML = `
      <div style="
        position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 50% 24%, rgba(92, 62, 28, 0.24), #0b0806 76%);
        padding:20px;overflow-y:auto;
      ">
        <canvas id="story-ambient-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>

        <div class="modal-card" style="position:relative;z-index:2;max-width:860px;width:100%;padding:28px 34px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
            <span class="wax-seal-tag">
              ${renderSigil('seal', 12)} ${slide.badge} · ${slide.era}
            </span>
            <span style="font-family:var(--font-display);font-size:14px;color:var(--text-muted);letter-spacing:0.08em;">
              SALNAMƏ VƏRƏQİ ${this.slideIndex + 1} / ${SLIDES.length}
            </span>
          </div>

          <h1 style="font-family:var(--font-display);font-size:30px;font-weight:700;color:var(--gold-bright);letter-spacing:0.04em;line-height:1.2;">
            ${slide.title}
          </h1>

          ${renderSeljukStarDivider()}

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin:14px 0 16px;">
            <div style="background:#120d09;border:1px solid rgba(196,152,76,0.32);padding:9px;">
              <div style="font-family:var(--font-display);font-size:12px;color:var(--text-muted);margin-bottom:6px;letter-spacing:0.08em;text-transform:uppercase;">
                Dövrün Qravür Təsviri
              </div>
              <div style="height:146px;">${renderEraIllustration(slide.id, slide.accent)}</div>
            </div>

            <div style="background:#120d09;border:1px solid rgba(196,152,76,0.32);padding:9px;">
              <div style="font-family:var(--font-display);font-size:12px;color:var(--text-muted);margin-bottom:6px;letter-spacing:0.08em;text-transform:uppercase;">
                Mənzil və Karvan Xəritəsi
              </div>
              <div style="height:146px;">${renderAzerbaijanManuscriptMapSVG(slide)}</div>
            </div>
          </div>

          <p style="font-size:15px;line-height:1.72;color:#eadcc3;margin-bottom:10px;text-align:center;">
            ${slide.text}
          </p>
          <p style="font-size:13.5px;font-style:italic;color:var(--gold);margin-bottom:18px;text-align:center;">
            ${slide.whisper}
          </p>

          <div style="display:flex;justify-content:center;gap:8px;margin-bottom:18px;">
            ${SLIDES.map(
              (s, idx) => `
              <button data-slide-idx="${idx}" aria-label="${s.badge}" style="
                width:${idx === this.slideIndex ? '28px' : '9px'};height:6px;border:1px solid rgba(207,163,85,0.55);cursor:pointer;
                background:${idx === this.slideIndex ? 'var(--gold-bright)' : 'transparent'};
              "></button>`
            ).join('')}
          </div>

          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
            ${
              this.slideIndex > 0
                ? `<button id="story-prev" class="btn-secondary">← Əvvəlki Vərəq</button>`
                : ''
            }
            ${
              !isLast
                ? `<button id="story-next" class="btn-primary">Növbəti Vərəq →</button>
                   <button id="story-skip" class="btn-ghost">Keç və Başla</button>`
                : `<button id="story-start" class="btn-primary" style="font-size:15px;padding:10px 28px;">Karvan Yola Çıxsın →</button>`
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

    this._startAmbientCanvas();
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
