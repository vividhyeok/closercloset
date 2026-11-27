import './styles.css';
import { studioShell, wardrobe, layerStackMarkup, layerFanMarkup } from './studio-view.js';
import { addLayer, countLayers, normalizeOutfit, outfitLayers, removeLayer, upperLayers, lowerLayers, moveLayer, sameOutfit } from './layers.js';
import { dailyLook } from './daily-look.js';
import { closetView } from './closet-view.js';
import {
  CITIES,
  fetchForecast,
  localDate,
  makeDemo,
  periodWeather,
  resolveDateIndex,
  weatherInfo,
  validForecastCache,
} from './weather.js';
import { assess, layerCount, calibrationOffset } from './wardrobe.js';
import { character } from './paper-doll.js';
import { createLookImage } from './share-card.js';
import { LOOKS_KEY, SETTINGS_KEY, readStorage, sanitizeLooks, validSettings, writeStorage } from './storage.js';

const initialSettings = readStorage(SETTINGS_KEY);
const state = {
  settings: validSettings(initialSettings)
    ? initialSettings
    : { gender: 'female', city: CITIES[0], sensitivity: 0, onboarded: false },
  days: makeDemo(),
  yesterday: null,
  index: 0,
  period: 'day',
  mode: 'quick',
  page: 'home',
  source: 'loading',
  loading: false,
  fetchedAt: null,
  timezone: 'Asia/Seoul',
  looks: sanitizeLooks(readStorage(LOOKS_KEY, [])),
  custom: null,
  demo: false,
  category: 'outer',
  partsOpen: false,
  fit: 'all',
  peekTop: 0,
  peekBottom: 0,
};

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
let request = null;
let toastTimer;
let installPrompt = null;
let modalReturnFocus = null;
let calibrationSession = null;
let peekTimer;
let trayPan = null;
let lastTrayPan = 0;
let stackDrag = null;

const escape = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round = n => Math.round(n);
const current = () => state.days[state.index] || state.days[0];
const climate = () => periodWeather(current(), state.period);
const recommendation = () => dailyLook(current(), state.period, state.settings.sensitivity);
const outfit = () => (state.mode === 'edit' && state.custom ? state.custom : recommendation());
const assessment = () => assess(outfit(), climate().feels, state.settings.sensitivity);
const isSaved = () =>
  state.looks.some(
    look => look.date === current().date && look.city === state.settings.city.name && sameOutfit(look.outfit, outfit())
  );

function makeFallbackYesterday(today) {
  const base = today || state.days[0];
  const d = new Date(`${base.date}T12:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() - 1);
  return {
    ...structuredClone(base),
    date: localDate(d),
    min: base.min - 1,
    max: base.max - 1,
    feelsMin: base.feelsMin - 1,
    feelsMax: base.feelsMax - 1,
    hours: (base.hours || []).map(h => ({ ...h, temp: h.temp - 1, feels: h.feels - 1 })),
  };
}

function toast(message) {
  clearTimeout(toastTimer);
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3800);
}

function render() {
  const prevDrawer = document.querySelector('.fashion-app .wardrobe-drawer');
  const scrollLeft = prevDrawer?.scrollLeft || 0;
  const scrollTop = prevDrawer?.scrollTop || 0;
  const railPrevScroll = document.querySelector('.date-rail')?.scrollLeft || 0;

  app.innerHTML = studioShell(state, { current, climate, outfit, assessment, isSaved, savedPage });
  bindHome(railPrevScroll);

  const nextDrawer = document.querySelector('.fashion-app .wardrobe-drawer');
  if (nextDrawer) {
    nextDrawer.scrollLeft = scrollLeft;
    nextDrawer.scrollTop = scrollTop;
  }
}

function hourlySection(day) {
  const periods = [
    { hour: 8, name: '아침 08:00' },
    { hour: 13, name: '낮 13:00' },
    { hour: 18, name: '저녁 18:00' },
    { hour: 22, name: '밤 22:00' },
  ];
  return `
    <section class="hourly-section">
      <div class="hourly-grid">
        ${periods
          .map(p => {
            const h = day.hours.find(item => item.hour === p.hour);
            if (!h) return '';
            return `
            <div class="hour-card">
              <span>${p.name} · ${weatherInfo(h.code).label}</span>
              <strong>${round(h.temp)}°<span>체감 ${round(h.feels)}°</span></strong>
            </div>`;
          })
          .join('')}
      </div>
    </section>`;
}

function savedPage() {
  return closetView(state.looks);
}

function bindHome(prevRailScroll = 0) {
  const scene = document.querySelector('#swipe-scene');
  let start = null;
  let moved = false;

  scene?.addEventListener('pointerdown', event => {
    if (event.target.closest('button, .layer-fan-overlay')) return;
    start = { x: event.clientX, y: event.clientY };
    moved = false;
  });

  scene?.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && !state.partsOpen) {
      moved = true;
      navigate(dx < 0 ? 1 : -1);
    }
  });

  scene?.addEventListener('pointercancel', () => {
    start = null;
  });

  scene?.addEventListener('click', event => {
    if (moved) {
      moved = false;
      return;
    }
    if (event.target.closest('button, .fan-card')) return;
    clearTimeout(peekTimer);
    state.partsOpen = !state.partsOpen;
    if (!state.partsOpen) {
      state.peekTop = 0;
      state.peekBottom = 0;
    }
    render();
  });

  scene?.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(event.key === 'ArrowRight' ? 1 : -1);
    }
  });

  document.querySelector('#date-input')?.addEventListener('change', event => {
    const index = resolveDateIndex(state.days, event.target.value);
    if (index < 0) {
      toast(`지원하지 않는 날짜예요. ${state.days[0].date}부터 ${state.days.at(-1).date} 사이를 선택해 주세요.`);
      event.target.value = current().date;
      return;
    }
    setDay(index);
  });

  const rail = document.querySelector('.date-rail');
  if (rail) {
    rail.scrollLeft = prevRailScroll;
    rail.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(event.key === 'ArrowRight' ? 1 : -1);
        document.querySelector(`#date-${state.index}`)?.focus({ preventScroll: true });
      }
    });
    const selected = document.querySelector('.date-tab.selected');
    if (selected) {
      const targetLeft = Math.max(0, selected.offsetLeft - rail.offsetLeft - rail.clientWidth / 2 + selected.clientWidth / 2);
      rail.scrollLeft = targetLeft;
    }
  }
}

