export const LOOKS = [
  { name: '겨울의 한 겹', top: 'hoodie', outer: 'puffer', bottom: 'regular-slacks', hat: 'beanie', scarf: true, note: '두꺼운 아우터 안에 후디를. 찬 바람에는 목도리도 함께.' },
  { name: '무심한 레이어', top: 'knit', outer: 'coat', bottom: 'straight-denim', shoes: 'loafers', note: '니트와 스트레이트 데님, 코트 하나면 충분한 날.' },
  { name: '조금 거칠게', top: 'sweatshirt', outer: 'leather', bottom: 'regular-denim', shoes: 'wallabee', note: '레더의 짧은 기장과 익숙한 레귤러 데님.' },
  { name: '가벼운 워크웨어', top: 'tee', outer: 'jacket', bottom: 'tapered-chino', note: '바람은 재킷으로, 움직임은 가볍게.' },
  { name: '느슨한 오후', top: 'tee', outer: 'cardigan', bottom: 'regular-slacks', shoes: 'loafers', note: '얇은 티셔츠 위로 카디건을 걸쳐요.' },
  { name: '셔츠를 입는 날', top: 'shirt', outer: 'none', bottom: 'straight-denim', shoes: 'loafers', note: '힘을 빼고 입는 셔츠와 일자 데님.' },
  { name: '늘 입는 조합', top: 'tee', outer: 'none', bottom: 'regular-denim', note: '티셔츠와 레귤러 진. 가장 편안한 나의 옷.' },
  { name: '낙서 같은 하루', top: 'hoodie', outer: 'none', bottom: 'slacks', note: '후디에 와이드 팬츠. 여유가 필요한 날.' },
];

export function curatedLook(feels, sensitivity = 0) {
  const t = feels - Number(sensitivity) * 3;
  const index = t < 2 ? 0 : t < 9 ? 1 : t < 15 ? 3 : t < 21 ? 4 : 6;
  return {
    ...LOOKS[index],
    lookId: index,
    lookName: LOOKS[index].name,
    thermal: t < -5,
    shoes: LOOKS[index].shoes || 'sneakers',
  };
}
