import catalog from '../public/art/catalog-front.json' with { type: 'json' };
import { getGarment } from './wardrobe.js';
import { outfitLayers, upperLayers, lowerLayers } from './layers.js';

export const COLOR_FILTERS = {
  '#eee8db': 'saturate(.1) brightness(1.65)',
  '#51524e': 'saturate(.1) brightness(.64)',
  '#8a967c': 'sepia(.35) hue-rotate(25deg) saturate(.6)',
  '#667e96': 'sepia(.4) hue-rotate(157deg) saturate(.7)',
  '#9b4c50': 'sepia(.5) hue-rotate(305deg) saturate(1.3)',
  '#4b69a6': 'sepia(.55) hue-rotate(170deg) saturate(1.6)',
  '#baa98b': 'sepia(.45) saturate(.65) brightness(1.2)',
};

const art = (gender, id) => catalog.garments[gender]?.[id];

const styleFor = ({ src, size: [iw, ih], rect: [x, y, w, h] }) => {
  const posX = iw === w ? 0 : (x / (iw - w)) * 100;
  const posY = ih === h ? 0 : (y / (ih - h)) * 100;
  return `background-image:url('${src}');background-size:${(iw / w) * 100}% ${(ih / h) * 100}%;background-position:${posX}% ${posY}%;background-repeat:no-repeat;`;
};