function navigate(direction) {
  const index = state.index + direction;
  if (index < 0 || index >= state.days.length) {
    toast('현재 제공되는 예보의 마지막 날짜예요.');
    return;
  }
  setDay(index);
}

function setDay(index) {
  clearTimeout(peekTimer);
  state.index = index;
  state.peekTop = 0;
  state.peekBottom = 0;
  if (state.mode === 'edit' && !state.custom) {
    const { lookId, ...parts } = recommendation();
    state.custom = normalizeOutfit(parts);
  }
  render();
  document
    .querySelector('.character-wrap')
    ?.animate([{ opacity: 0.35, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }], {
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220,
      easing: 'ease-out',
    });
}

async function loadWeather() {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  state.loading = true;
  state.source = 'loading';
  state.demo = false;
  render();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const city = state.settings.city;
  const cacheKey = `closer.forecast.${city.lat}.${city.lon}`;
  try {
    const response = await fetchForecast(city, controller.signal);
    if (request !== controller) return;
    const date = current().date;
    state.days = response.days;
    state.yesterday = response.yesterday || makeFallbackYesterday(response.days[0]);
    state.index = Math.max(0, resolveDateIndex(state.days, date));
    state.fetchedAt = response.fetchedAt;
    state.timezone = response.timezone;
    state.source = 'live';
    writeStorage(cacheKey, response);
  } catch {
    if (request !== controller) return;
    const cached = readStorage(cacheKey);
    let today = localDate();
    try {
      if (typeof cached?.timezone === 'string') today = localDate(new Date(), cached.timezone);
    } catch {
      // Fallback to default timezone
    }
    if (validForecastCache(cached) && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000 && cached.days.some(d => d.date === today)) {
      state.days = cached.days.filter(d => d.date >= today);
      state.yesterday = cached.yesterday || makeFallbackYesterday(state.days[0]);
      state.index = 0;
      state.source = 'cached';
      state.fetchedAt = cached.fetchedAt;
      state.timezone = cached.timezone;
      toast('연결이 어려워 최근 저장된 예보를 보여드려요.');
    } else {
      state.days = makeDemo();
      state.yesterday = makeFallbackYesterday(state.days[0]);
      state.index = 0;
      state.source = 'demo';
      state.fetchedAt = null;
    }
  } finally {
    clearTimeout(timeout);
    if (request === controller) {
      state.loading = false;
      if (state.mode === 'edit' && !state.custom) {
        const { lookId, ...parts } = recommendation();
        state.custom = normalizeOutfit(parts);
      }
      render();
    }
  }
}

