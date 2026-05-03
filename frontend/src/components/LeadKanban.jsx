import { Link } from "react-router-dom";

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
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{lead.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{lead.customerName}</p>
                    </div>
                    <Link 
                      to={`/communication/${lead.id}`} 
                      className="p-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition"
                      title="Open Operations Timeline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                    </Link>
                  </div>
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
