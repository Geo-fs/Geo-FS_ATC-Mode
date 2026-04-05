import { describe, expect, it } from "vitest";
import { AircraftTracker, normalizeGeoFsUser } from "../domain/aircraft/tracker";
import type { TrafficSnapshot } from "../domain/aircraft/types";

describe("aircraft tracker", () => {
  it("normalizes valid GeoFS users", () => {
    const contact = normalizeGeoFsUser({
      id: "1",
      acid: 22,
      ac: 16,
      cs: "DAL123",
      co: [44.8, -93.2, 5000, 120, 0, 0],
      st: { gr: 0, as: 180 },
      ti: 1000
    });

    expect(contact?.callsign).toBe("DAL123");
    expect(contact?.grounded).toBe(false);
    expect(contact?.speedLike).toBe(180);
  });

  it("adds history across snapshots", () => {
    const tracker = new AircraftTracker();
    const snapshot: TrafficSnapshot = {
      serverTime: 123,
      userCount: 1,
      source: "update",
      contacts: [
        normalizeGeoFsUser({
          id: "1",
          acid: 22,
          ac: 16,
          cs: "DAL123",
          co: [44.8, -93.2, 5000, 120, 0, 0],
          st: { gr: 0, as: 180 },
          ti: 1000
        })!
      ]
    };

    tracker.upsertFromSnapshot(snapshot);
    tracker.upsertFromSnapshot({
      ...snapshot,
      contacts: [
        {
          ...snapshot.contacts[0],
          altitudeFeet: 5500,
          headingDegrees: 140
        }
      ]
    });

    expect(tracker.getContacts()[0]?.history.length).toBe(2);
  });
});
