import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { WorkspaceShell } from "./layout/WorkspaceShell";
import { useWorkspaceStore } from "./store";

class WorkspaceErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Workspace render failure", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="workspace-root workspace-root-compact">
          <div className="inline-status warning">
            Workspace failed to render: {this.state.error.message}
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export const App = () => {
  const initialize = useWorkspaceStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <WorkspaceErrorBoundary>
      <WorkspaceShell />
    </WorkspaceErrorBoundary>
  );
};
