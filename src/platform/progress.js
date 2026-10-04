export const PROGRESS_KEY = 'flappybugs:v1:progress';
const DEFAULT_PROGRESS = Object.freeze({ best: 0, sound: true, language: 'en' });

function validPatch(value) {
  const patch = {};
  if (!value || typeof value !== 'object') return patch;
  if (Number.isSafeInteger(value.best) && value.best >= 0) patch.best = value.best;
  if (typeof value.sound === 'boolean') patch.sound = value.sound;
  if (value.language === 'en' || value.language === 'zh') patch.language = value.language;
  return patch;
}

function decode(raw) {
  if (raw === null || raw === undefined) return { ...DEFAULT_PROGRESS };
  try {
    return { ...DEFAULT_PROGRESS, ...validPatch(JSON.parse(raw)) };
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

  async function ensureLoaded() {
    if (!loaded) {
      progress = decode(await read(PROGRESS_KEY));
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
        return { ...progress };
      });
    },
    saveProgress(value) {
      const patch = validPatch(value);
      return enqueue(async () => {
        await ensureLoaded();
        // Another tab may have saved a higher score since our initial read.
        const persisted = decode(await read(PROGRESS_KEY));
        progress = {
          ...progress,
          ...patch,
          best: Math.max(progress.best, persisted.best, patch.best ?? 0),
        };
        const saved = await write(PROGRESS_KEY, JSON.stringify(progress));
        return { saved, progress: { ...progress } };
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
