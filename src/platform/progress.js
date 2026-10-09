import { SKINS, TRAILS } from '../game/unlocks.js';

export const PROGRESS_KEY = 'flappybugs:v1:progress';
const DEFAULT_PROGRESS = Object.freeze({ best: 0, totalPassed: 0, sound: true, language: 'en' });
const RUN_LIMIT = 64;
const validCount = value => Number.isSafeInteger(value) && value >= 0;

function gateRuns(value) {
  const runs = new Map();
  if (!Array.isArray(value)) return runs;
  for (const run of value) {
    if (run && typeof run.id === 'string' && run.id.trim() && run.id.length <= 128 && validCount(run.passed)) {
      runs.set(run.id, Math.max(runs.get(run.id) ?? 0, run.passed));
    }
  }
  return runs;
}

function runSnapshot(runs) {
  return [...runs].slice(-RUN_LIMIT).map(([id, passed]) => ({ id, passed }));
}

function copyProgress(progress) {
  return { ...progress, ...(progress.gateRuns ? { gateRuns: progress.gateRuns.map(run => ({ ...run })) } : {}) };
}

function validPatch(value) {
  const patch = {};
  if (!value || typeof value !== 'object') return patch;
  if (Number.isSafeInteger(value.best) && value.best >= 0) patch.best = value.best;
  if (typeof value.sound === 'boolean') patch.sound = value.sound;
  if (value.language === 'en' || value.language === 'zh') patch.language = value.language;
  if (Number.isSafeInteger(value.bestCombo) && value.bestCombo >= 0) patch.bestCombo = value.bestCombo;
  if (SKINS.some(skin => skin.id === value.skin)) patch.skin = value.skin;
  if (TRAILS.some(trail => trail.id === value.trail)) patch.trail = value.trail;
  return patch;
}

function decode(raw) {
  if (raw === null || raw === undefined) return { ...DEFAULT_PROGRESS };
  try {
    const value = JSON.parse(raw);
    const result = { ...DEFAULT_PROGRESS, ...validPatch(value) };
    // An old best proves at least this many gates, but no other historical runs.
    result.totalPassed = validCount(value?.totalPassed) ? value.totalPassed : result.best;
    if (Array.isArray(value?.gateRuns)) result.gateRuns = runSnapshot(gateRuns(value.gateRuns));
    return result;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

// One queue also serializes reads: a late initial read cannot overwrite a save.
export function createProgressStore({ read, write }) {
  let progress = { ...DEFAULT_PROGRESS };
  let loaded = false;
  let queue = Promise.resolve();
  let disposed = false;
  let confirmed = progress;
  const pendingRuns = new Map();

  async function ensureLoaded() {
    if (!loaded) {
      progress = decode(await read(PROGRESS_KEY));
      confirmed = progress;
      loaded = true;
    }
  }

  function enqueue(operation) {
    const result = queue.then(async () => {
      if (disposed) throw new Error('Platform adapter has been disposed');
      return operation();
    });
    queue = result.catch(() => {});
    return result;
  }

  return {
    loadProgress() {
      return enqueue(async () => {
        await ensureLoaded();
        return copyProgress(progress);
      });
    },
    saveProgress(value) {
      const patch = validPatch(value);
      const checkpoints = gateRuns(value?.gateRuns);
      return enqueue(async () => {
        await ensureLoaded();
        for (const [id, passed] of checkpoints) {
          pendingRuns.set(id, Math.max(pendingRuns.get(id) ?? 0, passed));
        }
        // Preserve sequential external saves. ponytail: read/write is not atomic
        // across tabs/devices; retained-run idempotency covers the last 64 runs.
        const persisted = decode(await read(PROGRESS_KEY));
        const runs = gateRuns(confirmed.gateRuns);
        for (const [id, passed] of gateRuns(persisted.gateRuns)) {
          runs.set(id, Math.max(runs.get(id) ?? 0, passed));
        }
        let totalPassed = Math.max(confirmed.totalPassed, persisted.totalPassed);
        for (const [id, passed] of pendingRuns) {
          const previous = runs.get(id) ?? 0;
          totalPassed = Math.min(Number.MAX_SAFE_INTEGER, totalPassed + Math.max(0, passed - previous));
          if (passed > previous || !runs.has(id)) {
            runs.delete(id);
            runs.set(id, passed);
          }
        }
        progress = {
          ...progress,
          ...patch,
          best: Math.max(progress.best, persisted.best, patch.best ?? 0),
          totalPassed: Math.max(totalPassed, progress.best, persisted.best, patch.best ?? 0),
          ...(runs.size ? { gateRuns: runSnapshot(runs) } : {}),
          ...(progress.bestCombo !== undefined || persisted.bestCombo !== undefined || patch.bestCombo !== undefined
            ? { bestCombo: Math.max(progress.bestCombo ?? 0, persisted.bestCombo ?? 0, patch.bestCombo ?? 0) } : {}),
        };
        const saved = await write(PROGRESS_KEY, JSON.stringify(progress));
        confirmed = progress;
        pendingRuns.clear();
        return { saved, progress: copyProgress(progress) };
      });
    },
    dispose() {
      disposed = true;
    },
  };
}

export function createLifecycle(game = {}) {
  let playing = false;
  let loading = false;
  let disposed = false;
  return {
    gameplayStart() {
      if (disposed || playing) return false;
      game.gameplayStart?.();
      playing = true;
      return true;
    },
    gameplayStop() {
      if (disposed || !playing) return false;
      game.gameplayStop?.();
      playing = false;
      return true;
    },
    loadingStart() {
      if (disposed || loading) return false;
      game.loadingStart?.();
      loading = true;
      return true;
    },
    loadingStop() {
      if (disposed || !loading) return false;
      game.loadingStop?.();
      loading = false;
      return true;
    },
    dispose() {
      disposed = true;
    },
  };
}
