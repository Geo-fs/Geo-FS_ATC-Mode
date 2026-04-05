import { KMSP_AIRPORT } from "./kmsp";
import { KMSP_SURFACE_GEOJSON } from "../maps/kmspSurface";
import { BUNDLED_REFERENCE_DOCUMENTS } from "../references/registry";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { AirportDefinition, TaxiRoute } from "./types";
import type { ReferenceDocument } from "../references/types";
import { KSTP_AIRPORT } from "./kstp";

export interface AirportPackage {
  airport: AirportDefinition;
  references: ReferenceDocument[];
  overlays: {
    defaultGroundReferenceId?: string;
  };
  surface: {
    geojson: FeatureCollection<Geometry, GeoJsonProperties>;
  };
  routes: TaxiRoute[];
  operations: {
    primaryPreset: "approach" | "tower" | "ground" | "chartops";
  };
}

const KMSP_REFERENCE_IDS = new Set([
  "kmsp-airport-diagram-pdf",
  "kmsp-airport-diagram-image",
  "kmsp-tac-pdf",
  "kmsp-airspace-chart-image",
  "faa-atc-phraseology-reference",
  "faa-surface-ops-reference"
]);

export const KMSP_AIRPORT_PACKAGE: AirportPackage = {
  airport: KMSP_AIRPORT,
  references: BUNDLED_REFERENCE_DOCUMENTS.filter(
    (document) => document.airportIcao === "KMSP" || KMSP_REFERENCE_IDS.has(document.id)
  ),
  overlays: {
    defaultGroundReferenceId: "kmsp-airport-diagram-image"
  },
  surface: {
    geojson: KMSP_SURFACE_GEOJSON
  },
  routes: [
    {
      id: "kmsp-t1-12r",
      airportIcao: "KMSP",
      label: "T1 to 12R",
      departureRunwayId: "12R/30L",
      checkpoints: [
        { id: "t1-ramp", label: "T1 Ramp", latitude: 44.8804, longitude: -93.2215, kind: "gate" },
        { id: "hold-12r", label: "Hold Short 12R", latitude: 44.8858, longitude: -93.2245, kind: "hold_short", runwayId: "12R/30L" },
        { id: "cross-17", label: "Cross 17/35", latitude: 44.8926, longitude: -93.2219, kind: "crossing", runwayId: "17/35" }
      ],
      segments: [
        {
          id: "t1-a",
          label: "Alpha",
          coordinates: [
            [-93.2215, 44.8804],
            [-93.2245, 44.8858]
          ],
          instruction: "Taxi via Alpha to hold short 12R.",
          checkpointId: "hold-12r"
        },
        {
          id: "cross-17",
          label: "Cross 17/35",
          coordinates: [
            [-93.2245, 44.8858],
            [-93.2219, 44.8926]
          ],
          instruction: "Cross runway 17/35 when cleared.",
          checkpointId: "cross-17"
        }
      ]
    },
    {
      id: "kmsp-t1-17",
      airportIcao: "KMSP",
      label: "T1 to 17",
      departureRunwayId: "17/35",
      checkpoints: [
        { id: "t1-ramp-17", label: "T1 Ramp", latitude: 44.8804, longitude: -93.2215, kind: "gate" },
        { id: "hold-17", label: "Hold Short 17", latitude: 44.8974, longitude: -93.2215, kind: "hold_short", runwayId: "17/35" }
      ],
      segments: [
        {
          id: "northbound-core",
          label: "Core Taxi",
          coordinates: [
            [-93.2215, 44.8804],
            [-93.2215, 44.8974]
          ],
          instruction: "Taxi northbound to hold short 17/35.",
          checkpointId: "hold-17"
        }
      ]
    }
  ],
  operations: {
    primaryPreset: "approach"
  }
};

const KSTP_REFERENCE_IDS = new Set([
  "faa-atc-phraseology-reference",
  "faa-surface-ops-reference"
]);

export const KSTP_AIRPORT_PACKAGE: AirportPackage = {
  airport: KSTP_AIRPORT,
  references: BUNDLED_REFERENCE_DOCUMENTS.filter(
    (document) => document.airportIcao === "KSTP" || KSTP_REFERENCE_IDS.has(document.id)
  ),
  overlays: {},
  surface: {
    geojson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { kind: "terminal", label: "STP Terminal" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-93.0624, 44.9408],
                [-93.0592, 44.9408],
                [-93.0592, 44.9422],
                [-93.0624, 44.9422],
                [-93.0624, 44.9408]
              ]
            ]
          }
        },
        {
          type: "Feature",
          properties: { kind: "taxiway", label: "Taxiway A" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-93.0617, 44.9412],
              [-93.0584, 44.9425],
              [-93.0549, 44.944]
            ]
          }
        }
      ]
    }
  },
  routes: [
    {
      id: "kstp-terminal-14",
      airportIcao: "KSTP",
      label: "Terminal to 14",
      departureRunwayId: "14/32",
      checkpoints: [
        { id: "kstp-term", label: "Terminal", latitude: 44.9414, longitude: -93.0614, kind: "gate" },
        { id: "kstp-hold-14", label: "Hold Short 14", latitude: 44.9436, longitude: -93.0561, kind: "hold_short", runwayId: "14/32" }
      ],
      segments: [
        {
          id: "kstp-a",
          label: "Taxiway A",
          coordinates: [
            [-93.0614, 44.9414],
            [-93.0561, 44.9436]
          ],
          instruction: "Taxi via Alpha to hold short runway 14.",
          checkpointId: "kstp-hold-14"
        }
      ]
    }
  ],
  operations: {
    primaryPreset: "tower"
  }
};

export const AIRPORT_PACKAGES: AirportPackage[] = [KMSP_AIRPORT_PACKAGE, KSTP_AIRPORT_PACKAGE];

export const getAirportPackageByIcao = (icao: string): AirportPackage | undefined =>
  AIRPORT_PACKAGES.find((pkg) => pkg.airport.icao === icao.toUpperCase());
