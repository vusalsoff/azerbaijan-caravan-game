import './style.css';
import '../UI/ui.css';
import { GameManager } from '../Scripts/GameManager.js';

const sceneRoot = document.getElementById('scene-root');
const uiRoot = document.getElementById('ui-root');

const game = new GameManager({
  sceneRoot,
  uiRoot,
});

// Debug access in browser DevTools
window.__CARAVAN_GAME__ = game;

game.start().catch((err) => {
  console.error('Oyun başladılarkən xəta:', err);
  sceneRoot.innerHTML = `<div style="padding:32px;color:#ffb4b4;font-family:sans-serif">
    <h2>Oyun yüklənmədi</h2>
    <pre>${err?.message || err}</pre>
  </div>`;
});
