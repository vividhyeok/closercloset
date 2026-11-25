export const LOOKS=[
  {name:'겨울의 한 겹',top:'hoodie',outer:'puffer',bottom:'regular-slacks',hat:'beanie',scarf:true,note:'두꺼운 아우터 안에 후디를. 찬 바람에는 목도리도 함께.'},
  {name:'무심한 레이어',top:'knit',outer:'coat',bottom:'straight-denim',shoes:'loafers',note:'니트와 스트레이트 데님, 코트 하나면 충분한 날.'},
  {name:'조금 거칠게',top:'sweatshirt',outer:'leather',bottom:'regular-denim',shoes:'wallabee',note:'레더의 짧은 기장과 익숙한 레귤러 데님.'},
  {name:'가벼운 워크웨어',top:'tee',outer:'jacket',bottom:'tapered-chino',note:'바람은 재킷으로, 움직임은 가볍게.'},
  {name:'느슨한 오후',top:'tee',outer:'cardigan',bottom:'regular-slacks',shoes:'loafers',note:'얇은 티셔츠 위로 카디건을 걸쳐요.'},
  {name:'셔츠를 입는 날',top:'shirt',outer:'none',bottom:'straight-denim',shoes:'loafers',note:'힘을 빼고 입는 셔츠와 일자 데님.'},
  {name:'늘 입는 조합',top:'tee',outer:'none',bottom:'regular-denim',note:'티셔츠와 레귤러 진. 가장 편안한 나의 옷.'},
  {name:'낙서 같은 하루',top:'hoodie',outer:'none',bottom:'slacks',note:'후디에 와이드 팬츠. 여유가 필요한 날.'},
];

export function curatedLook(feels,sensitivity=0){
  const t=feels-Number(sensitivity)*3;
  const index=t<2?0:t<9?1:t<15?3:t<21?4:6;
  return {...LOOKS[index],lookId:index,lookName:LOOKS[index].name,thermal:t < -5,shoes:LOOKS[index].shoes||'sneakers'};
}

const maleBoxes=[[208,16,339,426],[153,19,313,416],[144,20,289,424],[140,19,282,415],[174,16,289,427],[168,25,286,425],[134,21,256,424],[121,20,277,426]];
const femaleBoxes=[[129,15,320,499],[110,20,304,500],[104,31,288,497],[93,25,247,500],[136,20,301,504],[139,24,275,503],[102,24,259,499],[71,22,260,500]];
export function lookArtwork(gender,index){
  const male=gender==='male';
  const [w,h]=male?[1774,887]:[1536,1024];
  const i=Math.max(0,Math.min(7,Number(index)));
  const [x1,y1,x2,y2]=(male?maleBoxes:femaleBoxes)[i];
  const x=Math.round((i%4)*w/4)+x1-9,y=Math.round(Math.floor(i/4)*h/2)+y1-7;
  return {src:`/art/doodle-${male?'male':'female'}-looks-v2.png`,size:[w,h],rect:[x,y,x2-x1+18,y2-y1+14]};
}

export function completeLookHTML(gender,index,label){
  const {src,size:[iw,ih],rect:[x,y,w,h]}=lookArtwork(gender,index);
  return `<div class="paper-doll fashion-character complete-look" role="img" aria-label="${label}" style="aspect-ratio:${w}/${h};width:auto;background-image:url('${src}');background-size:${iw/w*100}% ${ih/h*100}%;background-position:${x/(iw-w)*100}% ${y/(ih-h)*100}%;background-repeat:no-repeat"></div>`;
}

export function baseDoodleHTML(gender){
  const [x,y,w,h]=gender==='male'?[297,54,254,988]:[722,52,460,1010];
  return `<div class="paper-doll fashion-character complete-look" role="img" aria-label="${gender==='male'?'짧게 삐친 머리와 옆모습의 남성 낙서 캐릭터':'한쪽으로 기대 선 여성 낙서 캐릭터'}" style="aspect-ratio:${w}/${h};width:auto;background-image:url('/art/doodle-base-v3.png');background-size:${1466/w*100}% ${1073/h*100}%;background-position:${x/(1466-w)*100}% ${y/(1073-h)*100}%;background-repeat:no-repeat"></div>`;
}
