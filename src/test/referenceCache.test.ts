import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReferenceVersionKey, getReferenceTextCacheEntry, saveReferenceTextCacheEntry } from "../shared/persistence/referenceCache";

const storageState: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(storageState)) {
    delete storageState[key];
  }

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storageState[key] })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.assign(storageState, value);
        })
      }
    }
  });
});

describe("reference cache", () => {
  it("creates stable version keys", () => {
    const key = createReferenceVersionKey({
      id: "doc1",
      title: "Doc",
      type: "pdf",
      airportIcao: "KMSP",
      sourceKind: "bundled_asset",
      sourcePath: "/doc.pdf",
      category: "tac",
      tags: [],
      versionTag: "v1"
    });

    expect(key).toContain("doc1");
    expect(key).toContain("v1");
  });

  it("returns cache hit only when version matches", async () => {
    const document = {
      id: "doc1",
      title: "Doc",
      type: "pdf" as const,
      airportIcao: "KMSP",
      sourceKind: "bundled_asset" as const,
      sourcePath: "/doc.pdf",
      category: "tac" as const,
      tags: [],
      versionTag: "v1"
    };

    await saveReferenceTextCacheEntry({
      documentId: "doc1",
      versionKey: createReferenceVersionKey(document),
      extractedAt: Date.now(),
      ok: true,
      pageTexts: [{ pageNumber: 1, text: "hello" }]
    });

    const hit = await getReferenceTextCacheEntry(document);
    const miss = await getReferenceTextCacheEntry({ ...document, versionTag: "v2" });

    expect(hit?.pageTexts[0]?.text).toBe("hello");
    expect(miss).toBeNull();
  });

  it("stores failed extraction entries cleanly", async () => {
    const document = {
      id: "doc2",
      title: "Doc 2",
      type: "pdf" as const,
      airportIcao: "KMSP",
      sourceKind: "bundled_asset" as const,
      sourcePath: "/doc2.pdf",
      category: "tac" as const,
      tags: [],
      versionTag: "v1"
    };

    await saveReferenceTextCacheEntry({
      documentId: "doc2",
      versionKey: createReferenceVersionKey(document),
      extractedAt: Date.now(),
      ok: false,
      pageTexts: [],
      error: "image only"
    });

    const hit = await getReferenceTextCacheEntry(document);
    expect(hit?.ok).toBe(false);
    expect(hit?.error).toBe("image only");
  });
});
