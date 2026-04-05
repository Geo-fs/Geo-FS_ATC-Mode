import { getNearestRunway } from "../airports/airports";
import { distanceMeters } from "../../shared/utils/geo";
import type { AircraftContact } from "./types";
import type { AirportDefinition } from "../airports/types";

export type ConflictSeverity = "info" | "watch" | "warning";
export type ConflictKind =
  | "converging"
  | "same_runway_spacing"
  | "runway_occupancy"
  | "stale_track";

export interface ConflictAlert {
  id: string;
  kind: ConflictKind;
  severity: ConflictSeverity;
  summary: string;
  involvedContactIds: string[];
}

const headingDelta = (left: number, right: number) => {
  const raw = Math.abs(left - right) % 360;
  return raw > 180 ? 360 - raw : raw;
};

export const detectTrafficConflicts = (
  contacts: AircraftContact[],
  airport: AirportDefinition
): ConflictAlert[] => {
  const alerts: ConflictAlert[] = [];

  for (const contact of contacts) {
    if (contact.stale) {
      alerts.push({
        id: `stale-${contact.id}`,
        kind: "stale_track",
        severity: "warning",
        summary: `${contact.callsign || "Unknown"} track is stale.`,
        involvedContactIds: [contact.id]
      });
    }
  }

  for (let index = 0; index < contacts.length; index += 1) {
    for (let comparisonIndex = index + 1; comparisonIndex < contacts.length; comparisonIndex += 1) {
      const left = contacts[index];
      const right = contacts[comparisonIndex];
      if (!left || !right) {
        continue;
      }

      const distanceNm =
        distanceMeters(left.latitude, left.longitude, right.latitude, right.longitude) / 1852;
      const altitudeDelta = Math.abs(left.altitudeFeet - right.altitudeFeet);
      const sameRunway =
        getNearestRunway(left, airport)?.id != null &&
        getNearestRunway(left, airport)?.id === getNearestRunway(right, airport)?.id;

      if (!left.grounded && !right.grounded && distanceNm < 2.5 && altitudeDelta < 1200) {
        const headingGap = headingDelta(left.headingDegrees, right.headingDegrees);
        if (headingGap > 45) {
          alerts.push({
            id: `converging-${left.id}-${right.id}`,
            kind: "converging",
            severity: distanceNm < 1.5 ? "warning" : "watch",
            summary: `${left.callsign || left.id} and ${right.callsign || right.id} are converging inside ${distanceNm.toFixed(1)}nm.`,
            involvedContactIds: [left.id, right.id]
          });
        }
      }

      if (sameRunway && distanceNm < 3.5 && altitudeDelta < 1500) {
        alerts.push({
          id: `runway-spacing-${left.id}-${right.id}`,
          kind: "same_runway_spacing",
          severity: distanceNm < 2 ? "warning" : "watch",
          summary: `${left.callsign || left.id} and ${right.callsign || right.id} are compressed on the same runway flow.`,
          involvedContactIds: [left.id, right.id]
        });
      }

      if (sameRunway && (left.grounded || right.grounded) && distanceNm < 1.2) {
        alerts.push({
          id: `runway-occupancy-${left.id}-${right.id}`,
          kind: "runway_occupancy",
          severity: "warning",
          summary: `${left.callsign || left.id} and ${right.callsign || right.id} indicate a runway occupancy conflict.`,
          involvedContactIds: [left.id, right.id]
        });
      }
    }
  }

  return alerts;
};
