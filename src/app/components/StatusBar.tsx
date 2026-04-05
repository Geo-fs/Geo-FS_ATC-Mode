import { useRef } from "react";
import { AIRPORTS } from "../../domain/airports/airports";
import { formatClockTime } from "../../shared/utils/time";
import { useWorkspaceStore } from "../store";

export const StatusBar = () => {
  const airport = useWorkspaceStore((state) => state.activeAirport);
  const weather = useWorkspaceStore((state) => state.weather);
  const health = useWorkspaceStore((state) => state.health);
  const statusMessage = useWorkspaceStore((state) => state.statusMessage);
  const layout = useWorkspaceStore((state) => state.layout);
  const settings = useWorkspaceStore((state) => state.settings);
  const controllerProfiles = useWorkspaceStore((state) => state.controllerProfiles);
  const activeProfileId = useWorkspaceStore((state) => state.activeProfileId);
  const activatePreset = useWorkspaceStore((state) => state.activatePreset);
  const openControllerWindow = useWorkspaceStore((state) => state.openControllerWindow);
  const setAirport = useWorkspaceStore((state) => state.setAirport);
  const saveSettings = useWorkspaceStore((state) => state.saveSettings);
  const activateControllerProfile = useWorkspaceStore((state) => state.activateControllerProfile);
  const exportActiveControllerProfile = useWorkspaceStore((state) => state.exportActiveControllerProfile);
  const importControllerProfiles = useWorkspaceStore((state) => state.importControllerProfiles);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const foregroundBlocked = health.activeFallbacks?.includes("foreground_required_blocked") ?? false;
  const geoFsLinkStatus = foregroundBlocked
    ? "Foreground required"
    : health.contentAttached
      ? "Attached"
      : "Waiting";
  const geoFsLinkDetail = foregroundBlocked
    ? "GeoFS must stay focused for live /update."
    : health.activeFallbacks?.includes("update-rate-limited")
      ? "GeoFS /update is currently rate-limited."
    : health.lastUpdateAt
      ? `Last update ${formatClockTime(health.lastUpdateAt)}`
      : "No traffic yet";
  const cadenceDetail = `${health.backgrounded ? "GeoFS tab backgrounded" : "GeoFS tab active"}${
    health.attachedGeoFsTabIds?.length && health.attachedGeoFsTabIds.length > 1
      ? ` | ${health.attachedGeoFsTabIds.length} tabs seen`
      : ""
  }`;
  const opsSummary = foregroundBlocked
    ? "GeoFS tab not focused; live feed suspended"
    : health.activeFallbacks?.includes("update-rate-limited")
      ? "GeoFS /update throttled; using fallback state"
    : health.degradedReason ?? "Controller workspace nominal";

  return (
    <div className="status-bar">
      <div className="status-cluster brand-cluster">
        <span className="eyebrow">ATC Console</span>
        <strong>{airport.icao}</strong>
        <span>{airport.name}</span>
        <label className="field-label">
          Airport
          <select value={airport.icao} onChange={(event) => void setAirport(event.target.value)}>
            {AIRPORTS.map((item) => (
              <option key={item.icao} value={item.icao}>
                {item.icao} {item.city}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="status-cluster">
        <span className="eyebrow">GeoFS Link</span>
        <strong>{geoFsLinkStatus}</strong>
        <span>{geoFsLinkDetail}</span>
        <span>{health.activeFallbacks?.length ? `${health.activeFallbacks.length} fallbacks active` : "Nominal"}</span>
      </div>
      <div className="status-cluster">
        <span className="eyebrow">Cadence</span>
        <strong>{health.updateCadenceMs ? `${health.updateCadenceMs} ms` : "n/a"}</strong>
        <span>{cadenceDetail}</span>
        <label className="field-label inline">
          <input
            type="checkbox"
            checked={settings.discoveryEnabled}
            onChange={(event) => void saveSettings({ discoveryEnabled: event.target.checked })}
          />
          Regional discovery
        </label>
      </div>
      <div className="status-cluster">
        <span className="eyebrow">Wind</span>
        <strong>
          {weather?.windDirectionDegrees != null
            ? `${weather.windDirectionDegrees} / ${weather.windSpeedKnots ?? 0}kt`
            : "No METAR"}
        </strong>
        <span>{weather?.metarText ?? "Weather unavailable"}</span>
        <label className="field-label">
          Profile
          <select
            value={activeProfileId}
            onChange={(event) => void activateControllerProfile(event.target.value)}
          >
            {controllerProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="status-cluster">
        <span className="eyebrow">Ops</span>
        <strong>{statusMessage ?? "Ready"}</strong>
        <span>{opsSummary}</span>
        <span>
          U:{health.capabilities?.updateParsingOk ? "Y" : "N"} M:{health.capabilities?.mapParsingOk ? "Y" : "N"} C:
          {health.capabilities?.chatInjectionOk ? "Y" : "N"} B:{health.capabilities?.bridgeHeartbeatOk ? "Y" : "N"}
        </span>
        <div className="status-actions">
          <button className="ghost-button" onClick={() => void openControllerWindow()}>
            Detached Window
          </button>
          <button className="ghost-button" onClick={() => void exportActiveControllerProfile()}>
            Export Profile
          </button>
          <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
            Import Profile
          </button>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="application/json"
            onChange={(event) => {
              const files = event.target.files;
              if (files?.length) {
                void importControllerProfiles(files);
              }
              event.currentTarget.value = "";
            }}
          />
          {layout.presets.map((preset) => (
            <button
              key={preset.id}
              className={layout.activePresetId === preset.id ? "focus-pill active" : "focus-pill"}
              onClick={() => void activatePreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
