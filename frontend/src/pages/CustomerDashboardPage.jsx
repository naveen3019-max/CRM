import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";

function formatLeadStatus(status) {
  return String(status || "").replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    async function loadRequests() {
      try {
        const response = await apiClient.get("/leads", withAuth(token));
        setRequests(response.data.data || []);
      } catch {
        setRequests([]);
      }
    }

    loadRequests();
  }, [token]);

  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/customer/chat")}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Chat
        </button>
      </div>

      <article className="glass-panel p-4 sm:p-5">
        <h2 className="font-heading text-xl font-semibold text-slate-800">Service Requests</h2>
        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
              <p className="font-semibold text-slate-700">{request.title}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
                  {formatLeadStatus(request.status)}
                </span>
              </div>
            </div>
          ))}

          {!requests.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No service requests found.
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
