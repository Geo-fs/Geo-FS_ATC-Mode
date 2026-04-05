import { assessRunwayWind, getNearestRunway, getSuggestedDepartureRunway } from "../airports/airports";
import type { AircraftContact } from "./types";
import type { AirportDefinition } from "../airports/types";
import type { FocusTarget } from "../focus/types";
import type { WeatherSnapshot } from "../weather/types";

export type TrafficFlowState = "arrival" | "departure" | "surface" | "unknown";
export type AdvisorySeverity = "info" | "watch" | "warning";

export interface AircraftOperationalAdvisory {
  flow: TrafficFlowState;
  movementState: "taxi" | "holding" | "takeoff-roll" | "airborne" | "slow-airborne" | "unknown";
  nearestRunwayId: string | null;
  suggestedRunwayId: string | null;
  runwaySuitability: "favored" | "crosswind" | "tailwind" | "neutral";
  sequencingHint: string;
  alert: {
    severity: AdvisorySeverity;
    label: string;
  } | null;
}

const normalizeHeadingDelta = (left: number, right: number) => {
  const delta = Math.abs(left - right) % 360;
  return delta > 180 ? 360 - delta : delta;
};

export const getTrafficFlowState = (
  contact: AircraftContact,
  focusTarget?: Pick<FocusTarget, "destinationIcao"> | null
): TrafficFlowState => {
  if (contact.grounded) {
    return "surface";
  }

  if (focusTarget?.destinationIcao) {
    return "departure";
  }

  if ((contact.altitudeFeet ?? 0) < 5_000) {
    return "arrival";
  }

  return "unknown";
};

export const assessAircraftOperationalAdvisory = (
  contact: AircraftContact,
  airport: AirportDefinition,
  weather?: WeatherSnapshot | null,
  focusTarget?: FocusTarget | null
): AircraftOperationalAdvisory => {
  const flow = getTrafficFlowState(contact, focusTarget);
  const nearestRunway = getNearestRunway(contact, airport);
  const suggestedRunway = getSuggestedDepartureRunway(focusTarget?.destinationIcao ?? null, weather, airport);
  const windAssessment = assessRunwayWind(airport, weather).find(
    (assessment) => assessment.runwayId === nearestRunway?.id
  );
  const headingToRunway = nearestRunway
    ? normalizeHeadingDelta(contact.headingDegrees, nearestRunway.headingDegrees)
    : 180;

  const movementState = contact.grounded
    ? (contact.speedLike ?? 0) > 45
      ? "takeoff-roll"
      : (contact.speedLike ?? 0) > 8
        ? "taxi"
        : "holding"
    : (contact.speedLike ?? 0) < 90
      ? "slow-airborne"
      : "airborne";

  const runwaySuitability =
    !windAssessment || weather?.windDirectionDegrees == null
      ? "neutral"
      : windAssessment.headwindComponent < -3
        ? "tailwind"
        : Math.abs(windAssessment.crosswindComponent) > 12
          ? "crosswind"
          : windAssessment.favored
            ? "favored"
            : "neutral";

  const sequencingHint =
    flow === "surface"
      ? movementState === "holding"
        ? "Grounded and slow. Good candidate for explicit taxi or hold-short instruction."
        : "Surface movement active. Cross-check runway crossings before issuing the next step."
      : flow === "departure"
        ? suggestedRunway
          ? `Departure profile fits ${suggestedRunway.id}.`
          : "Departure profile available."
        : headingToRunway < 45
          ? "Aircraft alignment suggests runway intercept or final."
          : "Likely sequencing candidate. Monitor spacing and runway alignment.";

  const alert =
    contact.stale
      ? { severity: "warning" as const, label: "STALE TRACK" }
      : runwaySuitability === "tailwind"
        ? { severity: "warning" as const, label: "TAILWIND BIAS" }
        : runwaySuitability === "crosswind"
          ? { severity: "watch" as const, label: "XW WATCH" }
          : movementState === "takeoff-roll"
            ? { severity: "watch" as const, label: "RWY ACTIVE" }
            : null;

  return {
    flow,
    movementState,
    nearestRunwayId: nearestRunway?.id ?? null,
    suggestedRunwayId: suggestedRunway?.id ?? null,
    runwaySuitability,
    sequencingHint,
    alert
  };
};
