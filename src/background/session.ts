import { AircraftTracker } from "../domain/aircraft/tracker";
import { GeoFsRegionalDiscoveryProvider } from "../domain/aircraft/discovery";
import { AIRPORTS, getAirportByIcao, getDefaultAirport } from "../domain/airports/airports";
import { createGeoFsCapabilitySnapshot, deriveGeoFsFallbacks } from "../domain/geofs/healthAdapter";
import { adaptGeoFsMapPayload, adaptGeoFsUpdatePayload } from "../domain/geofs/trafficAdapter";
import { DEFAULT_CHAT_SAFE_MAX } from "../shared/config/constants";
import { createDefaultWorkspaceState } from "../shared/persistence/defaults";
import { applyControllerProfileToState } from "../shared/persistence/profiles";
import { loadPersistedWorkspaceState, savePersistedWorkspaceState } from "../shared/persistence/storage";
import { createId } from "../shared/utils/id";
import { now } from "../shared/utils/time";
import type { AppSessionState } from "../shared/contracts/state";
import type { ControllerProfile, PersistedWorkspaceState } from "../shared/contracts/storage";
import type { ChatMessage } from "../domain/chat/types";
import type { BackgroundEventMessage } from "../shared/contracts/runtime";
import { AviationWeatherProvider } from "../domain/weather/provider";
import type { SurfaceCrossingState } from "../domain/focus/types";

export class SessionController {
  private readonly tracker = new AircraftTracker();
  private readonly weatherProvider = new AviationWeatherProvider();
  private readonly discoveryProvider = new GeoFsRegionalDiscoveryProvider();
  private persisted = createDefaultWorkspaceState();
  private state: AppSessionState = this.createInitialState();
  private workspaceWindowId: number | null = null;
  private readonly attachedGeoFsTabIds = new Set<number>();

  async initialize(): Promise<void> {
    this.persisted = await loadPersistedWorkspaceState();
    this.state = this.createStateFromPersisted(this.persisted);
    await this.refreshWeather();
    this.evaluateHealth();
  }

  getState(): AppSessionState {
    return this.state;
  }

  async handleBridgeEvent(event: unknown, tabId: number | null): Promise<void> {
    if (!event || typeof event !== "object") {
      return;
    }

    const typedEvent = event as {
      type?: string;
      requestUrl?: string;
      requestBody?: unknown;
      responseBody?: unknown;
      responseStatus?: number;
      visibilityState?: DocumentVisibilityState;
      timestamp?: number;
    };

    if (tabId != null) {
      const priorTabId = this.state.health.activeGeoFsTabId;
      this.attachedGeoFsTabIds.add(tabId);
      this.state.health.activeGeoFsTabId = tabId;
      this.state.health.attachedGeoFsTabIds = [...this.attachedGeoFsTabIds];
      this.state.health.contentAttached = true;
      if (priorTabId != null && priorTabId !== tabId) {
        this.state.health.lastAttachmentSwitchAt = now();
      }
    }

    this.state.health.lastHeartbeatAt = now();
    this.state.health.capabilities = createGeoFsCapabilitySnapshot(this.state.health);

    if (typedEvent.type === "geofs:update") {
      this.handleUpdateEvent(
        typedEvent.responseBody,
        typedEvent.timestamp ?? now(),
        typedEvent.responseStatus ?? null
      );
    }

    if (typedEvent.type === "geofs:map") {
      this.handleMapEvent(
        typedEvent.responseBody,
        typedEvent.timestamp ?? now(),
        typedEvent.responseStatus ?? null
      );
    }

    if (typedEvent.type === "geofs:visibility") {
      this.state.health.backgrounded = typedEvent.visibilityState === "hidden";
      this.state.health.capabilities = {
        ...(this.state.health.capabilities ?? createGeoFsCapabilitySnapshot(this.state.health)),
        visibilityKnown: true
      };
      await this.maybeReinjectBridge(tabId);
    }

    if (typedEvent.type === "geofs:bridge-installed") {
      this.state.health.bridgeAttached = true;
      this.state.health.bridgeInstalled = true;
      this.state.health.lastBridgeInstallAt = typedEvent.timestamp ?? now();
      this.state.health.lastBridgeEventAt = typedEvent.timestamp ?? now();
    }

    if (typedEvent.type === "geofs:bridge-heartbeat") {
      this.state.health.bridgeAttached = true;
      this.state.health.bridgeInstalled = true;
      this.state.health.bridgeCapturingTraffic = true;
      this.state.health.lastBridgeEventAt = typedEvent.timestamp ?? now();
    }

    if (typedEvent.type === "geofs:chat-staged") {
      this.state.health.lastChatInjectionAt = typedEvent.timestamp ?? now();
      this.state.health.chatAdapterStatus = "ok";
    }

    if (typedEvent.type === "geofs:hook-error") {
      this.noteFailure("bridge-hook-error", typedEvent.requestUrl ?? "bridge", typedEvent.timestamp ?? now());
    }

    await this.refreshDiscoveryIfNeeded();
    this.evaluateHealth();

    this.broadcast({
      type: "background/state-snapshot",
      payload: { state: this.state }
    });
  }

