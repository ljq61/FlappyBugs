// Cosmetic unlocks are earned through ordinary play. No purchases, ads or remote assets.
export const SKINS = Object.freeze([
  { id: 'classic', name: 'Garden', nameZh: '花园', metric: 'best', need: 0, color: '#fa8b6d', shellColors: ['#c95569', '#fa8b6d', '#f47777', '#ffd9a0', '#c9566d'] },
  { id: 'sunset', name: 'Sunset', nameZh: '晚霞', metric: 'best', need: 30, color: '#ff9b70', shellColors: ['#b45474', '#ff9b70', '#de6679', '#ffe4ad', '#823a66'] },
  { id: 'mint', name: 'Mint', nameZh: '薄荷', metric: 'totalPassed', need: 200, color: '#9fdfbf', shellColors: ['#398d80', '#9fdfbf', '#5ab6a1', '#e3ffce', '#31686a'] },
  { id: 'blue', name: 'Sky', nameZh: '晴空', metric: 'best', need: 70, color: '#8fcaff', shellColors: ['#446ab4', '#8fcaff', '#6395da', '#dcf5ff', '#354e92'] },
  { id: 'violet', name: 'Lavender', nameZh: '薰衣草', metric: 'bestCombo', need: 20, color: '#d1adff', shellColors: ['#7957a5', '#d1adff', '#a87dd5', '#f6ddff', '#5c3f81'] },
  { id: 'honey', name: 'Honey', nameZh: '蜂蜜', metric: 'totalPassed', need: 1000, color: '#ffdf77', shellColors: ['#c48b32', '#ffdf77', '#efbb48', '#ffffcc', '#9b642c'] },
]);
export const TRAILS = Object.freeze([
  { id: 'cloud', name: 'Cloud', nameZh: '云朵', metric: 'best', need: 0, color: '#ffffff', preview: 'puff' },
  // Keep the saved id so an earned Sunshine selection becomes Star on upgrade.
  { id: 'sunny', name: 'Star', nameZh: '星星', metric: 'bestCombo', need: 10, color: '#ffd777', preview: 'trail-star' },
  { id: 'stardust', name: 'Stardust', nameZh: '星尘', metric: 'totalPassed', need: 500, color: '#a9bbff', preview: 'stardust-glint' },
]);
export function unlockProgress(item, progress) {
  const target = item.need;
  const value = progress?.[item.metric];
  const current = Number.isFinite(value) && value >= 0
    ? Math.min(target, Math.floor(value)) : 0;
  return { current, target, ratio: target > 0 ? current / target : 1 };
}
export function isUnlocked(item, progress) {
  return unlockProgress(item, progress).ratio === 1;
}
export function available(items, progress) {
  return items.filter(item => isUnlocked(item, progress));
}
export function selected(items, id, progress) {
  return available(items, progress).find(item => item.id === id) || items[0];
}
export function cycle(items, id, progress) {
  const unlocked = available(items, progress);
  const position = unlocked.findIndex(item => item.id === id);
  return unlocked[(position + 1) % unlocked.length];
}
export function nextUnlock(items, progress) {
  return items.find(item => !isUnlocked(item, progress)) || null;
}
