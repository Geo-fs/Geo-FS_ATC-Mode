import { PanelFrame } from "../layout/PanelFrame";
import { useShallow } from "zustand/react/shallow";
import { selectDiagnosticsState, useWorkspaceStore } from "../store";
import { formatClockTime } from "../../shared/utils/time";

export const SettingsPanel = () => {
  const {
    filters,
    settings,
    mapPanels,
    activeAirport,
    activeProfileId,
    controllerProfiles,
    diagnostics,
    saveFilters,
    saveSettings,
    saveMapPanels
  } = useWorkspaceStore(
    useShallow((state) => ({
      filters: state.filters,
      settings: state.settings,
      mapPanels: state.mapPanels,
      activeAirport: state.activeAirport,
      activeProfileId: state.activeProfileId,
      controllerProfiles: state.controllerProfiles,
      diagnostics: selectDiagnosticsState(state),
      saveFilters: state.saveFilters,
      saveSettings: state.saveSettings,
      saveMapPanels: state.saveMapPanels
    }))
  );

  return (
    <PanelFrame title="Settings / Options" status={`${activeAirport.icao} | ${mapPanels.length} maps`}>
      <div className="settings-panel">
        <div className="settings-grid">
          <section className="settings-card">
            <span className="eyebrow">Traffic Filter</span>
            <label className="field-label">
              Callsign query
              <input
                className="filter-input"
                value={filters.callsignQuery}
                onChange={(event) => void saveFilters({ callsignQuery: event.target.value })}
                placeholder="DAL, N123, etc."
              />
            </label>
            <label className="field-label">
              Max range (nm)
              <input
                className="filter-input"
                type="number"
                min="5"
                max="240"
                value={filters.maxRangeNm}
                onChange={(event) => void saveFilters({ maxRangeNm: Number(event.target.value) || 60 })}
              />
            </label>
            <div className="settings-toggle-list">
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={filters.activeOnly}
                  onChange={(event) => void saveFilters({ activeOnly: event.target.checked })}
                />
                Active only
              </label>
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={filters.focusedOnly}
                  onChange={(event) => void saveFilters({ focusedOnly: event.target.checked })}
                />
                Focused only
              </label>
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={filters.groundedOnly}
                  onChange={(event) =>
                    void saveFilters({
                      groundedOnly: event.target.checked,
                      airborneOnly: event.target.checked ? false : filters.airborneOnly
                    })
                  }
                />
                Grounded only
              </label>
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={filters.airborneOnly}
                  onChange={(event) =>
                    void saveFilters({
                      airborneOnly: event.target.checked,
                      groundedOnly: event.target.checked ? false : filters.groundedOnly
                    })
                  }
                />
                Airborne only
              </label>
            </div>
          </section>

          <section className="settings-card">
            <span className="eyebrow">Chat / Safety</span>
            <label className="field-label">
              Safe chat max
              <input
                className="filter-input"
                type="number"
                min="40"
                max="90"
                value={settings.chatSafeMax}
                onChange={(event) =>
                  void saveSettings({
                    chatSafeMax: Math.max(40, Math.min(90, Number(event.target.value) || settings.chatSafeMax))
                  })
                }
              />
            </label>
            <div className="settings-toggle-list">
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={settings.copyOnlyFallback}
                  onChange={(event) => void saveSettings({ copyOnlyFallback: event.target.checked })}
                />
                Copy-only fallback
              </label>
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={settings.discoveryEnabled}
                  onChange={(event) => void saveSettings({ discoveryEnabled: event.target.checked })}
                />
                Regional discovery
              </label>
            </div>
          </section>

          <section className="settings-card">
            <span className="eyebrow">Contact Hygiene</span>
            <div className="settings-toggle-list">
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={settings.hideBlankCallsigns}
                  onChange={(event) => void saveSettings({ hideBlankCallsigns: event.target.checked })}
                />
                Hide blank callsigns
              </label>
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={settings.hideFooCallsigns}
                  onChange={(event) => void saveSettings({ hideFooCallsigns: event.target.checked })}
                />
                Hide `foo`
              </label>
              <label className="field-label inline">
                <input
                  type="checkbox"
                  checked={settings.hideNullAcid}
                  onChange={(event) => void saveSettings({ hideNullAcid: event.target.checked })}
                />
                Hide null ACID
              </label>
            </div>
          </section>

          <section className="settings-card">
            <span className="eyebrow">Map Layers</span>
            <div className="settings-map-list">
              {mapPanels.map((panel) => (
                <div key={panel.id} className="settings-map-row">
                  <strong>{panel.title}</strong>
                  <div className="settings-toggle-list">
                    {Object.entries(panel.toggles).map(([toggle, enabled]) => (
                      <label key={toggle} className="field-label inline">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(event) =>
                            void saveMapPanels(
                              mapPanels.map((item) =>
                                item.id === panel.id
                                  ? {
                                      ...item,
                                      toggles: {
                                        ...item.toggles,
                                        [toggle]: event.target.checked
                                      }
                                    }
                                  : item
                              )
                            )
                          }
                        />
                        {toggle}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-card">
            <span className="eyebrow">Diagnostics</span>
            {diagnostics.foregroundBlocked ? (
              <div className="inline-status warning">
                GeoFS is attached but not focused. Live /update traffic is suspended until that tab returns to the foreground.
              </div>
            ) : null}
            <div className="diagnostics-grid">
              <div className="diagnostic-row">
                <strong>Attached tab</strong>
                <span>{diagnostics.activeTabId ?? "none"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Seen tabs</strong>
                <span>{diagnostics.attachedTabIds.join(", ") || "none"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Focus state</strong>
                <span>{diagnostics.backgrounded ? "GeoFS backgrounded" : "GeoFS foregrounded"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Current mode</strong>
                <span>{diagnostics.degradedReason ?? "Nominal"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Last /update</strong>
                <span>{diagnostics.lastUpdateAt ? formatClockTime(diagnostics.lastUpdateAt) : "n/a"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Last /map</strong>
                <span>{diagnostics.lastMapAt ? formatClockTime(diagnostics.lastMapAt) : "n/a"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Last /update 429</strong>
                <span>
                  {diagnostics.lastUpdateRateLimitedAt
                    ? formatClockTime(diagnostics.lastUpdateRateLimitedAt)
                    : "n/a"}
                </span>
              </div>
              <div className="diagnostic-row">
                <strong>Last bridge event</strong>
                <span>{diagnostics.lastBridgeEventAt ? formatClockTime(diagnostics.lastBridgeEventAt) : "n/a"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Last chat inject</strong>
                <span>
                  {diagnostics.lastChatInjectionAt ? formatClockTime(diagnostics.lastChatInjectionAt) : "n/a"}
                </span>
              </div>
              <div className="diagnostic-row">
                <strong>Capabilities</strong>
                <span>
                  U:{diagnostics.capabilities?.updateParsingOk ? "Y" : "N"} M:
                  {diagnostics.capabilities?.mapParsingOk ? "Y" : "N"} C:
                  {diagnostics.capabilities?.chatInjectionOk ? "Y" : "N"} B:
                  {diagnostics.capabilities?.bridgeHeartbeatOk ? "Y" : "N"}
                </span>
              </div>
              <div className="diagnostic-row">
                <strong>Fallbacks</strong>
                <span>{diagnostics.activeFallbacks.join(", ") || "none"}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Unsupported payloads</strong>
                <span>{diagnostics.unsupportedPayloadCount}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Parse failures</strong>
                <span>{diagnostics.parseFailureCount}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Bridge reinstalls</strong>
                <span>{diagnostics.bridgeReinstallCount}</span>
              </div>
              <div className="diagnostic-row">
                <strong>Last failure</strong>
                <span>
                  {diagnostics.lastFailureKind
                    ? `${diagnostics.lastFailureKind}${diagnostics.lastFailureAt ? ` @ ${formatClockTime(diagnostics.lastFailureAt)}` : ""}`
                    : "none"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-footer-note">
          <strong>Active profile:</strong>{" "}
          {controllerProfiles.find((profile) => profile.id === activeProfileId)?.name ?? "Default"}
        </div>
      </div>
    </PanelFrame>
  );
};
