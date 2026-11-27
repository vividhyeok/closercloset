import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyLook } from '../src/daily-look.js';
import { outfitLayers } from '../src/layers.js';

const day = {
  date: '2026-11-25',
  feelsMin: 3,
  feelsMax: 19,
  min: 3,
  max: 19,
  hours: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    temp: hour < 11 ? 4 : hour < 18 ? 19 : 3,
    feels: hour < 11 ? 4 : hour < 18 ? 19 : 3,
  })),
};

test('time of day only removes outer layers from the same wardrobe', () => {
  const morning = dailyLook(day, 'morning');
  const noon = dailyLook(day, 'day');
  const evening = dailyLook(day, 'evening');
  assert.equal(morning.top, noon.top);
  assert.equal(noon.top, evening.top);
  assert.equal(morning.bottom, noon.bottom);
  assert.equal(noon.bottom, evening.bottom);
  assert.equal(morning.shoes, noon.shoes);
  assert.equal(noon.outer, 'none');
  assert.equal(evening.outer, morning.outer);
  const planned = new Set(outfitLayers(morning).map(l => l.key));
  for (const l of outfitLayers(noon)) assert.ok(planned.has(l.key));
  assert.deepEqual(dailyLook(day, 'morning'), morning);
});