  async sendChat(message: string, targetCallsign?: string | null): Promise<BackgroundEventMessage> {
    if (!message.trim()) {
      return {
        type: "background/chat-send-result",
        payload: { ok: false, reason: "Message is empty.", message, timestamp: now() }
      };
    }

    if (message.length > (this.state.settings.chatSafeMax || DEFAULT_CHAT_SAFE_MAX)) {
      return {
        type: "background/chat-send-result",
        payload: { ok: false, reason: "Message exceeds safe chat max.", message, timestamp: now() }
      };
    }

    const outbound: ChatMessage = {
      id: createId("chat"),
      direction: "outbound",
      timestamp: now(),
      callsign: "ATC",
      message,
      targetCallsign: targetCallsign ?? null,
      deliveryState: "queued"
    };
    this.state.chatLog = mergeChatLog(this.state.chatLog, [outbound]);
    this.state.health.lastChatSendAt = outbound.timestamp;
    this.broadcast({
      type: "background/state-snapshot",
      payload: { state: this.state }
    });

    const tabId = this.state.health.activeGeoFsTabId;
    if (tabId == null || !this.state.health.capabilities?.chatInjectionOk) {
      return {
        type: "background/chat-send-result",
        payload: {
          ok: false,
          reason: tabId == null ? "No active GeoFS tab." : "GeoFS chat bridge unavailable.",
          message,
          timestamp: now()
        }
      };
    }

    await chrome.tabs.sendMessage(tabId, {
      type: "page/send-chat",
      payload: { message }
    });

    return {
      type: "background/chat-send-result",
      payload: { ok: true, message, timestamp: now() }
    };
  }

  async setFocus(aircraftId: string, pinned: boolean): Promise<void> {
    const next = pinned
      ? [
          ...this.persisted.focusTargets.filter((target) => target.aircraftId !== aircraftId),
          {
            aircraftId,
            color: nextFocusColor(this.persisted.focusTargets.length),
            mode: "approach" as const,
            pinnedAt: now(),
            destinationIcao: null,
            surfaceClearance: {
              routeId: null,
              activeCheckpointId: null,
              holdShortRunwayId: null,
              runwayCrossingState: "none" as const
            }
          }
        ]
      : this.persisted.focusTargets.filter((target) => target.aircraftId !== aircraftId);
    this.persisted.focusTargets = next;
    await this.persist();
  }

  async setDestination(aircraftId: string, destinationIcao: string | null): Promise<void> {
    this.persisted.focusTargets = this.persisted.focusTargets.map((target) =>
      target.aircraftId === aircraftId ? { ...target, destinationIcao } : target
    );

    if (destinationIcao) {
      this.persisted.recentDestinations = [
        destinationIcao,
        ...this.persisted.recentDestinations.filter((value) => value !== destinationIcao)
      ].slice(0, 8);
    }

    await this.persist();
  }

  async setSurfaceClearance(
    aircraftId: string,
    routeId: string | null,
    checkpointId: string | null,
    holdShortRunwayId: string | null,
    runwayCrossingState: SurfaceCrossingState
  ): Promise<void> {
    this.persisted.focusTargets = this.persisted.focusTargets.map((target) =>
      target.aircraftId === aircraftId
        ? {
            ...target,
            mode: "ground",
            surfaceClearance: {
              routeId,
              activeCheckpointId: checkpointId,
              holdShortRunwayId,
              runwayCrossingState
            }
          }
        : target
    );
    await this.persist();
  }

  async setAirport(airportIcao: string): Promise<void> {
    this.persisted.airportPreferences = {
      ...this.persisted.airportPreferences,
      selectedAirportIcao: airportIcao
    };
    this.state.activeAirport = getAirportByIcao(airportIcao) ?? this.state.activeAirport;
    await this.refreshWeather();
    await this.refreshDiscoveryIfNeeded(true);
    await this.persist();
  }

