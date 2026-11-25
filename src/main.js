import './style.css';
import './editorial.css';
import './peeking.css';
import './closet.css';
import { studioShell,wardrobe,layerStackMarkup } from './studio-view.js';
import { addLayer, normalizeOutfit, outfitLayers, removeLayer,upperLayers,moveLayer } from './layers.js';
import { curatedLook } from './lookbook.js';
import {dailyLook} from './daily-look.js';
import { closetView } from './closet-view.js';
import { createIcons, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Coffee, Heart, House, Info, Layers, LocateFixed, MapPin, Menu, Minus, Moon, Plus, RotateCcw, Settings2, Shirt, SlidersHorizontal, Smartphone, Snowflake, Sparkles, Sun, Sunset, Thermometer, Trash2, Umbrella, Wind, X } from 'lucide';
import { CITIES, fetchForecast, localDate, makeDemo, periodWeather, resolveDateIndex, weatherInfo,validForecastCache } from './weather.js';
import { GARMENTS, PALETTE, assess, garmentColor, getGarment, layerCount, outfitTitle, recommend, targetWarmth, warmth,calibrationOffset } from './wardrobe.js';
import { character, garmentDrawing } from './paper-doll.js';
import { createLookImage } from './share-card.js';
import { LOOKS_KEY, SETTINGS_KEY, readStorage, validSettings, writeStorage } from './storage.js';

const icons = { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Coffee, Heart, House, Info, Layers, LocateFixed, MapPin, Menu, Minus, Moon, Plus, RotateCcw, Settings2, Shirt, SlidersHorizontal, Smartphone, Snowflake, Sparkles, Sun, Sunset, Thermometer, Trash2, Umbrella, Wind, X };
const initialSettings = readStorage(SETTINGS_KEY);
const state = {
  settings: validSettings(initialSettings) ? initialSettings : { gender: 'female', city: CITIES[0], sensitivity: 0, onboarded: false },
  days: makeDemo(), index: 0, period: 'day', mode: 'quick', page: 'home',
  source: 'loading', loading: false, fetchedAt: null, timezone: 'Asia/Seoul',
  looks: (Array.isArray(readStorage(LOOKS_KEY)) ? readStorage(LOOKS_KEY) : []).filter(look => look && typeof look.id === 'string' && typeof look.date === 'string' && look.outfit),
  custom: null, demo: false, category: 'outer', partsOpen: false, fit: 'all',peekTop:0,peekBottom:0,
};
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
let request = null;
let toastTimer;
let installPrompt = null;
let modalReturnFocus = null;
let lastDragTime = 0;
let drag = null;
let calibrationSession=null;
let peekTimer;
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, className = '') => `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
const round = n => Math.round(n);
const dateObj = date => new Date(`${date}T12:00:00`);
const dateLabel = (date, options) => dateObj(date).toLocaleDateString('ko-KR', options);
const current = () => state.days[state.index];
const climate = () => periodWeather(current(), state.period);
const recommendation = () => dailyLook(current(),state.period,state.settings.sensitivity);
const outfit = () => state.mode === 'edit' && state.custom ? state.custom : recommendation();
const assessment = () => assess(outfit(), climate().feels, state.settings.sensitivity);
const isSaved = () => state.looks.some(look => look.date === current().date && JSON.stringify(look.outfit) === JSON.stringify(outfit()) && look.city === state.settings.city.name);

function hydrateIcons() { createIcons({ icons, attrs: { 'stroke-width': 1.6 } }); }
function toast(message) {
  clearTimeout(toastTimer);
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}

function navButton(page, label, name) {
  return `<button class="nav-link ${state.page === page ? 'active' : ''}" data-action="page" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${page === 'saved' && state.looks.length ? `<span class="nav-count">${state.looks.length}</span>` : ''}</button>`;
}

function render() {
  const scroll=document.querySelector('.fashion-shelf .wardrobe-drawer')?.scrollLeft||0;
  app.innerHTML=studioShell(state,{icon,current,climate,outfit,assessment,isSaved,savedPage});
  hydrateIcons();
  bindHome();
  const drawer=document.querySelector('.fashion-shelf .wardrobe-drawer');if(drawer)drawer.scrollLeft=scroll;
}

function hourlySection(day) {
  const periods = [{ hour: 8, name: '아침 출근길', icon: 'coffee' }, { hour: 13, name: '낮의 산책', icon: 'sun' }, { hour: 18, name: '저녁 약속', icon: 'sunset' }, { hour: 22, name: '집으로 가는 길', icon: 'moon' }];
  return `<section class="hourly-section"><div class="hourly-title"><div><span class="eyebrow">FROM MORNING TO NIGHT</span><h2>하루의 온도도 살펴봐요<span>.</span></h2></div><span class="hourly-description">큰 일교차에는 벗기 쉬운 한 겹을 챙겨요.</span></div><div class="hourly-grid">${periods.map(p => {
    const h = day.hours.find(h => h.hour === p.hour);
    if (!h) return '';
    return `<div class="hour-card">${icon(p.icon)}<div><span>${p.name} <small>${p.hour}:00</small></span><strong>${round(h.temp)}<sup>°</sup><span>체감 ${round(h.feels)}°</span></strong></div><span class="hour-condition">${weatherInfo(h.code).label}</span></div>`;
  }).join('')}</div></section>`;
}

function savedPage() {
  return closetView(state.looks,icon);
}

function bindHome() {
  const scene = document.querySelector('#swipe-scene');
  let start;
  scene?.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    start = { x: event.clientX, y: event.clientY };
  });
  scene?.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate(dx < 0 ? 1 : -1);
  });
  scene?.addEventListener('pointercancel', () => { start = null; });
  scene?.addEventListener('click',event=>{
    if(state.mode!=='edit'||event.target.closest('button')||Date.now()-lastDragTime<300)return;
    clearTimeout(peekTimer);
    const box=scene.getBoundingClientRect();const lower=(event.clientY-box.top)/box.height>.57;
    const count=lower?outfitLayers(outfit()).filter(l=>l.category==='bottom').length:upperLayers(outfit()).length;
    if(count<2){state.partsOpen=!state.partsOpen;render();return;}
    const key=lower?'peekBottom':'peekTop';state[key]=(state[key]+1)%count;render();animatePeek();
  });
  scene?.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); navigate(event.key === 'ArrowRight' ? 1 : -1); }
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
  rail?.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(event.key === 'ArrowRight' ? 1 : -1);
      document.querySelector(`#date-${state.index}`)?.focus({ preventScroll: true });
    }
  });
  const selected = document.querySelector('.date-tab.selected');
  if (rail && selected) rail.scrollLeft = Math.max(0, selected.offsetLeft - rail.offsetLeft - rail.clientWidth / 2 + selected.clientWidth / 2);
}

