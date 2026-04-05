import { parseMetar } from "./metar";
import type { WeatherProvider, WeatherSnapshot } from "./types";

export class AviationWeatherProvider implements WeatherProvider {
  id = "aviationweather";

  async fetchAirportWeather(airportIcao: string): Promise<WeatherSnapshot> {
    const url =
      `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(airportIcao)}` +
      "&format=raw&taf=false";

    const response = await fetch(url);
    const text = await response.text();
    const metar = text.trim().split("\n")[0] ?? `${airportIcao} AUTO /////KT`;
    return parseMetar(airportIcao, metar, "aviationweather");
  }
}
