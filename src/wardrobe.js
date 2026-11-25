import { outfitLayers, countLayers } from './layers.js';

export const GARMENTS = {
  top: [
    { id:'thermal-top',name:'발열 이너',desc:'옷 안에 입는 얇은 보온 이너',warmth:3,color:'#c6bfb2',fit:'regular'},
    { id: 'tee', name: '코튼 반소매', desc: '가볍고 산뜻하게', warmth: 1, color: '#eee8db', icon: 'shirt' },
    { id: 'long', name: '롱슬리브', desc: '부드러운 기본 이너', warmth: 2, color: '#eee8db', icon: 'shirt' },
    { id: 'knit', name: '크루넥 니트', desc: '포근한 울 레이어', warmth: 4, color: '#d4c2a8', icon: 'shirt' },
    { id: 'hoodie', name: '오버핏 후디', desc: '여유 있는 실루엣', warmth: 4, color: '#a4aa91', icon: 'shirt' },
    { id: 'shirt', name: '옥스퍼드 셔츠', desc: '느슨한 셔츠 한 장', warmth: 2, color: '#b0bdba', icon: 'shirt' },
    { id: 'raglan', name: '배색 래글런', desc: '빈티지한 컬러 포인트', warmth: 2, color: '#ac6b61', icon: 'shirt' },
    { id: 'sweatshirt', name: '루즈 스웨트', desc: '편안한 데일리 코튼', warmth: 3, color: '#aaa99f', icon: 'shirt' },
  ],
  outer: [
    { id: 'none', name: '아우터 없이', desc: '가벼운 하루', warmth: 0, color: '#f5f5ef', icon: 'minus' },
    { id: 'cardigan', name: '니트 카디건', desc: '가볍게 걸쳐요', warmth: 3, color: '#a18b70', icon: 'shirt' },
    { id: 'jacket', name: '워크 재킷', desc: '바람을 막는 한 겹', warmth: 5, color: '#8a967c', icon: 'shirt' },
    { id: 'coat', name: '울 코트', desc: '차분하고 따뜻하게', warmth: 7, color: '#72695f', icon: 'shirt' },
    { id: 'puffer', name: '숏 패딩', desc: '찬 공기에도 든든하게', warmth: 10, color: '#87957c', icon: 'shirt' },
    { id: 'leather', name: '레더 블루종', desc: '짧은 기장, 여유 있는 핏', warmth: 5, color: '#4b4945', icon: 'shirt' },
    { id: 'quilted', name: '퀼팅 재킷', desc: '워크웨어의 포근함', warmth: 6, color: '#aaa375', icon: 'shirt',legacy:true },
  ],
  bottom: [
    { id:'regular-denim',name:'레귤러 데님',desc:'익숙한 기본 핏',warmth:3,color:'#75869c',fit:'regular'},
    { id:'straight-denim',name:'스트레이트 진',desc:'일자로 떨어지는 실루엣',warmth:3,color:'#91a1b4',fit:'straight'},
    { id:'tapered-chino',name:'테이퍼드 치노',desc:'밑단으로 갈수록 가볍게',warmth:3,color:'#aea68a',fit:'tapered'},
    { id:'regular-slacks',name:'레귤러 슬랙스',desc:'과하지 않은 테일러드 핏',warmth:2,color:'#555551',fit:'regular'},
    { id:'thermal-bottom',name:'하의 발열 이너',desc:'바지 안에 한 겹 더',warmth:2,color:'#777770',fit:'regular'},
    { id: 'shorts', name: '버뮤다 쇼츠', desc: '시원한 코튼 소재', warmth: 0, color: '#b8b5a4', icon: 'columns-2',fit:'regular' },
    { id: 'denim', name: '와이드 데님', desc: '어디에나 어울리는', warmth: 3, color: '#657c8a', icon: 'columns-2',fit:'wide',legacy:true },
    { id: 'slacks', name: '와이드 슬랙스', desc: '깔끔한 드레이프', warmth: 2, color: '#6a6964', icon: 'columns-2',fit:'wide' },
    { id: 'fleece', name: '기모 팬츠', desc: '다리까지 포근하게', warmth: 5, color: '#858270', icon: 'columns-2',fit:'straight' },
    { id: 'cargo', name: '벌룬 카고', desc: '입체적인 포켓과 볼륨', warmth: 3, color: '#666b5e', icon: 'columns-2',fit:'wide' },
    { id: 'chino', name: '와이드 치노', desc: '빈티지한 코튼 팬츠', warmth: 3, color: '#b1a88d', icon: 'columns-2',fit:'wide',legacy:true },
  ],
  shoes: [
    { id: 'sneakers', name: '로우 스니커즈', desc: '가벼운 데일리 슈즈', warmth: 0, color: '#efeee3' },
    { id: 'loafers', name: '레더 로퍼', desc: '느슨한 코디에 단정함', warmth: 0, color: '#454541' },
    { id: 'wallabee', name: '스웨이드 슈즈', desc: '부드러운 빈티지 무드', warmth: 0, color: '#a99a7e' },
  ],
  hat: [
    { id: 'none', name: '모자 없이', desc: '자연스럽게', warmth: 0, color: '#f5f5ef' },
    { id: 'cap', name: '볼 캡', desc: '가벼운 스타일 포인트', warmth: 0, color: '#8d5350' },
    { id: 'beanie', name: '니트 비니', desc: '찬 바람에 포근하게', warmth: 1, color: '#cb704b' },
  ],
};

