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
  const { savedPage } = api;
  const isHome = state.page === 'home';
  return `
    <div class="fashion-app ${state.mode === 'edit' ? 'in-studio' : 'in-lookbook'} ${state.page === 'saved' ? 'on-saved' : ''}">
      <header class="fashion-header">
        <div class="header-inner">
          <a href="#" class="fashion-wordmark" data-action="home" aria-label="Closer Closet 홈">
            closer<span class="closet-word">closet</span>
          </a>
          <nav class="fashion-navigation" aria-label="주 메뉴">
            <button data-action="mode" data-mode="quick" class="${state.mode === 'quick' && isHome ? 'selected' : ''}">오늘의 코디</button>
            <button data-action="mode" data-mode="edit" class="${state.mode === 'edit' && isHome ? 'selected' : ''}">옷 입히기</button>
            <button data-action="page" data-page="saved" class="${state.page === 'saved' ? 'selected' : ''}">
              내 옷장${state.looks.length ? `<small>${state.looks.length}</small>` : ''}
            </button>
          </nav>
          <div class="fashion-header-actions">
            <button class="header-text-btn" data-action="calibrate-direct">
              체감 보정${state.settings.calibration ? '<i class="calibrated-dot" aria-hidden="true"></i>' : ''}
            </button>
            <button class="fashion-location" data-action="settings" aria-label="지역 및 캐릭터 설정">
              <span>${escape(state.settings.city.name)}</span>
              <span class="header-divider" aria-hidden="true">·</span>
              <span>설정</span>
            </button>
          </div>
        </div>
      </header>
      <main class="fashion-main">${state.page === 'saved' ? savedPage() : workspace(state, api)}</main>
    </div>`;
}

export function layerFanMarkup(look, editable, gender = 'female', peekTop = 0, peekBottom = 0) {
  const uppers = upperLayers(look);
  const lowers = lowerLayers(look);
  const activeUpperIdx = Math.max(0, uppers.length - 1 - (peekTop || 0));
  const activeLowerIdx = Math.max(0, lowers.length - 1 - (peekBottom || 0));

  const renderGroup = (list, region, label, activeIdx) => `
    <div class="fan-group fan-${region}">
      <div class="fan-group-head">
        <span>${label} <b>${list.length}겹</b></span>
        <small>${list.length > 1 ? '안쪽(01)에서 바깥쪽 순서 · 탭하여 해당 겹 보기' : '단일 레이어'}</small>
      </div>
      <div class="fan-cards">
        ${
          list.length
            ? list
                .map((l, idx) => {
                  const g = getGarment(l.category, l.id);
                  const color = look.colors?.[l.category];
                  const isFocused = idx === activeIdx;
                  const peekOffset = list.length - 1 - idx;
                  const roleTag = idx === 0 && list.length > 1 ? 'INNER' : idx === list.length - 1 && list.length > 1 ? 'OUTER' : 'MID';
                  return `
                <div class="fan-card ${isFocused ? 'is-focused' : ''}" style="--fan-i:${idx};--fan-total:${list.length}" data-layer-key="${l.key}" data-layer-region="${region}">
                  <div class="fan-card-top">
                    <span class="fan-order">${String(idx + 1).padStart(2, '0')} <em>${roleTag}</em></span>
                    ${
                      editable
                        ? `<div class="fan-card-tools">
                            ${idx > 0 ? `<button class="fan-move" data-action="fan-move" data-key="${l.key}" data-dir="-1" aria-label="${g.name} 안쪽으로 이동">←</button>` : ''}
                            ${idx < list.length - 1 ? `<button class="fan-move" data-action="fan-move" data-key="${l.key}" data-dir="1" aria-label="${g.name} 바깥쪽으로 이동">→</button>` : ''}
                            <button class="fan-remove" data-action="remove-layer" data-key="${l.key}" aria-label="${g.name} 벗기기">×</button>
                          </div>`
                        : ''
                    }
                  </div>
                  <button class="fan-card-art" data-action="fan-peek" data-region="${region}" data-peek="${peekOffset}" aria-label="${g.name} 착용 모습 보기">
                    ${garmentDrawing(l.category, l.id, color, gender)}
                  </button>
                  <div class="fan-card-caption">
                    <strong>${g.name}</strong>
                    <small>${g.profile?.label || ''}</small>
                  </div>
                </div>`;
                })
                .join('')
            : '<p class="fan-empty">입힌 옷이 없어요</p>'
        }
      </div>
    </div>`;

  const extras = [];
  if (look.hat && look.hat !== 'none') extras.push(getGarment('hat', look.hat).name);
  if (look.shoes && look.shoes !== 'none') extras.push(getGarment('shoes', look.shoes).name);
  if (look.scarf) extras.push('머플러');

  return `
    <div class="layer-fan-overlay" data-action="fan-backdrop">
      <div class="layer-fan-header">
        <div>
          <strong>레이어 분해 보기</strong>
          <span>상의 ${uppers.length}겹 · 하의 ${lowers.length}겹${extras.length ? ` · ${extras.join(', ')}` : ''}</span>
        </div>
        <button class="fan-close-btn" data-action="parts">접기 ×</button>
      </div>
      <div class="layer-fan-body">
        ${renderGroup(uppers, 'upper', '상의', activeUpperIdx)}
        ${renderGroup(lowers, 'bottom', '하의', activeLowerIdx)}
      </div>
    </div>`;
}

