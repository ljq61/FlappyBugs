import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from '../src/platform/index.js';
import { loadCrazyGamesSdk, SDK_URL } from '../src/platform/crazygames.js';
import { PROGRESS_KEY } from '../src/platform/progress.js';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function sdkStub({ initial, muteAudio = false, environment = 'crazygames' } = {}) {
  const calls = [];
  const listeners = new Set();
  const data = storage(initial);
  return {
    calls, listeners, data, environment,
    async init() { calls.push('init'); },
    game: {
      settings: { muteAudio },
      gameplayStart() { calls.push('start'); },
      gameplayStop() { calls.push('stop'); },
      loadingStart() { calls.push('loadingStart'); },
      loadingStop() { calls.push('loadingStop'); },
      addSettingsChangeListener(listener) { listeners.add(listener); },
      removeSettingsChangeListener(listener) { listeners.delete(listener); },
    },
    changeSettings(value) {
      this.game.settings = value;
      for (const listener of listeners) listener(value);
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('standalone defaults never call SDK loader and persist across adapters', async () => {
  const data = storage();
  let loads = 0;
  const platform = await createPlatform({ storage: data, loader: () => { loads++; } });
  assert.equal(platform.kind, 'standalone');
  assert.equal(loads, 0);
  assert.deepEqual(await platform.loadProgress(), { best: 0, totalPassed: 0, sound: true, language: 'en' });
  const saved = await platform.saveProgress({ best: 17, sound: false, language: 'zh' });
  assert.equal(saved.saved, 'local');
  const next = await createPlatform({ storage: data });
  assert.deepEqual(await next.loadProgress(), { best: 17, totalPassed: 17, sound: false, language: 'zh' });
});

test('standalone blocked reads and writes fall back to session memory', async () => {
  for (const blocked of ['getItem', 'setItem']) {
    const data = storage();
    data[blocked] = () => { throw new Error('denied'); };
    const platform = await createPlatform({ storage: data });
    const saved = await platform.saveProgress({ best: 9 });
    assert.equal(saved.saved, 'memory');
    assert.equal((await platform.loadProgress()).best, 9);
  }
});

test('invalid or corrupt stored data cannot inject invalid state', async () => {
  for (const raw of ['broken', 'null', '{"best":-1,"sound":1,"language":"unknown"}', '{"best":1e100}']) {
    const platform = await createPlatform({ storage: storage({ [PROGRESS_KEY]: raw }) });
    assert.deepEqual(await platform.loadProgress(), { best: 0, totalPassed: 0, sound: true, language: 'en' });
    assert.equal((await platform.saveProgress({ best: NaN })).progress.best, 0);
  }
});

test('unknown mode rejects instead of selecting a fallback', async () => {
  await assert.rejects(createPlatform({ mode: 'other' }), /Unknown platform mode/);
});

test('CrazyGames awaits initialization before settings or Data access', async () => {
  const sdk = sdkStub();
  const gate = deferred();
  let read = false;
  sdk.init = () => gate.promise;
  sdk.data.getItem = () => { read = true; return null; };
  const creating = createPlatform({ mode: 'crazygames', sdk });
  await Promise.resolve();
  assert.equal(read, false);
  assert.equal(sdk.listeners.size, 0);
  gate.resolve();
  const platform = await creating;
  await platform.loadProgress();
  assert.equal(read, true);
});

test('CrazyGames initialization, timeout, disabled and missing module errors surface', async () => {
  const sdk = sdkStub();
  sdk.init = async () => { throw new Error('offline'); };
  await assert.rejects(createPlatform({ mode: 'crazygames', sdk }), { code: 'sdk-init' });
  sdk.init = () => new Promise(() => {});
  await assert.rejects(createPlatform({ mode: 'crazygames', sdk, timeoutMs: 5 }), { code: 'sdk-init' });
  await assert.rejects(createPlatform({ mode: 'crazygames', sdk: sdkStub({ environment: 'disabled' }) }), { code: 'sdk-environment' });
  const incomplete = sdkStub();
  delete incomplete.data;
  await assert.rejects(createPlatform({ mode: 'crazygames', sdk: incomplete }), { code: 'sdk-contract' });
});

test('gameplay and loading events deduplicate and do not depend on focus', async () => {
  const sdk = sdkStub();
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  platform.gameplayStop();
  platform.gameplayStart();
  platform.gameplayStart();
  platform.loadingStart();
  platform.loadingStart();
  platform.loadingStop();
  platform.loadingStop();
  platform.gameplayStop();
  platform.gameplayStop();
  platform.gameplayStart();
  assert.deepEqual(sdk.calls, ['init', 'start', 'loadingStart', 'loadingStop', 'stop', 'start']);
  platform.dispose();
  assert.equal(platform.gameplayStop(), false);
});

test('failed synchronous lifecycle call remains retryable', async () => {
  const sdk = sdkStub();
  let attempts = 0;
  sdk.game.gameplayStart = () => {
    if (++attempts === 1) throw new Error('temporary');
  };
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  assert.throws(() => platform.gameplayStart(), /temporary/);
  assert.equal(platform.gameplayStart(), true);
  assert.equal(platform.gameplayStart(), false);
});

test('platform mute wins over saved user preference, updates and unsubscribes', async () => {
  const sdk = sdkStub({ muteAudio: true });
  const notifications = [];
  const platform = await createPlatform({ mode: 'crazygames', sdk, onSettings: settings => notifications.push(settings.muteAudio) });
  await platform.saveProgress({ sound: true });
  const progress = await platform.loadProgress();
  assert.equal(progress.sound && !platform.getSettings().muteAudio, false);
  const extra = [];
  const unsubscribe = platform.subscribeSettings(settings => extra.push(settings.muteAudio));
  sdk.changeSettings({ muteAudio: false });
  assert.equal(progress.sound && !platform.getSettings().muteAudio, true);
  unsubscribe();
  sdk.changeSettings({ muteAudio: true });
  assert.deepEqual(notifications, [true, false, true]);
  assert.deepEqual(extra, [true, false]);
  platform.dispose();
  platform.dispose();
  assert.equal(sdk.listeners.size, 0);
  await assert.rejects(platform.saveProgress({ best: 2 }), /disposed/);
});

test('save before initial load reads existing best and validates snapshots', async () => {
  const sdk = sdkStub({ initial: { [PROGRESS_KEY]: JSON.stringify({ best: 40, sound: false, language: 'zh' }) } });
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  const saved = await platform.saveProgress({ best: 5, language: 'en' });
  assert.equal(saved.saved, 'platform');
  assert.deepEqual(saved.progress, { best: 40, totalPassed: 40, sound: false, language: 'en' });
  assert.equal(sdk.data.values.size, 1);
});

test('slow initial read and out-of-order score snapshots serialize without data loss', async () => {
  const sdk = sdkStub();
  const firstRead = deferred();
  const firstWrite = deferred();
  const writes = [];
  let reads = 0;
  sdk.data.getItem = () => ++reads === 1 ? firstRead.promise : null;
  sdk.data.setItem = async (_, value) => {
    writes.push(JSON.parse(value));
    if (writes.length === 1) await firstWrite.promise;
  };
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  const loading = platform.loadProgress();
  const high = platform.saveProgress({ best: 30, sound: false });
  const stale = platform.saveProgress({ best: 3, language: 'zh' });
  firstRead.resolve(JSON.stringify({ best: 22, sound: true, language: 'en' }));
  assert.equal((await loading).best, 22);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes.length, 1);
  firstWrite.resolve();
  await Promise.all([high, stale]);
  assert.deepEqual(writes, [
    { best: 30, totalPassed: 30, sound: false, language: 'en' },
    { best: 30, totalPassed: 30, sound: false, language: 'zh' },
  ]);
  assert.deepEqual(await platform.loadProgress(), writes[1]);
});

test('score from another tab is preserved by pre-write reread', async () => {
  const sdk = sdkStub();
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  await platform.loadProgress();
  sdk.data.setItem(PROGRESS_KEY, JSON.stringify({ best: 90 }));
  assert.equal((await platform.saveProgress({ best: 10 })).progress.best, 90);
});

test('Data read failures block writes and can retry; write failures reject and retain best', async () => {
  const sdk = sdkStub();
  const read = sdk.data.getItem;
  let writes = 0;
  const write = sdk.data.setItem;
  sdk.data.getItem = () => { throw new Error('data disabled'); };
  sdk.data.setItem = (key, value) => { writes++; write(key, value); };
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  await assert.rejects(platform.saveProgress({ best: 8 }), /data disabled/);
  assert.equal(writes, 0);
  sdk.data.getItem = read;
  sdk.data.setItem = async () => { throw new Error('quota'); };
  await assert.rejects(platform.saveProgress({ best: 18 }), /quota/);
  sdk.data.setItem = write;
  assert.equal((await platform.saveProgress({ best: 2 })).progress.best, 18);
});

test('SDK script loader shares a pending request, removes failures, and retries', async () => {
  const windowObject = {};
  const scripts = [];
  const documentObject = {
    head: { appendChild(script) { scripts.push(script); } },
    createElement() { return { remove() { this.removed = true; } }; },
  };
  const first = loadCrazyGamesSdk({ windowObject, documentObject });
  const duplicate = loadCrazyGamesSdk({ windowObject, documentObject });
  assert.equal(first, duplicate);
  assert.equal(scripts[0].src, SDK_URL);
  scripts[0].onerror();
  await assert.rejects(first, { code: 'sdk-load' });
  assert.equal(scripts[0].removed, true);
  const retry = loadCrazyGamesSdk({ windowObject, documentObject });
  assert.equal(scripts.length, 2);
  const sdk = sdkStub();
  windowObject.CrazyGames = { SDK: sdk };
  scripts[1].onload();
  assert.equal(await retry, sdk);
});

test('SDK script timeout rejects and clears its failed element', async () => {
  let script;
  const documentObject = {
    head: { appendChild(value) { script = value; } },
    createElement() { return { remove() { this.removed = true; } }; },
  };
  await assert.rejects(loadCrazyGamesSdk({ documentObject, windowObject: {}, timeoutMs: 5 }), { code: 'sdk-load' });
  assert.equal(script.removed, true);
});

test('legacy saves support new best-streak and cosmetic rewards without discarding old best', async () => {
  const data = storage({ [PROGRESS_KEY]: JSON.stringify({ best: 8, sound: false, language: 'zh' }) });
  const platform = await createPlatform({ storage: data });
  const old = await platform.loadProgress();
  assert.equal(old.bestCombo, undefined);
  const updated = await platform.saveProgress({ best: 4, bestCombo: 5, skin: 'mint', trail: 'sunny' });
  assert.equal(updated.progress.best, 8);
  assert.equal(updated.progress.bestCombo, 5);
  assert.equal(updated.progress.skin, 'mint');
  assert.equal(updated.progress.trail, 'sunny');
  const next = await createPlatform({ storage: data });
  assert.equal((await next.loadProgress()).bestCombo, 5);
  await next.saveProgress({ bestCombo: 1, skin: 'bogus', trail: 'bogus' });
  const final = await next.loadProgress();
  assert.equal(final.bestCombo, 5);
  assert.equal(final.skin, 'mint');
  assert.equal(final.trail, 'sunny');
});

test('total gates migrate conservatively from best and preserve newer lifetime totals', async () => {
  for (const [totalPassed, expected] of [[undefined, 23], [80, 80], [5, 5], [-1, 23], [1.5, 23], [1e100, 23]]) {
    const data = storage({ [PROGRESS_KEY]: JSON.stringify({ best: 23, bestCombo: 6, totalPassed, skin: 'mint', trail: 'sunny' }) });
    const platform = await createPlatform({ storage: data });
    const progress = await platform.loadProgress();
    assert.equal(progress.totalPassed, expected);
    assert.equal(progress.bestCombo, 6);
    assert.equal(progress.skin, 'mint');
    assert.equal(progress.trail, 'sunny');
  }
});

test('record updates and gate checkpoints in one save count each gate once', async () => {
  const platform = await createPlatform({ storage: storage() });
  for (let passed = 1; passed <= 4; passed++) {
    const result = await platform.saveProgress({ best: passed, gateRuns: [{ id: 'first', passed }] });
    assert.equal(result.progress.best, passed);
    assert.equal(result.progress.totalPassed, passed);
  }
  const next = await platform.saveProgress({ best: 2, gateRuns: [{ id: 'second', passed: 2 }] });
  assert.equal(next.progress.totalPassed, 6);
});

test('gate checkpoints are max-per-run and idempotent across reloads and stale snapshots', async () => {
  const data = storage();
  const platform = await createPlatform({ storage: data });
  await platform.saveProgress({ gateRuns: [{ id: 'run-a', passed: 3 }] });
  await platform.saveProgress({ gateRuns: [{ id: 'run-a', passed: 7 }, { id: 'run-b', passed: 6 }] });
  const next = await createPlatform({ storage: data });
  const result = await next.saveProgress({ totalPassed: 999, gateRuns: [{ id: 'run-a', passed: 2 }, { id: 'run-b', passed: 6 }] });
  assert.equal(result.progress.totalPassed, 13);
  assert.deepEqual(result.progress.gateRuns, [{ id: 'run-a', passed: 7 }, { id: 'run-b', passed: 6 }]);
});

test('invalid run checkpoints cannot change totals and duplicate ids use the highest value', async () => {
  const platform = await createPlatform({ storage: storage() });
  const gateRuns = [null, {}, { id: '', passed: 8 }, { id: '   ', passed: 8 }, { id: 9, passed: 8 },
    ...[-1, 2.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '4'].map(passed => ({ id: 'bad', passed })),
    { id: 'valid', passed: 3 }, { id: 'valid', passed: 6 }, { id: 'valid', passed: 4 }];
  const result = await platform.saveProgress({ gateRuns });
  assert.equal(result.progress.totalPassed, 6);
  assert.deepEqual(result.progress.gateRuns, [{ id: 'valid', passed: 6 }]);
  assert.equal((await platform.saveProgress({ gateRuns: {} })).progress.totalPassed, 6);
});

test('recent run ledger is bounded and total gates remain after older runs are retired', async () => {
  const data = storage();
  const platform = await createPlatform({ storage: data });
  for (let index = 0; index < 65; index++) {
    await platform.saveProgress({ gateRuns: [{ id: `run-${index}`, passed: 1 }] });
  }
  const result = await platform.saveProgress({ gateRuns: [{ id: 'run-64', passed: 3 }] });
  assert.equal(result.progress.totalPassed, 67);
  assert.equal(result.progress.gateRuns.length, 64);
  assert.equal(result.progress.gateRuns.some(run => run.id === 'run-0'), false);
  assert.equal((await (await createPlatform({ storage: data })).loadProgress()).totalPassed, 67);
});

test('sequential saves from another tab preserve lifetime total and per-run checkpoints', async () => {
  const data = storage();
  const first = await createPlatform({ storage: data });
  const second = await createPlatform({ storage: data });
  await Promise.all([first.loadProgress(), second.loadProgress()]);
  await first.saveProgress({ best: 5, gateRuns: [{ id: 'tab-a', passed: 5 }] });
  await second.saveProgress({ best: 7, gateRuns: [{ id: 'tab-b', passed: 7 }] });
  const result = await first.saveProgress({ best: 2, gateRuns: [{ id: 'tab-a', passed: 7 }] });
  assert.equal(result.progress.best, 7);
  assert.equal(result.progress.totalPassed, 14);
  assert.deepEqual(result.progress.gateRuns, [{ id: 'tab-b', passed: 7 }, { id: 'tab-a', passed: 7 }]);
});

test('failed platform writes retry pending checkpoints once even after an external save', async () => {
  const sdk = sdkStub();
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  const write = sdk.data.setItem;
  sdk.data.setItem = () => { throw new Error('quota'); };
  await assert.rejects(platform.saveProgress({ best: 4, gateRuns: [{ id: 'pending', passed: 4 }] }), /quota/);
  assert.equal((await platform.loadProgress()).totalPassed, 4);
  write(PROGRESS_KEY, JSON.stringify({ best: 6, totalPassed: 6, gateRuns: [{ id: 'other', passed: 6 }] }));
  sdk.data.setItem = write;
  const result = await platform.saveProgress({ gateRuns: [{ id: 'pending', passed: 4 }] });
  assert.equal(result.saved, 'platform');
  assert.equal(result.progress.totalPassed, 10);
  assert.equal((await platform.saveProgress({ gateRuns: [{ id: 'pending', passed: 4 }] })).progress.totalPassed, 10);
});

test('a write accepted before an error is not counted twice on retry', async () => {
  const sdk = sdkStub();
  const platform = await createPlatform({ mode: 'crazygames', sdk });
  const write = sdk.data.setItem;
  sdk.data.setItem = (key, value) => { write(key, value); throw new Error('after acceptance'); };
  await assert.rejects(platform.saveProgress({ gateRuns: [{ id: 'accepted', passed: 4 }] }), /after acceptance/);
  sdk.data.setItem = write;
  assert.equal((await platform.saveProgress({ gateRuns: [{ id: 'accepted', passed: 4 }] })).progress.totalPassed, 4);
});

test('gate totals saturate safely and caller snapshots cannot alter the ledger', async () => {
  const platform = await createPlatform({ storage: storage() });
  const input = [{ id: 'large', passed: Number.MAX_SAFE_INTEGER }];
  const saving = platform.saveProgress({ gateRuns: input });
  input[0].passed = 0;
  const result = await saving;
  result.progress.gateRuns[0].passed = 0;
  const next = await platform.saveProgress({ gateRuns: [{ id: 'small', passed: 1 }] });
  assert.equal(next.progress.totalPassed, Number.MAX_SAFE_INTEGER);
  assert.equal(next.progress.gateRuns[0].passed, Number.MAX_SAFE_INTEGER);
});
