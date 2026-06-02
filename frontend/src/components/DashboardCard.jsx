export function DashboardCard({ title, value, helper, icon }) {
  return (
    <div className="metric-card fade-up h-full p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{title}</p>
          <h3 className="mt-2 break-words font-heading text-base font-semibold leading-tight text-slate-800 sm:text-2xl lg:text-3xl">
            {value}
          </h3>
        </div>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/75 shadow-sm ring-1 ring-slate-100 sm:h-10 sm:w-10">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 break-words text-[11px] leading-snug text-slate-500 sm:mt-3 sm:text-sm">{helper}</p>
    </div>
  );
}
