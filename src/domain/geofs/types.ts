import type { GeoFsAdapterStatus } from "../aircraft/types";

export interface GeoFsAdapterResult<T> {
  status: GeoFsAdapterStatus;
  data: T | null;
  signature: string;
  warnings: string[];
}

export const getPayloadSignature = (payload: unknown): string => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return typeof payload;
  }

  return Object.keys(payload)
    .sort()
    .slice(0, 12)
    .join(",");
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
