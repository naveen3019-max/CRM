export function DashboardCard({ title, value, helper }) {
  return (
    <div className="metric-card fade-up p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <h3 className="mt-3 font-heading text-xl font-semibold text-slate-800 sm:text-2xl lg:text-3xl">{value}</h3>
      <p className="mt-2 text-xs text-slate-500 sm:text-sm">{helper}</p>
    </div>
  );
}
