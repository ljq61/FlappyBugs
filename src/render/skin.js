export const SKIN_POSES = Object.freeze(['beetle', 'beetle-flap', 'beetle-fall', 'beetle-hurt', 'beetle-dizzy']);
const SOURCE_COLORS = ['#c95569', '#fa8b6d', '#f47777', '#ffd9a0', '#c9566d'];

// Every editable pose has one flat abdomen group. Recolor that vector layer
// before texture upload, preserving the exact head, legs, outlines and wings.
export function recolorShell(svg, colors) {
  if (!Array.isArray(colors) || colors.length !== 5 || !colors.every(c => /^#[\da-f]{6}$/i.test(c))) {
    throw new TypeError('A shell palette needs five hex colors');
  }
  const shell = svg.match(/<g id="abdomen">[\s\S]*?<\/g>/);
  if (!shell || /<g\b/.test(shell[0].slice('<g id="abdomen">'.length))) {
    throw new Error('Missing flat abdomen layer');
  }
  const changed = shell[0].replace(/#[\da-f]{6}/gi, color => {
    const index = SOURCE_COLORS.indexOf(color.toLowerCase());
    return index < 0 ? color : colors[index];
  });
  return svg.slice(0, shell.index) + changed + svg.slice(shell.index + shell[0].length);
}
