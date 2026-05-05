import { ArrowRight, Bot, CheckCircle2, Eye, EyeOff, Globe2, Lock, Mail, MapPin, Phone, User, UserPlus, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const roleOptions = [
  { value: "customer",    label: "Customer",    desc: "Services & support" },
  { value: "sales",       label: "Sales",        desc: "Leads & deals" },
  { value: "vendor",      label: "Vendor",       desc: "Supply & inventory" },
  { value: "electrician", label: "Electrician",  desc: "Field operations" },
  { value: "field_work",  label: "Field Work",   desc: "On-site tasks" },
  { value: "admin",       label: "Admin",        desc: "Full control" },
];

const highlights = [
  "AI-powered CRM automation & predictive analytics",
  "Augmented Reality client calling & guided demos",
  "Virtual Reality training for complex environments",
  "Role-based secure access across your entire team",
];

const industries = ["Manufacturing", "Education", "Retail", "Pharma", "Insurance", "Forestry"];

export default function RegisterPage() {
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [mobile, setMobile]           = useState("");
  const [address, setAddress]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole]               = useState("customer");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [fieldErrors, setFieldErrors]  = useState({});
  const { login }                     = useAuth();
  const navigate                      = useNavigate();

  const validateField = (field, value) => {
    if (field === "name") {
      return value.trim().length >= 2 ? "" : "Full name must be at least 2 characters";
    }

    if (field === "email") {
      return /^\S+@\S+\.\S+$/.test(value.trim()) ? "" : "Enter a valid email address";
    }

    if (field === "mobile") {
      return /^\d{10}$/.test(value) ? "" : "Mobile number must be exactly 10 digits";
    }

    if (field === "address") {
      return value.trim().length >= 10 ? "" : "Address must be at least 10 characters";
    }

    if (field === "password") {
      return /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(value)
        ? ""
        : "Password must be at least 8 characters, with 1 uppercase letter and 1 number";
    }

    return "";
  };

  const validateForm = () => {
    const nextErrors = {
      name: validateField("name", name),
      email: validateField("email", email),
      mobile: validateField("mobile", mobile),
      address: validateField("address", address),
      password: validateField("password", password)
    };

    const filtered = Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => message));
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res     = await apiClient.post("/auth/register", { name, email, password, mobile, address, role });
      const payload = res.data.data;
      login(payload);
      if (payload.user.role === "vendor") {
        navigate("/onboarding", { replace: true });
      } else {
        navigate(`/${payload.user.role}`, { replace: true });
      }
    } catch (err) {
      const details = err.response?.data?.details;
      setError(
        Array.isArray(details) && details.length > 0
          ? details.map((d) => d.msg).join(" · ")
          : err.response?.data?.message || "Registration failed. Try another email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vt-page">
      <div className="vt-glow vt-glow-a" />
      <div className="vt-glow vt-glow-b" />

      <div className="vt-split">

        {/* ── LEFT: About Verbena Tech ── */}
        <aside className="vt-about vt-fadein" style={{ "--d": "0ms" }}>
          <div className="vt-brand">
            <span className="vt-brand-dot" />
            <span className="vt-brand-wordmark">Verbena Tech</span>
          </div>

          <div className="vt-about-body">
            <p className="vt-tagline-label">About the Platform</p>
            <h1 className="vt-about-headline">
              Intelligent<br />
              <span className="vt-accent-text">Enterprise Technology</span>
            </h1>
            <p className="vt-about-desc">
              Verbena Tech delivers end-to-end AI, AR and VR solutions to enterprises
              across manufacturing, retail, pharma, education, insurance and forestry.
              Join a platform built by industry-veteran engineers to transform how your
              organisation operates, trains, and engages with customers.
            </p>

            {/* Highlights */}
            <div className="vt-highlights">
              {highlights.map((h) => (
                <div key={h} className="vt-hl-row">
                  <CheckCircle2 size={14} className="vt-hl-icon" />
                  <span className="vt-hl-text">{h}</span>
                </div>
              ))}
            </div>

            {/* Industries */}
            <div className="vt-industries">
              <p className="vt-ind-label">Industries we serve</p>
              <div className="vt-ind-chips">
                {industries.map((ind) => (
                  <span key={ind} className="vt-ind-chip">{ind}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="vt-about-foot">sivakk@verbenatech.in · +91 88797 92818</p>
        </aside>

        {/* ── RIGHT: Register card ── */}
        <main className="vt-form-col">
          <div className="vt-card vt-fadein" style={{ "--d": "80ms" }}>

            <div className="vt-card-top">
              <div className="vt-card-icon-wrap">
                <UserPlus size={18} className="vt-card-icon" />
              </div>
              <div>
                <h2 className="vt-card-title">Create Account</h2>
                <p className="vt-card-sub">Join Verbena Tech's CRM platform</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="vt-form">
              {/* Name */}
              <div className="vt-field">
                <label className="vt-label" htmlFor="reg-name">Full Name</label>
                <div className="vt-input-shell">
                  <User className="vt-i-icon" size={15} />
                  <input
                    id="reg-name"
                    className="vt-inp"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    minLength={2}
                    autoComplete="name"
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, name: validateField("name", name) }))}
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                </div>
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="vt-field">
                <label className="vt-label" htmlFor="reg-email">Email</label>
                <div className="vt-input-shell">
                  <Mail className="vt-i-icon" size={15} />
                  <input
                    id="reg-email"
                    className="vt-inp"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    autoComplete="email"
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, email: validateField("email", email) }))}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                </div>
                {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="vt-field">
                <label className="vt-label" htmlFor="reg-mobile">Mobile Number</label>
                <div className="vt-input-shell">
                  <Phone className="vt-i-icon" size={15} />
                  <input
                    id="reg-mobile"
                    className="vt-inp"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => {
                      const nextValue = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setMobile(nextValue);
                      setFieldErrors((prev) => ({ ...prev, mobile: validateField("mobile", nextValue) }));
                    }}
                    placeholder="9876543210"
                    required
                    maxLength={10}
                    autoComplete="tel"
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, mobile: validateField("mobile", mobile) }))}
                    aria-invalid={Boolean(fieldErrors.mobile)}
                  />
                </div>
                {fieldErrors.mobile && <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p>}
              </div>

              <div className="vt-field">
                <label className="vt-label" htmlFor="reg-address">Address</label>
                <div className="vt-input-shell items-start py-3">
                  <MapPin className="vt-i-icon mt-1" size={15} />
                  <textarea
                    id="reg-address"
                    className="vt-inp min-h-[96px] resize-y"
                    value={address}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setAddress(nextValue);
                      setFieldErrors((prev) => ({ ...prev, address: validateField("address", nextValue) }));
                    }}
                    placeholder="Enter your full address"
                    required
                    minLength={10}
                    autoComplete="street-address"
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, address: validateField("address", address) }))}
                    aria-invalid={Boolean(fieldErrors.address)}
                  />
                </div>
                {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
              </div>

              {/* Password */}
              <div className="vt-field">
                <label className="vt-label" htmlFor="reg-password">
                  Password
                  <span className="vt-label-hint"> · min 8 chars, 1 uppercase, 1 number</span>
                </label>
                <div className="vt-input-shell">
                  <Lock className="vt-i-icon" size={15} />
                  <input
                    id="reg-password"
                    className="vt-inp"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
                    title="Minimum 8 characters, at least one uppercase letter and one number"
                    autoComplete="new-password"
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, password: validateField("password", password) }))}
                    aria-invalid={Boolean(fieldErrors.password)}
                  />
                  <button type="button" className="vt-toggle-pw" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
              </div>

              {/* Role */}
              <div className="vt-field">
                <label className="vt-label">Role</label>
                <div className="vt-role-grid">
                  {roleOptions.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`vt-role-pill${role === value ? " vt-role-pill-on" : ""}`}
                    >
                      <span className="vt-rp-label">{label}</span>
                      <span className="vt-rp-desc">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="vt-err">{error}</p>}

              <button id="reg-submit" type="submit" disabled={loading} className="vt-btn-primary">
                {loading ? <span className="vt-spin" /> : <><span>Create Account</span><ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="vt-card-foot">
              <p className="vt-foot-txt">
                Already have an account?{" "}
                <Link to="/" className="vt-foot-link">Sign in</Link>
              </p>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
