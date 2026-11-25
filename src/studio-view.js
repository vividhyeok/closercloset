import { GARMENTS, PALETTE, getGarment, layerCount } from './wardrobe.js';
import { character, garmentDrawing } from './paper-doll.js';
import { weatherInfo } from './weather.js';
import { outfitLayers,countLayers,upperLayers,lowerLayers } from './layers.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelDate = (date,options) => new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR',options);
const categories={outer:'아우터',top:'상의',bottom:'하의',shoes:'신발',hat:'모자'};
const fits={all:'전체',regular:'레귤러',straight:'스트레이트',tapered:'테이퍼드',wide:'와이드'};

export function studioShell(state,api){
  const {icon,savedPage}=api;
  return `<div class="fashion-app ${state.mode==='edit'?'in-studio':'in-lookbook'} ${state.page==='saved'?'on-saved':''}">
    <header class="fashion-header"><a href="#" class="fashion-wordmark" data-action="home" aria-label="Closer Closet 홈">closer<span class="closet-word">closet</span></a>
      <nav class="fashion-navigation" aria-label="주 메뉴"><button data-action="mode" data-mode="quick" class="${state.mode==='quick'&&state.page==='home'?'selected':''}">오늘의 코디</button><button data-action="mode" data-mode="edit" class="${state.mode==='edit'&&state.page==='home'?'selected':''}">옷 입히기</button><button data-action="page" data-page="saved" class="${state.page==='saved'?'selected':''}">내 옷장${state.looks.length?`<small>${state.looks.length}</small>`:''}</button></nav>
      <div class="fashion-header-actions"><button class="fashion-location" data-action="settings">${icon('map-pin')}<span>${escape(state.settings.city.name)}</span></button><button class="icon-button" data-action="settings" aria-label="설정">${icon('settings-2')}</button></div>
    </header>
    <main class="fashion-main">${state.page==='saved'?savedPage():workspace(state,api)}</main>
  </div>`;
}

