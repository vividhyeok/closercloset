import catalog from '../public/art/catalog-front.json' with {type:'json'};
import {getGarment} from './wardrobe.js';
import {outfitLayers,upperLayers,lowerLayers} from './layers.js';
import {baseDoodleHTML} from './lookbook.js';

const colorFilters={
 '#eee8db':'saturate(.1) brightness(1.65)', '#51524e':'saturate(.1) brightness(.64)',
 '#8a967c':'sepia(.35) hue-rotate(25deg) saturate(.6)', '#667e96':'sepia(.4) hue-rotate(157deg) saturate(.7)',
 '#9b4c50':'sepia(.5) hue-rotate(305deg) saturate(1.3)', '#4b69a6':'sepia(.55) hue-rotate(170deg) saturate(1.6)',
 '#baa98b':'sepia(.45) saturate(.65) brightness(1.2)',
};
const art=(gender,id)=>catalog.garments[gender]?.[id];
const styleFor=({src,size:[iw,ih],rect:[x,y,w,h]})=>`background-image:url('${src}');background-size:${iw/w*100}% ${ih/h*100}%;background-position:${x/(iw-w)*100}% ${y/(ih-h)*100}%;background-repeat:no-repeat;`;

export function composeLayers(outfit,gender='female',mood='good'){
 const pose=catalog.poses[gender]||catalog.poses.female;
 const base={...catalog.base,rect:pose.rect};
 const layers=[];
 const selected=outfitLayers(outfit);
 const uppers=upperLayers(outfit),lowers=lowerLayers(outfit);
 const upper=uppers[Math.max(0,uppers.length-1-(outfit.peekTop||0))];
 const bottom=lowers[Math.max(0,lowers.length-1-(outfit.peekBottom||0))]?.id;
 const top=upper?.category==='top'?upper.id:null,outer=upper?.category==='outer'?upper.id:null;
 const customShoes=Boolean(catalog.footwear?.[gender]?.[outfit.shoes]);
 const coherentUpper=!upper||Boolean(art(gender,upper.id)?.includesHead);
 const lowerClip=customShoes?[[0,.48],[1,.48],[1,.925],[0,.925]]:[[0,.48],[1,.48],[1,1],[0,1]];
 const lowerBodyDest=[pose.dest[0],264+(pose.rect[1]-480)*256/450,pose.dest[2],pose.rect[3]*256/450];
 function basePart(id,rect,sourcePolygon){const[bx,by,bw,bh]=pose.rect,[dx,dy,dw,dh]=pose.dest,[x,y,w,h]=rect;layers.push({id,image:{...catalog.base,rect},dest:[dx+(x-bx)/bw*dw,dy+(y-by)/bh*dh,w/bw*dw,h/bh*dh],...(sourcePolygon?{clip:sourcePolygon.map(p=>[(p[0]-x)/w,(p[1]-y)/h])}:{})});}
 if(!upper&&!bottom)layers.push({id:'base',image:base,dest:pose.dest,clipWorld:[[0,105],[400,105],[400,customShoes?510:600],[0,customShoes?510:600]]});
 else{
   if(!bottom||bottom==='shorts')layers.push({id:'body-lower',image:base,dest:lowerBodyDest,clip:lowerClip,opacity:bottom?1:.25});
   else if(!customShoes){
     if(gender==='male')basePart('base-shoe',[303,970,176,67]);
     else{basePart('base-shoe-left',[729,955,177,93]);basePart('base-shoe-right',[970,993,111,62]);}
   }
   if(!coherentUpper)basePart('head',pose.head);
   if(!coherentUpper&&(top==='tee'||!upper)){
     if(gender==='male')basePart('arm',[345,344,170,215],[[451,344],[508,352],[504,395],[481,438],[451,482],[434,514],[419,544],[392,540],[382,520],[407,474],[427,432],[442,391]]);
     else{
       basePart('arm-left',[865,330,94,315],[[925,337],[950,345],[937,408],[918,468],[907,513],[905,548],[896,586],[883,624],[871,625],[867,600],[876,551],[885,493],[900,431],[915,366]]);
       basePart('arm-right',[1018,337,151,220],[[1135,340],[1164,350],[1150,411],[1129,450],[1100,489],[1083,530],[1048,554],[1025,539],[1044,504],[1056,474],[1084,440],[1107,400],[1119,355]]);
     }
   }
   if(!upper)add('tee','base-upper',pose.top,{opacity:.25});
 }
 function addBaseTop(){basePart('base-top',gender==='male'?[341,225,203,290]:[881,235,289,290]);}
 function add(id,category,dest,options={}){
   const image=art(gender,id);if(!image)return;
   const layer={id:category,image,dest:image.dest||dest,color:outfit.colors?.[category],...(image.includesHead?{clipWorld:[[0,105],[400,105],[400,600],[0,600]]}:{}),...options};layers.push(layer);
   if(layer.color&&image.preserveColor)layers.push({...layer,id:'natural-skin',color:null,clipPolygons:image.preserveColor});
 }
 if(bottom)add(bottom,'bottom',bottom==='shorts'?pose.shorts:pose.bottom);
 const under=upper?uppers.slice(0,uppers.indexOf(upper)):[];
 const visibleHem=upper?art(gender,upper.id)?.hem:null;
 if(visibleHem)for(const inner of under){
   const image=art(gender,inner.id);
   if(image?.hem>visibleHem+3)add(inner.id,'exposed-hem',pose.sleeved,{clipWorld:[[0,visibleHem],[400,visibleHem],[400,600],[0,600]],color:outfit.colors?.[inner.category]});
 }
 if(top)add(top,'visible-upper',top==='tee'?pose.top:pose.sleeved,{color:outfit.colors?.top});
 if(outer&&outer!=='none'){
   const inner=uppers.slice(0,uppers.indexOf(upper)).at(-1);
   const dest=outer==='coat'?pose.coat:pose.outer;
   for(const hidden of under){const innerDest=hidden.category==='outer'?(hidden.id==='coat'?pose.coat:pose.outer):(hidden.id==='tee'?pose.top:pose.sleeved);add(hidden.id,'inner',innerDest,{clipWorld:pose.bodyClip,color:outfit.colors?.[hidden.category]});}
   add(outer,'visible-upper',dest,{hole:art(gender,outer)?.opening,color:outfit.colors?.outer});
   const outerArt=art(gender,outer),neckFill=under.filter(l=>l.category==='top').at(-1)||inner;
   if(neckFill&&outerArt?.preserveColor){const [ox,oy,ow,oh]=outerArt.dest;for(const poly of outerArt.preserveColor.slice(1)){const avg=poly.reduce((n,p)=>n+p[1],0)/poly.length;if(avg<.6)add(neckFill.id,'inner-neckline',pose.sleeved,{clipWorld:poly.map(p=>[ox+p[0]*ow,oy+p[1]*oh]),color:outfit.colors?.[neckFill.category]});}}
 }
 if(upper?.id!=='hoodie'&&under.some(l=>l.id==='hoodie'))layers.push({id:'exposed-hood',image:catalog.hoods[gender],dest:[gender==='male'?158:163,103,100,80],color:outfit.colors?.top});
 if(outfit.scarf)add('scarf','accessory',pose.scarf);
 if(outfit.hat&&outfit.hat!=='none')add(outfit.hat,'hat',pose.hat);
 if(customShoes)catalog.footwear[gender][outfit.shoes].forEach((image,i)=>{
   const bareLegs=false;
   const box=gender==='female'&&bareLegs?(i?[221,538,62,51]:[57,522,100,53]):i?pose.shoeRight:pose.shoeLeft,[x,y,w,h]=box;
   const scale=Math.min(w/image.rect[2],h/image.rect[3]);
   const sw=image.rect[2]*scale,sh=image.rect[3]*scale;
   // Heel is registered to the ankle. Preserve the full source aspect ratio.
   const dest=[i?x+(w-sw)/2:x+w-sw,y+h-sh,sw,sh];
   layers.push({id:i?'shoe-right':'shoe-left',image,dest,color:outfit.colors?.shoes});
 });
 const expression=catalog.expressions[gender][mood]||catalog.expressions[gender].good;
 layers.push({id:'expression',image:expression,dest:expression.dest,clipWorld:[[0,0],[400,0],[400,105],[gender==='male'?223:228,105],[gender==='male'?219:224,120],[gender==='male'?197:202,120],[gender==='male'?193:198,105],[0,105]]});
 const feet=layers.filter(l=>l.id.startsWith('shoe-'));
 const rest=layers.filter(l=>!l.id.startsWith('shoe-'));
 const trouserIndex=rest.findIndex(l=>l.id==='bottom');
 if(trouserIndex>=0)rest.splice(trouserIndex,0,...feet);else rest.push(...feet);
 return rest;
}

