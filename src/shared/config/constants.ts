export const APP_NAME = "GeoFS ATC Workspace";
export const STORAGE_SCHEMA_VERSION = 2;
export const DEFAULT_CHAT_SAFE_MAX = 85;
export const GEOFS_CHAT_HARD_MAX = 90;
export const CHAT_NEAR_LIMIT_THRESHOLD = 75;
export const GEOFS_UPDATE_EXPECTED_MS = 500;
export const GEOFS_MAP_UPDATE_MS = 10_000;
export const AIRCRAFT_HISTORY_LIMIT = 24;
export const CONTACT_STALE_MS = 15_000;
export const CONTACT_DROP_MS = 60_000;
export const DEFAULT_AIRPORT_ICAO = "KMSP";
export const DEFAULT_MAP_SYNC_GROUP = "primary";
export const DEFAULT_WORKSPACE_URL =
  typeof chrome !== "undefined" && chrome.runtime?.getURL
    ? chrome.runtime.getURL("workspace.html")
    : "workspace.html";
