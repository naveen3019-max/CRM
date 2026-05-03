import React from 'react';
import { Clock, CheckCircle2, XCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function Step5_Status({ formData }) {
  const { logout } = useAuth();
  const status = formData.status || 'pending';

  const renderStatus = () => {
    switch(status) {
      case 'approved':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-bold text-[#111827] mb-2">Account Verified!</h2>
            <p className="text-[#64748B] mb-8">Your account is verified. You can now access all features.</p>
            <button 
              onClick={() => window.location.href = '/vendor'}
              className="onboarding-btn bg-[#2563EB] text-white px-8 hover:bg-[#1D4ED8] transition-all shadow-lg shadow-[#2563EB]/20"
            >
              Go to Dashboard
            </button>
          </div>
        );
      case 'rejected':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <XCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-[#111827] mb-2">Verification Rejected</h2>
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6">
              <p className="text-sm text-red-700 font-medium">Reason: {formData.rejection_reason || 'Information provided is incomplete or incorrect.'}</p>
            </div>
            <p className="text-[#64748B] mb-8">Please review your documents and resubmit for verification.</p>
            <button 
              onClick={() => window.location.reload()}
              className="onboarding-btn bg-[#111827] text-white px-8 flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={18} /> Re-upload Documents
            </button>
          </div>
        );
      default: // pending
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
              <Clock size={48} />
            </div>
            <h2 className="text-2xl font-bold text-[#111827] mb-2">Verification in Progress</h2>
            <p className="text-[#64748B] mb-8 leading-relaxed">
              Your company is under verification.<br />
              We'll notify you via email once approved.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="onboarding-btn btn-outline flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={18} /> Refresh Status
              </button>
              <button 
                onClick={() => {
                  logout();
                  window.location.href = '/';
                }}
                className="text-sm font-semibold text-[#64748B] hover:text-[#111827] flex items-center justify-center gap-1 mt-4"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="animate-in zoom-in duration-500">
      {renderStatus()}
    </div>
  );
}
