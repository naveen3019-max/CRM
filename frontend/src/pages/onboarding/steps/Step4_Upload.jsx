import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { companyApi } from '../../../services/companyApi';

export default function Step4_Upload({ formData, setFormData, onNext, onBack }) {
  const [uploading, setUploading] = useState(null);

  const docCategories = [
    { key: 'gst_certificate', label: 'GST Certificate', required: true },
    { key: 'pan_card', label: 'PAN Card', required: true },
    { key: 'business_registration', label: 'Business Registration Proof', required: true },
    { key: 'license', label: 'License (Optional)', required: false },
    { key: 'bank_proof', label: 'Bank Proof (Optional)', required: false },
  ];

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(docType);
    try {
      const uploadData = new FormData();
      uploadData.append('document', file);
      uploadData.append('docType', docType);

      const res = await companyApi.uploadDocument(uploadData);
      if (res.data.success) {
        const newDoc = {
          doc_type: docType,
          file_url: res.data.data.fileUrl,
          file_name: file.name
        };
        
        // Replace if already exists or add new
        const filteredDocs = (formData.documents || []).filter(d => d.doc_type !== docType);
        setFormData({
          ...formData,
          documents: [...filteredDocs, newDoc]
        });
      }
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const removeDoc = (docType) => {
    setFormData({
      ...formData,
      documents: (formData.documents || []).filter(d => d.doc_type !== docType)
    });
  };

  const getDoc = (docType) => (formData.documents || []).find(d => d.doc_type === docType);

  const canContinue = docCategories
    .filter(cat => cat.required)
    .every(cat => (formData.documents || []).some(d => d.doc_type === cat.key));

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="mb-8">
        <h2 className="onboarding-title">Document Upload (KYC)</h2>
        <p className="onboarding-subtitle">Please upload clear copies of the following documents.</p>
      </div>

      <div className="space-y-4">
        {docCategories.map((cat) => {
          const doc = getDoc(cat.key);
          const isUploading = uploading === cat.key;

          return (
            <div key={cat.key} className="p-4 border border-[#E5E7EB] rounded-2xl bg-white shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  {doc ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    {cat.label} {cat.required && <span className="text-red-500">*</span>}
                  </p>
                  {doc ? (
                    <p className="text-xs text-[#64748B] truncate max-w-[200px]">{doc.file_name}</p>
                  ) : (
                    <p className="text-xs text-[#64748B]">No file uploaded yet</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {doc ? (
                  <>
                    <button 
                      onClick={() => removeDoc(cat.key)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#2563EB] hover:underline px-2">Preview</a>
                  </>
                ) : (
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, cat.key)}
                      accept="image/*,application/pdf"
                      disabled={!!uploading}
                    />
                    <div className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center gap-2 transition-all ${isUploading ? 'bg-slate-50 text-slate-400' : 'bg-white border-[#E5E7EB] text-[#111827] hover:bg-slate-50'}`}>
                      {isUploading ? 'Uploading...' : <><Upload size={14} /> Upload</>}
                    </div>
                  </label>
                )}
              </div>
            </div>
          );
        })}

        <div className="pt-6 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="onboarding-btn btn-outline flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button 
            onClick={onNext}
            disabled={!canContinue || !!uploading}
            className="onboarding-btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Step <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
