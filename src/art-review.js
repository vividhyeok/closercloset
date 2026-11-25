import './style.css';
import './editorial.css';
import './peeking.css';
import {character} from './paper-doll.js';
import {GARMENTS} from './wardrobe.js';
import {normalizeOutfit} from './layers.js';

document.head.insertAdjacentHTML('beforeend','<style>body{background:#faf9f6}.review-header{position:sticky;top:0;background:#faf9f6ed;padding:15px 25px;z-index:10;display:flex;gap:20px;border-bottom:1px solid #ddd}.review-header button{padding:10px 20px;border:1px solid #ccc}.review-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:20px}.review-card{border:1px solid #deddd4;background:#eeede6;min-width:0}.review-art{height:340px;display:flex;justify-content:center}.review-art .paper-doll{height:100%;width:auto;aspect-ratio:2/3;position:relative}.review-caption{padding:12px;background:#faf9f6;font-size:12px}.review-caption small{font-size:11px;margin-left:8px;color:#888}@media(max-width:600px){.review-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px;gap:10px}.review-art{height:300px}}</style>');
let gender='female',mood='good';
function render(){
document.querySelector('#art-review').innerHTML=`<header class="review-header"><button data-gender="female">여성 전체 의류</button><button data-gender="male">남성 전체 의류</button><button data-mood="good">적당함</button><button data-mood="hot">더움</button><button data-mood="cold">추움</button></header><div class="review-grid">${['top','outer','bottom','shoes','hat'].flatMap(category=>GARMENTS[category].filter(item=>item.id!=='none'&&!item.legacy).map(item=>{const outfit=normalizeOutfit({top:'long',outer:'none',bottom:'regular-denim',shoes:'sneakers',[category]:item.id});return `<article class="review-card"><div class="review-art">${character(outfit,gender,mood,`qa-${gender}-${category}-${item.id}`)}</div><div class="review-caption">${item.name}<small>${category} / ${item.id}</small></div></article>`;})).join('')}</div>`;
document.querySelectorAll('[data-mood]').forEach(button=>button.addEventListener('click',()=>{mood=button.dataset.mood;render();}));
document.querySelectorAll('[data-gender]').forEach(button=>button.addEventListener('click',()=>{gender=button.dataset.gender;render();window.scrollTo(0,0);}));}
render();