export function character(outfit,gender='female',mood='good',uid='look'){
 
 const names=outfitLayers(outfit).map(l=>getGarment(l.category,l.id).name).join(', ');
 const definitions=[];
 const markup=composeLayers(outfit,gender,mood).map((l,i)=>{
   const[x,y,w,h]=l.dest;let clip='';
   if(l.clip)clip=`clip-path:polygon(${l.clip.map(p=>`${p[0]*100}% ${p[1]*100}%`).join(',')});`;
   if(l.clipWorld)clip=`clip-path:polygon(${l.clipWorld.map(p=>`${(p[0]-x)/w*100}% ${(p[1]-y)/h*100}%`).join(',')});`;
   if(l.hole){const id=`hole-${uid.replace(/[^a-z0-9-]/gi,'')}-${i}`;definitions.push(`<clipPath id="${id}" clipPathUnits="objectBoundingBox"><path clip-rule="evenodd" fill-rule="evenodd" d="M0 0H1V1H0Z M${l.hole.map(p=>p.join(' ')).join('L')}Z"/></clipPath>`);clip=`clip-path:url(#${id});`;}
   let bitmapStyle=`${styleFor(l.image)}${l.color?`filter:${colorFilters[l.color]||'none'};`:''}`;
   if(l.clipPolygons){const id=`skin-${uid.replace(/[^a-z0-9-]/gi,'')}-${i}`;definitions.push(`<clipPath id="${id}" clipPathUnits="objectBoundingBox">${l.clipPolygons.map(p=>`<path d="M${p.map(q=>q.join(' ')).join('L')}Z"/>`).join('')}</clipPath>`);return `<span class="doll-layer doodle-${l.id}" style="left:${x/4}%;top:${y/6}%;width:${w/4}%;height:${h/6}%;${clip}"><span style="position:absolute;inset:0;${bitmapStyle}clip-path:url(#${id});"></span></span>`;}
   return `<span class="doll-layer doodle-${l.id}" style="left:${x/4}%;top:${y/6}%;width:${w/4}%;height:${h/6}%;${bitmapStyle}${clip}${l.opacity?`opacity:${l.opacity};`:''}"></span>`;
 }).join('');
 return `<div class="paper-doll fashion-character doodle-character" role="img" aria-label="${gender==='male'?'남성':'여성'} 정면 낙서 캐릭터, ${names||'옷을 입히기 전'}" data-mood="${mood}" data-doll-id="${uid}"><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${definitions.join('')}</defs></svg>${markup}${mood==='cold'?'<span class="climate-effects cold" aria-hidden="true"><i class="breath"></i><i class="shiver one"></i><i class="shiver two"></i></span>':mood==='hot'?'<span class="climate-effects hot" aria-hidden="true"><i class="sweat one"></i><i class="sweat two"></i><i class="heat"></i></span>':''}</div>`;
}

