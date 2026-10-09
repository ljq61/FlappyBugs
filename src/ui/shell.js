import { messages } from './i18n.js';
import { SKINS, TRAILS, selected, isUnlocked, unlockProgress } from '../game/unlocks.js';

const soundIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/><path class="sound-wave" d="M16 8q6 4 0 8M18 5q10 7 0 14"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
const homeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>';
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
          <div class="intro-heading" id="intro-heading"><span class="tiny-label" data-copy="ready"></span><h2 id="game-title"><img id="title-wordmark" width="400" height="184" alt="" aria-hidden="true"/></h2></div>
          <section class="panel" id="panel" aria-labelledby="panel-title">
            <span class="panel-flower" aria-hidden="true">✳</span>
            <h2 id="panel-title"></h2><p id="panel-description"></p>
            <div class="results" id="results" hidden>
              <div class="result-current"><span data-copy="runScore"></span><strong id="final-score">0</strong><small data-copy="thisFlight"></small></div>
              <div class="result-record"><span><i aria-hidden="true">♛</i> <b data-copy="personalBest"></b></span><strong id="final-best">0</strong><small data-copy="allFlights"></small></div>
              <div class="result-streak"><span><i aria-hidden="true">✦</i> <b data-copy="bestStreak"></b></span><strong id="final-combo">0</strong><small data-copy="perfectChain"></small></div>
            </div>
            <p class="new-best" id="new-best" data-copy="newBest" hidden></p>
            <div class="panel-actions"><button class="primary-button" id="action-button"></button><button type="button" class="icon-button home-button" id="home-button" hidden>${homeIcon}</button></div>
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
        <section class="collection-panel" id="collection" role="dialog" aria-modal="true" aria-labelledby="collection-title" hidden>
          <header><h2 id="collection-title"></h2><button type="button" id="collection-close">×</button></header>
          <p id="collection-description"></p>
          <div class="collection-items" id="collection-items"></div>
        </section>
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
  let language = 'en', sound = true, platformMuted = false, lastMode, lastLook;
  let collectionKind = null, lastCollection, collectionRecords = {}, chosen = {};
  const nameOf = item => language === 'zh' ? item.nameZh : item.name;
  function closeCollection() {
    const kind = collectionKind;
    collectionKind = null; $('collection').hidden = true;
    $('overlay').inert = false; root.querySelector('.bottom-tools').inert = false;
    if (kind) $(`${kind}-button`).focus();
  }
  function renderCollection() {
    if (!collectionKind) return;
    const t = messages(language), items = collectionKind === 'skin' ? SKINS : TRAILS;
    const key = `${collectionKind}:${language}:${chosen[collectionKind]}:${JSON.stringify(collectionRecords)}`;
    if (key === lastCollection) return;
    const focusedLook = $('collection-items').contains(document.activeElement) ? document.activeElement.dataset.look : null;
    $('collection-title').textContent = collectionKind === 'skin' ? t.skinCollection : t.trailCollection;
    $('collection-description').textContent = t.collectionSub;
    $('collection-close').setAttribute('aria-label', t.closeCollection);
    $('collection-items').innerHTML = items.map(item => {
      const unlocked = isUnlocked(item, collectionRecords), progress = unlockProgress(item, collectionRecords);
      const active = chosen[collectionKind] === item.id;
      const preview = collectionKind === 'skin' ? `skin-${item.id}` : item.preview;
      const requirement = item.need ? `${t[`require_${item.metric}`]} ${item.need}` : t.defaultLook;
      const status = active ? t.equipped : unlocked ? t.equip : t.locked;
      return `<button type="button" class="collection-item ${unlocked ? 'earned' : 'locked'} ${active ? 'selected' : ''}" data-look="${item.id}" ${unlocked ? '' : 'disabled'} aria-pressed="${active}"><img src="${art[preview].url}" alt=""/><span class="collection-copy"><strong>${nameOf(item)}</strong><span>${requirement}</span>${item.need ? `<span class="collection-progress" aria-label="${progress.current} / ${progress.target}"><span style="width:${progress.ratio * 100}%"></span></span><small>${progress.current} / ${progress.target}</small>` : ''}</span><span class="collection-status">${unlocked ? '' : '▣ '}${status}</span></button>`;
    }).join('');
    if (focusedLook) $('collection-items').querySelector(`[data-look="${focusedLook}"]:not(:disabled)`)?.focus();
    lastCollection = key;
  }
  function openCollection(kind) {
    if (!['ready', 'gameover'].includes(lastMode)) return;
    collectionKind = kind; lastCollection = undefined;
    renderCollection(); $('collection').hidden = false;
    $('overlay').inert = true; root.querySelector('.bottom-tools').inert = true;
    $('collection-close').focus();
  }
  function setLanguage(value) {
    language = value === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    for (const el of root.querySelectorAll('[data-copy]')) el.textContent = messages(language)[el.dataset.copy];
    $('language-select').value = language;
    $('language-select').setAttribute('aria-label', messages(language).language);
    $('game-title').setAttribute('aria-label', messages(language).title);
    $('title-wordmark').src = art[`title-${language}`].url;
    $('pause-button').setAttribute('aria-label', messages(language).pause);
    $('home-button').setAttribute('aria-label', messages(language).home);
    $('home-button').title = messages(language).home;
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
  function update(snapshot, { paused = false, best = 0, bestCombo = 0, totalPassed = 0, skin = 'classic', trail = 'cloud', previousBest = best, loading = false, error = false } = {}) {
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
    $('home-button').hidden = mode !== 'gameover';
    $('star-timer').hidden = snapshot.starTime <= 0 || mode !== 'playing';
    $('star-timer').textContent = `${t.stars} · ${snapshot.starTime.toFixed(1)}s`;
    $('streak-status').hidden = !snapshot.combo || mode !== 'playing' || snapshot.rushTime > 0;
    $('streak-status').textContent = `${t.streak} ×${snapshot.combo} · ${snapshot.rushCharge}/3`;
    $('rush-status').hidden = snapshot.rushTime <= 0 || mode !== 'playing';
    $('rush-label').textContent = t.rush;
    $('rush-seconds').textContent = `${snapshot.rushTime.toFixed(1)}s`;
    $('rush-fill').style.width = `${Math.max(0, snapshot.rushTime / 2.8) * 100}%`;
    $('wardrobe').hidden = mode !== 'ready' && mode !== 'gameover';
    collectionRecords = { best, bestCombo, totalPassed };
    const chosenSkin = selected(SKINS, skin, collectionRecords);
    const chosenTrail = selected(TRAILS, trail, collectionRecords);
    chosen = { skin: chosenSkin.id, trail: chosenTrail.id };
    const look = `${language}:${chosenSkin.id}:${chosenTrail.id}`;
    if (look !== lastLook) {
      for (const [id, label, item, preview] of [
        ['skin-button', t.skin, chosenSkin, `skin-${chosenSkin.id}`],
        ['trail-button', t.trail, chosenTrail, chosenTrail.preview],
      ]) {
        const name = nameOf(item);
        const button = $(id);
        button.innerHTML = `<img class="wardrobe-preview" src="${art[preview].url}" alt="" width="40" height="40"/><span class="wardrobe-copy"><span>${label}</span><strong>${name}</strong></span><span class="wardrobe-cycle" aria-hidden="true">›</span>`;
        button.setAttribute('aria-label', `${label}: ${name}`);
        button.title = `${label}: ${name}`;
      }
      lastLook = look;
    }
    $('unlock-hint').textContent = `${t.totalGates} ${totalPassed} · ${t.viewUnlocks}`;
    if (collectionKind && !['ready', 'gameover'].includes(mode)) closeCollection();
    renderCollection();
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
    [$('home-button'), 'click', () => { actions.home(); if (lastMode === 'ready') $('action-button').focus(); }],
    [$('sound-button'), 'click', actions.sound],
    [$('skin-button'), 'click', () => openCollection('skin')], [$('trail-button'), 'click', () => openCollection('trail')],
    [$('collection-close'), 'click', closeCollection],
    [$('collection-items'), 'click', event => {
      const button = event.target.closest('[data-look]');
      if (!button || button.disabled) return;
      const kind = collectionKind;
      actions[kind](button.dataset.look); closeCollection();
    }],
    [$('collection'), 'keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); closeCollection(); }
      if (event.key === 'Tab') {
        const buttons = [...$('collection').querySelectorAll('button:not(:disabled)')];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }],
    [$('language-select'), 'change', e => actions.language(e.target.value)],
  ];
  for (const [el, type, handler] of handlers) el.addEventListener(type, handler);
  setLanguage('en');
  return {
    frame: $('game-frame'), host: $('canvas-host'), update, setLanguage, setSound,
    isCollectionOpen: () => collectionKind !== null,
    closeCollection,
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
