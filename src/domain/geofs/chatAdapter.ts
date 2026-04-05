import { createId } from "../../shared/utils/id";
import { getPayloadSignature, isRecord, type GeoFsAdapterResult } from "./types";
import type { ChatMessage } from "../chat/types";

interface GeoFsChatMessageLike {
  uid?: string | number | null;
  acid?: string | number | null;
  cs?: string | null;
  rs?: string | null;
  msg?: string | null;
}

export const adaptGeoFsChatMessages = (
  payload: unknown
): GeoFsAdapterResult<ChatMessage[]> => {
  const signature = getPayloadSignature(payload);
  if (!Array.isArray(payload)) {
    return {
      status: "partial",
      data: [],
      signature,
      warnings: ["chatMessages missing or not an array"]
    };
  }

  const data = payload
    .filter((message): message is GeoFsChatMessageLike => isRecord(message))
    .filter((message) => typeof message.msg === "string" && typeof message.cs === "string")
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
    status: "ok",
    data,
    signature,
    warnings: []
  };
};

export const buildGeoFsChatInjectionBody = (
  requestBody: unknown,
  pendingChatMessage: string
): GeoFsAdapterResult<Record<string, unknown>> => {
  const signature = getPayloadSignature(requestBody);

  if (!pendingChatMessage) {
    return {
      status: "partial",
      data: isRecord(requestBody) ? requestBody : {},
      signature,
      warnings: ["no pending chat message"]
    };
  }

  if (!isRecord(requestBody)) {
    return {
      status: "unsupported_shape",
      data: null,
      signature,
      warnings: ["request body cannot accept injected chat field"]
    };
  }

  return {
    status: "ok",
    data: {
      ...requestBody,
      m: pendingChatMessage
    },
    signature,
    warnings: []
  };
};
