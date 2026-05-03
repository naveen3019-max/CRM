import React from 'react';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';

export default function Step2_Location({ formData, setFormData, onNext, onBack }) {
  const canContinue = formData.address && formData.city && formData.state && formData.pincode;

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="mb-8">
        <h2 className="onboarding-title">Location Details</h2>
        <p className="onboarding-subtitle">Where is your business headquartered?</p>
      </div>

      <div className="space-y-6">
        <div className="form-group">
          <label className="form-label">Office Address</label>
          <textarea 
            className="form-textarea" 
            rows="3"
            placeholder="Complete street address..."
            value={formData.address || ''}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
          ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">City</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Mumbai"
              value={formData.city || ''}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Maharashtra"
              value={formData.state || ''}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Pincode</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. 400001"
            maxLength="6"
            value={formData.pincode || ''}
            onChange={(e) => setFormData({...formData, pincode: e.target.value})}
          />
        </div>

        <div className="p-6 border border-[#E5E7EB] border-dashed rounded-2xl bg-[#F8FAFC] flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#2563EB]">
            <MapPin size={20} />
          </div>
          <p className="text-sm font-semibold text-[#111827]">Map Location</p>
          <p className="text-xs text-[#64748B]">Click to pin your exact location on Google Maps</p>
          <button type="button" className="mt-2 text-xs font-bold text-[#2563EB] hover:underline">Open Map Picker</button>
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
