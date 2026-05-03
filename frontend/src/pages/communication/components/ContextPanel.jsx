import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Calendar, Clock, Handshake, Mail, Phone, 
  Info, History, Save, RotateCcw, Edit2, CheckCircle 
} from 'lucide-react';

export default function ContextPanel({ context, onUpdate, logs }) {
  const [formData, setFormData] = useState({
    scheduled_at: context?.scheduled_at || '',
    assigned_vendor_id: context?.assigned_vendor_id || '',
    requirement_details: context?.requirement_details || '',
    address_details: context?.address_details || ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (context) {
      setFormData({
        scheduled_at: context.scheduled_at || '',
        assigned_vendor_id: context.assigned_vendor_id || '',
        requirement_details: context.requirement_details || '',
        address_details: context.address_details || ''
      });
    }
  }, [context]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  if (!context) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="comm-panel-header">
        <h2 className="comm-panel-title">Lead Summary</h2>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isEditing 
              ? 'bg-slate-100 text-slate-600' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          {isEditing ? <RotateCcw size={14} /> : <Edit2 size={14} />}
          {isEditing ? 'Cancel' : 'Modify'}
        </button>
      </div>
      
      <div className="context-scroll flex-1">
        {/* Customer Profile */}
        <div className="context-section">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-xl shadow-slate-200">
              <User size={24} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">{context.customer_name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Verified Lead</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Mail size={12} className="text-slate-400" />
              <span className="truncate">{context.customer_email}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Phone size={12} className="text-slate-400" />
              <span>{context.customer_phone}</span>
            </div>
          </div>
        </div>

        {/* Operational Grid */}
        <div className="context-section">
          <div className="context-label">Project Parameters</div>
          
          <div className="ops-data-grid space-y-4">
            {/* Address */}
            <div className="group">
              <label className="ops-field-label">Service Address</label>
              {isEditing ? (
                <input 
                  type="text" 
                  className="ops-input"
                  value={formData.address_details}
                  onChange={(e) => handleChange('address_details', e.target.value)}
                />
              ) : (
                <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  {context.address_details || "No address specified"}
                </div>
              )}
              
              {!isEditing && context.address_details && (
                <div className="mt-3 aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group/map cursor-pointer">
                  <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s+2563EB(-122.4194,37.7749)/-122.4194,37.7749,14,0/400x200?access_token=pk.mock')] bg-cover bg-center opacity-60 group-hover/map:scale-105 transition-transform duration-500"></div>
                  <div className="absolute inset-0 bg-slate-900/5 group-hover/map:bg-transparent transition-colors"></div>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="group">
              <label className="ops-field-label">Visit Schedule</label>
              {isEditing ? (
                <input 
                  type="datetime-local" 
                  className="ops-input"
                  value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('scheduled_at', e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold flex items-center gap-2">
                    <Calendar size={12} />
                    {context.scheduled_at ? new Date(context.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "TBD"}
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {context.scheduled_at ? new Date(context.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Not Scheduled"}
                  </div>
                </div>
              )}
            </div>

            {/* Vendor */}
            <div className="group">
              <label className="ops-field-label">Primary Assigned Vendor</label>
              {isEditing ? (
                <select 
                  className="ops-input"
                  value={formData.assigned_vendor_id || ''}
                  onChange={(e) => handleChange('assigned_vendor_id', e.target.value)}
                >
                  <option value="">Select Professional...</option>
                  <option value="1">SolarInstall Pro</option>
                  <option value="2">EcoEnergy Tech</option>
                  <option value="3">BrightSky Solutions</option>
                </select>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                    <Handshake size={14} />
                  </div>
                  <div className="text-sm font-bold text-slate-800">{context.vendor_name || "Awaiting Assignment"}</div>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="group">
              <label className="ops-field-label">Project Brief</label>
              {isEditing ? (
                <textarea 
                  className="ops-input min-h-[100px] resize-none"
                  value={formData.requirement_details}
                  onChange={(e) => handleChange('requirement_details', e.target.value)}
                />
              ) : (
                <div className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 shadow-sm italic">
                  "{context.requirement_details || "No specific technical requirements have been logged."}"
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <button 
              onClick={handleSubmit}
              className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <Save size={18} /> Update Operational Data
            </button>
          )}
        </div>

        <div className="h-px bg-slate-100 my-4"></div>

        {/* Audit Timeline */}
        <div className="context-section">
          <div className="flex items-center gap-2 mb-4">
            <History size={14} className="text-slate-400" />
            <div className="context-label mb-0 uppercase tracking-widest text-[10px]">Audit History</div>
          </div>
          
          <div className="history-timeline">
            {logs && logs.length > 0 ? (
              logs.slice(0, 5).map((log, i) => (
                <div key={i} className="history-item">
                  <div className="history-dot"></div>
                  <div className="history-content">
                    <span className="font-bold text-slate-800">{log.actor_name || "System"}</span> 
                    <span className="text-slate-500 ml-1">updated</span> 
                    <span className="font-semibold text-blue-600 ml-1 underline decoration-blue-200 underline-offset-4">{log.action.toLowerCase().replace('_', ' ')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-slate-400 font-bold uppercase py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

