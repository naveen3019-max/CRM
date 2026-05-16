import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "../components/DashboardCard.jsx";
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

export default function FieldWorkDashboardPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [fieldTasks, setFieldTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofNote, setProofNote] = useState("");
  const [proofMessage, setProofMessage] = useState("");
  const [proofError, setProofError] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await apiClient.get("/tasks", withAuth(token));
        const allTasks = response.data.data || [];
        setFieldTasks(allTasks.filter((task) => task.roleType === "field_work"));
      } catch {
        setFieldTasks([]);
      }
    }

    async function loadRequests() {
      try {
        const resp = await apiClient.get("/service-requests", withAuth(token));
        const rows = resp.data.data || [];
        setRequests(rows);
        setSelectedRequestId(rows[0]?.id ? String(rows[0].id) : "");
      } catch {
        setRequests([]);
        setSelectedRequestId("");
      }
    }

    async function loadAssignments() {
      try {
        const resp = await apiClient.get("/work-assignments/me", withAuth(token));
        setAssignments(resp.data.data || []);
      } catch {
        setAssignments([]);
      }
    }

    loadTasks();
    loadRequests();
    loadAssignments();
  }, [token]);

  const etaRate = useMemo(() => {
    if (!fieldTasks.length) {
      return "0%";
    }

    const completed = fieldTasks.filter((task) => task.status === "completed").length;
    return `${Math.round((completed / fieldTasks.length) * 100)}%`;
  }, [fieldTasks]);

  const earnings = useMemo(() => {
    if (!requests.length) return 0;
    const completed = requests.filter((r) => r.status === "completed" && r.budget).reduce((s, r) => s + Number(r.budget || 0), 0);
    return completed;
  }, [requests]);

  const selectedRequest = useMemo(() => requests.find((r) => String(r.id) === String(selectedRequestId)) || null, [requests, selectedRequestId]);

  const refreshAssignments = async () => {
    try {
      const resp = await apiClient.get("/work-assignments/me", withAuth(token));
      setAssignments(resp.data.data || []);
    } catch {
      setAssignments([]);
    }
  };

  const updateAssignmentStatus = async (assignmentId, action, rejectionReason = null) => {
    setAssignmentMessage("");
    setAssignmentError("");
    setUpdatingAssignmentId(assignmentId);

    try {
      if (action === "accept") {
        await apiClient.patch(`/work-assignments/${assignmentId}/accept`, {}, withAuth(token));
      } else {
        await apiClient.patch(
          `/work-assignments/${assignmentId}/reject`,
          { rejectionReason },
          withAuth(token)
        );
      }

      setAssignmentMessage(action === "accept" ? "Assignment accepted." : "Assignment rejected.");
      await refreshAssignments();
      window.setTimeout(() => setAssignmentMessage(""), 3000);
    } catch (apiError) {
      setAssignmentError(apiError.response?.data?.message || "Unable to update assignment status.");
    } finally {
      setUpdatingAssignmentId(null);
    }
  };

  const handleUploadProof = async (event) => {
    event.preventDefault();
    setProofMessage("");
    setProofError("");

    if (!selectedRequestId || !proofFile) {
      setProofError("Select a request and file first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("proofs", proofFile);
      if (proofNote.trim()) {
        formData.append("note", proofNote.trim());
      }

      await apiClient.post(`/service-requests/${selectedRequestId}/proof`, formData, withAuth(token));
      setProofFile(null);
      setProofNote("");
      setProofMessage("Proof uploaded successfully.");
      // Refresh list
      const resp = await apiClient.get("/service-requests", withAuth(token));
      setRequests(resp.data.data || []);
    } catch (apiError) {
      setProofError(apiError.response?.data?.message || "Proof upload failed.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={() => {
            navigate(`/${user.role}/chat`);
          }}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
        >
          Open Chat
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Assigned Tasks" value={fieldTasks.length} helper="Active field assignments" />
        <DashboardCard
          title="In Progress"
          value={fieldTasks.filter((task) => task.status === "in_progress").length}
          helper="Ongoing site work"
        />
        <DashboardCard
          title="Completed"
          value={fieldTasks.filter((task) => task.status === "completed").length}
          helper="Finished checks"
        />
        <DashboardCard title="Completion Rate" value={etaRate} helper="On-schedule completion" />
      </div>

      <section className="glass-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-800">
              {selectedRequest ? `${selectedRequest.serviceCategory} Requests` : "Field Work Queue"}
            </h2>
            <p className="text-sm text-slate-500">
              {selectedRequest ? `Selected: ${selectedRequest.serviceCategory}` : "Track your inspections and on-site milestones."}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Live Schedule
          </span>
        </div>

        <div className="space-y-3">
          {fieldTasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Task #{task.id}</p>
                  <p className="text-sm text-slate-600">{task.title}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(task.status)}`}>
                  {statusLabel(task.status)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-600">Assignee:</span> {task.assigneeName}
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Due:</span>{" "}
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </article>
            
          ))}

          {!fieldTasks.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No field work tasks found.
            </div>
          ) : null}
        </div>
      </section>
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

      <section className="grid gap-6 md:grid-cols-2">
        <article className="glass-panel p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-800">Work Assignments</h2>
            <p className="text-sm text-slate-500">Accept or decline coordination tasks</p>
          </div>

          {assignmentMessage ? <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{assignmentMessage}</p> : null}
          {assignmentError ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{assignmentError}</p> : null}

          <div className="space-y-3">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <div className="flex items-start justify-between gap-2">
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
                    onClick={() => navigate(`/${user.role}/chat`)}
                    className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Open Chat
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
                </div>
              </article>
            ))}

            {!assignments.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No active work assignments.
              </div>
            ) : null}
          </div>
        </article>

        <article className="glass-panel p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-800">Assigned Service Requests</h2>
            <p className="text-sm text-slate-500">Requests assigned to you</p>
          </div>

          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">#{r.id} — {r.serviceCategory}</p>
                    <p className="text-sm text-slate-600">{String(r.problemDescription || "").slice(0, 120)}</p>
                    <p className="mt-1 text-xs text-slate-500">Customer: {r.customerName || r.customerEmail}</p>
                    {parseAttachments(r.attachmentsJson).length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-1">Attachments:</p>
                        <div className="space-y-1">
                          {parseAttachments(r.attachmentsJson).map((att, idx) => (
                            <a
                              key={idx}
                              href={resolveAttachmentUrl(att.url || att)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                            >
                              📎 {att.fileName || att.name || `File ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/${user.role}/chat`, { state: { targetUserId: r.customerId } })}
                        className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestId(String(r.id));
                          setSelectedServiceName(r.serviceCategory || "");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="rounded-xl bg-brand-600 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!requests.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No assigned service requests.
              </div>
            ) : null}
          </div>
        </article>

        <article className="glass-panel p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold text-slate-800">Quick Actions & Summary</h2>
          <p className="text-sm text-slate-500">Earnings and proof upload for selected request</p>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-500">Earnings (completed requests)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">₹{earnings}</p>
            </div>

            <form onSubmit={handleUploadProof} className="space-y-3">
              <label className="block text-sm font-semibold text-slate-600">
                Select Request
                <select
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
                >
                  <option value="">-- choose request --</option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} - {r.serviceCategory}
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
                  onChange={(e) => setProofNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-brand-300 focus:ring"
                  placeholder="Optional note for the customer"
                />
              </label>

              {proofError ? <p className="text-sm text-red-500">{proofError}</p> : null}
              {proofMessage ? <p className="text-sm text-emerald-600">{proofMessage}</p> : null}

              <div className="flex items-center gap-3">
                <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  Upload Proof
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRequest) {
                      navigate(`/service-requests/${selectedRequest.id}`);
                    }
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  View Request
                </button>
              </div>
            </form>
          </div>
        </article>
      </section>
    </section>
  );
}
