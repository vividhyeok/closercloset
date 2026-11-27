let sequence = 0;
const layer = (category, id) => ({ key: `layer-${Date.now()}-${++sequence}`, category, id });

export function outfitLayers(outfit) {
  if (!outfit) return [];
  if (Array.isArray(outfit.layers)) return outfit.layers;
  const list = [];
  if (outfit.thermal) list.push(layer('top', 'thermal-top'));
  if (outfit.top && outfit.top !== 'none') list.push(layer('top', outfit.top));
  if (outfit.shirtLayer) list.push(layer('top', 'shirt'));
  if (outfit.outer && outfit.outer !== 'none') list.push(layer('outer', outfit.outer));
  if (outfit.bottom && outfit.bottom !== 'none') list.push(layer('bottom', outfit.bottom));
  return list;
}

export function normalizeOutfit(outfit = {}) {
  const layers = outfitLayers(outfit);
  const last = (category, exclude = []) =>
    layers.filter(l => l.category === category && !exclude.includes(l.id)).at(-1)?.id;
  return {
    ...outfit,
    layers,
    top: last('top', ['thermal-top']) || 'tee',
    outer: last('outer') || 'none',
    bottom: last('bottom', ['thermal-bottom']) || 'regular-denim',
    shoes: outfit.shoes || 'sneakers',
    hat: outfit.hat || 'none',
    scarf: Boolean(outfit.scarf),
    thermal: layers.some(l => l.id === 'thermal-top'),
    shirtLayer: false,
    colors: outfit.colors && typeof outfit.colors === 'object' ? { ...outfit.colors } : {},
  };
}

export function addLayer(outfit, category, id) {
  const { lookId, ...parts } = outfit;
  const clean = parts;
  if (!['top', 'outer', 'bottom'].includes(category)) {
    return { ...normalizeOutfit(clean), [category]: id };
  }
  const layers = [...outfitLayers(clean)];
  if (id === 'none') {
    return normalizeOutfit({ ...clean, layers: layers.filter(l => l.category !== category) });
  }
  const next = layer(category, id);
  const before =
    category === 'top'
      ? id === 'thermal-top'
        ? layers.findIndex(l => ['top', 'outer'].includes(l.category))
        : layers.findIndex(l => l.category === 'outer')
      : category === 'bottom' && id === 'thermal-bottom'
        ? layers.findIndex(l => l.category === 'bottom')
        : -1;
  if (before >= 0) layers.splice(before, 0, next);
  else layers.push(next);
  return normalizeOutfit({ ...clean, layers });
}

export function removeLayer(outfit, key) {
  return normalizeOutfit({ ...outfit, layers: outfitLayers(outfit).filter(l => l.key !== key) });
}

export function countLayers(outfit, region = 'top') {
  return outfitLayers(outfit).filter(l => (region === 'top' ? ['top', 'outer'].includes(l.category) : l.category === 'bottom')).length;
}

export const upperLayers = outfit => outfitLayers(outfit).filter(l => ['top', 'outer'].includes(l.category));
export const lowerLayers = outfit => outfitLayers(outfit).filter(l => l.category === 'bottom');

export function moveLayer(outfit, key, targetKey, after = false) {
  const layers = [...outfitLayers(outfit)];
  const from = layers.findIndex(l => l.key === key);
  const target = layers.findIndex(l => l.key === targetKey);
  if (from < 0 || target < 0 || from === target) return normalizeOutfit(outfit);
  const region = l => (l.category === 'bottom' ? 'bottom' : 'upper');
  if (region(layers[from]) !== region(layers[target])) return normalizeOutfit(outfit);
  const [moving] = layers.splice(from, 1);
  const index = layers.findIndex(l => l.key === targetKey);
  layers.splice(index + (after ? 1 : 0), 0, moving);
  return normalizeOutfit({ ...outfit, layers });
}

export function sameOutfit(a, b) {
  if (!a || !b) return false;
  const na = normalizeOutfit(a);
  const nb = normalizeOutfit(b);
  if (na.shoes !== nb.shoes || na.hat !== nb.hat || na.scarf !== nb.scarf) return false;
  const la = outfitLayers(na);
  const lb = outfitLayers(nb);
  if (la.length !== lb.length) return false;
  for (let i = 0; i < la.length; i++) {
    if (la[i].category !== lb[i].category || la[i].id !== lb[i].id) return false;
  }
  const cats = ['outer', 'top', 'bottom', 'shoes', 'hat'];
  for (const cat of cats) {
    if ((na.colors?.[cat] || null) !== (nb.colors?.[cat] || null)) return false;
  }
  return true;
}