export const PALETTE = [
  { name: '기본 컬러', color: null }, { name: '오프화이트', color: '#eee8db' },
  { name: '차콜', color: '#51524e' }, { name: '세이지', color: '#8a967c' },
  { name: '빈티지 블루', color: '#667e96' }, { name: '버건디', color: '#9b4c50' },
  { name: '코발트', color: '#4b69a6' }, { name: '샌드', color: '#baa98b' },
];
export const garmentColor = (outfit, category) => outfit.colors?.[category] || getGarment(category, outfit[category]).color;

export const getGarment = (category, id) => GARMENTS[category].find(g => g.id === id) || GARMENTS[category][0];
export const warmth = outfit => outfitLayers(outfit).reduce((total,l)=>total+getGarment(l.category,l.id).warmth,0)+(outfit.scarf?2:0)+(outfit.hat==='beanie'?1:0);
export const targetWarmth = (feels, sensitivity = 0) => Math.max(1, Math.min(24, (25 - feels) * 0.68 + Number(sensitivity) * 2));

export function recommend(feels, sensitivity = 0) {
  const adjusted = feels - Number(sensitivity) * 3;
  if (adjusted >= 26) return { top: 'tee', outer: 'none', bottom: 'shorts', scarf: false, thermal: false };
  if (adjusted >= 21) return { top: 'tee', outer: 'none', bottom: 'regular-denim', scarf: false, thermal: false };
  if (adjusted >= 17) return { top: 'long', outer: 'cardigan', bottom: 'regular-slacks', scarf: false, thermal: false };
  if (adjusted >= 12) return { top: 'long', outer: 'jacket', bottom: 'tapered-chino', scarf: false, thermal: false };
  if (adjusted >= 7) return { top: 'knit', outer: 'jacket', bottom: 'straight-denim', scarf: false, thermal: false };
  if (adjusted >= 2) return { top: 'knit', outer: 'coat', bottom: 'regular-denim', scarf: true, thermal: false };
  if (adjusted >= -5) return { top: 'knit', outer: 'puffer', bottom: 'fleece', scarf: false, thermal: false };
  return { top: 'hoodie', outer: 'puffer', bottom: 'fleece', scarf: true, thermal: true };
}

export function assess(outfit, feels, sensitivity = 0) {
  const diff = warmth(outfit) - targetWarmth(feels, sensitivity);
  if (diff < -3) return { mood: 'cold', label: '조금 추울 것 같아요', short: '한 겹 더, 포근하게', detail: '두꺼운 아우터나 이너를 더해 보세요. 목도리도 도움이 돼요.', score: Math.max(5, 50 + diff * 4) };
  if (diff > 4) return { mood: 'hot', label: '조금 더울 것 같아요', short: '한 겹 덜어도 좋아요', detail: '아우터를 가볍게 바꾸거나 이너를 한 겹 덜어 보세요.', score: Math.min(95, 50 + diff * 4) };
  return { mood: 'good', label: '이 정도면 딱 좋아요', short: '오늘도, 기분 좋은 외출', detail: '선택한 시간대의 체감온도와 잘 맞는 조합이에요.', score: 50 + diff * 3 };
}

export function layerCount(outfit) {
  return countLayers(outfit,'top');
}

export function outfitTitle(outfit) {
  if (outfit.outer === 'puffer') return '포근함을 한 겹 더.';
  if (outfit.outer === 'coat') return '찬 바람에도, 내 스타일대로.';
  if (['jacket','leather','quilted'].includes(outfit.outer)) return '가볍게 걸치고, 기분 좋게.';
  if (outfit.outer === 'cardigan') return '가벼운 레이어드가 좋은 날.';
  return '가볍게 입어도 충분한 날.';
}

export function calibrationOffset(outfit,feels,feeling){
  if(!Number.isFinite(feels)||!['cold','cool','good','warm','hot'].includes(feeling))throw new Error('체감온도와 느낌을 확인해 주세요.');
  const desired=warmth(outfit)+({cold:4,cool:2,good:0,warm:-2,hot:-4}[feeling]);
  return Math.round(Math.max(-3,Math.min(3,(desired-targetWarmth(feels,0))/2))*10)/10;
}