function workspace(state,api){
  const {icon,current,climate,outfit,assessment,isSaved}=api;
  const day=current(),cl=climate(),look=outfit(),result=assessment(),weather=weatherInfo(day.code);
  const studio=state.mode==='edit';
  const status={loading:'예보 연결 중',live:'예보 업데이트',cached:'저장된 예보',demo:'예시 날씨'}[state.source];
  return `<div class="fashion-datebar"><div class="date-context"><button data-action="date-picker" aria-label="날짜 직접 선택">${labelDate(day.date,{month:'long'})}${icon('chevron-down')}</button><input id="date-input" type="date" value="${day.date}" min="${state.days[0].date}" max="${state.days.at(-1).date}" aria-label="이동할 날짜"/></div><div class="date-rail" role="tablist" aria-label="예보 날짜">${state.days.map((d,i)=>`<button id="date-${i}" role="tab" aria-selected="${i===state.index}" aria-controls="daily-look" tabindex="${i===state.index?0:-1}" class="date-tab ${i===state.index?'selected':''}" data-action="date" data-index="${i}"><span>${i===0?'오늘':i===1?'내일':labelDate(d.date,{weekday:'short'})}</span><b>${new Date(`${d.date}T12:00:00`).getDate()}</b></button>`).join('')}</div><button data-action="today" class="back-today">오늘</button></div>
  ${state.source==='demo'?`<div class="forecast-notice" role="status"><span>${state.demo?'예시 날씨로 둘러보고 있어요.':'예보에 연결하지 못해 예시 날씨를 표시하고 있어요.'}</span><button data-action="refresh">실제 예보 연결 ${icon('rotate-ccw')}</button></div>`:''}
  <section id="daily-look" class="fashion-workspace" role="tabpanel" aria-labelledby="date-${state.index}">
    <div class="look-scene ${!outfitLayers(look).length?'empty-outfit':''}" id="swipe-scene" tabindex="0" aria-label="${studio?'옷을 선택해 입히는 코디 캔버스':'좌우로 넘기는 코디 룩북'}">
      <div class="canvas-weather"><div>${icon(weather.icon)}<strong>${cl.temp}°</strong></div><span>${weather.label} <i>체감 ${cl.feels}°</i></span><small>${Math.round(day.min)}° — ${Math.round(day.max)}°</small></div>
      <div class="canvas-actions"><button class="icon-button ${isSaved()?'saved':''}" data-action="save" aria-label="${isSaved()?'저장된 코디':'코디 저장'}">${icon('bookmark')}</button><button class="icon-button" data-action="share" aria-label="코디 공유">${icon('arrow-up-right')}</button></div>
      <div class="character-wrap">${character(studio?{...look,peekTop:state.peekTop,peekBottom:state.peekBottom}:look,state.settings.gender,result.mood,'main')}</div>
      ${studio&&(state.peekTop||state.peekBottom)?`<button class="peek-label" data-action="peek-reset">${peekName(look,state.peekTop,state.peekBottom)} ${icon('rotate-ccw')} 겉옷 보기</button>`:studio&&!outfitLayers(look).length?'<span class="empty-canvas-note">옷을 끌어다 놓아주세요.</span>':studio&&(upperLayers(look).length>1||countLayers(look,'bottom')>1)?'<span class="canvas-tap-hint">옷을 탭하면 안쪽 겹을 볼 수 있어요.</span>':''}
      <div class="drop-zone-marker" data-drop-category="${state.category}" aria-hidden="true"></div><div class="drop-guide">${icon('plus')}<span>놓으면 입혀져요</span></div>
      <div class="canvas-bottom"><div class="layer-info ${state.partsOpen?'open':''}"><button class="layer-label" data-action="parts" aria-expanded="${state.partsOpen}" aria-controls="parts-popover">${icon('layers')}상의 ${layerCount(look)} · 하의 ${countLayers(look,'bottom')}겹</button><div class="parts-popover" id="parts-popover"><h3>안쪽부터, 한 겹씩</h3>${layerStackMarkup(look,studio,icon)}${look.scarf?'<p>머플러</p>':''}</div></div><span class="canvas-comfort ${result.mood}"><i></i>${result.label}</span></div>
      ${!studio?`<button class="scene-arrow scene-prev" data-action="prev" aria-label="이전 날 코디" ${state.index===0?'disabled':''}>${icon('chevron-left')}</button><button class="scene-arrow scene-next" data-action="next" aria-label="다음 날 코디" ${state.index===state.days.length-1?'disabled':''}>${icon('chevron-right')}</button>`:''}
      <span class="canvas-caption">${studio?'STYLING ROOM':`${labelDate(day.date,{month:'numeric',day:'numeric'})} / DAILY LOOK`}</span>
    </div>
    <aside class="fashion-shelf">${studio?wardrobe(state,api,look):quickDetails(state,api,look)}
      <div class="shelf-footer"><button data-action="refresh" class="source-label"><i class="${state.source}"></i>${status}${icon('rotate-ccw')}</button><button data-action="weather-details" class="weather-more">상세 날씨 ${icon('chevron-down')}</button></div>
    </aside>
  </section>`;
}

