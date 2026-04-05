import { AIRPORTS, getNearestRunway, getSuggestedDepartureRunway } from "../../domain/airports/airports";
import { assessAircraftOperationalAdvisory } from "../../domain/aircraft/advisories";
import { buildReferenceSelectionContext, resolveReferenceForContext } from "../../domain/references/resolver";
import { useShallow } from "zustand/react/shallow";
import { PanelFrame } from "../layout/PanelFrame";
import { selectAllReferenceDocuments, selectAirportRoutes, selectFocusedAircraft, useWorkspaceStore } from "../store";
import type { ReferenceViewRole } from "../../domain/references/types";

export const FocusPanel = () => {
  const {
    focused,
    airportRoutes,
    weather,
    activeAirport,
    referenceShelf,
    documents,
    assignDestination,
    selectReferenceDocument,
    updateSurfaceClearance
  } = useWorkspaceStore(
    useShallow((state) => ({
      focused: selectFocusedAircraft(state),
      airportRoutes: selectAirportRoutes(state),
      weather: state.weather,
      activeAirport: state.activeAirport,
      referenceShelf: state.referenceShelf,
      documents: selectAllReferenceDocuments(state),
      assignDestination: state.assignDestination,
      selectReferenceDocument: state.selectReferenceDocument,
      updateSurfaceClearance: state.updateSurfaceClearance
    }))
  );

  return (
    <PanelFrame title="Focused Aircraft" status={`${focused.length} pinned`}>
      <div className="focus-grid">
        {focused.length === 0 ? (
          <div className="empty-state">Pin aircraft from the traffic table or any map.</div>
        ) : (
          focused.map(({ target, contact }) => {
            const runway = getNearestRunway(contact);
            const suggested = getSuggestedDepartureRunway(target.destinationIcao, weather, activeAirport);
            const advisory = assessAircraftOperationalAdvisory(contact, activeAirport, weather, target);
            const referenceRole: ReferenceViewRole =
              target.mode === "ground"
                ? "ground_reference"
                : target.mode === "approach"
                  ? "airspace_reference"
                  : "procedure_reference";
            const recommendation = resolveReferenceForContext(
              documents,
              buildReferenceSelectionContext({
                airportIcao: activeAirport.icao,
                selectedAircraftGrounded: contact.grounded,
                hasSelectedAircraft: true,
                focusModes: [target.mode],
                hasWeather: Boolean(weather),
                destinationIcao: target.destinationIcao,
                role: referenceRole
              }),
              referenceShelf.pinnedByRole
            );
            const surfaceClearance = target.surfaceClearance;
            const route = airportRoutes.find((item) => item.id === surfaceClearance?.routeId);

            return (
              <article key={contact.id} className="focus-card" style={{ borderColor: target.color }}>
                <div className="focus-head">
                  <strong>{contact.callsign}</strong>
                  <span>{target.mode.toUpperCase()}</span>
                </div>
                <div className="focus-metrics">
                  <span>{Math.round(contact.altitudeFeet)} ft</span>
                  <span>{Math.round(contact.speedLike ?? 0)} kt-ish</span>
                  <span>{contact.grounded ? "Grounded" : "Airborne"}</span>
                  <span>{contact.sourceAuthority === "regional_advisory" ? "Regional advisory" : "Local"}</span>
                </div>
                <div className="focus-notes">
                  <span>Nearest runway: {runway?.id ?? "n/a"}</span>
                  <span>Suggested dep: {suggested?.id ?? "n/a"}</span>
                  <span>Flow: {advisory.flow}</span>
                </div>
                <div className="focus-reference-note">
                  <strong>{advisory.alert?.label ?? "Operational advisory"}</strong>
                  <span>{advisory.sequencingHint}</span>
                </div>
                <div className="focus-actions">
                  <button
                    className="chip-button"
                    onClick={() =>
                      recommendation ? void selectReferenceDocument(recommendation.document.id) : undefined
                    }
                  >
                    Open Best Chart
                  </button>
                </div>
                {recommendation ? (
                  <div className="focus-reference-note">
                    <strong>{recommendation.document.title}</strong>
                    <span>{recommendation.reasons[0] ?? "Recommended for current context"}</span>
                  </div>
                ) : null}
                <label className="field-label">
                  Destination
                  <select
                    value={target.destinationIcao ?? ""}
                    onChange={(event) => void assignDestination(contact.id, event.target.value || null)}
                  >
                    <option value="">None</option>
                    {AIRPORTS.map((airport) => (
                      <option key={airport.icao} value={airport.icao}>
                        {airport.icao} {airport.city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Surface route
                  <select
                    value={surfaceClearance?.routeId ?? ""}
                    onChange={(event) => {
                      const nextRoute = airportRoutes.find((item) => item.id === event.target.value);
                      const firstCheckpoint = nextRoute?.checkpoints[0] ?? null;
                      void updateSurfaceClearance(
                        contact.id,
                        nextRoute?.id ?? null,
                        firstCheckpoint?.id ?? null,
                        nextRoute?.checkpoints.find((checkpoint) => checkpoint.kind === "hold_short")?.runwayId ?? null,
                        "none"
                      );
                    }}
                  >
                    <option value="">No route</option>
                    {airportRoutes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                {route ? (
                  <>
                    <label className="field-label">
                      Active checkpoint
                      <select
                        value={surfaceClearance?.activeCheckpointId ?? ""}
                        onChange={(event) =>
                          void updateSurfaceClearance(
                            contact.id,
                            route.id,
                            event.target.value || null,
                            surfaceClearance?.holdShortRunwayId ?? null,
                            surfaceClearance?.runwayCrossingState ?? "none"
                          )
                        }
                      >
                        {route.checkpoints.map((checkpoint) => (
                          <option key={checkpoint.id} value={checkpoint.id}>
                            {checkpoint.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Crossing state
                      <select
                        value={surfaceClearance?.runwayCrossingState ?? "none"}
                        onChange={(event) =>
                          void updateSurfaceClearance(
                            contact.id,
                            route.id,
                            surfaceClearance?.activeCheckpointId ?? null,
                            surfaceClearance?.holdShortRunwayId ?? null,
                            event.target.value as "none" | "pending" | "cleared"
                          )
                        }
                      >
                        <option value="none">None</option>
                        <option value="pending">Pending</option>
                        <option value="cleared">Cleared</option>
                      </select>
                    </label>
                    <div className="focus-reference-note">
                      <strong>Surface clearance</strong>
                      <span>
                        Route {route.label}
                        {surfaceClearance?.holdShortRunwayId
                          ? ` · Hold short ${surfaceClearance.holdShortRunwayId}`
                          : ""}
                        {surfaceClearance && surfaceClearance.runwayCrossingState !== "none"
                          ? ` · Crossing ${surfaceClearance.runwayCrossingState}`
                          : ""}
                      </span>
                    </div>
                  </>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </PanelFrame>
  );
};
