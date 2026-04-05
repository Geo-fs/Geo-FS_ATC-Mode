import { DEFAULT_CHAT_SAFE_MAX } from "../config/constants";
import { createDefaultWorkspaceState } from "./defaults";
import { createDefaultChartOverlayState } from "../../domain/maps/chartOverlay";
import type { PersistedWorkspaceState } from "../contracts/storage";

const defaults = createDefaultWorkspaceState();

export const validatePersistedWorkspaceState = (
  record: Partial<PersistedWorkspaceState>
): PersistedWorkspaceState => {
  const normalized = {
    ...defaults,
    ...record,
    layout: {
      ...defaults.layout,
      ...(record.layout ?? {})
    },
    filters: {
      ...defaults.filters,
      ...(record.filters ?? {})
    },
    airportPreferences: {
      ...defaults.airportPreferences,
      ...(record.airportPreferences ?? {})
    },
    settings: {
      ...defaults.settings,
      ...(record.settings ?? {})
    },
    templates: Array.isArray(record.templates) ? record.templates : defaults.templates,
    phrasePacks: Array.isArray(record.phrasePacks) ? record.phrasePacks : defaults.phrasePacks,
    controllerProfiles:
      Array.isArray(record.controllerProfiles) && record.controllerProfiles.length
        ? record.controllerProfiles.map((profile) => ({
            ...defaults.controllerProfiles[0],
            ...profile
          }))
        : defaults.controllerProfiles,
    referenceShelf: {
      ...defaults.referenceShelf,
      ...(record.referenceShelf ?? {}),
      pinnedByRole: {
        ...defaults.referenceShelf.pinnedByRole,
        ...(record.referenceShelf?.pinnedByRole ?? {})
      },
      notesByDocumentId: {
        ...defaults.referenceShelf.notesByDocumentId,
        ...(record.referenceShelf?.notesByDocumentId ?? {})
      }
    },
    recentDestinations: Array.isArray(record.recentDestinations)
      ? record.recentDestinations.filter((value): value is string => typeof value === "string").slice(0, 8)
      : defaults.recentDestinations,
    activeProfileId:
      record.activeProfileId ??
      record.controllerProfiles?.[0]?.id ??
      defaults.activeProfileId
  } satisfies PersistedWorkspaceState;

  normalized.settings.chatSafeMax = Math.max(
    40,
    Math.min(90, Number(normalized.settings.chatSafeMax) || DEFAULT_CHAT_SAFE_MAX)
  );
  normalized.filters.maxRangeNm = Math.max(5, Math.min(240, Number(normalized.filters.maxRangeNm) || defaults.filters.maxRangeNm));
  normalized.mapPanels = Array.isArray(record.mapPanels)
    ? record.mapPanels.map((panel, index) => ({
        ...defaults.mapPanels[index],
        ...panel,
        chartOverlay: {
          ...createDefaultChartOverlayState(
            panel.kind ?? defaults.mapPanels[index]?.kind ?? "traffic"
          ),
          ...(defaults.mapPanels[index]?.chartOverlay ?? {}),
          ...(panel.chartOverlay ?? {})
        }
      }))
    : defaults.mapPanels;

  return normalized;
};
