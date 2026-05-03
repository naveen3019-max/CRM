import React from 'react';
import { ArrowLeft, ArrowRight, Phone, Mail, Globe } from 'lucide-react';

export default function Step3_Contact({ formData, setFormData, onNext, onBack }) {
  const canContinue = formData.phone && formData.business_email;

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="mb-8">
        <h2 className="onboarding-title">Contact Details</h2>
        <p className="onboarding-subtitle">How can we reach your team?</p>
      </div>

      <div className="space-y-6">
        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input 
              type="text" 
              className="form-input pl-10" 
              placeholder="+91 00000 00000"
              value={formData.phone || ''}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Alternate Phone (Optional)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input 
              type="text" 
              className="form-input pl-10" 
              placeholder="+91 00000 00000"
              value={formData.alternate_phone || ''}
              onChange={(e) => setFormData({...formData, alternate_phone: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Business Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input 
              type="email" 
              className="form-input pl-10" 
              placeholder="contact@company.com"
              value={formData.business_email || ''}
              onChange={(e) => setFormData({...formData, business_email: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Website (Optional)</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input 
              type="url" 
              className="form-input pl-10" 
              placeholder="https://www.company.com"
              value={formData.website || ''}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="onboarding-btn btn-outline flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button 
            onClick={onNext}
            disabled={!canContinue}
            className="onboarding-btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Step <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
