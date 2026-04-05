export interface RunwayDefinition {
  id: string;
  airportIcao: string;
  name: string;
  headingDegrees: number;
  reciprocalHeadingDegrees: number;
  lengthFeet: number;
  widthFeet: number;
  thresholdA: [number, number];
  thresholdB: [number, number];
  midpoint: [number, number];
  surface: "asphalt" | "concrete" | "unknown";
}

export interface TaxiCheckpoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  kind: "gate" | "intersection" | "hold_short" | "crossing";
  runwayId?: string | null;
}

export interface TaxiRouteSegment {
  id: string;
  label: string;
  coordinates: Array<[number, number]>;
  instruction: string;
  checkpointId?: string | null;
}

export interface TaxiRoute {
  id: string;
  airportIcao: string;
  label: string;
  departureRunwayId?: string | null;
  checkpoints: TaxiCheckpoint[];
  segments: TaxiRouteSegment[];
}

export interface AirportDefinition {
  icao: string;
  iata?: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  elevationFeet: number;
  runways: RunwayDefinition[];
}

export interface RunwayWindAssessment {
  runwayId: string;
  headwindComponent: number;
  crosswindComponent: number;
  favored: boolean;
}
