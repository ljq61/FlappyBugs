import * as THREE from 'three';
import { ART, OBSTACLE_ART } from '../art/manifest.js';
import { GAME_CONFIG } from '../game/config.js';
import { SKINS, TRAILS } from '../game/unlocks.js';
import { createEchoTrail } from './echo-trail.js';
import { createStardustBurst, createStarBurst, stardustAppearance, MAX_STARDUST_PARTICLES } from './stardust.js';
import { installVoidContour, isVoidRush, showStarAura } from './void-contour.js';
import { createFlameGeometry, deformFlame } from './flame.js';
import { SKIN_POSES, recolorShell } from './skin.js';
import { obstacleLayout } from './obstacle-layout.js';

export async function createScene(host, { debug = false } = {}) {
  const c = GAME_CONFIG;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-c.width / 2, c.width / 2, c.height / 2, -c.height / 2, .1, 100);
  camera.position.z = 20;
  const textures = new Map();
  const materials = new Set();
  const loader = new THREE.TextureLoader();
  try {
    async function loadTexture(id, url, repeatY = false) {
      const texture = await loader.loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      if (repeatY) texture.wrapT = THREE.RepeatWrapping;
      textures.set(id, texture);
    }
    const loaded = await Promise.allSettled(Object.entries(ART).filter(([, entry]) => !entry.previewOnly).map(async ([id, entry]) => {
      await loadTexture(id, entry.url, entry.repeatY);
      if (!SKIN_POSES.includes(id)) return;
      const response = await fetch(entry.url);
      if (!response.ok) throw new Error(`Cannot load editable shell: ${id}`);
      const svg = await response.text();
      const variants = await Promise.allSettled(SKINS.slice(1).map(skin =>
        loadTexture(`${id}:${skin.id}`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolorShell(svg, skin.shellColors))}`)));
      const failure = variants.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
    }));
    const failure = loaded.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  } catch (error) {
    for (const texture of textures.values()) texture.dispose();
    renderer.dispose();
    throw error;
  }
  const plane = new THREE.PlaneGeometry(1, 1);
  // Upload all SVG textures during loading, rather than hitch on a first pickup/flap.
  for (const texture of textures.values()) renderer.initTexture(texture);
  function sprite(id, width, height, z = 0) {
    const material = new THREE.SpriteMaterial({ map: textures.get(id), transparent: true, depthTest: false, depthWrite: false });
    materials.add(material);
    const obj = new THREE.Sprite(material);
    obj.scale.set(width, height, 1); obj.position.z = z;
    return obj;
  }
  function rectangle(color, width, height, z) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false });
    materials.add(material);
    const obj = new THREE.Mesh(plane, material);
    obj.scale.set(width, height, 1); obj.position.z = z;
    return obj;
  }
  const background = sprite('garden', c.width, c.height, -10);
  scene.add(background);
  const platform = sprite('platform', 3.2, .8, 2);
  platform.position.set(-2, -2.65, 2); scene.add(platform);
  const bug = new THREE.Group(); bug.position.z = 5; scene.add(bug);
  const wingBack = sprite('wing', 1.4, 1.4, -.2);
  wingBack.position.set(-.18, .37, -.2); wingBack.material.rotation = .45;
  const wingFront = sprite('wing', 1.2, 1.2, -.1);
  wingFront.position.set(-.08, .42, -.1); wingFront.material.rotation = -.22;
  const body = sprite('beetle', 1.45, 1.45, 0);
  bug.add(wingBack, wingFront, body);
  const rainbowTime = { value: 0 }, rainbowActive = { value: 0 }, voidActive = { value: 0 };
  let selectedSkin = 'classic', trailTint = '#ffffff', selectedTrail = 'cloud';
  function setStyle({ skin = 'classic', trail = 'cloud' } = {}) {
    const chosenSkin = SKINS.find(item => item.id === skin) || SKINS[0];
    const chosenTrail = TRAILS.find(item => item.id === trail) || TRAILS[0];
    selectedSkin = chosenSkin.id;
    trailTint = chosenTrail.color;
    selectedTrail = chosenTrail.id;
  }
  for (const part of [body, wingBack, wingFront]) {
    part.material.onBeforeCompile = shader => {
      shader.uniforms.rainbowTime = rainbowTime;
      shader.uniforms.rainbowActive = rainbowActive;
      shader.uniforms.voidActive = voidActive;
      shader.fragmentShader = 'uniform float rainbowTime;\nuniform float rainbowActive;\nuniform float voidActive;\n' + shader.fragmentShader;
      // Tint after the SVG texture has been sampled; preserve its outline and alpha.
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        float brightness = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 rainbow = 0.5 + 0.5 * cos(6.2831853 * (vMapUv.y * 1.3 + vMapUv.x * 0.45 - rainbowTime * 0.65 + vec3(0.0, 0.3333, 0.6667)));
        float tint = rainbowActive * smoothstep(0.025, 0.16, brightness) * 0.94;
        diffuseColor.rgb = mix(diffuseColor.rgb, rainbow * clamp(brightness * 1.6, 0.3, 1.0), tint);
        // A living, dark indigo void silhouette crossed by cyan/ultraviolet energy.
        // Its alpha remains below one so the garden is faintly visible through the bug.
        float rift = 0.5 + 0.5 * sin(vMapUv.y * 31.0 - rainbowTime * 14.0
          + sin(vMapUv.x * 23.0 + rainbowTime * 6.0) * 1.7);
        float voidEdge = 1.0 - smoothstep(0.08, 0.36, brightness);
        vec3 voidColor = mix(vec3(0.028, 0.012, 0.13),
          vec3(0.13, 0.59, 0.82), 0.14 + 0.64 * rift);
        voidColor += vec3(0.13, 0.10, 0.38) * voidEdge;
        diffuseColor.rgb = mix(diffuseColor.rgb, voidColor, voidActive * 0.96);
        diffuseColor.a *= 1.0 - voidActive * (0.12 + 0.09 * rift);
      `);
    };
    part.material.customProgramCacheKey = () => 'flappybugs-shell-rainbow-void-v3';
  }
  const aura = sprite('star', 2.05, 2.05, 4.7); aura.material.opacity = .25; scene.add(aura);
  const contourTime = { value: 0 };
  // Preallocate three alpha-silhouette overlays: body and both animated wings.
  // Each tracks its source part's pose/texture and renders behind that part.
  const voidContours = [[wingBack, 'wing'], [wingFront, 'wing'], [body, 'beetle']]
    .map(([part, textureId]) => {
      const glow = sprite(textureId, 1, 1, part.position.z - .035);
      glow.material.blending = THREE.AdditiveBlending;
      installVoidContour(glow.material, contourTime);
      // Visible for compileAsync shader warmup; hidden immediately after compiling.
      glow.visible = true;
      bug.add(glow);
      return { part, glow };
    });
  const echoTrail = createEchoTrail();
  // Preallocate ghost sprites; no material/geometry allocation during a rush.
  const ghostSprites = echoTrail.echoes.map(() => {
    const ghost = sprite('beetle', 1.45, 1.45, 4.86);
    ghost.material.color.set('#9d77ed');
    ghost.material.blending = THREE.AdditiveBlending;
    ghost.visible = false;
    scene.add(ghost);
    return ghost;
  });
  const obstacles = new Map(), pickups = new Map();
  let puffs = [], sparks = [], currentRun = -1, pulse = 0, shake = 0, elapsed = 0, angle = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debugLayer = new THREE.Group(); scene.add(debugLayer);
  function outline(width, height, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width / 2, -height / 2, 9), new THREE.Vector3(width / 2, -height / 2, 9),
      new THREE.Vector3(width / 2, height / 2, 9), new THREE.Vector3(-width / 2, height / 2, 9),
    ]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false });
    materials.add(material);
    const line = new THREE.LineLoop(geometry, material);
    return line;
  }
  const bodyOutline = debug ? outline(c.hitWidth, c.hitHeight, '#ff004c') : null;
  if (bodyOutline) debugLayer.add(bodyOutline);
  function removeGroup(map, id) {
    const group = map.get(id);
    scene.remove(group);
    group.traverse(obj => {
      if (obj.material) { obj.material.dispose(); materials.delete(obj.material); }
      // Sprite geometry belongs to Three.js and is shared by every sprite.
      if (obj.isLineLoop) obj.geometry.dispose();
      if (obj.userData.ownsGeometry) obj.geometry.dispose();
    });
    map.delete(id);
  }
  function makeObstacle(o) {
    const style = OBSTACLE_ART[o.type % OBSTACLE_ART.length];
    const group = new THREE.Group();
    const capHeight = style.capHeight || 1.48;
    const topId = style.top.id || `${style.id}-top`, bottomId = style.bottom.id || `${style.id}-bottom`;
    const faceWidth = o.width * .78;
    function stemDetail() {
      const obj = rectangle('#ffffff', o.width - .1, 1, 1.1);
      obj.material.map = textures.get(`pillar-${style.id}-stem`);
      // Per-stem UVs keep the shared SVG tile at a constant size as the gap moves.
      obj.geometry = new THREE.PlaneGeometry(1, 1); obj.userData.ownsGeometry = true;
      return obj;
    }
    const parts = {
      bottomStem: rectangle('#30283c', o.width, 1, 1), topStem: rectangle('#30283c', o.width, 1, 1),
      bottomFill: rectangle(style.stemColor, o.width - .1, 1, 1.05), topFill: rectangle(style.stemColor, o.width - .1, 1, 1.05),
      bottomCap: sprite(bottomId, o.width, capHeight, 1.3), topCap: sprite(topId, o.width, capHeight, 1.3),
      bottomDetail: stemDetail(), topDetail: stemDetail(),
      bottomEyes: sprite('pillar-eyes', faceWidth, faceWidth, 1.4), topEyes: sprite('pillar-eyes', faceWidth, faceWidth, 1.4),
      bottomMouth: sprite('pillar-mouth', faceWidth, faceWidth, 1.4), topMouth: sprite('pillar-mouth', faceWidth, faceWidth, 1.4),
    };
    if (style.flameBottom && style.flameTop) {
      for (const [side, id] of [['bottom', style.flameBottom], ['top', style.flameTop]]) {
        const flame = rectangle('#ffffff', o.width, capHeight, 1.45);
        flame.material.map = textures.get(id);
        flame.geometry = createFlameGeometry();
        flame.userData.ownsGeometry = true;
        parts[`${side}Flame`] = flame;
      }
    }
    for (const eyes of [parts.bottomEyes, parts.topEyes]) eyes.center.set(.5, .66);
    for (const mouth of [parts.bottomMouth, parts.topMouth]) mouth.center.set(.5, .24);
    const leaves = [-1, 1].flatMap(side => Array.from({ length: 3 }, (_, index) => {
      const obj = sprite('pillar-leaf', .52, .52, 1.25);
      obj.position.x = (index % 2 ? -1 : 1) * o.width * .22;
      return { obj, side, index };
    }));
    group.add(...Object.values(parts), ...leaves.map(leaf => leaf.obj)); group.userData = { parts, capHeight, leaves };
    if (debug) {
      const lower = outline(o.width, 12, '#ff004c'), upper = outline(o.width, 12, '#ff004c');
      group.add(lower, upper); group.userData.lines = [lower, upper];
    }
    obstacles.set(o.id, group); scene.add(group); return group;
  }
  function clearEffects() {
    for (const effect of [...puffs, ...sparks]) {
      scene.remove(effect.obj); effect.obj.material.dispose(); materials.delete(effect.obj.material);
    }
    puffs = []; sparks = []; pulse = shake = 0;
    echoTrail.reset();
    for (const ghost of ghostSprites) ghost.visible = false;
  }
  function effect(id, x, y, vx, vy, size, duration, gravity = 0, options = {}) {
    const isStardust = id === 'stardust-glint' || id === 'trail-star';
    if (isStardust && sparks.filter(part => part.stardust).length >= MAX_STARDUST_PARTICLES) return;
    const z = id.startsWith('juice-') ? 6 : isStardust ? 4.95 : 4.8;
    const obj = sprite(id, size, size, z); obj.position.set(x, y, z); scene.add(obj);
    if (id === 'puff') obj.material.color.set(trailTint);
    if (isStardust) {
      obj.material.color.set(options.color);
      obj.material.opacity = 0.95;
    }
    const target = id === 'puff' ? puffs : sparks;
    target.push({
      obj, vx, vy, size, life: duration, duration, gravity,
      liquid: id.startsWith('juice-'), stardust: isStardust,
      phase: options.phase ?? 0, spin: options.spin ?? 0,
    });
  }
  function consume(events, snapshot) {
    if (snapshot.runId !== currentRun) {
      currentRun = snapshot.runId; clearEffects(); angle = 0;
      for (const id of [...obstacles.keys()]) removeGroup(obstacles, id);
      for (const id of [...pickups.keys()]) removeGroup(pickups, id);
    }
    for (const event of events) {
      if (event.type === 'flap') {
        pulse = 1;
        if (selectedTrail === 'stardust' || selectedTrail === 'sunny') {
          const burst = selectedTrail === 'sunny' ? createStarBurst : createStardustBurst;
          const texture = selectedTrail === 'sunny' ? 'trail-star' : 'stardust-glint';
          for (const star of burst(snapshot.player.x, snapshot.player.y, { reducedMotion })) {
            effect(texture, star.x, star.y, star.vx, star.vy, star.size,
              star.duration, star.gravity, { color: star.color, phase: star.phase, spin: star.spin });
          }
        } else {
          for (let i = 0; i < 3; i++) effect('puff', snapshot.player.x - .55 - i * .16,
            snapshot.player.y - .18, -1.4 - i * .3, -.7 + i * .4, .42 + i * .15, .45 + i * .12);
        }
      }
      if (event.type === 'damage') {
        shake = reducedMotion ? 0 : .22;
        if (event.reason === 'obstacle') {
          const { x, y } = snapshot.player;
          const pillar = snapshot.obstacles.reduce((nearest, o) => !nearest || Math.abs(o.x - x) < Math.abs(nearest.x - x) ? o : nearest, null);
          const side = pillar && y < pillar.centerY ? -1 : 1;
          const impactX = pillar ? Math.max(pillar.x - pillar.width / 2, Math.min(x, pillar.x + pillar.width / 2)) : x;
          effect('juice-splash', impactX, y + side * .25, 0, 0, 1.25, .75);
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            effect('juice-drop', impactX, y + side * .18, Math.cos(a) * (2.2 + i % 3 * .7), Math.sin(a) * 3.2 + .9, .15 + i % 3 * .07, .65 + i % 4 * .12, -8);
          }
        }
      }
      if (event.type === 'perfect' || event.type === 'rush-start') {
        const count = event.type === 'rush-start' ? 13 : 5;
        for (let i = 0; i < count; i++) {
          const a = i / count * Math.PI * 2;
          effect(event.type === 'rush-start' ? 'puff' : 'star', snapshot.player.x, snapshot.player.y,
            Math.cos(a) * (event.type === 'rush-start' ? 3.2 : 1.6),
            Math.sin(a) * (event.type === 'rush-start' ? 3.2 : 1.6), .22, .42);
        }
      }
      if (['damage', 'star', 'heal'].includes(event.type)) {
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2;
          effect(event.type === 'heal' ? 'heal' : 'star', snapshot.player.x, snapshot.player.y, Math.cos(a) * 2, Math.sin(a) * 2, .17, .45);
        }
      }
    }
  }
  function render(snapshot, dt = 0) {
    elapsed += dt; pulse = Math.max(0, pulse - dt * 4); shake = Math.max(0, shake - dt);
    const idle = snapshot.state === 'ready' ? Math.sin(elapsed * 2.4) * .07 : 0;
    bug.position.set(snapshot.player.x, snapshot.player.y + idle, 5);
    const rising = snapshot.state === 'playing' && snapshot.player.vy > .8;
    const falling = snapshot.state === 'playing' && snapshot.player.vy < -1.5;
    const targetAngle = snapshot.state === 'gameover' ? -1.7 : snapshot.state === 'ready' ? .08 : falling ? Math.max(-1.45, -.55 + snapshot.player.vy * .13) : Math.min(.6, snapshot.player.vy * .12);
    angle += (targetAngle - angle) * (1 - Math.exp(-16 * dt));
    // Three.js sprites face the camera: their own rotation, rather than group rotation, controls the pose.
    body.material.rotation = angle;
    const stretch = reducedMotion ? 0 : Math.sin((1 - pulse) * Math.PI) * .22;
    const compress = reducedMotion || !pulse ? 0 : Math.exp(-(1 - pulse) * 14) * .2;
    bug.scale.set(1 + compress - stretch, 1 - compress + stretch, 1);
    const wingBeat = reducedMotion ? .7 : .6 + .4 * Math.sin(elapsed * (falling ? 32 : 49));
    const spread = rising ? 1.15 : falling ? .72 : 1;
    wingBack.scale.set(1.4 * spread, 1.4 * (.55 + wingBeat * .7) * spread, 1);
    wingFront.scale.set(1.2 * spread, 1.2 * (1.3 - wingBeat * .6) * spread, 1);
    wingBack.material.rotation = angle + .45 + (reducedMotion ? 0 : (wingBeat - .6) * .5);
    wingFront.material.rotation = angle - .35 - (reducedMotion ? 0 : (wingBeat - .6) * .5);
    for (const [wing, x, y] of [[wingBack, -.18, .37], [wingFront, -.08, .42]]) {
      wing.position.x = x * Math.cos(angle) - y * Math.sin(angle);
      wing.position.y = x * Math.sin(angle) + y * Math.cos(angle);
    }
    const isVoid = isVoidRush(snapshot);
    body.material.opacity = isVoid ? .97
      : snapshot.invulnerability > 0 && Math.floor(snapshot.invulnerability * 15) % 2 ? .42 : 1;
    for (const wing of [wingBack, wingFront]) wing.material.opacity = isVoid ? .8 : 1;
    const pose = snapshot.state === 'gameover' ? 'beetle-dizzy' : snapshot.invulnerability > 0 && !isVoid ? 'beetle-hurt' : rising ? 'beetle-flap' : falling ? 'beetle-fall' : 'beetle';
    body.material.map = textures.get(selectedSkin === 'classic' ? pose : `${pose}:${selectedSkin}`);
    rainbowTime.value = elapsed;
    rainbowActive.value = snapshot.starTime > 0 && !isVoid ? 1 : 0;
    voidActive.value = isVoid ? 1 : 0;
    // The star-shaped pickup shield never surrounds the bug in void mode.
    aura.visible = showStarAura(snapshot);
    aura.material.color.set('#ffffff');
    aura.material.opacity = .25;
    aura.scale.setScalar(2.05);
    aura.position.set(snapshot.player.x, snapshot.player.y, 4.7);
    aura.material.rotation = elapsed * .8;
    contourTime.value = reducedMotion ? 0 : elapsed;
    for (const { part, glow } of voidContours) {
      glow.visible = isVoid;
      if (!isVoid) continue;
      glow.position.set(part.position.x, part.position.y, part.position.z - .035);
      glow.scale.copy(part.scale);
      glow.material.rotation = part.material.rotation;
      glow.material.map = part.material.map;
    }
    const echoes = echoTrail.step(dt, isVoid && !reducedMotion, {
      x: bug.position.x, y: bug.position.y, angle,
      scaleX: bug.scale.x, scaleY: bug.scale.y, texture: body.material.map,
    });
    echoes.forEach((echo, index) => {
      const ghost = ghostSprites[index];
      ghost.visible = echo.life > 0;
      if (!ghost.visible) return;
      const k = echo.life / echoTrail.lifetime;
      ghost.position.set(echo.x, echo.y, 4.86);
      ghost.scale.set(1.45 * echo.scaleX * (1 + (1 - k) * .18),
        1.45 * echo.scaleY * (1 + (1 - k) * .18), 1);
      ghost.material.rotation = echo.angle;
      ghost.material.map = echo.texture;
      ghost.material.opacity = 0.46 * k * k;
    });
    platform.visible = snapshot.state === 'ready' || snapshot.launchTime > 0;
    platform.position.x = -2 - (snapshot.state === 'playing' ? (.72 - snapshot.launchTime) * 5.2 : 0);
    const obstacleIds = new Set(snapshot.obstacles.map(o => o.id));
    for (const id of obstacles.keys()) if (!obstacleIds.has(id)) removeGroup(obstacles, id);
    for (const o of snapshot.obstacles) {
      const group = obstacles.get(o.id) || makeObstacle(o);
      group.position.x = o.x;
      const { parts: p, capHeight: ch, lines, leaves } = group.userData;
      const lo = o.centerY - o.gap / 2, hi = o.centerY + o.gap / 2;
      const capHeight = ch * (reducedMotion || p.bottomFlame ? 1 : .99 + Math.sin(elapsed * 2.8 + o.id) * .01);
      const layout = obstacleLayout(o, capHeight, c.height / 2 + 1);
      // A fixed root width and a short opaque overlap keep the shaft out of the spikes.
      for (const cap of [p.bottomCap, p.topCap]) cap.scale.set(o.width, capHeight, 1);
      p.bottomCap.position.y = layout.bottom.capY; p.topCap.position.y = layout.top.capY;
      if (p.bottomFlame) {
        for (const [flame, edge, direction, phase] of [[p.bottomFlame, lo, -1, 0], [p.topFlame, hi, 1, 1.7]]) {
          flame.scale.set(o.width, ch, 1);
          flame.position.y = edge + direction * (ch / 2 - ch * 5 / 150);
          deformFlame(flame.geometry, elapsed, -direction, o.id + phase, reducedMotion);
          flame.material.opacity = reducedMotion ? 1 : .94 + Math.sin(elapsed * 13 + o.id + phase) * .06;
        }
      }
      for (const [side, faceY] of [['bottom', lo - ch - .75], ['top', hi + ch + .75]]) {
        const { stemHeight: height, stemY } = layout[side];
        for (const stem of [p[`${side}Stem`], p[`${side}Fill`], p[`${side}Detail`]]) { stem.scale.y = height; stem.position.y = stemY; }
        const detail = p[`${side}Detail`], uv = detail.geometry.attributes.uv;
        const drift = reducedMotion ? 0 : Math.sin(elapsed * 1.4 + o.id) * .018;
        for (let i = 0; i < 4; i++) uv.setY(i, (i < 2 ? height / 2.4 : 0) + drift);
        uv.needsUpdate = true;
        const eyes = p[`${side}Eyes`], mouth = p[`${side}Mouth`], faceWidth = o.width * .78;
        eyes.visible = mouth.visible = height > 1.6;
        eyes.position.y = faceY + faceWidth * .16; mouth.position.y = faceY - faceWidth * .26;
        const phase = (elapsed + o.id * .71 + (side === 'top' ? 1.2 : 0)) % 3.2;
        const blink = !reducedMotion && phase < .18 ? 1 - .92 * Math.sin(phase / .18 * Math.PI) : 1;
        eyes.scale.y = faceWidth * blink;
        mouth.scale.y = faceWidth * (1 + (reducedMotion ? 0 : Math.sin(elapsed * 3 + o.id) * .14));
      }
      for (const { obj, side, index } of leaves) {
        obj.position.y = side < 0 ? lo - ch - 2.05 - index * 1.65 : hi + ch + 2.05 + index * 1.65;
        obj.visible = Math.abs(obj.position.y) < 8.65;
        obj.material.rotation = (index % 2 ? -.4 : .4) + (reducedMotion ? 0 : Math.sin(elapsed * 2.8 + o.id + index + side) * .22);
        const swell = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2 + o.id + index) * .07;
        obj.scale.set(.52 * swell, .52 * swell, 1);
      }
      if (lines) { lines[0].position.y = lo - 6; lines[1].position.y = hi + 6; }
    }
    const pickupIds = new Set(snapshot.pickups.map(p => p.id));
    for (const id of pickups.keys()) if (!pickupIds.has(id)) removeGroup(pickups, id);
    for (const p of snapshot.pickups) {
      let obj = pickups.get(p.id);
      if (!obj) { obj = sprite(p.type, p.type === 'star' ? .95 : .78, p.type === 'star' ? .95 : .78, 3); pickups.set(p.id, obj); scene.add(obj); }
      obj.position.set(p.x, p.y, 3); obj.material.rotation = Math.sin(elapsed * 2) * .08;
    }
    for (const list of [puffs, sparks]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i]; e.life -= dt;
        if (e.life <= 0) { scene.remove(e.obj); e.obj.material.dispose(); materials.delete(e.obj.material); list.splice(i, 1); continue; }
        e.obj.position.x += e.vx * dt; e.obj.position.y += e.vy * dt;
        e.vy += e.gravity * dt;
        const k = e.life / e.duration;
        if (e.stardust) {
          const appearance = stardustAppearance(e.duration - e.life, e.duration, e.phase, reducedMotion);
          e.obj.material.opacity = appearance.opacity;
          const size = e.size * appearance.scale;
          e.obj.scale.set(size, size, 1);
          if (!reducedMotion) e.obj.material.rotation += e.spin * dt;
        } else {
          e.obj.material.opacity = e.liquid ? Math.min(1, k * 2.5) : k * .75;
          const size = e.size * (1 + (1 - k) * (e.liquid ? .25 : .8));
          e.obj.scale.set(size, size, 1);
          if (e.gravity) e.obj.material.rotation = Math.atan2(e.vy, e.vx) - Math.PI / 2;
        }
      }
    }
    if (bodyOutline) { bodyOutline.position.x = snapshot.player.x; bodyOutline.position.y = snapshot.player.y; }
    camera.position.x = shake ? Math.sin(elapsed * 110) * shake * .14 : 0;
    renderer.render(scene, camera);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
  }
  await renderer.compileAsync(scene, camera);
  for (const { glow } of voidContours) glow.visible = false;
  host.appendChild(renderer.domElement); resize();
  const observer = new ResizeObserver(resize); observer.observe(host);
  window.addEventListener('resize', resize);
  return {
    render, consume, setStyle,
    dispose() {
      observer.disconnect(); window.removeEventListener('resize', resize); clearEffects();
      for (const id of [...obstacles.keys()]) removeGroup(obstacles, id);
      for (const id of [...pickups.keys()]) removeGroup(pickups, id);
      for (const material of materials) material.dispose();
      for (const texture of textures.values()) texture.dispose();
      bodyOutline?.geometry.dispose(); plane.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
