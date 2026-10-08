// The void rush should glow along the beetle's actual alpha silhouette,
// rather than using the star pickup's large five-point sprite.
export const VOID_GLOW_SHADER_KEY = 'flappybugs-void-blue-contour-v1';

export function isVoidRush(snapshot) {
  return snapshot.state === 'playing' && snapshot.rushTime > 0;
}

export function showStarAura(snapshot) {
  return snapshot.starTime > 0 && !isVoidRush(snapshot);
}

/**
 * Add a cyan/blue contour to an ordinary Three.js SpriteMaterial.
 * The glow samples the sprite texture's alpha outside the original artwork,
 * so it follows body/wing poses with no extra glow textures or geometry.
 * This material must always have a map with a 256x256 alpha texture.
 */
export function installVoidContour(material, glowTime) {
  material.customProgramCacheKey = () => VOID_GLOW_SHADER_KEY;
  material.onBeforeCompile = shader => {
    shader.uniforms.voidContourTime = glowTime;
    shader.fragmentShader = `uniform float voidContourTime;\n` + shader.fragmentShader;
    const token = '#include <map_fragment>';
    if (!shader.fragmentShader.includes(token)) throw new Error('Missing mapped-sprite fragment hook');
    shader.fragmentShader = shader.fragmentShader.replace(token, `
      ${token}
      // Body art and wings are 256x256 SVG textures rendered as sprites.
      // Read neighboring alpha to find the *outside* of their actual silhouette.
      vec2 px = vec2(1.0 / 256.0);
      vec2 nearPx = px * 4.0;
      vec2 farPx = px * 9.0;
      float a = diffuseColor.a;
      float nearA = 0.0;
      nearA = max(nearA, texture2D(map, vMapUv + vec2(nearPx.x, 0.0)).a);
      nearA = max(nearA, texture2D(map, vMapUv - vec2(nearPx.x, 0.0)).a);
      nearA = max(nearA, texture2D(map, vMapUv + vec2(0.0, nearPx.y)).a);
      nearA = max(nearA, texture2D(map, vMapUv - vec2(0.0, nearPx.y)).a);
      nearA = max(nearA, texture2D(map, vMapUv + nearPx * 0.7071).a);
      nearA = max(nearA, texture2D(map, vMapUv - nearPx * 0.7071).a);
      nearA = max(nearA, texture2D(map, vMapUv + vec2(nearPx.x, -nearPx.y) * 0.7071).a);
      nearA = max(nearA, texture2D(map, vMapUv + vec2(-nearPx.x, nearPx.y) * 0.7071).a);
      float farA = 0.0;
      farA = max(farA, texture2D(map, vMapUv + vec2(farPx.x, 0.0)).a);
      farA = max(farA, texture2D(map, vMapUv - vec2(farPx.x, 0.0)).a);
      farA = max(farA, texture2D(map, vMapUv + vec2(0.0, farPx.y)).a);
      farA = max(farA, texture2D(map, vMapUv - vec2(0.0, farPx.y)).a);
      float rim = max(nearA - a, 0.0);
      float haze = max(farA - max(nearA, a), 0.0);
      float shimmer = 0.88 + 0.12 * sin(voidContourTime * 8.0 + vMapUv.y * 24.0);
      diffuseColor.rgb = mix(vec3(0.035, 0.35, 1.0), vec3(0.34, 0.96, 1.0),
        0.5 + 0.5 * sin(voidContourTime * 3.5 + vMapUv.x * 10.0));
      // A sharp outer rim plus subtle haze and a faint interior blue edge.
      diffuseColor.a = clamp((rim * 0.95 + haze * 0.38 + a * 0.08) * shimmer, 0.0, 1.0);
    `);
  };
}