function saveLook() {
  if (state.source === 'loading') {
    toast('날씨를 불러온 뒤 코디를 저장해 주세요.');
    return;
  }
  if (isSaved()) {
    toast('이미 옷장에 담아둔 코디예요.');
    return;
  }
  const look = {
    id: globalThis.crypto?.randomUUID?.() || `look-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: current().date,
    outfit: structuredClone(outfit()),
    gender: state.settings.gender,
    city: state.settings.city.name,
    feels: climate().feels,
    period: state.period,
    source: state.source,
    createdAt: Date.now(),
  };
  const updated = [...state.looks, look];
  if (!writeStorage(LOOKS_KEY, updated)) {
    toast('기기에 저장할 공간이 부족해요. 브라우저 저장 설정을 확인해 주세요.');
    return;
  }
  state.looks = updated;
  render();
  toast(state.source === 'demo' ? '예시 코디를 내 옷장에 담았어요.' : '코디를 내 옷장에 담았어요.');
}

function animatePeek() {
  document.querySelectorAll('.doodle-visible-upper, .doodle-bottom').forEach(el =>
    el.animate([{ opacity: 0.25, transform: 'translateX(8px)' }, { opacity: 1, transform: 'translateX(0)' }], {
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180,
      easing: 'ease-out',
    })
  );
}

function shiftLayer(look, key, dir) {
  const layers = outfitLayers(look);
  const currentLayer = layers.find(l => l.key === key);
  if (!currentLayer) return look;
  const regionList = currentLayer.category === 'bottom' ? lowerLayers(look) : upperLayers(look);
  const idx = regionList.findIndex(l => l.key === key);
  const target = regionList[idx + dir];
  if (!target) return look;
  return moveLayer(look, key, target.key, dir > 0);
}

// Main click delegate
document.addEventListener('click', event => {
  const piece = event.target.closest('[data-draggable]');
  if (piece) {
    const category = piece.dataset.category;
    const id = piece.dataset.id;
    if (piece.closest('.calibration-studio') && calibrationSession) {
      calibrationSession.action('toggle-piece', piece);
      return;
    }
    const look = normalizeOutfit(outfit());
    const existing = outfitLayers(look)
      .filter(l => l.category === category && l.id === id)
      .at(-1);
    state.custom = existing ? removeLayer(look, existing.key) : addLayer(look, category, id);
    if (['hat', 'shoes'].includes(category) && look[category] === id) {
      state.custom[category] = 'none';
    }
    state.mode = 'edit';
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;

  if (action === 'fan-backdrop' && event.target !== button) return;

  if (button.closest('.calibration-studio') && calibrationSession) {
    calibrationSession.action(action, button);
    return;
  }
  if (action === 'close-modal' && button.classList.contains('modal-backdrop') && event.target !== button) return;

  if (['home', 'page'].includes(action)) {
    event.preventDefault();
    state.page = button.dataset.page || 'home';
    state.partsOpen = false;
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (action === 'settings') {
    openSettings();
  } else if (action === 'calibrate-direct') {
    calibrationForm(structuredClone(state.settings), 'today');
  } else if (action === 'prev') {
    navigate(-1);
  } else if (action === 'next') {
    navigate(1);
  } else if (action === 'date') {
    setDay(Number(button.dataset.index));
  } else if (action === 'today') {
    setDay(Math.max(0, resolveDateIndex(state.days, localDate(new Date(), state.timezone))));
  } else if (action === 'date-picker') {
    const input = document.querySelector('#date-input');
    try {
      input?.showPicker();
    } catch {
      input?.focus();
    }
  } else if (action === 'mode') {
    if (button.dataset.mode === 'edit' && state.mode !== 'edit') {
      const { lookId, ...parts } = recommendation();
      state.custom = normalizeOutfit(parts);
    }
    state.mode = button.dataset.mode;
    state.page = 'home';
    state.peekTop = 0;
    state.peekBottom = 0;
    state.partsOpen = false;
    render();
  } else if (action === 'period') {
    state.period = button.dataset.period;
    render();
  } else if (action === 'clear-category') {
    const category = button.dataset.category;
    state.custom = addLayer(outfit(), category, 'none');
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
  } else if (action === 'fit') {
    state.fit = button.dataset.fit;
    render();
  } else if (action === 'weather-details') {
    openWeatherDetails();
  } else if (action === 'category') {
    state.category = button.dataset.category;
    render();
  } else if (action === 'color') {
    const base = normalizeOutfit(outfit());
    base.colors = { ...base.colors, [button.dataset.category]: button.dataset.color || null };
    state.custom = base;
    render();
  } else if (action === 'parts' || action === 'fan-backdrop') {
    state.partsOpen = !state.partsOpen;
    if (!state.partsOpen) {
      state.peekTop = 0;
      state.peekBottom = 0;
    }
    render();
  } else if (action === 'fan-peek') {
    const region = button.dataset.region;
    const peek = Number(button.dataset.peek) || 0;
    if (region === 'bottom') state.peekBottom = peek;
    else state.peekTop = peek;
    render();
    animatePeek();
  } else if (action === 'fan-move') {
    if (state.mode !== 'edit') {
      const { lookId, ...parts } = recommendation();
      state.custom = normalizeOutfit(parts);
      state.mode = 'edit';
    }
    state.custom = shiftLayer(outfit(), button.dataset.key, Number(button.dataset.dir));
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
  } else if (action === 'peek-reset') {
    clearTimeout(peekTimer);
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
    animatePeek();
  } else if (action === 'remove-layer') {
    if (state.mode !== 'edit') {
      const { lookId, ...parts } = recommendation();
      state.custom = normalizeOutfit(parts);
      state.mode = 'edit';
    }
    state.custom = removeLayer(outfit(), button.dataset.key);
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
  } else if (action === 'share') {
    openShare();
  } else if (action === 'share-saved') {
    openShare(state.looks.find(l => l.id === button.dataset.id));
  } else if (action === 'accessory') {
    const base = normalizeOutfit(outfit());
    base[button.dataset.id] = !base[button.dataset.id];
    state.custom = base;
    render();
  } else if (action === 'reset-look') {
    state.custom = normalizeOutfit({ ...recommendation(), layers: [] });
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
  } else if (action === 'save') {
    saveLook();
  } else if (action === 'refresh') {
    loadWeather();
  } else if (action === 'install') {
    openInstall();
  } else if (action === 'close-modal') {
    closeModal();
  } else if (action === 'delete-look') {
    const updated = state.looks.filter(look => look.id !== button.dataset.id);
    if (writeStorage(LOOKS_KEY, updated)) {
      state.looks = updated;
      render();
      toast('저장한 코디를 삭제했어요.');
    } else {
      toast('삭제 내용을 저장하지 못했어요.');
    }
  } else if (action === 'restore-look') {
    const look = state.looks.find(item => item.id === button.dataset.id);
    if (!look) return;
    const matchedIdx = resolveDateIndex(state.days, look.date);
    state.index = Math.max(0, matchedIdx);
    state.custom = normalizeOutfit(structuredClone(look.outfit));
    state.period = look.period || 'day';
    state.mode = 'edit';
    state.page = 'home';
    state.peekTop = 0;
    state.peekBottom = 0;
    state.partsOpen = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(
      matchedIdx >= 0
        ? `저장한 코디를 ${state.settings.city.name}의 ${look.date} 날씨와 비교해요.`
        : `저장한 코디를 불러왔어요. 현재 ${state.settings.city.name} 날씨와 비교해 보세요.`
    );
  }
});

// Keyboard activation on wardrobe garment cards
document.addEventListener(
  'keydown',
  event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-draggable]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.target.click();
    }
  },
  true
);

// Layer stack drag & keyboard reordering
document.addEventListener('pointerdown', event => {
  const handle = event.target.closest('[data-reorder-key]');
  if (!handle || event.button > 0) return;
  const row = handle.closest('[data-layer-key]');
  if (!row) return;
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
  stackDrag = {
    handle,
    row,
    key: handle.dataset.reorderKey,
    region: row.dataset.layerRegion,
    context: handle.closest('.calibration-studio') ? calibrationSession : null,
    target: null,
    after: false,
  };
  row.classList.add('reordering');
});

document.addEventListener(
  'pointermove',
  event => {
    if (!stackDrag) return;
    event.preventDefault();
    document.querySelectorAll('.reorder-target').forEach(el => el.classList.remove('reorder-target'));
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-layer-key]');
    if (row && row.dataset.layerRegion === stackDrag.region && row !== stackDrag.row) {
      stackDrag.target = row.dataset.layerKey;
      const box = row.getBoundingClientRect();
      stackDrag.after = event.clientY > box.top + box.height / 2;
      row.classList.add('reorder-target');
    }
    const list = stackDrag.row.parentElement;
    if (list) {
      const box = list.getBoundingClientRect();
      if (event.clientY < box.top + 28) list.scrollTop -= 9;
      else if (event.clientY > box.bottom - 28) list.scrollTop += 9;
    }
  },
  { passive: false }
);

document.addEventListener('pointerup', () => {
  if (!stackDrag) return;
  const d = stackDrag;
  stackDrag = null;
  d.row.classList.remove('reordering');
  document.querySelectorAll('.reorder-target').forEach(el => el.classList.remove('reorder-target'));
  if (!d.target) return;
  if (d.context) {
    d.context.reorder(d.key, d.target, d.after);
  } else {
    state.custom = moveLayer(outfit(), d.key, d.target, d.after);
    state.peekTop = 0;
    state.peekBottom = 0;
    render();
  }
});

document.addEventListener('pointercancel', () => {
  stackDrag?.row.classList.remove('reordering');
  document.querySelectorAll('.reorder-target').forEach(el => el.classList.remove('reorder-target'));
  stackDrag = null;
});

document.addEventListener('keydown', event => {
  const handle = event.target.closest('[data-reorder-key]');
  if (!handle || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const row = handle.closest('[data-layer-key]');
  if (!row) return;
  const rows = [...row.parentElement.querySelectorAll('[data-layer-key]')].filter(r => r.dataset.layerRegion === row.dataset.layerRegion);
  const index = rows.indexOf(row);
  const target = rows[index + (event.key === 'ArrowUp' ? -1 : 1)];
  if (!target) return;
  const context = handle.closest('.calibration-studio') ? calibrationSession : null;
  if (context) {
    context.reorder(row.dataset.layerKey, target.dataset.layerKey, event.key === 'ArrowDown');
  } else {
    state.custom = moveLayer(outfit(), row.dataset.layerKey, target.dataset.layerKey, event.key === 'ArrowDown');
    render();
  }
});

// Mouse horizontal pan on mobile/overflow wardrobe drawer
document.addEventListener('pointerdown', event => {
  const tray = event.target.closest('.wardrobe-drawer');
  if (!tray || event.pointerType !== 'mouse' || event.button !== 0 || tray.scrollWidth <= tray.clientWidth) return;
  trayPan = { tray, x: event.clientX, scroll: tray.scrollLeft, moved: false, id: event.pointerId };
});

document.addEventListener('pointermove', event => {
  if (!trayPan || event.pointerId !== trayPan.id) return;
  const dx = event.clientX - trayPan.x;
  if (Math.abs(dx) > 5) trayPan.moved = true;
  if (trayPan.moved) {
    trayPan.tray.scrollLeft = trayPan.scroll - dx;
    event.preventDefault();
  }
});

document.addEventListener('pointerup', () => {
  if (trayPan?.moved) lastTrayPan = Date.now();
  trayPan = null;
});

document.addEventListener('pointercancel', () => {
  trayPan = null;
});

document.addEventListener(
  'click',
  event => {
    if (Date.now() - lastTrayPan < 250 && event.target.closest('.wardrobe-drawer')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true
);

// Modal Management
function openModal(content, mandatory = false) {
  if (!modalRoot.querySelector('.modal')) {
    modalReturnFocus = document.activeElement;
  }
  modalRoot.innerHTML = `<div class="modal-backdrop" ${mandatory ? '' : 'data-action="close-modal"'}><section class="modal ${mandatory ? 'onboarding-modal' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${content}</section></div>`;
  document.body.classList.add('modal-open');
  app.inert = true;
  modalRoot.querySelector('input, button, select')?.focus({ preventScroll: true });
}

function closeModal() {
  if (!state.settings.onboarded) return;
  calibrationSession = null;
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
  app.inert = false;
  if (modalReturnFocus?.isConnected) {
    modalReturnFocus.focus({ preventScroll: true });
  }
  modalReturnFocus = null;
}

document.addEventListener('keydown', event => {
  if (!modalRoot.querySelector('.modal')) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const focusable = [...modalRoot.querySelectorAll('button, input, select, a, summary')].filter(
      el => !el.disabled && el.getClientRects().length
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});

function openSettings(override) {
  calibrationSession = null;
  const onboarding = !state.settings.onboarded;
  const draft = structuredClone(override?.city ? override : state.settings);

  openModal(
    `<div class="modal-header">
      <a class="brand" aria-label="closer">closer</a>
      ${onboarding ? '<span class="onboarding-step">SETUP</span>' : `<button class="text-close-btn" data-action="close-modal" aria-label="설정 닫기">닫기 ×</button>`}
    </div>
    <div class="modal-intro">
      <h2 id="modal-title">${onboarding ? '캐릭터와 지역을 선택해 주세요' : '환경 설정'}</h2>
      <p>${onboarding ? '선택한 지역의 체감온도에 맞춰 매일의 옷차림을 제안합니다.' : '설정은 이 브라우저에 자동 저장됩니다.'}</p>
    </div>
    <form id="settings-form">
      <fieldset class="settings-field">
        <legend><span>01</span> 캐릭터</legend>
        <div class="gender-options">
          ${[
            ['female', '여성'],
            ['male', '남성'],
          ]
            .map(
              ([gender, name]) => `
            <label class="gender-option">
              <input type="radio" name="gender" value="${gender}" ${draft.gender === gender ? 'checked' : ''} required />
              <div class="gender-art">${character({ top: 'knit', outer: 'jacket', bottom: 'regular-denim', scarf: false }, gender, 'good', `setup-${gender}`)}</div>
              <span><b>${name}</b><span class="gender-check">✓</span></span>
            </label>`
            )
            .join('')}
        </div>
      </fieldset>
      <fieldset class="settings-field">
        <legend><span>02</span> 지역</legend>
        <label class="sr-only" for="city-select">거주 지역</label>
        <div class="city-select-wrap">
          <select id="city-select" name="city">
            ${CITIES.map((city, i) => `<option value="${i}" ${city.name === draft.city.name ? 'selected' : ''}>${city.name}, ${city.region}</option>`).join('')}
            ${!CITIES.some(c => c.name === draft.city.name) ? `<option value="gps" selected>${escape(draft.city.name)}</option>` : ''}
          </select>
          <span class="select-caret" aria-hidden="true">▾</span>
        </div>
        <button type="button" class="gps-button" id="gps-button">현재 위치로 설정</button>
        <p id="gps-status" class="gps-status" role="status"></p>
      </fieldset>
      <div class="calibration-invite">
        <div>
          <span>어제·오늘 옷차림으로 더위/추위 감도 맞추기</span>
          ${draft.calibration ? '<span class="calibrated-badge">맞춤 완료</span>' : '<span class="optional-badge">선택</span>'}
        </div>
        <p>${
          draft.calibration
            ? `${draft.calibration.date} (체감 ${draft.calibration.feels}°) 옷차림 경험이 반영되어 있습니다.`
            : '어제나 오늘 실제 입었던 옷과 더위·추위 느낌을 지정하면 추천 보온 기준이 정교해집니다.'
        }</p>
        <button type="button" class="calibration-start" id="start-calibration">
          <span>${draft.calibration ? '체감 감도 다시 맞추기' : '어제·오늘 옷차림으로 감도 맞추기'}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <button type="submit" class="primary-button settings-submit">
        <span>${onboarding ? '시작하기' : '설정 저장'}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
    ${
      onboarding
        ? ''
        : `<details class="data-management">
            <summary>데이터 관리 <span>▾</span></summary>
            <button type="button" id="clear-looks">저장한 코디 모두 삭제 <span>${state.looks.length}개</span></button>
            <button type="button" id="reset-settings">초기 설정으로 되돌리기</button>
            <button type="button" id="demo-weather">예시 날씨 둘러보기</button>
          </details>`
    }`,
    onboarding
  );

  const form = document.querySelector('#settings-form');
  document.querySelector('#city-select')?.addEventListener('change', event => {
    if (event.target.value !== 'gps') draft.city = CITIES[Number(event.target.value)];
    const status = document.querySelector('#gps-status');
    if (status) status.textContent = '';
  });

  document.querySelector('#gps-button')?.addEventListener('click', () => {
    const status = document.querySelector('#gps-status');
    const gps = document.querySelector('#gps-button');
    if (!navigator.geolocation) {
      status.textContent = '이 브라우저에서는 위치를 가져올 수 없어요. 지역을 직접 선택해 주세요.';
      return;
    }
    status.textContent = '브라우저에서 위치 권한을 허용해 주세요…';
    gps.disabled = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        if (!gps.isConnected) return;
        draft.city = {
          name: '내 주변',
          region: '현재 위치',
          lat: Number(position.coords.latitude.toFixed(2)),
          lon: Number(position.coords.longitude.toFixed(2)),
          timezone: 'auto',
        };
        const select = document.querySelector('#city-select');
        select.querySelector('option[value="gps"]')?.remove();
        select.add(new Option('내 주변 · 현재 위치', 'gps', true, true));
        status.textContent = '현재 위치 좌표를 확인했어요.';
        gps.disabled = false;
      },
      error => {
        if (!gps.isConnected) return;
        status.textContent =
          error.code === 1
            ? '위치 권한이 꺼져 있어요. 지역을 직접 선택하거나 브라우저 설정에서 허용해 주세요.'
            : '위치를 확인하지 못했어요. 지역을 직접 선택해 주세요.';
        gps.disabled = false;
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  });

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const updated = { ...draft, gender: values.get('gender'), sensitivity: draft.sensitivity || 0, onboarded: true };
    const saved = writeStorage(SETTINGS_KEY, updated);
    state.settings = updated;
    closeModal();
    render();
    loadWeather();
    if (!saved) toast('설정을 적용했지만 기기 저장소에 기록하지 못했어요.');
    else if (!onboarding) toast('설정을 저장했어요.');
  });

  document.querySelector('#start-calibration')?.addEventListener('click', () => {
    draft.gender = new FormData(form).get('gender');
    calibrationForm(draft, 'yesterday', true);
  });

  document.querySelector('#clear-looks')?.addEventListener('click', () =>
    confirmAction(
      '저장한 코디를 모두 삭제할까요?',
      '옷장의 코디만 삭제되며 캐릭터와 지역 설정은 유지됩니다.',
      '모두 삭제',
      () => {
        if (!writeStorage(LOOKS_KEY, [])) {
          toast('삭제 내용을 저장하지 못했어요.');
          return;
        }
        state.looks = [];
        closeModal();
        render();
        toast('저장한 코디를 모두 삭제했어요.');
      }
    )
  );

  document.querySelector('#reset-settings')?.addEventListener('click', () =>
    confirmAction(
      '초기 설정으로 되돌릴까요?',
      '캐릭터·지역·체감 감도와 날씨 캐시를 초기화합니다. 저장한 코디는 유지됩니다.',
      '초기화',
      () => {
        try {
          Object.keys(localStorage)
            .filter(key => key.startsWith('closer.forecast.') || key === SETTINGS_KEY)
            .forEach(key => localStorage.removeItem(key));
        } catch {
          toast('기기 저장소를 초기화하지 못했어요.');
          return;
        }
        request?.abort();
        request = null;
        state.settings = { gender: 'female', city: CITIES[0], sensitivity: 0, onboarded: false };
        state.days = makeDemo();
        state.index = 0;
        state.mode = 'quick';
        state.custom = null;
        state.source = 'loading';
        state.fetchedAt = null;
        render();
        openSettings();
      }
    )
  );

  document.querySelector('#demo-weather')?.addEventListener('click', () => {
    request?.abort();
    request = null;
    state.demo = true;
    state.days = makeDemo();
    state.yesterday = makeFallbackYesterday(state.days[0]);
    state.index = 0;
    state.source = 'demo';
    state.fetchedAt = null;
    state.loading = false;
    closeModal();
    state.page = 'home';
    render();
    toast('예시 날씨 모드입니다.');
  });
}

