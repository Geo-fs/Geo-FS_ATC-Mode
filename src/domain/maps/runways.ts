import type { FeatureCollection, GeoJsonProperties, LineString } from "geojson";
import type { AirportDefinition } from "../airports/types";

export const buildAirportRunwayGeoJson = (
  airport: AirportDefinition
): FeatureCollection<LineString, GeoJsonProperties> => ({
  type: "FeatureCollection",
  features: airport.runways.map((runway) => ({
    type: "Feature",
    properties: {
      id: runway.id,
      label: runway.name,
      kind: "runway"
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [runway.thresholdA[1], runway.thresholdA[0]],
        [runway.thresholdB[1], runway.thresholdB[0]]
      ]
    }
  }))
});
