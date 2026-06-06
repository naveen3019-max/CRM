import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, UserRound, UserPlus, BriefcaseBusiness, Building2, Zap, HardHat, Wrench, ChevronRight, ClipboardCheck, MapPin, Clock3, ShieldCheck, MessageSquare, Activity, LocateFixed, TrendingUp, Truck as TruckIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { indiaLocations } from "../utils/indiaLocations.js";

const roleOptions = [
  { value: "customer",    label: "Customer",    desc: "Services & support" },
  { value: "sales",       label: "Sales Partner", desc: "Leads & deals" },
  { value: "vendor",      label: "Supplier",     desc: "Supply & inventory" },
  { value: "electrician", label: "Electrician",  desc: "Field operations" },
  { value: "field_work",  label: "Field Work",   desc: "On-site tasks" },
  { value: "other",       label: "Other Services", desc: "Plumber, painter, carpenter, and more" },
];

// Feature icon mapping for consistent visual language
const featureIconMap = {
  "Submit service requests": ClipboardCheck,
  "Share work locations": MapPin,
  "Schedule preferred timings": Clock3,
  "Track live work updates": Activity,
  "Receive status notifications": MessageSquare,
  "Review incoming requests": ClipboardCheck,
  "Coordinate teams": TruckIcon,
  "Assign technicians": UserPlus,
  "Monitor service progress": Activity,
  "Manage scheduling": Clock3,
  "Manage material support": Building2,
  "Coordinate deliveries": TruckIcon,
  "Support active jobs": ShieldCheck,
  "Track supply requirements": ClipboardCheck,
  "Receive work-related updates": MessageSquare,
  "View assigned work": ClipboardCheck,
  "Access job locations": MapPin,
  "Update task status": Activity,
  "Upload completion proof": ClipboardCheck,
  "Receive realtime instructions": MessageSquare,
  "Manage field activities": Activity,
  "Track operational progress": TrendingUp,
  "Coordinate onsite teams": TruckIcon,
  "Upload field reports": ClipboardCheck,
  "Receive live instructions": MessageSquare,
  "Receive nearby jobs": LocateFixed,
  "Update work progress": Activity,
  "Access customer location": MapPin,
  "Upload completion updates": ClipboardCheck,
  "Grow service opportunities": TrendingUp
};

