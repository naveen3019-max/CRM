import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Lock,
  Mail,
  Moon,
  Sparkles,
  SunMedium,
  Zap
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const roleHint = "admin | sales | customer | vendor | electrician | field_work";

const heroHighlights = [
  {
    title: "AI Copilot Workflows",
    description: "Automate repetitive CRM ops with contextual assistant actions.",
    icon: Bot
  },
  {
    title: "Real-Time Team Rooms",
    description: "Live messaging and activity visibility across support and field teams.",
    icon: Zap
  },
  {
    title: "Operations Pulse",
    description: "Track pipeline, delivery, and service metrics in one command center.",
    icon: BarChart3
  }
];

const particles = [
  { top: "14%", left: "12%", size: "6px", delay: "0s" },
  { top: "26%", left: "38%", size: "8px", delay: "0.8s" },
  { top: "48%", left: "22%", size: "5px", delay: "1.2s" },
  { top: "62%", left: "46%", size: "7px", delay: "0.5s" },
  { top: "72%", left: "14%", size: "5px", delay: "1.5s" },
  { top: "36%", left: "58%", size: "6px", delay: "1.9s" }
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@verbenatech.com");
  const [password, setPassword] = useState("ChangeMe@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
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
    <div
      className={`relative min-h-screen overflow-hidden ${
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-800"
      }`}
    >
      <div className={`absolute inset-0 ${isDarkMode ? "saas-gradient-bg-dark" : "saas-gradient-bg-light"}`} />
      <div className="saas-orb saas-orb-cyan" />
      <div className="saas-orb saas-orb-indigo" />
      <div className="saas-orb saas-orb-purple" />

      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {particles.map((particle) => (
          <span
            key={`${particle.top}-${particle.left}`}
            className="saas-particle"
            style={{
              top: particle.top,
              left: particle.left,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header
          className={`rounded-2xl border px-4 py-3 backdrop-blur-xl sm:px-5 ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/70"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold tracking-wide">Verbena Tech</p>
                <p className={`text-[11px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>CRM + Operations Cloud</p>
              </div>
            </div>

            <nav className={`hidden items-center gap-6 text-sm md:flex ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              <a href="#" className="transition hover:text-cyan-300">
                Product
              </a>
              <a href="#" className="transition hover:text-cyan-300">
                Security
              </a>
              <a href="#" className="transition hover:text-cyan-300">
                Pricing
              </a>
            </nav>

            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isDarkMode
                  ? "border-white/20 bg-white/10 text-cyan-200 hover:bg-white/20"
                  : "border-slate-200 bg-white text-indigo-600 hover:bg-slate-50"
              }`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1.55fr_1fr] lg:gap-6">
          <section
            className={`order-2 overflow-hidden rounded-[24px] border p-5 sm:p-7 lg:order-1 ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/65"
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? "text-cyan-300" : "text-indigo-600"}`}>
              Intelligent Revenue Operations
            </p>
            <h1 className="mt-3 max-w-3xl font-heading text-3xl font-bold leading-tight sm:text-5xl">
              A premium workspace for
              <span className="saas-glow ml-2">AI</span>,
              <span className="saas-glow ml-2">Automation</span>, and
              <span className="saas-glow ml-2">Real-Time</span> execution.
            </h1>
            <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Verbena unifies CRM, task orchestration, service delivery, and cross-functional collaboration in one
              modern operations cockpit for fast-growing teams.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {heroHighlights.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className={`group rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 ${
                      isDarkMode
                        ? "border-white/15 bg-slate-900/40 hover:border-cyan-300/45"
                        : "border-slate-200 bg-white/85 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                          isDarkMode ? "bg-cyan-400/15 text-cyan-200" : "bg-indigo-100 text-indigo-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold">{feature.title}</p>
                    </div>
                    <p
                      className={`mt-3 text-xs leading-5 transition ${
                        isDarkMode ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    >
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <div
              className={`saas-float mt-6 rounded-2xl border p-4 sm:p-5 ${
                isDarkMode ? "border-white/15 bg-slate-900/50" : "border-slate-200 bg-white/90"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Operations Snapshot</p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Live command center preview</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Real-Time
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Pipeline</p>
                  <p className="mt-1 text-lg font-semibold">$1.24M</p>
                </div>
                <div className={`rounded-xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Active Tasks</p>
                  <p className="mt-1 text-lg font-semibold">126</p>
                </div>
                <div className={`rounded-xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>SLA Met</p>
                  <p className="mt-1 text-lg font-semibold">98.2%</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="order-1 flex items-center justify-center lg:order-2">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute -inset-5 rounded-[28px] bg-gradient-to-br from-indigo-500/30 via-cyan-400/20 to-fuchsia-500/20 blur-2xl" />

              <section
                className={`relative rounded-[24px] border p-5 shadow-2xl backdrop-blur-2xl transition duration-300 sm:p-7 lg:[transform:perspective(1200px)_rotateY(-4deg)] lg:hover:[transform:perspective(1200px)_rotateY(0deg)] ${
                  isDarkMode ? "border-white/15 bg-slate-900/55" : "border-white/60 bg-white/78"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? "text-cyan-300" : "text-indigo-600"}`}>
                  Welcome Back
                </p>
                <h2 className="mt-3 font-heading text-2xl font-semibold sm:text-3xl">Sign in to your workspace</h2>
                <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Used by modern teams to scale revenue operations.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                      Email
                    </span>
                    <span
                      className={`group relative flex h-12 items-center rounded-2xl border transition ${
                        isDarkMode
                          ? "border-white/15 bg-slate-900/60 focus-within:border-cyan-300"
                          : "border-slate-200 bg-white/85 focus-within:border-indigo-400"
                      }`}
                    >
                      <Mail className={`ml-3 h-4 w-4 ${isDarkMode ? "text-slate-400 group-focus-within:text-cyan-300" : "text-slate-400 group-focus-within:text-indigo-500"}`} />
                      <input
                        className={`h-full w-full rounded-2xl bg-transparent pl-2 pr-3 text-sm outline-none ${
                          isDarkMode ? "placeholder:text-slate-500" : "placeholder:text-slate-400"
                        }`}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        placeholder="you@company.com"
                        required
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                      Password
                    </span>
                    <span
                      className={`group relative flex h-12 items-center rounded-2xl border transition ${
                        isDarkMode
                          ? "border-white/15 bg-slate-900/60 focus-within:border-cyan-300"
                          : "border-slate-200 bg-white/85 focus-within:border-indigo-400"
                      }`}
                    >
                      <Lock className={`ml-3 h-4 w-4 ${isDarkMode ? "text-slate-400 group-focus-within:text-cyan-300" : "text-slate-400 group-focus-within:text-indigo-500"}`} />
                      <input
                        className={`h-full w-full rounded-2xl bg-transparent pl-2 pr-3 text-sm outline-none ${
                          isDarkMode ? "placeholder:text-slate-500" : "placeholder:text-slate-400"
                        }`}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        placeholder="Enter password"
                        required
                      />
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.45),transparent_60%)] opacity-0 transition duration-500 group-hover:opacity-100" />
                    <span className="relative">{loading ? "Signing in..." : "Continue"}</span>
                    <ArrowRight className="relative h-4 w-4" />
                  </button>
                </form>

                {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

                <div className="mt-5 space-y-3">
                  <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    Need an account?{" "}
                    <Link to="/register" className={`font-semibold ${isDarkMode ? "text-cyan-300 hover:text-cyan-200" : "text-indigo-600 hover:text-indigo-700"}`}>
                      Register
                    </Link>
                  </p>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Used by modern teams
                  </div>
                  <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Roles: {roleHint}</p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
