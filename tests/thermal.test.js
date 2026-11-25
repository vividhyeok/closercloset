import test from 'node:test';
import assert from 'node:assert/strict';
import {warmth,getGarment} from '../src/wardrobe.js';
import {normalizeOutfit,addLayer} from '../src/layers.js';
const one=id=>normalizeOutfit({layers:[{category:'top',id,key:id}]});
test('coverage, material and thickness distinguish equally counted upper garments',()=>{
 assert.ok(warmth(one('sleeveless'))<warmth(one('tee')));
 assert.ok(warmth(one('linen-shirt'))<warmth(one('long')));
 assert.ok(warmth(one('long'))<warmth(one('knit')));
 assert.ok(getGarment('top','knit').profile.thickness>getGarment('top','tee').profile.thickness);
});
test('equal outer layer counts have different insulation and repeated fabric has diminishing returns',()=>{
 const shell=id=>normalizeOutfit({layers:[{category:'outer',id,key:id}]});
 assert.ok(warmth(shell('cardigan'))<warmth(shell('coat')));assert.ok(warmth(shell('coat'))<warmth(shell('puffer')));
 const first=one('tee'),second=addLayer(first,'top','tee');assert.ok(warmth(second)>warmth(first));assert.ok(warmth(second)<2*warmth(first));
});
