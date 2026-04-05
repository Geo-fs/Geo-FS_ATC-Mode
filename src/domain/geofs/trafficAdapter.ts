import { normalizeGeoFsUser } from "../aircraft/tracker";
import type { AircraftContact, TrafficSnapshot } from "../aircraft/types";
import { adaptGeoFsChatMessages } from "./chatAdapter";
import { getPayloadSignature, isRecord, type GeoFsAdapterResult } from "./types";
import type { ChatMessage } from "../chat/types";

export interface AdaptedGeoFsUpdate {
  snapshot: TrafficSnapshot;
  chatMessages: ChatMessage[];
  lastMsgId: number | null;
}

const normalizeUsers = (users: unknown): AircraftContact[] =>
  (Array.isArray(users) ? users : [])
    .map((user) => normalizeGeoFsUser(user as Parameters<typeof normalizeGeoFsUser>[0]))
    .filter((contact): contact is AircraftContact => contact !== null);

export const adaptGeoFsUpdatePayload = (
  payload: unknown
): GeoFsAdapterResult<AdaptedGeoFsUpdate> => {
  const signature = getPayloadSignature(payload);
  if (!isRecord(payload)) {
    return {
      status: "unsupported_shape",
      data: null,
      signature,
      warnings: ["update payload is not an object"]
    };
  }

  const contacts = normalizeUsers(payload.users);
  const chat = adaptGeoFsChatMessages(payload.chatMessages);
  const warnings = [...chat.warnings];
  let status: GeoFsAdapterResult<AdaptedGeoFsUpdate>["status"] = "ok";

  if (!Array.isArray(payload.users)) {
    warnings.push("users missing or not an array");
    status = "partial";
  }

  if (!Array.isArray(payload.chatMessages)) {
    status = "partial";
  }

  if (!contacts.length && !Array.isArray(payload.users)) {
    status = "unsupported_shape";
  }

  return {
    status,
    signature,
    warnings,
    data: {
      snapshot: {
        serverTime: typeof payload.serverTime === "number" ? payload.serverTime : null,
        userCount: typeof payload.userCount === "number" ? payload.userCount : contacts.length,
        contacts,
        source: "update"
      },
      chatMessages: chat.data ?? [],
      lastMsgId: typeof payload.lastMsgId === "number" ? payload.lastMsgId : null
    }
  };
};

export const adaptGeoFsMapPayload = (
  payload: unknown
): GeoFsAdapterResult<TrafficSnapshot> => {
  const signature = getPayloadSignature(payload);
  if (!isRecord(payload)) {
    return {
      status: "unsupported_shape",
      data: null,
      signature,
      warnings: ["map payload is not an object"]
    };
  }

  const contacts = normalizeUsers(payload.users);
  const warnings: string[] = [];
  let status: GeoFsAdapterResult<TrafficSnapshot>["status"] = "ok";

  if (!Array.isArray(payload.users)) {
    warnings.push("users missing or not an array");
    status = "unsupported_shape";
  }

  return {
    status,
    signature,
    warnings,
    data: {
      serverTime: null,
      userCount: typeof payload.userCount === "number" ? payload.userCount : contacts.length,
      contacts,
      source: "map"
    }
  };
};
