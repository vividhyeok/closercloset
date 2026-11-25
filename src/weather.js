export const CITIES = [
  { name: '서울', region: '대한민국', lat: 37.5665, lon: 126.978, timezone: 'Asia/Seoul' },
  { name: '부산', region: '대한민국', lat: 35.1796, lon: 129.0756, timezone: 'Asia/Seoul' },
  { name: '인천', region: '대한민국', lat: 37.4563, lon: 126.7052, timezone: 'Asia/Seoul' },
  { name: '대구', region: '대한민국', lat: 35.8714, lon: 128.6014, timezone: 'Asia/Seoul' },
  { name: '대전', region: '대한민국', lat: 36.3504, lon: 127.3845, timezone: 'Asia/Seoul' },
  { name: '광주', region: '대한민국', lat: 35.1595, lon: 126.8526, timezone: 'Asia/Seoul' },
  { name: '수원', region: '대한민국', lat: 37.2636, lon: 127.0286, timezone: 'Asia/Seoul' },
  { name: '제주', region: '대한민국', lat: 33.4996, lon: 126.5312, timezone: 'Asia/Seoul' },
  { name: '춘천', region: '대한민국', lat: 37.8813, lon: 127.7298, timezone: 'Asia/Seoul' },
  { name: '강릉', region: '대한민국', lat: 37.7519, lon: 128.8761, timezone: 'Asia/Seoul' },
  { name: '전주', region: '대한민국', lat: 35.8242, lon: 127.148, timezone: 'Asia/Seoul' },
  { name: '청주', region: '대한민국', lat: 36.6424, lon: 127.489, timezone: 'Asia/Seoul' },
];

export function localDate(date = new Date(), timezone = 'Asia/Seoul') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function weatherInfo(code) {
  if (code === 0) return { label: '맑음', icon: 'sun' };
  if (code <= 2) return { label: '구름 조금', icon: 'cloud-sun' };
  if (code === 3) return { label: '흐림', icon: 'cloud' };
  if (code <= 48) return { label: '안개', icon: 'cloud-fog' };
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return { label: '눈', icon: 'snowflake' };
  if (code >= 95) return { label: '뇌우', icon: 'cloud-lightning' };
  return { label: '비', icon: 'cloud-rain' };
}

export function parseForecast(data) {
  const daily = data.daily;
  if (!daily?.time?.length || !data.hourly?.time?.length) throw new Error('예보 데이터가 비어 있어요.');
  const valid = value => typeof value === 'number' && Number.isFinite(value);
  return daily.time.map((date, i) => {
    const hours = data.hourly.time.flatMap((time, h) => typeof time==='string' && time.startsWith(date) && valid(data.hourly.temperature_2m?.[h]) && valid(data.hourly.apparent_temperature?.[h]) ? [{
      hour: Number(time.slice(11, 13)), temp: data.hourly.temperature_2m[h],
      feels: data.hourly.apparent_temperature[h], rain: data.hourly.precipitation_probability?.[h] ?? 0,
      code: data.hourly.weather_code?.[h] ?? daily.weather_code[i],
    }] : []);
    return {
      date, min: daily.temperature_2m_min[i], max: daily.temperature_2m_max[i],
      feelsMin: daily.apparent_temperature_min[i], feelsMax: daily.apparent_temperature_max[i],
      code: daily.weather_code?.[i], rain: valid(daily.precipitation_probability_max?.[i])?daily.precipitation_probability_max[i]:null,
      wind: valid(daily.wind_speed_10m_max?.[i])?daily.wind_speed_10m_max[i]:null, hours,
    };
  }).filter(day => typeof day.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date) && valid(day.min) && valid(day.max) && valid(day.feelsMin) && valid(day.feelsMax) && valid(day.code) && day.hours.length);
}

export async function fetchForecast(city, signal) {
  const query = new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon), timezone: city.timezone || 'Asia/Seoul', forecast_days: '16', past_days: '1',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code', wind_speed_unit: 'ms',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal });
  if (!response.ok) throw new Error(`날씨 서버 응답 ${response.status}`);
  const data = await response.json();
  const parsed = parseForecast(data);
  const today = localDate(new Date(), data.timezone || 'Asia/Seoul');
  const days = parsed.filter(day => day.date >= today);
  if (!days.length) throw new Error('지원하는 예보가 없어요.');
  return { days, yesterday: parsed.filter(day => day.date < today).at(-1) || null, timezone: data.timezone, fetchedAt: Date.now() };
}

export function makeDemo() {
  const start = localDate();
  const maxima = [9, 7, 12, 15, 11, 6, 4, 8, 13, 10, 7, 5, 9, 12, 8, 6];
  return maxima.map((max, i) => {
    const date = new Date(`${start}T12:00:00+09:00`);
    date.setUTCDate(date.getUTCDate() + i);
    const min = max - 8;
    const code = [1, 3, 0, 1, 61, 3, 71, 0][i % 8];
    return {
      date: localDate(date), min, max, feelsMin: min - 3, feelsMax: max - 2,
      code, rain: code === 61 ? 80 : code === 71 ? 60 : 10, wind: 2.8 + i % 3,
      hours: Array.from({ length: 24 }, (_, h) => {
        const temp = min + (max - min) * (0.5 + 0.5 * Math.cos((h - 14) * Math.PI / 12));
        return { hour: h, temp: Math.round(temp), feels: Math.round(temp - 2), rain: code === 61 ? 80 : 10, code };
      }),
    };
  });
}

export function periodWeather(day, period = 'day') {
  const ranges = { all: [8, 22], morning: [7, 10], day: [11, 17], evening: [18, 22] };
  const [start, end] = ranges[period] || ranges.day;
  const hours = day.hours.filter(h => h.hour >= start && h.hour <= end);
  const feels = hours.length ? hours.reduce((s, h) => s + h.feels, 0) / hours.length : (day.feelsMax + day.feelsMin) / 2;
  return { feels: Math.round(feels), temp: Math.round(hours.length ? hours.reduce((s, h) => s + h.temp, 0) / hours.length : day.max) };
}

export function resolveDateIndex(days, date) {
  return days.findIndex(day => day.date === date);
}

export function validForecastCache(value){
  return !!value&&Number.isFinite(value.fetchedAt)&&value.fetchedAt<=Date.now()+60000&&Array.isArray(value.days)&&value.days.length>0&&value.days.length<=17&&value.days.every(day=>typeof day.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day.date)&&Number.isFinite(day.min)&&Number.isFinite(day.max)&&Number.isFinite(day.feelsMin)&&Number.isFinite(day.feelsMax)&&Array.isArray(day.hours)&&day.hours.length>0&&day.hours.every(h=>Number.isFinite(h.hour)&&Number.isFinite(h.temp)&&Number.isFinite(h.feels)));
}
