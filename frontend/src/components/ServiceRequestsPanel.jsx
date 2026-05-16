import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { API_ORIGIN } from "../services/runtimeConfig.js";

function parseJsonValue(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function getWorkerLabel(worker) {
  const specialty = worker.serviceCategory || worker.workType || worker.role;
  const specialtyLabel = specialty ? String(specialty).replace(/_/g, " ") : "worker";
  return `${worker.name} (${specialtyLabel})`;
}

function resolveAttachmentUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  const value = String(rawUrl).trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value.replace(/^\/+/, "")}`;
}

function workerMatchesRequest(request, worker) {
  const requestCategory = normalizeText(request.serviceCategory);
  if (!requestCategory) {
    return true;
  }

  const workerValues = [worker.serviceCategory, worker.workType, worker.role].map(normalizeText);
  const aliases = new Set([requestCategory]);

  if (requestCategory.includes("electric")) {
    aliases.add("electrician");
    aliases.add("electrical");
  }

  if (requestCategory.includes("plumb")) {
    aliases.add("plumber");
  }

  if (requestCategory.includes("internet")) {
    aliases.add("internetinstallation");
    aliases.add("internet_installation");
  }

  if (requestCategory.includes("cctv")) {
    aliases.add("cctvtechnician");
    aliases.add("cctv_technician");
  }

  if (requestCategory.includes("ac")) {
    aliases.add("acservice");
    aliases.add("ac_service");
  }

  if (requestCategory.includes("carpent")) {
    aliases.add("carpenter");
  }

  if (requestCategory.includes("paint")) {
    aliases.add("painter");
  }

  return workerValues.some((value) => aliases.has(value) || [...aliases].some((alias) => value.includes(alias) || alias.includes(value)));
}

function statusBadge(status) {
  const map = {
    submitted: "bg-blue-100 text-blue-700",
    in_review: "bg-amber-100 text-amber-700",
    assigned: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-violet-100 text-violet-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700"
  };

  return map[status] || "bg-slate-100 text-slate-700";
}

export default function ServiceRequestsPanel({ compact = false }) {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerByRequestId, setSelectedWorkerByRequestId] = useState({});
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const canEdit = user?.role === "admin" || user?.role === "sales";
  const canAssign = user?.role === "admin";

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!token) return;
      setLoading(true);

      try {
        const requestsResponse = await apiClient.get("/service-requests", withAuth(token));
        if (!cancelled) {
          const rows = requestsResponse.data?.data || [];
          setRequests(rows);
          setSelectedWorkerByRequestId(
            rows.reduce((accumulator, request) => {
              if (request.assignedWorkerId) {
                accumulator[request.id] = String(request.assignedWorkerId);
              }
              return accumulator;
            }, {})
          );
        }

        if ((user?.role === "admin" || user?.role === "sales") && !cancelled) {
          const workerResponse = await apiClient.get("/service-requests/workers", withAuth(token));
          setWorkers(workerResponse.data?.data || []);
        }
      } catch {
        if (!cancelled) {
          setRequests([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  const visibleRequests = useMemo(() => {
    const queue = requests.filter((request) => request.status !== "assigned" && request.status !== "cancelled");
    return compact ? queue.slice(0, 4) : queue;
  }, [compact, requests]);

  const workersByRequestId = useMemo(() => {
    const mapping = {};

    for (const request of visibleRequests) {
      const matchingWorkers = workers.filter((worker) => workerMatchesRequest(request, worker));
      mapping[request.id] = matchingWorkers.length ? matchingWorkers : workers;
    }

    return mapping;
  }, [visibleRequests, workers]);

  const attachmentsByRequestId = useMemo(() => {
    const mapping = {};

    for (const request of visibleRequests) {
      const parsed = parseJsonValue(request.attachmentsJson, []);
      mapping[request.id] = Array.isArray(parsed) ? parsed : [];
    }

    return mapping;
  }, [visibleRequests]);

  async function patchRequest(id, patch) {
    setSavingId(id);
    try {
      const response = await apiClient.patch(`/service-requests/${id}`, patch, withAuth(token));
      const updated = response.data?.data;
      setRequests((prev) => prev.map((request) => (request.id === id ? updated : request)));
      setSelectedWorkerByRequestId((prev) => ({
        ...prev,
        [id]: updated?.assignedWorkerId ? String(updated.assignedWorkerId) : ""
      }));
      return updated;
    } catch {
      // Keep UI stable; next poll/manual refresh can recover.
    } finally {
      setSavingId(null);
    }
  }

  async function handleAssignWork(request) {
    const workerId = selectedWorkerByRequestId[request.id];
    if (!workerId) {
      window.alert("Choose a worker first.");
      return;
    }

    await patchRequest(request.id, {
      status: "assigned",
      assignedWorkerId: Number(workerId)
    });
  }

  async function handleCancelRequest(request) {
    const reason = window.prompt("Enter a cancellation reason");
    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      window.alert("Cancellation reason is required.");
      return;
    }

    await patchRequest(request.id, {
      status: "cancelled",
      cancelReason: trimmedReason
    });
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">{t("app.loadingWorkspace")}</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800 sm:text-lg">{t("serviceRequest.title")}</h3>
      </div>

      {!visibleRequests.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
          {t("serviceRequest.noRequests", "No service requests yet.")}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map((request) => (
            <article key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold text-slate-800">#{request.id} {request.serviceCategory}</p>
                  <p className="mt-1 break-words text-xs text-slate-600">{request.customerName} • {request.city} • {request.areaPincode}</p>
                  <p className="mt-2 break-words text-sm text-slate-700 line-clamp-2">{request.problemDescription}</p>
                  <p className="mt-2 break-words text-xs text-slate-500">{t("serviceRequest.budget", "Budget")}: {request.budget || t("serviceRequest.notSpecified", "Not specified")} • {t("serviceRequest.urgency", "Urgency")}: {request.urgency}</p>
                </div>

                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(request.status)}`}>
                  {request.status.replace("_", " ")}
                </span>
              </div>

              {request.status === "cancelled" && request.cancelReason ? (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  Cancellation reason: {request.cancelReason}
                </p>
              ) : null}

              {request.status === "assigned" && request.assignedWorkerName ? (
                <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  Assigned to {request.assignedWorkerName}
                </p>
              ) : null}

              {attachmentsByRequestId[request.id]?.length ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
                  <div className="mt-2 space-y-2">
                    {attachmentsByRequestId[request.id].map((attachment, index) => {
                      const resolvedUrl = resolveAttachmentUrl(attachment.url || attachment.fileUrl || attachment.path);
                      return (
                        <button
                          key={`${request.id}-attachment-${index}`}
                          type="button"
                          onClick={() => setPreviewAttachment({ ...attachment, resolvedUrl })}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
                        >
                          <span className="min-w-0 truncate font-medium">{attachment.fileName || `Attachment ${index + 1}`}</span>
                          <span className="shrink-0 text-slate-500">View</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {canEdit ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <select
                    className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                    value={request.status}
                    onChange={(event) => patchRequest(request.id, { status: event.target.value })}
                    disabled={savingId === request.id}
                  >
                    <option value="submitted">{t("serviceRequest.submitted", "Submitted")}</option>
                    <option value="in_review">{t("serviceRequest.inReview", "In Review")}</option>
                    <option value="assigned" disabled>{t("serviceRequest.assigned", "Assigned")}</option>
                    <option value="in_progress">{t("serviceRequest.inProgress", "In Progress")}</option>
                    <option value="completed">{t("serviceRequest.completed", "Completed")}</option>
                    <option value="cancelled" disabled>{t("serviceRequest.cancelled", "Cancelled")}</option>
                  </select>

                  {canAssign ? (
                    <div className="flex min-w-0 flex-col gap-2">
                      <select
                        className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                        value={selectedWorkerByRequestId[request.id] || request.assignedWorkerId || ""}
                        onChange={(event) => {
                          const workerId = event.target.value;
                          setSelectedWorkerByRequestId((prev) => ({
                            ...prev,
                            [request.id]: workerId
                          }));
                        }}
                        disabled={savingId === request.id}
                      >
                        <option value="">{t("serviceRequest.assignWorker", "Assign Worker")}</option>
                        {workersByRequestId[request.id]?.map((worker) => (
                          <option key={worker.id} value={worker.id}>{getWorkerLabel(worker)}</option>
                        ))}
                      </select>
                      {!workers.length ? (
                        <p className="text-xs text-rose-600">
                          No workers found. Create or activate a vendor, electrician, field work, or service professional account first.
                        </p>
                      ) : !workersByRequestId[request.id]?.length ? (
                        <p className="text-xs text-amber-700">
                          No exact specialty match found. Showing all workers instead.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleAssignWork(request)}
                        disabled={savingId === request.id || !selectedWorkerByRequestId[request.id]}
                        className="h-10 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Assign Work
                      </button>
                    </div>
                  ) : (
                    <div className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-500 flex items-center break-words">
                      {request.assignedWorkerName ? `${t("serviceRequest.assigned", "Assigned")}: ${request.assignedWorkerName}` : t("serviceRequest.workerAssignmentByAdmin", "Worker assignment by admin")}
                    </div>
                  )}

                  <div className="flex min-w-0 flex-col gap-2">
                    {user?.role === "admin" ? (
                      <button
                        type="button"
                        onClick={() => navigate("/admin/chat", { state: { scope: "admin_customer", targetUserId: request.customerId } })}
                        className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white"
                      >
                        {t("serviceRequest.openChat", "Open Chat")}
                      </button>
                    ) : (
                      <div className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-500 flex items-center justify-center">
                        {t("serviceRequest.chatViaAdmin", "Chat via admin channel")}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCancelRequest(request)}
                      disabled={savingId === request.id}
                      className="h-10 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel Request
                    </button>
                  </div>

                  <div className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-500 flex items-center break-words">
                    {request.cancelReason ? `Reason: ${request.cancelReason}` : request.assignedWorkerName ? `Worker: ${request.assignedWorkerName}` : ""}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

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
    </section>
  );
}
