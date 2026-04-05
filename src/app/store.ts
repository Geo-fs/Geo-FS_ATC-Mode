import { create } from "zustand";
import { getAirportByIcao, getDefaultAirport } from "../domain/airports/airports";
import { buildClearanceFromDraft, DEFAULT_LINKED_PHRASE_PACKS, DEFAULT_MESSAGE_TEMPLATES } from "../domain/chat/templates";
import { BUNDLED_REFERENCE_DOCUMENTS } from "../domain/references/registry";
import { buildReferenceSelectionContext, selectBestReferenceDocument } from "../domain/references/resolver";
import { createDefaultWorkspaceState } from "../shared/persistence/defaults";
import { buildControllerProfileSnapshot } from "../shared/persistence/profiles";
import { createId } from "../shared/utils/id";
import { workspaceRuntime } from "./services/workspaceRuntime";
import type { AircraftContact } from "../domain/aircraft/types";
import type { AirportDefinition } from "../domain/airports/types";
import type { ChatMessage, ClearanceDraft, MessageTemplate, PhrasePack } from "../domain/chat/types";
import type { SurfaceCrossingState } from "../domain/focus/types";
import type { WorkspaceLayoutItem, MapPanelState, FilterPreferences } from "../domain/maps/types";
import type { ReferenceDocument, ReferenceViewRole } from "../domain/references/types";
import type { AppSessionState } from "../shared/contracts/state";
import type { ControllerProfile, StoredSettings } from "../shared/contracts/storage";

interface ControllerProfileBundle {
  kind: "geofs-atc-controller-profile";
  schemaVersion: number;
  exportedAt: number;
  profile: ControllerProfile;
  templates: MessageTemplate[];
  phrasePacks: PhrasePack[];
}

export interface WorkspaceStore extends AppSessionState {
  initialized: boolean;
  statusMessage: string | null;
  composerValue: string;
  targetCallsign: string;
  referenceQuery: string;
  sessionDocuments: ReferenceDocument[];
  initialize: () => Promise<void>;
  setSelectedAircraft: (aircraftId: string | null) => void;
  setComposerValue: (value: string) => void;
  setTargetCallsign: (value: string) => void;
  sendChat: () => Promise<void>;
  toggleFocus: (aircraftId: string, pinned: boolean) => Promise<void>;
  assignDestination: (aircraftId: string, destinationIcao: string | null) => Promise<void>;
  updateSurfaceClearance: (
    aircraftId: string,
    routeId: string | null,
    checkpointId: string | null,
    holdShortRunwayId: string | null,
    runwayCrossingState: SurfaceCrossingState
  ) => Promise<void>;
  saveLayout: (layouts: WorkspaceLayoutItem[]) => Promise<void>;
  activatePreset: (presetId: string) => Promise<void>;
  saveFilters: (patch: Partial<FilterPreferences>) => Promise<void>;
  saveMapPanels: (state: MapPanelState[]) => Promise<void>;
  saveTemplates: (templates: MessageTemplate[]) => Promise<void>;
  savePhrasePacks: (packs: PhrasePack[]) => Promise<void>;
  saveSettings: (patch: Partial<StoredSettings>) => Promise<void>;
  saveControllerProfiles: (profiles: ControllerProfile[], activeProfileId: string) => Promise<void>;
  activateControllerProfile: (profileId: string) => Promise<void>;
  exportActiveControllerProfile: () => Promise<void>;
  importControllerProfiles: (files: FileList | File[]) => Promise<void>;
  setAirport: (airportIcao: string) => Promise<void>;
  openControllerWindow: () => Promise<void>;
  setReferenceQuery: (value: string) => void;
  selectReferenceDocument: (documentId: string) => Promise<void>;
  toggleReferenceFavorite: (documentId: string) => Promise<void>;
  toggleReferencePin: (documentId: string) => Promise<void>;
  pinReferenceToRole: (role: ReferenceViewRole, documentId: string) => Promise<void>;
  saveReferenceNote: (documentId: string, note: string) => Promise<void>;
  importReferenceFiles: (files: FileList | File[]) => Promise<void>;
  openBestReferenceForRole: (role: ReferenceViewRole) => Promise<void>;
  setClearanceDraft: (draft: ClearanceDraft | null) => void;
  buildClearanceMessage: () => void;
}

