import {
  AIRCRAFT_HISTORY_LIMIT,
  CONTACT_DROP_MS,
  CONTACT_STALE_MS
} from "../../shared/config/constants";
import { ageMs, now } from "../../shared/utils/time";
import type { AircraftContact, AircraftTrackSample, TrafficSnapshot } from "./types";

export interface GeoFsRawUser {
  id?: string | number | null;
  acid?: string | number | null;
  ac?: string | number | null;
  cs?: string | null;
  co?: number[] | null;
  st?: {
    gr?: boolean | number | null;
    as?: number | null;
  } | null;
  ti?: number | null;
}

export class AircraftTracker {
  private contacts = new Map<string, AircraftContact>();

  upsertFromSnapshot(snapshot: TrafficSnapshot): AircraftContact[] {
    const receivedAt = now();

    for (const contact of snapshot.contacts) {
      const existing = this.contacts.get(contact.id);
      const historySample: AircraftTrackSample = {
        timestamp: receivedAt,
        latitude: contact.latitude,
        longitude: contact.longitude,
        altitudeFeet: contact.altitudeFeet,
        headingDegrees: contact.headingDegrees,
        speedLike: contact.speedLike
      };
      const history = [...(existing?.history ?? []), historySample].slice(-AIRCRAFT_HISTORY_LIMIT);
      const merged: AircraftContact = {
        ...existing,
        ...contact,
        receivedAt,
        history,
        stale: false
      };
      const previous = history.at(-2);

      if (previous) {
        merged.altitudeTrend = deriveTrend(contact.altitudeFeet - previous.altitudeFeet, "climb", "descend", "level");
        merged.speedTrend = deriveTrend(
          (contact.speedLike ?? 0) - (previous.speedLike ?? 0),
          "accelerating",
          "decelerating",
          "steady"
        );
        merged.headingTrend = deriveTrend(
          contact.headingDegrees - previous.headingDegrees,
          "turning-right",
          "turning-left",
          "steady"
        );
      }

      this.contacts.set(merged.id, merged);
    }

    this.markStale();
    this.dropExpired();

    return this.getContacts();
  }

  getContacts(): AircraftContact[] {
    return [...this.contacts.values()].sort((left, right) => {
      if (left.stale !== right.stale) {
        return Number(left.stale) - Number(right.stale);
      }

      return right.receivedAt - left.receivedAt;
    });
  }

  markChatActivity(userId: string): void {
    const existing = this.contacts.get(userId);
    if (!existing) {
      return;
    }

    this.contacts.set(userId, { ...existing, lastChatAt: now() });
  }

  private markStale(): void {
    for (const contact of this.contacts.values()) {
      const staleAge = ageMs(contact.receivedAt);
      if (staleAge != null && staleAge > CONTACT_STALE_MS) {
        contact.stale = true;
      }
    }
  }

  private dropExpired(): void {
    for (const [id, contact] of this.contacts.entries()) {
      const contactAge = ageMs(contact.receivedAt);
      if (contactAge != null && contactAge > CONTACT_DROP_MS) {
        this.contacts.delete(id);
      }
    }
  }
}

type TrendDirection =
  | "climb"
  | "descend"
  | "level"
  | "accelerating"
  | "decelerating"
  | "steady"
  | "turning-left"
  | "turning-right";

const deriveTrend = <TSteady extends TrendDirection>(
  delta: number,
  positive: TSteady,
  negative: TSteady,
  steady: TSteady
) => {
  if (delta > 25) {
    return { direction: positive, delta };
  }

  if (delta < -25) {
    return { direction: negative, delta };
  }

  return { direction: steady, delta };
};

export const normalizeGeoFsUser = (user: GeoFsRawUser, receivedAt = now()): AircraftContact | null => {
  const coordinates = Array.isArray(user.co) ? user.co : null;
  if (!coordinates || coordinates.length < 4 || user.id == null) {
    return null;
  }

  const [latitude, longitude, altitudeFeet, headingDegrees, pitchDegrees = 0, rollDegrees = 0] =
    coordinates;

  return {
    id: String(user.id),
    aircraftInstanceId: user.acid == null ? null : String(user.acid),
    aircraftCode: user.ac == null ? null : Number(user.ac),
    callsign: user.cs?.trim() ?? "",
    latitude,
    longitude,
    altitudeFeet,
    headingDegrees,
    pitchDegrees,
    rollDegrees,
    grounded: Boolean(user.st?.gr),
    speedLike: user.st?.as ?? null,
    timestamp: user.ti ?? null,
    receivedAt,
    stale: false,
    history: [],
    sourceAuthority: "local_authoritative"
  };
};
