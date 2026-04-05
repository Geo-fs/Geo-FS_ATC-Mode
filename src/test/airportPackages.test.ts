import { describe, expect, it } from "vitest";
import { AIRPORT_PACKAGES, getAirportPackageByIcao } from "../domain/airports/packages";

describe("airport packages", () => {
  it("registers KMSP as a package", () => {
    expect(AIRPORT_PACKAGES.length).toBeGreaterThan(0);
    expect(getAirportPackageByIcao("KMSP")?.airport.icao).toBe("KMSP");
  });

  it("ships references and surface geometry together", () => {
    const pkg = getAirportPackageByIcao("KMSP");

    expect(pkg?.references.length).toBeGreaterThan(0);
    expect(pkg?.surface.geojson.features.length).toBeGreaterThan(0);
    expect(pkg?.overlays.defaultGroundReferenceId).toBe("kmsp-airport-diagram-image");
  });
});
