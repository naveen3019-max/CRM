export function DashboardCard({ title, value, helper }) {
  return (
    <div className="metric-card fade-up">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <h3 className="mt-3 font-heading text-2xl font-semibold text-slate-800 sm:text-3xl">{value}</h3>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}
