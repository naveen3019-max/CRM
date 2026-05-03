import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Check, X, FileText, Download, Loader2, ArrowLeft, Building, MapPin, Phone, Mail, MessageSquare } from 'lucide-react';
import { companyApi } from '../../services/companyApi';
import '../../styles/onboarding.css';

export default function CompanyAdminPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await companyApi.adminListCompanies();
      setCompanies(res.data.data);
    } catch (err) {
      console.error("Failed to fetch companies", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (company) => {
    setLoading(true);
    try {
      const res = await companyApi.adminGetCompany(company.id);
      setSelectedCompany(res.data.data);
      setRejectReason('');
    } catch (err) {
      alert("Failed to fetch details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await companyApi.adminApprove(selectedCompany.id);
      setSelectedCompany({...selectedCompany, status: 'approved'});
      fetchCompanies();
    } catch (err) {
      alert("Approval failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) return alert("Please provide a reason for rejection");
    setIsProcessing(true);
    try {
      await companyApi.adminReject(selectedCompany.id, rejectReason);
      setSelectedCompany({...selectedCompany, status: 'rejected', rejection_reason: rejectReason});
      fetchCompanies();
    } catch (err) {
      alert("Rejection failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">Vendor Verifications</h1>
            <p className="text-[#64748B] mt-1">Review and manage company onboarding requests.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
            <input 
              type="text" 
              placeholder="Search by company name or email..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl w-full md:w-[400px] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {loading && companies.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#64748B]">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Loading applications...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Date Applied</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredCompanies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => handleSelect(c)}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111827]">{c.name}</span>
                          <span className="text-xs text-[#64748B]">{c.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-[#475569] text-xs font-bold rounded-lg border border-slate-200">
                          {c.service_type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          c.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          c.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748B]">
                        {new Date(c.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-[#2563EB]/5 text-[#2563EB] rounded-lg transition-all">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center text-[#64748B] italic">No applications found matching your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal/Drawer */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedCompany(null)} />
          <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h2 className="text-xl font-bold text-[#111827]">Application Review</h2>
                <p className="text-xs text-[#64748B]">Review documents and verify company details</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCompany.user_id && (
                  <button 
                    onClick={() => navigate(`/admin/chat?role=vendor&userId=${selectedCompany.user_id}`)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all"
                  >
                    <MessageSquare size={14} />
                    CHAT WITH VENDOR
                  </button>
                )}
                <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-all text-[#64748B]">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-10">
                {/* Basic Info Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Building size={16} className="text-[#2563EB]" />
                    <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Company Profile</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">About</p>
                      <p className="text-sm text-[#111827] leading-relaxed">{selectedCompany.description || 'No description provided.'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Representative</p>
                      <p className="text-sm font-semibold text-[#111827]">{selectedCompany.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Service Type</p>
                      <p className="text-sm font-semibold text-[#111827]">{selectedCompany.service_type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Years of Exp</p>
                      <p className="text-sm font-semibold text-[#111827]">{selectedCompany.years_of_experience} Years</p>
                    </div>
                  </div>
                </section>

                {/* Location Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={16} className="text-[#2563EB]" />
                    <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Business Location</h3>
                  </div>
                  <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                    <p className="text-sm text-[#111827] font-medium mb-2">{selectedCompany.address}</p>
                    <p className="text-xs text-[#64748B]">{selectedCompany.city}, {selectedCompany.state} - {selectedCompany.pincode}</p>
                  </div>
                </section>

                {/* Contact Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Phone size={16} className="text-[#2563EB]" />
                    <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Contact Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                      <Phone size={14} className="text-[#64748B]" />
                      <span className="text-xs font-semibold text-[#111827]">{selectedCompany.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                      <Mail size={14} className="text-[#64748B]" />
                      <span className="text-xs font-semibold text-[#111827] truncate">{selectedCompany.business_email}</span>
                    </div>
                  </div>
                </section>

                {/* Documents Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={16} className="text-[#2563EB]" />
                    <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">KYC Documents</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedCompany.documents?.map(doc => (
                      <div key={doc.id} className="group flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-2xl hover:border-[#2563EB] hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#2563EB] group-hover:bg-[#2563EB]/10 transition-all">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#111827] uppercase tracking-wide">{doc.doc_type.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-[#64748B]">{doc.file_name}</p>
                          </div>
                        </div>
                        <a 
                          href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${doc.file_url}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-[#2563EB]/5 rounded-lg transition-all"
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    ))}
                    {(!selectedCompany.documents || selectedCompany.documents.length === 0) && (
                      <div className="p-10 text-center border border-dashed border-[#E5E7EB] rounded-2xl">
                        <p className="text-sm text-[#9CA3AF] italic">No documents uploaded</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-6 border-t border-[#E5E7EB] bg-[#F8FAFC]">
              {selectedCompany.status === 'pending' ? (
                <div className="space-y-4">
                  <textarea 
                    className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    placeholder="Provide a reason if you are rejecting this application..." 
                    rows="3"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={handleReject} 
                      className="flex-1 px-6 py-3 border border-[#E5E7EB] text-[#ef4444] font-bold rounded-xl hover:bg-rose-50 transition-all disabled:opacity-50" 
                      disabled={isProcessing}
                    >
                      Reject
                    </button>
                    <button 
                      onClick={handleApprove} 
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50" 
                      disabled={isProcessing}
                    >
                      Approve Vendor
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-xl flex items-center justify-center gap-2 font-bold ${
                  selectedCompany.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {selectedCompany.status === 'approved' ? <Check size={20} /> : <X size={20} />}
                  STATUS: {selectedCompany.status.toUpperCase()}
                  {selectedCompany.rejection_reason && <p className="text-xs mt-1 block font-medium">({selectedCompany.rejection_reason})</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
