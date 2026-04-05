import { DEFAULT_CHAT_SAFE_MAX } from "../../shared/config/constants";
import { DEFAULT_PHRASE_PACKS } from "./phrasePacks";
import { FAA_INSPIRED_TEMPLATE_PACK } from "../references/phraseology";
import type { ClearanceDraft, MessageTemplate, PhrasePack, RenderedTemplate } from "./types";

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = FAA_INSPIRED_TEMPLATE_PACK;
export const DEFAULT_LINKED_PHRASE_PACKS: PhrasePack[] = DEFAULT_PHRASE_PACKS.map((pack) => ({
  ...pack,
  templateIds: DEFAULT_MESSAGE_TEMPLATES.filter((template) => template.packId === pack.id).map(
    (template) => template.id
  )
}));

export const renderTemplate = (
  template: MessageTemplate,
  values: Record<string, string>,
  maxLength = DEFAULT_CHAT_SAFE_MAX,
  variant: "compact" | "reference" = "compact"
): RenderedTemplate => {
  const templateBody = variant === "reference" ? template.referenceBody : template.compactBody;
  const value = templateBody.replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "");
  const remaining = maxLength - value.length;

  return {
    value,
    fitsLimit: value.length <= maxLength,
    remaining
  };
};

export const validateOutboundMessage = (
  message: string,
  maxLength = DEFAULT_CHAT_SAFE_MAX
): { ok: boolean; remaining: number; reason?: string } => {
  const trimmed = message.trim();

  if (!trimmed) {
    return { ok: false, remaining: maxLength, reason: "Message is empty." };
  }

  if (trimmed.length > maxLength) {
    return {
      ok: false,
      remaining: maxLength - trimmed.length,
      reason: `Message exceeds ${maxLength} characters.`
    };
  }

  return { ok: true, remaining: maxLength - trimmed.length };
};

export const buildClearanceFromDraft = (
  draft: ClearanceDraft,
  templates: MessageTemplate[],
  maxLength = DEFAULT_CHAT_SAFE_MAX
): RenderedTemplate => {
  const template =
    templates.find(
      (item) =>
        item.category === draft.templateCategory &&
        (item.role === draft.role || item.role === "general")
    ) ?? templates[0];

  if (!template) {
    return {
      value: "",
      fitsLimit: false,
      remaining: maxLength,
    };
  }

  return renderTemplate(
    template,
    {
      callsign: draft.callsign,
      runway: draft.holdShortRunway || draft.runway,
      altitude: draft.altitude,
      heading: draft.heading,
      destination: draft.destination
    },
    maxLength,
    "compact"
  );
};
