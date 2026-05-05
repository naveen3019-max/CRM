import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, MapPin, Phone, User, UserPlus } from "lucide-react";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

export default function VendorRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateField = (field, value) => {
    if (field === "name") return value.trim().length >= 2 ? "" : "Name must be at least 2 characters";
    if (field === "email") return /^\S+@\S+\.\S+$/.test(value.trim()) ? "" : "Enter a valid email address";
    if (field === "mobile") return /^\d{10}$/.test(value) ? "" : "Mobile number must be exactly 10 digits";
    if (field === "address") return value.trim().length >= 10 ? "" : "Address must be at least 10 characters";
    if (field === "password") return /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(value)
      ? ""
      : "Password must be at least 8 characters, with 1 uppercase letter and 1 number";
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
      // Role is automatically set as "vendor"
      const res = await apiClient.post("/auth/register", { 
        name, 
        email, 
        password, 
        mobile,
        address,
        role: "vendor" 
      });
      
      const payload = res.data.data;
      
      // Log in vendor and go to onboarding
      login(payload);
      navigate("/onboarding", { replace: true });
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB]/10 text-[#2563EB] mb-4">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">Vendor Registration</h1>
          <p className="text-[#64748B] mt-2">Join our network of professional installers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Company Representative Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setName(nextValue);
                  setFieldErrors((prev) => ({ ...prev, name: validateField("name", nextValue) }));
                }}
                required
              />
            </div>
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Business Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
              <input
                type="email"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all"
                placeholder="company@email.com"
                value={email}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setEmail(nextValue);
                  setFieldErrors((prev) => ({ ...prev, email: validateField("email", nextValue) }));
                }}
                required
              />
            </div>
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
              <input
                type="tel"
                inputMode="numeric"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all"
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setMobile(nextValue);
                  setFieldErrors((prev) => ({ ...prev, mobile: validateField("mobile", nextValue) }));
                }}
                required
                maxLength={10}
              />
            </div>
            {fieldErrors.mobile && <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-4 text-[#9CA3AF]" size={18} />
              <textarea
                className="w-full min-h-[104px] pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all resize-y"
                placeholder="Enter your full address"
                value={address}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setAddress(nextValue);
                  setFieldErrors((prev) => ({ ...prev, address: validateField("address", nextValue) }));
                }}
                required
                minLength={10}
              />
            </div>
            {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setPassword(nextValue);
                  setFieldErrors((prev) => ({ ...prev, password: validateField("password", nextValue) }));
                }}
                required
                minLength={8}
              />
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#2563EB]/20"
          >
            {loading ? "Creating Account..." : "Create Vendor Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#64748B]">
          Already have an account?{" "}
          <Link to="/" className="text-[#2563EB] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
