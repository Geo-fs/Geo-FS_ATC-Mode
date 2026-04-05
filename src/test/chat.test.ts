import { describe, expect, it } from "vitest";
import { DEFAULT_CHAT_SAFE_MAX } from "../shared/config/constants";
import { DEFAULT_MESSAGE_TEMPLATES, renderTemplate, validateOutboundMessage } from "../domain/chat/templates";

describe("chat validation", () => {
  it("accepts concise messages within safe max", () => {
    const result = validateOutboundMessage("DAL123 hold short rwy 12R", DEFAULT_CHAT_SAFE_MAX);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("rejects messages that exceed safe max", () => {
    const result = validateOutboundMessage("A".repeat(DEFAULT_CHAT_SAFE_MAX + 1), DEFAULT_CHAT_SAFE_MAX);
    expect(result.ok).toBe(false);
  });

  it("renders templates with substitutions", () => {
    const result = renderTemplate(DEFAULT_MESSAGE_TEMPLATES[0], {
      callsign: "DAL123",
      runway: "12R"
    });
    expect(result.value).toContain("DAL123");
    expect(result.value).toContain("12R");
  });
});
