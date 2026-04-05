import { Component, lazy, Suspense, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import GridLayout from "react-grid-layout";
import { useShallow } from "zustand/react/shallow";
import { StatusBar } from "../components/StatusBar";
import { TrafficTable } from "../components/TrafficTable";
import { ChatConsole } from "../components/ChatConsole";
import { ChartLibraryPanel } from "../components/ChartLibraryPanel";
import { FocusPanel } from "../components/FocusPanel";
import { WeatherPanel } from "../components/WeatherPanel";
import { MapPanel } from "../components/MapPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { useWorkspaceStore } from "../store";
import { useElementWidth } from "../hooks/useElementWidth";
import { getWorkspaceBreakpoint, resolveResponsiveLayout } from "./responsiveLayout";

const LazyReferenceViewerPanel = lazy(async () => {
  const module = await import("../components/ReferenceViewerPanel");
  return { default: module.ReferenceViewerPanel };
});

const PANEL_COMPONENTS: Record<string, ReactElement> = {
  "traffic-table": <TrafficTable />,
  "traffic-map": <WorkspaceMap index={0} />,
  "runway-map": <WorkspaceMap index={1} />,
  "surface-map": <WorkspaceMap index={2} />,
  chat: <ChatConsole />,
  focus: <FocusPanel />,
  weather: <WeatherPanel />,
  settings: <SettingsPanel />,
  "chart-library": <ChartLibraryPanel />,
  "reference-viewer": (
    <Suspense fallback={<div className="empty-state compact">Loading reference viewer...</div>}>
      <LazyReferenceViewerPanel />
    </Suspense>
  )
};

class PanelErrorBoundary extends Component<
  { panelId: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`Panel render failure: ${this.props.panelId}`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel-frame">
          <div className="panel-body">
            <div className="inline-status warning">
              Panel {this.props.panelId} failed: {this.state.error.message}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function WorkspaceMap({ index }: { index: number }) {
  const panel = useWorkspaceStore(
    useShallow((state) => state.mapPanels[index] ?? null)
  );
  return panel ? <MapPanel panel={panel} /> : <div className="empty-state">Map unavailable.</div>;
}

export const WorkspaceShell = () => {
  const rootRef = useRef<HTMLElement | null>(null);
  const layout = useWorkspaceStore((state) => state.layout);
  const saveLayout = useWorkspaceStore((state) => state.saveLayout);
  const measuredWidth = useElementWidth(rootRef);
  const gridWidth = Math.max(measuredWidth - 8, 320);
  const breakpoint = getWorkspaceBreakpoint(gridWidth);
  const automationMode = typeof navigator !== "undefined" && navigator.webdriver;
  const resolvedLayout = useMemo(
    () => resolveResponsiveLayout(layout, breakpoint),
    [breakpoint, layout]
  );

  if (automationMode) {
    return (
      <main ref={rootRef} className={`workspace-root workspace-root-${breakpoint}`}>
        <StatusBar />
        <div className="workspace-grid automation-stack">
          {resolvedLayout.map((item) => (
            <div key={item.i} className="panel-slot automation-panel-slot">
              <PanelErrorBoundary panelId={item.i}>
                {PANEL_COMPONENTS[item.i] ?? <div className="empty-state">Panel {item.i} not wired.</div>}
              </PanelErrorBoundary>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main ref={rootRef} className={`workspace-root workspace-root-${breakpoint}`}>
      <StatusBar />
      <GridLayout
        className="workspace-grid"
        layout={resolvedLayout}
        cols={12}
        rowHeight={breakpoint === "compact" ? 40 : 44}
        width={gridWidth || 1200}
        margin={[12, 12]}
        onDragStop={(nextLayout) => void saveLayout(nextLayout)}
        onResizeStop={(nextLayout) => void saveLayout(nextLayout)}
      >
        {resolvedLayout.map((item) => (
          <div key={item.i} className="panel-slot">
            <PanelErrorBoundary panelId={item.i}>
              {PANEL_COMPONENTS[item.i] ?? <div className="empty-state">Panel {item.i} not wired.</div>}
            </PanelErrorBoundary>
          </div>
        ))}
      </GridLayout>
    </main>
  );
};
