import { normalizeGeoFsUser } from "./tracker";
import type { AircraftContact, TrafficSnapshot } from "./types";
import type { ChatMessage } from "../chat/types";
import { createId } from "../../shared/utils/id";

export interface GeoFsUpdateResponse {
  myId?: string;
  userCount?: number;
  users?: unknown[];
  chatMessages?: Array<{
    uid?: string | number | null;
    acid?: string | number | null;
    cs?: string | null;
    rs?: string | null;
    msg?: string | null;
  }>;
  lastMsgId?: number;
  serverTime?: number;
}

export interface GeoFsMapResponse {
  userCount?: number;
  users?: unknown[];
}

export const parseGeoFsUpdateResponse = (payload: unknown): {
  snapshot: TrafficSnapshot;
  chatMessages: ChatMessage[];
  lastMsgId: number | null;
} => {
  const response = (payload ?? {}) as GeoFsUpdateResponse;
  const contacts = normalizeUsers(response.users);
  const chatMessages = (response.chatMessages ?? [])
    .filter((message) => message.msg && message.cs)
    .map<ChatMessage>((message) => ({
      id: createId("chat"),
      direction: "inbound",
      timestamp: Date.now(),
      senderUserId: message.uid == null ? null : String(message.uid),
      senderAircraftId: message.acid == null ? null : String(message.acid),
      callsign: message.cs?.trim() ?? "UNKNOWN",
      message: message.msg?.trim() ?? "",
      roomScope: message.rs ?? null
    }));

  return {
    snapshot: {
      serverTime: response.serverTime ?? null,
      userCount: response.userCount ?? contacts.length,
      contacts,
      source: "update"
    },
    chatMessages,
    lastMsgId: response.lastMsgId ?? null
  };
};

export const parseGeoFsMapResponse = (payload: unknown): TrafficSnapshot => {
  const response = (payload ?? {}) as GeoFsMapResponse;
  const contacts = normalizeUsers(response.users);

  return {
    serverTime: null,
    userCount: response.userCount ?? contacts.length,
    contacts,
    source: "map"
  };
};

const normalizeUsers = (users: unknown[] | undefined): AircraftContact[] =>
  (users ?? [])
    .map((user) => normalizeGeoFsUser(user as Parameters<typeof normalizeGeoFsUser>[0]))
    .filter((contact): contact is AircraftContact => contact !== null);
