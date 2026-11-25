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
  layers.push(layer(category,id));
  return normalizeOutfit({...outfit,layers});
}

export function removeLayer(outfit,key){
  return normalizeOutfit({...outfit,layers:outfitLayers(outfit).filter(l=>l.key!==key)});
}

export function countLayers(outfit,region='top'){
  return outfitLayers(outfit).filter(l=>region==='top'?['top','outer'].includes(l.category):l.category==='bottom').length;
}

export function upperLayers(outfit){
  const all=outfitLayers(outfit);return [...all.filter(l=>l.category==='top'&&l.id==='thermal-top'),...all.filter(l=>l.category==='top'&&l.id!=='thermal-top'),...all.filter(l=>l.category==='outer')];
}
export function lowerLayers(outfit){const all=outfitLayers(outfit).filter(l=>l.category==='bottom');return [...all.filter(l=>l.id==='thermal-bottom'),...all.filter(l=>l.id!=='thermal-bottom')];}
