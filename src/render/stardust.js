// Stardust exhaust uses small original glints, with deterministic radial variation.
export const STARDUST_COLORS = Object.freeze([
  '#f7ffff', '#c9efff', '#e4d8ff', '#fff4cb', '#c7faff', '#e4c9ff',
]);
export const MAX_STARDUST_PARTICLES = 72;

export function createStardustBurst(x, y, { reducedMotion = false } = {}) {
  if (![x, y].every(Number.isFinite)) throw new TypeError('Stardust origin must be finite');
  const count = reducedMotion ? 4 : 11;
  return Array.from({ length: count }, (_, i) => ({
    x: x - 0.55 - (i % 3) * 0.105,
    y: y - 0.18 + ((i % 5) - 2) * 0.045,
    vx: -1.9 - (i % 4) * 0.5,
    vy: ((i % 6) - 2.5) * 0.37,
    size: (i % 4 === 0 ? 0.34 : 0.16 + (i % 3) * 0.045) * (reducedMotion ? 0.85 : 1),
    duration: 0.51 + (i % 4) * 0.095,
    gravity: -0.27,
    color: STARDUST_COLORS[i % STARDUST_COLORS.length],
    phase: i * 1.93 + 0.8,
    spin: (i % 2 ? -1 : 1) * (1.1 + (i % 3) * 0.9),
  }));
}

// Sharp pulse in brightness and apparent size, fading at the end of the flight.
export function stardustAppearance(age, duration, phase, reducedMotion = false) {
  if (!(duration > 0) || ![age, duration, phase].every(Number.isFinite)) {
    throw new RangeError('Invalid stardust particle phase');
  }
  const t = Math.max(0, Math.min(1, age / duration));
  const fade = Math.pow(1 - t, 1.25);
  const pulse = reducedMotion ? 0.8 : Math.pow(0.5 + 0.5 * Math.sin(age * 29 + phase), 2);
  return {
    opacity: Math.min(1, (0.4 + 0.6 * pulse) * fade * 0.95),
    scale: (0.66 + 0.56 * pulse) * (0.7 + 0.3 * fade),
  };
}
