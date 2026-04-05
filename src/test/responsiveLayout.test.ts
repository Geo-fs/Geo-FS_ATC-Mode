import { describe, expect, it } from "vitest";
import { getWorkspaceBreakpoint, resolveResponsiveLayout } from "../app/layout/responsiveLayout";
import { createDefaultWorkspaceState } from "../shared/persistence/defaults";

describe("responsive layout", () => {
  it("selects compact breakpoint for narrow widths", () => {
    expect(getWorkspaceBreakpoint(900)).toBe("compact");
    expect(getWorkspaceBreakpoint(1200)).toBe("standard");
    expect(getWorkspaceBreakpoint(1600)).toBe("wide");
  });

  it("uses preset responsive layout when available", () => {
    const defaults = createDefaultWorkspaceState();
    const compact = resolveResponsiveLayout(defaults.layout, "compact");

    expect(compact.length).toBeGreaterThan(0);
    expect(compact.some((item) => item.i === "traffic-map")).toBe(true);
  });
});
