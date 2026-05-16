import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  MapPin,
  Mic,
  Paperclip,
  Plus,
  Pin,
  Search,
  Send,
  Users,
  Square,
  X
} from "lucide-react";
import {
  resolveMessageImageUrl,
  isAudioUrl,
  formatRoleLabel,
  formatTime,
  formatContactTimestamp,
  classifyMessage,
  parseLocationText,
  parseLocationPayload,
  parseScheduleText,
  parseRequirementItems,
  parseAssignmentMessage,
  parseServiceRequestMessage,
  summarizeMessage,
  getMessageDisplayText
} from "./chatMessageUtils.js";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../services/apiClient.js";
import { MessagePinMenu } from "./MessagePinMenu.jsx";
import { PinnedMessagesPanel } from "./PinnedMessagesPanel.jsx";

function StatusTick({ status }) {
  if (status === "seen") {
    return <CheckCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />;
  }

  if (status === "delivered") {
    return <CheckCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
  }

  return <Check className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
}

function MessageCard({ message, currentUserId, onPinMessage, onUnpinMessage, isHighlighted = false, pinnedOverride = null }) {
  const { t } = useTranslation();
  const messageType = classifyMessage(message);
  const isMine = Boolean(message.isMine || Number(message.senderId) === Number(currentUserId));
  const isPinnedMessage = pinnedOverride !== null ? Boolean(pinnedOverride) : Number(message.pinned) === 1;
  const displayBody = getMessageDisplayText(message);
  const parsedLocation = messageType === "location" ? parseLocationPayload(displayBody) : null;
  const parsedAssignment = messageType === "assignment" ? parseAssignmentMessage(displayBody) : null;
  const parsedServiceRequest = messageType === "service_request" ? parseServiceRequestMessage(displayBody) : null;
  const [imageUnavailable, setImageUnavailable] = useState(false);

  if (messageType === "system") {
    return (
      <div className="my-4 flex justify-center">
        <p className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
          {String(displayBody || t("chat.systemUpdate", "System update")).replace(/^system:/i, "").trim()}
        </p>
      </div>
    );
  }

  const shellClass = isMine
    ? "border border-blue-600 bg-blue-600 text-white"
    : "border border-gray-200 bg-gray-200 text-gray-900";

  const wrapperClass = isMine ? "justify-end" : "justify-start";
  const metaClass = isMine ? "justify-end text-slate-400" : "justify-start text-slate-500";
  const timestamp = formatTime(message.createdAt);
  const status = message.isRead ? "seen" : "delivered";
  const audioSource =
    message.audioDataUrl ||
    message.audioUrl ||
    (isAudioUrl(message.imageUrl) ? resolveMessageImageUrl(message.imageUrl) : "");

  return (
    <div className={`group mb-3 flex ${wrapperClass} animate-[fadeUp_220ms_ease-out]`}>
      <div className="max-w-[90%] min-w-[140px] sm:max-w-[72%] sm:min-w-[160px]">
        <article
          style={{ fontFamily: 'Noto Sans, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', wordBreak: 'break-word' }}
          className={`relative overflow-visible rounded-2xl px-3 py-2.5 shadow-sm transition group-hover:shadow-md ${
            isHighlighted ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-slate-50" : ""
          } ${shellClass}`}
        >
          {isPinnedMessage ? (
            <div
              className={`absolute left-3 top-2 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
                isMine ? "border-white/30 bg-white/20 text-white" : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              <Pin className="h-3 w-3" aria-hidden="true" />
              <span>{t("chat.pinned")}</span>
            </div>
          ) : null}

          {onPinMessage || onUnpinMessage ? (
            <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <MessagePinMenu
                isPinned={Boolean(message.pinned)}
                onPin={() => onPinMessage?.(message)}
                onUnpin={() => onUnpinMessage?.(message)}
              />
            </div>
          ) : null}

          {messageType === "location" ? (
            <div className="space-y-2">
              <a
                href={parsedLocation?.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="group/map block overflow-hidden rounded-xl border border-black/10"
              >
                <div className={`relative h-32 overflow-hidden ${isMine ? "bg-blue-500/20" : "bg-slate-200"}`}>
                  <div className="absolute inset-x-0 top-8 border-t border-white/45" />
                  <div className="absolute inset-x-0 top-16 border-t border-white/45" />
                  <div className="absolute inset-x-0 top-24 border-t border-white/45" />
                  <div className="absolute bottom-0 left-1/3 top-0 border-l border-white/45" />
                  <div className="absolute bottom-0 left-2/3 top-0 border-l border-white/45" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${isMine ? "bg-white/25 text-white" : "bg-white text-slate-700"}`}>
                      {parsedLocation?.hasCoordinates
                        ? `${parsedLocation.latitude.toFixed(5)}, ${parsedLocation.longitude.toFixed(5)}`
                        : t("chat.openLocationInMap", "Open location in map")}
                    </div>
                  </div>

                  <div className="absolute bottom-2 right-2 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-white opacity-90 transition group-hover/map:bg-black/30">
                    {t("chat.tapToOpen", "Tap to open")}
                  </div>
                </div>
              </a>
              <div className="flex items-start gap-2">
                <MapPin className={`mt-0.5 h-4 w-4 ${isMine ? "text-blue-100" : "text-slate-500"}`} />
                <div className="min-w-0">
                  <p className={`text-sm ${isMine ? "text-white" : "text-slate-700"}`}>{parsedLocation?.label || parseLocationText(displayBody)}</p>
                  {parsedLocation?.hasCoordinates ? (
                    <p className={`mt-0.5 text-[11px] ${isMine ? "text-blue-100" : "text-slate-500"}`}>
                      {parsedLocation.latitude.toFixed(5)}, {parsedLocation.longitude.toFixed(5)}
                    </p>
                  ) : null}
                </div>
              </div>
              <a
                href={parsedLocation?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parseLocationText(displayBody))}`}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  isMine ? "bg-white/20 text-white hover:bg-white/30" : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {t("chat.openInMaps", "Open in Maps")}
              </a>
            </div>
          ) : null}

          {messageType === "schedule" ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Visit Scheduled</p>
              <p className="mt-1 text-sm font-semibold">{parseScheduleText(displayBody)}</p>
            </div>
          ) : null}

          {messageType === "requirement" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Requirement Summary</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {parseRequirementItems(displayBody).map((item) => (
                  <li key={`${message.id}-${item.slice(0, 20)}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {messageType === "assignment" && parsedAssignment ? (
            <div className={`overflow-hidden rounded-2xl border ${isMine ? "border-white/20 bg-white/10" : "border-slate-200 bg-white"}`}>
              <div className={`flex items-center justify-between border-b px-3 py-2 ${isMine ? "border-white/10" : "border-slate-200"}`}>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isMine ? "text-blue-100" : "text-slate-500"}`}>
                    {parsedAssignment.kind === "status" ? "Status Update" : "Work Assignment"}
                  </p>
                  <p className={`mt-0.5 text-sm font-semibold ${isMine ? "text-white" : "text-slate-900"}`}>
                    {parsedAssignment.service || "Assignment details"}
                  </p>
                </div>
                <ClipboardList className={`h-5 w-5 ${isMine ? "text-blue-100" : "text-slate-500"}`} aria-hidden="true" />
              </div>

              <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                {parsedAssignment.customer ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Customer</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedAssignment.customer}</p>
                  </div>
                ) : null}

                {parsedAssignment.location ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Location</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedAssignment.location}</p>
                  </div>
                ) : null}

                {parsedAssignment.schedule ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Preferred Schedule</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedAssignment.schedule}</p>
                  </div>
                ) : null}

                {parsedAssignment.priority ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Priority</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedAssignment.priority}</p>
                  </div>
                ) : null}
              </div>

              {parsedAssignment.details ? (
                <div className={`px-3 pb-3 ${isMine ? "text-blue-50" : "text-slate-700"}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-current opacity-70">Details</p>
                  <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words">{parsedAssignment.details}</p>
                </div>
              ) : null}

              {parsedAssignment.instructions ? (
                <div className={`border-t px-3 py-2 text-xs ${isMine ? "border-white/10 text-blue-50" : "border-slate-200 text-slate-600"}`}>
                  {parsedAssignment.instructions}
                </div>
              ) : null}

              {parsedAssignment.action ? (
                <div className={`border-t px-3 py-2 text-xs font-medium ${isMine ? "border-white/10 text-blue-50/90" : "border-slate-200 text-slate-500"}`}>
                  {parsedAssignment.action}
                </div>
              ) : null}
            </div>
          ) : null}

          {messageType === "service_request" && parsedServiceRequest ? (
            <div className={`overflow-hidden rounded-2xl border ${isMine ? "border-white/20 bg-white/10" : "border-slate-200 bg-white"}`}>
              <div className={`flex items-center justify-between border-b px-3 py-2 ${isMine ? "border-white/10" : "border-slate-200"}`}>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isMine ? "text-blue-100" : "text-slate-500"}`}>
                    New Service Request
                  </p>
                  <p className={`mt-0.5 text-sm font-semibold ${isMine ? "text-white" : "text-slate-900"}`}>
                    {parsedServiceRequest.service || "Request details"}
                  </p>
                </div>
                <ClipboardList className={`h-5 w-5 ${isMine ? "text-blue-100" : "text-slate-500"}`} aria-hidden="true" />
              </div>

              <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                {parsedServiceRequest.requestId ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Request ID</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedServiceRequest.requestId}</p>
                  </div>
                ) : null}

                {parsedServiceRequest.customer ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Customer</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedServiceRequest.customer}</p>
                  </div>
                ) : null}

                {parsedServiceRequest.location ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Location</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedServiceRequest.location}</p>
                  </div>
                ) : null}

                {parsedServiceRequest.priority ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isMine ? "text-blue-100" : "text-slate-500"}`}>Priority</p>
                    <p className={`text-sm ${isMine ? "text-white" : "text-slate-800"}`}>{parsedServiceRequest.priority}</p>
                  </div>
                ) : null}
              </div>

              <div className={`px-3 pb-3 ${isMine ? "text-blue-50" : "text-slate-700"}`}>
                {parsedServiceRequest.problem ? (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-current opacity-70">Problem</p>
                    <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words">{parsedServiceRequest.problem}</p>
                  </div>
                ) : null}

                {parsedServiceRequest.expectedSolution ? (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-current opacity-70">Expected Solution</p>
                    <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words">{parsedServiceRequest.expectedSolution}</p>
                  </div>
                ) : null}

                {parsedServiceRequest.requirementDetails ? (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-current opacity-70">Requirement Details</p>
                    <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words">{parsedServiceRequest.requirementDetails}</p>
                  </div>
                ) : null}
              </div>

              <div className={`grid gap-2 border-t px-3 py-2 text-xs ${isMine ? "border-white/10 text-blue-50/90" : "border-slate-200 text-slate-500"}`}>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {parsedServiceRequest.schedule ? <span><strong>Schedule:</strong> {parsedServiceRequest.schedule}</span> : null}
                  {parsedServiceRequest.budget ? <span><strong>Budget:</strong> {parsedServiceRequest.budget}</span> : null}
                  {parsedServiceRequest.attachments ? <span><strong>Attachments:</strong> {parsedServiceRequest.attachments}</span> : null}
                </div>
                {parsedServiceRequest.action ? <div className="font-medium">{parsedServiceRequest.action}</div> : null}
              </div>
            </div>
          ) : null}

          {messageType === "image" ? (
            <button type="button" className="block w-full cursor-zoom-in p-1" title="Attachment preview">
              {imageUnavailable ? (
                <div className={`flex h-40 items-center justify-center rounded-xl text-sm font-medium ${isMine ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {t("chat.attachmentPreviewUnavailable")}
                </div>
              ) : (
                <img
                  src={message.imageDataUrl || resolveMessageImageUrl(message.imageUrl)}
                  alt="Message attachment"
                  className="max-h-64 w-full rounded-xl object-cover"
                  onError={() => setImageUnavailable(true)}
                />
              )}
            </button>
          ) : null}

          {messageType === "audio" ? (
            <div className="rounded-xl border border-black/10 bg-white/20 p-2">
              <p className={`mb-2 text-xs font-semibold ${isMine ? "text-blue-100" : "text-slate-700"}`}>{t("chat.voiceMessage")}</p>
              <audio controls preload="metadata" src={audioSource} className="w-full" />
              {/* captions only: do not show raw message body for audio unless explicitly flagged */}
              {((message.caption === true) || message.hasCaption) && displayBody ? (
                <p className={`mt-2 whitespace-pre-wrap break-words text-sm ${isMine ? "text-white" : "text-gray-900"}`}>
                  {displayBody}
                </p>
              ) : null}
              </div>
          ) : null}

          {messageType === "text" && displayBody ? (
            <p className={`whitespace-pre-wrap break-words text-sm ${isMine ? "text-white" : "text-gray-900"}`}>
              {displayBody}
            </p>
          ) : null}

        </article>

        <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${metaClass}`}>
          <span>{timestamp}</span>
          {isMine ? (
            <>
              <span>•</span>
              <StatusTick status={status} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RealtimeCRMChat({
  contacts,
  activeContactId,
  onSelectContact,
  roleTabs,
  activeRoleTab,
  onRoleTabChange,
  onOpenGroups,
  messages,
  currentUserId,
  onSend,
  onTypingChange,
  disabledComposer,
  isSending,
  isLoading,
  error,
  infoStrip,
  typingLabel,
  conversationId,
  pinnedRefreshKey = 0,
  onMessagePinStateChanged
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [showContactsOnMobile, setShowContactsOnMobile] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState(null);
  const [manualLocationValue, setManualLocationValue] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [pinnedStateByMessageId, setPinnedStateByMessageId] = useState({});
  const initializedMobileViewRef = useRef(false);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const selectedAttachmentRef = useRef(null);

  const activeContact = useMemo(
    () => contacts.find((contact) => String(contact.id) === String(activeContactId)) || null,
    [contacts, activeContactId]
  );

  const visibleContacts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const haystack = `${contact.name} ${contact.role} ${contact.lastMessagePreview || ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [contacts, searchTerm]);

  useEffect(() => {
    if (!bodyRef.current) {
      return;
    }

    bodyRef.current.scrollTo({
      top: bodyRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, typingLabel, activeContactId]);

  useEffect(() => {
    if (initializedMobileViewRef.current) {
      return;
    }

    initializedMobileViewRef.current = true;
    setShowContactsOnMobile(!activeContactId);
  }, [activeContactId]);

  useEffect(() => {
    if (!activeContact && !showContactsOnMobile) {
      setShowContactsOnMobile(true);
    }
  }, [activeContact, showContactsOnMobile]);

  useEffect(() => {
    selectedAttachmentRef.current = selectedAttachment;
  }, [selectedAttachment]);

  useEffect(() => {
    if (!conversationId) {
      setPinnedMessages([]);
      setPinnedStateByMessageId({});
      return;
    }

    let isDisposed = false;

    const loadPinnedMessages = async () => {
      try {
        const response = await apiClient.get(`/chat/pinned/${conversationId}`, {
          params: { _ts: Date.now() }
        });
        if (!isDisposed) {
          setPinnedMessages(response.data.data || []);
        }
      } catch {
        if (!isDisposed) {
          setPinnedMessages([]);
        }
      }
    };

    loadPinnedMessages();

    return () => {
      isDisposed = true;
    };
  }, [conversationId, pinnedRefreshKey]);

  useEffect(() => {
    if (!highlightedMessageId) {
      return;
    }

    const target = document.getElementById(`dm-message-${highlightedMessageId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timer = window.setTimeout(() => setHighlightedMessageId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [highlightedMessageId, messages]);

  useEffect(() => {
    return () => {
      if (selectedAttachmentRef.current?.revokePreview && selectedAttachmentRef.current.previewUrl) {
        URL.revokeObjectURL(selectedAttachmentRef.current.previewUrl);
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }

      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      }
    };
  }, []);

  const handleContactSelect = (contactId) => {
    onSelectContact(String(contactId));
    setShowContactsOnMobile(false);
  };

  const injectTemplate = (template) => {
    setInputValue((previous) => {
      const nextValue = previous.trim() ? `${previous} ${template}` : template;
      return nextValue;
    });
    setQuickActionsOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const clearSelectedAttachment = () => {
    setSelectedAttachment((previous) => {
      if (previous?.revokePreview && previous.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      return null;
    });
  };

  const setAttachmentFromFile = (file, previewUrl, revokePreview) => {
    setSelectedAttachment((previous) => {
      if (previous?.revokePreview && previous.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      return {
        file,
        name: file.name,
        kind: String(file.type || "").startsWith("audio/") ? "audio" : "image",
        previewUrl,
        revokePreview
      };
    });
    setAttachmentError("");
  };

  const handleSelectAttachment = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const isImage = String(file.type || "").startsWith("image/");
    const isAudio = String(file.type || "").startsWith("audio/");

    if (!isImage && !isAudio) {
      setAttachmentError("Only image and voice files are supported.");
      event.target.value = "";
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setAttachmentError("Attachment size must be 10 MB or less.");
      event.target.value = "";
      return;
    }

    if (isAudio) {
      const previewUrl = URL.createObjectURL(file);
      setAttachmentFromFile(file, previewUrl, true);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentFromFile(file, String(reader.result), false);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleStartRecording = async () => {
    if (disabledComposer || isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAttachmentError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedTypeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType =
        supportedTypeCandidates.find(
          (type) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type)
        ) || "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setAttachmentError(t("chat.unableToCaptureVoiceMessage"));
      };

      recorder.onstop = () => {
        setIsRecording(false);

        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];

        const streamInstance = recordingStreamRef.current;
        if (streamInstance) {
          streamInstance.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
        }

        mediaRecorderRef.current = null;

        if (!chunks.length) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const extension = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
        const file = new File([audioBlob], `voice-message-${Date.now()}.${extension}`, {
          type: audioBlob.type || "audio/webm"
        });
        const previewUrl = URL.createObjectURL(audioBlob);
        setAttachmentFromFile(file, previewUrl, true);
      };

      recorder.start();
      setIsRecording(true);
      setAttachmentError("");
    } catch {
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      }

      mediaRecorderRef.current = null;
      setIsRecording(false);
      setAttachmentError(t("chat.microphonePermissionRequired"));
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      return;
    }

    recorder.stop();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (disabledComposer || isRecording) {
      return;
    }

    const text = inputValue.trim();
    if (!text && !selectedAttachment) {
      return;
    }

    await Promise.resolve(
      onSend(
        text,
        selectedAttachment?.previewUrl || null,
        selectedAttachment?.file || null,
        selectedAttachment?.kind || "image"
      )
    );
    onTypingChange?.(false);
    setInputValue("");
    clearSelectedAttachment();
    setAttachmentError("");
  };

  const handleShareCurrentLocation = async () => {
    if (disabledComposer || isRecording || isSharingLocation) {
      return;
    }

    if (!navigator.geolocation) {
      setAttachmentError("Location is not supported in this browser. You can type location manually.");
      injectTemplate("location: ");
      return;
    }

    setIsSharingLocation(true);
    setAttachmentError("");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const latitude = Number(position.coords.latitude).toFixed(6);
      const longitude = Number(position.coords.longitude).toFixed(6);
      setLocationDraft({
        label: "Current location",
        latitude,
        longitude
      });
    } catch {
      setAttachmentError("Location permission denied or unavailable. You can type location manually.");
    } finally {
      setIsSharingLocation(false);
    }
  };

  const handleSendDraftLocation = async () => {
    if (!locationDraft || disabledComposer || isRecording || isSending) {
      return;
    }

    const locationMessage = `location: ${locationDraft.label} | coords:${locationDraft.latitude},${locationDraft.longitude}`;

    await Promise.resolve(onSend(locationMessage, null, null, "image"));
    onTypingChange?.(false);
    setInputValue("");
    setLocationPickerOpen(false);
    setQuickActionsOpen(false);
    setLocationDraft(null);
    setManualLocationValue("");
  };

  const refreshPinnedMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await apiClient.get(`/chat/pinned/${conversationId}`, {
        params: { _ts: Date.now() }
      });
      setPinnedMessages(response.data.data || []);
    } catch {
      setPinnedMessages([]);
    }
  };

  const handlePinMessage = async (message) => {
    if (!message?.id) return;

    try {
      await apiClient.post("/chat/pin-message", { messageId: Number(message.id) });
      const pinnedAt = new Date().toISOString();
      const pinnedMessage = {
        ...message,
        pinned: 1,
        pinnedAt
      };
      setPinnedStateByMessageId((previous) => ({ ...previous, [String(message.id)]: true }));
      setPinnedMessages((previous) =>
        previous.some((entry) => String(entry.id) === String(message.id))
          ? previous.map((entry) => (String(entry.id) === String(message.id) ? pinnedMessage : entry))
          : [pinnedMessage, ...previous]
      );
      await onMessagePinStateChanged?.(message.id, true);
      await refreshPinnedMessages();
    } catch (error) {
      console.error("pinMessage error:", error);
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      setAttachmentError(serverMessage ? `${serverMessage} (${status || "?"})` : `Could not pin message (${status || "?"})`);
    }
  };

  const handleUnpinMessage = async (message) => {
    if (!message?.id) return;

    try {
      await apiClient.post("/chat/unpin-message", { messageId: Number(message.id) });
      setPinnedStateByMessageId((previous) => ({ ...previous, [String(message.id)]: false }));
      setPinnedMessages((previous) => previous.filter((entry) => String(entry.id) !== String(message.id)));
      await onMessagePinStateChanged?.(message.id, false);
      await refreshPinnedMessages();
    } catch (error) {
      console.error("unpinMessage error:", error);
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      setAttachmentError(serverMessage ? `${serverMessage} (${status || "?"})` : `Could not unpin message (${status || "?"})`);
    }
  };

  const handleSendManualLocation = async () => {
    const manualLabel = manualLocationValue.trim();
    if (!manualLabel || disabledComposer || isRecording || isSending) {
      return;
    }

    await Promise.resolve(onSend(`location: ${manualLabel}`, null, null, "image"));
    onTypingChange?.(false);
    setInputValue("");
    setLocationPickerOpen(false);
    setQuickActionsOpen(false);
    setLocationDraft(null);
    setManualLocationValue("");
  };

  const toggleLocationPicker = () => {
    setLocationPickerOpen((previous) => {
      const next = !previous;
      if (!next) {
        setLocationDraft(null);
        setManualLocationValue("");
      }
      return next;
    });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[360px_1fr]">
      <aside
        className={`${showContactsOnMobile ? "flex" : "hidden"} h-full min-h-0 flex-col border-b border-r border-gray-200 bg-white xl:flex xl:border-b-0`}
      >
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Chats</p>
              <p className="text-xs text-slate-500">Your direct conversations</p>
            </div>

            {onOpenGroups ? (
              <button
                type="button"
                onClick={onOpenGroups}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
              >
                <Users className="h-3.5 w-3.5" />
                Groups
              </button>
            ) : null}
          </div>

          <div className="px-4 pb-4 pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search conversations"
                className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </div>
          </div>

          {roleTabs?.length ? (
            <div className="flex gap-2 overflow-x-auto border-t border-gray-100 px-4 py-3">
              {roleTabs.map((tab) => {
                const isActive = tab.value === activeRoleTab;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => onRoleTabChange?.(tab.value)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {visibleContacts.length ? (
            visibleContacts.map((contact) => {
              const isActive = String(contact.id) === String(activeContactId);
              const timestamp = formatContactTimestamp(contact.lastMessageAt || contact.createdAt);

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleContactSelect(contact.id)}
                  className={`w-full border-b border-gray-100 px-4 py-3 text-left transition ${
                    isActive ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                      {String(contact.name || "C").charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                          <span className="mt-0.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {formatRoleLabel(contact.role)}
                          </span>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[11px] text-slate-400">{timestamp}</span>
                          {contact.unreadCount ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {contact.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500">{contact.lastMessagePreview || "No messages yet"}</p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-500">No contacts match this filter.</div>
          )}
        </div>
      </aside>

      <section
        className={`${showContactsOnMobile ? "hidden" : "flex"} h-full min-h-0 flex-col bg-gray-50 xl:flex`}
      >
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <header className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setShowContactsOnMobile(true)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 xl:hidden"
                aria-label="Show contacts"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {activeContact ? String(activeContact.name).charAt(0).toUpperCase() : "-"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {activeContact ? activeContact.name : "Select a contact"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {activeContact
                    ? (() => {
                        const now = Date.now();
                        const lastMsg = messages && messages.length ? messages[messages.length - 1] : null;
                        const lastTs = lastMsg && lastMsg.createdAt ? new Date(lastMsg.createdAt).valueOf() : 0;
                        const recentThreshold = 2 * 60 * 1000; // 2 minutes

                        const isActiveNow = Boolean(typingLabel) || (lastTs && now - lastTs <= recentThreshold && !lastMsg?.isMine);

                        return isActiveNow ? "Active now" : activeContact.statusText || "Last seen recently";
                      })()
                    : "No active conversation"}
                </p>
              </div>
            </div>

            {activeContact ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {formatRoleLabel(activeContact.role)}
              </span>
            ) : null}
          </header>

          <div className="border-t border-gray-100 bg-slate-50 px-5 py-2 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setPinnedPanelOpen(true)}
              className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate font-semibold text-blue-700">View pinned messages</span>
              </span>
              <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                {pinnedMessages.length}
              </span>
            </button>
          </div>
        </div>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-6">
          {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}

          {!messages.length && isLoading ? (
            <p className="text-sm text-slate-500">Loading messages...</p>
          ) : null}

          {!messages.length && !isLoading ? (
            <div className="pt-10 text-center text-sm text-slate-500">Start the conversation with a message, location, schedule, or requirement note.</div>
          ) : null}

          {messages.map((message) => (
            <div key={message.id} id={`dm-message-${message.id}`} className="animate-fadeIn">
              <MessageCard
                message={message}
                currentUserId={currentUserId}
                onPinMessage={handlePinMessage}
                onUnpinMessage={handleUnpinMessage}
                pinnedOverride={pinnedStateByMessageId[String(message.id)]}
                isHighlighted={String(highlightedMessageId) === String(message.id)}
              />
            </div>
          ))}

          {typingLabel ? (
            <div className="mt-2 flex justify-start">
              <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">{typingLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 bg-white px-3 py-3 sm:px-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={handleSelectAttachment}
            disabled={disabledComposer}
          />

          {selectedAttachment ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2">
              {selectedAttachment.kind === "audio" ? (
                <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 p-2 text-slate-600">
                  <Mic className="h-full w-full" />
                </div>
              ) : (
                <img src={selectedAttachment.previewUrl} alt="Selected file" className="h-10 w-10 rounded-lg object-cover" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-slate-600">{selectedAttachment.name}</p>
                {selectedAttachment.kind === "audio" ? (
                  <audio controls preload="metadata" src={selectedAttachment.previewUrl} className="mt-1 h-8 w-full" />
                ) : null}
              </div>

              <button
                type="button"
                className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-700"
                onClick={clearSelectedAttachment}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {attachmentError ? <p className="mb-2 text-xs text-rose-500">{attachmentError}</p> : null}

          {isRecording ? <p className="mb-2 text-xs font-semibold text-rose-600">{t("chat.recordingVoiceMessage")}</p> : null}

          {locationPickerOpen ? (
            <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold text-slate-700">Share location</p>
              <p className="mt-1 text-xs text-slate-500">Choose what to share. We will only ask permission when you tap use current location.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleShareCurrentLocation}
                  disabled={disabledComposer || isSharingLocation}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSharingLocation ? "Getting location..." : "Use current location"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    injectTemplate("location: ");
                    setLocationPickerOpen(false);
                    setLocationDraft(null);
                    setManualLocationValue("");
                  }}
                  disabled={disabledComposer}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Type manually
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationPickerOpen(false);
                    setLocationDraft(null);
                    setManualLocationValue("");
                  }}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs font-semibold text-slate-700">Choose custom location</p>
                <input
                  type="text"
                  value={manualLocationValue}
                  onChange={(event) => setManualLocationValue(event.target.value)}
                  placeholder="Type area, address, or map place"
                  className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-blue-300"
                  disabled={disabledComposer || isSending}
                />
                {manualLocationValue.trim() ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(manualLocationValue.trim())}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center text-[11px] font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Preview on map
                  </a>
                ) : null}
                <div>
                  <button
                    type="button"
                    onClick={handleSendManualLocation}
                    disabled={disabledComposer || isSending || !manualLocationValue.trim()}
                    className="mt-2 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send chosen location
                  </button>
                </div>
              </div>

              {locationDraft ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-semibold text-emerald-700">Selected</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    {locationDraft.label}: {locationDraft.latitude}, {locationDraft.longitude}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendDraftLocation}
                    disabled={disabledComposer || isSending}
                    className="mt-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send location
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {quickActionsOpen ? (
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                onClick={() => injectTemplate("location: Site office, Sector 12")}
              >
                Quick location
              </button>
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                onClick={() => injectTemplate("visit scheduled: Tomorrow, 04:30 PM")}
              >
                Quick schedule
              </button>
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                onClick={() => injectTemplate("requirement: Cable trenching; Panel check; Team of 2")}
              >
                Quick requirement
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:hidden">
              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => setQuickActionsOpen((previous) => !previous)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="More actions"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Upload file or image"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={disabledComposer && !isRecording}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isRecording
                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "text-slate-500 hover:bg-gray-100 hover:text-slate-700"
                }`}
                title={isRecording ? t("chat.stopRecording") : t("chat.recordVoiceMessage")}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={toggleLocationPicker}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Share location"
              >
                <MapPin className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => injectTemplate("visit scheduled: ")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Select time"
              >
                <CalendarDays className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => injectTemplate("requirement: ")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Add requirement"
              >
                <ClipboardList className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => setQuickActionsOpen((previous) => !previous)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="More actions"
              >
                <Plus className="h-5 w-5" />
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Upload file or image"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <button
                type="button"
                disabled={disabledComposer && !isRecording}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isRecording
                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "text-slate-500 hover:bg-gray-100 hover:text-slate-700"
                }`}
                title={isRecording ? t("chat.stopRecording") : t("chat.recordVoiceMessage")}
              >
                {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={toggleLocationPicker}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Share location"
              >
                <MapPin className="h-5 w-5" />
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => injectTemplate("visit scheduled: ")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Select time"
              >
                <CalendarDays className="h-5 w-5" />
              </button>

              <button
                type="button"
                disabled={disabledComposer}
                onClick={() => injectTemplate("requirement: ")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Add requirement"
              >
                <ClipboardList className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setInputValue(nextValue);
                  onTypingChange?.(Boolean(nextValue.trim()));
                }}
                onBlur={() => onTypingChange?.(false)}
                disabled={disabledComposer}
                placeholder={isSharingLocation ? "Fetching your location..." : "Type a message (or type location: ...)"}
                className="h-10 min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-11"
              />

              <button
                type="submit"
                disabled={disabledComposer || isSending || isRecording || isSharingLocation || (!inputValue.trim() && !selectedAttachment)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-11"
                title={isSending ? "Sending" : "Send message"}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      <PinnedMessagesPanel
        isOpen={pinnedPanelOpen}
        onClose={() => setPinnedPanelOpen(false)}
        pinnedMessages={pinnedMessages}
        onGoToMessage={(messageId) => {
          setPinnedPanelOpen(false);
          setHighlightedMessageId(String(messageId));
        }}
        title="Pinned Messages"
      />
    </div>
  );
}

export { formatRoleLabel, summarizeMessage, classifyMessage, parseLocationText, parseLocationPayload, parseScheduleText, parseRequirementItems };
