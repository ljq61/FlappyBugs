import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIG } from '../src/game/config.js';
import { createGame } from '../src/game/model.js';

const DT = GAME_CONFIG.fixedStep;
const quiet = {
  gravity: 0, jump: 0, startY: 0, centerRange: 0, movingCenterRange: 0,
  gap: 20, gapReductionMax: 0, initialPickupCooldown: 999,
  pickupGuarantee: { poison: 999, heal: 999, star: 999 },
};
function advance(game, seconds, onStep) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    onStep?.(i);
    game.step(DT);
  }
}
function pickupGame(type, overrides = {}) {
  return createGame({ ...quiet, interval: 999, initialSpawnTimer: 999,
    obstacleSpawnX: GAME_CONFIG.playerX, speed: 0, speedIncreaseMax: 0,
    pickupOffsetMin: 0, pickupOffsetMax: 0, pickupSpread: 0, pickupBobAmplitude: 0,
    pickupGuarantee: { poison: 999, heal: 999, star: 999, [type]: 1 }, ...overrides }, () => 0.5);
}

test('baseline parameters, initial flap and immutable snapshots', () => {
  assert.equal(GAME_CONFIG.hitWidth, 0.98);
  assert.equal(GAME_CONFIG.hitHeight, 0.78);
  assert.equal(GAME_CONFIG.pickupPlayerRadius, GAME_CONFIG.hitWidth * 0.35);
  const game = createGame();
  assert.equal(game.getSnapshot().state, 'ready');
  assert.equal(game.flap(), false);
  assert.equal(game.start(), true);
  const initial = game.getSnapshot();
  assert.equal(initial.hp, 3);
  assert.equal(initial.player.vy, 5.72);
  assert.equal(initial.launchTime, 0.72);
  assert.deepEqual(game.drainEvents().map(event => event.type), ['start', 'flap']);
  assert.equal(game.start(), false);
  assert.equal(game.getSnapshot().runId, initial.runId);
  game.step(DT);
  assert.equal(game.getSnapshot().player.vy, 5.72 - 15.2 * DT);
  assert.equal(initial.player.y, -1.25);
  assert.throws(() => { initial.player.y = 10; }, TypeError);
  assert.throws(() => { initial.obstacles.push({}); }, TypeError);
});

test('frame schedules consume identical fixed steps and timed inputs at 60/120/144/165Hz', () => {
  function play(refreshRate) {
    let seed = 123;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
    const game = createGame({ centerRange: 0 }, random);
    game.start();
    let accumulator = 0, ticks = 0;
    const totalTicks = 8 * 120;
    for (let frame = 0; ticks < totalTicks; frame++) {
      accumulator += 1 / refreshRate;
      while (accumulator + 1e-12 >= DT && ticks < totalTicks) {
        if (ticks > 0 && ticks % 89 === 0) game.flap();
        game.step(DT);
        accumulator -= DT;
        ticks++;
      }
    }
    return { snapshot: game.getSnapshot(), events: game.drainEvents() };
  }
  const expected = play(120);
  assert.equal(expected.snapshot.state, 'playing');
  assert.ok(expected.snapshot.score > 0);
  for (const hz of [60, 144, 165]) assert.deepEqual(play(hz), expected);
});

test('ceiling pressure damages once per 0.95s and ends once at zero HP', () => {
  const game = createGame({ interval: 999, startY: 7.6, gravity: 0 });
  game.start();
  game.drainEvents();
  game.step(DT);
  assert.equal(game.getSnapshot().hp, 2);
  assert.equal(game.getSnapshot().invulnerability, 0.95);
  advance(game, 0.94, () => game.flap());
  assert.equal(game.getSnapshot().hp, 2);
  advance(game, 0.02, () => game.flap());
  assert.equal(game.getSnapshot().hp, 1);
  advance(game, 1, () => game.flap());
  assert.equal(game.getSnapshot().hp, 0);
  assert.equal(game.getSnapshot().state, 'gameover');
  assert.equal(game.drainEvents().filter(event => event.type === 'gameover').length, 1);
  const ended = game.getSnapshot();
  advance(game, 1);
  assert.deepEqual(game.getSnapshot(), ended);
  assert.deepEqual(game.drainEvents(), []);
});

