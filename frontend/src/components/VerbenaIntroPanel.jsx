const corePillars = [
  "AI automation, analytics, and intelligent assistants",
  "AR live support, guided demos, and remote collaboration",
  "VR manuals, onboarding, and scenario-based training"
];

const industries = [
  "Manufacturing",
  "Healthcare",
  "Insurance",
  "Education",
  "Forestry",
  "E-Commerce",
  "Automotive",
  "Finance"
];

export function VerbenaIntroPanel({ compact = false }) {
  return (
    <section className="glass-panel h-full p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">About Verbena Tech</p>
      <h2 className="mt-3 font-heading text-2xl font-semibold text-slate-800 sm:text-3xl">
        Powering the Future with Secure AI, AR, and VR
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Verbena Tech builds practical, high-impact immersive solutions for customer engagement, operational
        excellence, and workforce readiness.
      </p>

      <div className="mt-5 space-y-3">
        {corePillars.map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-700">
            {item}
          </div>
        ))}
      </div>

      {!compact ? (
        <>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Industries We Serve</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {industries.map((name) => (
              <span key={name} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {name}
              </span>
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Contact</p>
        <p className="mt-1">sivakk@verbenatech.in | +91 88797 92818</p>
      </div>
    </section>
  );
}
