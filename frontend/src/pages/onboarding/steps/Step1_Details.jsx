import React from 'react';
import { ArrowRight, Building2 } from 'lucide-react';

export default function Step1_Details({ formData, setFormData, onNext }) {
  const serviceTypes = [
    "Solar Installation",
    "Electrical Services",
    "CCTV Installation"
  ];

  const canContinue = formData.name && formData.service_type && formData.description && formData.years_of_experience;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="onboarding-title">Company Basic Details</h2>
        <p className="onboarding-subtitle">Tell us a bit about your business to get started.</p>
      </div>

      <div className="space-y-6">
        <div className="form-group">
          <label className="form-label">Company Name</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. Solar Tech Solutions"
            value={formData.name || ''}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Service Type</label>
          <select 
            className="form-select"
            value={formData.service_type || ''}
            onChange={(e) => setFormData({...formData, service_type: e.target.value})}
          >
            <option value="">Select a service</option>
            {serviceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Company Description</label>
          <textarea 
            className="form-textarea" 
            rows="4"
            placeholder="Describe your services, specialization and core values..."
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </div>

        <div className="form-group">
          <label className="form-label">Years of Experience</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="e.g. 5"
            min="0"
            value={formData.years_of_experience || ''}
            onChange={(e) => setFormData({...formData, years_of_experience: e.target.value})}
          />
        </div>

        <div className="pt-4 flex justify-end">
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
