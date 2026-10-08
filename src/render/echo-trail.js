// Fixed-size, frame-rate-independent afterimage scheduler. Never allocates per-frame sprites.
export function createEchoTrail({ capacity = 10, interval = 0.075, lifetime = 0.55, drift = 2.4 } = {}) {
  if (!Number.isInteger(capacity) || capacity < 1 || !(interval > 0) ||
    !(lifetime > 0) || !(drift >= 0) || ![interval, lifetime, drift].every(Number.isFinite)) {
    throw new RangeError('Invalid echo trail configuration');
  }
  const echoes = Array.from({ length: capacity }, () =>
    ({ life: 0, x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, texture: null }));
  let cursor = 0, clock = 0, wasActive = false;

  function reset() {
    cursor = 0; clock = 0; wasActive = false;
    for (const echo of echoes) { echo.life = 0; echo.texture = null; }
  }

  function step(dt, active, pose) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Echo delta must be finite and nonnegative');
    if (dt === 0) return echoes; // Pausing also freezes existing echoes.
    for (const echo of echoes) {
      if (echo.life <= 0) continue;
      echo.life = Math.max(0, echo.life - dt);
      echo.x -= drift * dt;
    }
    if (!active) {
      clock = 0;
      wasActive = false;
      return echoes; // Existing shadows dissipate briefly when the rush expires.
    }
    if (!pose || ![pose.x, pose.y, pose.angle, pose.scaleX, pose.scaleY].every(Number.isFinite)) {
      throw new TypeError('Active echo trail needs a finite bug pose');
    }
    if (!wasActive) clock = interval; // First ghost appears immediately at activation.
    else clock += dt;
    let emitted = 0;
    while (clock >= interval && emitted < capacity) {
      const echo = echoes[cursor];
      echo.life = lifetime;
      echo.x = pose.x - 0.15;
      echo.y = pose.y;
      echo.angle = pose.angle;
      echo.scaleX = pose.scaleX;
      echo.scaleY = pose.scaleY;
      echo.texture = pose.texture;
      cursor = (cursor + 1) % capacity;
      clock -= interval;
      emitted++;
    }
    // Avoid an unbounded catch-up burst after a slow frame.
    clock = Math.min(clock, interval);
    wasActive = true;
    return echoes;
  }

  return { echoes, lifetime, step, reset };
}
