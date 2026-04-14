import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/signup", {
        name,
        email,
        password,
        role
      });

      const payload = response.data.data;
      login(payload);
      navigate(`/${payload.user.role}`);
    } catch (apiError) {
      const details = apiError.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setError(details.map((item) => item.msg).join(" | "));
      } else {
        setError(apiError.response?.data?.message || "Registration failed. Try another email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="glass-panel w-full max-w-md p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Verbena Tech</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-slate-800 sm:text-3xl">Create account</h1>
        <p className="mt-2 text-sm text-slate-500">Choose your role and create your account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold text-slate-600">
            Full name
            <input
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              required
              minLength={2}
            />
          </label>

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
              minLength={8}
              pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
              title="Minimum 8 characters, at least one uppercase letter and one number"
            />
            <p className="mt-1 text-xs font-medium text-slate-500">
              Must include 1 uppercase letter and 1 number.
            </p>
          </label>

          <label className="block text-sm font-semibold text-slate-600">
            Role
            <select
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              required
            >
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="electrician">Electrician</option>
              <option value="field_work">Field Work</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <p className="mt-5 text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
