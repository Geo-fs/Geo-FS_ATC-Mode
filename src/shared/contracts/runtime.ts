export type RuntimeMessage =
  | BackgroundRequestMessage
  | BackgroundEventMessage
  | ContentEventMessage
  | PageBridgeMessage;

export interface RequestMessage<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
}

export interface BackgroundRequestMap {
  "workspace/init": { clientId: string };
  "workspace/open-controller-window": undefined;
  "workspace/send-chat": { message: string; targetCallsign?: string | null };
  "workspace/update-focus": { aircraftId: string; pinned: boolean };
  "workspace/update-destination": { aircraftId: string; destinationIcao: string | null };
  "workspace/update-surface-clearance": {
    aircraftId: string;
    routeId: string | null;
    checkpointId: string | null;
    holdShortRunwayId: string | null;
    runwayCrossingState: "none" | "pending" | "cleared";
  };
  "workspace/set-airport": { airportIcao: string };
  "workspace/save-layout": { state: unknown };
  "workspace/save-settings": { state: unknown };
  "workspace/save-filters": { state: unknown };
  "workspace/save-map-panels": { state: unknown };
  "workspace/save-templates": { templates: unknown };
  "workspace/save-phrase-packs": { packs: unknown };
  "workspace/save-controller-profiles": { profiles: unknown; activeProfileId: string };
  "workspace/save-reference-shelf": { state: unknown };
  "content/request-state": undefined;
}

export interface BackgroundEventMap {
  "background/state-snapshot": { state: unknown };
  "background/chat-send-result": {
    ok: boolean;
    reason?: string;
    message: string;
    timestamp: number;
  };
  "background/runtime-event": { event: unknown };
}

export interface ContentEventMap {
  "content/bridge-event": { event: unknown };
  "content/heartbeat": { tabId?: number; visibilityState: DocumentVisibilityState };
}

export interface PageBridgeEventMap {
  "page/bridge-event": { event: unknown };
  "page/send-chat": { message: string };
}

export type BackgroundRequestMessage = {
  [K in keyof BackgroundRequestMap]: RequestMessage<K, BackgroundRequestMap[K]>;
}[keyof BackgroundRequestMap];

export type BackgroundEventMessage = {
  [K in keyof BackgroundEventMap]: RequestMessage<K, BackgroundEventMap[K]>;
}[keyof BackgroundEventMap];

export type ContentEventMessage = {
  [K in keyof ContentEventMap]: RequestMessage<K, ContentEventMap[K]>;
}[keyof ContentEventMap];

export type PageBridgeMessage = {
  [K in keyof PageBridgeEventMap]: RequestMessage<K, PageBridgeEventMap[K]>;
}[keyof PageBridgeEventMap];
