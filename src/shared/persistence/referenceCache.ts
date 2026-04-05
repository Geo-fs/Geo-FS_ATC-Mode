import type { ReferenceDocument, ReferenceTextCacheEntry } from "../../domain/references/types";

const CACHE_KEY = "geofs-atc-reference-text-cache";

type CacheRecord = Record<string, ReferenceTextCacheEntry>;

export const createReferenceVersionKey = (document: ReferenceDocument): string =>
  [
    document.id,
    document.versionTag ?? "",
    document.sourcePath,
    document.effectiveDate ?? "",
    document.expirationDate ?? ""
  ].join("|");

export const loadReferenceTextCache = async (): Promise<CacheRecord> => {
  const stored = await chrome.storage.local.get(CACHE_KEY);
  return (stored[CACHE_KEY] as CacheRecord | undefined) ?? {};
};

export const getReferenceTextCacheEntry = async (
  document: ReferenceDocument
): Promise<ReferenceTextCacheEntry | null> => {
  const cache = await loadReferenceTextCache();
  const entry = cache[document.id];
  if (!entry) {
    return null;
  }

  return entry.versionKey === createReferenceVersionKey(document) ? entry : null;
};

export const saveReferenceTextCacheEntry = async (
  entry: ReferenceTextCacheEntry
): Promise<void> => {
  const cache = await loadReferenceTextCache();
  cache[entry.documentId] = entry;
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
};
