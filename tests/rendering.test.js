import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../public/art/catalog-front.json' with {type:'json'};
import {composeLayers} from '../src/doodle-renderer.js';
import {GARMENTS} from '../src/wardrobe.js';
import {normalizeOutfit,addLayer} from '../src/layers.js';

test('every available garment has a pose-specific image inside its atlas bounds',()=>{
 for(const gender of ['female','male'])for(const [category,items] of Object.entries(GARMENTS))for(const item of items.filter(i=>i.id!=='none'&&!i.legacy)){
  const art=catalog.garments[gender][item.id];assert.ok(art,`${gender}/${category}/${item.id}`);const[x,y,w,h]=art.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=art.size[0]&&y+h<=art.size[1]);
 }
});
test('outer clothing clips the inner torso and never paints multiple full tops',()=>{
 for(const gender of ['female','male']){
  let look=normalizeOutfit({top:'long',outer:'coat',bottom:'regular-denim'});look=addLayer(look,'top','knit');
  const layers=composeLayers(look,gender);assert.equal(layers.filter(l=>l.id==='visible-upper').length,1);assert.ok(layers.find(l=>l.id==='inner').clipWorld);assert.equal(layers.some(l=>l.id==='base'),false);
  const peek=composeLayers({...look,peekTop:1},gender);assert.equal(peek.find(l=>l.id==='visible-upper').image,catalog.garments[gender].knit);
 }
});
test('long trousers hide base bare legs and custom footwear never stacks on base shoes',()=>{
 for(const gender of ['female','male']){
  const look=normalizeOutfit({top:'long',outer:'none',bottom:'regular-denim',shoes:'loafers'});const layers=composeLayers(look,gender);
  assert.equal(layers.some(l=>l.id==='body-lower'||l.id.startsWith('base-shoe')),false);assert.ok(layers.find(l=>l.id==='shoe-left'));
 }
});
test('regular, straight, tapered and wide pants are distinct sprites',()=>{
 for(const gender of ['female','male']){const sprites=['regular-denim','straight-denim','tapered-chino','slacks'].map(id=>{const a=catalog.garments[gender][id];return `${a.src}:${a.rect}`;});assert.equal(new Set(sprites).size,4);}
});

test('female upper garments keep the head, neck and shoulders in one registered frame',()=>{
 for(const category of ['top','outer'])for(const item of GARMENTS[category].filter(i=>i.id!=='none'&&!i.legacy)){
  const look=normalizeOutfit({top:'long',outer:'none',bottom:'regular-denim',[category]:item.id});
  const layers=composeLayers(look,'female'),visible=layers.find(l=>l.id==='visible-upper');
  assert.equal(visible.image.includesHead,true,item.id);
  assert.equal(layers.some(l=>l.id==='head'||l.id.startsWith('arm')),false,item.id);
  assert.deepEqual(visible.dest,visible.image.dest);
 }
});

test('female feet use different complete views and every shoe retains its original proportions',()=>{
 for(const gender of ['female','male'])for(const id of ['sneakers','loafers','wallabee']){
  const layers=composeLayers(normalizeOutfit({top:'tee',bottom:'shorts',shoes:id}),gender);
  const shoes=layers.filter(l=>l.id.startsWith('shoe-'));
  assert.equal(shoes.length,2);
  for(const shoe of shoes){assert.equal(shoe.clip,undefined);assert.ok(Math.abs(shoe.dest[2]/shoe.dest[3]-shoe.image.rect[2]/shoe.image.rect[3])<1e-9);}
  if(gender==='female')assert.notDeepEqual(shoes[0].image.rect,shoes[1].image.rect);
 }
});

test('tinting a female garment restores the original head and skin in preview and export layers',()=>{
 const look=normalizeOutfit({top:'tee',bottom:'regular-denim',colors:{top:'#9b4c50'}});
 const layers=composeLayers(look,'female');
 assert.equal(layers.find(l=>l.id==='visible-upper').color,'#9b4c50');
 assert.ok(layers.find(l=>l.id==='natural-skin').clipPolygons.length>1);
});
test('each mood replaces the complete near-frontal head without a face patch',()=>{
 for(const gender of ['male','female']){
  const outfit=normalizeOutfit({top:'tee',bottom:'regular-denim'});
  const heads=['good','hot','cold'].map(mood=>composeLayers(outfit,gender,mood).find(l=>l.id==='expression'));
  assert.equal(new Set(heads.map(l=>l.image.rect.join(','))).size,3);
  for(const head of heads){assert.equal(head.image.src,'/art/front-faces-v6.png');assert.equal(head.clip,undefined);assert.ok(head.clipWorld);assert.ok(head.dest[3]>80);}
 }
});

test('shoes render underneath trousers, never on top of the hems',()=>{
 const layers=composeLayers(normalizeOutfit({top:'tee',bottom:'regular-denim',shoes:'sneakers'}),'female');
 assert.ok(layers.findIndex(l=>l.id==='shoe-right')<layers.findIndex(l=>l.id==='bottom'));
});

test('hoods and longer inner coat hems remain visible outside shorter outer garments',()=>{
 for(const gender of ['male','female']){
  const hood=composeLayers(normalizeOutfit({top:'hoodie',outer:'jacket',bottom:'regular-denim'}),gender);
  assert.ok(hood.find(l=>l.id==='exposed-hood'));
  let look=normalizeOutfit({top:'long',outer:'coat',bottom:'regular-denim'});look=addLayer(look,'outer','puffer');
  const layers=composeLayers(look,gender);assert.ok(layers.find(l=>l.id==='exposed-hem'),gender);
 }
});
test('every available top, outer, bottom and shoe combination composes valid registered sprites',()=>{
 let checked=0;
 for(const gender of ['female','male'])for(const top of GARMENTS.top.filter(i=>!i.legacy))for(const outer of GARMENTS.outer.filter(i=>!i.legacy))for(const bottom of GARMENTS.bottom.filter(i=>!i.legacy))for(const shoe of GARMENTS.shoes){
  const look=normalizeOutfit({top:top.id,outer:outer.id,bottom:bottom.id,shoes:shoe.id});
  for(const layer of composeLayers(look,gender,'good')){
   assert.ok(layer.dest.every(Number.isFinite));assert.ok(layer.dest[2]>0&&layer.dest[3]>0);
   const [x,y,w,h]=layer.image.rect,[iw,ih]=layer.image.size;
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=iw&&y+h<=ih,`${gender}/${top.id}/${outer.id}/${bottom.id}/${shoe.id}/${layer.id}`);
  }
  checked++;
 }
 assert.ok(checked>3000);
});