function workspace(state, api) {
  const { current, climate, outfit, assessment, isSaved } = api;
  const day = current();
  const cl = climate();
  const look = outfit();
  const result = assessment();
  const weather = weatherInfo(day.code);
  const studio = state.mode === 'edit';
  const status = { loading: '예보 연결 중', live: '실시간 예보', cached: '저장된 예보', demo: '예시 날씨' }[state.source];
  const saved = isSaved();
  const topLayers = layerCount(look);
  const bottomLayers = countLayers(look, 'bottom');

  return `
    <div class="fashion-datebar">
      <div class="date-context">
        <button data-action="date-picker" aria-label="날짜 직접 선택">
          <span>${labelDate(day.date, { month: 'long' })}</span>
          <span class="caret" aria-hidden="true">▾</span>
        </button>
        <input id="date-input" type="date" value="${day.date}" min="${state.days[0].date}" max="${state.days.at(-1).date}" aria-label="이동할 날짜" />
      </div>
      <div class="date-rail" role="tablist" aria-label="예보 날짜">
        ${state.days
          .map(
            (d, i) => `
          <button id="date-${i}" role="tab" aria-selected="${i === state.index}" aria-controls="daily-look" tabindex="${i === state.index ? 0 : -1}" class="date-tab ${i === state.index ? 'selected' : ''}" data-action="date" data-index="${i}">
            <span class="date-day">${i === 0 ? '오늘' : i === 1 ? '내일' : labelDate(d.date, { weekday: 'short' })}</span>
            <b class="date-num">${new Date(`${d.date}T12:00:00`).getDate()}</b>
          </button>`
          )
          .join('')}
      </div>
      <button data-action="today" class="back-today" ${state.index === 0 ? 'disabled' : ''}>오늘</button>
    </div>
    ${
      state.source === 'demo'
        ? `<div class="forecast-notice" role="status">
            <span>${state.demo ? '예시 날씨 모드입니다.' : '예보 연결이 원활하지 않아 예시 날씨를 표시합니다.'}</span>
            <button data-action="refresh">실시간 예보 다시 연결</button>
          </div>`
        : ''
    }
    <section id="daily-look" class="fashion-workspace" role="tabpanel" aria-labelledby="date-${state.index}">
      <div class="look-scene ${!outfitLayers(look).length ? 'empty-outfit' : ''} ${state.partsOpen ? 'fan-open' : ''}" id="swipe-scene" tabindex="0" aria-label="${studio ? '옷을 선택해 입히는 코디 캔버스' : '좌우로 넘기는 코디 룩북'}">
        <div class="canvas-weather">
          <strong>${cl.temp}°</strong>
          <span>${weather.label} · 체감 ${cl.feels}°</span>
          <small>${Math.round(day.min)}° / ${Math.round(day.max)}°</small>
        </div>
        <div class="canvas-actions">
          <button class="text-pill ${saved ? 'saved' : ''}" data-action="save" aria-label="${saved ? '저장된 코디' : '코디 저장'}">
            ${saved ? '저장됨' : '저장'}
          </button>
          <button class="text-pill" data-action="share" aria-label="코디 이미지 공유">공유</button>
        </div>
        <div class="character-stage">
          <div class="character-wrap">
            ${character({ ...look, peekTop: state.peekTop, peekBottom: state.peekBottom }, state.settings.gender, result.mood, 'main')}
          </div>
        </div>
        ${state.partsOpen ? layerFanMarkup(look, studio, state.settings.gender, state.peekTop, state.peekBottom) : ''}
        ${
          !state.partsOpen && (state.peekTop || state.peekBottom)
            ? `<button class="peek-label" data-action="peek-reset">${peekName(look, state.peekTop, state.peekBottom)} · 겉옷 보기</button>`
            : !state.partsOpen && studio && !outfitLayers(look).length
              ? '<span class="empty-canvas-note">아래 옷장에서 의류를 선택해 입혀보세요</span>'
              : ''
        }
        <div class="canvas-bottom">
          <div class="layer-info ${state.partsOpen ? 'open' : ''}">
            <button class="layer-label" data-action="parts" aria-expanded="${state.partsOpen}">
              <span>상의 ${topLayers} · 하의 ${bottomLayers}겹</span>
              <em>${state.partsOpen ? '접기' : '펼쳐보기'}</em>
            </button>
          </div>
          <span class="canvas-comfort ${result.mood}"><i></i>${result.label}</span>
        </div>
        ${
          !studio && !state.partsOpen
            ? `<button class="scene-arrow scene-prev" data-action="prev" aria-label="이전 날 코디" ${state.index === 0 ? 'disabled' : ''}>‹</button>
               <button class="scene-arrow scene-next" data-action="next" aria-label="다음 날 코디" ${state.index === state.days.length - 1 ? 'disabled' : ''}>›</button>`
            : ''
        }
      </div>

      <aside class="fashion-shelf">
        <div class="shelf-body">
          ${studio ? wardrobe(state, api, look, result, cl) : quickDetails(state, api, look, result)}
        </div>
        <div class="shelf-footer">
          <button data-action="refresh" class="source-label">
            <i class="${state.source}"></i>
            <span>${status} ↻</span>
          </button>
          <button data-action="weather-details" class="weather-more">시간대별 기온 →</button>
        </div>
      </aside>
    </section>`;
}