export function composeLayers(outfit, gender = 'female', mood = 'good') {
  const pose = catalog.poses[gender] || catalog.poses.female;
  const base = { ...catalog.base, rect: pose.rect };
  const layers = [];
  const uppers = upperLayers(outfit);
  const lowers = lowerLayers(outfit);
  const upper = uppers[Math.max(0, uppers.length - 1 - (outfit.peekTop || 0))];
  const bottom = lowers[Math.max(0, lowers.length - 1 - (outfit.peekBottom || 0))]?.id;
  const top = upper?.category === 'top' ? upper.id : null;
  const outer = upper?.category === 'outer' ? upper.id : null;
  const customShoes = Boolean(catalog.footwear?.[gender]?.[outfit.shoes]);
  const coherentUpper = !upper || Boolean(art(gender, upper.id)?.includesHead);
  const lowerClip = customShoes
    ? [
        [0, 0.48],
        [1, 0.48],
        [1, 0.925],
        [0, 0.925],
      ]
    : [
        [0, 0.48],
        [1, 0.48],
        [1, 1],
        [0, 1],
      ];
  const lowerBodyDest = [pose.dest[0], 264 + ((pose.rect[1] - 480) * 256) / 450, pose.dest[2], (pose.rect[3] * 256) / 450];

  function basePart(id, rect, sourcePolygon) {
    const [bx, by, bw, bh] = pose.rect;
    const [dx, dy, dw, dh] = pose.dest;
    const [x, y, w, h] = rect;
    layers.push({
      id,
      image: { ...catalog.base, rect },
      dest: [dx + ((x - bx) / bw) * dw, dy + ((y - by) / bh) * dh, (w / bw) * dw, (h / bh) * dh],
      ...(sourcePolygon ? { clip: sourcePolygon.map(p => [(p[0] - x) / w, (p[1] - y) / h]) } : {}),
    });
  }

  function add(id, category, dest, options = {}) {
    const image = art(gender, id);
    if (!image) return;
    const neckCutouts =
      ['cardigan', 'jacket', 'leather', 'coat', 'puffer', 'quilted'].includes(id) &&
      uppers.slice(0, uppers.findIndex(l => l.id === id)).some(l => l.category === 'top')
        ? (image.preserveColor || []).slice(1).filter(poly => poly.reduce((sum, p) => sum + p[1], 0) / poly.length < 0.6)
        : [];
    const layer = {
      id: category,
      image,
      dest: image.dest || dest,
      color: outfit.colors?.[category],
      ...(image.includesHead
        ? {
            clipWorld: [
              [0, gender === 'male' ? 100 : 114],
              [400, gender === 'male' ? 100 : 114],
              [400, 600],
              [0, 600],
            ],
          }
        : {}),
      ...options,
      cutouts: [...neckCutouts, ...(options.cutouts || [])],
    };
    layers.push(layer);
    if (layer.color && image.preserveColor) {
      layers.push({ ...layer, id: 'natural-skin', color: null, clipPolygons: image.preserveColor });
    }
  }

  if (!upper && !bottom) {
    layers.push({
      id: 'base',
      image: base,
      dest: pose.dest,
      clipWorld: [
        [0, 105],
        [400, 105],
        [400, customShoes ? 510 : 600],
        [0, customShoes ? 510 : 600],
      ],
    });
  } else {
    if (!bottom || bottom === 'shorts') {
      layers.push({ id: 'body-lower', image: base, dest: lowerBodyDest, clip: lowerClip, opacity: bottom ? 1 : 0.25 });
    } else if (!customShoes) {
      if (gender === 'male') basePart('base-shoe', [303, 970, 176, 67]);
      else {
        basePart('base-shoe-left', [729, 955, 177, 93]);
        basePart('base-shoe-right', [970, 993, 111, 62]);
      }
    }
    if (!coherentUpper) basePart('head', pose.head);
    if (!coherentUpper && (top === 'tee' || !upper)) {
      if (gender === 'male') {
        basePart('arm', [345, 344, 170, 215], [
          [451, 344],
          [508, 352],
          [504, 395],
          [481, 438],
          [451, 482],
          [434, 514],
          [419, 544],
          [392, 540],
          [382, 520],
          [407, 474],
          [427, 432],
          [442, 391],
        ]);
      } else {
        basePart('arm-left', [865, 330, 94, 315], [
          [925, 337],
          [950, 345],
          [937, 408],
          [918, 468],
          [907, 513],
          [905, 548],
          [896, 586],
          [883, 624],
          [871, 625],
          [867, 600],
          [876, 551],
          [885, 493],
          [900, 431],
          [915, 366],
        ]);
        basePart('arm-right', [1018, 337, 151, 220], [
          [1135, 340],
          [1164, 350],
          [1150, 411],
          [1129, 450],
          [1100, 489],
          [1083, 530],
          [1048, 554],
          [1025, 539],
          [1044, 504],
          [1056, 474],
          [1084, 440],
          [1107, 400],
          [1119, 355],
        ]);
      }
    }
    if (!upper) add('tee', 'base-upper', pose.top, { opacity: 0.25 });
  }

  if (bottom) add(bottom, 'bottom', bottom === 'shorts' ? pose.shorts : pose.bottom);

  const under = upper ? uppers.slice(0, uppers.indexOf(upper)) : [];
  const visibleHem = upper ? art(gender, upper.id)?.hem : null;
  const innerDest = image => {
    const [x, y, w, h] = image.dest;
    return [210 + (x - 210) * 0.88, y, w * 0.88, h];
  };
  const coverInk = poly => {
    const xs = poly.map(p => p[0]);
    const ys = poly.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return poly.map(([x, y]) => [Math.max(0, Math.min(1, cx + (x - cx) * 1.35)), Math.max(0, Math.min(1, cy + (y - cy) * 1.25))]);
  };

  if (visibleHem) {
    for (const inner of under) {
      const image = art(gender, inner.id);
      if (inner.id === 'coat' && image?.hem > visibleHem + 3) {
        layers.push({
          id: 'exposed-hem',
          image: catalog.coatTails[gender],
          dest: [148.5, 220, 123, image.hem - 220],
          color: outfit.colors?.outer,
        });
      } else if (image?.hem > visibleHem + 12) {
        add(inner.id, 'exposed-hem', pose.sleeved, {
          dest: innerDest(image),
          clipWorld: [
            [170, visibleHem - 18],
            [250, visibleHem - 18],
            [250, 600],
            [170, 600],
          ],
          cutouts: (image.preserveColor || [])
            .slice(1)
            .filter(poly => poly.reduce((sum, p) => sum + p[1], 0) / poly.length > 0.6)
            .map(coverInk),
          color: outfit.colors?.[inner.category],
        });
      }
    }
  }

  if (top) add(top, 'visible-upper', top === 'tee' ? pose.top : pose.sleeved, { color: outfit.colors?.top });
  if (outer && outer !== 'none') {
    const dest = outer === 'coat' ? pose.coat : pose.outer;
    for (const hidden of under) {
      const image = art(gender, hidden.id);
      if (image) {
        add(hidden.id, 'inner', pose.sleeved, {
          dest: innerDest(image),
          clipWorld:
            hidden.id === 'coat'
              ? [
                  [153, gender === 'male' ? 100 : 114],
                  [252, gender === 'male' ? 100 : 114],
                  [254, 250],
                  [145, 250],
                ]
              : pose.bodyClip,
          color: outfit.colors?.[hidden.category],
        });
      }
    }
    add(outer, 'visible-upper', dest, { hole: art(gender, outer)?.opening, color: outfit.colors?.outer });
  }

  if (upper?.id !== 'hoodie' && under.some(l => l.id === 'hoodie')) {
    layers.push({
      id: 'exposed-hood',
      image: catalog.hoods[gender],
      dest: [gender === 'male' ? 158 : 163, 103, 100, 80],
      color: outfit.colors?.top,
    });
  }

  if (outfit.scarf) add('scarf', 'accessory', pose.scarf);
  if (outfit.hat && outfit.hat !== 'none') add(outfit.hat, 'hat', pose.hat);

  if (customShoes) {
    catalog.footwear[gender][outfit.shoes].forEach((image, i) => {
      const box = i ? pose.shoeRight : pose.shoeLeft;
      const [x, y, w, h] = box;
      const scale = Math.min(w / image.rect[2], h / image.rect[3]);
      const sw = image.rect[2] * scale;
      const sh = image.rect[3] * scale;
      // Heel is registered to the ankle. Preserve the full source aspect ratio.
      const dest = [i ? x + (w - sw) / 2 : x + w - sw, y + h - sh, sw, sh];
      layers.push({ id: i ? 'shoe-right' : 'shoe-left', image, dest, color: outfit.colors?.shoes });
    });
  }

  const expression = catalog.expressions[gender]?.[mood] || catalog.expressions[gender]?.good;
  if (gender === 'male') {
    layers.push({
      id: 'neck-bridge',
      image: { src: '/art/front-faces-v6.png', size: [1536, 1024], rect: [252, 381, 118, 50] },
      dest: [196, 95, 24, 22],
    });
  }
  layers.push({
    id: 'expression',
    image: expression,
    dest: expression.dest,
    clipWorld: [
      [0, 0],
      [400, 0],
      [400, gender === 'male' ? 97 : 110],
      [gender === 'male' ? 223 : 228, gender === 'male' ? 97 : 110],
      [gender === 'male' ? 219 : 224, 126],
      [gender === 'male' ? 197 : 202, 126],
      [gender === 'male' ? 193 : 198, gender === 'male' ? 97 : 110],
      [0, gender === 'male' ? 97 : 110],
    ],
  });

  const feet = layers.filter(l => l.id.startsWith('shoe-'));
  const rest = layers.filter(l => !l.id.startsWith('shoe-'));
  const trouserIndex = rest.findIndex(l => l.id === 'bottom');
  if (trouserIndex >= 0) rest.splice(trouserIndex, 0, ...feet);
  else rest.push(...feet);
  return rest;
}

