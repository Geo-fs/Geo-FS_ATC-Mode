import { adaptGeoFsDiscoveryPayload } from "../geofs/discoveryAdapter";
import type { TrafficSnapshot } from "./types";

export interface TrafficDiscoveryProvider {
  id: string;
  fetchRegionalSnapshot(): Promise<TrafficSnapshot>;
}

export class GeoFsRegionalDiscoveryProvider implements TrafficDiscoveryProvider {
  id = "geofs-regional";

  async fetchRegionalSnapshot(): Promise<TrafficSnapshot> {
    const response = await fetch("https://mps.geo-fs.com/map", {
      credentials: "omit",
      cache: "no-store"
    });
    const payload = await response.json();
    const result = adaptGeoFsDiscoveryPayload(payload);
    const snapshot =
      result.data ??
      ({
        serverTime: null,
        userCount: 0,
        contacts: [],
        source: "map"
      } satisfies TrafficSnapshot);
    return {
      ...snapshot,
      contacts: snapshot.contacts.map((contact) => ({
        ...contact,
        sourceAuthority: "regional_advisory" as const
      }))
    };
  }
}
