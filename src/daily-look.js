import { curatedLook } from './lookbook.js';
import { normalizeOutfit, outfitLayers, removeLayer } from './layers.js';
import { periodWeather } from './weather.js';
import { targetWarmth, warmth } from './wardrobe.js';

// Prepare one wardrobe for the whole day; time changes only removable layers.
export function dailyLook(day, period = 'day', sensitivity = 0) {
  const temperatures = ['morning', 'day', 'evening'].map(p => periodWeather(day, p).feels);
  const coldest = Math.min(...temperatures);
  const feels = period === 'all' ? coldest : periodWeather(day, period).feels;
  let base = normalizeOutfit(curatedLook(coldest, sensitivity));
  if (coldest - Number(sensitivity) * 3 >= 26) {
    base = normalizeOutfit({ top: 'tee', outer: 'none', bottom: 'shorts', shoes: 'sneakers' });
  }
  base.layers = base.layers.map((l, i) => ({ ...l, key: `daily-${day.date}-${i}` }));
  let look = structuredClone(base);
  const target = targetWarmth(feels, sensitivity);
  const carried = [];
  if (look.scarf && warmth(look) - 2 >= target - 2) {
    look.scarf = false;
    carried.push('scarf');
  }
  for (const layer of [...outfitLayers(base)].reverse().filter(l => l.category === 'outer')) {
    const lighter = removeLayer(look, layer.key);
    if (warmth(lighter) >= target - 2) {
      look = lighter;
      carried.push(layer.id);
    }
  }
  if (look.hat === 'beanie' && warmth(look) - 1 >= target - 2) {
    look.hat = 'none';
    carried.push('beanie');
  }
  return { ...look, carried };
}
