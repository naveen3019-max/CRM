import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { API_ORIGIN } from "../services/runtimeConfig.js";

function statusClasses(status) {
  if (status === "in_progress") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function statusLabel(status) {
  return String(status || "").replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseAttachments(attachmentsJson) {
  if (!attachmentsJson) return [];
  try {
    if (typeof attachmentsJson === "string") {
      const parsed = JSON.parse(attachmentsJson);
      return Array.isArray(parsed) ? parsed : [];
    }
    return Array.isArray(attachmentsJson) ? attachmentsJson : [];
  } catch {
    return [];
  }
}

function resolveAttachmentUrl(rawUrl) {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http")) return rawUrl;
  if (rawUrl.startsWith("/uploads/")) {
    return `${API_ORIGIN}${rawUrl}`;
  }
  return `${API_ORIGIN}/uploads/${rawUrl}`;
}

export default function ElectricianDashboardPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);
  const [proofAssignmentId, setProofAssignmentId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofNote, setProofNote] = useState("");
  const [proofMessage, setProofMessage] = useState("");
  const [proofError, setProofError] = useState("");
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      if (!token) {
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get("/work-assignments/me", withAuth(token));
        if (!cancelled) {
          setAssignments(response.data.data || []);
        }
      } catch {
        if (!cancelled) {
          setAssignments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const activeCount = useMemo(
    () => assignments.filter((assignment) => assignment.status === "pending" || assignment.status === "in_progress").length,
    [assignments]
  );

  const completedCount = useMemo(
    () => assignments.filter((assignment) => assignment.status === "completed").length,
    [assignments]
  );

  const refreshAssignments = async () => {
    try {
      const response = await apiClient.get("/work-assignments/me", withAuth(token));
      setAssignments(response.data.data || []);
    } catch {
      setAssignments([]);
    }
  };

  const updateAssignmentStatus = async (assignmentId, action, rejectionReason = null) => {
    setMessage("");
    setError("");
    setUpdatingAssignmentId(assignmentId);

    try {
      if (action === "accept") {
        await apiClient.patch(`/work-assignments/${assignmentId}/accept`, {}, withAuth(token));
      } else {
        await apiClient.patch(`/work-assignments/${assignmentId}/reject`, { rejectionReason }, withAuth(token));
      }

      setMessage(action === "accept" ? "Assignment accepted." : "Assignment rejected.");
      await refreshAssignments();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to update assignment status.");
    } finally {
      setUpdatingAssignmentId(null);
    }
  };

  const submitProof = async (assignmentId) => {
    setProofMessage("");
    setProofError("");

    if (!proofFile) {
      setProofError("Choose a proof file first.");
      return;
    }

    setProofSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("proofs", proofFile);
      if (proofNote.trim()) {
        formData.append("note", proofNote.trim());
      }

      await apiClient.post(`/work-assignments/${assignmentId}/proof`, formData, withAuth(token));
      setProofMessage("Proof uploaded and work marked completed.");
      setProofFile(null);
      setProofNote("");
      setProofAssignmentId(null);
      await refreshAssignments();
    } catch (apiError) {
      setProofError(apiError.response?.data?.message || "Unable to submit proof.");
    } finally {
      setProofSubmitting(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading work assignments...</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => navigate(`/${user.role}/chat`)}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Chat
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-sm text-slate-500">Assigned Work</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">{assignments.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-sm text-slate-500">Active</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">{assignments.filter((assignment) => assignment.status === "pending").length}</p>
        </div>
      </div>

      <section className="glass-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-800">Assigned Work</h2>
        {previewAttachment ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{previewAttachment.fileName || "Attachment preview"}</p>
                  <p className="text-xs text-slate-500">{previewAttachment.mimeType || "File preview"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {previewAttachment.resolvedUrl ? (
                    <a
                      href={previewAttachment.resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open in new tab
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(null)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Back
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4 sm:p-6">
                {previewAttachment.resolvedUrl ? (
                  previewAttachment.mimeType?.startsWith("image/") ? (
                    <img
                      src={previewAttachment.resolvedUrl}
                      alt={previewAttachment.fileName || "Attachment preview"}
                      className="mx-auto max-h-[72vh] w-auto max-w-full rounded-xl bg-white shadow-sm"
                    />
                  ) : previewAttachment.mimeType === "application/pdf" || (previewAttachment.fileName || "").toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      title={previewAttachment.fileName || "Attachment preview"}
                      src={previewAttachment.resolvedUrl}
                      className="h-[72vh] w-full rounded-xl border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="flex min-h-[48vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-800">Preview not available for this file type.</p>
                        <p className="mt-1">Use Open in new tab to view or download the file.</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex min-h-[48vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                    Attachment link is unavailable.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
            <p className="text-sm text-slate-500">Work assigned to you by admin or sales</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Live Schedule
          </span>
        </div>

        {message ? <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="space-y-3">
          {assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-xl border border-slate-200 bg-white/90 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">#{assignment.id} — {assignment.serviceTitle}</p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{assignment.description || "No description provided."}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {assignment.location || "No location"} • {assignment.customerName || "Customer"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Priority: {statusLabel(assignment.priority)}
                  </p>
                  {parseAttachments(assignment.attachmentsJson).length > 0 ? (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Attachments:</p>
                      <div className="space-y-1">
                        {parseAttachments(assignment.attachmentsJson).map((att, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewAttachment({
                              fileName: att.fileName || att.name || `File ${idx + 1}`,
                              mimeType: att.mimeType || att.type || null,
                              resolvedUrl: resolveAttachmentUrl(att.url || att)
                            })}
                            className="block text-left text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                          >
                            📎 {att.fileName || att.name || `File ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(assignment.status)}`}>
                  {statusLabel(assignment.status)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/${user.role}/chat`, { state: { targetUserId: assignment.assignedById } })}
                  className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                >
                  Message Admin
                </button>

                {assignment.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={updatingAssignmentId === assignment.id}
                      onClick={() => updateAssignmentStatus(assignment.id, "accept")}
                      className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={updatingAssignmentId === assignment.id}
                      onClick={() => {
                        const reason = window.prompt("Optional rejection reason");
                        if (reason === null) {
                          return;
                        }
                        updateAssignmentStatus(assignment.id, "reject", reason || null);
                      }}
                      className="rounded-xl bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                ) : null}

                  {(assignment.status === "accepted" || assignment.status === "in_progress") ? (
                    <button
                      type="button"
                      onClick={() => setProofAssignmentId((current) => (String(current) === String(assignment.id) ? null : assignment.id))}
                      className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                    >
                      Complete with Proof
                    </button>
                  ) : null}
              </div>

                {String(proofAssignmentId) === String(assignment.id) ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                        Proof File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        />
                      </label>

                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                        Note
                        <textarea
                          value={proofNote}
                          onChange={(event) => setProofNote(event.target.value)}
                          rows={3}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
                          placeholder="Optional completion note for admin"
                        />
                      </label>
                    </div>

                    {proofError ? <p className="mt-2 text-sm text-rose-600">{proofError}</p> : null}
                    {proofMessage ? <p className="mt-2 text-sm text-emerald-600">{proofMessage}</p> : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={proofSubmitting}
                        onClick={() => submitProof(assignment.id)}
                        className="rounded-xl bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {proofSubmitting ? "Submitting..." : "Submit Proof & Complete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProofAssignmentId(null);
                          setProofFile(null);
                          setProofNote("");
                          setProofError("");
                        }}
                        className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
            </article>
          ))}

          {!assignments.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No assigned work found.
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