const defaults = createDefaultWorkspaceState();

const initialUiState = {
  initialized: false,
  statusMessage: null,
  composerValue: "",
  targetCallsign: "",
  referenceQuery: "",
  sessionDocuments: []
};

let unsubscribeRuntime: (() => void) | null = null;

const jsonEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const mergeSnapshotIntoStore = (
  state: WorkspaceStore,
  snapshot: AppSessionState
): Partial<WorkspaceStore> => ({
  ...snapshot,
  layout: jsonEqual(state.layout, snapshot.layout) ? state.layout : snapshot.layout,
  filters: jsonEqual(state.filters, snapshot.filters) ? state.filters : snapshot.filters,
  mapPanels: jsonEqual(state.mapPanels, snapshot.mapPanels) ? state.mapPanels : snapshot.mapPanels,
  templates: jsonEqual(state.templates, snapshot.templates) ? state.templates : snapshot.templates,
  phrasePacks: jsonEqual(state.phrasePacks, snapshot.phrasePacks) ? state.phrasePacks : snapshot.phrasePacks,
  controllerProfiles: jsonEqual(state.controllerProfiles, snapshot.controllerProfiles)
    ? state.controllerProfiles
    : snapshot.controllerProfiles,
  referenceShelf: jsonEqual(state.referenceShelf, snapshot.referenceShelf)
    ? state.referenceShelf
    : snapshot.referenceShelf,
  airportPreferences: jsonEqual(state.airportPreferences, snapshot.airportPreferences)
    ? state.airportPreferences
    : snapshot.airportPreferences,
  settings: jsonEqual(state.settings, snapshot.settings) ? state.settings : snapshot.settings,
  recentDestinations: jsonEqual(state.recentDestinations, snapshot.recentDestinations)
    ? state.recentDestinations
    : snapshot.recentDestinations,
  activeAirport:
    state.activeAirport.icao === snapshot.activeAirport.icao ? state.activeAirport : snapshot.activeAirport,
  initialized: true,
  statusMessage: state.statusMessage,
  composerValue: state.composerValue,
  targetCallsign: state.targetCallsign,
  referenceQuery: state.referenceQuery,
  sessionDocuments: state.sessionDocuments,
  selectedAircraftId: state.selectedAircraftId,
  clearanceDraft: state.clearanceDraft
});

const getAllReferenceDocuments = (state: Pick<WorkspaceStore, "sessionDocuments">) => [
  ...BUNDLED_REFERENCE_DOCUMENTS,
  ...state.sessionDocuments
];

const deriveReferenceContext = (
  state: WorkspaceStore,
  role: ReferenceViewRole
) => {
  const selectedAircraft = [...state.contacts, ...state.discoveryContacts].find(
    (contact) => contact.id === state.selectedAircraftId
  );
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

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

const nextStatusMessage = (message: string) =>
  message.length > 120 ? `${message.slice(0, 117)}...` : message;

const getReferenceDocumentType = (
  file: File
): ReferenceDocument["type"] => {
  const lowerName = file.name.toLowerCase();
  if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(lowerName)) {
    return "image";
  }
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  return "text";
};

const createImportedReferenceDocument = async (file: File): Promise<ReferenceDocument> => {
  const type = getReferenceDocumentType(file);
  const sourcePath = URL.createObjectURL(file);

  return {
    id: createId("ref"),
    title: file.name.replace(/\.[^.]+$/, ""),
    type,
    airportIcao: null,
    sourceKind: "imported_file",
    sourcePath,
    category: type === "image" || type === "pdf" ? "miscellaneous" : "procedure_reference",
    parsedText: type === "text" ? await file.text() : null,
    effectiveDate: null,
    expirationDate: null,
    georeference: null,
    tags: ["session import", type]
  };
};

const createTemplateFromComposer = (
  state: WorkspaceStore,
  phrasePackId: string | null
): MessageTemplate => {
  const trimmed = state.composerValue.trim();
  const activePack = state.phrasePacks.find((pack) => pack.id === phrasePackId) ?? null;
  return {
    id: createId("tpl"),
    packId: activePack?.id ?? null,
    role: activePack?.role ?? "general",
    label: trimmed.slice(0, 24) || "Quick Template",
    category: "general_advisory",
    compactBody: trimmed,
    referenceBody: trimmed,
    variables: [],
    tags: ["custom", activePack?.role ?? "general"],
    referenceDocumentIds: []
  };
};

