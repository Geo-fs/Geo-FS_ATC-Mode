import { recommendReferenceDocuments } from "../../domain/references/attention";
import { getAirportPackageByIcao } from "../../domain/airports/packages";
import { detectTrafficConflicts } from "../../domain/aircraft/conflicts";
import {
  buildReferenceSelectionContext,
  resolveReferenceForContext,
  selectBestRenderableOverlayDocument,
  selectBestReferenceDocument
} from "../../domain/references/resolver";
import { searchReferenceDocuments } from "../../domain/references/search";
import { BUNDLED_REFERENCE_DOCUMENTS } from "../../domain/references/registry";
import { validateOutboundMessage } from "../../domain/chat/templates";
import { assessAircraftOperationalAdvisory } from "../../domain/aircraft/advisories";
import type { ReferenceDocument, ReferenceResolution, ReferenceSearchResult, ReferenceViewRole } from "../../domain/references/types";
import type { ChatMessage } from "../../domain/chat/types";
import type { WorkspaceStore } from "../store";

type FilteredContactList = WorkspaceStore["contacts"];
type FocusedAircraftEntry = {
  target: WorkspaceStore["focusTargets"][number];
  contact: NonNullable<ReturnType<typeof selectSelectedAircraft>>;
};
type AirportRoutes = NonNullable<ReturnType<typeof getAirportPackageByIcao>>["routes"];
type TrafficConflicts = ReturnType<typeof detectTrafficConflicts>;
type DiagnosticsState = {
  activeTabId: WorkspaceStore["health"]["activeGeoFsTabId"];
  attachedTabIds: number[];
  backgrounded: boolean;
  degradedReason: string | null;
  lastUpdateAt: number | null;
  lastMapAt: number | null;
  lastBridgeEventAt: number | null;
  lastChatInjectionAt: number | null;
  lastFailureAt: number | null;
  lastFailureKind: string | null;
  lastFailureSignature: string | null;
  unsupportedPayloadCount: number;
  parseFailureCount: number;
  bridgeReinstallCount: number;
  lastUpdateRateLimitedAt: number | null;
  capabilities: WorkspaceStore["health"]["capabilities"];
  activeFallbacks: string[];
  foregroundBlocked: boolean;
};

const buildContactSignature = (contact: WorkspaceStore["contacts"][number]) =>
  [
    contact.id,
    contact.callsign,
    contact.latitude.toFixed(4),
    contact.longitude.toFixed(4),
    Math.round(contact.altitudeFeet),
    Math.round(contact.headingDegrees),
    contact.grounded ? "1" : "0",
    contact.stale ? "1" : "0",
    contact.sourceAuthority ?? "",
    contact.timestamp ?? "",
    contact.aircraftInstanceId ?? ""
  ].join(":");

const buildContactListSignature = (contacts: WorkspaceStore["contacts"]) =>
  contacts.map(buildContactSignature).join("|");

