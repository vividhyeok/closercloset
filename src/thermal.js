// Relative clothing insulation model for this prototype, not measured clo values.
export const FABRICS = {
  cotton: { name: '코튼', insulation: 1.6 },
  linen: { name: '리넨', insulation: 1.1 },
  jersey: { name: '저지', insulation: 1.8 },
  wool: { name: '울 니트', insulation: 2.4 },
  thermal: { name: '발열 원단', insulation: 2.5 },
  shell: { name: '코튼 트윌', insulation: 2 },
  leather: { name: '레더', insulation: 1.5 },
  down: { name: '충전재', insulation: 4.6 },
  denim: { name: '데님', insulation: 2.1 },
  chino: { name: '치노', insulation: 1.9 },
  slacks: { name: '슬랙스 원단', insulation: 1.9 },
  fleece: { name: '기모', insulation: 2.2 },
};

// [material, relative thickness, covered body area, wind resistance (0..1)]
export const THERMAL_PROFILES = {
  sleeveless: ['cotton', 0.5, 0.35, 0.05],
  tee: ['cotton', 0.9, 0.6, 0.05],
  'stripe-tee': ['cotton', 0.9, 0.6, 0.05],
  'linen-shirt': ['linen', 0.8, 0.6, 0.1],
  long: ['cotton', 1.1, 0.95, 0.1],
  knit: ['wool', 1.6, 0.95, 0.2],
  hoodie: ['jersey', 2, 0.95, 0.3],
  shirt: ['cotton', 1, 0.95, 0.2],
  raglan: ['jersey', 1.1, 0.85, 0.1],
  sweatshirt: ['jersey', 1.7, 0.95, 0.2],
  'thermal-top': ['thermal', 1.2, 0.95, 0.15],
  cardigan: ['wool', 1.2, 0.95, 0.1],
  jacket: ['shell', 2.1, 0.95, 0.8],
  leather: ['leather', 2.8, 0.95, 0.95],
  coat: ['wool', 2.6, 1.05, 0.7],
  puffer: ['down', 2, 0.95, 0.95],
  quilted: ['down', 1.2, 0.95, 0.8],
  'regular-denim': ['denim', 1.4, 0.95, 0.5],
  'straight-denim': ['denim', 1.4, 0.95, 0.5],
  'tapered-chino': ['chino', 1.3, 0.95, 0.4],
  'regular-slacks': ['slacks', 1, 0.95, 0.3],
  slacks: ['slacks', 1, 0.95, 0.3],
  denim: ['denim', 1.4, 0.95, 0.5],
  chino: ['chino', 1.3, 0.95, 0.4],
  cargo: ['chino', 1.4, 0.95, 0.5],
  fleece: ['fleece', 2.2, 0.95, 0.3],
  shorts: ['cotton', 0.8, 0.35, 0.1],
  'thermal-bottom': ['thermal', 0.85, 0.9, 0.1],
};

export function garmentProfile(id) {
  const p = THERMAL_PROFILES[id];
  if (!p) return null;
  const [material, thickness, coverage, windResistance] = p;
  const fabric = FABRICS[material];
  return {
    material,
    materialName: fabric.name,
    thickness,
    coverage,
    windResistance,
    insulation: fabric.insulation * thickness * coverage + windResistance * 0.8,
    label: `${fabric.name} · ${thickness < 1 ? '얇음' : thickness >= 2 ? '두꺼움' : '보통'}`,
  };
}

export function clothingWarmth(layers, getGarment) {
  const seen = new Map();
  const regions = new Map();
  let score = 0;
  for (const layer of layers) {
    const item = getGarment(layer.category, layer.id);
    const profile = garmentProfile(layer.id);
    const key = `${layer.category}:${layer.id}`;
    const repeats = seen.get(key) || 0;
    const region = layer.category === 'outer' ? 'outer' : layer.category === 'bottom' ? 'bottom' : 'top';
    const stack = regions.get(region) || 0;
    // Additional fabric still helps, but repeated/compressed layers have diminishing return.
    score += ((profile?.insulation ?? item.warmth) * Math.max(0.65, 1 - stack * 0.06)) / (1 + repeats * 0.2);
    seen.set(key, repeats + 1);
    regions.set(region, stack + 1);
  }
  return score;
}