test('visible obstacle width determines collision instead of a hidden multiplier', () => {
  const game = createGame({ ...quiet, gap: 0.1, initialSpawnTimer: 999, interval: 999,
    obstacleSpawnX: GAME_CONFIG.playerX + 1.1, speed: 0, damageLift: 0 }, () => 0.5);
  game.start();
  game.step(DT);
  assert.equal(game.getSnapshot().hp, 2);
  assert.equal(game.getSnapshot().obstacles[0].width, 1.78);
});

test('healing caps at three hearts but keeps full-health feedback', () => {
  const full = pickupGame('heal');
  full.start();
  full.step(DT);
  assert.equal(full.getSnapshot().hp, 3);
  assert.deepEqual(full.drainEvents().find(event => event.type === 'heal'), {
    type: 'heal', runId: 2, time: DT, hp: 3, amount: 0,
  });
  const damaged = pickupGame('heal', { gap: 0.1, damageLift: 0 });
  damaged.start();
  damaged.step(DT);
  assert.equal(damaged.getSnapshot().hp, 3);
  assert.equal(damaged.drainEvents().find(event => event.type === 'heal').amount, 1);
});

test('poison subtracts a heart, is consumed, and respects damage immunity', () => {
  const poison = pickupGame('poison');
  poison.start();
  poison.step(DT);
  assert.equal(poison.getSnapshot().hp, 2);
  assert.equal(poison.getSnapshot().pickups.length, 0);
  assert.equal(poison.drainEvents().find(event => event.type === 'damage').reason, 'poison');
  const protectedGame = pickupGame('poison', { gap: 0.1, damageLift: 0 });
  protectedGame.start();
  protectedGame.step(DT);
  assert.equal(protectedGame.getSnapshot().hp, 2);
  assert.equal(protectedGame.drainEvents().filter(event => event.type === 'damage').length, 1);
});

test('star grants five seconds, clears injury protection, protects obstacles and expires once', () => {
  const game = pickupGame('star', { gap: 0.1, damageLift: 0, damageNudge: 0 });
  game.start();
  game.step(DT);
  assert.equal(game.getSnapshot().hp, 2);
  assert.equal(game.getSnapshot().starTime, 5);
  assert.equal(game.getSnapshot().invulnerability, 0);
  advance(game, 4.99);
  assert.equal(game.getSnapshot().hp, 2);
  assert.ok(game.getSnapshot().starTime > 0);
  advance(game, 0.02);
  assert.equal(game.getSnapshot().starTime, 0);
  assert.equal(game.getSnapshot().hp, 1);
  const events = game.drainEvents();
  assert.equal(events.filter(event => event.type === 'star').length, 1);
  assert.equal(events.filter(event => event.type === 'star-end').length, 1);
});

test('falling without star ends; falling with star bounces at the lower edge', () => {
  const falling = createGame({ interval: 999 });
  falling.start();
  advance(falling, 3);
  assert.equal(falling.getSnapshot().state, 'gameover');
  assert.equal(falling.drainEvents().find(event => event.type === 'gameover').reason, 'fall');
  const bouncing = pickupGame('star', { gravity: GAME_CONFIG.gravity, jump: GAME_CONFIG.jump });
  bouncing.start();
  bouncing.step(DT);
  let bounce;
  for (let i = 0; i < 300 && !bounce; i++) {
    bouncing.step(DT);
    bounce = bouncing.drainEvents().find(event => event.type === 'bounce');
  }
  assert.ok(bounce);
  assert.equal(bouncing.getSnapshot().state, 'playing');
  assert.equal(bouncing.getSnapshot().player.vy, 5.72);
  assert.equal(bouncing.getSnapshot().player.y, -8 + GAME_CONFIG.playerHeight / 2);
});

