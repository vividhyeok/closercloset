import { character } from './paper-doll.js';
import { outfitLayers, countLayers } from './layers.js';
import { getGarment } from './wardrobe.js';

const escape = v =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dateLabel = date => {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return date;
  }
};

const periodNames = { morning: '아침', day: '낮', evening: '저녁', all: '종일' };

export function closetView(looks, icon) {
  const ordered = [...looks].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const groups = Object.groupBy
    ? Object.groupBy(ordered, l => l.date)
    : ordered.reduce((acc, l) => {
        (acc[l.date] ??= []).push(l);
        return acc;
      }, {});

  return `
    <section class="closet-intro">
      <div>
        <span class="section-eyebrow">SAVED ARCHIVE</span>
        <h1>내 옷장 <span>${looks.length}</span></h1>
        <p>날씨와 함께 기록해 둔 나만의 코디 아카이브예요.</p>
      </div>
      ${looks.length ? `<button class="secondary-button closet-new-btn" data-action="mode" data-mode="edit">${icon('plus')}새 코디 만들기</button>` : ''}
    </section>
    ${
      looks.length
        ? Object.entries(groups)
            .map(
              ([date, items]) => `
        <section class="closet-day">
          <h2>${dateLabel(date)}</h2>
          <div class="closet-grid">
            ${items
              .map((look, i) => {
                const layers = outfitLayers(look.outfit);
                const summary = layers.map(l => getGarment(l.category, l.id).name);
                if (look.outfit?.scarf) summary.push('머플러');
                const periodText = look.period && periodNames[look.period] ? ` · ${periodNames[look.period]}` : '';
                return `
              <article class="closet-card">
                <div class="closet-card-media">
                  <button class="closet-art" data-action="restore-look" data-id="${escape(look.id)}" aria-label="${dateLabel(date)} ${i + 1}번 코디 다시 입히기">
                    ${character(look.outfit, look.gender || 'female', 'good', `closet-${look.id}`)}
                  </button>
                  <span class="closet-temp-badge">${escape(look.city)}${periodText} · ${Math.round(Number(look.feels ?? 0))}°</span>
                  <button class="icon-button closet-delete-btn" data-action="delete-look" data-id="${escape(look.id)}" aria-label="이 코디 삭제">
                    ${icon('trash-2')}
                  </button>
                </div>
                <div class="closet-card-body">
                  <div class="closet-layer-count">상의 ${countLayers(look.outfit, 'top')}겹 · 하의 ${countLayers(look.outfit, 'bottom')}겹</div>
                  <p class="closet-composition">${escape(summary.join(' · ') || '기본 코디')}</p>
                  <div class="closet-card-actions">
                    <button class="closet-restore-btn" data-action="restore-look" data-id="${escape(look.id)}">다시 입히기 ${icon('arrow-up-right')}</button>
                    <button class="closet-share-btn" data-action="share-saved" data-id="${escape(look.id)}" aria-label="이 코디 이미지로 공유">${icon('share-2')}공유</button>
                  </div>
                </div>
              </article>`;
              })
              .join('')}
          </div>
        </section>`
            )
            .join('')
        : `
      <div class="closet-empty">
        <div class="empty-icon">${icon('bookmark')}</div>
        <h2>아직 비어 있는 옷장이에요.</h2>
        <p>마음에 드는 코디를 저장해 두면<br>언제든 꺼내 입고 날씨와 비교해 볼 수 있어요.</p>
        <button class="primary-button" data-action="mode" data-mode="edit">첫 코디 만들기 ${icon('arrow-right')}</button>
      </div>`
    }`;
}
