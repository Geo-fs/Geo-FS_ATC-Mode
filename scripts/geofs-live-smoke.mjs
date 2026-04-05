import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, "dist");
const outputDir = path.join(repoRoot, "output", "playwright", "geofs-live-smoke");
const userDataDir = path.join(outputDir, "profile");
const geoFsUrl = "https://www.geo-fs.com/geofs.php?v=3.8";
const knownPanels = [
  { id: "traffic-table", title: "Traffic" },
  { id: "traffic-map", title: "Traffic / Airspace" },
  { id: "runway-map", title: "Wind / Runway" },
  { id: "surface-map", title: "Airport Surface" },
  { id: "chat", title: "Chat / Phraseology" },
  { id: "focus", title: "Focused Aircraft" },
  { id: "weather", title: "Weather / Runway" },
  { id: "settings", title: "Settings / Options" },
  { id: "chart-library", title: "Reference Shelf" },
  { id: "reference-viewer", title: "Reference Viewer" }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resetDir = async (dir) => {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
};

const sanitizeText = (value) => value.replace(/\s+/g, " ").trim();

const isGeoFsUpdateUrl = (value) => {
  try {
    const url = new URL(value);
    return url.hostname.endsWith("geo-fs.com") && url.pathname === "/update";
  } catch {
    return false;
  }
};

const isGeoFsMapUrl = (value) => {
  try {
    const url = new URL(value);
    return url.hostname.endsWith("geo-fs.com") && url.pathname === "/map";
  } catch {
    return false;
  }
};

const captureResponseBody = async (response) => {
  try {
    const contentType = response.headers()["content-type"] ?? "";
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      const text = await response.text();
      return text.slice(0, 30_000);
    }
  } catch {
    return null;
  }

  return null;
};

const createNetworkLog = () => ({
  activeWindow: [],
  backgroundWindow: [],
  popupActiveWindow: [],
  popupBackgroundWindow: [],
  mapResponses: [],
  updateSamples: [],
  mapSamples: [],
  firstSuccessfulUpdate: null,
  firstSuccessfulMap: null,
  firstRateLimitedUpdate: null,
  focusSamples: []
});

const writeJsonArtifact = async (filePath, value) => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
};

const collectWorkspaceSignals = async (page) => {
  await page.waitForLoadState("domcontentloaded");
  await delay(2_000);

  const bodyText = sanitizeText(await page.locator("body").innerText());
  const normalizedBodyText = bodyText.toLowerCase();
  const rootHtml = await page.evaluate(() => document.querySelector("#root")?.innerHTML ?? "");
  const panelStatuses = knownPanels.map((panel) => {
    if (normalizedBodyText.includes(`panel ${panel.id} failed`)) {
      return { id: panel.id, status: "failed", matchedText: `Panel ${panel.id} failed` };
    }
    if (normalizedBodyText.includes(panel.title.toLowerCase())) {
      return { id: panel.id, status: "rendered", matchedText: panel.title };
    }
    return { id: panel.id, status: "missing", matchedText: null };
  });

  return {
    title: await page.title(),
    bodyText,
    rootHtmlLength: rootHtml.length,
    hasForegroundRequired: bodyText.includes("Foreground required"),
    hasFocusedTabWarning: bodyText.includes("GeoFS tab not focused; live feed suspended"),
    hasFocusedUpdateWarning: bodyText.includes("GeoFS must stay focused for live /update."),
    hasSettingsPanel: bodyText.includes("Settings / Options"),
    hasDiagnosticsWarning: bodyText.includes(
      "GeoFS is attached but not focused. Live /update traffic is suspended until that tab returns to the foreground."
    ),
    panelStatuses
  };
};

const sampleGeoFsState = async (page, phase, networkLog) => {
  const state = await page.evaluate(() => ({
    visibilityState: document.visibilityState,
    hidden: document.hidden,
    hasFocus: document.hasFocus(),
    href: location.href,
    title: document.title
  }));
  networkLog.focusSamples.push({
    phase,
    at: Date.now(),
    ...state
  });
  return state;
};

