import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "../components/DashboardCard.jsx";
import { LeadKanban } from "../components/LeadKanban.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";

export default function SalesDashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ assignedLeads: 0, closedLeads: 0, conversionRate: 0 });
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewResponse, leadsResponse] = await Promise.all([
          apiClient.get("/analytics/sales/overview", withAuth(token)),
          apiClient.get("/leads", withAuth(token))
        ]);
        setOverview(overviewResponse.data.data);
        setLeads(leadsResponse.data.data);
      } catch {
        setOverview({ assignedLeads: 0, closedLeads: 0, conversionRate: 0 });
      }
    }

    loadData();
  }, [token]);

  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/sales/chat")}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Chat
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard title="Assigned Leads" value={overview.assignedLeads} helper="Total owned by you" />
        <DashboardCard title="Closed Deals" value={overview.closedLeads} helper="Converted opportunities" />
        <DashboardCard title="Conversion" value={`${overview.conversionRate}%`} helper="Close rate" />
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold text-slate-800">Lead Pipeline</h2>
        <LeadKanban leads={leads} />
      </section>
    </section>
  );
}
