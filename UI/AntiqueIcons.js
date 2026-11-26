/**
 * UI/AntiqueIcons.js
 * Qədim Azərbaycan mis-qravür, Şirvanşahlar/Səlcuq səkkizguşəli ulduz,
 * Şəki şəbəkəsi, Qarabağ Xarıbülbül, Buta ornamentləri və 6 şəhər gerbləri.
 */

const ITEM_PATHS = {
  salt: `
    <polygon points="12,3 19,9 17,20 7,20 5,9" fill="#d9ceb8" stroke="#8a7456" stroke-width="1.4"/>
    <path d="M5,9 Q12,13 19,9" fill="none" stroke="#8a7456" stroke-width="1.3"/>
    <ellipse cx="12" cy="7.5" rx="4.5" ry="2" fill="#f7f4ec" stroke="#b8ab92" stroke-width="1"/>
    <circle cx="9" cy="19" r="1.2" fill="#f7f4ec"/><circle cx="15" cy="19.5" r="1.2" fill="#f7f4ec"/>
  `,
  oil: `
    <path d="M12,3 L14,6 L11,7 C14,9 17,11.5 17,15.5 C17,18.5 14.8,20.5 12,20.5 C9.2,20.5 7,18.5 7,15.5 C7,11.5 10,9 12,7 Z" fill="#2d231d" stroke="#8f6b43" stroke-width="1.4"/>
    <path d="M9.5,14.5 C9.5,16.8 10.8,18.2 12.5,18.4" fill="none" stroke="#6e5a49" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="10.2" y="2.5" width="3.6" height="2" rx="0.8" fill="#a67c46"/>
  `,
  silk: `
    <ellipse cx="12" cy="7" rx="6" ry="2.6" fill="#f2dfb8" stroke="#c9963b" stroke-width="1.3"/>
    <rect x="6" y="7" width="12" height="10" fill="#e6c47e" stroke="#c9963b" stroke-width="1.3"/>
    <ellipse cx="12" cy="17" rx="6" ry="2.6" fill="#d4aa59" stroke="#b8842c" stroke-width="1.3"/>
    <path d="M6.5,10.5 Q12,12.5 17.5,10.5 M6.5,14 Q12,16 17.5,14" fill="none" stroke="#fff3d6" stroke-width="1.2"/>
  `,
  carpet: `
    <rect x="5" y="4" width="14" height="16" rx="1.2" fill="#8f2424" stroke="#d9a441" stroke-width="1.5"/>
    <rect x="7" y="6" width="10" height="12" fill="#1e3654" stroke="#d9a441" stroke-width="1"/>
    <polygon points="12,8 15,12 12,16 9,12" fill="#c98e32" stroke="#f5e1b8" stroke-width="1"/>
    <circle cx="12" cy="12" r="1.3" fill="#8f2424"/>
    <line x1="6" y1="2.2" x2="6" y2="4" stroke="#e6dac1" stroke-width="1.2"/><line x1="10" y1="2.2" x2="10" y2="4" stroke="#e6dac1" stroke-width="1.2"/><line x1="14" y1="2.2" x2="14" y2="4" stroke="#e6dac1" stroke-width="1.2"/><line x1="18" y1="2.2" x2="18" y2="4" stroke="#e6dac1" stroke-width="1.2"/>
    <line x1="6" y1="20" x2="6" y2="21.8" stroke="#e6dac1" stroke-width="1.2"/><line x1="10" y1="20" x2="10" y2="21.8" stroke="#e6dac1" stroke-width="1.2"/><line x1="14" y1="20" x2="14" y2="21.8" stroke="#e6dac1" stroke-width="1.2"/><line x1="18" y1="20" x2="18" y2="21.8" stroke="#e6dac1" stroke-width="1.2"/>
  `,
  horse_gear: `
    <path d="M6.5,13.5 C6.5,7.5 9,4.5 12,4.5 C15,4.5 17.5,7.5 17.5,13.5 L19,19 L15,19 L14.2,15 L9.8,15 L9,19 L5,19 Z" fill="#6b3b22" stroke="#d9a441" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="12" cy="9.5" r="1.8" fill="#d9a441"/>
  `,
  halva: `
    <ellipse cx="12" cy="14" rx="9" ry="5.2" fill="#b86b35" stroke="#e0b04b" stroke-width="1.3"/>
    <polygon points="12,6 18.5,12 12,17.5 5.5,12" fill="#e0a43b" stroke="#7d4a18" stroke-width="1.3"/>
    <line x1="8.5" y1="9" x2="15.5" y2="15" stroke="#7d4a18" stroke-width="1"/>
    <line x1="15.5" y1="9" x2="8.5" y2="15" stroke="#7d4a18" stroke-width="1"/>
    <circle cx="12" cy="12" r="1.2" fill="#f7e7c0"/>
  `,
  apple: `
    <path d="M12,7.5 C9.2,6.5 5.8,8.2 5.8,12.5 C5.8,16.8 8.6,20 11.2,20 C11.8,20 12.2,19.5 12.8,20 C15.4,20 18.2,16.8 18.2,12.5 C18.2,8.2 14.8,6.5 12,7.5 Z" fill="#c92e2e" stroke="#781414" stroke-width="1.3"/>
    <ellipse cx="9.2" cy="11.5" rx="1.4" ry="2.4" fill="#e86b6b" opacity="0.55"/>
    <path d="M12,7.5 C12,5 13.5,3.5 15,3.2" fill="none" stroke="#5c361a" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="14.8" cy="5.4" rx="2.4" ry="1.2" transform="rotate(-25 14.8 5.4)" fill="#529e3f"/>
  `,
  pear: `
    <path d="M12,4.8 C10.4,4.8 9.6,6.4 9.3,8.5 C8.8,11 6.8,12.4 6.8,15.2 C6.8,18.2 9.1,20 12,20 C14.9,20 17.2,18.2 17.2,15.2 C17.2,12.4 15.2,11 14.7,8.5 C14.4,6.4 13.6,4.8 12,4.8 Z" fill="#c7b838" stroke="#756b1c" stroke-width="1.3"/>
    <ellipse cx="9.8" cy="15" rx="1.4" ry="2.2" fill="#ede482" opacity="0.5"/>
    <line x1="12" y1="2.8" x2="12.6" y2="4.8" stroke="#5c361a" stroke-width="1.6" stroke-linecap="round"/>
  `,
  pomegranate: `
    <circle cx="12" cy="13.5" r="6.2" fill="#a82232" stroke="#5e0e18" stroke-width="1.3"/>
    <polygon points="9.2,7.8 10.2,4.6 12,6.4 13.8,4.6 14.8,7.8" fill="#a82232" stroke="#5e0e18" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="10.2" cy="12.5" r="1.1" fill="#e84a5f"/><circle cx="13.8" cy="12.5" r="1.1" fill="#e84a5f"/><circle cx="12" cy="15.2" r="1.1" fill="#e84a5f"/>
  `,
  grape: `
    <circle cx="9.2" cy="9.5" r="2.2" fill="#d49b35" stroke="#785212" stroke-width="1.1"/>
    <circle cx="14.8" cy="9.5" r="2.2" fill="#d49b35" stroke="#785212" stroke-width="1.1"/>
    <circle cx="12" cy="12.5" r="2.2" fill="#e6b24a" stroke="#785212" stroke-width="1.1"/>
    <circle cx="9.6" cy="15.6" r="2.0" fill="#c78b28" stroke="#785212" stroke-width="1.1"/>
    <circle cx="14.4" cy="15.6" r="2.0" fill="#c78b28" stroke="#785212" stroke-width="1.1"/>
    <circle cx="12" cy="18.8" r="1.9" fill="#d49b35" stroke="#785212" stroke-width="1.1"/>
    <path d="M12,7.2 L12,4 L14.8,3.2" fill="none" stroke="#5c361a" stroke-width="1.6" stroke-linecap="round"/>
  `,
  honey: `
    <path d="M8.5,6 L15.5,6 L14.6,8.5 C16.8,10 17.6,12.5 17,16 C16.5,18.5 14.6,20 12,20 C9.4,20 7.5,18.5 7,16 C6.4,12.5 7.2,10 9.4,8.5 Z" fill="#d99426" stroke="#7a4c10" stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="7.5" y="4.5" width="9" height="2" rx="0.8" fill="#8f5a24"/>
    <polygon points="12,11 14.2,12.3 14.2,14.8 12,16.1 9.8,14.8 9.8,12.3" fill="#f7d56e" stroke="#a66f14" stroke-width="1"/>
  `,
  wheat: `
    <line x1="12" y1="21" x2="12" y2="5" stroke="#b88a28" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="9.5" cy="15.5" rx="1.7" ry="2.7" transform="rotate(-28 9.5 15.5)" fill="#e6bd53" stroke="#8f6718" stroke-width="1"/>
    <ellipse cx="14.5" cy="15.5" rx="1.7" ry="2.7" transform="rotate(28 14.5 15.5)" fill="#e6bd53" stroke="#8f6718" stroke-width="1"/>
    <ellipse cx="9.5" cy="10.8" rx="1.7" ry="2.7" transform="rotate(-28 9.5 10.8)" fill="#f2cd6b" stroke="#8f6718" stroke-width="1"/>
    <ellipse cx="14.5" cy="10.8" rx="1.7" ry="2.7" transform="rotate(28 14.5 10.8)" fill="#f2cd6b" stroke="#8f6718" stroke-width="1"/>
    <ellipse cx="12" cy="6.4" rx="1.5" ry="2.5" fill="#f7da81" stroke="#8f6718" stroke-width="1"/>
  `,
};