  async saveLayout(layout: PersistedWorkspaceState["layout"]): Promise<void> {
    this.persisted.layout = layout;
    await this.persist();
  }

  async saveSettings(settings: PersistedWorkspaceState["settings"]): Promise<void> {
    this.persisted.settings = settings;
    await this.persist();
  }

  async saveFilters(filters: PersistedWorkspaceState["filters"]): Promise<void> {
    this.persisted.filters = filters;
    await this.persist();
  }

  async saveMapPanels(mapPanels: PersistedWorkspaceState["mapPanels"]): Promise<void> {
    this.persisted.mapPanels = mapPanels;
    await this.persist();
  }

  async saveTemplates(templates: PersistedWorkspaceState["templates"]): Promise<void> {
    this.persisted.templates = templates;
    await this.persist();
  }

  async savePhrasePacks(phrasePacks: PersistedWorkspaceState["phrasePacks"]): Promise<void> {
    this.persisted.phrasePacks = phrasePacks;
    await this.persist();
  }

  async saveControllerProfiles(
    controllerProfiles: ControllerProfile[],
    activeProfileId: string
  ): Promise<void> {
    this.persisted.controllerProfiles = controllerProfiles;
    this.persisted.activeProfileId = activeProfileId;
    const activeProfile = controllerProfiles.find((profile) => profile.id === activeProfileId);
    if (activeProfile) {
      this.persisted = applyControllerProfileToState(this.persisted, activeProfile);
    }
    await this.persist();
  }

  async saveReferenceShelf(referenceShelf: PersistedWorkspaceState["referenceShelf"]): Promise<void> {
    this.persisted.referenceShelf = referenceShelf;
    await this.persist();
  }

  async openWorkspaceWindow(): Promise<void> {
    if (this.workspaceWindowId != null) {
      await chrome.windows.update(this.workspaceWindowId, { focused: true });
      return;
    }

    const created = await chrome.windows.create({
      url: chrome.runtime.getURL("workspace.html"),
      type: "popup",
      width: 1680,
      height: 980
    });

    this.workspaceWindowId = created.id ?? null;
  }

  async refreshWeather(): Promise<void> {
    try {
      this.state.weather = await this.weatherProvider.fetchAirportWeather(
        this.persisted.airportPreferences.selectedAirportIcao
      );
    } catch {
      this.noteFailure("weather-fetch-failed", "weather", now());
    }
  }

