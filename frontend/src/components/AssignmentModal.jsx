import { useEffect, useMemo, useState } from "react";
import { X, Paperclip, CalendarDays, MapPin, BadgeIndianRupee, Sparkles, MessageSquarePlus } from "lucide-react";

const priorityOptions = [
  { value: "normal", label: "Normal", tone: "bg-slate-100 text-slate-700" },
  { value: "important", label: "Important", tone: "bg-amber-100 text-amber-700" },
  { value: "urgent", label: "Urgent", tone: "bg-rose-100 text-rose-700" }
];

const emptyContext = {};

function buildDefaultServiceTitle(worker) {
  const specialty = String(worker?.serviceCategory || worker?.workType || worker?.role || "").trim();
  if (!specialty) {
    return "New Work Assignment";
  }

  return `${specialty} assignment`;
}

export default function AssignmentModal({
  open,
  worker,
  context,
  onClose,
  onSubmit,
  submitting = false
}) {
  const [serviceTitle, setServiceTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("normal");
  const [schedule, setSchedule] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [attachments, setAttachments] = useState([]);

  const safeContext = context || emptyContext;

  useEffect(() => {
    if (!open) {
      return;
    }

    setServiceTitle(safeContext.serviceTitle || buildDefaultServiceTitle(worker));
    setCustomerName(safeContext.customerName || "");
    setProblemDescription(safeContext.problemDescription || "");
    setLocation(safeContext.location || "");
    setBudget(safeContext.budget || "");
    setPriority(safeContext.priority || "normal");
    setSchedule(safeContext.schedule || "");
    setAdditionalInstructions(safeContext.additionalInstructions || "");
    setAttachments([]);
  }, [open, safeContext, worker]);

  const workerSummary = useMemo(() => {
    if (!worker) {
      return "";
    }

    const parts = [worker.serviceCategory || worker.workType || worker.role, worker.city, worker.state].filter(Boolean);
    return parts.join(" • ");
  }, [worker]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (typeof onSubmit !== "function") {
      return;
    }

    await onSubmit({
      workerId: worker?.id,
      customerName: customerName.trim(),
      serviceTitle: serviceTitle.trim(),
      serviceCategory: worker?.serviceCategory || worker?.workType || worker?.role || "general",
      description: problemDescription.trim(),
      location: location.trim(),
      budget: budget.trim(),
      priority,
      preferredDate: schedule ? schedule.slice(0, 10) : "",
      preferredTime: schedule ? schedule.slice(11, 16) : "",
      additionalInstructions: additionalInstructions.trim(),
      attachments
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Assign Work
            </div>
            <h2 className="mt-3 text-xl font-bold sm:text-2xl">Create a work assignment</h2>
            <p className="mt-1 text-sm text-white/70">Fast coordination workflow for {worker?.name || "the selected worker"}.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close assignment modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Service Title</span>
                <input
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                  placeholder="e.g. Electrical repair at office"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Name</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                  placeholder="Optional customer name"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Problem Description</span>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                placeholder="Describe the issue, scope, or customer need"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Location
                </span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                  placeholder="Site, area, or address"
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <BadgeIndianRupee className="h-3.5 w-3.5" />
                  Budget
                </span>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                  placeholder="e.g. 5000"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  Priority
                </span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Schedule
                </span>
                <input
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Additional Instructions</span>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                placeholder="Anything the worker should know before heading out"
              />
            </label>

            <label className="block rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 transition hover:border-brand-300 hover:bg-brand-50/40">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <Paperclip className="h-4 w-4" />
                Attachments
              </span>
              <span className="mt-1 block text-xs text-slate-500">Upload photos, PDFs, or short clips to support the assignment.</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={(event) => setAttachments(Array.from(event.target.files || []).slice(0, 8))}
                className="mt-3 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
              />
              {attachments.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Assigning..." : "Assign Work"}
              </button>
            </div>
          </form>

          <aside className="border-t border-slate-100 bg-slate-50/80 p-5 sm:border-t-0 sm:border-l sm:p-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Worker</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{worker?.name || "Worker"}</h3>
              <p className="mt-1 text-sm text-slate-600">{workerSummary || "Service professional"}</p>

              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Service Type</span>
                  <span className="mt-1 block font-semibold text-slate-800">{worker?.workType || worker?.role || "-"}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Experience</span>
                  <span className="mt-1 block font-semibold text-slate-800">{worker?.experience ? `${worker.experience} years` : "Not specified"}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Location</span>
                  <span className="mt-1 block font-semibold text-slate-800">{workerSummary || "Unknown"}</span>
                </div>
              </div>

              <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The assignment will be created immediately, posted into coordination chat, and pushed as a realtime notification.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}