import { GARMENTS, PALETTE, getGarment, layerCount, outfitTitle } from './wardrobe.js';
import { character, garmentDrawing } from './paper-doll.js';
import { weatherInfo } from './weather.js';
import { outfitLayers, countLayers, upperLayers, lowerLayers } from './layers.js';

const escape = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const labelDate = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', options);
const categories = { outer: '아우터', top: '상의', bottom: '하의', shoes: '신발', hat: '모자' };
const fits = { all: '전체', regular: '레귤러', straight: '스트레이트', tapered: '테이퍼드', wide: '와이드' };

export function studioShell(state, api) {
  const { icon, savedPage } = api;
  const isHome = state.page === 'home';
  return `
    <div class="fashion-app ${state.mode === 'edit' ? 'in-studio' : 'in-lookbook'} ${state.page === 'saved' ? 'on-saved' : ''}">
      <header class="fashion-header">
        <div class="header-inner">
          <a href="#" class="fashion-wordmark" data-action="home" aria-label="Closer Closet 홈">
            closer<span class="wordmark-dot">.</span><span class="closet-word">CLOSET</span>
          </a>
          <nav class="fashion-navigation" aria-label="주 메뉴">
            <button data-action="mode" data-mode="quick" class="${state.mode === 'quick' && isHome ? 'selected' : ''}">오늘의 코디</button>
            <button data-action="mode" data-mode="edit" class="${state.mode === 'edit' && isHome ? 'selected' : ''}">옷 입히기</button>
            <button data-action="page" data-page="saved" class="${state.page === 'saved' ? 'selected' : ''}">
              내 옷장${state.looks.length ? `<small>${state.looks.length}</small>` : ''}
            </button>
          </nav>
          <div class="fashion-header-actions">
            <button class="fashion-location" data-action="settings" aria-label="지역 및 캐릭터 설정">
              <span class="status-pulse ${state.source}" aria-hidden="true"></span>
              ${icon('map-pin')}
              <span>${escape(state.settings.city.name)}</span>
              ${state.settings.calibration ? '<span class="header-calibrated-dot" title="어제 체감 맞춤 완료"></span>' : ''}
            </button>
            <button class="icon-button settings-trigger" data-action="settings" aria-label="설정 열기">${icon('sliders-horizontal')}</button>
          </div>
        </div>
      </header>
      <main class="fashion-main">${state.page === 'saved' ? savedPage() : workspace(state, api)}</main>
    </div>`;
}

