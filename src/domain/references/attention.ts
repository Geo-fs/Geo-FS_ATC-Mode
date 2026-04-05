import type { AircraftContact } from "../aircraft/types";
import type { AirportDefinition } from "../airports/types";
import type { FocusTarget } from "../focus/types";
import type { ReferenceDocument } from "./types";
import { buildReferenceSelectionContext, rankReferenceDocuments } from "./resolver";

export const recommendReferenceDocuments = (params: {
  documents: ReferenceDocument[];
  airport: AirportDefinition;
  selectedAircraft: AircraftContact | null;
  focusTargets: FocusTarget[];
  hasWeather?: boolean;
}): ReferenceDocument[] => {
  const { documents, airport, selectedAircraft, focusTargets, hasWeather = false } = params;
  const focusModes = new Set(focusTargets.map((target) => target.mode));

  if (selectedAircraft?.grounded) {
    focusModes.add("ground");
  } else if (selectedAircraft) {
    focusModes.add("tower");
  }

  const roles = [
    "ground_reference",
    "airspace_reference",
    "weather_reference",
    "procedure_reference"
  ] as const;

  const scored = new Map<string, { document: ReferenceDocument; score: number }>();
  for (const role of roles) {
    const ranked = rankReferenceDocuments(
      documents,
      buildReferenceSelectionContext({
        airportIcao: airport.icao,
        selectedAircraftGrounded: Boolean(selectedAircraft?.grounded),
        hasSelectedAircraft: Boolean(selectedAircraft),
        focusModes: [...focusModes],
        hasWeather,
        role
      })
    );

    ranked.slice(0, 3).forEach((entry, index) => {
      const existing = scored.get(entry.document.id);
      const mergedScore = entry.score + (3 - index);
      if (!existing || existing.score < mergedScore) {
        scored.set(entry.document.id, {
          document: entry.document,
          score: mergedScore
        });
      }
    });
  }

  return [...scored.values()]
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.document);
};
