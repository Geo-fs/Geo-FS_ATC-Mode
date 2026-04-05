import type { WeatherSnapshot } from "./types";

const WIND_REGEX = /(\d{3}|VRB)(\d{2})(G(\d{2}))?KT/;

export const parseMetar = (
  airportIcao: string,
  metarText: string,
  source: WeatherSnapshot["source"] = "manual"
): WeatherSnapshot => {
  const windMatch = metarText.match(WIND_REGEX);
  const windDirectionDegrees =
    windMatch?.[1] && windMatch[1] !== "VRB" ? Number(windMatch[1]) : null;
  const windSpeedKnots = windMatch?.[2] ? Number(windMatch[2]) : null;
  const windGustKnots = windMatch?.[4] ? Number(windMatch[4]) : null;

  return {
    source,
    airportIcao,
    observedAt: Date.now(),
    metarText,
    windDirectionDegrees,
    windSpeedKnots,
    windGustKnots
  };
};
