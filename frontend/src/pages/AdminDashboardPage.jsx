import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "../components/DashboardCard.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ totalUsers: 0, totalLeads: 0, activeProjects: 0, revenue: 0 });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewResponse, usersResponse] = await Promise.all([
          apiClient.get("/analytics/admin/overview", withAuth(token)),
          apiClient.get("/admin/users", withAuth(token))
        ]);
        setOverview(overviewResponse.data.data);
        setUsers(usersResponse.data.data);
      } catch {
        setOverview({ totalUsers: 0, totalLeads: 0, activeProjects: 0, revenue: 0 });
      }
    }

    loadData();
  }, [token]);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Total Users" value={overview.totalUsers} helper="System-wide accounts" />
        <DashboardCard title="Leads" value={overview.totalLeads} helper="Pipeline volume" />
        <DashboardCard title="Active Projects" value={overview.activeProjects} helper="Currently running" />
        <DashboardCard title="Revenue" value={`$${Number(overview.revenue).toLocaleString()}`} helper="Active + completed" />
      </div>

      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/admin/chat")}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Admin Chat
        </button>
      </div>

      <section className="glass-panel p-4 sm:p-5">
        <h2 className="font-heading text-xl font-semibold text-slate-800">User Management</h2>
        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="py-3 font-semibold text-slate-700">{user.name}</td>
                  <td className="py-3 text-slate-600">{user.email}</td>
                  <td className="py-3 uppercase text-slate-500">{user.role}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
