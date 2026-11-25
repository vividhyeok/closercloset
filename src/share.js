import { drawDoll } from './paper-doll.js';
import { getGarment, layerCount } from './wardrobe.js';

export async function createLookImage({outfit,gender,date,feels,city,source}) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width=1080;canvas.height=1920;
  const ctx = canvas.getContext('2d');
  const font = '"Noto Sans KR",sans-serif';
  ctx.fillStyle='#f5f6ee';ctx.fillRect(0,0,1080,1920);
  ctx.fillStyle='#30392e';ctx.font='bold 112px "DM Sans",sans-serif';ctx.fillText('closer',82,161);
  ctx.fillStyle='#e96d45';ctx.fillText('.',410,161);
  ctx.fillStyle='#889777';ctx.font=`23px ${font}`;ctx.fillText('날씨와 옷 사이, 오늘의 나.',86,215);
  ctx.strokeStyle='#dce2d1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(85,255);ctx.lineTo(995,255);ctx.stroke();
  ctx.fillStyle='#939f85';ctx.font=`23px ${font}`;ctx.fillText(`${date}  ·  ${city}`,85,315);
  ctx.font='500 68px "DM Sans",sans-serif';ctx.fillStyle='#596d49';ctx.fillText(`${feels}°`,85,402);
  ctx.font=`20px ${font}`;ctx.fillStyle='#96a088';ctx.fillText('체감온도',185,400);
  ctx.fillStyle='#e9eddf';ctx.beginPath();ctx.ellipse(570,880,365,420,0,0,Math.PI*2);ctx.fill();
  await drawDoll(ctx,outfit,gender,'good',140,375,800,1200);
  ctx.fillStyle='#859573';ctx.font='20px "DM Sans",sans-serif';ctx.fillText('MY DAILY OUTFIT',85,1595);
  ctx.fillStyle='#384730';ctx.font=`500 40px ${font}`;ctx.fillText(`나답게 입은 하루.`,85,1662);
  ctx.font=`23px ${font}`;ctx.fillStyle='#8e9b80';
  const labels = ['outer','top','bottom'].filter(c => c !== 'outer' || outfit.outer !== 'none').map(c => getGarment(c,outfit[c]).name);
  ctx.fillText(labels.join('  ·  '),85,1722);
  ctx.font=`21px ${font}`;ctx.fillText(`상의 ${layerCount(outfit)}겹${outfit.thermal ? ' · 발열 이너 포함' : ''}${outfit.scarf ? ' · 울 머플러' : ''}`,85,1767);
  ctx.strokeStyle='#dce2d1';ctx.beginPath();ctx.moveTo(85,1810);ctx.lineTo(995,1810);ctx.stroke();
  ctx.font='18px "DM Sans",sans-serif';ctx.fillStyle='#a1ad93';ctx.fillText(source === 'demo' ? 'SAMPLE WEATHER · STYLED WITH CLOSER.' : 'A LITTLE WEATHER, A LITTLE STYLE.',85,1860);
  const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('이미지를 만들지 못했어요.');
  return {blob,url:URL.createObjectURL(blob),filename:`closer-look-${date}.png`};
}
