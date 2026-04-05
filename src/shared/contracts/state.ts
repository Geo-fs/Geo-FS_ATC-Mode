import type { AircraftContact, GeoFsConnectionHealth } from "../../domain/aircraft/types";
import type { AirportDefinition } from "../../domain/airports/types";
import type { ChatMessage, ClearanceDraft, MessageTemplate, PhrasePack } from "../../domain/chat/types";
import type { FocusTarget } from "../../domain/focus/types";
import type { AirportPreferences, FilterPreferences, MapPanelState, WorkspaceLayoutState } from "../../domain/maps/types";
import type { ReferenceShelfState } from "../../domain/references/types";
import type { WeatherSnapshot } from "../../domain/weather/types";
import type { ControllerProfile, StoredSettings } from "./storage";

export interface AppSessionState {
  contacts: AircraftContact[];
  discoveryContacts: AircraftContact[];
  chatLog: ChatMessage[];
  focusTargets: FocusTarget[];
  selectedAircraftId: string | null;
  weather: WeatherSnapshot | null;
  activeAirport: AirportDefinition;
  filters: FilterPreferences;
  mapPanels: MapPanelState[];
  layout: WorkspaceLayoutState;
  templates: MessageTemplate[];
  phrasePacks: PhrasePack[];
  controllerProfiles: ControllerProfile[];
  activeProfileId: string;
  clearanceDraft: ClearanceDraft | null;
  referenceShelf: ReferenceShelfState;
  airportPreferences: AirportPreferences;
  settings: StoredSettings;
  recentDestinations: string[];
  health: GeoFsConnectionHealth;
}
