import test from 'node:test';
import assert from 'node:assert/strict';
import {addLayer,removeLayer,countLayers,normalizeOutfit,outfitLayers,upperLayers,moveLayer} from '../src/layers.js';
import {calibrationOffset,warmth,assess} from '../src/wardrobe.js';
import {curatedLook} from '../src/lookbook.js';
import {validForecastCache,makeDemo} from '../src/weather.js';

test('repeated drops count identical garments separately and preserve every layer',()=>{
 let look=normalizeOutfit({layers:[]});look=addLayer(look,'top','tee');look=addLayer(look,'top','tee');look=addLayer(look,'top','long');look=addLayer(look,'outer','coat');look=addLayer(look,'bottom','thermal-bottom');look=addLayer(look,'bottom','regular-denim');
 assert.equal(countLayers(look),4);assert.equal(countLayers(look,'bottom'),2);assert.equal(new Set(look.layers.map(l=>l.key)).size,6);assert.ok(warmth(look)>10);
 const restored=JSON.parse(JSON.stringify(look));assert.equal(restored.layers.length,6);assert.equal(countLayers(restored),4);
 const reduced=removeLayer(look,look.layers[0].key);assert.equal(countLayers(reduced),3);assert.equal(look.layers.length,6);
});
test('dropping innerwear after a coat still orders the coat outside and keeps both',()=>{
 let look=addLayer(normalizeOutfit({layers:[]}),'outer','coat');look=addLayer(look,'top','long');
 assert.deepEqual(upperLayers(look).map(l=>l.id),['long','coat']);assert.equal(look.outer,'coat');assert.equal(look.top,'long');
});
test('removing an outer garment does not silently remove the inner layers',()=>{
 const look=normalizeOutfit({top:'knit',outer:'jacket',bottom:'regular-denim',thermal:true});const cleared=addLayer(look,'outer','none');
 assert.equal(cleared.outer,'none');assert.equal(countLayers(cleared),2);assert.equal(countLayers(cleared,'bottom'),1);assert.equal(look.outer,'jacket');
});
test('calibration uses every layer and the same outfit responds differently to actual feeling',()=>{
 const light=normalizeOutfit({top:'tee',outer:'none',bottom:'regular-denim'});const heavy=addLayer(light,'top','knit');
 assert.ok(calibrationOffset(light,10,'cold')>calibrationOffset(light,10,'hot'));assert.ok(calibrationOffset(heavy,10,'good')>calibrationOffset(light,10,'good'));
 assert.throws(()=>calibrationOffset(light,NaN,'good'));assert.throws(()=>calibrationOffset(light,10,'unknown'));
});
test('curated looks remain appropriate across temperatures',()=>{
 for(const t of [-10,-4,1,3,8,10,14,16,20,24,30])assert.equal(assess(curatedLook(t),t).mood,'good',`temperature ${t}`);
});
test('incomplete or corrupted forecast cache cannot masquerade as weather',()=>{
 assert.equal(validForecastCache({fetchedAt:Date.now(),days:[{date:'2026-11-25'}]}),false);assert.equal(validForecastCache({fetchedAt:Date.now(),days:makeDemo()}),true);assert.equal(validForecastCache({fetchedAt:Date.now()+1000000,days:makeDemo()}),false);
});

test('manual layer order survives normalization and cannot move upper clothing into trousers',()=>{
 let look=normalizeOutfit({top:'hoodie',outer:'coat',bottom:'regular-denim'});
 const [hoodie,coat,bottom]=outfitLayers(look);look=moveLayer(look,coat.key,hoodie.key);
 assert.deepEqual(upperLayers(look).map(l=>l.id),['coat','hoodie']);
 assert.deepEqual(upperLayers(normalizeOutfit(JSON.parse(JSON.stringify(look)))).map(l=>l.id),['coat','hoodie']);
 assert.deepEqual(outfitLayers(moveLayer(look,coat.key,bottom.key)),outfitLayers(look));
});
