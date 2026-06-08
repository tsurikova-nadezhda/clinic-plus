import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/doctors", label: "Врачи", icon: "👥" },
  { to: "/activities", label: "Мероприятия", icon: "📅" },
  { to: "/news", label: "Новости", icon: "📰" },
  { to: "/cases", label: "Клинические задачи", icon: "🩺" },
  { to: "/stats", label: "Статистика", icon: "📊" },
  { to: "/security", label: "Безопасность", icon: "🔒" },
];

export function Layout() {
  const { logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <div style={{ padding: "6px 14px 18px" }}>
          <Logo />
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            <span>{n.icon}</span> {n.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }} onClick={logout}>
          Выйти
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
