import { bearingDegrees, distanceMeters } from "../../shared/utils/geo";
import { DEFAULT_AIRPORT_ICAO } from "../../shared/config/constants";
import { KMSP_AIRPORT } from "./kmsp";
import { AIRPORT_PACKAGES, getAirportPackageByIcao } from "./packages";
import type { AirportDefinition, RunwayDefinition, RunwayWindAssessment } from "./types";
import type { AircraftContact } from "../aircraft/types";
import type { WeatherSnapshot } from "../weather/types";

export const AIRPORTS: AirportDefinition[] = AIRPORT_PACKAGES.map((pkg) => pkg.airport);

export const getAirportByIcao = (icao: string): AirportDefinition | undefined =>
  getAirportPackageByIcao(icao)?.airport;

export const getDefaultAirport = (): AirportDefinition =>
  getAirportByIcao(DEFAULT_AIRPORT_ICAO) ?? KMSP_AIRPORT;

export const searchAirports = (query: string): AirportDefinition[] => {
  const normalized = query.trim().toUpperCase();
  if (!normalized) {
    return AIRPORTS;
  }

  return AIRPORTS.filter(
    (airport) =>
      airport.icao.includes(normalized) ||
      airport.iata?.includes(normalized) ||
      airport.name.toUpperCase().includes(normalized) ||
      airport.city.toUpperCase().includes(normalized)
  );
};

export const getNearestRunway = (
  aircraft: Pick<AircraftContact, "latitude" | "longitude">,
  airport = getDefaultAirport()
): RunwayDefinition | null => {
  let bestRunway: RunwayDefinition | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const runway of airport.runways) {
    const distance = distanceMeters(
      aircraft.latitude,
      aircraft.longitude,
      runway.midpoint[0],
      runway.midpoint[1]
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestRunway = runway;
    }
  }

  return bestRunway;
};

export const assessRunwayWind = (
  airport: AirportDefinition,
  weather?: WeatherSnapshot | null
): RunwayWindAssessment[] => {
  const windDirection = weather?.windDirectionDegrees;
  const windSpeed = weather?.windSpeedKnots ?? 0;

  return airport.runways.map((runway) => {
    if (windDirection == null) {
      return {
        runwayId: runway.id,
        headwindComponent: 0,
        crosswindComponent: 0,
        favored: false
      };
    }

    const angle = ((windDirection - runway.headingDegrees + 540) % 360) - 180;
    const radians = (angle * Math.PI) / 180;
    const headwindComponent = Math.cos(radians) * windSpeed;
    const crosswindComponent = Math.sin(radians) * windSpeed;

    return {
      runwayId: runway.id,
      headwindComponent,
      crosswindComponent,
      favored: headwindComponent > 0
    };
  });
};

export const getSuggestedDepartureRunway = (
  destinationAirportIcao: string | null,
  weather?: WeatherSnapshot | null,
  airport = getDefaultAirport()
): RunwayDefinition | null => {
  const destination = destinationAirportIcao ? getAirportByIcao(destinationAirportIcao) : undefined;
  const windAssessments = assessRunwayWind(airport, weather).sort(
    (left, right) => right.headwindComponent - left.headwindComponent
  );

  if (!destination) {
    const favored = windAssessments.find((assessment) => assessment.favored);
    return airport.runways.find((runway) => runway.id === favored?.runwayId) ?? airport.runways[0] ?? null;
  }

  const departureBearing = bearingDegrees(
    airport.latitude,
    airport.longitude,
    destination.latitude,
    destination.longitude
  );

  return [...airport.runways].sort((left, right) => {
    const leftBias = Math.abs(left.headingDegrees - departureBearing);
    const rightBias = Math.abs(right.headingDegrees - departureBearing);
    return leftBias - rightBias;
  })[0] ?? null;
};