function navigate(direction) {
  const index = state.index + direction;
  if (index < 0 || index >= state.days.length) { toast('현재 제공되는 예보의 마지막 날짜예요.'); return; }
  setDay(index);
}

function setDay(index) {
  state.index = index;
  if (state.mode === 'edit'&&!state.custom) {const {lookId,...parts}=recommendation();state.custom=normalizeOutfit(parts);}
  render();
  document.querySelector('.character-wrap')?.animate([{ opacity: 0.25, transform: 'translateX(18px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260, easing: 'ease-out' });
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
    state.index = Math.max(0, resolveDateIndex(state.days, date));
    state.fetchedAt = response.fetchedAt;
    state.timezone = response.timezone;
    state.source = 'live';
    writeStorage(cacheKey, response);
  } catch {
    if (request !== controller) return;
    const cached = readStorage(cacheKey);
    let today=localDate();try{if(typeof cached?.timezone==='string')today=localDate(new Date(),cached.timezone);}catch{}
    if (validForecastCache(cached) && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000 && cached.days.some(d => d.date === today)) {
      state.days = cached.days.filter(d => d.date >= today);
      state.index = 0;
      state.source = 'cached';
      state.fetchedAt = cached.fetchedAt;
      state.timezone = cached.timezone;
      toast('연결이 어려워 최근 저장된 예보를 보여드려요.');
    } else {
      state.days = makeDemo();
      state.index = 0;
      state.source = 'demo';
      state.fetchedAt = null;
    }
  } finally {
    clearTimeout(timeout);
    if (request === controller) {
      state.loading = false;
      if (state.mode === 'edit'&&!state.custom) {const {lookId,...parts}=recommendation();state.custom=normalizeOutfit(parts);}
      render();
    }
  }
}

function saveLook() {
  if (state.source === 'loading') { toast('날씨를 불러온 뒤 코디를 저장해 주세요.'); return; }
  if (isSaved()) { toast('이미 옷장에 담아둔 코디예요.'); return; }
  const look = { id: globalThis.crypto?.randomUUID?.()||`look-${Date.now()}-${Math.random().toString(36).slice(2)}`, date: current().date, outfit: structuredClone(outfit()), gender: state.settings.gender, city: state.settings.city.name, feels: climate().feels, period: state.period, source: state.source, createdAt: Date.now() };
  const updated = [...state.looks, look];
  if (!writeStorage(LOOKS_KEY, updated)) { toast('기기에 저장할 공간이 부족해요. 브라우저 저장 설정을 확인해 주세요.'); return; }
  state.looks = updated;
  render();
  toast(state.source === 'demo' ? '예시 코디를 내 옷장에 담았어요.' : '오늘의 코디를 내 옷장에 담았어요.');
}

document.addEventListener('click', event => {
  const piece=event.target.closest('[data-draggable]');
  if(piece){
    const category=piece.dataset.category,id=piece.dataset.id;
    if(piece.closest('.calibration-studio')&&calibrationSession){calibrationSession.action('toggle-piece',piece);return;}
    const look=normalizeOutfit(outfit()),existing=outfitLayers(look).filter(l=>l.category===category&&l.id===id).at(-1);
    state.custom=existing?removeLayer(look,existing.key):addLayer(look,category,id);
    if(['hat','shoes'].includes(category)&&look[category]===id)state.custom[category]='none';
    state.mode='edit';state.peekTop=0;state.peekBottom=0;render();return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if(button.closest('.calibration-studio')&&calibrationSession){calibrationSession.action(action,button);return;}
  if (action === 'close-modal' && button.classList.contains('modal-backdrop') && event.target !== button) return;
  if (['home', 'page'].includes(action)) {
    event.preventDefault(); state.page = button.dataset.page || 'home'; render(); window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (action === 'settings') openSettings();
  else if (action === 'prev') navigate(-1);
  else if (action === 'next') navigate(1);
  else if (action === 'date') setDay(Number(button.dataset.index));
  else if (action === 'today') setDay(Math.max(0, resolveDateIndex(state.days, localDate(new Date(), state.timezone))));
  else if (action === 'date-picker') {
    const input = document.querySelector('#date-input');
    try { input.showPicker(); } catch { input.focus(); }
  } else if (action === 'mode') {
    if (button.dataset.mode === 'edit' && state.mode !== 'edit') {const {lookId,...parts}=recommendation();state.custom=normalizeOutfit(parts);}
    state.mode = button.dataset.mode; state.page='home';state.peekTop=0;state.peekBottom=0; render();
  } else if (action === 'period') { state.period = button.dataset.period; render(); }
  else if(action==='clear-category'){const category=button.dataset.category;state.custom=addLayer(outfit(),category,'none');state.peekTop=0;state.peekBottom=0;render();}
  else if (action === 'garment') { return; }
  else if (action === 'fit') { state.fit=button.dataset.fit;render(); }
  else if (action === 'weather-details') openWeatherDetails();
  else if (action === 'category') { state.category = button.dataset.category; render(); }
  else if (action === 'color') { state.custom.colors = {...state.custom.colors,[button.dataset.category]:button.dataset.color || null}; render(); }
  else if (action === 'parts') { state.partsOpen = !state.partsOpen; render(); }
  else if (action === 'peek-reset') { clearTimeout(peekTimer);state.peekTop=0;state.peekBottom=0;render();animatePeek(); }
  else if (action === 'remove-layer') { state.custom=removeLayer(outfit(),button.dataset.key);render(); }
  else if (action === 'share') openShare();
  else if (action === 'share-saved') openShare(state.looks.find(l=>l.id===button.dataset.id));
  else if (action === 'accessory') { state.custom[button.dataset.id] = !state.custom[button.dataset.id]; render(); }
  else if (action === 'reset-look') { state.custom = normalizeOutfit({...recommendation(),layers:[]}); render(); }
  else if (action === 'save') saveLook();
  else if (action === 'refresh') loadWeather();
  else if (action === 'install') openInstall();
  else if (action === 'close-modal') closeModal();
  else if (action === 'delete-look') {
    const updated = state.looks.filter(look => look.id !== button.dataset.id);
    if (writeStorage(LOOKS_KEY, updated)) { state.looks = updated; render(); toast('저장한 코디를 삭제했어요.'); }
    else toast('삭제 내용을 저장하지 못했어요.');
  } else if (action === 'restore-look') {
    const look = state.looks.find(look => look.id === button.dataset.id);
    state.index = Math.max(0, resolveDateIndex(state.days, look.date));
    state.custom = normalizeOutfit(structuredClone(look.outfit)); state.period = look.period || 'day'; state.mode = 'edit'; state.page = 'home';state.peekTop=0;state.peekBottom=0; render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`저장한 옷을 현재 ${state.settings.city.name}의 선택된 날짜·시간 날씨와 비교해요.`);
  }
});

function openModal(content, mandatory = false) {
  modalReturnFocus = document.activeElement;
  modalRoot.innerHTML = `<div class="modal-backdrop" ${mandatory ? '' : 'data-action="close-modal"'}><section class="modal ${mandatory ? 'onboarding-modal' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${content}</section></div>`;
  document.body.classList.add('modal-open');
  app.inert = true;
  hydrateIcons();
  modalRoot.querySelector('input, button, select')?.focus({ preventScroll: true });
}

function closeModal() {
  if (!state.settings.onboarded) return;
  calibrationSession=null;
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
  app.inert = false;
  modalReturnFocus?.isConnected && modalReturnFocus.focus({ preventScroll: true });
}

document.addEventListener('keydown', event => {
  if (!modalRoot.querySelector('.modal')) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const focusable = [...modalRoot.querySelectorAll('button, input, select, a, summary')].filter(el => !el.disabled && el.getClientRects().length);
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});

function openSettings(override) {
  calibrationSession=null;
  const onboarding = !state.settings.onboarded;
  let draft = structuredClone(override?.city ? override : state.settings);
  openModal(`<div class="modal-header"><a class="brand" aria-label="closer">closer<span>.</span></a>${onboarding ? '<span class="onboarding-step">LET’S GET CLOSER</span>' : `<button class="icon-button" data-action="close-modal" aria-label="설정 닫기">${icon('x')}</button>`}</div>
    <div class="modal-intro"><span class="section-kicker">${onboarding ? '처음 오셨군요. 반가워요!' : '조금 더 나에게 맞게'}</span><h2 id="modal-title">${onboarding ? '당신의 하루를<br>조금 더 알려주세요<span>.</span>' : '나의 작은 취향들<span>.</span>'}</h2><p>${onboarding ? '딱 두 가지만 고르면, 옷 고민은 조금 가벼워질 거예요.' : '설정은 이 브라우저에 저장돼요. 언제든 바꿀 수 있어요.'}</p></div>
    <form id="settings-form"><fieldset class="settings-field"><legend><span>01</span> 어떤 캐릭터와 함께할까요?</legend><div class="gender-options">${[['female', '여성', '01'], ['male', '남성', '02']].map(([gender, name, n]) => `<label class="gender-option"><input type="radio" name="gender" value="${gender}" ${draft.gender === gender ? 'checked' : ''} required /><div class="gender-art">${character({ top: 'knit', outer: 'jacket', bottom: 'denim', scarf: false }, gender, 'good', `setup-${gender}`)}</div><span><b>${name}</b><span class="gender-check">${icon('check')}</span></span></label>`).join('')}</div><p class="field-help">캐릭터 외형을 고르는 설정이에요. 모든 의류를 자유롭게 입혀볼 수 있어요.</p></fieldset>
    <fieldset class="settings-field"><legend><span>02</span> 어느 곳의 날씨를 볼까요?</legend><label class="sr-only" for="city-select">거주 지역</label><div class="city-select-wrap">${icon('map-pin')}<select id="city-select" name="city">${CITIES.map((city, i) => `<option value="${i}" ${city.name === draft.city.name ? 'selected' : ''}>${city.name}, ${city.region}</option>`).join('')}${!CITIES.some(c => c.name === draft.city.name) ? `<option value="gps" selected>${e(draft.city.name)}</option>` : ''}</select>${icon('chevron-down')}</div><button type="button" class="gps-button" id="gps-button">${icon('locate-fixed')}현재 위치로 설정하기</button><p class="field-help gps-help">버튼을 누르면 위치를 한 번만 요청해요. 날씨 조회에 필요한 대략적인 좌표만 기기에 저장하며, 위치를 계속 추적하지 않아요.</p><p id="gps-status" class="gps-status" role="status"></p></fieldset>
    <div class="calibration-invite"><div>${icon('thermometer')}<span>어제의 나에게 물어볼까요?</span>${draft.calibration ? '<span class="calibrated-badge">맞춤 설정 완료</span>' : '<span class="optional-badge">선택</span>'}</div><p>${draft.calibration ? '어제 입은 옷과 느낀 온도를 바탕으로 추천을 맞췄어요.' : '어제 입었던 옷, 그리고 그때의 느낌.<br>막연한 체질 대신 나의 실제 경험으로 맞춰요.'}</p><button type="button" class="calibration-start" id="start-calibration">${draft.calibration ? '어제의 옷차림 다시 맞추기' : '어제의 옷차림으로 맞추기'}${icon('arrow-right')}</button></div>
    <button type="submit" class="primary-button settings-submit">${onboarding ? '나에게 맞는 옷차림 만나기' : '설정 저장하기'}${icon('arrow-right')}</button><p class="settings-save-note">${onboarding ? '다음부터는 바로 오늘의 옷차림으로 연결돼요.' : '설정 변경 시 해당 지역의 날씨를 새로 불러와요.'}</p></form>
    ${onboarding ? '' : `<details class="data-management"><summary>기록 및 데이터 관리 ${icon('chevron-down')}</summary><p>설정과 코디는 이 기기에만 저장되어 있어요.</p><button id="clear-looks">${icon('trash-2')}저장한 코디 모두 삭제 <span>${state.looks.length}개</span></button><button id="reset-settings">${icon('rotate-ccw')}초기 설정으로 되돌리기</button><button id="demo-weather">${icon('sparkles')}예시 날씨 둘러보기</button></details>`}`, onboarding);
  const form = document.querySelector('#settings-form');
  document.querySelector('#city-select').addEventListener('change', event => {
    if (event.target.value !== 'gps') draft.city = CITIES[Number(event.target.value)];
    document.querySelector('#gps-status').textContent = '';
  });
  document.querySelector('#gps-button').addEventListener('click', () => {
    const status = document.querySelector('#gps-status');
    const gps = document.querySelector('#gps-button');
    if (!navigator.geolocation) { status.textContent = '이 브라우저에서는 위치를 가져올 수 없어요. 지역을 직접 선택해 주세요.'; return; }
    status.textContent = '브라우저에서 위치 권한을 허용해 주세요…'; gps.disabled = true;
    navigator.geolocation.getCurrentPosition(position => {
      if (!gps.isConnected) return;
      draft.city = { name: '내 주변', region: '현재 위치', lat: Number(position.coords.latitude.toFixed(2)), lon: Number(position.coords.longitude.toFixed(2)), timezone: 'auto' };
      const select = document.querySelector('#city-select');
      select.querySelector('option[value="gps"]')?.remove();
      select.add(new Option('내 주변 · 현재 위치', 'gps', true, true));
      status.textContent = '위치를 확인했어요. 이 주변의 날씨로 준비할게요.'; gps.disabled = false;
    }, error => {
      if (!gps.isConnected) return;
      status.textContent = error.code === 1 ? '위치 권한이 꺼져 있어요. 지역을 직접 선택하거나 브라우저 설정에서 허용해 주세요.' : '위치를 확인하지 못했어요. 지역을 직접 선택해 주세요.';
      gps.disabled = false;
    }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const updated = { ...draft, gender: values.get('gender'), sensitivity: draft.sensitivity || 0, onboarded: true };
    const saved = writeStorage(SETTINGS_KEY, updated);
    state.settings = updated;
    closeModal(); render(); loadWeather();
    if (!saved) toast('이번에는 설정을 적용했지만 기기에 저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.');
    else if (!onboarding) toast('설정을 저장했어요. 나에게 맞는 날씨를 준비할게요.');
  });
  document.querySelector('#start-calibration').addEventListener('click', () => {
    draft.gender = new FormData(form).get('gender');
    openCalibration(draft);
  });
  document.querySelector('#clear-looks')?.addEventListener('click', () => confirmAction('저장한 코디를 모두 지울까요?', '옷장의 코디만 삭제해요. 캐릭터와 지역 설정은 그대로 유지돼요. 삭제한 코디는 되돌릴 수 없어요.', '코디 모두 삭제', () => {
    if (!writeStorage(LOOKS_KEY, [])) { toast('삭제 내용을 저장하지 못했어요.'); return; }
    state.looks = []; closeModal(); render(); toast('저장한 코디를 모두 삭제했어요.');
  }));
  document.querySelector('#reset-settings')?.addEventListener('click', () => confirmAction('처음부터 다시 설정할까요?', '캐릭터·지역·온도 취향과 날씨 캐시를 초기화해요. 저장한 코디는 옷장에 남겨둘게요.', '설정 초기화', () => {
    try {
      Object.keys(localStorage).filter(key => key.startsWith('closer.forecast.') || key === SETTINGS_KEY).forEach(key => localStorage.removeItem(key));
    } catch { toast('기기 저장소를 초기화하지 못했어요.'); return; }
    request?.abort(); request = null;
    state.settings = { gender: 'female', city: CITIES[0], sensitivity: 0, onboarded: false };
    state.days = makeDemo(); state.index = 0; state.mode = 'quick'; state.custom = null; state.source = 'loading'; state.fetchedAt = null;
    render(); openSettings();
  }));
  document.querySelector('#demo-weather')?.addEventListener('click', () => {
    request?.abort(); request = null; state.demo = true; state.days = makeDemo(); state.index = 0; state.source = 'demo'; state.fetchedAt = null; state.loading = false;
    closeModal(); state.page = 'home'; render(); toast('예시 날씨예요. 새로고침하면 실제 예보로 돌아가요.');
  });
}

function confirmAction(title, description, label, action) {
  openModal(`<div class="modal-header"><span class="eyebrow">A FRESH START</span><button class="icon-button" id="confirm-cancel-top" aria-label="취소">${icon('x')}</button></div><div class="modal-intro"><h2 id="modal-title">${title}</h2><p>${description}</p></div><div class="confirm-actions"><button class="secondary-button" id="confirm-cancel">취소</button><button class="primary-button danger" id="confirm-action">${label}</button></div>`);
  document.querySelector('#confirm-action').addEventListener('click', action);
  document.querySelector('#confirm-cancel').addEventListener('click', openSettings);
  document.querySelector('#confirm-cancel-top').addEventListener('click', openSettings);
}

function openInstall() {
  if (installPrompt) { installPrompt.prompt(); installPrompt = null; return; }
  openModal(`<div class="modal-header"><span class="eyebrow">ALWAYS A LITTLE CLOSER</span><button class="icon-button" data-action="close-modal" aria-label="닫기">${icon('x')}</button></div><div class="modal-intro"><h2 id="modal-title">내일 아침에도,<br>바로 만나요<span>.</span></h2><p>홈 화면에 추가하면 앱처럼 빠르게 열 수 있어요.</p></div><div class="install-instructions"><div><span>iPhone · Safari</span><p>하단의 <b>공유 버튼</b>을 누르고<br><b>홈 화면에 추가</b>를 선택해 주세요.</p></div><div><span>Android · Chrome</span><p>우측 상단 <b>⋮ 메뉴</b>에서<br><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 선택해 주세요.</p></div><div><span>데스크톱 · Chrome / Edge</span><p>주소창의 <b>설치 아이콘</b> 또는 브라우저 메뉴에서<br><b>앱으로 설치</b>를 선택하면 바로가기가 생겨요.</p></div></div><p class="field-help">설치 메뉴는 HTTPS로 배포한 사이트에서 사용할 수 있어요.</p><button class="primary-button" data-action="close-modal">좋아요 ${icon('check')}</button>`);
}

let stackDrag=null;
document.addEventListener('pointerdown',event=>{
 const handle=event.target.closest('[data-reorder-key]');if(!handle||event.button>0)return;
 const row=handle.closest('[data-layer-key]');handle.setPointerCapture(event.pointerId);event.preventDefault();
 stackDrag={handle,row,key:handle.dataset.reorderKey,region:row.dataset.layerRegion,context:handle.closest('.calibration-studio')?calibrationSession:null,target:null,after:false};row.classList.add('reordering');
});
document.addEventListener('pointermove',event=>{
 if(!stackDrag)return;event.preventDefault();
 document.querySelectorAll('.reorder-target').forEach(el=>el.classList.remove('reorder-target'));
 const row=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-layer-key]');
 if(row&&row.dataset.layerRegion===stackDrag.region&&row!==stackDrag.row){stackDrag.target=row.dataset.layerKey;const box=row.getBoundingClientRect();stackDrag.after=event.clientY>box.top+box.height/2;row.classList.add('reorder-target');}
 const list=stackDrag.row.parentElement,box=list.getBoundingClientRect();if(event.clientY<box.top+28)list.scrollTop-=9;else if(event.clientY>box.bottom-28)list.scrollTop+=9;
},{passive:false});
document.addEventListener('pointerup',()=>{
 if(!stackDrag)return;const d=stackDrag;stackDrag=null;d.row.classList.remove('reordering');document.querySelectorAll('.reorder-target').forEach(el=>el.classList.remove('reorder-target'));
 if(!d.target)return;if(d.context)d.context.reorder(d.key,d.target,d.after);else{state.custom=moveLayer(outfit(),d.key,d.target,d.after);state.peekTop=0;state.peekBottom=0;render();}
});
document.addEventListener('pointercancel',()=>{stackDrag?.row.classList.remove('reordering');stackDrag=null;});
document.addEventListener('keydown',event=>{
 const handle=event.target.closest('[data-reorder-key]');if(!handle||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();
 const row=handle.closest('[data-layer-key]'),rows=[...row.parentElement.querySelectorAll('[data-layer-key]')].filter(r=>r.dataset.layerRegion===row.dataset.layerRegion),index=rows.indexOf(row),target=rows[index+(event.key==='ArrowUp'?-1:1)];if(!target)return;
 const context=handle.closest('.calibration-studio')?calibrationSession:null;if(context)context.reorder(row.dataset.layerKey,target.dataset.layerKey,event.key==='ArrowDown');else{state.custom=moveLayer(outfit(),row.dataset.layerKey,target.dataset.layerKey,event.key==='ArrowDown');render();}
});

let trayPan=null,lastTrayPan=0;
document.addEventListener('pointerdown',event=>{
 const tray=event.target.closest('.wardrobe-drawer');
 if(!tray||event.pointerType!=='mouse'||event.button!==0||tray.scrollWidth<=tray.clientWidth)return;
 trayPan={tray,x:event.clientX,scroll:tray.scrollLeft,moved:false,id:event.pointerId};
});
document.addEventListener('pointermove',event=>{
 if(!trayPan||event.pointerId!==trayPan.id)return;
 const dx=event.clientX-trayPan.x;if(Math.abs(dx)>5)trayPan.moved=true;
 if(trayPan.moved){trayPan.tray.scrollLeft=trayPan.scroll-dx;event.preventDefault();}
});
document.addEventListener('pointerup',()=>{if(trayPan?.moved)lastTrayPan=Date.now();trayPan=null;});
document.addEventListener('pointercancel',()=>{trayPan=null;});
document.addEventListener('click',event=>{if(Date.now()-lastTrayPan<250&&event.target.closest('.wardrobe-drawer')){event.preventDefault();event.stopImmediatePropagation();}},true);

document.addEventListener('pointerdown', event => {
  const piece = event.target.closest('[data-draggable]');
  if (!piece || event.button > 0) return;
  return; // Native scrolling takes priority; items are toggled with a tap.
  const context=piece.closest('.calibration-studio')?calibrationSession:null;
  if(!context&&state.mode!=='edit')return;
  drag = {piece,context,category:piece.dataset.category,id:piece.dataset.id,x:event.clientX,y:event.clientY,pointerId:event.pointerId,active:false};
});
document.addEventListener('pointermove', event => {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if (!drag.active && Math.hypot(dx,dy)<7) return;
  if(!drag.active&&event.pointerType==='touch'&&Math.abs(dx)>Math.abs(dy)*1.4){drag=null;return;}
  if (!drag.active) {
    drag.active=true;
    drag.piece.setPointerCapture?.(event.pointerId);
    drag.ghost=drag.piece.cloneNode(true);
    drag.ghost.removeAttribute('data-action');drag.ghost.removeAttribute('data-draggable');
    drag.ghost.className='drag-ghost';drag.ghost.setAttribute('aria-hidden','true');
    document.body.append(drag.ghost);document.body.classList.add('is-dragging');
    const scene=drag.context?.canvas()||document.querySelector('#swipe-scene');
    scene?.classList.add('accepting-drop');
    scene?.querySelector('.drop-zone-marker')?.setAttribute('data-drop-category',drag.category);
  }
  event.preventDefault();
  drag.ghost.style.left=`${event.clientX-48}px`;drag.ghost.style.top=`${event.clientY-113}px`;
  const scene=drag.context?.canvas()||document.querySelector('#swipe-scene');const box=scene?.getBoundingClientRect();
  drag.over=box && event.clientX>=box.left && event.clientX<=box.right && event.clientY>=box.top && event.clientY<=box.bottom;
  scene?.classList.toggle('drop-hover',!!drag.over);
},{passive:false});
document.addEventListener('pointerup', () => {
  if (!drag) return;
  if(drag.active){
    lastDragTime=Date.now();
    if(drag.over){
      if(drag.context)drag.context.drop(drag.category,drag.id);
      else applyMainDrop(drag.category,drag.id);
      const canvas=drag.context?.canvas()||document.querySelector('#swipe-scene');canvas?.querySelector('.character-wrap')?.animate([{opacity:.5},{opacity:1}],{duration:180});
      toast(`${getGarment(drag.category,drag.id).name}${['top','outer','bottom'].includes(drag.category)?', 한 겹 추가했어요.':', 입혔어요.'}`);
    }
    else toast('옷을 캐릭터 위에 놓아 주세요.');
    drag.ghost.remove();document.body.classList.remove('is-dragging');
    document.querySelectorAll('.accepting-drop,.drop-hover').forEach(el=>el.classList.remove('accepting-drop','drop-hover'));
  }
  drag=null;
});
document.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;document.body.classList.remove('is-dragging');document.querySelectorAll('.accepting-drop,.drop-hover').forEach(el=>el.classList.remove('accepting-drop','drop-hover'));});

document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-draggable]')){event.preventDefault();event.stopImmediatePropagation();event.target.click();}},true);
let keyboardPiece=null;
document.addEventListener('keydown',event=>{
  const piece=event.target.closest('[data-draggable]');
  if(piece&&(event.key===' '||event.key==='Enter')){
    event.preventDefault();keyboardPiece={category:piece.dataset.category,id:piece.dataset.id,context:piece.closest('.calibration-studio')?calibrationSession:null};
    const canvas=keyboardPiece.context?.canvas()||document.querySelector('#swipe-scene');canvas?.classList.add('accepting-drop');canvas?.focus();toast('옷을 집었어요. 엔터를 눌러 입히거나 Esc로 취소해요.');
  }else if(keyboardPiece&&event.key==='Enter'&&event.target.matches('#swipe-scene,#calibration-canvas')){
    event.preventDefault();const picked=keyboardPiece;keyboardPiece=null;if(picked.context)picked.context.drop(picked.category,picked.id);else applyMainDrop(picked.category,picked.id);toast('한 겹 추가했어요.');
  }else if(keyboardPiece&&event.key==='Escape'){keyboardPiece=null;document.querySelectorAll('.accepting-drop').forEach(el=>el.classList.remove('accepting-drop'));}
});

function animatePeek(){document.querySelectorAll('.doodle-visible-upper,.doodle-bottom').forEach(el=>el.animate([{opacity:.15,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:220,easing:'ease-out'}));}
function applyMainDrop(category,id){
  clearTimeout(peekTimer);state.custom=addLayer(outfit(),category,id);state.peekBottom=0;
  state.peekTop=category==='top'?outfitLayers(state.custom).filter(l=>l.category==='outer').length:0;
  render();animatePeek();
  if(state.peekTop){const snapshot=state.custom;peekTimer=setTimeout(()=>{if(state.custom===snapshot){state.peekTop=0;render();animatePeek();}},1500);}
}

function openWeatherDetails(){
  const day=current();openModal(`<div class="modal-header"><span class="eyebrow">${day.date} · ${e(state.settings.city.name)}</span><button class="icon-button" data-action="close-modal" aria-label="닫기">${icon('x')}</button></div><h2 id="modal-title">하루의 온도</h2>${hourlySection(day)}<p class="field-help">${state.source==='demo'?'예시 날씨입니다.':state.source==='cached'?'연결이 어려워 저장된 예보를 표시합니다.':'최신 예보'} · 강수 확률 ${Number.isFinite(day.rain)?`${day.rain}%`:'정보 없음'} · 바람 ${Number.isFinite(day.wind)?`${day.wind.toFixed(1)}m/s`:'정보 없음'}</p><p class="field-help"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo ↗</a></p>`);
}

async function openShare(savedLook) {
  const snapshot=savedLook?structuredClone(savedLook):{outfit:structuredClone(outfit()),gender:state.settings.gender,date:current().date,feels:climate().feels,city:state.settings.city.name,source:state.source};
  openModal(`<div class="modal-header"><span class="eyebrow">YOUR OUTFIT, YOUR STORY</span><button class="icon-button" data-action="close-modal" aria-label="닫기">${icon('x')}</button></div><div class="modal-intro"><h2 id="modal-title">오늘의 나를,<br>한 장에 담아요<span>.</span></h2><p>스토리에 어울리는 9:16 이미지로 준비했어요.<br>사진으로 저장하거나 친구에게 공유해 보세요.</p></div><div id="share-preview" class="share-preview"><p>코디 이미지를 만들고 있어요…</p></div><div class="share-actions"><button class="primary-button" id="share-native" disabled>${icon('arrow-up-right')}공유하기</button><a id="share-download" class="secondary-button" aria-disabled="true">PNG 이미지 저장</a></div><p class="field-help">공유 메뉴에 보이는 앱으로 보낼 수 있어요. 인스타그램이 표시되지 않으면 이미지를 저장한 뒤 스토리나 DM에 첨부해 주세요.</p>`);
  const container=document.querySelector('#share-preview');
  try{
    const image=await createLookImage(snapshot);
    if(!container.isConnected){URL.revokeObjectURL(image.url);return;}
    container.innerHTML=`<img src="${image.url}" alt="${snapshot.date}의 나만의 코디 공유 이미지"/>`;
    const link=document.querySelector('#share-download');link.href=image.url;link.download=image.filename;link.removeAttribute('aria-disabled');
    const share=document.querySelector('#share-native');
    const file=new File([image.blob],image.filename,{type:'image/png'});
    const supported=typeof navigator.canShare==='function' && navigator.canShare({files:[file]});
    share.disabled=false;share.innerHTML=`${icon(supported?'arrow-up-right':'smartphone')}${supported?'휴대폰 공유 메뉴 열기':'이미지 저장 후 공유하기'}`;hydrateIcons();
    share.addEventListener('click',async()=>{
      if(!supported){link.click();toast('이미지를 저장한 뒤 원하는 앱에 첨부해 주세요.');return;}
      try{await navigator.share({files:[file],title:'closer. 오늘의 코디',text:'날씨에 맞춰, 나답게 입은 하루.'});}
      catch(error){if(error.name!=='AbortError')toast('공유 메뉴를 열지 못했어요. PNG 이미지 저장을 이용해 주세요.');}
    });
    link.addEventListener('click',()=>toast('코디 이미지를 저장해요. 원하는 앱에 첨부해 주세요.'));
    const observer=new MutationObserver(()=>{if(!container.isConnected){URL.revokeObjectURL(image.url);observer.disconnect();}});
    observer.observe(modalRoot,{childList:true});
  }catch{if(container.isConnected)container.innerHTML='<p>이미지를 만들지 못했어요. 창을 닫고 다시 시도해 주세요.</p>';}
}

async function openCalibration(draft) {
  openModal(`<div class="modal-header"><span class="eyebrow">A LITTLE CHECK-IN</span><button class="icon-button" id="calibration-back" aria-label="설정으로 돌아가기">${icon('arrow-left')}</button></div><div class="modal-intro"><h2 id="modal-title">어제 날씨,<br>기억하시나요<span>?</span></h2><p>${e(draft.city.name)}의 어제 날씨를 가져오고 있어요.</p></div><div class="calibration-loading">${icon('cloud-sun')}어제의 하루를 준비하는 중…</div>` ,!state.settings.onboarded);
  document.querySelector('#calibration-back').addEventListener('click',()=>openSettings(draft));
  const marker=document.querySelector('.calibration-loading');
  try{
    const data=await fetchForecast(draft.city,AbortSignal.timeout(12000));
    if(!marker.isConnected)return;
    if(!data.yesterday)throw new Error('no yesterday');
    calibrationForm(draft,data.yesterday);
  }catch{
    if(!marker.isConnected)return;
    marker.innerHTML='<p>어제 날씨를 가져오지 못했어요.<br>실제 날씨가 필요해서 지금은 맞춤 보정을 잠시 건너뛸게요.</p><button class="secondary-button" id="calibration-retry">다시 시도</button><button class="primary-button" id="calibration-skip">설정으로 돌아가기</button>';
    document.querySelector('#calibration-retry').addEventListener('click',()=>openCalibration(draft));
    document.querySelector('#calibration-skip').addEventListener('click',()=>openSettings(draft));
  }
}

function calibrationForm(draft,day){
  let worn=normalizeOutfit(draft.calibration?.outfit||{layers:[],scarf:false});
  let period=draft.calibration?.period||'day';
  let showStack=false;
  let peekTop=0,peekBottom=0;
  const drawer={category:'top',fit:'all',settings:draft};
  function draw(){
    const cl=periodWeather(day,period),layers=outfitLayers(worn);
    openModal(`<div class="calibration-studio fashion-app"><header class="calibration-top"><button id="calibration-back" class="icon-button" aria-label="설정으로 돌아가기">${icon('arrow-left')}</button><h2 id="modal-title">어제, 어떻게 입었나요?</h2><button class="calibration-next" id="calibration-next" ${layers.length?'':'disabled'}>다음 ${icon('arrow-right')}</button></header><div class="calibration-context"><span>${e(draft.city.name)} · ${day.date}</span><div class="calibration-periods">${[['morning','아침'],['day','낮'],['evening','저녁'],['all','종일']].map(([id,name])=>`<button data-action="calibration-period" data-period="${id}" class="${period===id?'selected':''}">${name}</button>`).join('')}</div><strong>체감 ${cl.feels}°</strong></div><div class="calibration-workspace"><div class="look-scene ${layers.length?'':'waiting-for-clothes'}" id="calibration-canvas" tabindex="0" aria-label="어제 입었던 옷을 선택하는 캔버스"><div class="character-wrap">${character({...worn,peekTop,peekBottom},draft.gender,'good','calibration')}</div>${!layers.length?'<p class="empty-canvas-note">어제 입은 옷을 선택해 주세요.</p>':''}<div class="drop-zone-marker" data-drop-category="${drawer.category}"></div><div class="drop-guide">${icon('plus')}한 겹 더 입히기</div><div class="calibration-layer-count">상의 ${layerCount(worn)}겹 · 하의 ${outfitLayers(worn).filter(l=>l.category==='bottom').length}겹<button data-action="calibration-stack">${showStack?'접기':'입은 옷 보기'} ${icon('layers')}</button></div>${showStack?`<div class="calibration-stack-list">${layerStackMarkup(worn,true,icon)}</div>`:''}</div><aside class="fashion-shelf">${wardrobe(drawer,{icon},worn)}</aside></div><p class="calibration-footnote">같은 옷도 여러 번 놓을 수 있어요. 보이지 않는 이너도 한 겹으로 기록해요.</p></div>`,!state.settings.onboarded);
    modalRoot.querySelector('.modal').classList.add('calibration-shell');
    document.querySelector('#calibration-back').addEventListener('click',()=>{calibrationSession=null;openSettings(draft);});
    document.querySelector('#calibration-next').addEventListener('click',showFeeling);
    document.querySelector('#calibration-canvas').addEventListener('click',event=>{
      if(event.target.closest('button')||Date.now()-lastDragTime<300)return;
      const box=event.currentTarget.getBoundingClientRect();const lower=(event.clientY-box.top)/box.height>.57;
      const count=lower?outfitLayers(worn).filter(l=>l.category==='bottom').length:upperLayers(worn).length;
      if(count<2){showStack=!showStack;draw();return;}
      if(lower)peekBottom=(peekBottom+1)%count;else peekTop=(peekTop+1)%count;draw();animatePeek();
    });
    calibrationSession={
      canvas:()=>document.querySelector('#calibration-canvas'),
      reorder:(key,target,after)=>{worn=moveLayer(worn,key,target,after);peekTop=0;peekBottom=0;draw();},
      drop:(category,id)=>{worn=addLayer(worn,category,id);peekTop=category==='top'?outfitLayers(worn).filter(l=>l.category==='outer').length:0;peekBottom=0;draw();animatePeek();},
      action:(action,button)=>{
        if(action==='clear-category'){worn=addLayer(worn,button.dataset.category,'none');peekTop=0;peekBottom=0;}
        else if(action==='toggle-piece'){const category=button.dataset.category,id=button.dataset.id;const found=outfitLayers(worn).filter(l=>l.category===category&&l.id===id).at(-1);worn=found?removeLayer(worn,found.key):addLayer(worn,category,id);if(['hat','shoes'].includes(category)&&worn[category]===id&&button.classList.contains('selected'))worn[category]='none';}
        else if(action==='category'){drawer.category=button.dataset.category;drawer.fit='all';}
        else if(action==='fit')drawer.fit=button.dataset.fit;
        else if(action==='color')worn.colors={...worn.colors,[button.dataset.category]:button.dataset.color||null};
        else if(action==='remove-layer')worn=removeLayer(worn,button.dataset.key);
        else if(action==='reset-look')worn=normalizeOutfit({layers:[],scarf:false});
        else if(action==='accessory')worn[button.dataset.id]=!worn[button.dataset.id];
        else if(action==='calibration-period')period=button.dataset.period;
        else if(action==='calibration-stack')showStack=!showStack;
        else return;
        draw();
      }
    };
  }
  function showFeeling(){
    const cl=periodWeather(day,period);let feeling=null;
    openModal(`<div class="modal-header"><button class="icon-button" id="back-to-dressing" aria-label="어제 옷차림 수정">${icon('arrow-left')}</button><span class="eyebrow">${day.date} · 체감 ${cl.feels}°</span></div><div class="modal-intro"><h2 id="modal-title">그 옷차림으로,<br>어땠나요?</h2></div><div class="calibration-recap"><div class="recap-character">${character(worn,draft.gender,'good','recap')}</div><div>${layerStackMarkup(worn,false,icon)}<span class="recap-count">상의 ${layerCount(worn)} · 하의 ${outfitLayers(worn).filter(l=>l.category==='bottom').length}겹</span></div></div><div class="feeling-options">${[['cold','snowflake','추웠다'],['cool','snowflake','조금 추웠다'],['good','check','그냥 그랬다'],['warm','sun','조금 더웠다'],['hot','sun','더웠다']].map(([id,ic,name])=>`<button data-feeling="${id}" aria-pressed="false">${icon(ic)}<span>${name}</span></button>`).join('')}</div><button class="primary-button calibration-done" id="calibration-done" disabled>이 경험으로 추천 맞추기 ${icon('arrow-right')}</button>`,!state.settings.onboarded);
    document.querySelector('#back-to-dressing').addEventListener('click',draw);
    modalRoot.querySelectorAll('[data-feeling]').forEach(button=>button.addEventListener('click',()=>{feeling=button.dataset.feeling;modalRoot.querySelectorAll('[data-feeling]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelector('#calibration-done').disabled=false;}));
    document.querySelector('#calibration-done').addEventListener('click',()=>{
      const sensitivity=calibrationOffset(worn,cl.feels,feeling);
      calibrationSession=null;
      openSettings({...draft,sensitivity:Math.round(sensitivity*10)/10,calibration:{outfit:worn,feeling,date:day.date,feels:cl.feels,period}});
      toast('입었던 모든 겹과 그때의 느낌을 반영했어요. 설정을 저장해 주세요.');
    });
  }
  draw();
}

window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('closer.를 홈 화면에 담았어요. 내일도 만나요!'); });
render();
if (!state.settings.onboarded) {
  openModal(`<div class="welcome-intro"><p class="welcome-brand">closer closet</p><h2 id="modal-title">오늘 날씨에,<br>뭘 입으면 좋을까?</h2><p>기온만 보고 옷을 고르기는 어려우니까.<br>내 지역의 날씨와 내가 느끼는 추위에 맞춰,<br>어떤 옷을 몇 겹 입을지 함께 살펴봐요.</p><button class="primary-button" id="welcome-start">내 옷차림 알아보기 ${icon('arrow-right')}</button></div>`,true);
  document.querySelector('#welcome-start').addEventListener('click',()=>openSettings());
}

else loadWeather();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
