import { writeFileSync } from 'node:fs';
import { character } from '../src/doodle-renderer.js';
import { normalizeOutfit } from '../src/layers.js';

// Reproducible, offline contact sheet. No service calls or random generations.
const cases = [];
for (const gender of ['male', 'female']) {
  for (const outer of ['cardigan', 'jacket', 'coat', 'puffer', 'leather']) {
    cases.push({ gender, name: `hoodie / ${outer}`, mood: 'good', look: { top: 'hoodie', outer, bottom: 'regular-denim' } });
  }
  for (const hat of ['none', 'cap', 'beanie']) {
    for (const mood of ['cold', 'good', 'hot']) {
      cases.push({ gender, name: `${hat} / ${mood}`, mood, look: { top: 'knit', bottom: 'regular-denim', hat } });
    }
  }
  for (const outer of ['none', 'puffer']) {
    cases.push({ gender, name: `thermal / ${outer}`, mood: 'good', look: { top: 'long', outer, bottom: 'thermal-bottom' } });
  }
}
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>의류 조합 검수</title><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/spatial.css"><style>body{padding:20px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:15px}article{background:#eeeae0;border-radius:16px;padding:12px}h1{font-size:20px}h2{font-size:14px}.sample{height:360px;display:flex;justify-content:center}.sample .paper-doll{max-width:none}.climate-effects i,.paper-doll{animation:none!important}.climate-effects i{opacity:.85!important}</style><h1>의류 조합 검수 · ${cases.length}개</h1><p>목선·후드·눈 가림·허리·발목을 확인하세요. 자동 검사는 그림의 자연스러움을 판정하지 않습니다.</p><main>${cases.map((c, i) => `<article><h2>${c.gender} · ${c.name}</h2><div class="sample">${character(normalizeOutfit(c.look), c.gender, c.mood, `review-${i}`)}</div></article>`).join('')}</main></html>`;
writeFileSync('art-review.html', html);
console.log('개발 서버에서 /art-review.html 을 열어 32개 조합을 검수하세요.');
