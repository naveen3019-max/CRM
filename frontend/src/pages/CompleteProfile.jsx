import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Home, Loader2, MapPin, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const stateOptions = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
  "Puducherry",
  "Andaman and Nicobar Islands",
];

const fieldShell =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

const readOnlyShell = `${fieldShell} cursor-not-allowed bg-slate-50 text-slate-500`;

function SectionTitle({ icon: Icon, eyebrow, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-full bg-slate-100 p-2 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
    </div>
  );
}

export default function CompleteProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isWorkerRole = ["field_work", "worker"].includes(user?.role);
  const isCustomerRole = user?.role === "customer";

  const [form, setForm] = useState({
    state: "",
    city: "",
    address: "",
    pincode: "",
    about: "",
    skills: "",
    experience: "",
    workType: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate("/", { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (user?.profileCompleted) navigate(user.role === "vendor" ? "/onboarding" : `/${user.role}`, { replace: true });
  }, [navigate, user?.profileCompleted, user?.role]);

  const validateField = (field, value) => {
    if (field === "state") return value ? "" : "State is required";
    if (field === "city") return value.trim() ? "" : "City is required";
    if (field === "address") return value.trim() ? "" : "Address is required";
    if (field === "pincode") return /^\d{6}$/.test(value) ? "" : "Pincode must be exactly 6 digits";
    if (field === "about") return isCustomerRole ? "" : value.trim().length >= 20 ? "" : "About me must be at least 20 characters";
    if (field === "skills") return !isWorkerRole || value.trim() ? "" : "Skills are required";
    if (field === "experience") return !isWorkerRole || /^\d+$/.test(value) ? "" : "Experience must be numeric";
    if (field === "workType") return !isWorkerRole || value.trim() ? "" : "Work type is required";
    return "";
  };

  const requiredFields = useMemo(() => {
    const base = ["state", "city", "address", "pincode"];
    if (!isCustomerRole) base.push("about");
    return isWorkerRole ? [...base, "skills", "experience", "workType"] : base;
  }, [isWorkerRole, isCustomerRole]);

  const progress = useMemo(() => {
    if (!requiredFields.length) return 0;
    const completed = requiredFields.filter((field) => !validateField(field, form[field])).length;
    return Math.round((completed / requiredFields.length) * 100);
  }, [form, requiredFields]);

  const isValid = useMemo(() => requiredFields.every((field) => !validateField(field, form[field])), [form, requiredFields]);
  const completedFields = useMemo(() => requiredFields.filter((field) => !validateField(field, form[field])).length, [form, requiredFields]);
  const totalFields = requiredFields.length;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = requiredFields.reduce((accumulator, field) => {
      const message = validateField(field, form[field]);
      if (message) accumulator[field] = message;
      return accumulator;
    }, {});

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        skills: isWorkerRole ? form.skills : "",
        experience: isWorkerRole ? form.experience : "",
        workType: isWorkerRole ? form.workType : "",
        about: isCustomerRole ? "" : form.about
      };

      const response = await apiClient.post("/users/complete-profile", payload);
      const updatedUser = response.data?.data;
      if (updatedUser) updateUser(updatedUser);
      navigate(user?.role === "vendor" ? "/onboarding" : `/${user?.role}`, { replace: true });
    } catch (error) {
      const resp = error.response?.data;
      if (error.response?.status === 422 && Array.isArray(resp?.errors)) {
        const fieldErrors = resp.errors.reduce((acc, cur) => {
          if (cur.param) acc[cur.param] = cur.msg || cur.message || "Invalid value";
          return acc;
        }, {});
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      } else {
        const message = resp?.message || "Unable to complete your profile.";
        setErrors((prev) => ({ ...prev, form: message }));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-600">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-5 sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Complete your profile</h1>
              <p className="mt-1 text-sm text-slate-500">A minimal setup to get you started — responsive and focused.</p>
            </div>
            <div className="mt-3 sm:mt-0 sm:flex sm:items-center">
              <div className="mr-4 text-center">
                <div className="text-sm font-medium text-slate-500">Progress</div>
                <div className="mt-1 text-xl font-extrabold text-slate-900">{progress}%</div>
              </div>
              <div className="rounded-full bg-slate-100 p-2">
                <ShieldCheck className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 px-6 pb-6 sm:grid-cols-2">
            <div className="space-y-4">
              <section className="rounded-lg border border-slate-100 bg-white p-4">
                <SectionTitle icon={UserRound} eyebrow="Verified" title="Identity" />
                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Name</label>
                    <input className={readOnlyShell} value={user.name || ""} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Email</label>
                    <input className={readOnlyShell} value={user.email || ""} readOnly />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Mobile</label>
                      <input className={readOnlyShell} value={user.mobile || ""} readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Role</label>
                      <input className={readOnlyShell} value={user.role || ""} readOnly />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-100 bg-white p-4">
                <SectionTitle icon={Home} eyebrow="Service" title="Location" />
                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">State</label>
                    <select className={fieldShell} value={form.state} onChange={(e) => handleChange("state", e.target.value)}>
                      <option value="">Select state</option>
                      {stateOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Address</label>
                    <textarea
                      className={`${fieldShell} min-h-[96px] resize-y`}
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="House number, street, area"
                    />
                    {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">City</label>
                      <input className={fieldShell} value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Pincode</label>
                      <input
                        className={fieldShell}
                        value={form.pincode}
                        onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit"
                        maxLength={6}
                        inputMode="numeric"
                      />
                      {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                    </div>
                  </div>
                </div>
              </section>

              {!isCustomerRole ? (
                <section className="rounded-lg border border-slate-100 bg-white p-4">
                  <label className="block text-xs font-semibold text-slate-500">About</label>
                  <textarea
                    className="w-full min-h-[110px] rounded-md border border-slate-200 px-3 py-2 text-slate-700 focus:border-brand-500"
                    value={form.about}
                    onChange={(e) => handleChange("about", e.target.value)}
                    placeholder="Tell us a little about yourself"
                  />
                  {errors.about && <p className="mt-1 text-xs text-red-600">{errors.about}</p>}
                </section>
              ) : null}
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-700">Details for workers</h3>
                <p className="mt-2 text-xs text-slate-500">Only required for field workers and similar roles.</p>

                {isWorkerRole ? (
                  <div className="mt-3 grid gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Skills</label>
                      <input className={fieldShell} value={form.skills} onChange={(e) => handleChange("skills", e.target.value)} placeholder="Electrician, plumbing" />
                      {errors.skills && <p className="mt-1 text-xs text-red-600">{errors.skills}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Experience (years)</label>
                      <input className={fieldShell} value={form.experience} onChange={(e) => handleChange("experience", e.target.value.replace(/\D/g, ""))} placeholder="5" />
                      {errors.experience && <p className="mt-1 text-xs text-red-600">{errors.experience}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Work Type</label>
                      <input className={fieldShell} value={form.workType} onChange={(e) => handleChange("workType", e.target.value)} placeholder="Electrician" />
                      {errors.workType && <p className="mt-1 text-xs text-red-600">{errors.workType}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">No additional details required for your role.</div>
                )}
              </section>

              <section className="rounded-lg border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-700">Summary</h3>
                <div className="mt-3 text-sm text-slate-600">
                  <p>{completedFields} of {totalFields} fields complete</p>
                  <p className="mt-2">{isValid ? "All required fields completed." : "Please complete required fields to continue."}</p>
                </div>
              </section>

              <div className="flex items-center justify-end">
                {errors.form && <p className="mr-4 text-sm font-semibold text-red-600">{errors.form}</p>}
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Complete Profile"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

