/**
 * useWeather — fetches real current weather for the user's location.
 *
 * Data source: Open-Meteo (https://open-meteo.com)
 * Free, no API key, CC BY 4.0 licence.
 * Geolocation: browser navigator.geolocation
 *
 * Returns:
 *   weatherCode  — WMO weather interpretation code (0–99)
 *   temperature  — °C
 *   windspeed    — km/h
 *   isDay        — 1 (day) | 0 (night) from API
 *   city         — reverse-geocoded city name (best-effort)
 *   scene        — derived scene: 'clear-day' | 'clear-night' | 'cloudy' |
 *                  'partly-cloudy' | 'fog' | 'drizzle' | 'rain' |
 *                  'thunderstorm' | 'snow' | 'hail'
 *   loading / error
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export type WeatherScene =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'hail';

export type WeatherData = {
  weatherCode: number;
  temperature: number;
  windspeed: number;
  isDay: 0 | 1;
  city: string;
  scene: WeatherScene;
};

/** Map WMO weather code → scene.
 * Reference: https://open-meteo.com/en/docs (WMO Weather Codes table)
 * Content paraphrased for compliance.
 */
function codeToScene(code: number, isDay: 0 | 1): WeatherScene {
  if (code === 0) return isDay ? 'clear-day' : 'clear-night';
  if (code <= 2) return isDay ? 'partly-cloudy' : 'clear-night';
  if (code === 3) return 'cloudy';
  if (code <= 49) return 'fog'; // 40-49 fog/depositing rime
  if (code <= 59) return 'drizzle'; // 50-59 drizzle
  if (code <= 69) return 'rain'; // 60-69 rain
  if (code <= 79) return 'snow'; // 70-79 snow
  if (code === 85 || code === 86) return 'snow'; // snow showers
  if (code === 80 || code === 81 || code === 82) return 'rain'; // rain showers
  if (code === 96 || code === 99) return 'thunderstorm'; // thunderstorm + hail
  if (code === 95) return 'thunderstorm';
  if (code === 89 || code === 90) return 'hail';
  return isDay ? 'clear-day' : 'clear-night';
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  // Open-Meteo current weather — no API key needed
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode,windspeed_10m,is_day` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();

  const code  = json.current.weathercode  as number;
  const temp  = json.current.temperature_2m as number;
  const wind  = json.current.windspeed_10m as number;
  const isDay = json.current.is_day as 0 | 1;

  // Best-effort reverse geocode using Open-Meteo's geocoding (no key)
  let city = '';
  try {
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (geo.ok) {
      const gj = await geo.json();
      city =
        gj.address?.city ||
        gj.address?.town ||
        gj.address?.village ||
        gj.address?.county ||
        '';
    }
  } catch { /* city stays empty — not critical */ }

  return {
    weatherCode: code,
    temperature: Math.round(temp),
    windspeed: Math.round(wind),
    isDay,
    city,
    scene: codeToScene(code, isDay),
  };
}

export function useWeather() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => setGeoError(err.message),
      { timeout: 8000, maximumAge: 300_000 }, // cache 5 min
    );
  }, []);

  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather', coords?.lat, coords?.lon],
    queryFn: () => fetchWeather(coords!.lat, coords!.lon),
    enabled: !!coords,
    staleTime: 10 * 60 * 1000,  // 10 min
    gcTime:    15 * 60 * 1000,  // 15 min
    retry: 1,
  });

  return {
    weather: data ?? null,
    loading: !coords ? false : isLoading,
    error: geoError || (error ? String(error) : null),
    hasLocation: !!coords,
  };
}
