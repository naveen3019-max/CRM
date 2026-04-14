import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "../components/DashboardCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";

const statusFilters = ["all", "pending", "active", "completed", "cancelled"];

function formatStatusLabel(status) {
  if (status === "all") {
    return "All";
  }

  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status) {
  if (status === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "active") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getPriorityClasses(totalAmount) {
  if (Number(totalAmount || 0) >= 4000) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (Number(totalAmount || 0) >= 2500) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const visibleOrders = useMemo(() => {
    if (activeFilter === "all") {
      return projects;
    }

    return projects.filter((project) => project.status === activeFilter);
  }, [activeFilter, projects]);

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsResponse, tasksResponse] = await Promise.all([
          apiClient.get("/projects", withAuth(token)),
          apiClient.get("/tasks", withAuth(token))
        ]);

        setProjects(projectsResponse.data.data || []);
        setTasks(tasksResponse.data.data || []);
      } catch {
        setProjects([]);
        setTasks([]);
      }
    }

    loadData();
  }, [token]);

  const completionRate = projects.length
    ? `${Math.round((projects.filter((project) => project.status === "completed").length / projects.length) * 100)}%`
    : "0%";

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Open Orders" value={projects.length} helper="Vendor-linked project orders" />
        <DashboardCard
          title="Pending Dispatch"
          value={projects.filter((project) => project.status === "pending").length}
          helper="Requires immediate action"
        />
        <DashboardCard
          title="Active Orders"
          value={projects.filter((project) => project.status === "active").length}
          helper="Currently in execution"
        />
        <DashboardCard title="Completion Rate" value={completionRate} helper="Completed order ratio" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <article className="glass-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-800">Order Operations</h2>
              <p className="text-sm text-slate-500">Track, prioritize, and dispatch assigned orders.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {visibleOrders.length} visible
            </span>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {statusFilters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {formatStatusLabel(filter)}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            {visibleOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Order #{order.id}</p>
                    <p className="mt-1 text-sm text-slate-600">Project order for {order.customerName}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getPriorityClasses(order.totalAmount)}`}
                  >
                    {Number(order.totalAmount || 0) >= 4000
                      ? "High"
                      : Number(order.totalAmount || 0) >= 2500
                        ? "Medium"
                        : "Low"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-slate-600">Customer:</span> {order.customerName}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">Amount:</span> ${Number(order.totalAmount || 0).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">Created:</span> {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                    {formatStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}

            {!visibleOrders.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No orders in this status.
              </div>
            ) : null}
          </div>
        </article>

        <div className="space-y-4">
          <article className="glass-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold text-slate-800">Dispatch Summary</h3>
              <button
                type="button"
                onClick={() => navigate("/vendor/chat")}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Open Chat
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Assigned Tasks</span>
                <span className="font-semibold text-slate-800">{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Pending Tasks</span>
                <span className="font-semibold text-slate-800">
                  {tasks.filter((task) => task.status === "pending").length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Completed Tasks</span>
                <span className="font-semibold text-emerald-700">
                  {tasks.filter((task) => task.status === "completed").length}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
