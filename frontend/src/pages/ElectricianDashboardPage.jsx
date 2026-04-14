import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";

function formatStatus(status) {
  return String(status || "").replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ElectricianDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofMessage, setProofMessage] = useState("");
  const [proofError, setProofError] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await apiClient.get("/tasks", withAuth(token));
        const rows = response.data.data || [];
        setJobs(rows);
        setSelectedTaskId(rows[0]?.id ? String(rows[0].id) : "");
      } catch {
        setJobs([]);
        setSelectedTaskId("");
      }
    }

    loadJobs();
  }, [token]);

  const selectedTask = useMemo(
    () => jobs.find((job) => String(job.id) === String(selectedTaskId)) || null,
    [jobs, selectedTaskId]
  );

  const handleUploadProof = async (event) => {
    event.preventDefault();
    setProofMessage("");
    setProofError("");

    if (!selectedTaskId || !proofFile) {
      setProofError("Select a task and file first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("proof", proofFile);
      if (proofNote.trim()) {
        formData.append("note", proofNote.trim());
      }

      await apiClient.post(`/tasks/${selectedTaskId}/proof`, formData, withAuth(token));
      setProofFile(null);
      setProofNote("");
      setProofMessage("Proof uploaded successfully.");
    } catch (apiError) {
      setProofError(apiError.response?.data?.message || "Proof upload failed.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/electrician/chat")}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Chat
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <article className="glass-panel p-4 sm:p-5">
          <h2 className="font-heading text-xl font-semibold text-slate-800">Assigned Jobs</h2>
          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <p className="font-semibold text-slate-700">Job #{job.id}</p>
                <p className="text-sm text-slate-500">{job.title}</p>
                <p className="mt-1 text-xs text-slate-400">Assigned: {job.assigneeName}</p>
                <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {formatStatus(job.status)}
                </span>
              </div>
            ))}

            {!jobs.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No assigned jobs found.
              </div>
            ) : null}
          </div>
        </article>

        <article className="glass-panel p-4 sm:p-5">
          <h2 className="font-heading text-xl font-semibold text-slate-800">Proof Upload</h2>
          <p className="mt-2 text-sm text-slate-500">Upload completion proof for an assigned job.</p>

          <form onSubmit={handleUploadProof} className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-slate-600">
              Select Task
              <select
                value={selectedTaskId}
                onChange={(event) => setSelectedTaskId(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    #{job.id} - {job.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-600">
              Proof File
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-600">
              Note
              <textarea
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
                placeholder="Optional progress note"
              />
            </label>

            {selectedTask ? (
              <p className="text-xs text-slate-500">
                Current status: <span className="font-semibold text-slate-700">{formatStatus(selectedTask.status)}</span>
              </p>
            ) : null}

            {proofError ? <p className="text-sm text-red-500">{proofError}</p> : null}
            {proofMessage ? <p className="text-sm text-emerald-600">{proofMessage}</p> : null}

            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Upload Proof
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