const UI_SIGILS = {
  coin: `
    <circle cx="12" cy="12" r="8.5" fill="rgba(218,174,84,0.2)" stroke="currentColor" stroke-width="1.5"/>
    <polygon points="12,5.8 13.8,10.2 18.2,12 13.8,13.8 12,18.2 10.2,13.8 5.8,12 10.2,10.2" fill="rgba(242,207,124,0.28)" stroke="currentColor" stroke-width="1.15"/>
  `,
  satchel: `
    <path d="M6,9 L18,9 L19.2,19.5 L4.8,19.5 Z" fill="rgba(186,142,78,0.18)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9,9 V6.8 C9,5.2 10.3,4 12,4 C13.7,4 15,5.2 15,6.8 V9" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5.5" y1="13" x2="18.5" y2="13" stroke="currentColor" stroke-width="1.2"/>
    <rect x="10.8" y="11.6" width="2.4" height="3" fill="currentColor"/>
  `,
  sun: `
    <circle cx="12" cy="12" r="4.2" fill="rgba(242,207,124,0.25)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12,3 V5.5 M12,18.5 V21 M3,12 H5.5 M18.5,12 H21 M5.6,5.6 L7.4,7.4 M16.6,16.6 L18.4,18.4 M18.4,5.6 L16.6,7.4 M7.4,16.6 L5.6,18.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `,
  scroll: `
    <path d="M7,4.5 H17.5 C18.6,4.5 19.5,5.4 19.5,6.5 V17.5 C19.5,18.9 18.4,20 17,20 H6.5 C5.4,20 4.5,19.1 4.5,18 V7 C4.5,5.6 5.6,4.5 7,4.5 Z" fill="rgba(214,188,138,0.14)" stroke="currentColor" stroke-width="1.5"/>
    <line x1="8.5" y1="9" x2="15.5" y2="9" stroke="currentColor" stroke-width="1.3"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5" stroke="currentColor" stroke-width="1.3"/><line x1="8.5" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="1.3"/>
  `,
  compass: `
    <circle cx="12" cy="12" r="8.8" fill="rgba(218,174,84,0.12)" stroke="currentColor" stroke-width="1.45"/>
    <polygon points="12,4.8 14.3,12 12,19.2 9.7,12" fill="rgba(242,207,124,0.34)" stroke="currentColor" stroke-width="1.15"/>
    <polygon points="4.8,12 12,10.2 19.2,12 12,13.8" fill="none" stroke="currentColor" stroke-width="0.95" opacity="0.72"/>
    <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
  `,
  scale: `
    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5" y1="7.5" x2="19" y2="7.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M5,7.5 L3,13.5 H7 Z M19,7.5 L17,13.5 H21 Z" fill="rgba(218,176,88,0.22)" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <line x1="8.5" y1="20" x2="15.5" y2="20" stroke="currentColor" stroke-width="1.6"/>
  `,
  seal: `
    <polygon points="12,2.8 14.6,6.3 18.9,5.1 17.7,9.4 21.2,12 17.7,14.6 18.9,18.9 14.6,17.7 12,21.2 9.4,17.7 5.1,18.9 6.3,14.6 2.8,12 6.3,9.4 5.1,5.1 9.4,6.3" fill="rgba(168,38,42,0.42)" stroke="currentColor" stroke-width="1.25"/>
    <circle cx="12" cy="12" r="3.4" fill="rgba(242,207,124,0.2)" stroke="currentColor" stroke-width="1.2"/>
  `,
  charisma: `
    <polygon points="12,3.5 14.4,9 20.2,9.6 15.8,13.5 17.1,19.2 12,16.2 6.9,19.2 8.2,13.5 3.8,9.6 9.6,9" fill="rgba(214,170,82,0.24)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  `,
  intelligence: `
    <path d="M12,4 C7.5,4 4,7.5 4,12 C4,16.5 7.5,20 12,20 C16.5,20 20,16.5 20,12" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <path d="M19.5,4.5 L11.5,12.5 M15,4.5 H19.5 V9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2.6" fill="currentColor"/>
  `,
  hourglass: `
    <path d="M7,4 H17 M7,20 H17 M8,4 C8,9 12,10.5 12,12 C12,13.5 8,15 8,20 M16,4 C16,9 12,10.5 12,12 C12,13.5 16,15 16,20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `,
  gate: `
    <path d="M5,20 V10 C5,6.2 8.1,3.5 12,3.5 C15.9,3.5 19,6.2 19,10 V20" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <line x1="3" y1="20" x2="21" y2="20" stroke="currentColor" stroke-width="1.6"/>
    <line x1="12" y1="3.5" x2="12" y2="20" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>
  `,
  buta: `
    <path d="M12,3.5 C15.2,5.6 17.6,9.2 17.6,13.2 C17.6,17.3 15.1,20.2 12,20.2 C8.9,20.2 6.4,17.3 6.4,13.2 C6.4,9.8 8.4,7.2 11.4,5.4 C10.4,4.4 10.6,3.4 12,3.5 Z" fill="rgba(218,174,84,0.22)" stroke="currentColor" stroke-width="1.35"/>
    <circle cx="12" cy="14.2" r="2.2" fill="rgba(168,38,42,0.55)" stroke="currentColor" stroke-width="1"/>
  `,
  flame: `
    <path d="M12,3 C14.5,6.5 17.5,9.5 17.5,13.8 C17.5,17.5 15,20.2 12,20.2 C9,20.2 6.5,17.5 6.5,13.8 C6.5,10.8 8.4,8.6 9.6,7.2 C9.4,9.4 10.6,10.5 11.4,9.2 C11.8,7.4 11.4,5 12,3 Z" fill="rgba(235,132,48,0.38)" stroke="currentColor" stroke-width="1.35"/>
    <path d="M12,12.2 C13.3,13.8 14.2,15 14.2,16.6 C14.2,18 13.2,19 12,19 C10.8,19 9.8,18 9.8,16.6 C9.8,15 10.7,13.8 12,12.2 Z" fill="currentColor" opacity="0.78"/>
  `,
};

