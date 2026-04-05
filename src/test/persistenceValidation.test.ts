import { describe, expect, it } from "vitest";
import { validatePersistedWorkspaceState } from "../shared/persistence/validation";

describe("persisted workspace validation", () => {
  it("clamps invalid settings and falls back invalid arrays", () => {
    const result = validatePersistedWorkspaceState({
      settings: {
        chatSafeMax: 999,
        copyOnlyFallback: true,
        hideBlankCallsigns: true,
        hideFooCallsigns: true,
        hideNullAcid: false,
        discoveryEnabled: false
      },
      recentDestinations: ["KMSP", 123 as never, "KSTP"]
    });

    expect(result.settings.chatSafeMax).toBe(90);
    expect(result.recentDestinations).toEqual(["KMSP", "KSTP"]);
  });

  it("restores defaults when malformed state is provided", () => {
    const result = validatePersistedWorkspaceState({
      mapPanels: "bad" as never,
      templates: undefined,
      phrasePacks: undefined
    });

    expect(result.mapPanels.length).toBeGreaterThan(0);
    expect(result.templates.length).toBeGreaterThan(0);
    expect(result.phrasePacks.length).toBeGreaterThan(0);
  });
});
