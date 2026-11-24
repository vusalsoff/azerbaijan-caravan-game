/**
 * UI/AntiqueIcons.js
 * Qədim mis-qravür, əlyazma möhürü və Səlcuq/Azərbaycan səkkizguşəli həndəsi üslubunda
 * vektor simvollar — parlaq cizgi-film emojilərini əvəz edir.
 */

const ITEM_PATHS = {
  salt: `
    <polygon points="12,3 19,9 17,19 7,19 5,9" fill="rgba(226,214,190,0.16)" stroke="currentColor" stroke-width="1.5"/>
    <polyline points="12,3 12,19" stroke="currentColor" stroke-width="1.1" opacity="0.7"/>
    <polyline points="5,9 12,12 19,9" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.75"/>
    <circle cx="9" cy="21" r="0.9" fill="currentColor"/><circle cx="15" cy="21" r="0.9" fill="currentColor"/>
  `,
  oil: `
    <path d="M12,3 C12,3 7,9.2 7,13.8 C7,17.2 9.2,20 12,20 C14.8,20 17,17.2 17,13.8 C17,9.2 12,3 12,3 Z" fill="rgba(196,154,78,0.18)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M9.8,14.2 C9.8,16 10.8,17.3 12.2,17.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `,
  silk: `
    <path d="M6,6 C9,4 15,4 18,6 C16,10 16,14 18,18 C15,20 9,20 6,18 C8,14 8,10 6,6 Z" fill="rgba(218,178,96,0.15)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7.5,9.5 Q12,11.5 16.5,9.5 M7.5,14.5 Q12,12.5 16.5,14.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
  `,
  carpet: `
    <rect x="5" y="4" width="14" height="16" rx="1.5" fill="rgba(168,58,48,0.22)" stroke="currentColor" stroke-width="1.5"/>
    <polygon points="12,7.2 15.6,12 12,16.8 8.4,12" fill="none" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
    <line x1="6" y1="2.5" x2="6" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="2.5" x2="10" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="14" y1="2.5" x2="14" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="18" y1="2.5" x2="18" y2="4" stroke="currentColor" stroke-width="1.2"/>
    <line x1="6" y1="20" x2="6" y2="21.5" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="20" x2="10" y2="21.5" stroke="currentColor" stroke-width="1.2"/><line x1="14" y1="20" x2="14" y2="21.5" stroke="currentColor" stroke-width="1.2"/><line x1="18" y1="20" x2="18" y2="21.5" stroke="currentColor" stroke-width="1.2"/>
  `,
  horse_gear: `
    <path d="M7,13 C7,7.5 9.2,4.5 12,4.5 C14.8,4.5 17,7.5 17,13 L18.5,18.5 L15.2,18.5 L14.4,15 L9.6,15 L8.8,18.5 L5.5,18.5 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="12" cy="9.5" r="1.6" fill="currentColor"/>
  `,
  halva: `
    <polygon points="12,5 20,11.5 12,18 4,11.5" fill="rgba(218,168,75,0.18)" stroke="currentColor" stroke-width="1.5"/>
    <line x1="8" y1="8.3" x2="16" y2="14.7" stroke="currentColor" stroke-width="1.1" opacity="0.8"/>
    <line x1="16" y1="8.3" x2="8" y2="14.7" stroke="currentColor" stroke-width="1.1" opacity="0.8"/>
    <path d="M5,14.2 L12,19.8 L19,14.2" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
  `,
  apple: `
    <path d="M12,7.5 C9.5,6.5 6,8.2 6,12.4 C6,16.6 8.8,19.8 11.2,19.8 C11.8,19.8 12.2,19.4 12.8,19.8 C15.2,19.8 18,16.6 18,12.4 C18,8.2 14.5,6.5 12,7.5 Z" fill="rgba(185,68,54,0.18)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12,7.5 C12,5.2 13.5,3.8 15,3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `,
  pear: `
    <path d="M12,4.8 C10.4,4.8 9.6,6.4 9.3,8.5 C8.8,11 6.8,12.4 6.8,15.2 C6.8,18.2 9.1,20 12,20 C14.9,20 17.2,18.2 17.2,15.2 C17.2,12.4 15.2,11 14.7,8.5 C14.4,6.4 13.6,4.8 12,4.8 Z" fill="rgba(182,175,78,0.16)" stroke="currentColor" stroke-width="1.5"/>
    <line x1="12" y1="2.8" x2="12.8" y2="4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `,
  pomegranate: `
    <circle cx="12" cy="13.5" r="6" fill="rgba(168,42,56,0.22)" stroke="currentColor" stroke-width="1.5"/>
    <polyline points="9.5,7.8 10.2,4.8 12,6.4 13.8,4.8 14.5,7.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="10.5" cy="12.8" r="0.9" fill="currentColor"/><circle cx="13.5" cy="12.8" r="0.9" fill="currentColor"/><circle cx="12" cy="15.2" r="0.9" fill="currentColor"/>
  `,
  grape: `
    <circle cx="9.5" cy="9.5" r="2.1" stroke="currentColor" stroke-width="1.3" fill="rgba(186,148,72,0.16)"/>
    <circle cx="14.5" cy="9.5" r="2.1" stroke="currentColor" stroke-width="1.3" fill="rgba(186,148,72,0.16)"/>
    <circle cx="12" cy="13.2" r="2.1" stroke="currentColor" stroke-width="1.3" fill="rgba(186,148,72,0.16)"/>
    <circle cx="9.8" cy="16.2" r="1.9" stroke="currentColor" stroke-width="1.3" fill="none"/>
    <circle cx="14.2" cy="16.2" r="1.9" stroke="currentColor" stroke-width="1.3" fill="none"/>
    <circle cx="12" cy="19.2" r="1.8" stroke="currentColor" stroke-width="1.3" fill="none"/>
    <path d="M12,7.2 L12,4.2 L14.5,3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `,
  honey: `
    <path d="M8.5,6 L15.5,6 L14.6,8.5 C16.8,10 17.6,12.5 17,16 C16.5,18.5 14.6,20 12,20 C9.4,20 7.5,18.5 7,16 C6.4,12.5 7.2,10 9.4,8.5 Z" fill="rgba(218,162,56,0.2)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="7.5" y1="6" x2="16.5" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <polygon points="12,11 14.2,12.3 14.2,14.8 12,16.1 9.8,14.8 9.8,12.3" fill="none" stroke="currentColor" stroke-width="1.1"/>
  `,
  wheat: `
    <line x1="12" y1="20.5" x2="12" y2="4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="9.6" cy="15.5" rx="1.6" ry="2.6" transform="rotate(-28 9.6 15.5)" fill="none" stroke="currentColor" stroke-width="1.3"/>
    <ellipse cx="14.4" cy="15.5" rx="1.6" ry="2.6" transform="rotate(28 14.4 15.5)" fill="none" stroke="currentColor" stroke-width="1.3"/>
    <ellipse cx="9.6" cy="10.8" rx="1.6" ry="2.6" transform="rotate(-28 9.6 10.8)" fill="none" stroke="currentColor" stroke-width="1.3"/>
    <ellipse cx="14.4" cy="10.8" rx="1.6" ry="2.6" transform="rotate(28 14.4 10.8)" fill="none" stroke="currentColor" stroke-width="1.3"/>
    <ellipse cx="12" cy="6.4" rx="1.4" ry="2.4" fill="rgba(218,178,86,0.25)" stroke="currentColor" stroke-width="1.3"/>
  `,
};

