import type { PersistedWorkspaceState } from "../contracts/storage";
import { STORAGE_SCHEMA_VERSION } from "../config/constants";
import { createDefaultWorkspaceState } from "./defaults";
import { validatePersistedWorkspaceState } from "./validation";

const STORAGE_KEY = "geofs-atc-workspace";

const migrateState = (state: unknown): PersistedWorkspaceState => {
  const defaults = createDefaultWorkspaceState();

  if (!state || typeof state !== "object") {
    return defaults;
  }

  const record = state as Partial<PersistedWorkspaceState>;
  return {
    ...validatePersistedWorkspaceState(record),
    schemaVersion: STORAGE_SCHEMA_VERSION
  };
};

export const loadPersistedWorkspaceState = async (): Promise<PersistedWorkspaceState> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return migrateState(stored[STORAGE_KEY]);
};

export const savePersistedWorkspaceState = async (
  state: PersistedWorkspaceState
): Promise<void> => {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...state,
      schemaVersion: STORAGE_SCHEMA_VERSION
    }
  });
};
