import { describe, expect, it } from "vitest";
import { assessAircraftOperationalAdvisory } from "../domain/aircraft/advisories";
import { KMSP_AIRPORT } from "../domain/airports/kmsp";

describe("operational advisories", () => {
  it("flags stale contacts as warning", () => {
    const advisory = assessAircraftOperationalAdvisory(
      {
        id: "ac1",
        aircraftInstanceId: "inst",
        aircraftCode: null,
        callsign: "DAL123",
        latitude: 44.89,
        longitude: -93.22,
        altitudeFeet: 3200,
        headingDegrees: 120,
        pitchDegrees: 0,
        rollDegrees: 0,
        grounded: false,
        speedLike: 160,
        timestamp: Date.now(),
        receivedAt: Date.now(),
        stale: true,
        history: []
      },
      KMSP_AIRPORT,
      {
        source: "manual",
        airportIcao: "KMSP",
        metarText: "",
        windDirectionDegrees: 130,
        windSpeedKnots: 10,
        windGustKnots: null,
        observedAt: Date.now()
      }
    );

    expect(advisory.alert?.severity).toBe("warning");
    expect(advisory.flow).toBe("arrival");
  });

  it("identifies surface movement and runway suggestions", () => {
    const advisory = assessAircraftOperationalAdvisory(
      {
        id: "ac2",
        aircraftInstanceId: "inst",
        aircraftCode: null,
        callsign: "AAL456",
        latitude: 44.8837,
        longitude: -93.221,
        altitudeFeet: 840,
        headingDegrees: 120,
        pitchDegrees: 0,
        rollDegrees: 0,
        grounded: true,
        speedLike: 14,
        timestamp: Date.now(),
        receivedAt: Date.now(),
        stale: false,
        history: []
      },
      KMSP_AIRPORT,
      {
        source: "manual",
        airportIcao: "KMSP",
        metarText: "",
        windDirectionDegrees: 120,
        windSpeedKnots: 12,
        windGustKnots: null,
        observedAt: Date.now()
      },
      { aircraftId: "ac2", color: "#fff", mode: "ground", pinnedAt: Date.now(), destinationIcao: "KMSP" }
    );

    expect(advisory.flow).toBe("surface");
    expect(advisory.movementState).toBe("taxi");
    expect(advisory.suggestedRunwayId).toBeTruthy();
  });
});
