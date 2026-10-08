import { messages } from './i18n.js';
import { SKINS, TRAILS, selected, nextUnlock } from '../game/unlocks.js';

const soundIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/><path class="sound-wave" d="M16 8q6 4 0 8M18 5q10 7 0 14"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
const leafIcon = '<svg viewBox="0 0 90 64" aria-hidden="true"><path d="M9 51C2 17 48 4 81 11c-2 31-32 56-66 43Z" fill="#a4b873" stroke="#53414c" stroke-width="3"/><path d="M9 59 63 24M28 43l-5-16m22 1 15 7" fill="none" stroke="#53414c" stroke-width="3" stroke-linecap="round"/></svg>';

export function createShell(root, art, actions) {
  root.innerHTML = `
    <aside class="brand-side" aria-label="Flappy Bugs">
      <div class="club-mark">${leafIcon}<span data-copy="eyebrow"></span></div>
      <h1>Flappy<br><span>Bugs<span class="title-dot">✳</span></span></h1>
      <p class="tagline" data-copy="tagline"></p>
      <div class="brand-beetle"><img src="${art.beetle.url}" alt=""/><span class="toot-label">pffft!</span></div>
      <p class="footer-note" data-copy="foot"></p>
      <p class="footer-note game-version">v${__GAME_VERSION__}</p>
    </aside>
    <main class="play-column">
      <div class="garden-frame" id="game-frame">
        <div class="canvas-host" id="canvas-host" aria-hidden="true"></div>
        <div class="hud">
          <div class="score-pill"><span data-copy="score"></span><strong id="score">0</strong></div>
          <div class="hearts" id="hearts" aria-label="3 hearts">♥ ♥ ♥</div>
          <button class="icon-button" id="pause-button">${pauseIcon}</button>
        </div>
        <div class="streak-status" id="streak-status" hidden></div>
        <div class="rush-status" id="rush-status" hidden>
          <span id="rush-label"></span><span id="rush-seconds"></span>
          <div class="rush-track"><span id="rush-fill"></span></div>
        </div>
        <div class="flight-pop" id="flight-pop" aria-live="off"></div>
        <div class="star-timer" id="star-timer" hidden></div>
        <div class="overlay" id="overlay">
          <div class="intro-heading" id="intro-heading"><span class="tiny-label" data-copy="ready"></span><h2 data-copy="title"></h2></div>
          <section class="panel" id="panel" aria-labelledby="panel-title">
            <span class="panel-flower" aria-hidden="true">✳</span>
            <h2 id="panel-title"></h2><p id="panel-description"></p>
            <div class="results" id="results" hidden>
              <div><span data-copy="score"></span><strong id="final-score">0</strong></div>
              <div><span data-copy="best"></span><strong id="final-best">0</strong></div>
              <div><span data-copy="bestStreak"></span><strong id="final-combo">0</strong></div>
            </div>
            <p class="new-best" id="new-best" data-copy="newBest" hidden></p>
            <button class="primary-button" id="action-button"></button>
            <div class="wardrobe" id="wardrobe">
              <span class="wardrobe-heading" data-copy="wardrobe"></span>
              <div class="wardrobe-choices">
                <button type="button" class="wardrobe-button" id="skin-button"></button>
                <button type="button" class="wardrobe-button" id="trail-button"></button>
              </div>
              <div class="achievement-list" id="achievement-list"></div>
              <p class="unlock-hint" id="unlock-hint"></p>
            </div>
            <span class="input-hint" id="input-hint" data-copy="hint"></span>
          </section>
        </div>
        <div class="bottom-tools">
          <button class="icon-button sound-button" id="sound-button">${soundIcon}</button>
          <span class="flight-hint" data-copy="controls"></span>
          <select id="language-select"><option value="en">EN</option><option value="zh">中文</option></select>
        </div>
      </div>
      <p class="save-status" id="save-status" role="status"></p>
    </main>
    <aside class="guide-side">
      <span class="tiny-label" data-copy="how"></span>
      <h2 data-copy="instruction"></h2><p class="guide-description" data-copy="instructionSub"></p>
      <div class="keyboard-hint"><span>SPACE</span><span>↗</span><span>TOOT!</span></div>
      <div class="guide-items">
        ${['heal', 'poison', 'star'].map(id => `<div class="guide-item"><img src="${art[id].url}" alt=""/><div><h3 data-copy="${id}"></h3><p data-copy="${id}Sub"></p></div></div>`).join('')}
      </div>
      <div class="best-note"><span data-copy="best"></span><strong id="side-best">0</strong><i aria-hidden="true">✦</i></div>
    </aside>`;
  const $ = id => root.querySelector(`#${id}`);
  let language = 'en', sound = true, platformMuted = false, lastMode;
  function setLanguage(value) {
    language = value === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    for (const el of root.querySelectorAll('[data-copy]')) el.textContent = messages(language)[el.dataset.copy];
    $('language-select').value = language;
    $('language-select').setAttribute('aria-label', messages(language).language);
    $('pause-button').setAttribute('aria-label', messages(language).pause);
    lastMode = undefined;
    setSound(sound, platformMuted);
  }
  function setSound(value, muted) {
    sound = value; platformMuted = muted;
    const label = messages(language)[muted ? 'muted' : value ? 'soundOn' : 'soundOff'];
    $('sound-button').setAttribute('aria-label', label);
    $('sound-button').title = label;
    $('sound-button').setAttribute('aria-pressed', String(value && !muted));
    $('sound-button').classList.toggle('is-muted', !value || muted);
    $('sound-button').disabled = muted;
  }
  function update(snapshot, { paused = false, best = 0, bestCombo = 0, skin = 'classic', trail = 'cloud', previousBest = best, loading = false, error = false } = {}) {
    const t = messages(language);
    const mode = error ? 'error' : loading ? 'loading' : paused ? 'paused' : snapshot.state;
    root.dataset.state = mode;
    $('game-frame').dataset.state = mode;
    $('score').textContent = snapshot.score;
    $('hearts').innerHTML = Array.from({ length: 3 }, (_, i) => `<span class="${i < snapshot.hp ? '' : 'lost'}">♥</span>`).join('');
    $('hearts').setAttribute('aria-label', `${snapshot.hp} / 3 ${language === 'zh' ? '颗心' : 'hearts'}`);
    $('side-best').textContent = best;
    $('final-combo').textContent = Math.max(bestCombo, snapshot.bestCombo);
    $('pause-button').disabled = mode !== 'playing';
    $('star-timer').hidden = snapshot.starTime <= 0 || mode !== 'playing';
    $('star-timer').textContent = `${t.stars} · ${snapshot.starTime.toFixed(1)}s`;
    $('streak-status').hidden = !snapshot.combo || mode !== 'playing' || snapshot.rushTime > 0;
    $('streak-status').textContent = `${t.streak} ×${snapshot.combo} · ${snapshot.rushCharge}/3`;
    $('rush-status').hidden = snapshot.rushTime <= 0 || mode !== 'playing';
    $('rush-label').textContent = t.rush;
    $('rush-seconds').textContent = `${snapshot.rushTime.toFixed(1)}s`;
    $('rush-fill').style.width = `${Math.max(0, snapshot.rushTime / 2.8) * 100}%`;
    $('wardrobe').hidden = mode !== 'ready' && mode !== 'gameover';
    const chosenSkin = selected(SKINS, skin, best);
    const chosenTrail = selected(TRAILS, trail, bestCombo);
    $('skin-button').textContent = `${t.skin}: ${chosenSkin.name} ↻`;
    $('trail-button').textContent = `${t.trail}: ${chosenTrail.name} ↻`;
    $('skin-button').style.setProperty('--swatch', chosenSkin.color);
    $('trail-button').style.setProperty('--swatch', chosenTrail.color);
    const nextSkin = nextUnlock(SKINS, best);
    const nextTrail = nextUnlock(TRAILS, bestCombo);
    $('unlock-hint').textContent = [
      nextSkin && `${t.nextSkin} ${nextSkin.need}`,
      nextTrail && `${t.nextTrail} ${nextTrail.need}`
    ].filter(Boolean).join(' · ') || t.allUnlocked;
    const badges = [
      [best >= 1, t.badgeFirst],
      [bestCombo >= 3, t.badgeRush],
      [best >= 15, t.badgeMaster],
    ];
    $('achievement-list').replaceChildren(...badges.map(([earned, label]) => {
      const tag = document.createElement('span');
      tag.className = earned ? 'earned' : 'locked';
      tag.textContent = `${earned ? '✦' : '◇'} ${label}`;
      return tag;
    }));
    $('overlay').hidden = mode === 'playing';
    if (lastMode !== mode) {
      $('intro-heading').hidden = mode !== 'ready';
      $('results').hidden = mode !== 'gameover';
      $('new-best').hidden = mode !== 'gameover' || snapshot.score <= previousBest;
      $('input-hint').hidden = mode === 'loading' || mode === 'error';
      $('action-button').disabled = mode === 'loading';
      $('panel-title').textContent = t[mode === 'error' ? 'error' : mode === 'loading' ? 'loading' : mode === 'paused' ? 'paused' : mode === 'gameover' ? 'over' : 'intro'];
      $('panel-description').textContent = mode === 'loading' ? '' : t[mode === 'error' ? 'errorSub' : mode === 'paused' ? 'pausedSub' : mode === 'gameover' ? 'overSub' : 'introSub'];
      $('action-button').textContent = t[mode === 'error' ? 'reload' : mode === 'loading' ? 'loading' : mode === 'paused' ? 'resume' : mode === 'gameover' ? 'retry' : 'play'];
      lastMode = mode;
    }
    $('final-score').textContent = snapshot.score;
    $('final-best').textContent = best;
  }
  const handlers = [
    [$('action-button'), 'click', actions.action], [$('pause-button'), 'click', actions.pause],
    [$('sound-button'), 'click', actions.sound],
    [$('skin-button'), 'click', actions.skin], [$('trail-button'), 'click', actions.trail],
    [$('language-select'), 'change', e => actions.language(e.target.value)],
  ];
  for (const [el, type, handler] of handlers) el.addEventListener(type, handler);
  setLanguage('en');
  return {
    frame: $('game-frame'), host: $('canvas-host'), update, setLanguage, setSound,
    announce(events) {
      const event = [...events].reverse().find(item => item.type === 'rush-start' || item.type === 'perfect');
      if (!event) return;
      const el = $('flight-pop');
      el.textContent = event.type === 'rush-start' ? messages(language).rush : `${messages(language).perfect} ×${event.combo}`;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    },
    saveStatus(failed) { $('save-status').textContent = failed ? messages(language).saveError : ''; },
    dispose() { for (const [el, type, handler] of handlers) el.removeEventListener(type, handler); },
  };
}
