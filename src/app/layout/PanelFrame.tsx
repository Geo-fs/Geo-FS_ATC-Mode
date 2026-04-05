import type { PropsWithChildren, ReactNode } from "react";
import clsx from "clsx";

interface PanelFrameProps extends PropsWithChildren {
  title: string;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const PanelFrame = ({ title, status, actions, className, children }: PanelFrameProps) => (
  <section className={clsx("panel-frame", className)}>
    <header className="panel-header">
      <div className="panel-title-block">
        <h2>{title}</h2>
        {status ? <span className="panel-status">{status}</span> : null}
      </div>
      <div className="panel-actions">{actions}</div>
    </header>
    <div className="panel-body">{children}</div>
  </section>
);
