import './style.css';
import './editorial.css';
import './peeking.css';
import {character} from './doodle-renderer.js';
import {normalizeOutfit,addLayer} from './layers.js';
const cases=[
 ['패딩 + 후드','female','good',['hoodie','puffer'],'sneakers'],
 ['코트 + 니트','female','good',['knit','coat'],'loafers'],
 ['코트 안 + 짧은 재킷 밖','female','hot',['knit','coat','jacket'],'loafers'],
 ['코트 + 재킷 + 레더','female','hot',['knit','coat','jacket','leather'],'loafers'],
 ['남성 코트 + 재킷 + 레더','male','hot',['knit','coat','jacket','leather'],'loafers'],
];
let selected=0;
function render(){const [name,gender,mood,ids,shoes]=cases[selected];let look=normalizeOutfit({top:ids[0],outer:'none',bottom:'straight-denim',shoes});for(const id of ids.slice(1))look=addLayer(look,'outer',id);document.querySelector('#fit-check').innerHTML=`<nav>${cases.map((c,i)=>`<button data-case="${i}" aria-pressed="${i===selected}">${c[0]}</button>`).join('')}</nav><h1>${name}</h1><div class="inspection">${character(look,gender,mood,'inspection')}</div>`;document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.case);render();}));}
document.head.insertAdjacentHTML('beforeend','<style>body{margin:0;background:#faf9f6}nav{display:flex;gap:12px;padding:14px;flex-wrap:wrap}nav button{font-size:14px;padding:12px;border:1px solid #bbb}nav button[aria-pressed=true]{background:#ddd}h1{font-size:18px;padding:0 20px}.inspection{height:850px;max-height:calc(100vh - 145px);width:600px;max-width:100%;background:#efeee8;margin:auto;display:flex;justify-content:center}.inspection .paper-doll{height:100%;width:auto;aspect-ratio:2/3;position:relative}</style>');render();