// Dynamic role information for onboarding experience
const roleInformation = {
  customer: {
    icon: UserRound,
    title: "Customer Account",
    description: "Submit service requests, track work progress, communicate with the support team, and manage approvals easily.",
    features: [
      "Submit service requests",
      "Share work locations",
      "Schedule preferred timings",
      "Track live work updates",
      "Receive status notifications"
    ],
    workflow: [
      "Submit Request",
      "Admin Review",
      "Team Assignment",
      "Work Completion"
    ],
    benefits: [
      "Easy service management",
      "Live progress visibility",
      "Faster coordination",
      "Organized support workflow"
    ],
    importantNote: "Customers communicate with the operations/support team, not directly with technicians."
  },
  sales: {
    icon: BriefcaseBusiness,
    title: "Sales Partner Account",
    description: "Discover and manage sales leads, gather client information, and keep the admin team informed about new opportunities and prospecting activities.",
    features: [
      "Find and discover new leads",
      "Gather client information",
      "Track lead pipeline",
      "Inform admin on opportunities",
      "Update prospect status"
    ],
    workflow: [
      "Lead Discovery",
      "Information Gathering",
      "Admin Notification",
      "Opportunity Tracking"
    ],
    benefits: [
      "Earn through lead generation",
      "Connect customers with suppliers",
      "Track opportunities",
      "Build professional connections",
      "Increase commission earnings",
      "Generate recurring income",
      "Grow your sales career"
    ],
    importantNote: "Sales teams discover leads, collect prospect information, and keep admins informed to ensure timely follow-up and conversion."
  },
  vendor: {
    icon: Building2,
    title: "Supplier Account",
    description: "Supply materials, support operational tasks, coordinate logistics, and assist ongoing service execution.",
    features: [
      "Manage material support",
      "Coordinate deliveries",
      "Support active jobs",
      "Track supply requirements",
      "Receive work-related updates"
    ],
    workflow: [
      "Assignment Request",
      "Material Coordination",
      "Delivery Support",
      "Completion Confirmation"
    ],
    benefits: [
      "Get customer enquiries",
      "Receive business opportunities",
      "Connect with verified customers",
      "Grow your business network",
      "Receive more orders",
      "Increase monthly revenue",
      "Expand your customer base"
    ],
    importantNote: "Suppliers support operations and logistics, not customer-facing communication."
  },
  electrician: {
    icon: Zap,
    title: "Electrician Account",
    description: "Receive assigned electrical work orders, access job locations, update progress, and complete field tasks efficiently.",
    features: [
      "View assigned work",
      "Access job locations",
      "Update task status",
      "Upload completion proof",
      "Receive realtime instructions"
    ],
    workflow: [
      "Work Assigned",
      "Travel to Site",
      "Execute Task",
      "Submit Completion"
    ],
    benefits: [
      "Receive electrical work assignments",
      "Get more local customers",
      "Increase work opportunities",
      "Build a professional profile",
      "Earn from completed projects",
      "Grow your reputation",
      "Expand service coverage"
    ],
    importantNote: "Electricians receive assignments through admin/sales coordination."
  },
  field_work: {
    icon: HardHat,
    title: "Field Work Account",
    description: "Handle onsite operational tasks, monitor field activities, coordinate teams, and report realtime progress.",
    features: [
      "Manage field activities",
      "Track operational progress",
      "Coordinate onsite teams",
      "Upload field reports",
      "Receive live instructions"
    ],
    workflow: [
      "Task Allocation",
      "Site Execution",
      "Progress Reporting",
      "Task Completion"
    ],
    benefits: [
      "Receive daily work opportunities",
      "Get assignments from businesses",
      "Increase income opportunities",
      "Build work experience",
      "Grow your professional profile",
      "Earn from completed tasks"
    ],
    importantNote: "Field operations teams work alongside assigned technical and support teams."
  },
  other: {
    icon: Wrench,
    title: "Other Services Account",
    description: "Join the workforce network to receive nearby service assignments based on your expertise and location.",
    features: [
      "Receive nearby jobs",
      "Update work progress",
      "Access customer location",
      "Upload completion updates",
      "Grow service opportunities"
    ],
    workflow: [
      "Job Match",
      "Assignment Accepted",
      "Service Execution",
      "Completion Update"
    ],
    benefits: [
      "Receive customer requests",
      "Get service opportunities",
      "Build your client base",
      "Increase visibility",
      "Grow your business",
      "Earn more through the platform"
    ],
    importantNote: "Service professionals receive work assignments through the operations platform."
  }
};

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mobile, setMobile]           = useState("");
  const [stateVal, setStateVal]       = useState("");
  const [city, setCity]               = useState("");
  const [pincode, setPincode]         = useState("");
  const [workType, setWorkType]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole]               = useState("customer");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [fieldErrors, setFieldErrors]  = useState({});
  const { login }                     = useAuth();
  const { t, i18n } = useTranslation();
  const navigate                      = useNavigate();

  // Memoize role info to prevent unnecessary re-renders
  const roleInfo = useMemo(() => roleInformation[role] || roleInformation.customer, [role]);
  const RoleIcon = roleInfo.icon;

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

    if (field === "password") {
      return /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(value)
        ? ""
        : "Password must be at least 8 characters, with 1 uppercase letter and 1 number";
    }

    if (field === "confirmPassword") {
      return value === password ? "" : "Passwords do not match";
    }

    if (field === "state") {
      return value ? "" : "State is required";
    }

    if (field === "city") {
      return value ? "" : "City / District is required";
    }

    if (field === "pincode") {
      return /^\d{6}$/.test(value) ? "" : "Enter a valid 6-digit pincode";
    }

    if (field === "workType") {
      return value.trim().length >= 2 ? "" : "Please specify your role or specialty";
    }

    return "";
  };

  const validateForm = () => {
    const nextErrors = {
      name: validateField("name", name),
      email: validateField("email", email),
      mobile: validateField("mobile", mobile),
      password: validateField("password", password),
      confirmPassword: validateField("confirmPassword", confirmPassword),
      state: validateField("state", stateVal),
      city: validateField("city", city),
      pincode: validateField("pincode", pincode),
      ...(role === "other" ? { workType: validateField("workType", workType) } : {})
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
      const submitRole = role === "other" ? "field_work" : role;
      const res = await apiClient.post("/auth/register", {
        name,
        email,
        password,
        mobile,
        role: submitRole,
        preferredLanguage: (i18n.language || "en").split("-")[0],
        country: "India",
        state: stateVal,
        city,
        pincode,
        ...(role === "other" ? { workType } : {})
      });
      const payload = res.data.data;
      login(payload);

      const roleRouteMap = {
        customer:    "/customer",
        sales:       "/sales",
        vendor:      "/vendor",
        electrician: "/electrician",
        field_work:  "/field_work",
        other:       "/field_work",
      };
      navigate(roleRouteMap[payload.user.role] || "/customer", { replace: true });
    } catch (err) {
      const details = err.response?.data?.details;
      setError(
        Array.isArray(details) && details.length > 0
          ? details.map((d) => d.msg).join(" · ")
            : err.response?.data?.message || t("auth.registerFailed")
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

        {/* ── LEFT: Dynamic Role Information Panel ── */}
        <aside id="role-info-section" className="vt-about vt-fadein" style={{ "--d": "0ms" }}>
          <div className="vt-brand">
            <span className="vt-brand-dot" />
            <span className="vt-brand-wordmark">Verbena Tech</span>
          </div>

          <div className="vt-about-body" style={{ opacity: 1, transition: "opacity 0.3s ease" }}>
            {/* Role Header with Professional Icon Container */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--vt-accent, #6366f1)",
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.08), inset 0 1px 2px rgba(99, 102, 241, 0.1)",
                transition: "all 0.3s ease"
              }}>
                <RoleIcon size={18} strokeWidth={1.5} />
              </div>
              <div>
                <p className="vt-tagline-label" style={{ fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: "600" }}>Your Role</p>
              </div>
            </div>

            <h1 className="vt-about-headline" style={{ marginBottom: "14px", fontWeight: "700", letterSpacing: "-0.5px" }}>
              {roleInfo.title.split(" ")[0]}<br />
              <span className="vt-accent-text" style={{ letterSpacing: "-0.5px" }}>{roleInfo.title.split(" ").slice(1).join(" ")}</span>
            </h1>

            <p className="vt-about-desc" style={{ marginBottom: "24px", lineHeight: "1.6", letterSpacing: "0.3px" }}>
              {roleInfo.description}
            </p>

            {/* Features Checklist with Professional Icons */}
            <div style={{ marginBottom: "26px" }}>
              <p className="vt-tagline-label" style={{ marginBottom: "14px", fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: "600", opacity: 0.8 }}>Key Features</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {roleInfo.features.map((feature) => {
                  const FeatureIcon = featureIconMap[feature] || ClipboardCheck;
                  return (
                    <div key={feature} style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "rgba(99, 102, 241, 0.06)",
                        border: "1px solid rgba(99, 102, 241, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--vt-accent, #6366f1)",
                        flexShrink: 0,
                        transition: "all 0.2s ease"
                      }}>
                        <FeatureIcon size={14} strokeWidth={1.5} />
                      </div>
                      <span style={{ fontSize: "13px", color: "var(--vt-text-secondary, #888)", lineHeight: "1.4" }}>{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workflow Steps with Refined Styling */}
            <div style={{ marginBottom: "26px" }}>
              <p className="vt-tagline-label" style={{ marginBottom: "14px", fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: "600", opacity: 0.8 }}>Your Workflow</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
              }}>
                {roleInfo.workflow.map((step, idx) => (
                  <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.1)",
                      border: "1.5px solid rgba(99, 102, 241, 0.2)",
                      color: "var(--vt-accent, #6366f1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      transition: "all 0.2s ease"
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--vt-text-secondary, #888)", textAlign: "center", lineHeight: "1.3", fontWeight: "500" }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits Grid with Refined Polish */}
            <div style={{ marginBottom: "24px" }}>
              <p className="vt-tagline-label" style={{ marginBottom: "14px", fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: "600", opacity: 0.8 }}>Benefits for You</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {roleInfo.benefits.map((benefit) => (
                  <div key={benefit} style={{
                    padding: "11px 12px",
                    borderRadius: "10px",
                    background: "rgba(99, 102, 241, 0.06)",
                    border: "1px solid rgba(99, 102, 241, 0.12)",
                    fontSize: "12px",
                    color: "var(--vt-text-secondary, #888)",
                    lineHeight: "1.4",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}>
                    <span style={{ color: "var(--vt-accent, #6366f1)", marginRight: "6px", fontWeight: "700" }}>✓</span>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>

            {/* Important Note with Premium Styling */}
            <div style={{
              padding: "13px 14px",
              borderRadius: "10px",
              background: "rgba(168, 85, 247, 0.06)",
              border: "1px solid rgba(168, 85, 247, 0.15)",
              borderLeft: "3px solid rgba(168, 85, 247, 0.3)",
              fontSize: "12px",
              color: "var(--vt-text-secondary, #888)",
              lineHeight: "1.5",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}>
              <strong style={{ color: "var(--vt-text-primary, #000)", fontWeight: "700" }}>Important:</strong> {roleInfo.importantNote}
            </div>
          </div>

          <p className="vt-about-foot">sivakk@verbenatech.in · +91 88797 92818</p>
        </aside>

        {/* ── RIGHT: Register card ── */}
        <main className="vt-form-col">
          <div className="vt-card vt-fadein" style={{ "--d": "80ms" }}>
            <div className="vt-card-top" style={{ marginBottom: "24px" }}>
              <div className="vt-card-icon-wrap" style={{ transition: "all 0.2s ease" }}>
                <UserPlus size={18} className="vt-card-icon" />
              </div>
              <div>
                <h2 className="vt-card-title" style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.3px" }}>{t("auth.createAccount")}</h2>
                <p className="vt-card-sub" style={{ fontSize: "13px", opacity: 0.8 }}>{t("auth.joinPlatform")}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="vt-form" style={{ marginTop: "20px" }}>
              {/* Name */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-name">{t("auth.fullName")}</label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <UserRound className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
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
                    style={{ transition: "all 0.2s ease" }}
                  />
                </div>
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-email">{t("auth.email")}</label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <Mail className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
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
                    style={{ transition: "all 0.2s ease" }}
                  />
                </div>
                {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-mobile">{t("auth.mobile")}</label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <Phone className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
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
                    style={{ transition: "all 0.2s ease" }}
                  />
                </div>
                {fieldErrors.mobile && <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p>}
              </div>

              {/* State select — India only, always visible */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }}>State</label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <MapPin className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
                  <select
                    className="vt-inp"
                    value={stateVal}
                    onChange={(e) => {
                      const s = e.target.value;
                      setStateVal(s);
                      setCity("");
                      setFieldErrors((prev) => ({
                        ...prev,
                        state: validateField("state", s),
                        city: ""
                      }));
                    }}
                    required
                    style={{
                      background: "transparent",
                      color: stateVal ? "rgba(226, 232, 240, 0.95)" : "rgba(148, 163, 184, 0.65)",
                      outline: "none",
                      border: "none",
                      width: "100%",
                      cursor: "pointer"
                    }}
                  >
                    <option value="" style={{ background: "#07090f", color: "rgba(148, 163, 184, 0.65)" }}>Select State / UT</option>
                    {Object.keys(indiaLocations).sort().map((s) => (
                      <option key={s} value={s} style={{ background: "#07090f", color: "#e2e8f0" }}>{s}</option>
                    ))}
                  </select>
                </div>
                {fieldErrors.state && <p className="mt-1 text-xs text-red-600">{fieldErrors.state}</p>}
              </div>

              {/* City / District select — shown after state selected */}
              {stateVal && (
                <div className="vt-field">
                  <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }}>District / City</label>
                  <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                    <MapPin className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
                    <select
                      className="vt-inp"
                      value={city}
                      onChange={(e) => {
                        const ct = e.target.value;
                        setCity(ct);
                        setFieldErrors((prev) => ({
                          ...prev,
                          city: validateField("city", ct)
                        }));
                      }}
                      required
                      style={{
                        background: "transparent",
                        color: city ? "rgba(226, 232, 240, 0.95)" : "rgba(148, 163, 184, 0.65)",
                        outline: "none",
                        border: "none",
                        width: "100%",
                        cursor: "pointer"
                      }}
                    >
                      <option value="" style={{ background: "#07090f", color: "rgba(148, 163, 184, 0.65)" }}>Select District / City</option>
                      {(indiaLocations[stateVal] || []).map((ct) => (
                        <option key={ct} value={ct} style={{ background: "#07090f", color: "#e2e8f0" }}>{ct}</option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.city && <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>}
                </div>
              )}

              {/* Pincode */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-pincode">
                  Pincode
                  <span className="vt-label-hint"> · 6-digit area code</span>
                </label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <MapPin className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
                  <input
                    id="reg-pincode"
                    className="vt-inp"
                    type="text"
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPincode(val);
                      setFieldErrors((prev) => ({ ...prev, pincode: validateField("pincode", val) }));
                    }}
                    placeholder="560001"
                    required
                    maxLength={6}
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, pincode: validateField("pincode", pincode) }))}
                    aria-invalid={Boolean(fieldErrors.pincode)}
                    style={{ transition: "all 0.2s ease" }}
                  />
                </div>
                {fieldErrors.pincode && <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>}
              </div>

              {/* Password */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-password">
                  Password
                  <span className="vt-label-hint"> · min 8 chars, 1 uppercase, 1 number</span>
                </label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <Lock className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
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
                    style={{ transition: "all 0.2s ease" }}
                  />
                  <button type="button" className="vt-toggle-pw" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} style={{ transition: "all 0.2s ease" }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-confirm-password">
                  Confirm Password
                </label>
                <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                  <Lock className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
                  <input
                    id="reg-confirm-password"
                    className="vt-inp"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value === password ? "" : "Passwords do not match"
                      }));
                    }}
                    placeholder="••••••••"
                    required
                    onBlur={() => setFieldErrors((prev) => ({ ...prev, confirmPassword: validateField("confirmPassword", confirmPassword) }))}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    style={{ transition: "all 0.2s ease" }}
                  />
                  <button type="button" className="vt-toggle-pw" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1} style={{ transition: "all 0.2s ease" }}>
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
              </div>

              {/* Role */}
              <div className="vt-field">
                <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }}>{t("auth.role")}</label>
                <div className="vt-role-grid" style={{ gap: "10px", marginTop: "12px" }}>
                  {roleOptions.map(({ value, label, desc }) => {
                    const RoleOptionIcon = roleInformation[value]?.icon || UserPlus;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setRole(value);
                          setTimeout(() => {
                            const el = document.getElementById("role-info-section");
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 100);
                        }}
                        className={`vt-role-pill${role === value ? " vt-role-pill-on" : ""}`}
                        style={{
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          border: role === value ? "1.5px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(99, 102, 241, 0.15)",
                          boxShadow: role === value ? "0 0 20px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(99, 102, 241, 0.1)" : "0 0 0px rgba(99, 102, 241, 0)",
                          position: "relative",
                          overflow: "hidden"
                        }}
                      >
                        <span className="vt-rp-label" style={{ fontWeight: "600", fontSize: "13px" }}>{label}</span>
                        <span className="vt-rp-desc" style={{ fontSize: "11px", opacity: 0.7 }}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {role === "other" && (
                <div className="vt-field">
                  <label className="vt-label" style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" }} htmlFor="reg-work-type">
                    Your Role / Specialty
                    <span className="vt-label-hint"> · plumber, painter, carpenter, etc.</span>
                  </label>
                  <div className="vt-input-shell" style={{ transition: "all 0.2s ease", marginTop: "8px" }}>
                    <Wrench className="vt-i-icon" size={15} style={{ transition: "color 0.2s ease" }} />
                    <input
                      id="reg-work-type"
                      className="vt-inp"
                      type="text"
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      placeholder="e.g. Plumber"
                      required
                      onBlur={() => setFieldErrors((prev) => ({ ...prev, workType: validateField("workType", workType) }))}
                      aria-invalid={Boolean(fieldErrors.workType)}
                      style={{ transition: "all 0.2s ease" }}
                    />
                  </div>
                  {fieldErrors.workType && <p className="mt-1 text-xs text-red-600">{fieldErrors.workType}</p>}
                </div>
              )}

              {error && <p className="vt-err" style={{ marginBottom: "16px" }}>{error}</p>}

              <button id="reg-submit" type="submit" disabled={loading} className="vt-btn-primary" style={{ marginTop: "2px", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                {loading ? <span className="vt-spin" /> : <><span>{t("auth.createAccount")}</span><ArrowRight size={15} style={{ marginLeft: "6px", transition: "transform 0.2s ease" }} /></>}
              </button>
            </form>

            <div className="vt-card-foot" style={{ marginTop: "20px" }}>
              <p className="vt-foot-txt" style={{ fontSize: "13px" }}>
                {t("auth.alreadyAccount")}{" "}
                <Link to="/" className="vt-foot-link" style={{ fontWeight: "600", transition: "all 0.2s ease" }}>{t("auth.signIn")}</Link>
              </p>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
