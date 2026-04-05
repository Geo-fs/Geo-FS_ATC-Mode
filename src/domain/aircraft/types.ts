export interface AircraftTrackSample {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitudeFeet: number;
  headingDegrees: number;
  speedLike: number | null;
}

export interface AircraftTrend {
  direction: "climb" | "descend" | "level" | "accelerating" | "decelerating" | "steady" | "turning-left" | "turning-right";
  delta: number;
}

export interface AircraftContact {
  id: string;
  aircraftInstanceId: string | null;
  aircraftCode: number | null;
  callsign: string;
  latitude: number;
  longitude: number;
  altitudeFeet: number;
  headingDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  grounded: boolean;
  speedLike: number | null;
  timestamp: number | null;
  receivedAt: number;
  lastChatAt?: number;
  stale: boolean;
  history: AircraftTrackSample[];
  headingTrend?: AircraftTrend;
  altitudeTrend?: AircraftTrend;
  speedTrend?: AircraftTrend;
  sourceAuthority?: "local_authoritative" | "regional_advisory";
}

export interface TrafficSnapshot {
  serverTime: number | null;
  userCount: number;
  contacts: AircraftContact[];
  source: "update" | "map";
}

export type GeoFsAdapterStatus = "ok" | "partial" | "unsupported_shape" | "upstream_unavailable";

export interface GeoFsCapabilitySnapshot {
  updateParsingOk: boolean;
  mapParsingOk: boolean;
  chatInjectionOk: boolean;
  bridgeHeartbeatOk: boolean;
  visibilityKnown: boolean;
}

export interface GeoFsConnectionHealth {
  activeGeoFsTabId: number | null;
  attachedGeoFsTabIds?: number[];
  contentAttached: boolean;
  bridgeAttached: boolean;
  bridgeInstalled?: boolean;
  bridgeCapturingTraffic?: boolean;
  lastUpdateAt: number | null;
  lastMapAt: number | null;
  lastHeartbeatAt: number | null;
  lastBridgeEventAt?: number | null;
  lastChatSendAt: number | null;
  lastChatInjectionAt?: number | null;
  lastBridgeInstallAt?: number | null;
  lastBridgeReinjectAt?: number | null;
  lastAttachmentSwitchAt?: number | null;
  updateCadenceMs: number | null;
  updateJitterMs: number | null;
  backgrounded: boolean;
  degradedReason?: string;
  discoveryLastFetchedAt?: number | null;
  discoveryEnabled?: boolean;
  updateAdapterStatus?: GeoFsAdapterStatus;
  mapAdapterStatus?: GeoFsAdapterStatus;
  chatAdapterStatus?: GeoFsAdapterStatus;
  capabilities?: GeoFsCapabilitySnapshot;
  unsupportedPayloadCount?: number;
  parseFailureCount?: number;
  bridgeReinstallCount?: number;
  lastUpdateRateLimitedAt?: number | null;
  lastFailureAt?: number | null;
  lastFailureKind?: string | null;
  lastFailureSignature?: string | null;
  activeFallbacks?: string[];
}
