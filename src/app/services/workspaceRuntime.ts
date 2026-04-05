import { createId } from "../../shared/utils/id";
import type { AppSessionState } from "../../shared/contracts/state";
import type { BackgroundEventMessage, BackgroundRequestMessage } from "../../shared/contracts/runtime";
import type { MapPanelState, WorkspaceLayoutState } from "../../domain/maps/types";
import type { ControllerProfile, PersistedWorkspaceState } from "../../shared/contracts/storage";
import type { PhrasePack } from "../../domain/chat/types";
import type { SurfaceCrossingState } from "../../domain/focus/types";

const sendRequest = async <TResponse = unknown>(message: BackgroundRequestMessage): Promise<TResponse> =>
  chrome.runtime.sendMessage(message) as Promise<TResponse>;

export const workspaceRuntime = {
  initialize: () =>
    sendRequest<BackgroundEventMessage>({
      type: "workspace/init",
      payload: { clientId: createId("workspace") }
    }),
  sendChat: (message: string, targetCallsign?: string | null) =>
    sendRequest<BackgroundEventMessage>({
      type: "workspace/send-chat",
      payload: { message, targetCallsign: targetCallsign ?? null }
    }),
  updateFocus: (aircraftId: string, pinned: boolean) =>
    sendRequest({
      type: "workspace/update-focus",
      payload: { aircraftId, pinned }
    }),
  updateDestination: (aircraftId: string, destinationIcao: string | null) =>
    sendRequest({
      type: "workspace/update-destination",
      payload: { aircraftId, destinationIcao }
    }),
  updateSurfaceClearance: (
    aircraftId: string,
    routeId: string | null,
    checkpointId: string | null,
    holdShortRunwayId: string | null,
    runwayCrossingState: SurfaceCrossingState
  ) =>
    sendRequest({
      type: "workspace/update-surface-clearance",
      payload: { aircraftId, routeId, checkpointId, holdShortRunwayId, runwayCrossingState }
    }),
  setAirport: (airportIcao: string) =>
    sendRequest({
      type: "workspace/set-airport",
      payload: { airportIcao }
    }),
  saveLayout: (state: WorkspaceLayoutState) =>
    sendRequest({
      type: "workspace/save-layout",
      payload: { state }
    }),
  saveFilters: (state: PersistedWorkspaceState["filters"]) =>
    sendRequest({
      type: "workspace/save-filters",
      payload: { state }
    }),
  saveMapPanels: (state: MapPanelState[]) =>
    sendRequest({
      type: "workspace/save-map-panels",
      payload: { state }
    }),
  saveTemplates: (templates: PersistedWorkspaceState["templates"]) =>
    sendRequest({
      type: "workspace/save-templates",
      payload: { templates }
    }),
  savePhrasePacks: (packs: PhrasePack[]) =>
    sendRequest({
      type: "workspace/save-phrase-packs",
      payload: { packs }
    }),
  saveControllerProfiles: (profiles: ControllerProfile[], activeProfileId: string) =>
    sendRequest({
      type: "workspace/save-controller-profiles",
      payload: { profiles, activeProfileId }
    }),
  saveSettings: (state: PersistedWorkspaceState["settings"]) =>
    sendRequest({
      type: "workspace/save-settings",
      payload: { state }
    }),
  saveReferenceShelf: (state: PersistedWorkspaceState["referenceShelf"]) =>
    sendRequest({
      type: "workspace/save-reference-shelf",
      payload: { state }
    }),
  openControllerWindow: () =>
    sendRequest({
      type: "workspace/open-controller-window",
      payload: undefined
    }),
  subscribe(listener: (state: AppSessionState) => void, onChatResult: (message: string) => void) {
    const callback = (message: BackgroundEventMessage) => {
      if (message.type === "background/state-snapshot" && message.payload?.state) {
        listener(message.payload.state as AppSessionState);
      }

      if (message.type === "background/chat-send-result") {
        onChatResult(
          message.payload.ok
            ? `Sent at ${new Date(message.payload.timestamp).toLocaleTimeString()}`
            : (message.payload.reason ?? "Unable to send message.")
        );
      }
    };

    chrome.runtime.onMessage.addListener(callback);
    return () => chrome.runtime.onMessage.removeListener(callback);
  }
};
