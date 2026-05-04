import { ArrowRight, Bot, Eye, EyeOff, Globe2, Lock, Mail, Shield, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const services = [
  { icon: Bot,    label: "Artificial Intelligence", desc: "Humanoid AI, chatbots, predictive analytics & RPA automation" },
  { icon: Globe2, label: "Augmented Reality",        desc: "AR client calling, interactive demos & guided AR training" },
  { icon: Zap,    label: "Virtual Reality",           desc: "Immersive 3D manuals, VR training & complex scenario simulation" },
];

export default function LoginPage() {
  const [email, setEmail]             = useState("admin@verbenatech.com");
  const [password, setPassword]       = useState("ChangeMe@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const { login }                     = useAuth();
  const navigate                      = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res     = await apiClient.post("/auth/login", { email, password });
      const payload = res.data.data;
      login(payload);
      if (payload.user.role === "vendor") {
        navigate(payload.user.companyStatus === "approved" ? "/vendor" : "/onboarding", { replace: true });
      } else {
        navigate(`/${payload.user.role}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vt-page">
      {/* subtle ambient glow */}
      <div className="vt-glow vt-glow-a" />
      <div className="vt-glow vt-glow-b" />

      <div className="vt-split">

        {/* ── LEFT: About Verbena Tech ── */}
        <aside className="vt-about vt-fadein" style={{ "--d": "0ms" }}>
          {/* Brand */}
          <div className="vt-brand">
            <span className="vt-brand-dot" />
            <span className="vt-brand-wordmark">Verbena Tech</span>
          </div>

          <div className="vt-about-body">
            <p className="vt-tagline-label">Our Mission</p>
            <h1 className="vt-about-headline">
              Powering the Future with<br />
              <span className="vt-accent-text">Secure AI, AR &amp; VR</span>
            </h1>
            <p className="vt-about-desc">
              Verbena Tech is a deep-tech company transforming B2B, B2C, C2C and
              Human-to-Machine sectors through next-generation immersive technologies.
              Our team of industry-veteran engineers and designers builds practical,
              high-impact integrated solutions that make organisations smarter and
              more competitive.
            </p>

            {/* Services */}
            <div className="vt-services">
              {services.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="vt-service-row">
                  <div className="vt-service-icon">
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="vt-service-label">{label}</p>
                    <p className="vt-service-desc">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats bar */}
            <div className="vt-stats">
              <div className="vt-stat-item">
                <span className="vt-stat-num">6+</span>
                <span className="vt-stat-txt">Industries</span>
              </div>
              <div className="vt-stat-divider" />
              <div className="vt-stat-item">
                <span className="vt-stat-num">50+</span>
                <span className="vt-stat-txt">AI Solutions</span>
              </div>
              <div className="vt-stat-divider" />
              <div className="vt-stat-item">
                <span className="vt-stat-num">99.9%</span>
                <span className="vt-stat-txt">Uptime</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="vt-about-foot">sivakk@verbenatech.in · +91 88797 92818</p>
        </aside>

        {/* ── RIGHT: Sign-in card ── */}
        <main className="vt-form-col">
          <div className="vt-card vt-fadein" style={{ "--d": "80ms" }}>

            <div className="vt-card-top">
              <div className="vt-card-icon-wrap">
                <Shield size={18} className="vt-card-icon" />
              </div>
              <div>
                <h2 className="vt-card-title">Sign in</h2>
                <p className="vt-card-sub">Access your CRM dashboard</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="vt-form">
              {/* Email */}
              <div className="vt-field">
                <label className="vt-label" htmlFor="login-email">Email</label>
                <div className="vt-input-shell">
                  <Mail className="vt-i-icon" size={15} />
                  <input
                    id="login-email"
                    className="vt-inp"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@verbenatech.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="vt-field">
                <label className="vt-label" htmlFor="login-password">Password</label>
                <div className="vt-input-shell">
                  <Lock className="vt-i-icon" size={15} />
                  <input
                    id="login-password"
                    className="vt-inp"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="vt-toggle-pw" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && <p className="vt-err">{error}</p>}

              <button id="login-submit" type="submit" disabled={loading} className="vt-btn-primary">
                {loading ? <span className="vt-spin" /> : <><span>Sign In</span><ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="vt-card-foot">
              <p className="vt-foot-txt">
                No account?{" "}
                <Link to="/register" className="vt-foot-link">Register here</Link>
              </p>
              <p className="vt-roles-note">
                Roles: admin · sales · customer · vendor · electrician · field_work
              </p>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