function confirmAction(title, description, label, action) {
  openModal(
    `<div class="modal-header">
      <span class="eyebrow">CONFIRM</span>
      <button class="text-close-btn" id="confirm-cancel-top" aria-label="취소">닫기 ×</button>
    </div>
    <div class="modal-intro">
      <h2 id="modal-title">${title}</h2>
      <p>${description}</p>
    </div>
    <div class="confirm-actions">
      <button class="secondary-button" id="confirm-cancel">취소</button>
      <button class="primary-button danger" id="confirm-action">${label}</button>
    </div>`
  );
  document.querySelector('#confirm-action')?.addEventListener('click', action);
  document.querySelector('#confirm-cancel')?.addEventListener('click', () => openSettings());
  document.querySelector('#confirm-cancel-top')?.addEventListener('click', () => openSettings());
}

function openInstall() {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    return;
  }
  openModal(
    `<div class="modal-header">
      <span class="eyebrow">INSTALL</span>
      <button class="text-close-btn" data-action="close-modal" aria-label="닫기">닫기 ×</button>
    </div>
    <div class="modal-intro">
      <h2 id="modal-title">홈 화면에 추가하기</h2>
      <p>앱처럼 전체 화면으로 빠르게 열 수 있어요.</p>
    </div>
    <div class="install-instructions">
      <div><span>iPhone · Safari</span><p>하단 공유 버튼을 누르고 <b>홈 화면에 추가</b>를 선택해 주세요.</p></div>
      <div><span>Android · Chrome</span><p>우측 상단 메뉴에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 선택해 주세요.</p></div>
    </div>
    <button class="primary-button" data-action="close-modal">확인</button>`
  );
}

