import { createLifecycle, createProgressStore } from './progress.js';

export function createStandalone({ storage, onSettings } = {}) {
  const memory = new Map();
  let persistent = storage;
  if (storage === undefined) {
    try {
      persistent = globalThis.localStorage;
    } catch {
      persistent = null;
    }
  }
  const store = createProgressStore({
    async read(key) {
      if (persistent) {
        try {
          const value = await persistent.getItem(key);
          if (value !== null) memory.set(key, value);
          return value;
        } catch {
          persistent = null;
        }
      }
      return memory.get(key) ?? null;
    },
    async write(key, value) {
      memory.set(key, value);
      if (persistent) {
        try {
          await persistent.setItem(key, value);
          return 'local';
        } catch {
          persistent = null;
        }
      }
      return 'memory';
    },
  });
  const lifecycle = createLifecycle();
  const settings = { muteAudio: false };
  onSettings?.({ ...settings });
  return {
    kind: 'standalone',
    loadProgress: store.loadProgress,
    saveProgress: store.saveProgress,
    gameplayStart: lifecycle.gameplayStart,
    gameplayStop: lifecycle.gameplayStop,
    loadingStart: lifecycle.loadingStart,
    loadingStop: lifecycle.loadingStop,
    getSettings: () => ({ ...settings }),
    subscribeSettings(listener) {
      listener({ ...settings });
      return () => {};
    },
    dispose() {
      store.dispose();
      lifecycle.dispose();
    },
  };
}