export function thermalMeterMarkup(result, showCalibrateLink = true) {
  const meter = result.meter ?? 50;
  return `
    <div class="thermal-meter-box ${result.mood}">
      <div class="thermal-meter-top">
        <strong>${result.label}</strong>
        <span>${result.short}</span>
      </div>
      <div class="thermal-track" aria-hidden="true">
        <span class="thermal-zone-good"></span>
        <i class="thermal-needle" style="left:${meter}%"></i>
      </div>
      <div class="thermal-scale-labels" aria-hidden="true">
        <span>추움</span>
        <span>적당함</span>
        <span>더움</span>
      </div>
      <p class="thermal-detail">${result.detail}</p>
      ${
        showCalibrateLink
          ? `<button type="button" class="thermal-calibrate-link" data-action="calibrate-direct">어제·오늘 내 옷차림으로 더위/추위 감도 맞추기 →</button>`
          : ''
      }
    </div>`;
}

export function wardrobe(state, api, look, result = null, cl = null) {
  const category = state.category;
  const layers = outfitLayers(look);
  const countOf = id =>
    ['top', 'outer', 'bottom'].includes(category)
      ? layers.filter(l => l.category === category && l.id === id).length
      : look[category] === id
        ? 1
        : 0;
  const items = GARMENTS[category].filter(
    item => !item.legacy && (category !== 'bottom' || state.fit === 'all' || (item.fit || 'wide') === state.fit)
  );
  const activeColor = look.colors?.[category] || null;
  const activeColorName = PALETTE.find(p => p.color === activeColor)?.name || '기본 컬러';

  return `
    <div class="shelf-heading">
      <h1>스타일링</h1>
      <div class="shelf-heading-actions">
        <button class="text-action" data-action="parts">${state.partsOpen ? '겹 접기' : `겹 순서 (${layerCount(look) + countLayers(look, 'bottom')})`}</button>
        <button class="text-action" data-action="reset-look" aria-label="입힌 옷 모두 비우기">초기화</button>
      </div>
    </div>
    ${
      result
        ? `<div class="studio-thermal-bar ${result.mood}">
            <div class="studio-thermal-info">
              <span>${cl ? `체감 ${cl.feels}°` : '체감 분석'}</span>
              <strong>${result.label}</strong>
            </div>
            <div class="studio-thermal-mini-track" aria-hidden="true">
              <span class="thermal-zone-good"></span>
              <i class="thermal-needle" style="left:${result.meter ?? 50}%"></i>
            </div>
          </div>`
        : ''
    }
    <div class="wardrobe-tabs" role="tablist" aria-label="의류 종류">
      ${Object.entries(categories)
        .map(
          ([id, name]) =>
            `<button role="tab" aria-selected="${category === id}" data-action="category" data-category="${id}" class="${category === id ? 'selected' : ''}">${name}</button>`
        )
        .join('')}
      <div class="wardrobe-tab-actions">
        <button class="category-clear" data-action="clear-category" data-category="${category}" aria-label="${categories[category]} 모두 벗기기">비우기</button>
        <button class="category-clear mobile-reset-only" data-action="reset-look" aria-label="입힌 옷 모두 초기화">초기화</button>
      </div>
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
          const count = countOf(item.id);
          const isOn = count > 0;
          const previewColor = isOn ? activeColor : undefined;
          return `
        <div role="button" tabindex="0" class="wardrobe-piece ${isOn ? 'selected' : ''}" data-draggable="true" aria-pressed="${isOn}" data-category="${category}" data-id="${item.id}" aria-label="${item.name}, 눌러서 입히거나 벗기기">
          <div class="piece-art">
            ${garmentDrawing(category, item.id, previewColor, state.settings?.gender || 'female')}
            ${isOn ? `<span class="piece-badge">${count > 1 ? `×${count}` : 'ON'}</span>` : ''}
          </div>
          <div class="piece-caption">
            <span>${item.name}</span>
            <small>${isOn ? '착용 중 · 탭하여 벗기' : item.profile?.label || (item.fit ? fits[item.fit] || item.fit : item.desc || '')}</small>
          </div>
        </div>`;
        })
        .join('')}
      ${!items.length ? '<p class="no-items">해당 핏의 의류가 없습니다.</p>' : ''}
    </div>
    <div class="wardrobe-options">
      <button class="accessory-chip ${look.scarf ? 'selected' : ''}" data-action="accessory" data-id="scarf" aria-pressed="${!!look.scarf}">
        <span>머플러 ${look.scarf ? '착용' : '추가'}</span>
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

export function layerStackMarkup(look, editable) {
  return (
    [...upperLayers(look), ...lowerLayers(look)]
      .map((l, i) => {
        const garment = getGarment(l.category, l.id);
        return `
      <div class="stack-row" data-layer-key="${l.key}" data-layer-region="${l.category === 'bottom' ? 'bottom' : 'upper'}">
        ${editable ? `<button class="layer-reorder-handle" aria-label="${garment.name} 순서 바꾸기" data-reorder-key="${l.key}">↕</button>` : ''}
        <span class="stack-number">${l.category === 'bottom' ? '하의' : String(i + 1).padStart(2, '0')}</span>
        <span class="stack-name">${garment.name}</span>
        ${editable ? `<button class="stack-remove" data-action="remove-layer" data-key="${l.key}" aria-label="${garment.name} 벗기기">×</button>` : ''}
      </div>`;
      })
      .join('') || '<p class="empty-stack">아직 입힌 옷이 없어요.</p>'
  );
}

function peekName(look, upper, lower) {
  const list = upper ? upperLayers(look) : lowerLayers(look);
  const l = list[Math.max(0, list.length - 1 - (upper || lower))];
  return l ? `${getGarment(l.category, l.id).name}` : '';
}

function quickDetails(state, api, look, result) {
  const gender = state.settings?.gender || 'female';
  const uppers = upperLayers(look);
  const lowers = lowerLayers(look);
  const items = [
    ...uppers.map((l, idx) => ({
      cat: l.category,
      label: l.category === 'outer' ? 'OUTER' : idx === 0 && uppers.length > 1 ? 'INNER' : 'TOP',
      id: l.id,
    })),
    ...lowers.map((l, idx) => ({
      cat: 'bottom',
      label: idx === 0 && lowers.length > 1 ? 'INNER' : 'BOTTOM',
      id: l.id,
    })),
    ...(look.shoes && look.shoes !== 'none' ? [{ cat: 'shoes', label: 'SHOES', id: look.shoes }] : []),
    ...(look.hat && look.hat !== 'none' ? [{ cat: 'hat', label: 'HAT', id: look.hat }] : []),
  ];

  return `
    <div class="quick-details">
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

      <div class="quick-header">
        <h1>${look.lookName || outfitTitle(look)}</h1>
        <p class="quick-note">${look.note || '선택한 시간대의 체감온도에 맞춘 레이어드 구성입니다.'}</p>
      </div>

      ${thermalMeterMarkup(result, true)}

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
        ${look.scarf ? `<div class="quick-extra-pill">+ 머플러</div>` : ''}
      </div>

      <button class="primary-button customize-look" data-action="mode" data-mode="edit">
        <span>직접 갈아입혀보기</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>`;
}