test('another star resets five seconds rather than adding duration, and poison cannot harm it', () => {
  const refreshed = pickupGame('star', { interval: 2, initialSpawnTimer: 2,
    pickupCooldown: 0, pickupHealChance: 0, pickupPoisonChance: 0, pickupStarChance: 1 });
  refreshed.start();
  refreshed.step(DT);
  advance(refreshed, 2.2);
  assert.ok(refreshed.getSnapshot().starTime > 4.7);
  assert.ok(refreshed.getSnapshot().starTime <= 5);
  const events = refreshed.drainEvents();
  assert.equal(events.filter(event => event.type === 'star').length, 2);
  assert.equal(events.filter(event => event.type === 'star-end').length, 0);

  const protectedGame = pickupGame('star', { interval: 0.1, intervalReductionMax: 0,
    initialSpawnTimer: 0.1, pickupCooldown: 999,
    pickupGuarantee: { star: 1, poison: 2, heal: 999 } });
  protectedGame.start();
  advance(protectedGame, 0.2);
  assert.equal(protectedGame.getSnapshot().hp, 3);
  assert.equal(protectedGame.getSnapshot().pickups.length, 0);
  assert.equal(protectedGame.drainEvents().filter(event => event.type === 'damage').length, 0);
});

test('default gap, speed and spawn interval progress with score and obey caps', () => {
  const game = createGame({ ...quiet, gap: GAME_CONFIG.gap, gapReductionMax: GAME_CONFIG.gapReductionMax,
    obstacleSpawnX: -1.7, pickupOffsetMin: 20, pickupOffsetMax: 20 }, () => 0.5);
  game.start();
  const births = [];
  let lastId = 0;
  for (let i = 0; i < 60 * 120; i++) {
    const before = game.getSnapshot();
    game.step(DT);
    const after = game.getSnapshot();
    for (const obstacle of after.obstacles) {
      if (obstacle.id > lastId) {
        births.push({ score: before.score, time: after.time, gap: obstacle.gap });
        lastId = obstacle.id;
      }
    }
    const existing = before.obstacles.find(obstacle => after.obstacles.some(next => next.id === obstacle.id));
    if (existing) {
      const next = after.obstacles.find(obstacle => obstacle.id === existing.id);
      const expectedSpeed = 3.35 + Math.min(before.score * 0.055, 1.65);
      assert.ok(Math.abs(existing.x - next.x - expectedSpeed * DT) < 1e-10);
    }
  }
  assert.ok(game.getSnapshot().score >= 30);
  assert.equal(births[0].gap, 3.55);
  assert.equal(births.at(-1).gap, 3.55 - 0.62);
  for (const birth of births) assert.equal(birth.gap, 3.55 - Math.min(birth.score * 0.024, 0.62));
  assert.ok(births[1].time - births[0].time > births.at(-1).time - births.at(-2).time);
});

test('each group scores once; obstacles start moving early at the configured threshold', () => {
  const game = createGame({ ...quiet, speed: 20, speedIncreaseMax: 0,
    interval: 0.1, intervalReductionMax: 0, initialSpawnTimer: 0.1,
    obstacleSpawnX: -1.5, pickupOffsetMin: 20, pickupOffsetMax: 20 }, () => 0.5);
  game.start();
  const groups = new Map();
  const births = [];
  for (let i = 0; i < 360; i++) {
    const beforeScore = game.getSnapshot().score;
    game.step(DT);
    for (const obstacle of game.getSnapshot().obstacles) {
      if (!groups.has(obstacle.id)) {
        groups.set(obstacle.id, obstacle);
        births.push({ obstacle, beforeScore });
      }
    }
  }
  assert.ok(game.getSnapshot().score > GAME_CONFIG.movingScore);
  for (const { obstacle, beforeScore } of births) assert.equal(obstacle.moving, beforeScore >= GAME_CONFIG.movingScore);
  assert.ok(births.some(b => b.beforeScore === GAME_CONFIG.movingScore - 1 && !b.obstacle.moving));
  assert.ok(births.some(b => b.beforeScore === GAME_CONFIG.movingScore && b.obstacle.moving));
  const scoreEvents = game.drainEvents().filter(event => event.type === 'score');
  assert.equal(new Set(scoreEvents.map(event => event.obstacleId)).size, scoreEvents.length);
  assert.equal(game.getSnapshot().score, scoreEvents.length);
  assert.ok(game.getSnapshot().obstacles.some(obstacle => obstacle.moving && obstacle.centerY !== 0));
});

