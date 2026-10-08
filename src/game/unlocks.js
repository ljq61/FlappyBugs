// Cosmetic unlocks are earned through ordinary play. No purchases, ads or remote assets.
export const SKINS = Object.freeze([
  { id: 'classic', name: 'Garden', need: 0, color: '#ffffff' },
  { id: 'sunset', name: 'Sunset', need: 3, color: '#f9ad88' },
  { id: 'mint', name: 'Mint', need: 6, color: '#91d8b3' },
  { id: 'blue', name: 'Sky', need: 10, color: '#a5c5ff' },
  { id: 'violet', name: 'Lavender', need: 15, color: '#cba7ff' },
  { id: 'honey', name: 'Honey', need: 25, color: '#ffd36f' },
]);
export const TRAILS = Object.freeze([
  { id: 'cloud', name: 'Cloud', need: 0, color: '#ffffff' },
  { id: 'sunny', name: 'Sunshine', need: 3, color: '#ffd777' },
  { id: 'stardust', name: 'Stardust', need: 6, color: '#a9bbff' },
]);
export function available(items, record) {
  return items.filter(item => item.need <= record);
}
export function selected(items, id, record) {
  return available(items, record).find(item => item.id === id) || items[0];
}
export function cycle(items, id, record) {
  const unlocked = available(items, record);
  const position = unlocked.findIndex(item => item.id === id);
  return unlocked[(position + 1) % unlocked.length];
}
export function nextUnlock(items, record) {
  return items.find(item => item.need > record) || null;
}
