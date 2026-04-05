import type { ContentEventMessage, PageBridgeMessage } from "../shared/contracts/runtime";

const BRIDGE_SOURCE = "geofs-atc-bridge";

const injectPageBridge = (): void => {
  const existing = document.querySelector('script[data-source="geofs-atc"]');
  if (existing) {
    return;
  }
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.type = "text/javascript";
  script.dataset.source = "geofs-atc";
  (document.head || document.documentElement).appendChild(script);
};

const forwardHeartbeat = (): void => {
  const message: ContentEventMessage = {
    type: "content/heartbeat",
    payload: {
      visibilityState: document.visibilityState
    }
  };
  void chrome.runtime.sendMessage(message);
};

const forwardBridgeEvent = (event: unknown): void => {
  const message: ContentEventMessage = {
    type: "content/bridge-event",
    payload: { event }
  };
  void chrome.runtime.sendMessage(message);
};

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window || !event.data || event.data.source !== BRIDGE_SOURCE) {
    return;
  }

  forwardBridgeEvent((event.data as PageBridgeMessage & { event?: unknown }).event);
});

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "content/reinject-bridge") {
    injectPageBridge();
    sendResponse({ ok: true });
  }

  if (message.type === "page/send-chat") {
    window.postMessage(
      {
        source: "geofs-atc-content",
        type: "page/send-chat",
        payload: message.payload
      },
      "*"
    );
    sendResponse({ ok: true });
  }

  return true;
});

injectPageBridge();
forwardHeartbeat();
window.setInterval(forwardHeartbeat, 5_000);
