import { describe, expect, it } from "vitest";
import { deriveGeoFsFallbacks } from "../domain/geofs/healthAdapter";
import { selectChatDeliveryMode, selectDiagnosticsState, selectFilteredContacts } from "../app/store/selectors";
import type { AircraftContact, GeoFsConnectionHealth } from "../domain/aircraft/types";
import type { WorkspaceStore } from "../app/store";

const createHealth = (patch: Partial<GeoFsConnectionHealth> = {}): GeoFsConnectionHealth => ({
  activeGeoFsTabId: 7,
  attachedGeoFsTabIds: [7],
  contentAttached: true,
  bridgeAttached: true,
  bridgeInstalled: true,
  bridgeCapturingTraffic: true,
  lastUpdateAt: 1_000,
  lastMapAt: 1_000,
  lastHeartbeatAt: 1_000,
  lastBridgeEventAt: 1_100,
  lastChatSendAt: null,
  lastChatInjectionAt: 1_000,
  lastBridgeInstallAt: 900,
  lastBridgeReinjectAt: null,
  lastAttachmentSwitchAt: null,
  updateCadenceMs: 1_000,
  updateJitterMs: 0,
  backgrounded: false,
  degradedReason: undefined,
  discoveryLastFetchedAt: 1_000,
  discoveryEnabled: false,
  updateAdapterStatus: "ok",
  mapAdapterStatus: "ok",
  chatAdapterStatus: "ok",
  capabilities: {
    updateParsingOk: true,
    mapParsingOk: true,
    chatInjectionOk: true,
    bridgeHeartbeatOk: true,
    visibilityKnown: true
  },
  unsupportedPayloadCount: 0,
  parseFailureCount: 0,
  bridgeReinstallCount: 0,
  lastUpdateRateLimitedAt: null,
  lastFailureAt: null,
  lastFailureKind: null,
  lastFailureSignature: null,
  activeFallbacks: [],
  ...patch
});

const createContact = (patch: Partial<AircraftContact> = {}): AircraftContact => ({
  id: "ac1",
  aircraftInstanceId: "ac1",
  aircraftCode: 1,
  callsign: "DAL123",
  latitude: 44.88,
  longitude: -93.22,
  altitudeFeet: 3000,
  headingDegrees: 180,
  pitchDegrees: 0,
  rollDegrees: 0,
  grounded: false,
  speedLike: 180,
  timestamp: 1_000,
  receivedAt: 1_000,
  stale: true,
  history: [],
  sourceAuthority: "local_authoritative",
  ...patch
});

const createState = (patch: Partial<WorkspaceStore> = {}): WorkspaceStore =>
  ({
    contacts: [createContact()],
    discoveryContacts: [],
    chatLog: [],
    focusTargets: [],
    selectedAircraftId: null,
    weather: null,
    activeAirport: {
      icao: "KMSP",
      name: "Minneapolis-St Paul International",
      city: "Minneapolis",
      latitude: 44.8848,
      longitude: -93.2223,
      fieldElevationFeet: 841,
      runways: []
    },
    filters: {
      callsignQuery: "",
      maxRangeNm: 60,
      groundedOnly: false,
      airborneOnly: false,
      activeOnly: true,
      focusedOnly: false
    },
    mapPanels: [],
    layout: { activePresetId: "ops", presets: [], layouts: [] },
    templates: [],
    phrasePacks: [],
    controllerProfiles: [],
    activeProfileId: "default",
    clearanceDraft: null,
    referenceShelf: {
      activeDocumentId: null,
      favoriteDocumentIds: [],
      pinnedDocumentIds: [],
      pinnedByRole: {},
      notesByDocumentId: {}
    },
    airportPreferences: { selectedAirportIcao: "KMSP" },
    settings: {
      chatSafeMax: 72,
      copyOnlyFallback: true,
      hideBlankCallsigns: false,
      hideFooCallsigns: false,
      hideNullAcid: false,
      discoveryEnabled: false
    },
    recentDestinations: [],
    health: createHealth({
      activeFallbacks: ["foreground_required_blocked"],
      backgrounded: true,
      capabilities: {
        updateParsingOk: true,
        mapParsingOk: true,
        chatInjectionOk: false,
        bridgeHeartbeatOk: true,
        visibilityKnown: true
      }
    }),
    initialized: true,
    statusMessage: null,
    composerValue: "Test",
    targetCallsign: "",
    referenceQuery: "",
    sessionDocuments: [],
    initialize: async () => undefined,
    setSelectedAircraft: () => undefined,
    setComposerValue: () => undefined,
    setTargetCallsign: () => undefined,
    sendChat: async () => undefined,
    toggleFocus: async () => undefined,
    assignDestination: async () => undefined,
    updateSurfaceClearance: async () => undefined,
    saveLayout: async () => undefined,
    activatePreset: async () => undefined,
    saveFilters: async () => undefined,
    saveMapPanels: async () => undefined,
    saveTemplates: async () => undefined,
    savePhrasePacks: async () => undefined,
    saveSettings: async () => undefined,
    saveControllerProfiles: async () => undefined,
    activateControllerProfile: async () => undefined,
    exportActiveControllerProfile: async () => undefined,
    importControllerProfiles: async () => undefined,
    setAirport: async () => undefined,
    openControllerWindow: async () => undefined,
    setReferenceQuery: () => undefined,
    selectReferenceDocument: async () => undefined,
    toggleReferenceFavorite: async () => undefined,
    toggleReferencePin: async () => undefined,
    pinReferenceToRole: async () => undefined,
    saveReferenceNote: async () => undefined,
    importReferenceFiles: async () => undefined,
    openBestReferenceForRole: async () => undefined,
    setClearanceDraft: () => undefined,
    buildClearanceMessage: () => undefined,
    ...patch
  }) as WorkspaceStore;

describe("foreground fallback handling", () => {
  it("marks focus loss as a distinct GeoFS fallback", () => {
    const fallbacks = deriveGeoFsFallbacks(createHealth({ backgrounded: true }));
    expect(fallbacks).toContain("foreground_required_blocked");
    expect(fallbacks).toContain("browser-background-throttling");
  });

  it("keeps stale local contacts visible while foreground is blocked", () => {
    const contacts = selectFilteredContacts(createState());
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.stale).toBe(true);
  });

  it("forces chat into copy-only mode while foreground is blocked", () => {
    const state = createState();
    expect(selectChatDeliveryMode(state)).toBe("copy_only");
    expect(selectDiagnosticsState(state).foregroundBlocked).toBe(true);
  });

  it("surfaces /update throttling as a dedicated fallback", () => {
    const health = createHealth({
      updateAdapterStatus: "upstream_unavailable",
      lastUpdateRateLimitedAt: 2_000,
      capabilities: {
        updateParsingOk: false,
        mapParsingOk: true,
        chatInjectionOk: true,
        bridgeHeartbeatOk: true,
        visibilityKnown: true
      }
    });

    const fallbacks = deriveGeoFsFallbacks(health);
    expect(fallbacks).toContain("update-rate-limited");
    expect(fallbacks).not.toContain("update-unsupported");
  });

  it("returns a stable diagnostics object for unchanged health state", () => {
    const state = createState({
      health: createHealth()
    });

    const first = selectDiagnosticsState(state);
    const second = selectDiagnosticsState({
      ...state,
      health: { ...state.health }
    });

    expect(second).toBe(first);
  });
});
