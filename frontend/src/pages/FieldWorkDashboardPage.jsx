import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "../components/DashboardCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";

function statusClasses(status) {
  if (status === "in_progress") {
    return "bg-sky-100 text-sky-700";
  }
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-amber-100 text-amber-700";
}

function statusLabel(status) {
  return String(status || "").replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function FieldWorkDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [fieldTasks, setFieldTasks] = useState([]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await apiClient.get("/tasks", withAuth(token));
        const allTasks = response.data.data || [];
        setFieldTasks(allTasks.filter((task) => task.roleType === "field_work"));
      } catch {
        setFieldTasks([]);
      }
    }

    loadTasks();
  }, [token]);

  const etaRate = useMemo(() => {
    if (!fieldTasks.length) {
      return "0%";
    }

    const completed = fieldTasks.filter((task) => task.status === "completed").length;
    return `${Math.round((completed / fieldTasks.length) * 100)}%`;
  }, [fieldTasks]);

  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/field_work/chat")}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Chat
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Assigned Tasks" value={fieldTasks.length} helper="Active field assignments" />
        <DashboardCard
          title="In Progress"
          value={fieldTasks.filter((task) => task.status === "in_progress").length}
          helper="Ongoing site work"
        />
        <DashboardCard
          title="Completed"
          value={fieldTasks.filter((task) => task.status === "completed").length}
          helper="Finished checks"
        />
        <DashboardCard title="Completion Rate" value={etaRate} helper="On-schedule completion" />
      </div>

      <section className="glass-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-800">Field Work Queue</h2>
            <p className="text-sm text-slate-500">Track your inspections and on-site milestones.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Live Schedule
          </span>
        </div>

        <div className="space-y-3">
          {fieldTasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Task #{task.id}</p>
                  <p className="text-sm text-slate-600">{task.title}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(task.status)}`}>
                  {statusLabel(task.status)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-600">Assignee:</span> {task.assigneeName}
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Due:</span>{" "}
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </article>
          ))}

          {!fieldTasks.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No field work tasks found.
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