/**
 * 6 Azərbaycan Şəhərinin & Missiya Nöqtələrinin Xanədan / Divan Gerbləri
 * (Game of Thrones Great Houses üslubunda — Səlcuq səkkizguşəli qalxan içində!)
 */
const CITY_CREST_SPECS = {
  City_Baku: {
    bg: '#162838',
    rim: '#e8bc62',
    inner: `
      <path d="M10,33 Q16,30 22,33 T34,33 V37 H10 Z" fill="#235c73" opacity="0.9"/>
      <rect x="16" y="13" width="12" height="20" rx="1" fill="#c89a4a" stroke="#fff0c8" stroke-width="1.1"/>
      <line x1="16" y1="17.5" x2="28" y2="17.5" stroke="#5e3e14" stroke-width="1"/>
      <line x1="16" y1="22" x2="28" y2="22" stroke="#5e3e14" stroke-width="1"/>
      <line x1="16" y1="26.5" x2="28" y2="26.5" stroke="#5e3e14" stroke-width="1"/>
      <path d="M22,6 C24,8.5 25.5,10.2 25.5,12 C25.5,13.5 24,14.5 22,14.5 C20,14.5 18.5,13.5 18.5,12 C18.5,10.2 20,8.5 22,6 Z" fill="#f27a34" stroke="#ffe49e" stroke-width="0.9"/>
    `,
  },
  City_Shamakhi: {
    bg: '#122c30',
    rim: '#62cfd4',
    inner: `
      <path d="M11,33 V23 H33 V33 Z" fill="#322316" stroke="#e4bc68" stroke-width="1.1"/>
      <path d="M13,23 Q22,8 31,23 Z" fill="#299aa0" stroke="#9beff2" stroke-width="1.2"/>
      <path d="M18,33 V26 Q22,22 26,26 V33 Z" fill="#110c08" stroke="#e4bc68" stroke-width="1"/>
      <circle cx="22" cy="11" r="2.2" fill="#f4cf78"/>
    `,
  },
  City_Sheki: {
    bg: '#1f1912',
    rim: '#f0c464',
    inner: `
      <g transform="translate(22,22)">
        <rect x="-9.5" y="-9.5" width="19" height="19" fill="rgba(168,34,42,0.72)" stroke="#f2cf7c" stroke-width="1.15"/>
        <rect x="-9.5" y="-9.5" width="19" height="19" transform="rotate(45)" fill="rgba(42,148,154,0.68)" stroke="#f2cf7c" stroke-width="1.15"/>
        <polygon points="0,-6.5 4.8,0 0,6.5 -4.8,0" fill="#46a868" stroke="#fff0c8" stroke-width="0.9"/>
        <circle r="2.2" fill="#f7da84"/>
      </g>
    `,
  },
  City_Ganja: {
    bg: '#2b1610',
    rim: '#e8a258',
    inner: `
      <path d="M11,34 V17 C11,11.5 16,8 22,8 C28,8 33,11.5 33,17 V34 Z" fill="#8f3422" stroke="#f2c478" stroke-width="1.2"/>
      <path d="M16,34 V21 C16,17 18.6,14.5 22,14.5 C25.4,14.5 28,17 28,21 V34 Z" fill="#180d09" stroke="#e4b060" stroke-width="1"/>
      <path d="M22,17 L26,24 L22,31 L18,24 Z" fill="#5da65a" stroke="#e8dc9e" stroke-width="0.9"/>
    `,
  },
  City_Shusha: {
    bg: '#28131a',
    rim: '#eab874',
    inner: `
      <polygon points="9,34 17,19 23,27 29,17 35,34" fill="#3a2f3c" stroke="#c8b8d4" stroke-width="1"/>
      <path d="M22,10 C25,13 27,16 25,19 C28,18 30,20 28,23 C25,24 23,22 22,25 C21,22 19,24 16,23 C14,20 16,18 19,19 C17,16 19,13 22,10 Z" fill="#c93648" stroke="#fae4b8" stroke-width="1"/>
      <circle cx="22" cy="18.2" r="2.1" fill="#f6d884"/>
    `,
  },
  City_Lankaran: {
    bg: '#14261a',
    rim: '#e6b256',
    inner: `
      <circle cx="22" cy="24" r="8.5" fill="#9c222e" stroke="#f2c674" stroke-width="1.2"/>
      <polygon points="17.5,16 19,11.5 22,14 25,11.5 26.5,16" fill="#9c222e" stroke="#f2c674" stroke-width="1.1"/>
      <circle cx="19.5" cy="23" r="1.4" fill="#ff7582"/>
      <circle cx="24.5" cy="23" r="1.4" fill="#ff7582"/>
      <circle cx="22" cy="26.5" r="1.4" fill="#ff7582"/>
      <path d="M10,33 Q16,28 22,33 T34,33" fill="none" stroke="#54b072" stroke-width="1.3"/>
    `,
  },
  Mission: {
    bg: '#2c1512',
    rim: '#e0864c',
    inner: `
      <path d="M12,30 L32,12 M32,30 L12,12" stroke="#f2cf7c" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M9,31 Q22,20 35,31" fill="none" stroke="#c89448" stroke-width="1.6"/>
      <circle cx="22" cy="21" r="3" fill="#b82e2e" stroke="#f5d990" stroke-width="1"/>
    `,
  },
};