export function wardrobe(state,api,look){
  const {icon}=api;
  const category=state.category;
  const equipped=id=>['top','outer','bottom'].includes(category)?outfitLayers(look).some(l=>l.category===category&&l.id===id):look[category]===id;
  const items=GARMENTS[category].filter(item=>!item.legacy&&(category!=='bottom'||state.fit==='all'||(item.fit||'wide')===state.fit));
  return `<div class="shelf-heading"><div><h1>나의 옷장</h1><p>눌러서 입히고 벗겨요.</p></div><button class="icon-button" data-action="reset-look" aria-label="입힌 옷 모두 비우기">${icon('rotate-ccw')}</button></div>
    <div class="wardrobe-tabs" role="tablist" aria-label="의류 종류">${Object.entries(categories).map(([id,name])=>`<button role="tab" aria-selected="${category===id}" data-action="category" data-category="${id}" class="${category===id?'selected':''}">${name}</button>`).join('')}<button class="category-clear" data-action="clear-category" data-category="${category}" aria-label="${categories[category]} 모두 벗기기">${icon('minus')}</button></div>
    ${category==='bottom'?`<div class="fit-filters" aria-label="바지 핏">${Object.entries(fits).map(([id,name])=>`<button data-action="fit" data-fit="${id}" aria-pressed="${state.fit===id}" class="${state.fit===id?'selected':''}">${name}</button>`).join('')}</div>`:''}
    <div class="wardrobe-drawer" aria-label="입히거나 벗길 의류">${items.map(item=>`<div role="button" tabindex="0" class="wardrobe-piece ${equipped(item.id)?'selected':''}" data-draggable="true" aria-pressed="${equipped(item.id)}" data-category="${category}" data-id="${item.id}" aria-label="${item.name}, 눌러서 입히거나 벗기기."><div class="piece-art">${garmentDrawing(category,item.id,undefined,state.settings?.gender||'female')}</div><div class="piece-caption"><span>${item.name}</span><small>${equipped(item.id)?'입는 중 · 눌러서 벗기기':item.profile?.label||(item.fit?fits[item.fit]||item.fit:'')}</small></div></div>`).join('')}${!items.length?'<p class="no-items">이 핏의 옷은 준비 중이에요.</p>':''}</div>
    <div class="wardrobe-options"><details class="extras-disclosure"><summary>소품 ${icon('plus')}</summary><div class="accessory-options"><button data-action="accessory" data-id="scarf" aria-pressed="${!!look.scarf}" class="${look.scarf?'selected':''}">${icon(look.scarf?'check':'plus')}머플러</button></div></details><div class="color-options" aria-label="의류 색상">${PALETTE.map(p=>`<button class="palette-color ${look.colors?.[category]===p.color||(!look.colors?.[category]&&!p.color)?'selected':''}" style="--swatch:${p.color||getGarment(category,look[category]).color}" data-action="color" data-category="${category}" data-color="${p.color||''}" aria-label="${p.name}"></button>`).join('')}</div></div>`;
}

export function layerStackMarkup(look,editable,icon){
  return [...upperLayers(look),...lowerLayers(look)].map((l,i)=>`<div class="stack-row" data-layer-key="${l.key}" data-layer-region="${l.category==='bottom'?'bottom':'upper'}">${editable?`<button class="layer-reorder-handle" aria-label="${getGarment(l.category,l.id).name} 순서 바꾸기" data-reorder-key="${l.key}">↕</button>`:''}<span class="stack-number">${l.category==='bottom'?'하의':i+1}</span><span>${getGarment(l.category,l.id).name}</span>${editable?`<button data-action="remove-layer" data-key="${l.key}" aria-label="${getGarment(l.category,l.id).name} ${i+1}번째 겹 벗기기">${icon('x')}</button>`:''}</div>`).join('')||'<p class="empty-stack">아직 입힌 옷이 없어요.</p>';
}

function peekName(look,upper,lower){const list=upper?upperLayers(look):lowerLayers(look);const l=list[Math.max(0,list.length-1-(upper||lower))];return l?`${getGarment(l.category,l.id).name} · 안쪽 겹`:'';}

function quickDetails(state,api,look){
  const {icon}=api;
  return `<div class="quick-details"><span class="look-counter">LOOK ${String(state.index+1).padStart(2,'0')}</span><div class="quick-garments">${['outer','top','bottom'].filter(c=>c!=='outer'||look.outer!=='none').map(c=>`<div><span>${{outer:'아우터',top:'상의',bottom:'하의'}[c]}</span><strong>${getGarment(c,look[c]).name}</strong></div>`).join('')}</div><p class="quick-note">${look.note||'한 겹씩, 오늘의 날씨에 맞춰 입어요.'}</p><div class="period-switch" role="group" aria-label="외출 시간">${[['morning','아침'],['day','낮'],['evening','저녁'],['all','종일']].map(([id,name])=>`<button data-action="period" data-period="${id}" class="${state.period===id?'active':''}" aria-pressed="${state.period===id}">${name}</button>`).join('')}</div><button class="primary-button customize-look" data-action="mode" data-mode="edit">이 코디로 입혀보기 ${icon('arrow-up-right')}</button></div>`;
}