const attachGeoFsResponseLogging = (page, networkLog, getPhase, getBucket) => {
  page.on("response", async (response) => {
    const url = response.url();
    const stamp = Date.now();
    const phase = getPhase();

    if (isGeoFsUpdateUrl(url)) {
      const bucket = getBucket();
      if (bucket === "activeWindow") {
        networkLog.activeWindow.push(stamp);
      } else if (bucket === "backgroundWindow") {
        networkLog.backgroundWindow.push(stamp);
      } else if (bucket === "popupActiveWindow") {
        networkLog.popupActiveWindow.push(stamp);
      } else if (bucket === "popupBackgroundWindow") {
        networkLog.popupBackgroundWindow.push(stamp);
      }

      const sample = {
        phase,
        at: stamp,
        status: response.status(),
        url,
        body: await captureResponseBody(response)
      };

      if (networkLog.updateSamples.length < 6) {
        networkLog.updateSamples.push(sample);
      }
      if (sample.status === 200 && !networkLog.firstSuccessfulUpdate) {
        networkLog.firstSuccessfulUpdate = sample;
      }
      if (sample.status === 429 && !networkLog.firstRateLimitedUpdate) {
        networkLog.firstRateLimitedUpdate = sample;
      }
    }

    if (isGeoFsMapUrl(url)) {
      networkLog.mapResponses.push(stamp);
      const sample = {
        phase,
        at: stamp,
        status: response.status(),
        url,
        body: await captureResponseBody(response)
      };

      if (networkLog.mapSamples.length < 6) {
        networkLog.mapSamples.push(sample);
      }
      if (sample.status === 200 && !networkLog.firstSuccessfulMap) {
        networkLog.firstSuccessfulMap = sample;
      }
    }
  });
};

