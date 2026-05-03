import clsx from "clsx";
import { Link, useLocation } from "react-router-dom";
import { BriefcaseBusiness, Cable, Handshake, LayoutDashboard, ShieldCheck, UserRoundCog, Users, UserCircle, Menu, X } from "lucide-react";
import { useUnreadCount } from "../context/UnreadContext.jsx";
import { useState, useRef, useEffect } from "react";

const roleConfig = {
  admin: {
    title: "Admin Command",
    icon: UserRoundCog,
    links: [
      { label: "Overview", path: "/admin" },
      { label: "Verifications", path: "/admin/verifications" },
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

const mobileLinkIconMap = {
  Overview: LayoutDashboard,
  Verifications: ShieldCheck,
  Users: Users,
  Chat: Users,
  Leads: BriefcaseBusiness,
  "Follow-ups": BriefcaseBusiness,
  Requests: Users,
  History: UserCircle,
  Orders: Handshake,
  Updates: BriefcaseBusiness,
  Jobs: Cable,
  "Proof Upload": Cable,
  Tasks: Cable,
  Profile: UserCircle
};

export function RoleSidebar({ role, onLogout, chatMode = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const config = roleConfig[role] || roleConfig.customer;
  const Icon = config.icon;
  const { totalUnreadCount } = useUnreadCount();
  const currentRoute = `${location.pathname}${location.search}${location.hash}`;

  const isLinkActive = (linkPath) => {
    if (linkPath.includes("?") || linkPath.includes("#")) {
      return currentRoute === linkPath;
    }
    return location.pathname === linkPath;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile Header - Always visible on mobile */}
      <header className="relative lg:hidden">
        <div
          className={clsx(
            "flex items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4",
            chatMode ? "border-b border-gray-200 bg-white" : "glass-panel"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className={clsx("rounded-lg p-1.5", chatMode ? "bg-blue-100 text-blue-700" : "bg-brand-100 text-brand-700")}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">Verbena Tech</p>
              <p className="truncate font-heading text-xs font-semibold text-slate-800">{config.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 transition hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="h-5 w-5 text-slate-700" />
            ) : (
              <Menu className="h-5 w-5 text-slate-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        {menuOpen && (
          <div
            ref={menuRef}
            className={clsx(
              "absolute left-0 right-0 top-full z-50 border-b",
              chatMode ? "border-gray-200 bg-white shadow-lg" : "glass-panel border-slate-200 shadow-xl"
            )}
          >
            <nav className="space-y-1 p-3 sm:p-4">
              {config.links.map((link) => {
                const isActive = isLinkActive(link.path);
                const isChatLink = link.label === "Chat";
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={clsx(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                      isActive
                        ? chatMode
                          ? "bg-blue-600 text-white shadow"
                          : "bg-brand-600 text-white shadow"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {link.label}
                    {isChatLink && totalUnreadCount > 0 && (
                      <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                        {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-3 sm:p-4">
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>


      <aside
        className={clsx(
          "hidden flex-col lg:flex",
          chatMode
            ? "h-screen w-[260px] border-r border-gray-200 bg-white px-4 py-5"
            : "glass-panel h-[calc(100vh-2rem)] w-72 p-5"
        )}
      >
        <div
          className={clsx(
            "mb-8 flex items-center gap-3 p-4",
            chatMode ? "rounded-lg border border-gray-200 bg-slate-50" : "rounded-xl bg-white/70"
          )}
        >
          <div className={clsx("rounded-lg p-2", chatMode ? "bg-blue-100 text-blue-700" : "bg-brand-100 text-brand-700")}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verbena Tech</p>
            <p className="font-heading text-lg font-semibold text-slate-800">{config.title}</p>
          </div>
        </div>

        <nav className="space-y-2">
          <div className={clsx("sidebar-link", chatMode ? "rounded-lg hover:bg-slate-100" : "sidebar-link-idle")}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboards
          </div>
          {config.links.map((link) => {
            const isActive = isLinkActive(link.path);
            const isChatLink = link.label === "Chat";
            return (
              <Link
                key={link.path}
                to={link.path}
                className={clsx(
                  "sidebar-link relative",
                  isActive
                    ? chatMode
                      ? "rounded-lg bg-blue-600 text-white"
                      : "sidebar-link-active"
                    : chatMode
                      ? "rounded-lg hover:bg-slate-100"
                      : "sidebar-link-idle"
                )}
              >
                {link.label}
                {isChatLink && totalUnreadCount > 0 && (
                  <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className={clsx(
            "mt-auto border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50",
            chatMode ? "rounded-lg" : "rounded-xl"
          )}
        >
          Sign out
        </button>
      </aside>
    </>
  );
}