const defaultDraftForAircraft = (contact: AircraftContact | null): ClearanceDraft | null => {
  if (!contact) {
    return null;
  }

  return {
    role: contact.grounded ? "ground" : "tower",
    templateCategory: contact.grounded ? "taxi" : "landing_clearance",
    callsign: contact.callsign,
    runway: "",
    altitude: contact.altitudeFeet ? `${Math.round(contact.altitudeFeet)}` : "",
    heading: contact.headingDegrees ? `${Math.round(contact.headingDegrees)}` : "",
    destination: "",
    holdShortRunway: ""
  };
};

const triggerDownload = (filename: string, body: string) => {
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  contacts: [],
  discoveryContacts: [],
  chatLog: [],
  focusTargets: [],
  selectedAircraftId: null,
  weather: null,
  activeAirport: getDefaultAirport(),
  filters: defaults.filters,
  mapPanels: defaults.mapPanels,
  layout: defaults.layout,
  templates: defaults.templates,
  phrasePacks: defaults.phrasePacks,
  controllerProfiles: defaults.controllerProfiles,
  activeProfileId: defaults.activeProfileId,
  clearanceDraft: null,
  referenceShelf: defaults.referenceShelf,
  airportPreferences: defaults.airportPreferences,
  settings: defaults.settings,
  recentDestinations: defaults.recentDestinations,
  health: {
    activeGeoFsTabId: null,
    attachedGeoFsTabIds: [],
    contentAttached: false,
    bridgeAttached: false,
    bridgeInstalled: false,
    bridgeCapturingTraffic: false,
    lastUpdateAt: null,
    lastMapAt: null,
    lastHeartbeatAt: null,
    lastBridgeEventAt: null,
    lastChatSendAt: null,
    lastChatInjectionAt: null,
    lastBridgeInstallAt: null,
    lastBridgeReinjectAt: null,
    lastAttachmentSwitchAt: null,
    updateCadenceMs: null,
    updateJitterMs: null,
    backgrounded: false,
    degradedReason: undefined,
    discoveryLastFetchedAt: null,
    discoveryEnabled: defaults.settings.discoveryEnabled,
    updateAdapterStatus: "partial",
    mapAdapterStatus: "partial",
    chatAdapterStatus: "partial",
    capabilities: {
      updateParsingOk: false,
      mapParsingOk: false,
      chatInjectionOk: false,
      bridgeHeartbeatOk: false,
      visibilityKnown: false
    },
    unsupportedPayloadCount: 0,
    parseFailureCount: 0,
    bridgeReinstallCount: 0,
    lastUpdateRateLimitedAt: null,
    lastFailureAt: null,
    lastFailureKind: null,
    lastFailureSignature: null,
    activeFallbacks: []
  },
  ...initialUiState,

  initialize: async () => {
    if (unsubscribeRuntime) {
      return;
    }

    unsubscribeRuntime = workspaceRuntime.subscribe(
      (snapshot) => {
        set((state) => mergeSnapshotIntoStore(state, snapshot));
      },
      (message) => {
        set({ statusMessage: nextStatusMessage(message) });
      }
    );

    const response = await workspaceRuntime.initialize();
    if (response.type === "background/state-snapshot") {
      set((state) => mergeSnapshotIntoStore(state, response.payload.state as AppSessionState));
    }
  },

  setSelectedAircraft: (aircraftId) => {
    const state = get();
    const contact =
      [...state.contacts, ...state.discoveryContacts].find((item) => item.id === aircraftId) ?? null;
    set({
      selectedAircraftId: aircraftId,
      targetCallsign: contact?.callsign ?? state.targetCallsign,
      clearanceDraft:
        aircraftId == null
          ? state.clearanceDraft
          : {
              ...(state.clearanceDraft ?? defaultDraftForAircraft(contact) ?? {
                role: "tower",
                templateCategory: "general_advisory",
                callsign: contact?.callsign ?? "",
                runway: "",
                altitude: "",
                heading: "",
                destination: "",
                holdShortRunway: ""
              }),
              callsign: contact?.callsign ?? state.clearanceDraft?.callsign ?? ""
            }
    });
  },

  setComposerValue: (value) => set({ composerValue: value }),
  setTargetCallsign: (value) => set({ targetCallsign: value }),

  sendChat: async () => {
    const state = get();
    const message = state.composerValue.trim();
    const foregroundBlocked = state.health.activeFallbacks?.includes("foreground_required_blocked") ?? false;
    if (!message) {
      set({ statusMessage: "Message is empty." });
      return;
    }

    const canSendDirect =
      state.health.activeGeoFsTabId != null &&
      state.health.capabilities?.chatInjectionOk;

    if (!canSendDirect && state.settings.copyOnlyFallback) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      }
      set({
        statusMessage: foregroundBlocked
          ? "GeoFS not focused. Message copied; draft preserved."
          : "GeoFS send unavailable. Message copied; draft preserved."
      });
      return;
    }

    const result = await workspaceRuntime.sendChat(message, state.targetCallsign.trim() || null);
    if (result.type === "background/chat-send-result" && result.payload.ok) {
      set({
        composerValue: "",
        statusMessage: `Sent ${message.slice(0, 24)}${message.length > 24 ? "..." : ""}`
      });
      return;
    }

    set({
      statusMessage:
        result.type === "background/chat-send-result"
          ? result.payload.reason ?? "Unable to send message."
          : "Unable to send message."
    });
  },

  toggleFocus: async (aircraftId, pinned) => {
    await workspaceRuntime.updateFocus(aircraftId, pinned);
    set({
      statusMessage: pinned ? "Aircraft pinned." : "Aircraft unpinned."
    });
  },

  assignDestination: async (aircraftId, destinationIcao) => {
    await workspaceRuntime.updateDestination(aircraftId, destinationIcao);
    set({
      statusMessage: destinationIcao ? `Destination set ${destinationIcao}.` : "Destination cleared."
    });
  },

  updateSurfaceClearance: async (
    aircraftId,
    routeId,
    checkpointId,
    holdShortRunwayId,
    runwayCrossingState
  ) => {
    await workspaceRuntime.updateSurfaceClearance(
      aircraftId,
      routeId,
      checkpointId,
      holdShortRunwayId,
      runwayCrossingState
    );
    set({
      statusMessage: routeId ? "Surface clearance updated." : "Surface clearance cleared."
    });
  },

  saveLayout: async (layouts) => {
    const nextLayout = { ...get().layout, layouts };
    set({ layout: nextLayout });
    await workspaceRuntime.saveLayout(nextLayout);
  },

  activatePreset: async (presetId) => {
    const state = get();
    const preset = state.layout.presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const nextLayout = {
      ...state.layout,
      activePresetId: presetId,
      layouts: preset.layout
    };
    set({ layout: nextLayout, statusMessage: `${preset.label} preset active.` });
    await workspaceRuntime.saveLayout(nextLayout);
  },

  saveFilters: async (patch) => {
    const nextFilters = { ...get().filters, ...patch };
    set({ filters: nextFilters });
    await workspaceRuntime.saveFilters(nextFilters);
  },

  saveMapPanels: async (state) => {
    set({ mapPanels: state });
    await workspaceRuntime.saveMapPanels(state);
  },

  saveTemplates: async (templates) => {
    set({ templates });
    await workspaceRuntime.saveTemplates(templates);
  },

  savePhrasePacks: async (packs) => {
    set({ phrasePacks: packs });
    await workspaceRuntime.savePhrasePacks(packs);
  },

  saveSettings: async (patch) => {
    const nextSettings = { ...get().settings, ...patch };
    set({
      settings: nextSettings,
      health: {
        ...get().health,
        discoveryEnabled: nextSettings.discoveryEnabled
      }
    });
    await workspaceRuntime.saveSettings(nextSettings);
  },

  saveControllerProfiles: async (profiles, activeProfileId) => {
    set({
      controllerProfiles: profiles,
      activeProfileId
    });
    await workspaceRuntime.saveControllerProfiles(profiles, activeProfileId);
  },

  activateControllerProfile: async (profileId) => {
    const state = get();
    const profile = state.controllerProfiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    const nextAirport =
      getAirportByIcao(profile.airportPreferences.selectedAirportIcao) ?? state.activeAirport;

    set({
      activeProfileId: profile.id,
      layout: profile.layout,
      filters: profile.filters,
      mapPanels: profile.mapPanels,
      referenceShelf: profile.referenceShelf,
      airportPreferences: profile.airportPreferences,
      activeAirport: nextAirport,
      statusMessage: `${profile.name} profile active.`
    });

    await workspaceRuntime.saveControllerProfiles(state.controllerProfiles, profile.id);
    if (nextAirport.icao !== state.activeAirport.icao) {
      await workspaceRuntime.setAirport(nextAirport.icao);
    }
  },

  exportActiveControllerProfile: async () => {
    const state = get();
    const activeProfile =
      state.controllerProfiles.find((profile) => profile.id === state.activeProfileId) ??
      buildControllerProfileSnapshot("Default Console", createDefaultWorkspaceState());

    const liveProfile = buildControllerProfileSnapshot(
      activeProfile.name,
      {
        schemaVersion: 2,
        layout: state.layout,
        filters: state.filters,
        mapPanels: state.mapPanels,
        focusTargets: state.focusTargets,
        templates: state.templates,
        phrasePacks: state.phrasePacks,
        controllerProfiles: state.controllerProfiles,
        activeProfileId: state.activeProfileId,
        referenceShelf: state.referenceShelf,
        airportPreferences: state.airportPreferences,
        recentDestinations: state.recentDestinations,
        settings: state.settings
      },
      activeProfile.templateIds.length ? activeProfile.templateIds : state.templates.map((template) => template.id),
      activeProfile.phrasePackIds.length
        ? activeProfile.phrasePackIds
        : state.phrasePacks.map((pack) => pack.id)
    );

    const bundle: ControllerProfileBundle = {
      kind: "geofs-atc-controller-profile",
      schemaVersion: 2,
      exportedAt: Date.now(),
      profile: liveProfile,
      templates: state.templates.filter((template) => liveProfile.templateIds.includes(template.id)),
      phrasePacks: state.phrasePacks.filter((pack) => liveProfile.phrasePackIds.includes(pack.id))
    };

    triggerDownload(
      `${liveProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "controller-profile"}.json`,
      JSON.stringify(bundle, null, 2)
    );
    set({ statusMessage: `Exported ${liveProfile.name}.` });
  },

  importControllerProfiles: async (files) => {
    const incomingFiles = Array.from(files);
    const importedBundles: ControllerProfileBundle[] = [];

    for (const file of incomingFiles) {
      const parsed = JSON.parse(await file.text()) as Partial<ControllerProfileBundle>;
      if (parsed.kind !== "geofs-atc-controller-profile" || !parsed.profile) {
        continue;
      }

      importedBundles.push({
        kind: "geofs-atc-controller-profile",
        schemaVersion: parsed.schemaVersion ?? 2,
        exportedAt: parsed.exportedAt ?? Date.now(),
        profile: parsed.profile,
        templates: parsed.templates ?? [],
        phrasePacks: parsed.phrasePacks ?? []
      });
    }

    if (!importedBundles.length) {
      set({ statusMessage: "No valid controller profile import found." });
      return;
    }

    const state = get();
    const mergedProfiles = dedupeById([
      ...state.controllerProfiles,
      ...importedBundles.map((bundle) => bundle.profile)
    ]);
    const mergedTemplates = dedupeById([
      ...state.templates,
      ...importedBundles.flatMap((bundle) => bundle.templates)
    ]);
    const mergedPhrasePacks = dedupeById([
      ...state.phrasePacks,
      ...importedBundles.flatMap((bundle) => bundle.phrasePacks)
    ]);
    const activeProfileId = importedBundles[0]?.profile.id ?? state.activeProfileId;
    const activeProfile =
      mergedProfiles.find((profile) => profile.id === activeProfileId) ?? mergedProfiles[0];
    const nextAirport = activeProfile
      ? getAirportByIcao(activeProfile.airportPreferences.selectedAirportIcao) ?? state.activeAirport
      : state.activeAirport;

    set({
      controllerProfiles: mergedProfiles,
      templates: mergedTemplates,
      phrasePacks: mergedPhrasePacks,
      activeProfileId: activeProfile?.id ?? state.activeProfileId,
      layout: activeProfile?.layout ?? state.layout,
      filters: activeProfile?.filters ?? state.filters,
      mapPanels: activeProfile?.mapPanels ?? state.mapPanels,
      referenceShelf: activeProfile?.referenceShelf ?? state.referenceShelf,
      airportPreferences: activeProfile?.airportPreferences ?? state.airportPreferences,
      activeAirport: nextAirport,
      statusMessage: `Imported ${importedBundles.length} profile${importedBundles.length === 1 ? "" : "s"}.`
    });

    await workspaceRuntime.saveTemplates(mergedTemplates);
    await workspaceRuntime.savePhrasePacks(mergedPhrasePacks);
    await workspaceRuntime.saveControllerProfiles(
      mergedProfiles,
      activeProfile?.id ?? state.activeProfileId
    );
    if (activeProfile && nextAirport.icao !== state.activeAirport.icao) {
      await workspaceRuntime.setAirport(nextAirport.icao);
    }
  },

  setAirport: async (airportIcao) => {
    const nextAirport = getAirportByIcao(airportIcao);
    if (!nextAirport) {
      return;
    }

    set({
      activeAirport: nextAirport,
      airportPreferences: {
        ...get().airportPreferences,
        selectedAirportIcao: nextAirport.icao
      },
      statusMessage: `${nextAirport.icao} active airport.`
    });
    await workspaceRuntime.setAirport(nextAirport.icao);
  },

  openControllerWindow: async () => {
    await workspaceRuntime.openControllerWindow();
  },

  setReferenceQuery: (value) => set({ referenceQuery: value }),

  selectReferenceDocument: async (documentId) => {
    const nextReferenceShelf = {
      ...get().referenceShelf,
      activeDocumentId: documentId
    };
    set({ referenceShelf: nextReferenceShelf });
    await workspaceRuntime.saveReferenceShelf(nextReferenceShelf);
  },

  toggleReferenceFavorite: async (documentId) => {
    const state = get();
    const favoriteSet = new Set(state.referenceShelf.favoriteDocumentIds);
    if (favoriteSet.has(documentId)) {
      favoriteSet.delete(documentId);
    } else {
      favoriteSet.add(documentId);
    }

    const nextReferenceShelf = {
      ...state.referenceShelf,
      favoriteDocumentIds: [...favoriteSet]
    };
    set({ referenceShelf: nextReferenceShelf });
    await workspaceRuntime.saveReferenceShelf(nextReferenceShelf);
  },

  toggleReferencePin: async (documentId) => {
    const state = get();
    const pinSet = new Set(state.referenceShelf.pinnedDocumentIds);
    if (pinSet.has(documentId)) {
      pinSet.delete(documentId);
    } else {
      pinSet.add(documentId);
    }

    const nextReferenceShelf = {
      ...state.referenceShelf,
      pinnedDocumentIds: [...pinSet]
    };
    set({ referenceShelf: nextReferenceShelf });
    await workspaceRuntime.saveReferenceShelf(nextReferenceShelf);
  },

  pinReferenceToRole: async (role, documentId) => {
    const nextReferenceShelf = {
      ...get().referenceShelf,
      pinnedByRole: {
        ...get().referenceShelf.pinnedByRole,
        [role]: documentId
      }
    };
    set({ referenceShelf: nextReferenceShelf });
    await workspaceRuntime.saveReferenceShelf(nextReferenceShelf);
  },

  saveReferenceNote: async (documentId, note) => {
    const nextReferenceShelf = {
      ...get().referenceShelf,
      notesByDocumentId: {
        ...get().referenceShelf.notesByDocumentId,
        [documentId]: note
      }
    };
    set({ referenceShelf: nextReferenceShelf });
    await workspaceRuntime.saveReferenceShelf(nextReferenceShelf);
  },

  importReferenceFiles: async (files) => {
    const incomingDocuments = await Promise.all(Array.from(files).map(createImportedReferenceDocument));
    const firstDocument = incomingDocuments[0] ?? null;
    set((state) => ({
      sessionDocuments: [...state.sessionDocuments, ...incomingDocuments],
      referenceShelf: firstDocument
        ? { ...state.referenceShelf, activeDocumentId: firstDocument.id }
        : state.referenceShelf,
      statusMessage: `Imported ${incomingDocuments.length} session reference${incomingDocuments.length === 1 ? "" : "s"}.`
    }));
  },

  openBestReferenceForRole: async (role) => {
    const state = get();
    const bestReference = selectBestReferenceDocument(
      getAllReferenceDocuments(state),
      deriveReferenceContext(state, role),
      state.referenceShelf.pinnedByRole
    );

    if (!bestReference) {
      set({ statusMessage: "No matching reference available." });
      return;
    }

    const nextReferenceShelf = {
      ...state.referenceShelf,
      activeDocumentId: bestReference.id
    };
    set({
      referenceShelf: nextReferenceShelf,
      statusMessage: `Opened ${bestReference.title}.`
    });
    await workspaceRuntime.saveReferenceShelf(nextReferenceShelf);
  },

  setClearanceDraft: (draft) => set({ clearanceDraft: draft }),

  buildClearanceMessage: () => {
    const state = get();
    const draft = state.clearanceDraft;
    if (!draft) {
      set({ statusMessage: "No clearance draft." });
      return;
    }

    const rendered = buildClearanceFromDraft(draft, state.templates, state.settings.chatSafeMax);
    set({
      composerValue: rendered.value,
      targetCallsign: draft.callsign,
      statusMessage: rendered.fitsLimit
        ? `Clearance ready. ${rendered.remaining} chars left.`
        : "Clearance exceeds safe chat length."
    });
  }
}));