export function character(outfit, gender = 'female', mood = 'good', uid = 'look') {
  const names = outfitLayers(outfit)
    .map(l => getGarment(l.category, l.id).name)
    .join(', ');
  const safeUid = String(uid || 'look').replace(/[^a-z0-9-]/gi, '') || 'look';
  const definitions = [];
  const markup = composeLayers(outfit, gender, mood)
    .map((l, i) => {
      const [x, y, w, h] = l.dest;
      let clip = '';
      if (l.clip) clip = `clip-path:polygon(${l.clip.map(p => `${p[0] * 100}% ${p[1] * 100}%`).join(',')});`;
      if (l.clipWorld) {
        clip = `clip-path:polygon(${l.clipWorld.map(p => `${((p[0] - x) / w) * 100}% ${((p[1] - y) / h) * 100}%`).join(',')});`;
      }
      if (l.hole) {
        const id = `hole-${safeUid}-${i}`;
        definitions.push(
          `<clipPath id="${id}" clipPathUnits="objectBoundingBox"><path clip-rule="evenodd" fill-rule="evenodd" d="M0 0H1V1H0Z M${l.hole.map(p => p.join(' ')).join('L')}Z"/></clipPath>`
        );
        clip = `clip-path:url(#${id});`;
      }
      const bitmapStyle = `${styleFor(l.image)}${l.color ? `filter:${COLOR_FILTERS[l.color] || 'none'};` : ''}`;
      if (l.clipPolygons || l.cutouts?.length) {
        const root = `mask-${safeUid}-${i}`;
        const path = poly => `M${poly.map(q => q.join(' ')).join('L')}Z`;
        const masks = [];
        if (l.cutouts?.length) {
          const id = `${root}-cut`;
          definitions.push(
            `<clipPath id="${id}" clipPathUnits="objectBoundingBox"><path clip-rule="evenodd" fill-rule="evenodd" d="M0 0H1V1H0Z ${l.cutouts.map(path).join(' ')}"/></clipPath>`
          );
          masks.push(id);
        }
        if (l.clipPolygons) {
          const id = `${root}-keep`;
          definitions.push(`<clipPath id="${id}" clipPathUnits="objectBoundingBox">${l.clipPolygons.map(p => `<path d="${path(p)}"/>`).join('')}</clipPath>`);
          masks.push(id);
        }
        let content = `<span style="position:absolute;inset:0;${bitmapStyle}"></span>`;
        for (const id of masks.reverse()) {
          content = `<span style="position:absolute;inset:0;clip-path:url(#${id});">${content}</span>`;
        }
        return `<span class="doll-layer doodle-${l.id}" style="left:${x / 4}%;top:${y / 6}%;width:${w / 4}%;height:${h / 6}%;${clip}">${content}</span>`;
      }
      return `<span class="doll-layer doodle-${l.id}" style="left:${x / 4}%;top:${y / 6}%;width:${w / 4}%;height:${h / 6}%;${bitmapStyle}${clip}${l.opacity != null ? `opacity:${l.opacity};` : ''}"></span>`;
    })
    .join('');

  const effects =
    mood === 'cold'
      ? '<span class="climate-effects cold" aria-hidden="true"><i class="breath"></i><i class="shiver one"></i><i class="shiver two"></i></span>'
      : mood === 'hot'
        ? '<span class="climate-effects hot" aria-hidden="true"><i class="sweat one"></i><i class="sweat two"></i><i class="heat"></i></span>'
        : '';

  return `<div class="paper-doll fashion-character doodle-character" role="img" aria-label="${gender === 'male' ? '남성' : '여성'} 정면 캐릭터, ${names || '옷을 입히기 전'}" data-mood="${mood}" data-doll-id="${safeUid}"><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${definitions.join('')}</defs></svg>${markup}${effects}</div>`;
}

