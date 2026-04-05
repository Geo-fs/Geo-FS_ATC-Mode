import type { WorkspaceBreakpoint, WorkspaceLayoutItem, WorkspaceLayoutState } from "../../domain/maps/types";

export const getWorkspaceBreakpoint = (width: number): WorkspaceBreakpoint => {
  if (width >= 1500) {
    return "wide";
  }

  if (width >= 1150) {
    return "standard";
  }

  return "compact";
};

export const resolveResponsiveLayout = (
  layout: WorkspaceLayoutState,
  breakpoint: WorkspaceBreakpoint
): WorkspaceLayoutItem[] => {
  const activePreset = layout.presets.find((preset) => preset.id === layout.activePresetId);
  return activePreset?.responsiveLayouts?.[breakpoint] ?? layout.layouts;
};
