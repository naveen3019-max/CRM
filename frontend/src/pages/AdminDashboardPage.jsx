import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ShieldCheck, Activity, Users, Zap, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";
import { DashboardCard } from "../components/DashboardCard.jsx";
import ActivityFeed from "../components/dashboard/ActivityFeed.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ totalUsers: 0, totalLeads: 0, activeProjects: 0, revenue: 0 });
  const [health, setHealth] = useState({ pendingTasks: 0, activeUsers: 0, systemStatus: "..." });
  const [performance, setPerformance] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [overviewRes, usersRes, healthRes, performanceRes, activityRes] = await Promise.all([
          apiClient.get("/analytics/admin/overview", withAuth(token)),
          apiClient.get("/admin/users", withAuth(token)),
          apiClient.get("/analytics/admin/health", withAuth(token)),
          apiClient.get("/analytics/admin/vendor-performance", withAuth(token)),
          apiClient.get("/analytics/admin/activity", withAuth(token))
        ]);
        setOverview(overviewRes.data.data);
        setUsers(usersRes.data.data);
        setHealth(healthRes.data.data);
        setPerformance(performanceRes.data.data);
        setActivities(activityRes.data.data);
      } catch (err) {
        console.error("Dashboard data load failed");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const toggleUserSelection = (id) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleBulkDeactivate = async () => {
    if (!window.confirm(`Deactivate ${selectedUserIds.length} users?`)) return;
    alert("Bulk deactivation would happen here");
    setSelectedUserIds([]);
  };

  return (
    <section className="space-y-6 pb-12">
      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="h-32 glass-panel animate-pulse bg-white/50"></div>)
        ) : (
          <>
            <DashboardCard title="Total Users" value={overview.totalUsers} helper="System-wide accounts" icon={<Users size={20} className="text-blue-500" />} />
            <DashboardCard title="Leads" value={overview.totalLeads} helper="Pipeline volume" icon={<Zap size={20} className="text-amber-500" />} />
            <DashboardCard title="Active Projects" value={overview.activeProjects} helper="Currently running" icon={<Activity size={20} className="text-emerald-500" />} />
            <DashboardCard title="Revenue" value={`$${Number(overview.revenue).toLocaleString()}`} helper="Active + completed" icon={<TrendingUp size={20} className="text-indigo-500" />} />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* User Management Table */}
          <section className="glass-panel relative p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-800">
                <ShieldCheck size={20} className="text-brand-600" />
                User Management
              </h2>
              {!loading && selectedUserIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 sm:gap-3">
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                    {selectedUserIds.length} Selected
                  </span>
                  <button 
                    onClick={handleBulkDeactivate}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100 transition-all"
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 md:hidden">
              {loading
                ? [1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="mb-3 h-4 w-28 rounded bg-slate-100" />
                      <div className="mb-2 h-3 w-20 rounded bg-slate-50" />
                      <div className="h-3 w-24 rounded bg-slate-50" />
                    </div>
                  ))
                : users.map((u) => (
                    <article key={u.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{u.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{u.email}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                          u.role === 'vendor' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {u.role}
                        </span>

                        <span className={`flex items-center gap-1.5 text-xs font-bold ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>

                        <button
                          onClick={() => navigate(`/admin/chat?role=${u.role}&userId=${u.id}`)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600"
                          title="Chat with user"
                        >
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
            </div>

            <div className="hidden max-h-[400px] overflow-auto md:block">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="sticky top-0 bg-white/95 backdrop-blur z-10">
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-3 px-2 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                        checked={selectedUserIds.length === users.length && users.length > 0}
                        onChange={() => setSelectedUserIds(selectedUserIds.length === users.length ? [] : users.map(u => u.id))}
                      />
                    </th>
                    <th className="py-3 px-2">Name</th>
                    <th className="py-3 px-2">Role</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-2"><div className="h-4 w-4 bg-slate-100 rounded"></div></td>
                        <td className="py-4 px-2"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                        <td className="py-4 px-2"><div className="h-3 w-20 bg-slate-50 rounded"></div></td>
                        <td className="py-4 px-2"><div className="h-3 w-16 bg-slate-50 rounded"></div></td>
                        <td className="py-4 px-2 text-right"><div className="h-8 w-8 bg-slate-50 rounded-lg ml-auto"></div></td>
                      </tr>
                    ))
                  ) : users.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${selectedUserIds.includes(u.id) ? 'bg-brand-50/30' : ''}`}>
                      <td className="py-3 px-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                        />
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-700">{u.name}</td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                          u.role === 'vendor' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => navigate(`/admin/chat?role=${u.role}&userId=${u.id}`)}
                          className="p-2 hover:bg-white text-slate-400 hover:text-brand-600 rounded-xl border border-transparent hover:border-brand-100 transition-all shadow-sm hover:shadow-md"
                          title="Chat with user"
                        >
                          <MessageSquare size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Vendor Performance Section */}
          <section className="glass-panel p-5">
            <h2 className="font-heading text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Vendor Performance
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {performance.map((p, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.jobsCompleted} Jobs Completed</p>
                    </div>
                  </div>
                  <div className="text-right text-emerald-600 font-bold">
                    <p className="text-sm">{p.avgCompletionDays > 0 ? `${p.avgCompletionDays.toFixed(1)}d` : 'N/A'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Avg Time</p>
                  </div>
                </div>
              ))}
              {performance.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-400 italic">No performance data yet</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {/* System Health */}
          <section className="glass-panel p-5 bg-gradient-to-br from-white to-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={16} className="text-brand-600" />
              System Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> Healthy
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Pending Tasks</span>
                <span className={`text-xs font-bold ${health.pendingTasks > 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {health.pendingTasks}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Active Users</span>
                <span className="text-xs font-bold text-slate-700">{health.activeUsers}</span>
              </div>
            </div>
          </section>

          {/* Real-time Activity Feed */}
          <ActivityFeed activities={activities} loading={loading} />
          
          <button 
            onClick={() => navigate('/admin/verifications')}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-lg shadow-brand-600/30 active:scale-[0.98]"
          >
            <div className="text-left">
              <p className="text-sm font-bold">Manage Verifications</p>
              <p className="text-[10px] font-medium text-brand-100 uppercase tracking-widest">Vendor Onboarding</p>
            </div>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </aside>
      </div>
    </section>
  );
}