function openWeatherDetails() {
  const day = current();
  openModal(
    `<div class="modal-header">
      <span class="eyebrow">${day.date} · ${escape(state.settings.city.name)}</span>
      <button class="text-close-btn" data-action="close-modal" aria-label="닫기">닫기 ×</button>
    </div>
    <div class="modal-intro">
      <h2 id="modal-title">시간대별 기온</h2>
      <p>일교차가 큰 날에는 입고 벗기 편한 아우터를 추천합니다.</p>
    </div>
    ${hourlySection(day)}
    <p class="field-help">${
      state.source === 'demo' ? '예시 날씨' : state.source === 'cached' ? '저장된 예보' : '실시간 예보'
    } · 강수 확률 ${Number.isFinite(day.rain) ? `${day.rain}%` : '-'} · 바람 ${Number.isFinite(day.wind) ? `${day.wind.toFixed(1)}m/s` : '-'}</p>`
  );
}

async function openShare(savedLook) {
  const snapshot = savedLook
    ? structuredClone(savedLook)
    : {
        outfit: structuredClone(outfit()),
        gender: state.settings.gender,
        date: current().date,
        feels: climate().feels,
        city: state.settings.city.name,
        source: state.source,
      };
  openModal(
    `<div class="modal-header">
      <span class="eyebrow">LOOK CARD</span>
      <button class="text-close-btn" data-action="close-modal" aria-label="닫기">닫기 ×</button>
    </div>
    <div class="modal-intro">
      <h2 id="modal-title">코디 카드 저장 · 공유</h2>
      <p>9:16 비율의 코디 카드를 이미지로 저장하거나 공유할 수 있습니다.</p>
    </div>
    <div id="share-preview" class="share-preview"><p>코디 이미지를 생성하고 있어요…</p></div>
    <div class="share-actions">
      <button class="primary-button" id="share-native" disabled>공유하기</button>
      <a id="share-download" class="secondary-button" aria-disabled="true">PNG 다운로드</a>
    </div>`
  );
  const container = document.querySelector('#share-preview');
  try {
    const image = await createLookImage(snapshot);
    if (!container?.isConnected) {
      URL.revokeObjectURL(image.url);
      return;
    }
    container.innerHTML = `<img src="${image.url}" alt="${snapshot.date} 코디 공유 이미지" />`;
    const link = document.querySelector('#share-download');
    link.href = image.url;
    link.download = image.filename;
    link.removeAttribute('aria-disabled');

    const share = document.querySelector('#share-native');
    const file = new File([image.blob], image.filename, { type: 'image/png' });
    const supported = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    share.disabled = false;
    share.textContent = supported ? '공유 메뉴 열기' : '이미지 저장';

    share.addEventListener('click', async () => {
      if (!supported) {
        link.click();
        toast('이미지를 저장했어요.');
        return;
      }
      try {
        await navigator.share({
          files: [file],
          title: 'closer closet',
          text: '날씨에 맞춰 입은 오늘의 코디.',
        });
      } catch (error) {
        if (error.name !== 'AbortError') toast('PNG 다운로드를 이용해 주세요.');
      }
    });

    link.addEventListener('click', () => toast('코디 이미지를 저장합니다.'));
    const observer = new MutationObserver(() => {
      if (!container.isConnected) {
        URL.revokeObjectURL(image.url);
        observer.disconnect();
      }
    });
    observer.observe(modalRoot, { childList: true });
  } catch {
    if (container?.isConnected) {
      container.innerHTML = '<p>이미지를 만들지 못했어요. 다시 시도해 주세요.</p>';
    }
  }
}

