import type { MapChartOverlayState, MapPanelKind } from "./types";

export const createDefaultChartOverlayState = (
  kind: MapPanelKind
): MapChartOverlayState => ({
  enabled: kind === "surface",
  opacity: kind === "surface" ? 0.68 : 0.5
});
