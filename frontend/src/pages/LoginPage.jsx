import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const roleHint = "admin | sales | customer | vendor | electrician | field_work";

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
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="glass-panel w-full max-w-md p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Verbena Tech</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-slate-800 sm:text-3xl">CRM + Operations Platform</h1>
        <p className="mt-2 text-sm text-slate-500">Role-based access login</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold text-slate-600">
            Email
            <input
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-600">
            Password
            <input
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        <p className="mt-5 text-sm text-slate-500">
          Need an account?{" "}
          <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Register
          </Link>
        </p>
        <p className="mt-5 text-xs text-slate-500">Roles: {roleHint}</p>
      </div>
    </div>
  );
}
