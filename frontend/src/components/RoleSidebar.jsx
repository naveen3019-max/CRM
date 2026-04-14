import clsx from "clsx";
import { Link, useLocation } from "react-router-dom";
import { BriefcaseBusiness, Cable, Handshake, LayoutDashboard, UserRoundCog, Users } from "lucide-react";

const roleConfig = {
  admin: {
    title: "Admin Command",
    icon: UserRoundCog,
    links: [
      { label: "Overview", path: "/admin" },
      { label: "Users", path: "/admin?tab=users" },
      { label: "Chat", path: "/admin/chat" },
      { label: "Profile", path: "/admin/profile" }
    ]
  },
  sales: {
    title: "Sales Center",
    icon: BriefcaseBusiness,
    links: [
      { label: "Leads", path: "/sales" },
      { label: "Follow-ups", path: "/sales?tab=followups" },
      { label: "Chat", path: "/sales/chat" },
      { label: "Profile", path: "/sales/profile" }
    ]
  },
  customer: {
    title: "Customer Desk",
    icon: Users,
    links: [
      { label: "Requests", path: "/customer" },
      { label: "History", path: "/customer?tab=history" },
      { label: "Chat", path: "/customer/chat" },
      { label: "Profile", path: "/customer/profile" }
    ]
  },
  vendor: {
    title: "Vendor Hub",
    icon: Handshake,
    links: [
      { label: "Orders", path: "/vendor" },
      { label: "Updates", path: "/vendor?tab=updates" },
      { label: "Chat", path: "/vendor/chat" },
      { label: "Profile", path: "/vendor/profile" }
    ]
  },
  electrician: {
    title: "Field Ops",
    icon: Cable,
    links: [
      { label: "Jobs", path: "/electrician" },
      { label: "Proof Upload", path: "/electrician?tab=proof" },
      { label: "Chat", path: "/electrician/chat" },
      { label: "Profile", path: "/electrician/profile" }
    ]
  },
  field_work: {
    title: "Field Work",
    icon: Cable,
    links: [
      { label: "Overview", path: "/field_work" },
      { label: "Tasks", path: "/field_work?tab=tasks" },
      { label: "Chat", path: "/field_work/chat" },
      { label: "Profile", path: "/field_work/profile" }
    ]
  }
};

export function RoleSidebar({ role, onLogout }) {
  const location = useLocation();
  const config = roleConfig[role] || roleConfig.customer;
  const Icon = config.icon;
  const currentRoute = `${location.pathname}${location.search}${location.hash}`;

  const isLinkActive = (linkPath) => {
    if (linkPath.includes("?") || linkPath.includes("#")) {
      return currentRoute === linkPath;
    }

    return location.pathname === linkPath;
  };

  return (
    <>
      <aside className="glass-panel p-4 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white/75 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Verbena Tech</p>
              <p className="font-heading text-sm font-semibold text-slate-800">{config.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Sign out
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {config.links.map((link) => {
            const isActive = isLinkActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={clsx(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold",
                  isActive ? "bg-brand-600 text-white" : "bg-white/80 text-slate-600"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="glass-panel hidden h-[calc(100vh-2rem)] w-72 flex-col p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3 rounded-xl bg-white/70 p-4">
          <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verbena Tech</p>
            <p className="font-heading text-lg font-semibold text-slate-800">{config.title}</p>
          </div>
        </div>

        <nav className="space-y-2">
          <div className="sidebar-link sidebar-link-idle">
            <LayoutDashboard className="h-4 w-4" />
            Dashboards
          </div>
          {config.links.map((link) => {
            const isActive = isLinkActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={clsx("sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-idle")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className="mt-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </aside>
    </>
  );
}
