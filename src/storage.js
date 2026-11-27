export const SETTINGS_KEY = 'closer.settings.v1';
export const LOOKS_KEY = 'closer.looks.v1';

export function readStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) ?? fallback : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function validSettings(value) {
  return Boolean(
    value?.onboarded === true &&
      ['female', 'male'].includes(value.gender) &&
      typeof value.city?.name === 'string' &&
      Number.isFinite(value.city.lat) &&
      Number.isFinite(value.city.lon) &&
      Math.abs(value.city.lat) <= 90 &&
      Math.abs(value.city.lon) <= 180 &&
      (value.sensitivity == null || (Number.isFinite(value.sensitivity) && Math.abs(value.sensitivity) <= 3))
  );
}

export function sanitizeLooks(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(
    look =>
      look &&
      typeof look.id === 'string' &&
      typeof look.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(look.date) &&
      look.outfit &&
      typeof look.outfit === 'object'
  );
}
