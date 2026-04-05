import { assessRunwayWind } from "../../domain/airports/airports";
import { PanelFrame } from "../layout/PanelFrame";
import { useWorkspaceStore } from "../store";

export const WeatherPanel = () => {
  const weather = useWorkspaceStore((state) => state.weather);
  const airport = useWorkspaceStore((state) => state.activeAirport);
  const assessments = assessRunwayWind(airport, weather);
  const favoredRunway = assessments
    .slice()
    .sort((left, right) => right.headwindComponent - left.headwindComponent)[0];

  return (
    <PanelFrame
      title="Weather / Runway"
      status={favoredRunway ? `Favored ${favoredRunway.runwayId}` : "No wind solution"}
    >
      <div className="weather-panel">
        <div className="weather-summary">
          <strong>{weather?.metarText ?? "No METAR available"}</strong>
          <span>
            Wind {weather?.windDirectionDegrees ?? "---"} / {weather?.windSpeedKnots ?? "--"} kt
          </span>
        </div>
        <div className="runway-assessments">
          {assessments.map((assessment) => (
            <div key={assessment.runwayId} className="assessment-row">
              <span>{assessment.runwayId}</span>
              <span>{assessment.headwindComponent.toFixed(0)} hw</span>
              <span>{Math.abs(assessment.crosswindComponent).toFixed(0)} xw</span>
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
};
