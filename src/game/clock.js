// Time is discarded at pauses; a hidden tab must never fast-forward to death.
export function createClock({ step = 1 / 120, maxSteps = 12, maxFrame = .15 } = {}) {
  let last = null, accumulator = 0;
  return {
    reset(timestamp = null) { last = timestamp; accumulator = 0; },
    advance(timestamp, update) {
      if (last === null) { last = timestamp; return { dt: 0, interrupted: false }; }
      // Input/audio work can complete after the browser has stamped this RAF.
      if (timestamp < last) return { dt: 0, interrupted: false };
      const dt = Math.max(0, (timestamp - last) / 1000); last = timestamp;
      if (dt > maxFrame) { accumulator = 0; return { dt: 0, interrupted: true }; }
      accumulator += dt;
      let steps = 0;
      while (accumulator + 1e-12 >= step && steps < maxSteps) { update(step); accumulator -= step; steps++; }
      if (steps === maxSteps && accumulator >= step) accumulator = 0;
      return { dt, interrupted: false };
    },
  };
}
