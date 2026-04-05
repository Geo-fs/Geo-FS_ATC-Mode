import type { BackgroundRequestMessage, ContentEventMessage } from "../shared/contracts/runtime";
import { SessionController } from "./session";

const session = new SessionController();

void session.initialize();

chrome.runtime.onInstalled.addListener(() => {
  void session.openWorkspaceWindow();
});

chrome.action.onClicked.addListener(() => {
  void session.openWorkspaceWindow();
});

chrome.windows.onRemoved.addListener((windowId) => {
  session.onWindowRemoved(windowId);
});

chrome.runtime.onMessage.addListener((message: BackgroundRequestMessage | ContentEventMessage, sender, sendResponse) => {
  void (async () => {
    switch (message.type) {
      case "workspace/init":
      case "content/request-state":
        sendResponse({
          type: "background/state-snapshot",
          payload: { state: session.getState() }
        });
        return;
      case "workspace/open-controller-window":
        await session.openWorkspaceWindow();
        sendResponse({ ok: true });
        return;
      case "workspace/send-chat":
        sendResponse(await session.sendChat(message.payload.message, message.payload.targetCallsign));
        return;
      case "workspace/update-focus":
        await session.setFocus(message.payload.aircraftId, message.payload.pinned);
        sendResponse({ ok: true });
        return;
      case "workspace/update-destination":
        await session.setDestination(message.payload.aircraftId, message.payload.destinationIcao);
        sendResponse({ ok: true });
        return;
      case "workspace/update-surface-clearance":
        await session.setSurfaceClearance(
          message.payload.aircraftId,
          message.payload.routeId,
          message.payload.checkpointId,
          message.payload.holdShortRunwayId,
          message.payload.runwayCrossingState
        );
        sendResponse({ ok: true });
        return;
      case "workspace/set-airport":
        await session.setAirport(message.payload.airportIcao);
        sendResponse({ ok: true });
        return;
      case "workspace/save-layout":
        await session.saveLayout(message.payload.state as never);
        sendResponse({ ok: true });
        return;
      case "workspace/save-settings":
        await session.saveSettings(message.payload.state as never);
        sendResponse({ ok: true });
        return;
      case "workspace/save-filters":
        await session.saveFilters(message.payload.state as never);
        sendResponse({ ok: true });
        return;
      case "workspace/save-map-panels":
        await session.saveMapPanels(message.payload.state as never);
        sendResponse({ ok: true });
        return;
      case "workspace/save-templates":
        await session.saveTemplates(message.payload.templates as never);
        sendResponse({ ok: true });
        return;
      case "workspace/save-phrase-packs":
        await session.savePhrasePacks(message.payload.packs as never);
        sendResponse({ ok: true });
        return;
      case "workspace/save-controller-profiles":
        await session.saveControllerProfiles(
          message.payload.profiles as never,
          message.payload.activeProfileId
        );
        sendResponse({ ok: true });
        return;
      case "workspace/save-reference-shelf":
        await session.saveReferenceShelf(message.payload.state as never);
        sendResponse({ ok: true });
        return;
      case "content/bridge-event":
        await session.handleBridgeEvent(message.payload.event, sender.tab?.id ?? null);
        sendResponse({ ok: true });
        return;
      case "content/heartbeat":
        await session.handleBridgeEvent(
          {
            type: "geofs:visibility",
            visibilityState: message.payload.visibilityState,
            timestamp: Date.now()
          },
          sender.tab?.id ?? null
        );
        sendResponse({ ok: true });
        return;
      default:
        sendResponse({ ok: false });
    }
  })();

  return true;
});
