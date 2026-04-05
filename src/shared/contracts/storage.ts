import type { PhrasePack, MessageTemplate } from "../../domain/chat/types";
import type { FocusTarget } from "../../domain/focus/types";
import type { AirportPreferences, FilterPreferences, MapPanelState, WorkspaceLayoutState } from "../../domain/maps/types";
import type { ReferenceShelfState } from "../../domain/references/types";

export interface StoredSettings {
  chatSafeMax: number;
  copyOnlyFallback: boolean;
  hideBlankCallsigns: boolean;
  hideFooCallsigns: boolean;
  hideNullAcid: boolean;
  discoveryEnabled: boolean;
}

export interface ControllerProfile {
  id: string;
  name: string;
  layout: WorkspaceLayoutState;
  filters: FilterPreferences;
  mapPanels: MapPanelState[];
  referenceShelf: ReferenceShelfState;
  airportPreferences: AirportPreferences;
  templateIds: string[];
  phrasePackIds: string[];
}

export interface PersistedWorkspaceState {
  schemaVersion: number;
  layout: WorkspaceLayoutState;
  filters: FilterPreferences;
  mapPanels: MapPanelState[];
  focusTargets: FocusTarget[];
  templates: MessageTemplate[];
  phrasePacks: PhrasePack[];
  controllerProfiles: ControllerProfile[];
  activeProfileId: string;
  referenceShelf: ReferenceShelfState;
  airportPreferences: AirportPreferences;
  recentDestinations: string[];
  settings: StoredSettings;
}
