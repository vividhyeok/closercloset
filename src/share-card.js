import {drawDoll} from './paper-doll.js';
import {getGarment} from './wardrobe.js';
import {outfitLayers,countLayers} from './layers.js';

function lines(ctx,text,width){const result=[];let line='';for(const word of text.split(' · ')){const trial=line?`${line} · ${word}`:word;if(ctx.measureText(trial).width>width&&line){result.push(line);line=word;}else line=trial;}if(line)result.push(line);return result;}
export async function createLookImage({outfit,gender,date,feels,city,source}){
  await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2000))]);
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d');
  const font='"Noto Sans KR",sans-serif';ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,1080,1920);
  ctx.fillStyle='#252622';ctx.font='750 108px "DM Sans",sans-serif';ctx.fillText('closer',80,153);
  ctx.font='21px "DM Sans",sans-serif';ctx.fillStyle='#939580';ctx.fillText(`${date.replaceAll('-','.')} / MY LOOK`,85,221);
  ctx.fillStyle='#efeee8';ctx.fillRect(55,276,970,1240);
  ctx.fillStyle='#5f6952';ctx.font='500 62px "DM Sans",sans-serif';ctx.fillText(`${feels}°`,94,380);
  ctx.font=`24px ${font}`;ctx.fillStyle='#929b82';ctx.fillText(city,96,430);
  await drawDoll(ctx,{...outfit,peekTop:0,peekBottom:0},gender,'good',145,300,790,1185);
  ctx.fillStyle='#58674a';ctx.font=`500 31px ${font}`;ctx.fillText(`상의 ${countLayers(outfit,'top')}겹 · 하의 ${countLayers(outfit,'bottom')}겹`,84,1600);
  ctx.fillStyle='#8d987e';ctx.font=`24px ${font}`;
  const text=outfitLayers(outfit).map(l=>getGarment(l.category,l.id).name).join(' · ');
  lines(ctx,text,910).slice(0,4).forEach((line,i)=>ctx.fillText(line,84,1661+i*42));
  if(outfit.scarf)ctx.fillText('+ 머플러',84,1840);
  ctx.fillStyle='#a8ad99';ctx.font='18px "DM Sans",sans-serif';ctx.fillText(source==='demo'?'SAMPLE WEATHER / CLOSER.':'STYLED WITH CLOSER.',84,1880);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('이미지를 만들지 못했어요.');
  return {blob,url:URL.createObjectURL(blob),filename:`closer-look-${date}.png`};
}
