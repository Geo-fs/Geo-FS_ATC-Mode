import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { PanelFrame } from "../layout/PanelFrame";
import { selectChatDeliveryMode, selectComposerMeta, selectSelectedAircraft, useWorkspaceStore } from "../store";
import type { PhrasePack } from "../../domain/chat/types";

const CATEGORY_OPTIONS = [
  { value: "taxi", label: "Taxi" },
  { value: "hold_short", label: "Hold Short" },
  { value: "line_up_and_wait", label: "Line Up" },
  { value: "takeoff_clearance", label: "Takeoff" },
  { value: "landing_clearance", label: "Landing" },
  { value: "heading_altitude_instruction", label: "Vector / Descend" },
  { value: "handoff_transition", label: "Handoff" },
  { value: "general_advisory", label: "Advisory" }
] as const;

export const ChatConsole = () => {
  const {
    chatLog,
    composerValue,
    targetCallsign,
    templates,
    phrasePacks,
    clearanceDraft,
    selectedAircraft,
    composerMeta,
    deliveryMode,
    foregroundBlocked,
    setComposerValue,
    setTargetCallsign,
    sendChat,
    saveTemplates,
    savePhrasePacks,
    setClearanceDraft,
    buildClearanceMessage
  } = useWorkspaceStore(
    useShallow((state) => ({
      chatLog: state.chatLog,
      composerValue: state.composerValue,
      targetCallsign: state.targetCallsign,
      templates: state.templates,
      phrasePacks: state.phrasePacks,
      clearanceDraft: state.clearanceDraft,
      selectedAircraft: selectSelectedAircraft(state),
      composerMeta: selectComposerMeta(state),
      deliveryMode: selectChatDeliveryMode(state),
      foregroundBlocked: state.health.activeFallbacks?.includes("foreground_required_blocked") ?? false,
      setComposerValue: state.setComposerValue,
      setTargetCallsign: state.setTargetCallsign,
      sendChat: state.sendChat,
      saveTemplates: state.saveTemplates,
      savePhrasePacks: state.savePhrasePacks,
      setClearanceDraft: state.setClearanceDraft,
      buildClearanceMessage: state.buildClearanceMessage
    }))
  );

  const activePack = useMemo<PhrasePack | null>(() => {
    if (!clearanceDraft) {
      return phrasePacks[0] ?? null;
    }

    return phrasePacks.find((pack) => pack.role === clearanceDraft.role) ?? phrasePacks[0] ?? null;
  }, [clearanceDraft, phrasePacks]);

  const visibleTemplates = useMemo(
    () =>
      templates.filter((template) =>
        activePack ? template.packId === activePack.id || template.role === "general" : true
      ),
    [activePack, templates]
  );

  return (
    <PanelFrame
      title="Chat / Phraseology"
      status={`${composerMeta.remaining} chars left | ${
        deliveryMode === "direct" ? "GeoFS send" : deliveryMode === "copy_only" ? "Copy-only" : "Unavailable"
      }`}
      actions={
        <button className="chip-button" onClick={() => void sendChat()}>
          {deliveryMode === "direct" ? "Send" : "Copy / Hold"}
        </button>
      }
    >
      <div className="chat-console">
        {deliveryMode !== "direct" ? (
          <div className="inline-status warning">
            {foregroundBlocked
              ? deliveryMode === "copy_only"
                ? "GeoFS must stay focused for live /update and reliable send behavior. Messages will copy to clipboard and the draft stays in place."
                : "GeoFS must stay focused for live /update and reliable send behavior. Copy fallback is disabled."
              : deliveryMode === "copy_only"
                ? "GeoFS send path is degraded. Messages will copy to clipboard and the draft stays in place."
                : "GeoFS send path is unavailable and copy fallback is disabled."}
          </div>
        ) : null}
        <div className="chat-log">
          {chatLog.length === 0 ? (
            <div className="empty-state compact">No chat traffic yet.</div>
          ) : (
            chatLog.slice(-18).map((message) => (
              <article key={message.id} className={`chat-line ${message.direction}`}>
                <strong>{message.callsign}</strong>
                <span>{message.message}</span>
              </article>
            ))
          )}
        </div>

        <div className="reference-section">
          <span className="eyebrow">Phrase Packs</span>
          <div className="reference-chip-row">
            {phrasePacks.map((pack) => (
              <button
                key={pack.id}
                className={activePack?.id === pack.id ? "focus-pill active" : "focus-pill"}
                onClick={() => {
                  setClearanceDraft({
                    ...(clearanceDraft ?? {
                      role: pack.role === "general" ? "tower" : pack.role,
                      templateCategory: "general_advisory",
                      callsign: selectedAircraft?.callsign ?? "",
                      runway: "",
                      altitude: "",
                      heading: "",
                      destination: "",
                      holdShortRunway: ""
                    }),
                    role: pack.role === "general" ? "tower" : pack.role
                  });
                }}
              >
                {pack.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reference-section">
          <span className="eyebrow">Quick Templates</span>
          <div className="reference-chip-row">
            {visibleTemplates.slice(0, 8).map((template) => (
              <button
                key={template.id}
                className="chip-button"
                onClick={() => setComposerValue(template.compactBody)}
              >
                {template.label}
              </button>
            ))}
            <button
              className="ghost-button"
              onClick={() => {
                const template = createTemplateFromComposerValue(
                  composerValue,
                  activePack?.id ?? null,
                  activePack?.role ?? "general"
                );
                const nextTemplates = [...templates, template];
                const nextPhrasePacks = activePack
                  ? phrasePacks.map((pack) =>
                      pack.id === activePack.id
                        ? { ...pack, templateIds: [...pack.templateIds, template.id] }
                        : pack
                    )
                  : phrasePacks;
                void saveTemplates(nextTemplates);
                void savePhrasePacks(nextPhrasePacks);
              }}
            >
              Save Current as Template
            </button>
          </div>
        </div>

        <div className="clearance-builder">
          <div className="reference-section">
            <span className="eyebrow">Clearance Builder</span>
            <div className="clearance-grid">
              <label className="field-label">
                Callsign
                <input
                  className="filter-input"
                  value={clearanceDraft?.callsign ?? selectedAircraft?.callsign ?? ""}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      callsign: event.target.value
                    })
                  }
                />
              </label>
              <label className="field-label">
                Category
                <select
                  value={clearanceDraft?.templateCategory ?? "general_advisory"}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      templateCategory: event.target.value as (typeof CATEGORY_OPTIONS)[number]["value"]
                    })
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Runway
                <input
                  className="filter-input"
                  value={clearanceDraft?.runway ?? ""}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      runway: event.target.value
                    })
                  }
                />
              </label>
              <label className="field-label">
                Hold short
                <input
                  className="filter-input"
                  value={clearanceDraft?.holdShortRunway ?? ""}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      holdShortRunway: event.target.value
                    })
                  }
                />
              </label>
              <label className="field-label">
                Altitude
                <input
                  className="filter-input"
                  value={clearanceDraft?.altitude ?? ""}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      altitude: event.target.value
                    })
                  }
                />
              </label>
              <label className="field-label">
                Heading
                <input
                  className="filter-input"
                  value={clearanceDraft?.heading ?? ""}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      heading: event.target.value
                    })
                  }
                />
              </label>
              <label className="field-label">
                Destination
                <input
                  className="filter-input"
                  value={clearanceDraft?.destination ?? ""}
                  onChange={(event) =>
                    setClearanceDraft({
                      ...(clearanceDraft ?? createFallbackDraft(selectedAircraft?.callsign ?? "")),
                      destination: event.target.value
                    })
                  }
                />
              </label>
            </div>
            <div className="reference-chip-row">
              <button className="chip-button" onClick={buildClearanceMessage}>
                Build Message
              </button>
              <button className="ghost-button" onClick={() => setClearanceDraft(null)}>
                Reset Draft
              </button>
            </div>
          </div>
        </div>

        <label className="field-label">
          Target callsign
          <input
            className="filter-input"
            value={targetCallsign}
            onChange={(event) => setTargetCallsign(event.target.value)}
            placeholder="Optional direct target"
          />
        </label>

        <label className="field-label">
          Message
          <textarea
            className="composer-input"
            value={composerValue}
            placeholder="Type a compact GeoFS-safe transmission."
            onChange={(event) => setComposerValue(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void sendChat();
              }
            }}
          />
        </label>
      </div>
    </PanelFrame>
  );
};

const createFallbackDraft = (callsign: string) => ({
  role: "tower" as const,
  templateCategory: "general_advisory" as const,
  callsign,
  runway: "",
  altitude: "",
  heading: "",
  destination: "",
  holdShortRunway: ""
});

const createTemplateFromComposerValue = (
  composerValue: string,
  packId: string | null,
  role: PhrasePack["role"]
) => ({
  id: `tpl-${Math.random().toString(36).slice(2, 10)}`,
  packId,
  role,
  label: composerValue.trim().slice(0, 24) || "Quick Template",
  category: "general_advisory" as const,
  compactBody: composerValue.trim(),
  referenceBody: composerValue.trim(),
  variables: [],
  tags: ["custom", role],
  referenceDocumentIds: []
});
