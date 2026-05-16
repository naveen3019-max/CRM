import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { AlertCircle, ChevronRight } from "lucide-react";

const ROLES = {
  ADMIN: "admin",
  SALES: "sales",
  CUSTOMER: "customer",
  VENDOR: "vendor",
  ELECTRICIAN: "electrician",
  FIELD_WORK: "field_work"
};

export default function ProfileCompletionPage() {
  const { user, login, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    mobile: user?.mobile || "",
    workType: user?.workType || "",
    state: "",
    city: "",
    pincode: "",
    experience: "",
    about: "",
    skills: ""
  });

  useEffect(() => {
    // Redirect if already profile complete or not logged in
    if (!user) {
      navigate("/login");
    } else if (user.profileCompleted) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  useEffect(() => {
    // Fetch latest profile from server to pre-fill form (handles older users)
    let cancelled = false;
    async function fetchProfile() {
      if (!user) return;
      try {
        const resp = await apiClient.get("/auth/profile");
        const data = resp.data?.data;
        if (!cancelled && data) {
          setFormData((prev) => ({
            ...prev,
            name: data.name || prev.name,
            phone: data.phone || prev.phone,
            mobile: data.mobile || prev.mobile,
            workType: data.workType || prev.workType,
            state: data.state || prev.state,
            city: data.city || prev.city,
            pincode: data.pincode || prev.pincode,
            experience: data.experience ?? prev.experience,
            about: data.about || prev.about,
            skills: data.skills || prev.skills
          }));
        }
      } catch (err) {
        // ignore — keep existing values
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isNonCustomer = user?.role !== ROLES.CUSTOMER;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const validateForm = () => {
    // Required fields for all roles
    if (!formData.state?.trim()) {
      setError("State is required");
      return false;
    }
    if (!formData.city?.trim()) {
      setError("City is required");
      return false;
    }
    if (!formData.pincode?.trim()) {
      setError("Pincode is required");
      return false;
    }

    // Role-based validation
    if (isNonCustomer) {
      if (!formData.workType?.trim()) {
        setError("Role / specialty is required for your account");
        return false;
      }
      if (!formData.about?.trim()) {
        setError("About section is required for your role");
        return false;
      }
      if (formData.about.trim().length < 20) {
        setError("About section must be at least 20 characters");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone || undefined,
        mobile: formData.mobile,
        workType: formData.workType || undefined,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
        experience: formData.experience ? parseInt(formData.experience) : undefined,
        ...(isNonCustomer ? { about: formData.about || undefined } : {}),
        skills: formData.skills || undefined,
        profileCompleted: true
      };

      const response = await apiClient.patch("/auth/profile", payload);
      
      // Profile completed successfully, navigate to dashboard
      if (response.data?.success) {
        const updatedUser = response.data.data;
        
        // Update auth context with new profile data (no token change)
        if (updatedUser && typeof updateUser === "function") {
          updateUser(updatedUser);
        }

        // Redirect based on role
        const role = updatedUser?.role || user?.role;
        if (role === ROLES.VENDOR) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate(`/${role}`, { replace: true });
        }
      } else {
        setError("Failed to complete profile. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen vt-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="vt-card-glass rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold vt-text-primary">Complete Your Profile</h1>
            <p className="vt-text-secondary">Tell us more about yourself to get started</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="vt-alert-error flex gap-3 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (pre-filled, read-only) */}
            <div>
              <label className="block text-sm font-medium vt-text-primary mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                readOnly
                className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 cursor-not-allowed"
              />
              <p className="text-xs vt-text-secondary mt-1">Pre-filled from registration</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium vt-text-primary mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
              />
            </div>

            {/* Mobile (pre-filled, read-only) */}
            <div>
              <label className="block text-sm font-medium vt-text-primary mb-2">
                Mobile Number
              </label>
              <input
                type="tel"
                value={formData.mobile}
                readOnly
                className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 cursor-not-allowed"
              />
              <p className="text-xs vt-text-secondary mt-1">Pre-filled from registration</p>
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium vt-text-primary mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g., California, Maharashtra"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
                required
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium vt-text-primary mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., San Francisco, Mumbai"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
                required
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium vt-text-primary mb-2">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g., 94105"
                maxLength="10"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
                required
              />
            </div>

            {/* Experience (non-customer only) */}
            {isNonCustomer && (
              <div>
                <label className="block text-sm font-medium vt-text-primary mb-2">
                  Role / Specialty <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="workType"
                  value={formData.workType}
                  onChange={handleChange}
                  placeholder="e.g., Plumber, Painter, Carpenter"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
                  required
                />
              </div>
            )}

            {/* Experience (non-customer only) */}
            {isNonCustomer && (
              <div>
                <label className="block text-sm font-medium vt-text-primary mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g., 5"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
                />
              </div>
            )}

            {isNonCustomer && (
              <div>
                <label className="block text-sm font-medium vt-text-primary mb-2">
                  About <span className="text-red-500">*</span>
                  <span className="text-xs ml-2 vt-text-secondary">(min 20 characters)</span>
                </label>
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={handleChange}
                  placeholder="Tell us about your expertise and experience..."
                  rows="4"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus resize-none"
                  required
                />
                {formData.about && (
                  <p className="text-xs vt-text-secondary mt-1">
                    {formData.about.length} characters
                  </p>
                )}
              </div>
            )}

            {/* Skills (non-customer only) */}
            {isNonCustomer && (
              <div>
                <label className="block text-sm font-medium vt-text-primary mb-2">
                  Skills
                </label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g., Electrical Installation, Maintenance, etc."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 vt-input-focus"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full vt-btn-primary py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Completing..." : "Complete Profile"}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Hint */}
          <p className="text-xs vt-text-secondary text-center">
            Your information is secure and will only be used for professional purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