export function garmentDrawing(category,id,color,gender='female'){
 if(id==='none')return '<span class="empty-garment" aria-hidden="true">—</span>';
 const original=art(gender,id),image=original?.thumbnail||original;
 if(!image)return '<span class="empty-garment">—</span>';
 const ratio=image.rect[2]/image.rect[3];
 return `<span class="raster-garment" aria-hidden="true"><span style="width:${Math.min(100,ratio*100)}%;height:${Math.min(100,100/ratio)}%;${styleFor(image)}${color?`filter:${colorFilters[color]||'none'};`:''}"></span></span>`;
}

const images=new Map();
export function loadAtlas(src){
 if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(src);reject(new Error(`이미지를 읽지 못했어요: ${src}`));};image.src=src;}));
 return images.get(src);
}

export async function drawDoll(ctx,outfit,gender,mood,x,y,w,h){
 const layers=composeLayers(outfit,gender,mood);
 await Promise.all([...new Set(layers.map(l=>l.image.src))].map(loadAtlas));
 for(const l of layers){const[dx,dy,dw,dh]=l.dest;ctx.save();
   if(l.clip||l.clipWorld){const points=l.clipWorld||l.clip.map(p=>[dx+p[0]*dw,dy+p[1]*dh]);ctx.beginPath();points.forEach((p,i)=>{const xx=x+p[0]/400*w,yy=y+p[1]/600*h;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.closePath();ctx.clip();}
   if(l.hole){ctx.beginPath();ctx.rect(x+dx/400*w,y+dy/600*h,dw/400*w,dh/600*h);l.hole.forEach((p,i)=>{const xx=x+(dx+p[0]*dw)/400*w,yy=y+(dy+p[1]*dh)/600*h;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.closePath();ctx.clip('evenodd');}
   if(l.clipPolygons){ctx.beginPath();for(const points of l.clipPolygons){points.forEach((p,i)=>{const xx=x+(dx+p[0]*dw)/400*w,yy=y+(dy+p[1]*dh)/600*h;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.closePath();}ctx.clip();}
   if(l.opacity)ctx.globalAlpha=l.opacity;ctx.filter=l.color?colorFilters[l.color]||'none':'none';ctx.drawImage(await loadAtlas(l.image.src),...l.image.rect,x+dx/400*w,y+dy/600*h,dw/400*w,dh/600*h);ctx.restore();}
}