test('3/6/12 group guarantees prioritize positive pickups and reset each run', () => {
  const game = createGame({ ...quiet, interval: 0.1, intervalReductionMax: 0, initialSpawnTimer: 0,
    speed: 0, speedIncreaseMax: 0, pickupOffsetMin: 20, pickupOffsetMax: 20,
    pickupGuarantee: GAME_CONFIG.pickupGuarantee }, () => 0.5);
  function drops() {
    game.start();
    const seen = new Map();
    for (let i = 0; i < 240; i++) {
      game.step(DT);
      const snapshot = game.getSnapshot();
      for (const pickup of snapshot.pickups) {
        if (!seen.has(pickup.type)) seen.set(pickup.type, snapshot.obstacles.length);
      }
    }
    return Object.fromEntries(seen);
  }
  assert.deepEqual(drops(), { star: 3, heal: 6, poison: 12 });
  const previousId = game.getSnapshot().runId;
  game.reset();
  const reset = game.getSnapshot();
  assert.equal(reset.runId, previousId + 1);
  assert.equal(reset.state, 'ready');
  assert.equal(reset.time, 0);
  assert.equal(reset.score, 0);
  assert.equal(reset.hp, 3);
  assert.equal(reset.starTime, 0);
  assert.equal(reset.invulnerability, 0);
  assert.equal(reset.launchTime, 0);
  assert.deepEqual(reset.obstacles, []);
  assert.deepEqual(reset.pickups, []);
  assert.deepEqual(game.drainEvents(), []);
  assert.deepEqual(drops(), { star: 3, heal: 6, poison: 12 });
  assert.ok(game.drainEvents().every(event => event.runId === game.getSnapshot().runId));
});

test('pickup bob stays bounded around its spawn position', () => {
  const game = pickupGame('heal', { obstacleSpawnX: 5, pickupBobAmplitude: 0.032 });
  game.start();
  game.step(DT);
  advance(game, 20);
  assert.ok(Math.abs(game.getSnapshot().pickups[0].y) <= 0.032);
});

test('reset clears active star, injury, queued events and identities before immediate retry', () => {
  for (const type of ['star', 'poison']) {
    const game = pickupGame(type);
    game.start();
    game.step(DT);
    const old = game.getSnapshot();
    assert.ok(type === 'star' ? old.starTime > 0 : old.invulnerability > 0);
    game.reset();
    const ready = game.getSnapshot();
    assert.equal(ready.starTime, 0);
    assert.equal(ready.invulnerability, 0);
    assert.equal(ready.player.vy, 0);
    assert.equal(ready.hp, 3);
    assert.deepEqual(game.drainEvents(), []);
    game.start();
    game.step(DT);
    const next = game.getSnapshot();
    assert.ok(next.runId > old.runId);
    assert.equal(next.obstacles[0].id, 1);
    assert.ok(game.drainEvents().every(event => event.runId === next.runId));
    assert.ok(type === 'star' ? old.starTime > 0 : old.invulnerability > 0);
  }
});

test('invalid time and randomness fail explicitly; zero time is inert', () => {
  const game = createGame();
  const ready = game.getSnapshot();
  game.step(0);
  assert.deepEqual(game.getSnapshot(), ready);
  for (const dt of [-1, NaN, Infinity, 0.2]) assert.throws(() => game.step(dt), RangeError);
  assert.throws(() => createGame({ fixedStep: 0 }), RangeError);
  const broken = createGame({ initialSpawnTimer: 999 }, () => 1);
  broken.start();
  assert.throws(() => broken.step(DT), RangeError);
});

