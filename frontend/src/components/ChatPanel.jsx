import { ImagePlus, SendHorizonal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_ORIGIN } from "../services/runtimeConfig.js";

function resolveMessageImageUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  const normalizedRawUrl = String(rawUrl).trim().replace(/\\/g, "/");

  if (/^https?:\/\//i.test(normalizedRawUrl)) {
    try {
      const parsed = new URL(normalizedRawUrl);
      const host = window.location.hostname;
      const isLocalHostUrl = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isLocalHostPage = host === "localhost" || host === "127.0.0.1";

      if (isLocalHostUrl && !isLocalHostPage) {
        parsed.hostname = host;
      }

      return parsed.toString();
    } catch {
      return normalizedRawUrl;
    }
  }

  if (normalizedRawUrl.startsWith("/")) {
    return `${API_ORIGIN}${normalizedRawUrl}`;
  }

  return `${API_ORIGIN}/${normalizedRawUrl.replace(/^\/+/, "")}`;
}

export function ChatPanel({
  messages,
  onSend,
  title = "Live Chat",
  subtitle = "Realtime support channel",
  emptyMessage = "No messages yet. Start a conversation.",
  disabled = false,
  isSending = false,
  containerClassName = ""
}) {
  const [value, setValue] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!previewImageUrl) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewImageUrl("");
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewImageUrl]);

  const handleSelectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("Only image files are allowed.");
      event.target.value = "";
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setImageError("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        name: file.name,
        dataUrl: String(reader.result),
        file
      });
      setImageError("");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const text = value.trim();
    if (disabled || (!text && !selectedImage)) {
      return;
    }

    await Promise.resolve(onSend(text, selectedImage?.dataUrl || null, selectedImage?.file || null));

    setValue("");
    setSelectedImage(null);
    setImageError("");
  };

  const responsiveHeightClass = containerClassName || "h-[62vh] min-h-[340px] sm:h-[68vh] md:h-[520px]";

  return (
    <>
      <section className={`glass-panel flex min-h-0 flex-col overflow-hidden ${responsiveHeightClass}`}>
      <header className="border-b border-white/70 px-4 py-3 sm:px-5 sm:py-4">
        <p className="font-heading text-lg font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-white/40 to-white/10 p-3 sm:p-5">
        {!messages.length ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-xl bg-white/80 px-4 py-3 text-center text-sm text-slate-500">{emptyMessage}</p>
          </div>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl text-sm shadow-soft ${
              message.imageDataUrl || message.imageUrl
                ? `max-w-[82%] p-1 sm:max-w-[360px] ${message.isMine ? "ml-auto bg-brand-600/20" : "bg-white"}`
                : `max-w-[88%] px-4 py-2 sm:max-w-[85%] ${message.isMine ? "ml-auto bg-brand-600 text-white" : "bg-white text-slate-700"}`
            }`}
          >
            {message.imageDataUrl || message.imageUrl ? (
              <button
                type="button"
                onClick={() => setPreviewImageUrl(message.imageDataUrl || resolveMessageImageUrl(message.imageUrl))}
                className="block w-full cursor-zoom-in"
              >
                <img
                  src={message.imageDataUrl || resolveMessageImageUrl(message.imageUrl)}
                  alt="Chat attachment"
                  className="block max-h-[420px] w-full rounded-xl bg-slate-100 object-contain"
                />
              </button>
            ) : null}

            {message.messageBody ? (
              <p className={`px-3 pb-1 pt-2 ${message.isMine ? "text-slate-800" : "text-slate-700"}`}>{message.messageBody}</p>
            ) : null}

            <p
              className={`px-3 pb-2 pt-1 text-[10px] ${
                message.isMine && !(message.imageDataUrl || message.imageUrl) ? "text-brand-100" : "text-slate-400"
              }`}
            >
              {new Date(message.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-white/70 px-3 py-3 sm:px-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={handleSelectImage}
        />

        {selectedImage ? (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <img src={selectedImage.dataUrl} alt="Selected attachment" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">{selectedImage.name}</p>
              <p className="text-[11px] text-slate-500">Image ready to send</p>
            </div>
            <button
              type="button"
              onClick={clearSelectedImage}
              className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {imageError ? <p className="mb-2 text-xs text-red-500">{imageError}</p> : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Photo</span>
          </button>

        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          placeholder="Type message..."
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-300 transition focus:ring disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || isSending || (!value.trim() && !selectedImage)}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
        >
          <span className="hidden sm:inline">{isSending ? "Sending..." : "Send"}</span>
          <SendHorizonal className="h-4 w-4" />
        </button>
        </div>
      </form>
      </section>

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImageUrl("")}
        >
          <button
            type="button"
            onClick={() => setPreviewImageUrl("")}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>

          <img
            src={previewImageUrl}
            alt="Full image preview"
            className="max-h-[92vh] max-w-[96vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
