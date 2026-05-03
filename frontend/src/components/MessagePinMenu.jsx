import { useState } from "react";
import { MoreVertical, Pin, PinOff } from "lucide-react";

export function MessagePinMenu({ isPinned, onPin, onUnpin, disabled = false }) {
  const [open, setOpen] = useState(false);

  const handleAction = async (action) => {
    setOpen(false);
    await action?.();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-black/5 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Message actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-8 z-20 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {isPinned ? (
            <button
              type="button"
              onClick={() => handleAction(onUnpin)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <PinOff className="h-4 w-4 text-slate-500" />
              Unpin Message
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction(onPin)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <Pin className="h-4 w-4 text-slate-500" />
              Pin Message
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