export const resetWorkspaceStoreForTests = () => {
  unsubscribeRuntime?.();
  unsubscribeRuntime = null;
  useWorkspaceStore.setState({
    contacts: [],
    discoveryContacts: [],
    chatLog: [],
    focusTargets: [],
    selectedAircraftId: null,
    weather: null,
    activeAirport: getDefaultAirport(),
    filters: defaults.filters,
    mapPanels: defaults.mapPanels,
    layout: defaults.layout,
    templates: DEFAULT_MESSAGE_TEMPLATES,
    phrasePacks: DEFAULT_LINKED_PHRASE_PACKS,
    controllerProfiles: defaults.controllerProfiles,
    activeProfileId: defaults.activeProfileId,
    clearanceDraft: null,
    referenceShelf: defaults.referenceShelf,
    airportPreferences: defaults.airportPreferences,
    settings: defaults.settings,
    recentDestinations: defaults.recentDestinations,
    health: {
      activeGeoFsTabId: null,
      attachedGeoFsTabIds: [],
      contentAttached: false,
      bridgeAttached: false,
      bridgeInstalled: false,
      bridgeCapturingTraffic: false,
      lastUpdateAt: null,
      lastMapAt: null,
      lastHeartbeatAt: null,
      lastBridgeEventAt: null,
      lastChatSendAt: null,
      lastChatInjectionAt: null,
      lastBridgeInstallAt: null,
      lastBridgeReinjectAt: null,
      lastAttachmentSwitchAt: null,
      updateCadenceMs: null,
      updateJitterMs: null,
      backgrounded: false,
      degradedReason: undefined,
      discoveryLastFetchedAt: null,
      discoveryEnabled: defaults.settings.discoveryEnabled,
      updateAdapterStatus: "partial",
      mapAdapterStatus: "partial",
      chatAdapterStatus: "partial",
      capabilities: {
        updateParsingOk: false,
        mapParsingOk: false,
        chatInjectionOk: false,
        bridgeHeartbeatOk: false,
        visibilityKnown: false
      },
      unsupportedPayloadCount: 0,
      parseFailureCount: 0,
      bridgeReinstallCount: 0,
      lastUpdateRateLimitedAt: null,
      lastFailureAt: null,
      lastFailureKind: null,
      lastFailureSignature: null,
      activeFallbacks: []
    },
    ...initialUiState
  });
};

export * from "./store/selectors";
