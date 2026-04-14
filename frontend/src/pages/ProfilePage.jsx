import { useEffect, useMemo, useState } from "react";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await apiClient.get("/auth/profile", withAuth(token));
        const data = response.data.data;
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      } catch {
        setError("Unable to load profile right now.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [token]);

  const joinedDate = useMemo(() => {
    if (!profile?.createdAt) {
      return "-";
    }
    return new Date(profile.createdAt).toLocaleDateString();
  }, [profile?.createdAt]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    const payload = {};
    if (name.trim() && name.trim() !== profile?.name) {
      payload.name = name.trim();
    }

    const normalizedPhone = phone.trim();
    if ((normalizedPhone || "") !== (profile?.phone || "")) {
      payload.phone = normalizedPhone || null;
    }

    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (!Object.keys(payload).length) {
      setSuccess("No changes to update.");
      return;
    }

    setSaving(true);

    try {
      const response = await apiClient.patch("/auth/profile", payload, withAuth(token));
      const updatedProfile = response.data.data;
      setProfile(updatedProfile);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      updateUser({
        ...user,
        name: updatedProfile.name,
        phone: updatedProfile.phone || null
      });
      setSuccess("Profile updated successfully.");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="glass-panel px-4 py-4 sm:px-5">
        <h2 className="font-heading text-xl font-semibold text-slate-800">Profile</h2>
        <p className="text-sm text-slate-500">Manage your personal account details</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="glass-panel space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Full Name
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label className="text-sm font-semibold text-slate-600">
              Phone
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Current Password
              <input
                type="password"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Required for password change"
              />
            </label>

            <label className="text-sm font-semibold text-slate-600">
              New Password
              <input
                type="password"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave blank to keep current"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-600">
            Confirm New Password
            <input
              type="password"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none ring-brand-300 focus:ring"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              placeholder="Repeat new password"
            />
          </label>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          <button
            type="submit"
            disabled={loading || saving}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <aside className="glass-panel space-y-3 p-4 sm:p-5">
          <h3 className="font-heading text-lg font-semibold text-slate-800">Account Info</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">Email:</span> {profile?.email || user?.email}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Role:</span> {(profile?.role || user?.role || "").toUpperCase()}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Joined:</span> {joinedDate}
            </p>
          </div>

          {loading ? <p className="text-xs text-slate-500">Loading profile...</p> : null}
        </aside>
      </div>
    </section>
  );
}
