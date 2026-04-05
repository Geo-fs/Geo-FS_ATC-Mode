import { describe, expect, it } from "vitest";
import { assessRunwayWind, getNearestRunway } from "../domain/airports/airports";
import { KMSP_AIRPORT } from "../domain/airports/kmsp";

describe("airport helpers", () => {
  it("finds a nearest runway around KMSP", () => {
    const runway = getNearestRunway({
      latitude: 44.885,
      longitude: -93.222
    }, KMSP_AIRPORT);

    expect(runway).not.toBeNull();
  });

  it("computes runway wind assessments", () => {
    const assessments = assessRunwayWind(KMSP_AIRPORT, {
      airportIcao: "KMSP",
      source: "manual",
      observedAt: Date.now(),
      metarText: "KMSP 18010KT",
      windDirectionDegrees: 180,
      windSpeedKnots: 10,
      windGustKnots: null
    });

    expect(assessments).toHaveLength(KMSP_AIRPORT.runways.length);
  });
});
