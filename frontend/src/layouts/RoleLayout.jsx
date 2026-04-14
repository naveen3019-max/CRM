import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { RoleSidebar } from "../components/RoleSidebar.jsx";

export function RoleLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr] lg:gap-5 lg:p-6">
      <RoleSidebar role={user.role} onLogout={logout} />
      <main className="min-w-0 space-y-5">
        <header className="glass-panel flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Welcome back</p>
            <h1 className="font-heading text-xl font-semibold text-slate-800 sm:text-2xl">{user.name}</h1>
          </div>
          <div className="rounded-full bg-brand-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {user.role}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
