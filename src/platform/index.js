import { createStandalone } from './standalone.js';
import { createCrazyGames } from './crazygames.js';

// The entry point chooses VITE_PLATFORM; ordinary builds never fetch the SDK.
export async function createPlatform({ mode = 'standalone', ...options } = {}) {
  if (mode === 'standalone') return createStandalone(options);
  if (mode === 'crazygames') return createCrazyGames(options);
  throw new Error(`Unknown platform mode: ${mode}`);
}