test('perfect passages build a streak and trigger temporary protected toot rush', () => {
  const game = createGame({ ...quiet, gap: 3.55, gapReductionMax: 0, obstacleSpawnX: -1.5,
    speed: 20, speedIncreaseMax: 0, movingScore: 999, interval: 0.14,
    intervalReductionMax: 0, initialSpawnTimer: 0.14, pickupOffsetMin: 20, pickupOffsetMax: 20 }, () => 0.5);
  game.start();
  advance(game, 0.7);
  const state = game.getSnapshot();
  assert.ok(state.score >= 3);
  assert.equal(state.perfects, GAME_CONFIG.rushForPerfects);
  assert.ok(state.score > state.perfects, 'void gates score without charging another perfect');
  assert.equal(state.combo, state.perfects);
  assert.equal(state.bestCombo, state.perfects);
  assert.ok(state.rushTime > 0);
  assert.equal(state.rushCharge, 0);
  const events = game.drainEvents();
  assert.equal(events.filter(e => e.type === 'perfect').length, state.perfects);
  assert.equal(events.filter(e => e.type === 'rush-start').length, 1);
  assert.equal(events.filter(e => e.type === 'score').length, state.score);
  assert.ok(events.some(e => e.type === 'rush-start'));
  assert.equal(state.hp, 3);
  game.reset();
  assert.equal(game.getSnapshot().combo, 0);
  assert.equal(game.getSnapshot().bestCombo, 0);
  assert.equal(game.getSnapshot().rushTime, 0);
});

test('void rush excludes every crossed gate from both perfect charge and streak break', () => {
  const game = createGame({ ...quiet, gap: 3.55, gapReductionMax: 0, obstacleSpawnX: -1.5,
    speed: 20, speedIncreaseMax: 0, movingScore: 999, interval: 0.14,
    intervalReductionMax: 0, initialSpawnTimer: 0.14, pickupOffsetMin: 20,
    pickupOffsetMax: 20, rushSeconds: 1.1 }, () => .5);
  game.start();
  const allEvents = [];
  // Initial three normal gates trigger one rush. Several more gates pass during rush.
  for (let i = 0; i < 120; i++) {
    game.step(DT);
    allEvents.push(...game.drainEvents());
  }
  const during = game.getSnapshot();
  assert.ok(during.rushTime > 0);
  assert.ok(during.score > 3);
  assert.equal(during.rushCharge, 0);
  assert.equal(during.perfects, 3);
  assert.equal(during.combo, 3);
  assert.equal(allEvents.filter(event => event.type === 'rush-start').length, 1);
  assert.equal(allEvents.filter(event => event.type === 'perfect').length, 3);
  assert.ok(allEvents.filter(event => event.type === 'score' && !event.perfect).length >= 2);

  // Once void ends, count another three perfect *normal* gates from zero charge.
  let normalPerfects = 0;
  let secondRush = false;
  let ended = false;
  for (let i = 0; i < 800; i++) {
    game.step(DT);
    const events = game.drainEvents();
    if (events.some(event => event.type === 'rush-end')) ended = true;
    if (!ended) {
      assert.ok(!events.some(event => event.type === 'perfect' || event.type === 'rush-start'));
      continue;
    }
    normalPerfects += events.filter(event => event.type === 'perfect').length;
    if (events.some(event => event.type === 'rush-start')) {
      secondRush = true;
      assert.equal(normalPerfects, 3);
      break;
    }
    assert.ok(normalPerfects < 3);
  }
  assert.ok(ended, 'the first void rush expires');
  assert.ok(secondRush, 'only three new normal-state perfect gates re-trigger rush');
  assert.equal(game.getSnapshot().rushCharge, 0);
  assert.equal(game.getSnapshot().bestCombo, 6, 'streak rewards remain earnable after multiple rushes');
});
