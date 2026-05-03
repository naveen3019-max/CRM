import { CalendarDays, ClipboardList, Image as ImageIcon, MapPin, Mic, Pin, X } from "lucide-react";
import { classifyMessage, parseLocationText, parseRequirementItems, parseScheduleText } from "./chatMessageUtils.js";

function messageTypeIcon(type) {
  if (type === "location") return MapPin;
  if (type === "schedule") return CalendarDays;
  if (type === "requirement") return ClipboardList;
  if (type === "image") return ImageIcon;
  if (type === "audio") return Mic;
  return Pin;
}

export function PinnedMessagesPanel({
  isOpen,
  onClose,
  pinnedMessages = [],
  onGoToMessage,
  title = "Pinned Messages"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/40 p-3 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">📌 {title}</p>
            <h3 className="text-base font-semibold text-slate-900">Saved for quick access</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {pinnedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
              No pinned messages yet.
            </div>
          ) : (
            <div className="space-y-3">
              {pinnedMessages.map((message) => {
                const TypeIcon = messageTypeIcon(classifyMessage(message));
                const preview =
                  classifyMessage(message) === "location"
                    ? parseLocationText(message.messageBody)
                    : classifyMessage(message) === "schedule"
                    ? parseScheduleText(message.messageBody)
                    : classifyMessage(message) === "requirement"
                    ? parseRequirementItems(message.messageBody)[0]
                    : String(message.messageBody || "").trim() || "Pinned message";

                return (
                  <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {message.senderName || message.senderRole || "Pinned message"}
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {message.pinnedAt ? new Date(message.pinnedAt).toLocaleString() : "Pinned"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{preview}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onGoToMessage?.(message.id)}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            Go to message
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