const main = async () => {
  await resetDir(outputDir);

  const networkLog = createNetworkLog();
  const workspaceConsole = [];
  const workspaceErrors = [];
  const geoFsConsole = [];
  const artifactState = {
    extensionId: null,
    activeSignals: null,
    backgroundSignals: null,
    geoFsActiveState: null,
    geoFsBackgroundState: null,
    popupActiveState: null,
    popupBackgroundState: null,
    screenshotError: null
  };
  let phase = "active";
  let responseBucket = "activeWindow";

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chromium",
    args: [
      `--disable-extensions-except=${distDir}`,
      `--load-extension=${distDir}`,
      "--no-default-browser-check",
      "--no-first-run"
    ],
    viewport: { width: 1600, height: 1000 }
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", { timeout: 30_000 });
    }

    const extensionId = new URL(serviceWorker.url()).host;
    artifactState.extensionId = extensionId;
    const workspacePage = await context.newPage();
    workspacePage.on("console", (message) => {
      workspaceConsole.push(`${message.type()}: ${message.text()}`);
    });
    workspacePage.on("pageerror", (error) => {
      workspaceErrors.push(String(error));
    });
    await workspacePage.goto(`chrome-extension://${extensionId}/workspace.html`, {
      waitUntil: "domcontentloaded"
    });
    try {
      await workspacePage.locator(".status-bar").waitFor({ timeout: 10_000 });
    } catch {
      workspaceErrors.push("status-bar selector did not appear within 10s");
    }

    const geoFsPage = await context.newPage();
    geoFsPage.on("console", (message) => {
      geoFsConsole.push(`${message.type()}: ${message.text()}`);
    });
    attachGeoFsResponseLogging(
      geoFsPage,
      networkLog,
      () => phase,
      () => responseBucket
    );

    await geoFsPage.goto(geoFsUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await geoFsPage.bringToFront();
    await geoFsPage.mouse.click(800, 500).catch(() => undefined);
    await geoFsPage.keyboard.press("Escape").catch(() => undefined);
    await geoFsPage.keyboard.press("Space").catch(() => undefined);
    await delay(15_000);
    const geoFsActiveState = await sampleGeoFsState(geoFsPage, "same-window-active", networkLog);
    artifactState.geoFsActiveState = geoFsActiveState;
    const activeSignals = await collectWorkspaceSignals(workspacePage);
    artifactState.activeSignals = activeSignals;

    phase = "background";
    responseBucket = "backgroundWindow";
    await workspacePage.bringToFront();
    await delay(12_000);
    const geoFsBackgroundState = await sampleGeoFsState(geoFsPage, "same-window-background", networkLog);
    artifactState.geoFsBackgroundState = geoFsBackgroundState;
    const backgroundSignals = await collectWorkspaceSignals(workspacePage);
    artifactState.backgroundSignals = backgroundSignals;

    const popupPromise = context.waitForEvent("page", { timeout: 30_000 });
    await geoFsPage.evaluate((url) => {
      window.open(url, "geofs-atc-popup", "popup,width=1280,height=900");
    }, geoFsUrl);
    const popupGeoFsPage = await popupPromise;
    popupGeoFsPage.on("console", (message) => {
      geoFsConsole.push(`popup:${message.type()}: ${message.text()}`);
    });
    attachGeoFsResponseLogging(
      popupGeoFsPage,
      networkLog,
      () => phase,
      () => responseBucket
    );
    await popupGeoFsPage.waitForLoadState("domcontentloaded", { timeout: 120_000 });
    responseBucket = "popupActiveWindow";
    await popupGeoFsPage.bringToFront();
    await popupGeoFsPage.mouse.click(800, 500).catch(() => undefined);
    await popupGeoFsPage.keyboard.press("Escape").catch(() => undefined);
    await popupGeoFsPage.keyboard.press("Space").catch(() => undefined);
    await delay(10_000);
    const popupActiveState = await sampleGeoFsState(popupGeoFsPage, "popup-window-active", networkLog);
    artifactState.popupActiveState = popupActiveState;

    phase = "popup-background";
    responseBucket = "popupBackgroundWindow";
    await workspacePage.bringToFront();
    await delay(12_000);
    const popupBackgroundState = await sampleGeoFsState(popupGeoFsPage, "popup-window-background", networkLog);
    artifactState.popupBackgroundState = popupBackgroundState;

    try {
      await workspacePage.screenshot({
        path: path.join(outputDir, "workspace-after-background.png"),
        fullPage: false,
        timeout: 10_000
      });
    } catch (error) {
      artifactState.screenshotError = String(error);
      workspaceErrors.push(`screenshot failed: ${String(error)}`);
    }

    const panelFailures = activeSignals.panelStatuses
      .filter((panel) => panel.status === "failed")
      .map((panel) => panel.id);
    const panelSuccesses = activeSignals.panelStatuses
      .filter((panel) => panel.status === "rendered")
      .map((panel) => panel.id);

    const focusExperiments = [
      {
        mode: "same-window-tab-switch",
        activeState: geoFsActiveState,
        backgroundState: geoFsBackgroundState,
        updateResponsesActive: networkLog.activeWindow.length,
        updateResponsesBackground: networkLog.backgroundWindow.length
      },
      {
        mode: "popup-window-switch",
        activeState: popupActiveState,
        backgroundState: popupBackgroundState,
        updateResponsesActive: networkLog.popupActiveWindow.length,
        updateResponsesBackground: networkLog.popupBackgroundWindow.length
      }
    ];

    const summary = {
      extensionId,
      geoFsUrl,
      activeUpdateResponses: networkLog.activeWindow.length,
      backgroundUpdateResponses: networkLog.backgroundWindow.length,
      popupActiveUpdateResponses: networkLog.popupActiveWindow.length,
      popupBackgroundUpdateResponses: networkLog.popupBackgroundWindow.length,
      mapResponses: networkLog.mapResponses.length,
      activeSignals,
      backgroundSignals,
      geoFsActiveState,
      geoFsBackgroundState,
      popupActiveState,
      popupBackgroundState,
      panelSummary: {
        rendered: panelSuccesses,
        failed: panelFailures,
        all: activeSignals.panelStatuses
      },
      focusExperiments,
      workspaceConsole,
      workspaceErrors,
      geoFsConsole: geoFsConsole.slice(-30),
      observedFocusDependency:
        networkLog.activeWindow.length > 0 &&
        networkLog.backgroundWindow.length === 0 &&
        (backgroundSignals.hasForegroundRequired || backgroundSignals.hasFocusedTabWarning),
      samples: {
        update: networkLog.updateSamples,
        map: networkLog.mapSamples,
        firstSuccessfulUpdate: networkLog.firstSuccessfulUpdate,
        firstSuccessfulMap: networkLog.firstSuccessfulMap,
        firstRateLimitedUpdate: networkLog.firstRateLimitedUpdate,
        focus: networkLog.focusSamples
      },
      timestamps: {
        activeWindow: networkLog.activeWindow,
        backgroundWindow: networkLog.backgroundWindow,
        popupActiveWindow: networkLog.popupActiveWindow,
        popupBackgroundWindow: networkLog.popupBackgroundWindow
      }
    };

    await writeJsonArtifact(path.join(outputDir, "summary.json"), summary);
    await writeJsonArtifact(path.join(outputDir, "update-samples.json"), networkLog.updateSamples);
    await writeJsonArtifact(path.join(outputDir, "map-samples.json"), networkLog.mapSamples);
    await writeJsonArtifact(path.join(outputDir, "focus-samples.json"), networkLog.focusSamples);

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const partialSummary = {
      extensionId: artifactState.extensionId,
      geoFsUrl,
      failure: String(error),
      phase,
      responseBucket,
      activeUpdateResponses: networkLog.activeWindow.length,
      backgroundUpdateResponses: networkLog.backgroundWindow.length,
      popupActiveUpdateResponses: networkLog.popupActiveWindow.length,
      popupBackgroundUpdateResponses: networkLog.popupBackgroundWindow.length,
      mapResponses: networkLog.mapResponses.length,
      activeSignals: artifactState.activeSignals,
      backgroundSignals: artifactState.backgroundSignals,
      geoFsActiveState: artifactState.geoFsActiveState,
      geoFsBackgroundState: artifactState.geoFsBackgroundState,
      popupActiveState: artifactState.popupActiveState,
      popupBackgroundState: artifactState.popupBackgroundState,
      workspaceConsole,
      workspaceErrors,
      geoFsConsole: geoFsConsole.slice(-30),
      screenshotError: artifactState.screenshotError,
      samples: {
        update: networkLog.updateSamples,
        map: networkLog.mapSamples,
        firstSuccessfulUpdate: networkLog.firstSuccessfulUpdate,
        firstSuccessfulMap: networkLog.firstSuccessfulMap,
        firstRateLimitedUpdate: networkLog.firstRateLimitedUpdate,
        focus: networkLog.focusSamples
      },
      timestamps: {
        activeWindow: networkLog.activeWindow,
        backgroundWindow: networkLog.backgroundWindow,
        popupActiveWindow: networkLog.popupActiveWindow,
        popupBackgroundWindow: networkLog.popupBackgroundWindow
      }
    };

    await writeJsonArtifact(path.join(outputDir, "summary.json"), partialSummary);
    await writeJsonArtifact(path.join(outputDir, "update-samples.json"), networkLog.updateSamples);
    await writeJsonArtifact(path.join(outputDir, "map-samples.json"), networkLog.mapSamples);
    await writeJsonArtifact(path.join(outputDir, "focus-samples.json"), networkLog.focusSamples);
    throw error;
  } finally {
    await context.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
