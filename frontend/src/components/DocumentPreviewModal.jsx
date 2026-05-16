import React from 'react';
import { X, Download, ArrowLeft, FileText } from 'lucide-react';

export default function DocumentPreviewModal({ document, onClose, apiBaseUrl }) {
  if (!document) return null;

  const fileUrl = `${apiBaseUrl || 'http://localhost:5000'}${document.file_url}`;
  const isPdf = document.file_url?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_url);

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
              <h2 className="text-lg font-bold text-slate-800 truncate">{document.doc_type.replace(/_/g, ' ')}</h2>
              <p className="text-xs text-slate-500 truncate">{document.file_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <a
              href={fileUrl}
              download
              className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl transition-all"
              title="Download document"
            >
              <Download size={20} />
            </a>
            <button
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
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="Document preview"
            />
          ) : isImage ? (
            <div className="flex items-center justify-center p-8 h-full">
              <img
                src={fileUrl}
                alt={document.file_name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 h-full text-slate-500">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium mb-4">Preview not available for this file type</p>
              <a
                href={fileUrl}
                download
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Download size={16} /> Download File
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white rounded-lg border border-slate-200 transition-all hover:shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Documents
          </button>
          <p className="text-xs text-slate-500">
            Uploaded on {new Date(document.created_at || document.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