export function renderItemSvg(itemId, size = 22) {
  const inner = ITEM_PATHS[itemId] || UI_SIGILS.satchel;
  return `<svg class="lotm-svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

export function renderSigil(name, size = 16) {
  const inner = UI_SIGILS[name] || UI_SIGILS.seal;
  return `<svg class="lotm-svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

export function renderCityCrest(cityId, size = 34) {
  const key = String(cityId || '').startsWith('Mission_') ? 'Mission' : cityId;
  const spec = CITY_CREST_SPECS[key] || CITY_CREST_SPECS.City_Baku;
  return `
    <svg class="karva-city-crest" width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true">
      <polygon points="22,2 34,6.5 42,22 34,37.5 22,42 10,37.5 2,22 10,6.5" fill="${spec.bg}" stroke="${spec.rim}" stroke-width="1.8"/>
      <polygon points="22,5 32,8.8 39,22 32,35.2 22,39 12,35.2 5,22 12,8.8" fill="none" stroke="${spec.rim}" stroke-width="0.7" opacity="0.55"/>
      ${spec.inner}
    </svg>
  `;
}

export function renderButaWing(side = 'left', width = 26) {
  const flip = side === 'right' ? 'transform="scale(-1,1) translate(-32,0)"' : '';
  return `
    <svg class="karva-buta-wing" width="${width}" height="${Math.round(width * 0.62)}" viewBox="0 0 32 20" aria-hidden="true">
      <g ${flip}>
        <path d="M2,10 C8,2 18,2 24,7 C27,9.5 28,11 30,10 C27,13 23,16 16,16 C10,16 6,13.5 2,10 Z" fill="rgba(210,164,82,0.16)" stroke="#d2a452" stroke-width="1.15"/>
        <path d="M8,10 C12,6.5 17.5,6.8 21,10 C17.5,12.8 12,13 8,10 Z" fill="rgba(138,31,36,0.55)" stroke="#f2cf7c" stroke-width="0.85"/>
        <circle cx="14.5" cy="10" r="1.4" fill="#f2cf7c"/>
      </g>
    </svg>
  `;
}

export function renderSeljukStarDivider() {
  return `
    <div class="lotm-divider" aria-hidden="true">
      <span class="lotm-divider-line left"></span>
      <svg width="22" height="16" viewBox="0 0 28 20" class="lotm-divider-buta">
        <path d="M2,10 C7,4 16,4 22,10 C16,16 7,16 2,10 Z" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.7"/>
        <circle cx="11" cy="10" r="1.5" fill="currentColor" opacity="0.85"/>
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" class="lotm-divider-star">
        <rect x="5.5" y="5.5" width="13" height="13" fill="rgba(138,31,36,0.35)" stroke="currentColor" stroke-width="1.4"/>
        <rect x="5.5" y="5.5" width="13" height="13" transform="rotate(45 12 12)" fill="rgba(210,164,82,0.16)" stroke="currentColor" stroke-width="1.4"/>
        <circle cx="12" cy="12" r="2.2" fill="currentColor"/>
      </svg>
      <svg width="22" height="16" viewBox="0 0 28 20" class="lotm-divider-buta" style="transform:scaleX(-1);">
        <path d="M2,10 C7,4 16,4 22,10 C16,16 7,16 2,10 Z" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.7"/>
        <circle cx="11" cy="10" r="1.5" fill="currentColor" opacity="0.85"/>
      </svg>
      <span class="lotm-divider-line right"></span>
    </div>
  `;
}
