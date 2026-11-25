import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, layerCount, recommend, warmth} from '../src/wardrobe.js';
import {localDate, makeDemo, parseForecast, periodWeather, resolveDateIndex} from '../src/weather.js';
import {validSettings} from '../src/storage.js';

test('colder forecasts recommend progressively warmer clothing',()=>{
  const temperatures=[30,23,19,14,9,4,-1,-10];
  const warmths=temperatures.map(temp=>warmth(recommend(temp)));
  for(let i=1;i<warmths.length;i++)assert.ok(warmths[i]>=warmths[i-1]);
  for(const temp of temperatures)assert.equal(assess(recommend(temp),temp).mood,'good');
});
test('feedback makes warmth recommendation responsive to actual experience',()=>{
  assert.ok(warmth(recommend(12,2))>warmth(recommend(12,0)));
  assert.ok(warmth(recommend(12,-2))<warmth(recommend(12,0)));
  assert.equal(assess({top:'tee',outer:'none',bottom:'shorts'},-3).mood,'cold');
  assert.equal(assess({top:'knit',outer:'puffer',bottom:'fleece',scarf:true,thermal:true},25).mood,'hot');
});
test('layer count includes hidden innerwear and excludes accessories',()=>{
  assert.equal(layerCount({top:'tee',outer:'none',scarf:true}),1);
  assert.equal(layerCount({top:'knit',outer:'jacket',thermal:true,shirtLayer:true,scarf:true}),4);
});
test('dates use selected timezone and reject forecasts outside actual returned range',()=>{
  assert.equal(localDate(new Date('2026-11-24T16:00:00Z')),'2026-11-25');
  const days=makeDemo();assert.equal(days.length,16);
  assert.equal(resolveDateIndex(days,days[15].date),15);
  assert.equal(resolveDateIndex(days,'1999-01-01'),-1);
  assert.ok(periodWeather(days[0],'day').temp>periodWeather(days[0],'morning').temp);
});
test('bad API temperatures never become plausible-looking zero degree forecasts',()=>{
  const data={daily:{time:['2026-11-25'],temperature_2m_min:[null],temperature_2m_max:[10],apparent_temperature_min:[1],apparent_temperature_max:[8],weather_code:[0],wind_speed_10m_max:[3]},hourly:{time:['2026-11-25T12:00'],temperature_2m:[10],apparent_temperature:[8]}};
  assert.deepEqual(parseForecast(data),[]);
  data.daily.temperature_2m_min=[2];assert.equal(parseForecast(data).length,1);
});
test('corrupt stored settings return to first visit setup',()=>{
  assert.equal(validSettings(null),false);assert.equal(validSettings({onboarded:true,gender:'male',city:{name:'test',lat:999,lon:12}}),false);
  assert.equal(validSettings({onboarded:true,gender:'female',city:{name:'서울',lat:37,lon:127}}),true);
});
