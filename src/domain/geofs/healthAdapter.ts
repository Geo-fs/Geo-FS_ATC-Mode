import type { GeoFsCapabilitySnapshot, GeoFsConnectionHealth } from "../aircraft/types";

export const createGeoFsCapabilitySnapshot = (
  health: Pick<
    GeoFsConnectionHealth,
    | "updateAdapterStatus"
    | "mapAdapterStatus"
    | "chatAdapterStatus"
    | "lastBridgeEventAt"
    | "bridgeAttached"
    | "bridgeInstalled"
    | "lastUpdateRateLimitedAt"
  >
): GeoFsCapabilitySnapshot => ({
  updateParsingOk:
    (health.updateAdapterStatus === "ok" || health.updateAdapterStatus === "partial") &&
    !health.lastUpdateRateLimitedAt,
  mapParsingOk: health.mapAdapterStatus === "ok" || health.mapAdapterStatus === "partial",
  chatInjectionOk: health.chatAdapterStatus === "ok",
  bridgeHeartbeatOk: Boolean(health.bridgeAttached && health.lastBridgeEventAt),
  visibilityKnown: true
});

export const deriveGeoFsFallbacks = (health: GeoFsConnectionHealth): string[] => {
  const fallbacks: string[] = [];
  const foregroundBlocked =
    health.backgrounded ||
    (health.capabilities?.bridgeHeartbeatOk &&
      health.lastBridgeEventAt != null &&
      health.lastUpdateAt != null &&
      health.lastBridgeEventAt > health.lastUpdateAt);

  if (!health.activeGeoFsTabId) {
    fallbacks.push("no-attached-tab");
  }

  if (health.lastUpdateRateLimitedAt) {
    fallbacks.push("update-rate-limited");
  } else if (!health.capabilities?.updateParsingOk) {
    fallbacks.push("update-unsupported");
  }

  if (!health.capabilities?.mapParsingOk) {
    fallbacks.push("map-unsupported");
  }

  if (!health.capabilities?.chatInjectionOk) {
    fallbacks.push("chat-send-unavailable");
  }

  if (!health.capabilities?.bridgeHeartbeatOk) {
    fallbacks.push("bridge-heartbeat-stale");
  }

  if (health.backgrounded) {
    fallbacks.push("browser-background-throttling");
  }

  if (foregroundBlocked) {
    fallbacks.push("foreground_required_blocked");
  }

  if (health.discoveryEnabled && !health.discoveryLastFetchedAt) {
    fallbacks.push("discovery-unavailable");
  }

  if ((health.attachedGeoFsTabIds?.length ?? 0) > 1) {
    fallbacks.push("duplicate-geofs-tabs");
  }

  return fallbacks;
};
