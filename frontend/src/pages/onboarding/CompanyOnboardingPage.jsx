import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { companyApi } from '../../services/companyApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/onboarding.css';

// Step Components
import Step1_Details from './steps/Step1_Details';
import Step2_Location from './steps/Step2_Business';
import Step3_Contact from './steps/Step3_Contact';
import Step4_Upload from './steps/Step4_Upload';
import Step5_Review from './steps/Step5_Review';
import Step5_Status from './steps/Step5_Status';

export default function CompanyOnboardingPage() {
  const { token, isAuthenticated, user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    service_type: '',
    description: '',
    years_of_experience: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    alternate_phone: '',
    business_email: user?.email || '',
    website: '',
    documents: []
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in / check status
  useEffect(() => {
    if (isAuthenticated && token) {
      checkStatus();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        business_email: prev.business_email || user.email || ''
      }));
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      const res = await companyApi.getStatus();
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setFormData(prev => ({ ...prev, ...data }));
        
        if (data.status === 'approved') {
          navigate('/vendor');
        } else if (data.status === 'pending' || data.status === 'rejected') {
          // Only jump to status page if form has been submitted (has service_type and address)
          // Otherwise, stay on step 1 to collect details
          if (data.service_type && data.address) {
            setStep(6); // Jump to status page
          }
          // else: stay on step 1 (default state)
        }
      }
    } catch (err) {
      console.error("Status check failed", err);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const steps = [
    { id: 1, title: 'Details' },
    { id: 2, title: 'Location' },
    { id: 3, title: 'Contact' },
    { id: 4, title: 'Documents' },
    { id: 5, title: 'Review' }
  ];

  return (
    <div className="onboarding-root">
      {/* Stepper */}
      <div className="stepper">
        {steps.map((s) => (
          <div key={s.id} className={`step-indicator ${step === s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}>
            <div className="step-circle">
              {step > s.id ? <Check size={16} /> : s.id}
            </div>
            {s.id !== 5 && <span className="step-line"></span>}
            <span className="text-[10px] font-bold uppercase tracking-wider mt-2 text-slate-400">{s.title}</span>
          </div>
        ))}
      </div>

      <div className="onboarding-container">
        {step === 1 && <Step1_Details formData={formData} setFormData={setFormData} onNext={nextStep} />}
        {step === 2 && <Step2_Location formData={formData} setFormData={setFormData} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <Step3_Contact formData={formData} setFormData={setFormData} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <Step4_Upload formData={formData} setFormData={setFormData} onNext={nextStep} onBack={prevStep} />}
        {step === 5 && <Step5_Review formData={formData} onNext={nextStep} onBack={prevStep} setStep={setStep} />}
        {step === 6 && <Step5_Status formData={formData} />}
      </div>
    </div>
  );
}
