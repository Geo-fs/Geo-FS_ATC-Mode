import type { ControllerProfile, PersistedWorkspaceState } from "../contracts/storage";

export const buildControllerProfileSnapshot = (
  name: string,
  state: PersistedWorkspaceState,
  activeTemplateIds = state.templates.map((template) => template.id),
  activePhrasePackIds = state.phrasePacks.map((pack) => pack.id)
): ControllerProfile => ({
  id: `profile-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom"}`,
  name,
  layout: state.layout,
  filters: state.filters,
  mapPanels: state.mapPanels,
  referenceShelf: state.referenceShelf,
  airportPreferences: state.airportPreferences,
  templateIds: activeTemplateIds,
  phrasePackIds: activePhrasePackIds
});

export const applyControllerProfileToState = (
  persisted: PersistedWorkspaceState,
  profile: ControllerProfile
): PersistedWorkspaceState => ({
  ...persisted,
  activeProfileId: profile.id,
  layout: profile.layout,
  filters: profile.filters,
  mapPanels: profile.mapPanels,
  referenceShelf: profile.referenceShelf,
  airportPreferences: profile.airportPreferences
});
