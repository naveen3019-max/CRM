import React, { useMemo, useState } from 'react';
import { X, Download, ArrowLeft, FileText, ExternalLink, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from 'lucide-react';
import { resolveDocumentUrl } from '../utils/documentUrl.js';

export default function DocumentPreviewModal({ document, onClose, apiBaseUrl }) {
  if (!document) return null;

  const fileUrl = resolveDocumentUrl(document.file_url, apiBaseUrl);
  const sourceUrl = String(document.file_name || document.file_url || fileUrl || '').toLowerCase();
  const isPdf = sourceUrl.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(sourceUrl);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const hasFileUrl = Boolean(fileUrl);
  const uploadedOn = useMemo(() => {
    const raw = document.created_at || document.uploadedAt;
    if (!raw) return 'Unknown date';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString();
  }, [document.created_at, document.uploadedAt]);

  const canShowPreview = hasFileUrl && ((isImage && !imageLoadFailed) || isPdf);

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800 truncate">{String(document.doc_type || 'document').replace(/_/g, ' ')}</h2>
              <p className="text-xs text-slate-500 truncate">{document.file_name || 'Uploaded file'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {hasFileUrl && (
              <>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl transition-all"
                  title="Open in new tab"
                >
                  <ExternalLink size={20} />
                </a>
                <a
                  href={fileUrl}
                  download
                  className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl transition-all"
                  title="Download document"
                >
                  <Download size={20} />
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl transition-all"
              title="Close preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-white">
          {isPdf && hasFileUrl ? (
            <iframe
              src={`${fileUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="Document preview"
            />
          ) : isImage && !imageLoadFailed && hasFileUrl ? (
            <div className="relative flex items-center justify-center p-8 h-full overflow-auto touch-pan-y">
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm">
                <button type="button" onClick={zoomOut} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg" title="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <button type="button" onClick={resetZoom} className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" title="Reset zoom">
                  <RotateCcw size={14} />
                </button>
                <button type="button" onClick={zoomIn} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg" title="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>
              <img
                src={fileUrl}
                alt={document.file_name || 'Document preview'}
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm transition-transform duration-150"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                onError={() => setImageLoadFailed(true)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 h-full text-slate-500">
              <AlertCircle size={48} className="mb-4 opacity-60" />
              <p className="text-sm font-semibold mb-1">Document unavailable</p>
              <p className="text-xs text-slate-500 mb-4 text-center">
                The file could not be previewed right now. It may be missing, moved, or temporarily inaccessible.
              </p>
              {hasFileUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"
                  >
                    <ExternalLink size={16} /> Open Link
                  </a>
                  <a
                    href={fileUrl}
                    download
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Download size={16} /> Download
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white rounded-lg border border-slate-200 transition-all hover:shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Documents
          </button>
          <p className="text-xs text-slate-500">
            Uploaded on {uploadedOn}
          </p>
        </div>
      </div>
    </div>
  );
}
