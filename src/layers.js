let sequence=0;
const layer=(category,id)=>({key:`layer-${Date.now()}-${++sequence}`,category,id});

export function outfitLayers(outfit){
  if(Array.isArray(outfit.layers))return outfit.layers;
  const list=[];
  if(outfit.thermal)list.push(layer('top','thermal-top'));
  if(outfit.top&&outfit.top!=='none')list.push(layer('top',outfit.top));
  if(outfit.shirtLayer)list.push(layer('top','shirt'));
  if(outfit.outer&&outfit.outer!=='none')list.push(layer('outer',outfit.outer));
  if(outfit.bottom&&outfit.bottom!=='none')list.push(layer('bottom',outfit.bottom));
  return list;
}

export function normalizeOutfit(outfit){
  const layers=outfitLayers(outfit);
  const last=(category,exclude=[])=>layers.filter(l=>l.category===category&&!exclude.includes(l.id)).at(-1)?.id;
  return {...outfit,layers,top:last('top',['thermal-top'])||'tee',outer:last('outer')||'none',bottom:last('bottom',['thermal-bottom'])||'regular-denim',thermal:layers.some(l=>l.id==='thermal-top'),shirtLayer:false};
}

export function addLayer(outfit,category,id){
  const {lookId,...parts}=outfit;outfit=parts;
  if(!['top','outer','bottom'].includes(category))return {...normalizeOutfit(outfit),[category]:id};
  const layers=[...outfitLayers(outfit)];
  if(id==='none')return normalizeOutfit({...outfit,layers:layers.filter(l=>l.category!==category)});
  const next=layer(category,id);
  const before=category==='top'?(id==='thermal-top'?layers.findIndex(l=>['top','outer'].includes(l.category)):layers.findIndex(l=>l.category==='outer')):category==='bottom'&&id==='thermal-bottom'?layers.findIndex(l=>l.category==='bottom'):-1;
  if(before>=0)layers.splice(before,0,next);else layers.push(next);
  return normalizeOutfit({...outfit,layers});
}

export function removeLayer(outfit,key){
  return normalizeOutfit({...outfit,layers:outfitLayers(outfit).filter(l=>l.key!==key)});
}

export function countLayers(outfit,region='top'){
  return outfitLayers(outfit).filter(l=>region==='top'?['top','outer'].includes(l.category):l.category==='bottom').length;
}

export const upperLayers=outfit=>outfitLayers(outfit).filter(l=>['top','outer'].includes(l.category));
export const lowerLayers=outfit=>outfitLayers(outfit).filter(l=>l.category==='bottom');
export function moveLayer(outfit,key,targetKey,after=false){
 const layers=[...outfitLayers(outfit)],from=layers.findIndex(l=>l.key===key),target=layers.findIndex(l=>l.key===targetKey);
 if(from<0||target<0||from===target)return normalizeOutfit(outfit);
 const region=l=>l.category==='bottom'?'bottom':'upper';
 if(region(layers[from])!==region(layers[target]))return normalizeOutfit(outfit);
 const [moving]=layers.splice(from,1);const index=layers.findIndex(l=>l.key===targetKey);layers.splice(index+(after?1:0),0,moving);
 return normalizeOutfit({...outfit,layers});
}
