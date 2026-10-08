import { GAME_CONFIG } from './config.js';

export function createGame(config = GAME_CONFIG, random = Math.random) {
  const c = {
    ...GAME_CONFIG,
    ...config,
    pickupGuarantee: { ...GAME_CONFIG.pickupGuarantee, ...config.pickupGuarantee },
    pickupRadius: { ...GAME_CONFIG.pickupRadius, ...config.pickupRadius },
  };
  for (const [key, value] of Object.entries(c)) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError(`Invalid config: ${key}`);
  }
  if (c.fixedStep <= 0 || c.maxStep < c.fixedStep || c.interval <= c.intervalReductionMax
    || c.width <= 0 || c.height <= 0 || c.hitWidth <= 0 || c.hitHeight <= 0
    || c.obstacleWidth <= 0 || !Number.isInteger(c.maxHp) || c.maxHp < 1
    || !Number.isInteger(c.obstacleTypes) || c.obstacleTypes < 1) throw new RangeError('Invalid game dimensions or timing');
  if (typeof random !== 'function') throw new TypeError('random must be a function');

  let state, runId = 0, time, player, hp, score, invulnerability, starTime, launchTime;
  let combo, bestCombo, perfects, rushCharge, rushTime;
  let obstacles, pickups, events, spawnTimer, pickupCooldown, rounds, pity, obstacleId, pickupId;
  const emit = (type, detail = {}) => events.push(Object.freeze({ type, runId, time, ...detail }));
  const sample = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('random must return a number in [0, 1)');
    return value;
  };
  const between = (min, max) => min + sample() * (max - min);
  const gap = () => c.gap - Math.min(score * c.gapPerScore, c.gapReductionMax);
  const speed = () => c.speed + Math.min(score * c.speedPerScore, c.speedIncreaseMax);
  const interval = () => c.interval - Math.min(score * c.intervalPerScore, c.intervalReductionMax);
  const countdown = (value, dt) => value - dt <= 1e-12 ? 0 : value - dt;

  function reset() {
    runId++;
    state = 'ready';
    time = 0;
    player = { x: c.playerX, y: c.startY, vy: 0 };
    hp = c.maxHp;
    score = invulnerability = starTime = launchTime = rounds = 0;
    combo = bestCombo = perfects = rushCharge = rushTime = 0;
    obstacleId = pickupId = 0;
    obstacles = [];
    pickups = [];
    events = [];
    spawnTimer = c.initialSpawnTimer;
    pickupCooldown = c.initialPickupCooldown;
    pity = { poison: false, heal: false, star: false };
  }

  function flap() {
    if (state !== 'playing') return false;
    player.vy = c.jump;
    emit('flap');
    return true;
  }

  function start() {
    if (state === 'playing') return false;
    reset();
    state = 'playing';
    launchTime = c.launchSeconds;
    emit('start');
    flap();
    return true;
  }

  function end(reason) {
    if (state !== 'playing') return;
    state = 'gameover';
    if (starTime > 0) emit('star-end', { reason: 'gameover' });
    starTime = 0;
    emit('gameover', { reason, hp, score, bestCombo, perfects });
  }

  function damage(reason) {
    if (state !== 'playing' || invulnerability > 0 || starTime > 0 || rushTime > 0 || hp <= 0) return false;
    if (combo > 0) emit('combo-break', { combo });
    combo = rushCharge = 0;
    hp--;
    invulnerability = c.damageImmunity;
    player.vy = Math.max(player.vy, c.damageLift);
    emit('damage', { reason, hp });
    if (hp === 0) end('hp');
    return true;
  }

  function spawnPickup(centerY, opening, x) {
    const forced = Object.keys(pity).find(type => rounds >= c.pickupGuarantee[type] && !pity[type]);
    if (!forced && pickupCooldown > 0) return;
    const chance = sample();
    const type = forced || (chance < c.pickupHealChance ? 'heal'
      : chance < c.pickupHealChance + c.pickupPoisonChance ? 'poison'
        : chance < c.pickupHealChance + c.pickupPoisonChance + c.pickupStarChance ? 'star' : null);
    if (!type) return;
    pity[type] = true;
    const pickupX = x + between(c.pickupOffsetMin, c.pickupOffsetMax);
    const baseY = centerY + between(-opening * c.pickupSpread, opening * c.pickupSpread);
    pickups.push({ id: ++pickupId, type, x: pickupX,
      y: baseY, baseY, radius: c.pickupRadius[type], phase: between(0, Math.PI * 2), age: 0 });
    pickupCooldown = c.pickupCooldown;
  }

  function spawnObstacle() {
    const type = Math.floor(sample() * c.obstacleTypes);
    const moving = score >= c.movingScore;
    const range = moving ? c.movingCenterRange : c.centerRange;
    const centerY = between(-range, range);
    const opening = gap();
    obstacles.push({ id: ++obstacleId, type, x: c.obstacleSpawnX, centerY, baseY: centerY,
      gap: opening, width: c.obstacleWidth, moving, scored: false,
      amplitude: moving ? Math.min(c.movingAmplitudeMax, c.movingAmplitude + (score - c.movingScore) * c.movingAmplitudePerScore) : 0,
      frequency: moving ? between(c.movingFrequencyMin, c.movingFrequencyMax) : 0,
      phase: between(0, Math.PI * 2) });
    rounds++;
    spawnPickup(centerY, opening, c.obstacleSpawnX);
  }

  function collect(pickup) {
    if (pickup.type === 'heal') {
      const before = hp;
      hp = Math.min(c.maxHp, hp + 1);
      emit('heal', { hp, amount: hp - before });
    } else if (pickup.type === 'star') {
      starTime = c.starSeconds;
      invulnerability = 0;
      emit('star', { seconds: starTime });
    } else damage('poison');
  }

  function advance(dt) {
    time += dt;
    invulnerability = countdown(invulnerability, dt);
    const previousStar = starTime;
    starTime = countdown(starTime, dt);
    if (previousStar > 0 && starTime === 0) emit('star-end', { reason: 'expired' });
    const previousRush = rushTime;
    rushTime = countdown(rushTime, dt);
    if (previousRush > 0 && rushTime === 0) emit('rush-end');
    launchTime = countdown(launchTime, dt);
    player.vy += c.gravity * dt;
    player.y += player.vy * dt;
    spawnTimer += dt;
    if (spawnTimer >= interval()) {
      spawnTimer = 0;
      spawnObstacle();
    }
    const distance = speed() * dt;
    for (const obstacle of obstacles) {
      obstacle.x -= distance;
      obstacle.centerY = obstacle.baseY + (obstacle.moving ? Math.sin(time * obstacle.frequency + obstacle.phase) * obstacle.amplitude : 0);
      if (!obstacle.scored && obstacle.x < player.x) {
        obstacle.scored = true;
        score++;
        // Only normal flight can build a streak or recharge the next void rush.
        // Gates crossed while already in void mode still score, but never
        // emit 'perfect', break a streak, or charge another rush.
        const canChargeRush = rushTime === 0;
        const perfect = canChargeRush && Math.abs(player.y - obstacle.centerY) <= c.perfectWindow;
        if (canChargeRush) {
          if (perfect) {
            combo++;
            perfects++;
            bestCombo = Math.max(bestCombo, combo);
            rushCharge++;
            emit('perfect', { combo, bestCombo, obstacleId: obstacle.id });
            if (rushCharge >= c.rushForPerfects) {
              rushCharge = 0;
              rushTime = c.rushSeconds;
              emit('rush-start', { seconds: rushTime, combo });
            }
          } else {
            if (combo > 0) emit('combo-break', { combo });
            combo = rushCharge = 0;
          }
        }
        emit('score', { score, obstacleId: obstacle.id, perfect, combo });
      }
      const horizontalHit = Math.abs(obstacle.x - player.x) < obstacle.width / 2 + c.hitWidth / 2;
      const verticalHit = player.y - c.hitHeight / 2 < obstacle.centerY - obstacle.gap / 2
        || player.y + c.hitHeight / 2 > obstacle.centerY + obstacle.gap / 2;
      if (horizontalHit && verticalHit && damage('obstacle')) {
        player.y += player.y > obstacle.centerY ? -c.damageNudge : c.damageNudge;
      }
      if (state !== 'playing') return;
    }
    obstacles = obstacles.filter(obstacle => obstacle.x >= c.obstacleDespawnX);
    pickupCooldown = Math.max(0, pickupCooldown - dt);
    const pickupDistance = speed() * dt;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i];
      pickup.x -= pickupDistance;
      pickup.age += dt;
      pickup.y = pickup.baseY + Math.sin(pickup.phase + pickup.age * c.pickupBobFrequency) * c.pickupBobAmplitude;
      const dx = pickup.x - player.x, dy = pickup.y - player.y;
      if (dx * dx + dy * dy < (pickup.radius + c.pickupPlayerRadius) ** 2) {
        collect(pickup);
        pickups.splice(i, 1);
      } else if (pickup.x < c.pickupDespawnX) pickups.splice(i, 1);
      if (state !== 'playing') return;
    }
    if (player.y + c.hitHeight / 2 < -c.height / 2) {
      if (starTime > 0 || rushTime > 0) {
        player.y = -c.height / 2 + c.playerHeight / 2;
        player.vy = c.jump;
        emit('bounce', { reason: 'bottom' });
      } else {
        end('fall');
        return;
      }
    }
    if (player.y + c.hitHeight / 2 > c.height / 2 - 0.03) {
      player.y = c.height / 2 - c.hitHeight / 2 - 0.06;
      player.vy = Math.min(player.vy, -2);
      damage('ceiling');
    }
  }

  function step(dt) {
    if (!Number.isFinite(dt) || dt < 0 || dt > c.maxStep) throw new RangeError(`dt must be in [0, ${c.maxStep}]`);
    if (state !== 'playing' || dt === 0) return;
    let remaining = dt;
    while (remaining > 1e-12 && state === 'playing') {
      const slice = Math.min(remaining, c.fixedStep);
      advance(slice);
      remaining -= slice;
    }
  }

  function getSnapshot() {
    return Object.freeze({ state, runId, time, player: Object.freeze({ ...player }), hp, score,
      invulnerability, starTime, launchTime, combo, bestCombo, perfects, rushCharge, rushTime,
      obstacles: Object.freeze(obstacles.map(({ id, x, centerY, gap: opening, width, type, moving }) =>
        Object.freeze({ id, x, centerY, gap: opening, width, type, moving }))),
      pickups: Object.freeze(pickups.map(({ id, type, x, y, radius }) => Object.freeze({ id, type, x, y, radius }))),
    });
  }

  function drainEvents() {
    const pending = events;
    events = [];
    return Object.freeze(pending);
  }

  reset();
  return Object.freeze({ start, flap, step, reset, getSnapshot, drainEvents });
}
