const columns = [
  { key: "new", title: "New" },
  { key: "contacted", title: "Contacted" },
  { key: "qualified", title: "Qualified" },
  { key: "closed", title: "Closed" }
];

export function LeadKanban({ leads }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {columns.map((column) => {
        const list = leads.filter((lead) => lead.status === column.key);

        return (
          <section key={column.key} className="glass-panel p-4">
            <header className="mb-4 flex items-center justify-between">
              <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-600">
                {column.title}
              </h4>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                {list.length}
              </span>
            </header>
            <div className="space-y-3">
              {list.map((lead) => (
                <article key={lead.id} className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-soft">
                  <p className="text-sm font-semibold text-slate-700">{lead.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{lead.customerName}</p>
                  <p className="mt-2 text-xs text-brand-700">${Number(lead.budget || 0).toLocaleString()}</p>
                </article>
              ))}
              {!list.length ? <p className="text-xs text-slate-400">No leads</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
