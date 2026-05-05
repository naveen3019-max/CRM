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
          <input 
            type="text" 
            className="form-input" 
            placeholder="+91 00000 00000"
            value={formData.phone || ''}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Alternate Phone (Optional)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="+91 00000 00000"
            value={formData.alternate_phone || ''}
            onChange={(e) => setFormData({...formData, alternate_phone: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Business Email</label>
          <input 
            type="email" 
            className="form-input" 
            placeholder="contact@company.com"
            value={formData.business_email || ''}
            onChange={(e) => setFormData({...formData, business_email: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Website (Optional)</label>
          <input 
            type="url" 
            className="form-input" 
            placeholder="https://www.company.com"
            value={formData.website || ''}
            onChange={(e) => setFormData({...formData, website: e.target.value})}
          />
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
