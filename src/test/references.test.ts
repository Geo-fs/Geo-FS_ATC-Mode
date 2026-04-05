import { describe, expect, it } from "vitest";
import { KMSP_AIRPORT } from "../domain/airports/kmsp";
import { recommendReferenceDocuments } from "../domain/references/attention";
import { BUNDLED_REFERENCE_DOCUMENTS } from "../domain/references/registry";
import {
  buildReferenceSelectionContext,
  rankReferenceDocuments,
  resolveReferenceForContext,
  selectBestReferenceDocument
} from "../domain/references/resolver";
import { searchReferenceDocuments } from "../domain/references/search";

describe("reference support", () => {
  it("finds phraseology references by query", () => {
    const results = searchReferenceDocuments(BUNDLED_REFERENCE_DOCUMENTS, "phraseology");
    expect(results[0]?.documentId).toBe("faa-atc-phraseology-reference");
  });

  it("recommends airport diagram for grounded context", () => {
    const recommended = recommendReferenceDocuments({
      documents: BUNDLED_REFERENCE_DOCUMENTS,
      airport: KMSP_AIRPORT,
      selectedAircraft: {
        id: "1",
        aircraftInstanceId: "1",
        aircraftCode: 16,
        callsign: "DAL123",
        latitude: 44.88,
        longitude: -93.22,
        altitudeFeet: 0,
        headingDegrees: 120,
        pitchDegrees: 0,
        rollDegrees: 0,
        grounded: true,
        speedLike: 0,
        timestamp: Date.now(),
        receivedAt: Date.now(),
        stale: false,
        history: []
      },
      focusTargets: []
    });

    expect(recommended[0]?.category).toBe("airport_diagram");
  });

  it("prefers image airport diagram for ground reference role", () => {
    const best = selectBestReferenceDocument(
      BUNDLED_REFERENCE_DOCUMENTS,
      buildReferenceSelectionContext({
        airportIcao: "KMSP",
        selectedAircraftGrounded: true,
        hasSelectedAircraft: true,
        focusModes: ["ground"],
        hasWeather: false,
        role: "ground_reference"
      })
    );

    expect(best?.id).toBe("kmsp-airport-diagram-image");
  });

  it("prefers pdf tac for reading role", () => {
    const ranked = rankReferenceDocuments(
      BUNDLED_REFERENCE_DOCUMENTS,
      buildReferenceSelectionContext({
        airportIcao: "KMSP",
        selectedAircraftGrounded: false,
        hasSelectedAircraft: true,
        focusModes: ["approach"],
        hasWeather: false,
        role: "reading_reference"
      })
    );

    expect(ranked[0]?.document.type).toBe("pdf");
  });

  it("honors role pin overrides", () => {
    const best = selectBestReferenceDocument(
      BUNDLED_REFERENCE_DOCUMENTS,
      buildReferenceSelectionContext({
        airportIcao: "KMSP",
        selectedAircraftGrounded: true,
        hasSelectedAircraft: true,
        focusModes: ["ground"],
        hasWeather: false,
        role: "ground_reference"
      }),
      { ground_reference: "kmsp-airport-diagram-pdf" }
    );

    expect(best?.id).toBe("kmsp-airport-diagram-pdf");
  });

  it("includes recommendation reasons", () => {
    const resolution = resolveReferenceForContext(
      BUNDLED_REFERENCE_DOCUMENTS,
      buildReferenceSelectionContext({
        airportIcao: "KMSP",
        selectedAircraftGrounded: false,
        hasSelectedAircraft: true,
        focusModes: ["approach"],
        hasWeather: true,
        destinationIcao: "KMSP",
        role: "airspace_reference"
      })
    );

    expect(resolution?.reasons.length).toBeGreaterThan(0);
  });
});
