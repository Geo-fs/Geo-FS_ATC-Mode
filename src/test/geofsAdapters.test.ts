import { describe, expect, it } from "vitest";
import { adaptGeoFsMapPayload, adaptGeoFsUpdatePayload } from "../domain/geofs/trafficAdapter";

describe("GeoFS adapters", () => {
  it("accepts a valid /update payload", () => {
    const result = adaptGeoFsUpdatePayload({
      userCount: 1,
      serverTime: 1234,
      users: [
        {
          id: "1",
          acid: 22,
          ac: 16,
          cs: "DAL123",
          co: [44.8, -93.2, 5000, 120, 0, 0],
          st: { gr: 0, as: 180 },
          ti: 1000
        }
      ],
      chatMessages: [{ uid: "1", acid: "22", cs: "DAL123", msg: "hello" }]
    });

    expect(result.status).toBe("ok");
    expect(result.data?.snapshot.contacts).toHaveLength(1);
    expect(result.data?.chatMessages[0]?.message).toBe("hello");
  });

  it("returns unsupported_shape for malformed /map payloads", () => {
    const result = adaptGeoFsMapPayload("bad-shape");
    expect(result.status).toBe("unsupported_shape");
    expect(result.data).toBeNull();
  });

  it("returns partial when /update lacks chat but still has users", () => {
    const result = adaptGeoFsUpdatePayload({
      users: [
        {
          id: "1",
          acid: 22,
          ac: 16,
          cs: "DAL123",
          co: [44.8, -93.2, 5000, 120, 0, 0],
          st: { gr: 0, as: 180 },
          ti: 1000
        }
      ]
    });

    expect(result.status).toBe("partial");
    expect(result.data?.snapshot.contacts).toHaveLength(1);
    expect(result.data?.chatMessages).toEqual([]);
  });
});
