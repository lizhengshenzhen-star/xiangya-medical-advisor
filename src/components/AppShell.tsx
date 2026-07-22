import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" onClick={() => undefined}>
          <span className="brand-mark">医策</span>
          <span className="brand-sub">最短路径匹配医生</span>
        </Link>
        <nav className="nav-actions">
          <NavLink to="/" className="btn btn-ghost" end>
            匹配医生
          </NavLink>
          <NavLink to="/workbench" className="btn btn-soft">
            陪诊工作台
          </NavLink>
          <NavLink to="/replay" className="btn btn-ghost">
            案例回放
          </NavLink>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
