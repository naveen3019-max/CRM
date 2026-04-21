import { ArrowRight, BarChart3, Building2, CheckCircle2, Lock, Mail, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const roleHint = "admin | sales | customer | vendor | electrician | field_work";

const featureItems = [
  "Unified lead, task, and project workflow",
  "Real-time team collaboration and updates",
  "Role-based visibility for secure operations"
];

const outcomeStats = [
  { label: "Response Time", value: "-38%", icon: TrendingUp },
  { label: "Cross-Team Visibility", value: "+64%", icon: Users },
  { label: "Audit Readiness", value: "99.9%", icon: ShieldCheck }
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@verbenatech.com");
  const [password, setPassword] = useState("ChangeMe@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const payload = response.data.data;
      login(payload);
      navigate(`/${payload.user.role}`);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Login failed. Ensure backend and seed users are ready.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-canvas relative min-h-screen overflow-hidden text-slate-900">
      <div className="auth-grid-overlay" />
      <span className="auth-float-shape pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl" />
      <span className="auth-float-shape pointer-events-none absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-slate-300/35 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="auth-reveal rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5" style={{ "--delay": "20ms" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold tracking-wide text-slate-900">Verbena Tech</p>
                <p className="text-[11px] text-slate-500">CRM + Operations Platform</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
              <a href="#" className="transition hover:text-slate-900">
                Product
              </a>
              <a href="#" className="transition hover:text-slate-900">
                Security
              </a>
              <a href="#" className="transition hover:text-slate-900">
                Pricing
              </a>
            </nav>

            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 lg:inline-flex">
              Trusted by modern teams
            </span>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
          <section className="auth-reveal order-2 rounded-3xl border border-slate-200 bg-slate-100/70 p-6 sm:p-8 lg:order-1" style={{ "--delay": "90ms" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Calm. Confident. Operational.</p>
            <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-[1.15] text-slate-900 sm:text-5xl">
              Run your CRM and operations from one clean command center.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Built for modern teams that need reliability, structure, and clarity across sales, delivery, and field
              execution.
            </p>

            <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
              {featureItems.map((item, index) => (
                <div key={item} className="auth-reveal auth-feature flex items-start gap-3 rounded-xl border border-slate-200/70 px-3 py-2.5" style={{ "--delay": `${180 + index * 70}ms` }}>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {outcomeStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="auth-reveal auth-metric-card rounded-2xl border border-slate-200 bg-white/85 p-4" style={{ "--delay": "260ms" }}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    </div>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="auth-dashboard mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4 opacity-80 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Dashboard Preview</p>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] text-slate-500">Open Leads</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">124</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] text-slate-500">Tasks Today</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">39</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] text-slate-500">On-Time SLA</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">98%</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-end gap-1">
                  <span className="h-5 w-2 rounded-sm bg-blue-200" />
                  <span className="h-8 w-2 rounded-sm bg-blue-300" />
                  <span className="h-6 w-2 rounded-sm bg-blue-400" />
                  <span className="h-10 w-2 rounded-sm bg-blue-500" />
                  <span className="h-7 w-2 rounded-sm bg-blue-300" />
                  <span className="h-9 w-2 rounded-sm bg-blue-400" />
                  <span className="ml-2 text-[11px] font-semibold text-slate-500">Weekly activity trend</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="order-1 flex items-center justify-center lg:order-2">
            <section className="auth-card auth-reveal w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-8" style={{ "--delay": "150ms" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Welcome Back</p>
              <h2 className="mt-3 font-heading text-2xl font-semibold text-slate-900 sm:text-3xl">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Used by modern teams to run CRM and operations.</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                SOC-ready platform security
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</span>
                  <span className="auth-input-shell group relative flex h-12 items-center rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                    <Mail className="ml-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600" />
                    <input
                      className="h-full w-full rounded-xl bg-transparent px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Password</span>
                  <span className="auth-input-shell group relative flex h-12 items-center rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                    <Lock className="ml-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600" />
                    <input
                      className="h-full w-full rounded-xl bg-transparent px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      required
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{loading ? "Signing in..." : "Continue"}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </form>

              {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Need an account?{" "}
                  <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                    Register
                  </Link>
                </p>
                <div className="auth-avatar-stack mt-3 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full border border-white bg-slate-300" />
                  <span className="-ml-3 h-6 w-6 rounded-full border border-white bg-slate-400" />
                  <span className="-ml-3 h-6 w-6 rounded-full border border-white bg-blue-500" />
                  <p className="ml-1 text-[11px] font-medium text-slate-500">120+ teams onboarded</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Roles: {roleHint}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