const UI_SIGILS = {
  coin: `
    <circle cx="12" cy="12" r="8.5" fill="rgba(214,170,82,0.16)" stroke="currentColor" stroke-width="1.5"/>
    <polygon points="12,6.2 14,10 17.8,12 14,14 12,17.8 10,14 6.2,12 10,10" fill="none" stroke="currentColor" stroke-width="1.2"/>
  `,
  satchel: `
    <path d="M6,9 L18,9 L19.2,19.5 L4.8,19.5 Z" fill="rgba(186,142,78,0.15)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9,9 V6.8 C9,5.2 10.3,4 12,4 C13.7,4 15,5.2 15,6.8 V9" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5.5" y1="13" x2="18.5" y2="13" stroke="currentColor" stroke-width="1.2"/>
    <rect x="10.8" y="11.6" width="2.4" height="3" fill="currentColor"/>
  `,
  sun: `
    <circle cx="12" cy="12" r="4.2" fill="rgba(218,176,88,0.2)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12,3 V5.5 M12,18.5 V21 M3,12 H5.5 M18.5,12 H21 M5.6,5.6 L7.4,7.4 M16.6,16.6 L18.4,18.4 M18.4,5.6 L16.6,7.4 M7.4,16.6 L5.6,18.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `,
  scroll: `
    <path d="M7,4.5 H17.5 C18.6,4.5 19.5,5.4 19.5,6.5 V17.5 C19.5,18.9 18.4,20 17,20 H6.5 C5.4,20 4.5,19.1 4.5,18 V7 C4.5,5.6 5.6,4.5 7,4.5 Z" fill="rgba(214,188,138,0.12)" stroke="currentColor" stroke-width="1.5"/>
    <line x1="8.5" y1="9" x2="15.5" y2="9" stroke="currentColor" stroke-width="1.3"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5" stroke="currentColor" stroke-width="1.3"/><line x1="8.5" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="1.3"/>
  `,
  compass: `
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <polygon points="12,5.5 14.2,12 12,18.5 9.8,12" fill="rgba(218,176,88,0.28)" stroke="currentColor" stroke-width="1.2"/>
    <line x1="5.5" y1="12" x2="18.5" y2="12" stroke="currentColor" stroke-width="1" opacity="0.6"/>
  `,
  scale: `
    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5" y1="7.5" x2="19" y2="7.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M5,7.5 L3,13.5 H7 Z M19,7.5 L17,13.5 H21 Z" fill="rgba(218,176,88,0.2)" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <line x1="8.5" y1="20" x2="15.5" y2="20" stroke="currentColor" stroke-width="1.6"/>
  `,
  seal: `
    <polygon points="12,3 14.6,6.4 18.8,5.2 17.6,9.4 21,12 17.6,14.6 18.8,18.8 14.6,17.6 12,21 9.4,17.6 5.2,18.8 6.4,14.6 3,12 6.4,9.4 5.2,5.2 9.4,6.4" fill="rgba(162,42,42,0.32)" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"/>
  `,
  charisma: `
    <polygon points="12,3.5 14.4,9 20.2,9.6 15.8,13.5 17.1,19.2 12,16.2 6.9,19.2 8.2,13.5 3.8,9.6 9.6,9" fill="rgba(214,170,82,0.2)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
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
};

export function renderItemSvg(itemId, size = 22) {
  const inner = ITEM_PATHS[itemId] || UI_SIGILS.satchel;
  return `<svg class="lotm-svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

export function renderSigil(name, size = 16) {
  const inner = UI_SIGILS[name] || UI_SIGILS.seal;
  return `<svg class="lotm-svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

export function renderSeljukStarDivider() {
  return `
    <div class="lotm-divider" aria-hidden="true">
      <span class="lotm-divider-line"></span>
      <svg width="14" height="14" viewBox="0 0 24 24" class="lotm-divider-star">
        <rect x="6" y="6" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <span class="lotm-divider-line"></span>
    </div>
  `;
}
