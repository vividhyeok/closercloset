import { drawDoll } from './paper-doll.js';
import { getGarment } from './wardrobe.js';
import { outfitLayers, countLayers } from './layers.js';

function wrapText(ctx, text, maxWidth) {
  const result = [];
  let line = '';
  for (const word of text.split(' · ')) {
    const trial = line ? `${line} · ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      result.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) result.push(line);
  return result;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function createLookImage({ outfit, gender, date, feels, city, source }) {
  await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const krFont = '"Noto Sans KR", sans-serif';
  const sansFont = '"DM Sans", sans-serif';

  // Background paper
  ctx.fillStyle = '#f8f7f3';
  ctx.fillRect(0, 0, 1080, 1920);

  // Header brand & date metadata
  ctx.fillStyle = '#1c1d1a';
  ctx.font = `700 84px ${sansFont}`;
  ctx.fillText('closer.', 72, 138);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7c7b73';
  ctx.font = `500 22px ${sansFont}`;
  ctx.fillText(date.replaceAll('-', '.'), 1008, 104);
  ctx.fillStyle = '#a09e95';
  ctx.font = `400 20px ${krFont}`;
  ctx.fillText(city || '오늘의 코디', 1008, 140);
  ctx.textAlign = 'left';

  // Subtle hairline
  ctx.fillStyle = '#e5e2d9';
  ctx.fillRect(72, 178, 936, 1.5);

  // Studio frame
  ctx.fillStyle = '#efede6';
  roundRect(ctx, 56, 214, 968, 1280, 20);
  ctx.fill();
  ctx.strokeStyle = '#e4e1d7';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Temperature pill inside frame
  ctx.fillStyle = '#f8f7f3';
  roundRect(ctx, 96, 254, 210, 104, 14);
  ctx.fill();
  ctx.fillStyle = '#1c1d1a';
  ctx.font = `500 54px ${sansFont}`;
  ctx.fillText(`${Math.round(feels)}°`, 122, 316);
  ctx.fillStyle = '#7e8177';
  ctx.font = `400 20px ${krFont}`;
  ctx.fillText('체감온도', 124, 344);

  // Character illustration
  await drawDoll(ctx, { ...outfit, peekTop: 0, peekBottom: 0 }, gender, 'good', 145, 290, 790, 1185);

  // Layer summary pill
  const topCount = countLayers(outfit, 'top');
  const bottomCount = countLayers(outfit, 'bottom');
  ctx.fillStyle = '#4d5e46';
  ctx.font = `600 28px ${krFont}`;
  ctx.fillText(`상의 ${topCount}겹 · 하의 ${bottomCount}겹`, 72, 1568);

  // Garment list
  ctx.fillStyle = '#5e5f58';
  ctx.font = `400 25px ${krFont}`;
  const names = outfitLayers(outfit).map(l => getGarment(l.category, l.id).name);
  if (outfit.hat && outfit.hat !== 'none') names.push(getGarment('hat', outfit.hat).name);
  if (outfit.shoes) names.push(getGarment('shoes', outfit.shoes).name);
  if (outfit.scarf) names.push('머플러');

  const lines = wrapText(ctx, names.join(' · '), 936).slice(0, 3);
  lines.forEach((line, i) => ctx.fillText(line, 72, 1624 + i * 44));

  // Bottom footer bar
  ctx.fillStyle = '#e5e2d9';
  ctx.fillRect(72, 1806, 936, 1.5);
  ctx.fillStyle = '#9b998f';
  ctx.font = `500 18px ${sansFont}`;
  ctx.fillText(source === 'demo' ? 'SAMPLE WEATHER · CLOSER CLOSET' : 'STYLED WITH CLOSER CLOSET', 72, 1852);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('이미지를 만들지 못했어요.');
  return { blob, url: URL.createObjectURL(blob), filename: `closer-look-${date}.png` };
}
