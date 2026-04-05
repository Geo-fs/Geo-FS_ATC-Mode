import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

export const KMSP_SURFACE_GEOJSON: FeatureCollection<Geometry, GeoJsonProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "terminal", label: "Terminal 1 / 2" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-93.2228, 44.8794],
            [-93.2165, 44.8794],
            [-93.2165, 44.8826],
            [-93.2228, 44.8826],
            [-93.2228, 44.8794]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { kind: "taxiway", label: "Taxiway Core" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-93.2313, 44.8904],
          [-93.2245, 44.8858],
          [-93.2191, 44.881],
          [-93.2137, 44.8762],
          [-93.2061, 44.8699]
        ]
      }
    }
  ]
};
