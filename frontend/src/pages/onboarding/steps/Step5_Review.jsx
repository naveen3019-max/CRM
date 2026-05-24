import React, { useState } from 'react';
import { ArrowLeft, Check, Edit2, Loader2, Send } from 'lucide-react';
import { companyApi } from '../../../services/companyApi';

export default function Step5_Review({ formData, onBack, onNext, setStep }) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const normalizePayload = () => ({
    ...formData,
    service_type: formData.service_type?.trim(),
    description: formData.description?.trim(),
    address: formData.address?.trim(),
    city: formData.city?.trim(),
    state: formData.state?.trim(),
    pincode: formData.pincode?.trim().replace(/\s/g, ''),
    phone: formData.phone?.trim(),
    alternate_phone: formData.alternate_phone?.trim(),
    business_email: formData.business_email?.trim(),
    website: formData.website?.trim(),
    years_of_experience: formData.years_of_experience === '' ? '' : String(formData.years_of_experience).trim(),
    documents: formData.documents || []
  });

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError('');
    try {
      await companyApi.updateBusiness(normalizePayload());
      onNext(); // Go to status page
    } catch (err) {
      const message = err.response?.data?.message || 'Submission failed. Please try again.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: "Company Info",
      step: 1,
      items: [
        { label: "Name", value: formData.name },
        { label: "Service", value: formData.service_type },
        { label: "Experience", value: `${formData.years_of_experience} Years` },
        { label: "Description", value: formData.description, fullWidth: true },
      ]
    },
    {
      title: "Location",
      step: 2,
      items: [
        { label: "Address", value: formData.address, fullWidth: true },
        { label: "City", value: formData.city },
        { label: "State", value: formData.state },
        { label: "Pincode", value: formData.pincode },
      ]
    },
    {
      title: "Contact",
      step: 3,
      items: [
        { label: "Phone", value: formData.phone },
        { label: "Alt Phone", value: formData.alternate_phone || 'N/A' },
        { label: "Business Email", value: formData.business_email },
        { label: "Website", value: formData.website || 'N/A' },
      ]
    },
    {
      title: "Documents",
      step: 4,
      items: (formData.documents || []).map(doc => ({
        label: doc.doc_type.replace(/_/g, ' ').toUpperCase(),
        value: doc.file_name,
        isFile: true
      }))
    }
  ];

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="mb-8">
        <h2 className="onboarding-title">Review & Submit</h2>
        <p className="onboarding-subtitle">Double check your details before submitting for verification.</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-[#F8FAFC] border-bottom border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">{section.title}</h3>
              <button 
                onClick={() => setStep(section.step)}
                className="text-[#2563EB] hover:bg-[#2563EB]/5 p-1.5 rounded-lg transition-all"
              >
                <Edit2 size={14} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.items.map((item, idx) => (
                <div key={idx} className={`${item.fullWidth ? 'col-span-2' : ''}`}>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-0.5">{item.label}</p>
                  <p className="text-sm text-[#111827] break-words">
                    {item.isFile ? <span className="inline-flex items-center gap-1 text-[#2563EB] font-medium"><Check size={12}/> {item.value}</span> : item.value}
                  </p>
                </div>
              ))}
              {section.items.length === 0 && <p className="text-sm text-[#9CA3AF] italic">No documents uploaded</p>}
            </div>
          </div>
        ))}

        {submitError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="pt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
          <button 
            onClick={onBack}
            className="onboarding-btn btn-outline flex w-full items-center gap-2 sm:w-auto"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="onboarding-btn bg-[#2563EB] text-white flex w-full items-center gap-2 hover:bg-[#1D4ED8] shadow-sm shadow-[#2563EB]/20 disabled:opacity-50 sm:w-auto"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Submit for Verification</>}
          </button>
        </div>
      </div>
    </div>
  );
}
