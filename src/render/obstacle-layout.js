// The cap's last 20 SVG pixels form its opaque root; only the last 8 hide the stem.
export function obstacleLayout({ centerY, gap }, capHeight, extent = 9) {
  const lower = centerY - gap / 2, upper = centerY + gap / 2;
  const tipInset = capHeight * 5 / 150;
  const overlap = capHeight * 8 / 150;
  const bottomHeight = Math.max(.01, lower + extent - capHeight + tipInset + overlap);
  const topHeight = Math.max(.01, extent - upper - capHeight + tipInset + overlap);
  return {
    bottom: { capY: lower - capHeight / 2 + tipInset, stemHeight: bottomHeight, stemY: -extent + bottomHeight / 2 },
    top: { capY: upper + capHeight / 2 - tipInset, stemHeight: topHeight, stemY: extent - topHeight / 2 },
  };
}
