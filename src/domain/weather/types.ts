export interface WeatherSnapshot {
  source: "geofs" | "aviationweather" | "manual";
  airportIcao: string;
  observedAt: number;
  metarText: string;
  windDirectionDegrees: number | null;
  windSpeedKnots: number | null;
  windGustKnots: number | null;
  visibilityMiles?: number | null;
  raw?: unknown;
}

export interface WeatherProvider {
  id: string;
  fetchAirportWeather(airportIcao: string): Promise<WeatherSnapshot>;
}