function calibrationForm(draft, initialDayTarget = 'today', fromSettings = false) {
  const todayObj = state.days[0] || makeDemo()[0];
  const yesterdayObj = state.yesterday || makeFallbackYesterday(todayObj);
  let dayTarget = draft.calibration?.dayTarget || initialDayTarget;
  const activeDay = () => (dayTarget === 'yesterday' ? yesterdayObj : todayObj);

  let worn = normalizeOutfit(
    draft.calibration?.outfit || (state.mode === 'edit' && state.custom ? state.custom : recommendation())
  );
  let period = draft.calibration?.period || state.period || 'day';
  let showFan = false;
  let peekTop = 0;
  let peekBottom = 0;
  const drawer = { category: 'outer', fit: 'all', settings: draft, partsOpen: false };

  function renderStudioMarkup() {
    const day = activeDay();
    const cl = periodWeather(day, period);
    const layers = outfitLayers(worn);
    const res = assess(worn, cl.feels, draft.sensitivity || 0);
    return `
      <div class="calibration-studio fashion-app">
        <header class="calibration-top">
          <button id="calibration-back" class="text-close-btn" aria-label="돌아가기">← ${fromSettings ? '설정' : '닫기'}</button>
          <h2 id="modal-title">날씨와 내 옷차림으로 체감 맞추기</h2>
          <button class="calibration-next" id="calibration-next" ${layers.length ? '' : 'disabled'}>다음 →</button>
        </header>
        <div class="calibration-context">
          <div class="calibration-day-switch" role="group" aria-label="기준 날짜">
            <button data-action="calibration-day" data-day="yesterday" class="${dayTarget === 'yesterday' ? 'selected' : ''}">어제 (${yesterdayObj.date.slice(5)})</button>
            <button data-action="calibration-day" data-day="today" class="${dayTarget === 'today' ? 'selected' : ''}">오늘 (${todayObj.date.slice(5)})</button>
          </div>
          <div class="calibration-periods" role="group" aria-label="시간대">
            ${[
              ['morning', '아침'],
              ['day', '낮'],
              ['evening', '저녁'],
              ['all', '종일'],
            ]
              .map(
                ([id, name]) =>
                  `<button data-action="calibration-period" data-period="${id}" class="${period === id ? 'selected' : ''}">${name}</button>`
              )
              .join('')}
          </div>
          <strong>${escape(draft.city.name)} · 체감 ${cl.feels}°</strong>
        </div>
        <div class="calibration-workspace">
          <div class="look-scene ${layers.length ? '' : 'waiting-for-clothes'} ${showFan ? 'fan-open' : ''}" id="calibration-canvas" tabindex="0" aria-label="입었던 옷을 선택하는 캔버스">
            <div class="character-stage">
              <div class="character-wrap">${character({ ...worn, peekTop, peekBottom }, draft.gender, res.mood, 'calibration')}</div>
            </div>
            ${showFan ? layerFanMarkup(worn, true, draft.gender, peekTop, peekBottom) : ''}
            ${!layers.length && !showFan ? '<p class="empty-canvas-note">어제나 오늘 입은 옷을 선택해 주세요</p>' : ''}
            <div class="calibration-layer-count">
              <button data-action="calibration-stack">상의 ${layerCount(worn)} · 하의 ${countLayers(worn, 'bottom')}겹 ${showFan ? '접기' : '펼쳐보기'}</button>
              <span class="canvas-comfort ${res.mood}"><i></i>${res.label}</span>
            </div>
          </div>
          <aside class="fashion-shelf"><div class="shelf-body">${wardrobe({ ...drawer, partsOpen: showFan }, {}, worn, res, cl)}</div></aside>
        </div>
      </div>`;
  }

  function bindStudio() {
    document.querySelector('#calibration-back')?.addEventListener('click', () => {
      calibrationSession = null;
      if (fromSettings) openSettings(draft);
      else closeModal();
    });
    document.querySelector('#calibration-next')?.addEventListener('click', showFeeling);
    document.querySelector('#calibration-canvas')?.addEventListener('click', event => {
      if (event.target.closest('button, .fan-card')) return;
      showFan = !showFan;
      if (!showFan) {
        peekTop = 0;
        peekBottom = 0;
      }
      draw();
    });
  }

  function draw() {
    const prevDrawer = modalRoot.querySelector('.calibration-studio .wardrobe-drawer');
    const scrollLeft = prevDrawer?.scrollLeft || 0;
    const scrollTop = prevDrawer?.scrollTop || 0;
    const modal = modalRoot.querySelector('.modal');

    if (modal && modal.querySelector('.calibration-studio')) {
      modal.innerHTML = renderStudioMarkup();
      bindStudio();
    } else {
      openModal(renderStudioMarkup(), !state.settings.onboarded);
      modalRoot.querySelector('.modal')?.classList.add('calibration-shell');
      bindStudio();
    }

    const nextDrawer = modalRoot.querySelector('.calibration-studio .wardrobe-drawer');
    if (nextDrawer) {
      nextDrawer.scrollLeft = scrollLeft;
      nextDrawer.scrollTop = scrollTop;
    }

    calibrationSession = {
      canvas: () => document.querySelector('#calibration-canvas'),
      reorder: (key, target, after) => {
        worn = moveLayer(worn, key, target, after);
        peekTop = 0;
        peekBottom = 0;
        draw();
      },
      action: (action, button) => {
        if (action === 'clear-category') {
          worn = addLayer(worn, button.dataset.category, 'none');
          peekTop = 0;
          peekBottom = 0;
        } else if (action === 'toggle-piece') {
          const category = button.dataset.category;
          const id = button.dataset.id;
          const found = outfitLayers(worn)
            .filter(l => l.category === category && l.id === id)
            .at(-1);
          worn = found ? removeLayer(worn, found.key) : addLayer(worn, category, id);
          if (['hat', 'shoes'].includes(category) && worn[category] === id && button.classList.contains('selected')) {
            worn[category] = 'none';
          }
        } else if (action === 'category') {
          drawer.category = button.dataset.category;
          drawer.fit = 'all';
        } else if (action === 'fit') {
          drawer.fit = button.dataset.fit;
        } else if (action === 'color') {
          worn.colors = { ...worn.colors, [button.dataset.category]: button.dataset.color || null };
        } else if (action === 'remove-layer') {
          worn = removeLayer(worn, button.dataset.key);
          peekTop = 0;
          peekBottom = 0;
        } else if (action === 'fan-move') {
          worn = shiftLayer(worn, button.dataset.key, Number(button.dataset.dir));
          peekTop = 0;
          peekBottom = 0;
        } else if (action === 'fan-peek') {
          const region = button.dataset.region;
          const peek = Number(button.dataset.peek) || 0;
          if (region === 'bottom') peekBottom = peek;
          else peekTop = peek;
        } else if (action === 'reset-look') {
          worn = normalizeOutfit({ layers: [], scarf: false });
          peekTop = 0;
          peekBottom = 0;
        } else if (action === 'accessory') {
          worn[button.dataset.id] = !worn[button.dataset.id];
        } else if (action === 'calibration-period') {
          period = button.dataset.period;
        } else if (action === 'calibration-day') {
          dayTarget = button.dataset.day;
        } else if (action === 'calibration-stack' || action === 'parts' || action === 'fan-backdrop') {
          showFan = !showFan;
          if (!showFan) {
            peekTop = 0;
            peekBottom = 0;
          }
        } else {
          return;
        }
        draw();
      },
    };
  }

  function showFeeling() {
    const day = activeDay();
    const cl = periodWeather(day, period);
    let feeling = draft.calibration?.feeling || null;
    openModal(
      `<div class="modal-header">
        <button class="text-close-btn" id="back-to-dressing" aria-label="옷차림 수정">← 옷차림 수정</button>
        <span class="eyebrow">${dayTarget === 'yesterday' ? '어제' : '오늘'} (${day.date}) · 체감 ${cl.feels}°</span>
      </div>
      <div class="modal-intro">
        <h2 id="modal-title">이 옷차림으로 어땠나요?</h2>
        <p>당시 느낀 더위·추위 정도를 선택하면 내 체감 감도에 즉시 반영됩니다.</p>
      </div>
      <div class="calibration-recap">
        <div class="recap-character">${character(worn, draft.gender, 'good', 'recap')}</div>
        <div>
          ${layerStackMarkup(worn, false)}
          <span class="recap-count">상의 ${layerCount(worn)}겹 · 하의 ${countLayers(worn, 'bottom')}겹</span>
        </div>
      </div>
      <div class="feeling-options" role="group" aria-label="체감 피드백">
        ${[
          ['cold', '추웠다'],
          ['cool', '조금 추웠다'],
          ['good', '적당했다'],
          ['warm', '조금 더웠다'],
          ['hot', '더웠다'],
        ]
          .map(
            ([id, name]) =>
              `<button data-feeling="${id}" class="${feeling === id ? 'selected' : ''}" aria-pressed="${feeling === id}"><span>${name}</span></button>`
          )
          .join('')}
      </div>
      <button class="primary-button calibration-done" id="calibration-done" ${feeling ? '' : 'disabled'}>
        <span>체감 감도 적용하기</span>
        <span aria-hidden="true">→</span>
      </button>`,
      !state.settings.onboarded
    );
    document.querySelector('#back-to-dressing')?.addEventListener('click', draw);
    modalRoot.querySelectorAll('[data-feeling]').forEach(button =>
      button.addEventListener('click', () => {
        feeling = button.dataset.feeling;
        modalRoot.querySelectorAll('[data-feeling]').forEach(b => {
          b.classList.toggle('selected', b === button);
          b.setAttribute('aria-pressed', String(b === button));
        });
        document.querySelector('#calibration-done').disabled = false;
      })
    );
    document.querySelector('#calibration-done')?.addEventListener('click', () => {
      const sensitivity = Math.round(calibrationOffset(worn, cl.feels, feeling) * 10) / 10;
      const calibration = { outfit: worn, feeling, date: day.date, dayTarget, feels: cl.feels, period };
      calibrationSession = null;
      if (fromSettings || !state.settings.onboarded) {
        openSettings({ ...draft, sensitivity, calibration });
        toast('체감 감도를 계산했어요. 설정을 저장해 주세요.');
      } else {
        const updated = { ...state.settings, sensitivity, calibration, onboarded: true };
        writeStorage(SETTINGS_KEY, updated);
        state.settings = updated;
        closeModal();
        render();
        toast(`${dayTarget === 'yesterday' ? '어제' : '오늘'} 옷차림 기준으로 더위·추위 감도를 반영했어요.`);
      }
    });
  }

  draw();
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  toast('closer를 홈 화면에 추가했어요.');
});

render();

if (!state.settings.onboarded) {
  openModal(
    `<div class="welcome-intro">
      <p class="welcome-brand">closer closet</p>
      <h2 id="modal-title">오늘 날씨에,<br>무엇을 입을까요.</h2>
      <p>기온과 바람, 그리고 내가 실제로 느낀 더위와 추위에 맞춰<br>어떤 옷을 몇 겹으로 입을지 제안합니다.</p>
      <button class="primary-button" id="welcome-start"><span>시작하기</span><span aria-hidden="true">→</span></button>
    </div>`,
    true
  );
  document.querySelector('#welcome-start')?.addEventListener('click', () => openSettings());
} else {
  loadWeather();
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
