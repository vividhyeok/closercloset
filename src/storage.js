export const SETTINGS_KEY = 'closer.settings.v1';
export const LOOKS_KEY = 'closer.looks.v1';
export function readStorage(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function validSettings(value) {
  return value?.onboarded === true && ['female', 'male'].includes(value.gender) && typeof value.city?.name === 'string' && Number.isFinite(value.city.lat) && Number.isFinite(value.city.lon) && Math.abs(value.city.lat) <= 90 && Math.abs(value.city.lon) <= 180 && (value.sensitivity == null || Number.isFinite(value.sensitivity) && Math.abs(value.sensitivity) <= 3);
}
