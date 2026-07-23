import { Link, NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { ROLE_LABELS } from "../models/companion";
import { useCurrentUser } from "../state/CurrentUserProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, users, switchUser } = useCurrentUser();
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");

  return (
    <div className={`shell ${isAdmin ? "shell-admin" : ""}`}>
      <header className="topbar">
        <Link to="/app" className="brand">
          <span className="brand-mark">医策</span>
          <span className="brand-sub">
            {isAdmin ? "运营管理后台" : "陪诊师 AI 决策助手"}
          </span>
        </Link>
        <nav className="nav-actions">
          <NavLink to="/app" className="btn btn-ghost" end>
            工作台
          </NavLink>
          <NavLink to="/app/match" className="btn btn-soft">
            新建匹配
          </NavLink>
          <NavLink to="/app/history" className="btn btn-ghost">
            咨询记录
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/admin" className="btn btn-ghost">
              管理后台
            </NavLink>
          )}
        </nav>
        <label className="user-switch">
          <span className="sr-only">当前用户</span>
          <select
            value={user?.id || ""}
            onChange={(e) => void switchUser(e.target.value)}
            aria-label="切换当前用户"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}（{ROLE_LABELS[u.role]}）
              </option>
            ))}
          </select>
        </label>
      </header>
      <main>{children}</main>
    </div>
  );
}
