import { createLifecycle, createProgressStore } from './progress.js';

export const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const loadingScripts = new WeakMap();

export class PlatformError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'PlatformError';
    this.code = code;
  }
}

export function loadCrazyGamesSdk({ windowObject = globalThis.window, documentObject = globalThis.document, timeoutMs = 15000 } = {}) {
  if (windowObject?.CrazyGames?.SDK) return Promise.resolve(windowObject.CrazyGames.SDK);
  if (!documentObject?.head) return Promise.reject(new PlatformError('sdk-load', 'CrazyGames SDK needs a browser document'));
  if (loadingScripts.has(documentObject)) return loadingScripts.get(documentObject);
  const pending = new Promise((resolve, reject) => {
    const script = documentObject.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    let timer;
    function finish(error) {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else if (windowObject?.CrazyGames?.SDK) {
        resolve(windowObject.CrazyGames.SDK);
      } else {
        script.remove();
        reject(new PlatformError('sdk-load', 'SDK script loaded without an SDK object'));
      }
    }
    script.onload = () => finish();
    script.onerror = () => finish(new PlatformError('sdk-load', 'Failed to load CrazyGames SDK'));
    timer = setTimeout(() => finish(new PlatformError('sdk-load', 'CrazyGames SDK load timed out')), timeoutMs);
    documentObject.head.appendChild(script);
  });
  loadingScripts.set(documentObject, pending);
  pending.catch(() => loadingScripts.delete(documentObject));
  return pending;
}

export async function createCrazyGames({ sdk, loader = loadCrazyGamesSdk, onSettings, timeoutMs = 15000 } = {}) {
  let resolvedSdk;
  let timer;
  try {
    resolvedSdk = sdk ?? await loader({ timeoutMs });
    await Promise.race([
      Promise.resolve().then(() => resolvedSdk.init()),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('SDK initialization timed out')), timeoutMs);
      }),
    ]);
  } catch (cause) {
    if (cause instanceof PlatformError) throw cause;
    throw new PlatformError('sdk-init', 'CrazyGames SDK initialization failed', cause);
  } finally {
    clearTimeout(timer);
  }
  if (!['local', 'crazygames'].includes(resolvedSdk.environment)) {
    throw new PlatformError('sdk-environment', `Unsupported SDK environment: ${resolvedSdk.environment}`);
  }
  const { game, data } = resolvedSdk;
  if (!game || !data || typeof data.getItem !== 'function' || typeof data.setItem !== 'function'
    || typeof game.gameplayStart !== 'function' || typeof game.gameplayStop !== 'function'
    || typeof game.addSettingsChangeListener !== 'function' || typeof game.removeSettingsChangeListener !== 'function') {
    throw new PlatformError('sdk-contract', 'Required CrazyGames v3 modules are unavailable');
  }
  const store = createProgressStore({
    read: key => data.getItem(key),
    async write(key, value) {
      await data.setItem(key, value);
      // SDK acceptance is not a server-sync acknowledgement.
      return 'platform';
    },
  });
  const lifecycle = createLifecycle(game);
  const listeners = new Set();
  let settings = { muteAudio: game.settings?.muteAudio === true };
  let disposed = false;
  const updateSettings = value => {
    if (disposed) return;
    settings = { muteAudio: value?.muteAudio === true };
    for (const listener of listeners) listener({ ...settings });
  };
  game.addSettingsChangeListener(updateSettings);
  if (onSettings) listeners.add(onSettings);
  onSettings?.({ ...settings });
  return {
    kind: 'crazygames',
    loadProgress: store.loadProgress,
    saveProgress: store.saveProgress,
    gameplayStart: lifecycle.gameplayStart,
    gameplayStop: lifecycle.gameplayStop,
    loadingStart: lifecycle.loadingStart,
    loadingStop: lifecycle.loadingStop,
    getSettings: () => ({ ...settings }),
    subscribeSettings(listener) {
      if (disposed) throw new Error('Platform adapter has been disposed');
      listeners.add(listener);
      listener({ ...settings });
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      game.removeSettingsChangeListener(updateSettings);
      listeners.clear();
      store.dispose();
      lifecycle.dispose();
    },
  };
}
