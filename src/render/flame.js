import * as THREE from 'three';

// Separate grids let each flame curl without changing shared sprite geometry.
export function createFlameGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 12, 18);
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.userData.restPositions = geometry.attributes.position.array.slice();
  return geometry;
}

export function deformFlame(geometry, time, direction = 1, phase = 0, reducedMotion = false) {
  const position = geometry.attributes.position;
  const rest = geometry.userData.restPositions;
  if (reducedMotion) {
    position.array.set(rest);
    position.needsUpdate = true;
    return;
  }
  const shrink = .97 + .03 * Math.sin(time * 8 + phase);
  for (let i = 0; i < position.count; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1];
    const rise = direction * y + .5;
    const curl = rise * rise * (
      .065 * Math.sin(time * 5.5 - rise * 5 + phase)
      + .023 * Math.sin(time * 11 - rise * 9 + phase));
    // Root and both side edges stay fixed; the whole warp stays in the old cap.
    position.setXY(i, x + curl * (1 - 4 * x * x), direction * (rise * shrink - .5));
  }
  position.needsUpdate = true;
}
