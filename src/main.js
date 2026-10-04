import './ui/styles.css';
import { ART } from './art/manifest.js';
import { createGame } from './game/model.js';
import { createClock } from './game/clock.js';
import { createScene } from './render/scene.js';
import { createShell } from './ui/shell.js';
import { createAudio } from './audio/audio.js';
import { createPlatform } from './platform/index.js';

const root = document.querySelector('#app');
const game = createGame(), clock = createClock(), audio = createAudio();
let platform, view, best = 0, previousBest = 0, userSound = true, platformMuted = false;
let language = 'en', paused = false, pauseReason = null, loading = true, failed = false;
let frameId, disposed = false, sdkPlaying = false, saveFailed = false;
const shell = createShell(root, ART, { action, pause: () => pause('manual'), sound: toggleSound, language: changeLanguage });

function refresh() {
  shell.update(game.getSnapshot(), { paused, best, previousBest, loading, error: failed });
  shell.setSound(userSound, platformMuted);
}
async function save(patch) {
  try { await platform.saveProgress(patch); saveFailed = false; }
  catch { saveFailed = true; }
  if (!disposed) shell.saveStatus(saveFailed);
}
function syncAudio() {
  const snapshot = game.getSnapshot();
  audio.setMuted(userSound, platformMuted);
  audio.setPlaying(snapshot.state === 'playing' && !paused && !failed && !document.hidden, snapshot.starTime > 0);
}
function setGameplay(value) {
  try {
    if (value) platform.gameplayStart(); else platform.gameplayStop();
    sdkPlaying = value; return true;
  } catch (error) {
    failed = true; audio.setPlaying(false); audio.suspend(); clock.reset();
    console.error('Flappy Bugs platform lifecycle failed:', error); refresh(); return false;
  }
}
function consume() {
  const snapshot = game.getSnapshot(), events = game.drainEvents();
  view?.consume(events, snapshot);
  for (const event of events) {
    if (event.type === 'start') {
      previousBest = best;
      if (!setGameplay(true)) return;
    }
    if (event.type === 'gameover') {
      best = Math.max(best, event.score); void save({ best });
      if (!setGameplay(false)) return;
    }
  }
  // A new run stops previous scheduled sources before its first toot is played.
  syncAudio(); audio.consume(events); refresh();
}
function action() {
  if (failed) { window.location.reload(); return; }
  if (loading || disposed || document.hidden) return;
  void audio.unlock();
  if (paused) {
    paused = false; pauseReason = null; clock.reset(performance.now());
    if (!sdkPlaying && !setGameplay(true)) return;
    if (saveFailed) void save({ best, sound: userSound, language });
    syncAudio(); refresh(); return;
  }
  const snapshot = game.getSnapshot();
  if (snapshot.state === 'ready' || snapshot.state === 'gameover') { game.start(); clock.reset(performance.now()); }
  else game.flap();
  consume();
}
function pause(reason) {
  if (loading || failed || paused || game.getSnapshot().state !== 'playing') return;
  paused = true; pauseReason = reason; clock.reset(); audio.setPlaying(false); audio.suspend();
  // CrazyGames handles focus/area leaving. Local freezing does not duplicate its events.
  if (reason !== 'hidden') setGameplay(false);
  refresh();
}
function toggleSound() {
  if (platformMuted || loading || failed) return;
  userSound = !userSound; void audio.unlock(); syncAudio(); refresh(); void save({ sound: userSound });
}
function changeLanguage(value) {
  language = value; shell.setLanguage(language); refresh();
  if (platform) void save({ language });
}
function onPointer(event) {
  if (event.target.closest('button,select,.panel,.bottom-tools,.hud') || !event.isPrimary || event.button !== 0) return;
  event.preventDefault(); action();
}
function onKey(event) {
  if (event.code === 'Escape' && !event.repeat) { pause('manual'); return; }
  if (!['Space', 'ArrowUp'].includes(event.code) || event.repeat || event.target.closest('button,select,input,textarea,[contenteditable]')) return;
  event.preventDefault(); action();
}
function onVisibility() {
  clock.reset();
  if (document.hidden) { pause('hidden'); audio.suspend(); }
  else refresh();
}
function onGestureEnd() { if (!loading && !failed && !paused && !document.hidden) void audio.unlock(); }
shell.frame.addEventListener('pointerdown', onPointer);
window.addEventListener('keydown', onKey);
document.addEventListener('visibilitychange', onVisibility);
document.addEventListener('pointerup', onGestureEnd);
refresh();

async function boot() {
  try {
    platform = await createPlatform({
      mode: import.meta.env.VITE_PLATFORM || 'standalone',
      onSettings(settings) { platformMuted = settings.muteAudio; syncAudio(); refresh(); },
    });
    if (disposed) { platform.dispose(); return; }
    platform.loadingStart?.();
    const progress = await platform.loadProgress();
    if (disposed) return;
    best = previousBest = progress.best; userSound = progress.sound; language = progress.language;
    shell.setLanguage(language); refresh();
    view = await createScene(shell.host, { debug: import.meta.env.DEV && new URLSearchParams(location.search).has('debug') });
    if (disposed) { view.dispose(); return; }
    view.consume([], game.getSnapshot()); view.render(game.getSnapshot());
    loading = false; platform.loadingStop?.(); syncAudio(); refresh();
    if (import.meta.env.DEV) {
      window.__FLAPPYBUGS_DEBUG__ = Object.freeze({ snapshot: () => game.getSnapshot(), paused: () => ({ paused, reason: pauseReason }) });
    }
    function frame(timestamp) {
      if (disposed) return;
      const running = !paused && !failed && !document.hidden && game.getSnapshot().state === 'playing';
      const { dt, interrupted } = clock.advance(timestamp, step => { if (running) game.step(step); });
      if (interrupted && running) pause('interrupted');
      consume();
      view.render(game.getSnapshot(), paused || failed || document.hidden ? 0 : dt);
      audio.tick(); frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
  } catch (error) {
    if (disposed) return;
    failed = true; loading = false;
    console.error('Flappy Bugs initialization failed:', error);
    try { platform?.loadingStop?.(); } catch {}
    syncAudio(); refresh();
  }
}
function dispose() {
  if (disposed) return;
  disposed = true; cancelAnimationFrame(frameId);
  shell.frame.removeEventListener('pointerdown', onPointer);
  window.removeEventListener('keydown', onKey);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('pointerup', onGestureEnd);
  if (sdkPlaying) { try { platform?.gameplayStop(); } catch {} }
  view?.dispose(); shell.dispose(); audio.dispose(); platform?.dispose();
  if (import.meta.env.DEV) delete window.__FLAPPYBUGS_DEBUG__;
}
void boot();
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); else { pause('hidden'); audio.suspend(); } });