export function garmentDrawing(category, id, color, gender = 'female') {
  if (id === 'none') return '<span class="empty-garment" aria-hidden="true">—</span>';
  const original = art(gender, id);
  const image = original?.thumbnail || original;
  if (!image) return '<span class="empty-garment">—</span>';
  const ratio = image.rect[2] / image.rect[3];
  return `<span class="raster-garment" aria-hidden="true"><span style="width:${Math.min(100, ratio * 100)}%;height:${Math.min(100, 100 / ratio)}%;${styleFor(image)}${color ? `filter:${COLOR_FILTERS[color] || 'none'};` : ''}"></span></span>`;
}

const images = new Map();
export function loadAtlas(src) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          images.delete(src);
          reject(new Error(`이미지를 읽지 못했어요: ${src}`));
        };
        image.src = src;
      })
    );
  }
  return images.get(src);
}

export async function drawDoll(ctx, outfit, gender, mood, x, y, w, h) {
  const layers = composeLayers(outfit, gender, mood);
  await Promise.all([...new Set(layers.map(l => l.image.src))].map(loadAtlas));
  for (const l of layers) {
    const [dx, dy, dw, dh] = l.dest;
    ctx.save();
    if (l.clip || l.clipWorld) {
      const points = l.clipWorld || l.clip.map(p => [dx + p[0] * dw, dy + p[1] * dh]);
      ctx.beginPath();
      points.forEach((p, i) => {
        const xx = x + (p[0] / 400) * w;
        const yy = y + (p[1] / 600) * h;
        if (i) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      });
      ctx.closePath();
      ctx.clip();
    }
    if (l.hole) {
      ctx.beginPath();
      ctx.rect(x + (dx / 400) * w, y + (dy / 600) * h, (dw / 400) * w, (dh / 600) * h);
      l.hole.forEach((p, i) => {
        const xx = x + ((dx + p[0] * dw) / 400) * w;
        const yy = y + ((dy + p[1] * dh) / 600) * h;
        if (i) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      });
      ctx.closePath();
      ctx.clip('evenodd');
    }
    if (l.cutouts?.length) {
      ctx.beginPath();
      ctx.rect(x + (dx / 400) * w, y + (dy / 600) * h, (dw / 400) * w, (dh / 600) * h);
      for (const poly of l.cutouts) {
        poly.forEach((p, i) => {
          const xx = x + ((dx + p[0] * dw) / 400) * w;
          const yy = y + ((dy + p[1] * dh) / 600) * h;
          if (i) ctx.lineTo(xx, yy);
          else ctx.moveTo(xx, yy);
        });
        ctx.closePath();
      }
      ctx.clip('evenodd');
    }
    if (l.clipPolygons) {
      ctx.beginPath();
      for (const points of l.clipPolygons) {
        points.forEach((p, i) => {
          const xx = x + ((dx + p[0] * dw) / 400) * w;
          const yy = y + ((dy + p[1] * dh) / 600) * h;
          if (i) ctx.lineTo(xx, yy);
          else ctx.moveTo(xx, yy);
        });
        ctx.closePath();
      }
      ctx.clip();
    }
    if (l.opacity != null) ctx.globalAlpha = l.opacity;
    ctx.filter = l.color ? COLOR_FILTERS[l.color] || 'none' : 'none';
    ctx.drawImage(
      await loadAtlas(l.image.src),
      ...l.image.rect,
      x + (dx / 400) * w,
      y + (dy / 600) * h,
      (dw / 400) * w,
      (dh / 600) * h
    );
    ctx.restore();
  }
}
