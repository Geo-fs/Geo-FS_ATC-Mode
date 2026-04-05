import { assessAircraftOperationalAdvisory } from "../../domain/aircraft/advisories";
import { useShallow } from "zustand/react/shallow";
import { PanelFrame } from "../layout/PanelFrame";
import { selectConflictByContactId, selectDiagnosticsState, selectFilteredContacts, useWorkspaceStore } from "../store";

export const TrafficTable = () => {
  const {
    contacts,
    conflictByContactId,
    diagnostics,
    weather,
    airport,
    focusTargets,
    selectedAircraftId,
    setSelectedAircraft,
    toggleFocus
  } = useWorkspaceStore(
    useShallow((state) => ({
      contacts: selectFilteredContacts(state),
      conflictByContactId: selectConflictByContactId(state),
      diagnostics: selectDiagnosticsState(state),
      weather: state.weather,
      airport: state.activeAirport,
      focusTargets: state.focusTargets,
      selectedAircraftId: state.selectedAircraftId,
      setSelectedAircraft: state.setSelectedAircraft,
      toggleFocus: state.toggleFocus
    }))
  );
  const trafficStatus = `${contacts.length} contacts${
    diagnostics.foregroundBlocked
      ? " | last-known local traffic"
      : diagnostics.activeFallbacks.includes("update-unsupported")
        ? " | update degraded"
        : ""
  }`;

  return (
    <PanelFrame title="Traffic" status={trafficStatus}>
      <div className="traffic-table-shell">
        {diagnostics.activeFallbacks.length ? (
          <div className="inline-status">
            {diagnostics.foregroundBlocked
              ? "GeoFS is not focused. Showing last-known local traffic with stale emphasis and any regional advisory contacts."
              : `Fallbacks active: ${diagnostics.activeFallbacks.join(", ")}`}
          </div>
        ) : null}
        {contacts.length === 0 ? (
          <div className="empty-state">No traffic in range.</div>
        ) : (
          <table className="traffic-table">
            <thead>
              <tr>
                <th>Callsign</th>
                <th>State</th>
                <th>Alt</th>
                <th>Spd</th>
                <th>Src</th>
                <th>Focus</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const isSelected = selectedAircraftId === contact.id;
                const focusTarget = focusTargets.find((target) => target.aircraftId === contact.id);
                const advisory = assessAircraftOperationalAdvisory(contact, airport, weather, focusTarget);
                const conflicts = conflictByContactId.get(contact.id) ?? [];

                return (
                  <tr
                    key={contact.id}
                    className={isSelected ? "selected-row" : undefined}
                    tabIndex={0}
                    onClick={() => setSelectedAircraft(contact.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedAircraft(contact.id);
                      }
                      if (event.key.toLowerCase() === "f") {
                        event.preventDefault();
                        void toggleFocus(contact.id, !focusTarget);
                      }
                    }}
                  >
                    <td>
                      <div className="traffic-primary">
                        <strong>{contact.callsign || "Unknown"}</strong>
                        {conflicts[0] ? (
                          <span className="traffic-conflict">{conflicts[0].summary}</span>
                        ) : (
                          <span className="traffic-conflict">{advisory.sequencingHint}</span>
                        )}
                        {contact.stale ? <span className="traffic-tag warning">STALE</span> : null}
                        {contact.sourceAuthority === "regional_advisory" ? (
                          <span className="traffic-tag info">ADVISORY ONLY</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{contact.grounded ? advisory.movementState : advisory.flow}</td>
                    <td>{Math.round(contact.altitudeFeet)}</td>
                    <td>{Math.round(contact.speedLike ?? 0)}</td>
                    <td>{contact.sourceAuthority === "regional_advisory" ? "REG" : "LOC"}</td>
                    <td>
                      <button
                        className={focusTarget ? "focus-pill active" : "focus-pill"}
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleFocus(contact.id, !focusTarget);
                        }}
                      >
                        {focusTarget ? "Pinned" : "Pin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PanelFrame>
  );
};
