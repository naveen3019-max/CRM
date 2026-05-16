import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardCard } from "../components/DashboardCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { API_ORIGIN } from "../services/runtimeConfig.js";

const statusFilters = ["all", "pending", "active", "completed", "cancelled"];

function formatStatusLabel(status) {
  if (status === "all") {
    return "All";
  }

  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status) {
  if (status === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "active") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getPriorityClasses(totalAmount) {
  if (Number(totalAmount || 0) >= 4000) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (Number(totalAmount || 0) >= 2500) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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

function getAttachmentName(attachment, index) {
  if (attachment && typeof attachment === "object") {
    return attachment.fileName || attachment.name || `File ${index + 1}`;
  }

  if (typeof attachment === "string") {
    const parts = attachment.split("/");
    return parts[parts.length - 1] || `File ${index + 1}`;
  }

  return `File ${index + 1}`;
}

function formatDateSafe(value) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleDateString();
}

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [proofFilesByAssignment, setProofFilesByAssignment] = useState({});
  const [proofNoteByAssignment, setProofNoteByAssignment] = useState({});
  const [proofUploadingAssignmentId, setProofUploadingAssignmentId] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const visibleOrders = useMemo(() => {
    if (activeFilter === "all") {
      return projects;
    }

    return projects.filter((project) => project.status === activeFilter);
  }, [activeFilter, projects]);

  useEffect(() => {
    let isMounted = true;

    async function checkVendorStatus() {
      try {
        const res = await apiClient.get("/company/status", withAuth(token));
        if (!isMounted) {
          return;
        }

        if (res.data.success && res.data.data.status !== "approved") {
          navigate("/onboarding");
        }
      } catch (err) {
        console.error("Failed to check vendor status", err);
      } finally {
        if (isMounted) {
          setIsCheckingStatus(false);
        }
      }
    }

    if (token) {
      checkVendorStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  const loadData = useCallback(async (silent = false) => {
    if (!token) {
      return;
    }

    if (!silent) {
      setIsLoadingData(true);
      setLoadError("");
    }

    try {
      const [projectsResponse, tasksResponse, assignmentsResponse] = await Promise.all([
        apiClient.get("/projects", withAuth(token)),
        apiClient.get("/tasks", withAuth(token)),
        apiClient.get("/work-assignments/me", withAuth(token))
      ]);

      setProjects(projectsResponse.data.data || []);
      setTasks(tasksResponse.data.data || []);
      setAssignments(assignmentsResponse.data.data || []);
      setLoadError("");
    } catch (error) {
      setProjects([]);
      setTasks([]);
      setAssignments([]);
      setLoadError(error?.response?.data?.message || "Unable to load vendor dashboard data.");
    } finally {
      if (!silent) {
        setIsLoadingData(false);
      }
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completionRate = projects.length
    ? `${Math.round((projects.filter((project) => project.status === "completed").length / projects.length) * 100)}%`
    : "0%";

  const refreshAssignments = async () => {
    try {
      const response = await apiClient.get("/work-assignments/me", withAuth(token));
      setAssignments(response.data.data || []);
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
        await apiClient.patch(`/work-assignments/${assignmentId}/reject`, { rejectionReason }, withAuth(token));
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

  const handleProofSelection = (assignmentId, fileList) => {
    const nextFiles = Array.from(fileList || []);
    setProofFilesByAssignment((previous) => ({
      ...previous,
      [assignmentId]: nextFiles
    }));
  };

  const handleProofNoteChange = (assignmentId, note) => {
    setProofNoteByAssignment((previous) => ({
      ...previous,
      [assignmentId]: note
    }));
  };

  const completeAssignmentWithProof = async (assignmentId) => {
    const selectedFiles = proofFilesByAssignment[assignmentId] || [];
    if (!selectedFiles.length) {
      setAssignmentError("Please select at least one proof file before submitting.");
      return;
    }

    setAssignmentError("");
    setAssignmentMessage("");
    setProofUploadingAssignmentId(assignmentId);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("proofs", file);
      });

      const note = proofNoteByAssignment[assignmentId];
      if (note && String(note).trim()) {
        formData.append("note", String(note).trim());
      }

      await apiClient.post(`/work-assignments/${assignmentId}/proof`, formData, {
        ...withAuth(token),
        headers: {
          ...withAuth(token).headers,
          "Content-Type": "multipart/form-data"
        }
      });

      setAssignmentMessage("Completion proof submitted successfully.");
      setProofFilesByAssignment((previous) => ({ ...previous, [assignmentId]: [] }));
      setProofNoteByAssignment((previous) => ({ ...previous, [assignmentId]: "" }));
      await refreshAssignments();
      window.setTimeout(() => setAssignmentMessage(""), 3000);
    } catch (apiError) {
      setAssignmentError(apiError.response?.data?.message || "Unable to submit completion proof.");
    } finally {
      setProofUploadingAssignmentId(null);
    }
  };

  return (
    isCheckingStatus ? (
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center shadow-soft">
        <p className="text-sm font-medium text-slate-500">Checking vendor verification status...</p>
      </section>
    ) : (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Open Orders" value={projects.length} helper="Vendor-linked project orders" />
        <DashboardCard
          title="Pending Dispatch"
          value={projects.filter((project) => project.status === "pending").length}
          helper="Requires immediate action"
        />
        <DashboardCard
          title="Active Orders"
          value={projects.filter((project) => project.status === "active").length}
          helper="Currently in execution"
        />
        <DashboardCard title="Completion Rate" value={completionRate} helper="Completed order ratio" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <article className="glass-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-800">Order Operations</h2>
              <p className="text-sm text-slate-500">Track, prioritize, and dispatch assigned orders.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {visibleOrders.length} visible
            </span>
          </div>

          {loadError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {loadError}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {statusFilters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {formatStatusLabel(filter)}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            {isLoadingData ? (
              [1, 2, 3].map((index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft animate-pulse">
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-40 rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-56 rounded bg-slate-100" />
                </div>
              ))
            ) : visibleOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Order #{order.id}</p>
                    <p className="mt-1 text-sm text-slate-600">Project order for {order.customerName}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getPriorityClasses(order.totalAmount)}`}
                  >
                    {Number(order.totalAmount || 0) >= 4000
                      ? "High"
                      : Number(order.totalAmount || 0) >= 2500
                        ? "Medium"
                        : "Low"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-slate-600">Customer:</span> {order.customerName}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">Amount:</span> ${Number(order.totalAmount || 0).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">Created:</span> {formatDateSafe(order.createdAt)}
                  </p>
                </div>

                <div className="mt-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                    {formatStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}

            {!isLoadingData && !visibleOrders.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No orders in this status.
              </div>
            ) : null}
          </div>
        </article>

        <div className="space-y-4">
          <article className="glass-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold text-slate-800">Dispatch Summary</h3>
              <button
                type="button"
                onClick={() => navigate("/vendor/chat")}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Open Chat
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Assigned Tasks</span>
                <span className="font-semibold text-slate-800">{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Work Assignments</span>
                <span className="font-semibold text-slate-800">{assignments.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Pending Assignments</span>
                <span className="font-semibold text-slate-800">
                  {assignments.filter((assignment) => assignment.status === "pending").length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Pending Tasks</span>
                <span className="font-semibold text-slate-800">
                  {tasks.filter((task) => task.status === "pending").length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <span>Completed Tasks</span>
                <span className="font-semibold text-emerald-700">
                  {tasks.filter((task) => task.status === "completed").length}
                </span>
              </div>
            </div>
          </article>

          <article className="glass-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold text-slate-800">Assigned Work</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {assignments.length} total
              </span>
            </div>

            {assignmentMessage ? <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{assignmentMessage}</p> : null}
            {assignmentError ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{assignmentError}</p> : null}

            <div className="space-y-3">
              {assignments.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white/90 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">#{assignment.id} - {assignment.serviceTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">{assignment.location || "No location"}</p>
                      <p className="mt-1 text-xs text-slate-500">Priority: {formatStatusLabel(assignment.priority || "normal")}</p>
                      {parseAttachments(assignment.attachmentsJson).length > 0 ? (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-600 mb-1">Attachments:</p>
                          <div className="space-y-1">
                            {parseAttachments(assignment.attachmentsJson).map((att, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewAttachment({
                                  fileName: getAttachmentName(att, idx),
                                  mimeType: typeof att === "object" ? (att.mimeType || att.type || null) : null,
                                  resolvedUrl: resolveAttachmentUrl(att.url || att)
                                })}
                                className="block text-left text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                              >
                                Attachment: {getAttachmentName(att, idx)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(assignment.status)}`}>
                      {formatStatusLabel(assignment.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/${user.role}/chat`, { state: { targetUserId: assignment.assignedById } })}
                      disabled={!assignment.assignedById}
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
                  </div>

                  {["accepted", "in_progress"].includes(String(assignment.status)) ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Submit completion proof</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                        onChange={(event) => handleProofSelection(assignment.id, event.target.files)}
                      />
                      <input
                        type="text"
                        value={proofNoteByAssignment[assignment.id] || ""}
                        onChange={(event) => handleProofNoteChange(assignment.id, event.target.value)}
                        placeholder="Optional note"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                      />
                      <button
                        type="button"
                        disabled={proofUploadingAssignmentId === assignment.id}
                        onClick={() => completeAssignmentWithProof(assignment.id)}
                        className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {proofUploadingAssignmentId === assignment.id ? "Submitting..." : "Complete With Proof"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              {!assignments.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No assigned work found.
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </div>

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
    )
  );
}