  async refreshDiscoveryIfNeeded(force = false): Promise<void> {
    if (!this.persisted.settings.discoveryEnabled) {
      this.state.discoveryContacts = [];
      this.state.health.discoveryEnabled = false;
      this.evaluateHealth();
      return;
    }

    const lastFetched = this.state.health.discoveryLastFetchedAt ?? 0;
    if (!force && Date.now() - lastFetched < 20_000) {
      return;
    }

    try {
      const snapshot = await this.discoveryProvider.fetchRegionalSnapshot();
      const activeAirport = getAirportByIcao(this.persisted.airportPreferences.selectedAirportIcao) ?? getDefaultAirport();
      this.state.discoveryContacts = snapshot.contacts
        .filter((contact) => {
          const deltaLat = Math.abs(contact.latitude - activeAirport.latitude);
          const deltaLon = Math.abs(contact.longitude - activeAirport.longitude);
          const roughRangeNm = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon) * 60;
          return roughRangeNm <= 120;
        })
        .map((contact) => ({
          ...contact,
          sourceAuthority: "regional_advisory" as const
        }));
      this.state.health.discoveryLastFetchedAt = Date.now();
      this.state.health.discoveryEnabled = true;
    } catch {
      this.noteFailure("discovery-fetch-failed", "discovery", now());
    }
  }

  onWindowRemoved(windowId: number): void {
    if (this.workspaceWindowId === windowId) {
      this.workspaceWindowId = null;
    }
  }

  private createInitialState(): AppSessionState {
    const airport = getDefaultAirport();
    const defaults = createDefaultWorkspaceState();

    return {
      contacts: [],
      discoveryContacts: [],
      chatLog: [],
      focusTargets: defaults.focusTargets,
      selectedAircraftId: null,
      weather: null,
      activeAirport: airport,
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
        activeFallbacks: ["no-attached-tab", "chat-send-unavailable", "bridge-heartbeat-stale"]
      }
    };
  }

  private createStateFromPersisted(persisted: PersistedWorkspaceState): AppSessionState {
    const ephemeral = this.state;
    return {
      ...this.createInitialState(),
      contacts: ephemeral.contacts,
      discoveryContacts: ephemeral.discoveryContacts,
      chatLog: ephemeral.chatLog,
      weather: ephemeral.weather,
      focusTargets: persisted.focusTargets,
      filters: persisted.filters,
      mapPanels: persisted.mapPanels,
      layout: persisted.layout,
      templates: persisted.templates,
      phrasePacks: persisted.phrasePacks,
      controllerProfiles: persisted.controllerProfiles,
      activeProfileId: persisted.activeProfileId,
      referenceShelf: persisted.referenceShelf,
      airportPreferences: persisted.airportPreferences,
      settings: persisted.settings,
      recentDestinations: persisted.recentDestinations,
      health: {
        ...ephemeral.health,
        attachedGeoFsTabIds: ephemeral.health.attachedGeoFsTabIds ?? [],
        bridgeInstalled: ephemeral.health.bridgeInstalled ?? false,
        bridgeCapturingTraffic: ephemeral.health.bridgeCapturingTraffic ?? false,
        lastBridgeEventAt: ephemeral.health.lastBridgeEventAt ?? null,
        lastChatInjectionAt: ephemeral.health.lastChatInjectionAt ?? null,
        lastBridgeInstallAt: ephemeral.health.lastBridgeInstallAt ?? null,
        lastBridgeReinjectAt: ephemeral.health.lastBridgeReinjectAt ?? null,
        lastAttachmentSwitchAt: ephemeral.health.lastAttachmentSwitchAt ?? null,
        lastUpdateRateLimitedAt: ephemeral.health.lastUpdateRateLimitedAt ?? null,
        discoveryEnabled: persisted.settings.discoveryEnabled
      },
      activeAirport:
        getAirportByIcao(persisted.airportPreferences.selectedAirportIcao) ?? AIRPORTS[0] ?? getDefaultAirport()
    };
  }

  private recordUpdateCadence(timestamp: number): void {
    const previous = this.state.health.lastUpdateAt;
    if (!previous) {
      return;
    }

    const cadence = timestamp - previous;
    const priorCadence = this.state.health.updateCadenceMs ?? cadence;
    this.state.health.updateJitterMs = Math.abs(cadence - priorCadence);
    this.state.health.updateCadenceMs = cadence;
  }

  private handleUpdateEvent(payload: unknown, timestamp: number, responseStatus: number | null): void {
    if (responseStatus === 429) {
      this.state.health.lastUpdateRateLimitedAt = timestamp;
      this.state.health.updateAdapterStatus = "upstream_unavailable";
      this.state.health.lastBridgeEventAt = timestamp;
      this.noteFailure("update-rate-limited", "429", timestamp);
      return;
    }

    const parsed = adaptGeoFsUpdatePayload(payload);
    this.state.health.updateAdapterStatus = parsed.status;
    this.state.health.lastBridgeEventAt = timestamp;
    this.state.health.lastUpdateRateLimitedAt = null;
    this.state.health.capabilities = createGeoFsCapabilitySnapshot(this.state.health);

    if (parsed.status === "unsupported_shape" || !parsed.data) {
      this.noteFailure("update-unsupported", parsed.signature, timestamp);
      this.state.health.unsupportedPayloadCount = (this.state.health.unsupportedPayloadCount ?? 0) + 1;
      return;
    }

    if (parsed.status === "partial") {
      this.state.health.parseFailureCount = (this.state.health.parseFailureCount ?? 0) + 1;
    }

    this.state.contacts = this.tracker.upsertFromSnapshot(parsed.data.snapshot).map((contact) => ({
      ...contact,
      sourceAuthority: "local_authoritative" as const
    }));
    this.state.chatLog = mergeChatLog(this.state.chatLog, parsed.data.chatMessages);
    parsed.data.chatMessages.forEach((message) => {
      if (message.senderUserId) {
        this.tracker.markChatActivity(message.senderUserId);
      }
    });
    this.recordUpdateCadence(timestamp);
    this.state.health.lastUpdateAt = timestamp;
  }

  private handleMapEvent(payload: unknown, timestamp: number, responseStatus: number | null): void {
    if (responseStatus === 429) {
      this.state.health.mapAdapterStatus = "upstream_unavailable";
      this.state.health.lastBridgeEventAt = timestamp;
      this.noteFailure("map-rate-limited", "429", timestamp);
      return;
    }

    const parsed = adaptGeoFsMapPayload(payload);
    this.state.health.mapAdapterStatus = parsed.status;
    this.state.health.lastBridgeEventAt = timestamp;
    this.state.health.capabilities = createGeoFsCapabilitySnapshot(this.state.health);

    if (parsed.status === "unsupported_shape" || !parsed.data) {
      this.noteFailure("map-unsupported", parsed.signature, timestamp);
      this.state.health.unsupportedPayloadCount = (this.state.health.unsupportedPayloadCount ?? 0) + 1;
      return;
    }

    if (parsed.status === "partial") {
      this.state.health.parseFailureCount = (this.state.health.parseFailureCount ?? 0) + 1;
    }

    this.state.contacts = this.tracker.upsertFromSnapshot(parsed.data).map((contact) => ({
      ...contact,
      sourceAuthority: "local_authoritative" as const
    }));
    this.state.health.lastMapAt = timestamp;
  }

  private noteFailure(kind: string, signature: string, timestamp: number): void {
    this.state.health.lastFailureKind = kind;
    this.state.health.lastFailureSignature = signature;
    this.state.health.lastFailureAt = timestamp;
  }

  private evaluateHealth(): void {
    const nowMs = now();
    const bridgeFresh =
      this.state.health.lastBridgeEventAt != null && nowMs - this.state.health.lastBridgeEventAt < 20_000;
    const updateFresh =
      this.state.health.lastUpdateAt != null && nowMs - this.state.health.lastUpdateAt < 20_000;
    const foregroundBlocked =
      this.state.health.backgrounded ||
      (bridgeFresh &&
        this.state.health.lastBridgeEventAt != null &&
        this.state.health.lastUpdateAt != null &&
        this.state.health.lastBridgeEventAt > this.state.health.lastUpdateAt);

    this.state.health.bridgeAttached = bridgeFresh || Boolean(this.state.health.bridgeInstalled);
    this.state.health.capabilities = {
      ...createGeoFsCapabilitySnapshot(this.state.health),
      bridgeHeartbeatOk: bridgeFresh,
      chatInjectionOk:
        this.state.health.chatAdapterStatus === "ok" &&
        this.state.health.bridgeInstalled === true &&
        !foregroundBlocked
    };
    this.state.health.chatAdapterStatus = this.state.health.capabilities.chatInjectionOk ? "ok" : "partial";
    this.state.health.activeFallbacks = deriveGeoFsFallbacks(this.state.health);
    if (this.state.health.activeFallbacks.includes("foreground_required_blocked")) {
      this.state.health.degradedReason = "GeoFS tab not focused; live /update suspended";
      return;
    }

    if (this.state.health.activeFallbacks.includes("update-rate-limited")) {
      this.state.health.degradedReason = "GeoFS /update is rate-limited";
      return;
    }

    if (!updateFresh && bridgeFresh) {
      this.state.health.degradedReason = "bridge alive but no traffic";
      return;
    }

    this.state.health.degradedReason =
      this.state.health.activeFallbacks.length > 0
        ? this.state.health.activeFallbacks[0]?.replaceAll("-", " ") ?? undefined
        : undefined;
  }

  private async maybeReinjectBridge(tabId: number | null): Promise<void> {
    if (tabId == null) {
      return;
    }

    const lastBridgeEventAt = this.state.health.lastBridgeEventAt ?? 0;
    if (lastBridgeEventAt && now() - lastBridgeEventAt < 20_000) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tabId, { type: "content/reinject-bridge" });
      this.state.health.lastBridgeReinjectAt = now();
      this.state.health.bridgeReinstallCount = (this.state.health.bridgeReinstallCount ?? 0) + 1;
    } catch {
      this.noteFailure("bridge-reinject-failed", `tab:${tabId}`, now());
    }
  }

  private async persist(): Promise<void> {
    await savePersistedWorkspaceState(this.persisted);
    this.state = this.createStateFromPersisted(this.persisted);
    this.broadcast({
      type: "background/state-snapshot",
      payload: { state: this.state }
    });
  }

  private broadcast(message: object): void {
    void chrome.runtime.sendMessage(message);
  }
}

const nextFocusColor = (index: number): string => {
  const colors = ["#3ec7a1", "#f9c74f", "#90be6d", "#f9844a", "#5dade2", "#ff6b6b"];
  return colors[index % colors.length] ?? "#3ec7a1";
};

const mergeChatLog = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] =>
  [...existing, ...incoming].slice(-150).sort((left, right) => left.timestamp - right.timestamp);