const buildPinnedByRoleSignature = (
  pinnedByRole: WorkspaceStore["referenceShelf"]["pinnedByRole"]
) =>
  Object.entries(pinnedByRole)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value ?? ""}`)
    .join("|");

const buildFocusTargetsSignature = (focusTargets: WorkspaceStore["focusTargets"]) =>
  focusTargets
    .map((target) =>
      [
        target.aircraftId,
        target.mode,
        target.destinationIcao ?? "",
        target.surfaceClearance?.routeId ?? "",
        target.surfaceClearance?.activeCheckpointId ?? ""
      ].join(":")
    )
    .join("|");

let cachedSessionDocuments: WorkspaceStore["sessionDocuments"] | null = null;
let cachedAllReferenceDocuments: ReferenceDocument[] = [...BUNDLED_REFERENCE_DOCUMENTS];

export const selectAllReferenceDocuments = (state: WorkspaceStore): ReferenceDocument[] => {
  if (cachedSessionDocuments === state.sessionDocuments) {
    return cachedAllReferenceDocuments;
  }

  cachedSessionDocuments = state.sessionDocuments;
  cachedAllReferenceDocuments = [...BUNDLED_REFERENCE_DOCUMENTS, ...state.sessionDocuments];
  return cachedAllReferenceDocuments;
};

let cachedFilteredContactsKey = "";
let cachedFilteredContacts: FilteredContactList = [];

export const selectFilteredContacts = (state: WorkspaceStore): FilteredContactList => {
  const airport = state.activeAirport;
  const foregroundBlocked = state.health.activeFallbacks?.includes("foreground_required_blocked") ?? false;
  const cacheKey = [
    buildContactListSignature(state.contacts),
    buildContactListSignature(state.discoveryContacts),
    buildFocusTargetsSignature(state.focusTargets),
    airport.icao,
    state.filters.callsignQuery,
    state.filters.groundedOnly,
    state.filters.airborneOnly,
    state.filters.activeOnly,
    state.filters.focusedOnly,
    state.filters.maxRangeNm,
    state.settings.hideBlankCallsigns,
    state.settings.hideFooCallsigns,
    state.settings.hideNullAcid,
    foregroundBlocked
  ]
    .map((value) => String(value))
    .join("|");

  if (cacheKey === cachedFilteredContactsKey) {
    return cachedFilteredContacts;
  }

  cachedFilteredContactsKey = cacheKey;
  cachedFilteredContacts = [...state.contacts, ...state.discoveryContacts].filter((contact) => {
    if (state.settings.hideBlankCallsigns && !contact.callsign.trim()) {
      return false;
    }

    if (state.settings.hideFooCallsigns && contact.callsign.toLowerCase() === "foo") {
      return false;
    }

    if (state.settings.hideNullAcid && !contact.aircraftInstanceId) {
      return false;
    }

    if (
      state.filters.callsignQuery &&
      !contact.callsign.toLowerCase().includes(state.filters.callsignQuery.toLowerCase())
    ) {
      return false;
    }

    if (state.filters.groundedOnly && !contact.grounded) {
      return false;
    }

    if (state.filters.airborneOnly && contact.grounded) {
      return false;
    }

    if (state.filters.activeOnly && contact.stale && !foregroundBlocked) {
      return false;
    }

    if (
      state.filters.focusedOnly &&
      !state.focusTargets.some((target) => target.aircraftId === contact.id)
    ) {
      return false;
    }

    const deltaLat = Math.abs(contact.latitude - airport.latitude);
    const deltaLon = Math.abs(contact.longitude - airport.longitude);
    const roughRangeNm = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon) * 60;
    return roughRangeNm <= state.filters.maxRangeNm;
  });
  return cachedFilteredContacts;
};

export const selectSelectedAircraft = (state: WorkspaceStore) =>
  [...state.contacts, ...state.discoveryContacts].find((contact) => contact.id === state.selectedAircraftId) ?? null;

let cachedFocusedAircraftKey = "";
let cachedFocusedAircraft: FocusedAircraftEntry[] = [];

export const selectFocusedAircraft = (state: WorkspaceStore): FocusedAircraftEntry[] => {
  const cacheKey = [
    buildFocusTargetsSignature(state.focusTargets),
    buildContactListSignature(state.contacts),
    buildContactListSignature(state.discoveryContacts)
  ].join("|");
  if (cacheKey === cachedFocusedAircraftKey) {
    return cachedFocusedAircraft;
  }

  cachedFocusedAircraftKey = cacheKey;
  cachedFocusedAircraft = state.focusTargets
    .map((target) => ({
      target,
      contact:
        [...state.contacts, ...state.discoveryContacts].find((contact) => contact.id === target.aircraftId) ??
        null
    }))
    .filter((item) => item.contact !== null) as FocusedAircraftEntry[];
  return cachedFocusedAircraft;
};

let cachedComposerMetaKey = "";
let cachedComposerMeta: {
  remaining: number;
  valid: boolean;
  preview: ChatMessage;
} | null = null;

export const selectComposerMeta = (state: WorkspaceStore): {
  remaining: number;
  valid: boolean;
  preview: ChatMessage;
} => {
  const cacheKey = `${state.composerValue}|${state.settings.chatSafeMax}`;
  if (cacheKey === cachedComposerMetaKey && cachedComposerMeta) {
    return cachedComposerMeta;
  }

  const validation = validateOutboundMessage(state.composerValue, state.settings.chatSafeMax);
  cachedComposerMetaKey = cacheKey;
  cachedComposerMeta = {
    remaining: validation.remaining,
    valid: validation.ok,
    preview: {
      id: "preview",
      direction: "outbound",
      timestamp: 0,
      callsign: "ATC",
      message: state.composerValue,
      deliveryState: "queued"
    }
  };
  return cachedComposerMeta;
};

export const selectActiveReferenceDocument = (state: WorkspaceStore): ReferenceDocument | null =>
  selectAllReferenceDocuments(state).find(
    (document) => document.id === state.referenceShelf.activeDocumentId
  ) ?? null;

let cachedReferenceSearchDocuments: ReferenceDocument[] | null = null;
let cachedReferenceSearchQuery = "";
let cachedReferenceSearchResults: ReferenceSearchResult[] = [];

export const selectReferenceSearchResults = (state: WorkspaceStore): ReferenceSearchResult[] => {
  const documents = selectAllReferenceDocuments(state);
  if (cachedReferenceSearchDocuments === documents && cachedReferenceSearchQuery === state.referenceQuery) {
    return cachedReferenceSearchResults;
  }

  cachedReferenceSearchDocuments = documents;
  cachedReferenceSearchQuery = state.referenceQuery;
  cachedReferenceSearchResults = searchReferenceDocuments(documents, state.referenceQuery);
  return cachedReferenceSearchResults;
};

const buildStoreReferenceContext = (state: WorkspaceStore, role: ReferenceViewRole) => {
  const selectedAircraft = selectSelectedAircraft(state);
  const selectedFocusTarget = state.focusTargets.find(
    (target) => target.aircraftId === state.selectedAircraftId
  );

  return buildReferenceSelectionContext({
    airportIcao: state.activeAirport.icao,
    selectedAircraftGrounded: Boolean(selectedAircraft?.grounded),
    hasSelectedAircraft: Boolean(selectedAircraft),
    focusModes: state.focusTargets.map((target) => target.mode),
    hasWeather: Boolean(state.weather),
    destinationIcao: selectedFocusTarget?.destinationIcao ?? null,
    role
  });
};

let cachedRecommendedDocsKey = "";
let cachedRecommendedDocs: ReferenceDocument[] = [];

export const selectRecommendedReferenceDocuments = (state: WorkspaceStore): ReferenceDocument[] => {
  const documents = selectAllReferenceDocuments(state);
  const selectedAircraft = selectSelectedAircraft(state);
  const cacheKey = [
    documents.map((document) => document.id).join("|"),
    state.activeAirport.icao,
    selectedAircraft ? buildContactSignature(selectedAircraft) : "",
    buildFocusTargetsSignature(state.focusTargets),
    Boolean(state.weather)
  ]
    .join("|");

  if (cacheKey === cachedRecommendedDocsKey) {
    return cachedRecommendedDocs;
  }

  cachedRecommendedDocsKey = cacheKey;
  cachedRecommendedDocs = recommendReferenceDocuments({
    documents,
    airport: state.activeAirport,
    selectedAircraft,
    focusTargets: state.focusTargets,
    hasWeather: Boolean(state.weather)
  });
  return cachedRecommendedDocs;
};

const cachedResolutionByKey = new Map<string, ReferenceResolution | null>();

export const selectReferenceResolutionForRole = (
  state: WorkspaceStore,
  role: ReferenceViewRole
): ReferenceResolution | null => {
  const documents = selectAllReferenceDocuments(state);
  const context = buildStoreReferenceContext(state, role);
  const cacheKey = JSON.stringify({
    role,
    documentIds: documents.map((document) => document.id),
    context,
    pinnedByRole: buildPinnedByRoleSignature(state.referenceShelf.pinnedByRole)
  });

  if (cachedResolutionByKey.has(cacheKey)) {
    return cachedResolutionByKey.get(cacheKey) ?? null;
  }

  const resolution = resolveReferenceForContext(documents, context, state.referenceShelf.pinnedByRole);
  cachedResolutionByKey.set(cacheKey, resolution);
  return resolution;
};

const cachedOverlayByKey = new Map<string, ReferenceDocument | null>();

export const selectRenderableOverlayReferenceForRole = (
  state: WorkspaceStore,
  role: ReferenceViewRole
): ReferenceDocument | null => {
  const documents = selectAllReferenceDocuments(state);
  const context = buildStoreReferenceContext(state, role);
  const cacheKey = JSON.stringify({
    role,
    documentIds: documents.map((document) => document.id),
    context,
    pinnedByRole: buildPinnedByRoleSignature(state.referenceShelf.pinnedByRole)
  });

  if (cachedOverlayByKey.has(cacheKey)) {
    return cachedOverlayByKey.get(cacheKey) ?? null;
  }

  const overlayReference = selectBestRenderableOverlayDocument(
    documents,
    context,
    state.referenceShelf.pinnedByRole
  );
  cachedOverlayByKey.set(cacheKey, overlayReference);
  return overlayReference;
};

export const selectOperationalAdvisories = (state: WorkspaceStore) =>
  selectFilteredContacts(state).map((contact) => ({
    contactId: contact.id,
    advisory: assessAircraftOperationalAdvisory(
      contact,
      state.activeAirport,
      state.weather,
      state.focusTargets.find((target) => target.aircraftId === contact.id) ?? null
    )
  }));

let cachedAirportRoutesIcao = "";
let cachedAirportRoutes: AirportRoutes = [];

export const selectAirportRoutes = (state: WorkspaceStore): AirportRoutes => {
  if (cachedAirportRoutesIcao === state.activeAirport.icao) {
    return cachedAirportRoutes;
  }

  cachedAirportRoutesIcao = state.activeAirport.icao;
  cachedAirportRoutes = getAirportPackageByIcao(state.activeAirport.icao)?.routes ?? [];
  return cachedAirportRoutes;
};

let cachedTrafficConflictsKey = "";
let cachedTrafficConflicts: TrafficConflicts = [];

export const selectTrafficConflicts = (state: WorkspaceStore): TrafficConflicts => {
  const contacts = selectFilteredContacts(state);
  const cacheKey = [buildContactListSignature(contacts), state.activeAirport.icao].join("|");
  if (cacheKey === cachedTrafficConflictsKey) {
    return cachedTrafficConflicts;
  }

  cachedTrafficConflictsKey = cacheKey;
  cachedTrafficConflicts = detectTrafficConflicts(contacts, state.activeAirport);
  return cachedTrafficConflicts;
};

let cachedConflictMapKey = "";
let cachedConflictMap = new Map<string, TrafficConflicts>();

export const selectConflictByContactId = (state: WorkspaceStore): Map<string, TrafficConflicts> => {
  const conflicts = selectTrafficConflicts(state);
  const contacts = selectFilteredContacts(state);
  const cacheKey = [
    buildContactListSignature(contacts),
    conflicts.map((conflict) => `${conflict.id}:${conflict.severity}:${conflict.involvedContactIds.join(",")}`).join("|")
  ].join("|");
  if (cacheKey === cachedConflictMapKey) {
    return cachedConflictMap;
  }

  cachedConflictMapKey = cacheKey;
  cachedConflictMap = new Map(
    contacts.map((contact) => [
      contact.id,
      conflicts.filter((conflict) => conflict.involvedContactIds.includes(contact.id))
    ])
  );
  return cachedConflictMap;
};

export const selectRecommendedRoleReference = (
  state: WorkspaceStore,
  role: ReferenceViewRole
): ReferenceDocument | null =>
  selectBestReferenceDocument(
    selectAllReferenceDocuments(state),
    buildStoreReferenceContext(state, role),
    state.referenceShelf.pinnedByRole
  );

let cachedDiagnosticsSignature = "";
let cachedDiagnosticsState: DiagnosticsState | null = null;

export const selectDiagnosticsState = (state: WorkspaceStore): DiagnosticsState => {
  const diagnosticsSignature = JSON.stringify({
    activeTabId: state.health.activeGeoFsTabId,
    attachedTabIds: state.health.attachedGeoFsTabIds ?? [],
    backgrounded: state.health.backgrounded,
    degradedReason: state.health.degradedReason ?? null,
    lastUpdateAt: state.health.lastUpdateAt,
    lastMapAt: state.health.lastMapAt,
    lastBridgeEventAt: state.health.lastBridgeEventAt ?? null,
    lastChatInjectionAt: state.health.lastChatInjectionAt ?? null,
    lastUpdateRateLimitedAt: state.health.lastUpdateRateLimitedAt ?? null,
    lastFailureAt: state.health.lastFailureAt ?? null,
    lastFailureKind: state.health.lastFailureKind ?? null,
    lastFailureSignature: state.health.lastFailureSignature ?? null,
    unsupportedPayloadCount: state.health.unsupportedPayloadCount ?? 0,
    parseFailureCount: state.health.parseFailureCount ?? 0,
    bridgeReinstallCount: state.health.bridgeReinstallCount ?? 0,
    capabilities: state.health.capabilities,
    activeFallbacks: state.health.activeFallbacks ?? []
  });
  if (cachedDiagnosticsSignature === diagnosticsSignature && cachedDiagnosticsState) {
    return cachedDiagnosticsState;
  }

  cachedDiagnosticsSignature = diagnosticsSignature;
  cachedDiagnosticsState = {
    activeTabId: state.health.activeGeoFsTabId,
    attachedTabIds: state.health.attachedGeoFsTabIds ?? [],
    backgrounded: state.health.backgrounded,
    degradedReason: state.health.degradedReason ?? null,
    lastUpdateAt: state.health.lastUpdateAt,
    lastMapAt: state.health.lastMapAt,
    lastBridgeEventAt: state.health.lastBridgeEventAt ?? null,
    lastChatInjectionAt: state.health.lastChatInjectionAt ?? null,
    lastUpdateRateLimitedAt: state.health.lastUpdateRateLimitedAt ?? null,
    lastFailureAt: state.health.lastFailureAt ?? null,
    lastFailureKind: state.health.lastFailureKind ?? null,
    lastFailureSignature: state.health.lastFailureSignature ?? null,
    unsupportedPayloadCount: state.health.unsupportedPayloadCount ?? 0,
    parseFailureCount: state.health.parseFailureCount ?? 0,
    bridgeReinstallCount: state.health.bridgeReinstallCount ?? 0,
    capabilities: state.health.capabilities,
    activeFallbacks: state.health.activeFallbacks ?? [],
    foregroundBlocked: state.health.activeFallbacks?.includes("foreground_required_blocked") ?? false
  };
  return cachedDiagnosticsState;
};

export const selectChatDeliveryMode = (state: WorkspaceStore) =>
  state.health.activeGeoFsTabId != null &&
  state.health.capabilities?.chatInjectionOk &&
  !state.health.activeFallbacks?.includes("update-rate-limited") &&
  !state.health.activeFallbacks?.includes("foreground_required_blocked")
    ? "direct"
    : state.settings.copyOnlyFallback
      ? "copy_only"
      : "unavailable";
