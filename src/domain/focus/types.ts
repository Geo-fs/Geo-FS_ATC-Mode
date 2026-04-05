export type FocusMode = "approach" | "tower" | "ground";
export type SurfaceCrossingState = "none" | "pending" | "cleared";

export interface SurfaceClearanceState {
  routeId: string | null;
  activeCheckpointId: string | null;
  holdShortRunwayId: string | null;
  runwayCrossingState: SurfaceCrossingState;
}

export interface FocusTarget {
  aircraftId: string;
  color: string;
  mode: FocusMode;
  pinnedAt: number;
  destinationIcao: string | null;
  surfaceClearance?: SurfaceClearanceState;
}