function workspace(state, api) {
  const { icon, current, climate, outfit, assessment, isSaved } = api;
  const day = current();
  const cl = climate();
  const look = outfit();
  const result = assessment();
  const weather = weatherInfo(day.code);
  const studio = state.mode === 'edit';
  const status = { loading: '예보 연결 중', live: '실시간 예보', cached: '저장된 예보', demo: '예시 날씨' }[state.source];
  const saved = isSaved();

  return `
    <div class="fashion-datebar">
      <div class="date-context">
        <button data-action="date-picker" aria-label="날짜 직접 선택">
          ${icon('calendar-days')}
          <span>${labelDate(day.date, { month: 'long' })}</span>
          ${icon('chevron-down')}
        </button>
        <input id="date-input" type="date" value="${day.date}" min="${state.days[0].date}" max="${state.days.at(-1).date}" aria-label="이동할 날짜" />
      </div>
      <div class="date-rail" role="tablist" aria-label="예보 날짜">
        ${state.days
          .map((d, i) => {
            const w = weatherInfo(d.code);
            return `
          <button id="date-${i}" role="tab" aria-selected="${i === state.index}" aria-controls="daily-look" tabindex="${i === state.index ? 0 : -1}" class="date-tab ${i === state.index ? 'selected' : ''}" data-action="date" data-index="${i}">
            <span class="date-day">${i === 0 ? '오늘' : i === 1 ? '내일' : labelDate(d.date, { weekday: 'short' })}</span>
            <b class="date-num">${new Date(`${d.date}T12:00:00`).getDate()}</b>
            <span class="date-mini-weather" aria-hidden="true">${icon(w.icon)}</span>
          </button>`;
          })
          .join('')}
      </div>
      <button data-action="today" class="back-today" ${state.index === 0 ? 'disabled' : ''}>오늘</button>
    </div>
    ${
      state.source === 'demo'
        ? `<div class="forecast-notice" role="status">
            <div class="forecast-notice-copy">${icon('info')}<span>${state.demo ? '예시 날씨로 둘러보고 있어요.' : '예보에 연결하지 못해 예시 날씨를 표시하고 있어요.'}</span></div>
            <button data-action="refresh">실제 예보 연결 ${icon('rotate-ccw')}</button>
          </div>`
        : ''
    }
    <section id="daily-look" class="fashion-workspace" role="tabpanel" aria-labelledby="date-${state.index}">
      <div class="look-scene ${!outfitLayers(look).length ? 'empty-outfit' : ''}" id="swipe-scene" tabindex="0" aria-label="${studio ? '옷을 선택해 입히는 코디 캔버스' : '좌우로 넘기는 코디 룩북'}">
        <div class="scene-backdrop-glow" aria-hidden="true"></div>
        <div class="canvas-weather">
          <div class="weather-temp-row">${icon(weather.icon)}<strong>${cl.temp}°</strong></div>
          <div class="weather-meta-row"><span>${weather.label}</span><span class="dot-sep" aria-hidden="true">·</span><span>체감 ${cl.feels}°</span></div>
          <small class="weather-range">최저 ${Math.round(day.min)}° / 최고 ${Math.round(day.max)}°</small>
        </div>
        <div class="canvas-actions">
          <button class="icon-button action-pill ${saved ? 'saved' : ''}" data-action="save" aria-label="${saved ? '저장된 코디' : '코디 저장'}" title="${saved ? '내 옷장에 저장됨' : '내 옷장에 저장'}">
            ${icon('bookmark')}
          </button>
          <button class="icon-button action-pill" data-action="share" aria-label="코디 이미지 공유" title="코디 이미지 저장 · 공유">
            ${icon('arrow-up-right')}
          </button>
        </div>
        <div class="character-stage">
          <div class="stage-pedestal" aria-hidden="true"></div>
          <div class="character-wrap">
            ${character(studio ? { ...look, peekTop: state.peekTop, peekBottom: state.peekBottom } : look, state.settings.gender, result.mood, 'main')}
          </div>
        </div>
        ${
          studio && (state.peekTop || state.peekBottom)
            ? `<button class="peek-label" data-action="peek-reset">${peekName(look, state.peekTop, state.peekBottom)} ${icon('rotate-ccw')} 겉옷 보기</button>`
            : studio && !outfitLayers(look).length
              ? '<span class="empty-canvas-note">아래 옷장에서 아이템을 눌러 입혀보세요.</span>'
              : studio && (upperLayers(look).length > 1 || countLayers(look, 'bottom') > 1)
                ? '<span class="canvas-tap-hint">캐릭터를 탭하면 안쪽 겹을 볼 수 있어요</span>'
                : ''
        }
        <div class="drop-zone-marker" data-drop-category="${state.category}" aria-hidden="true"></div>
        <div class="drop-guide">${icon('plus')}<span>놓으면 입혀져요</span></div>
        <div class="canvas-bottom">
          <div class="layer-info ${state.partsOpen ? 'open' : ''}">
            <button class="layer-label" data-action="parts" aria-expanded="${state.partsOpen}" aria-controls="parts-popover">
              ${icon('layers')}
              <span>상의 ${layerCount(look)} · 하의 ${countLayers(look, 'bottom')}겹</span>
              ${icon('chevron-up')}
            </button>
            <div class="parts-popover" id="parts-popover">
              <div class="parts-popover-head">
                <h3>안쪽부터, 한 겹씩</h3>
                ${studio ? '<small>↕ 끌어 순서 변경</small>' : ''}
              </div>
              <div class="parts-stack-list">${layerStackMarkup(look, studio, icon)}</div>
              ${look.scarf ? '<p class="popover-extra">+ 머플러 착용</p>' : ''}
            </div>
          </div>
          <span class="canvas-comfort ${result.mood}"><i></i>${result.label}</span>
        </div>
        ${
          !studio
            ? `<button class="scene-arrow scene-prev" data-action="prev" aria-label="이전 날 코디" ${state.index === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button>
               <button class="scene-arrow scene-next" data-action="next" aria-label="다음 날 코디" ${state.index === state.days.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button>`
            : ''
        }
        <span class="canvas-caption">${studio ? 'STYLING STUDIO' : `${labelDate(day.date, { month: 'numeric', day: 'numeric' })} · DAILY LOOK`}</span>
      </div>

      <aside class="fashion-shelf">
        <div class="shelf-body">
          ${studio ? wardrobe(state, api, look) : quickDetails(state, api, look, result)}
        </div>
        <div class="shelf-footer">
          <button data-action="refresh" class="source-label">
            <i class="${state.source}"></i>
            <span>${status}</span>
            ${icon('rotate-ccw')}
          </button>
          <button data-action="weather-details" class="weather-more">
            <span>시간대별 날씨</span>
            ${icon('chevron-right')}
          </button>
        </div>
      </aside>
    </section>`;
}

export function wardrobe(state, api, look) {
  const { icon } = api;
  const category = state.category;
  const equipped = id =>
    ['top', 'outer', 'bottom'].includes(category)
      ? outfitLayers(look).some(l => l.category === category && l.id === id)
      : look[category] === id;
  const items = GARMENTS[category].filter(
    item => !item.legacy && (category !== 'bottom' || state.fit === 'all' || (item.fit || 'wide') === state.fit)
  );
  const activeColor = look.colors?.[category] || null;
  const activeColorName = PALETTE.find(p => p.color === activeColor)?.name || '기본 컬러';

  return `
    <div class="shelf-heading">
      <div>
        <span class="shelf-kicker">WARDROBE</span>
        <h1>나의 옷장</h1>
      </div>
      <button class="icon-button reset-look-btn" data-action="reset-look" aria-label="입힌 옷 모두 비우기" title="코디 초기화">
        ${icon('rotate-ccw')}
      </button>
    </div>
    <div class="wardrobe-tabs" role="tablist" aria-label="의류 종류">
      ${Object.entries(categories)
        .map(
          ([id, name]) =>
            `<button role="tab" aria-selected="${category === id}" data-action="category" data-category="${id}" class="${category === id ? 'selected' : ''}">${name}</button>`
        )
        .join('')}
      <button class="category-clear" data-action="clear-category" data-category="${category}" aria-label="${categories[category]} 모두 벗기기" title="${categories[category]} 벗기기">
        ${icon('minus')}
      </button>
    </div>
    ${
      category === 'bottom'
        ? `<div class="fit-filters" aria-label="바지 핏">${Object.entries(fits)
            .map(
              ([id, name]) =>
                `<button data-action="fit" data-fit="${id}" aria-pressed="${state.fit === id}" class="${state.fit === id ? 'selected' : ''}">${name}</button>`
            )
            .join('')}</div>`
        : ''
    }
    <div class="wardrobe-drawer" aria-label="입히거나 벗길 의류">
      ${items
        .map(item => {
          const isOn = equipped(item.id);
          const previewColor = isOn ? activeColor : undefined;
          return `
        <div role="button" tabindex="0" class="wardrobe-piece ${isOn ? 'selected' : ''}" data-draggable="true" aria-pressed="${isOn}" data-category="${category}" data-id="${item.id}" aria-label="${item.name}, 눌러서 입히거나 벗기기">
          <div class="piece-art">
            ${garmentDrawing(category, item.id, previewColor, state.settings?.gender || 'female')}
            ${isOn ? `<span class="piece-check" aria-hidden="true">${icon('check')}</span>` : ''}
          </div>
          <div class="piece-caption">
            <span>${item.name}</span>
            <small>${isOn ? '착용 중' : item.profile?.label || (item.fit ? fits[item.fit] || item.fit : item.desc || '')}</small>
          </div>
        </div>`;
        })
        .join('')}
      ${!items.length ? '<p class="no-items">이 핏의 옷은 준비 중이에요.</p>' : ''}
    </div>
    <div class="wardrobe-options">
      <button class="accessory-chip ${look.scarf ? 'selected' : ''}" data-action="accessory" data-id="scarf" aria-pressed="${!!look.scarf}">
        ${icon(look.scarf ? 'check' : 'plus')}
        <span>머플러</span>
      </button>
      <div class="color-panel">
        <span class="color-active-name">${activeColorName}</span>
        <div class="color-options" role="group" aria-label="의류 색상">
          ${PALETTE.map(
            p => `
            <button class="palette-color ${activeColor === p.color || (!activeColor && !p.color) ? 'selected' : ''}"
              style="--swatch:${p.color || getGarment(category, look[category]).color}"
              data-action="color" data-category="${category}" data-color="${p.color || ''}"
              aria-label="${p.name}" title="${p.name}">
            </button>`
          ).join('')}
        </div>
      </div>
    </div>`;
}

export function layerStackMarkup(look, editable, icon) {
  return (
    [...upperLayers(look), ...lowerLayers(look)]
      .map((l, i) => {
        const garment = getGarment(l.category, l.id);
        return `
      <div class="stack-row" data-layer-key="${l.key}" data-layer-region="${l.category === 'bottom' ? 'bottom' : 'upper'}">
        ${editable ? `<button class="layer-reorder-handle" aria-label="${garment.name} 순서 바꾸기" data-reorder-key="${l.key}">↕</button>` : ''}
        <span class="stack-number">${l.category === 'bottom' ? '하의' : `${i + 1}`}</span>
        <span class="stack-name">${garment.name}</span>
        ${editable ? `<button class="stack-remove" data-action="remove-layer" data-key="${l.key}" aria-label="${garment.name} 벗기기">${icon('x')}</button>` : ''}
      </div>`;
      })
      .join('') || '<p class="empty-stack">아직 입힌 옷이 없어요.</p>'
  );
}

function peekName(look, upper, lower) {
  const list = upper ? upperLayers(look) : lowerLayers(look);
  const l = list[Math.max(0, list.length - 1 - (upper || lower))];
  return l ? `${getGarment(l.category, l.id).name} · 안쪽 겹` : '';
}

function quickDetails(state, api, look, result) {
  const { icon } = api;
  const gender = state.settings?.gender || 'female';
  const items = [
    ...(look.outer && look.outer !== 'none' ? [{ cat: 'outer', label: '아우터', id: look.outer }] : []),
    { cat: 'top', label: '상의', id: look.top },
    { cat: 'bottom', label: '하의', id: look.bottom },
    ...(look.shoes ? [{ cat: 'shoes', label: '신발', id: look.shoes }] : []),
    ...(look.hat && look.hat !== 'none' ? [{ cat: 'hat', label: '모자', id: look.hat }] : []),
  ];

  return `
    <div class="quick-details">
      <div class="quick-header">
        <span class="look-counter">LOOK ${String(state.index + 1).padStart(2, '0')}</span>
        <h1>${look.lookName || outfitTitle(look)}</h1>
        <p class="quick-note">${look.note || '오늘의 체감온도에 맞춘 레이어드 조합이에요.'}</p>
      </div>

      <div class="period-switch" role="group" aria-label="외출 시간">
        ${[
          ['morning', '아침'],
          ['day', '낮'],
          ['evening', '저녁'],
          ['all', '종일'],
        ]
          .map(
            ([id, name]) =>
              `<button data-action="period" data-period="${id}" class="${state.period === id ? 'active' : ''}" aria-pressed="${state.period === id}">${name}</button>`
          )
          .join('')}
      </div>

      <div class="comfort-card ${result.mood}">
        <div class="comfort-icon">${icon(result.mood === 'cold' ? 'snowflake' : result.mood === 'hot' ? 'sun' : 'sparkles')}</div>
        <div class="comfort-copy">
          <strong>${result.short}</strong>
          <p>${result.detail}</p>
        </div>
      </div>

      <div class="quick-garments">
        ${items
          .map(({ cat, label, id }) => {
            const g = getGarment(cat, id);
            const color = look.colors?.[cat];
            return `
          <div class="quick-garment-row">
            <div class="quick-thumb">${garmentDrawing(cat, id, color, gender)}</div>
            <div class="quick-garment-info">
              <span class="quick-garment-cat">${label}</span>
              <strong>${g.name}</strong>
              <small>${g.profile?.label || g.desc || ''}</small>
            </div>
            ${color ? `<span class="quick-color-dot" style="background:${color}" aria-hidden="true"></span>` : ''}
          </div>`;
          })
          .join('')}
        ${look.scarf ? `<div class="quick-extra-pill">${icon('check')}머플러 함께 착용</div>` : ''}
      </div>

      <button class="primary-button customize-look" data-action="mode" data-mode="edit">
        <span>이 코디로 입혀보기</span>
        ${icon('arrow-up-right')}
      </button>
    </div>`;
}
