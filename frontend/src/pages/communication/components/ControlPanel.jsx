import React, { useState } from 'react';
import { 
  Settings, History, Save, RotateCcw, 
  MapPin, Calendar, UserPlus, FileText 
} from 'lucide-react';

export default function ControlPanel({ context, logs, onUpdate }) {
  const [formData, setFormData] = useState({
    scheduled_at: context?.scheduled_at || '',
    assigned_vendor_id: context?.assigned_vendor_id || '',
    requirement_details: context?.requirement_details || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onUpdate(formData);
  };

  if (!context) return null;

  return (
    <div className="comm-panel comm-panel-last">
      <div className="comm-panel-header">
        <h2 className="comm-panel-title">Operational Controls</h2>
      </div>

      <div className="control-scroll">
        {/* Operational Data Form */}
        <div className="context-section">
          <div className="context-label">Operational Parameters</div>
          <div className="ops-data-grid">
            <div className="group">
              <label className="ops-field-label">Scheduled Appointment</label>
              <div className="relative">
                <input 
                  type="datetime-local" 
                  className="ops-input"
                  value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('scheduled_at', e.target.value)}
                />
              </div>
            </div>

            <div className="group">
              <label className="ops-field-label">Primary Assigned Vendor</label>
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
            </div>

            <div className="group">
              <label className="ops-field-label">Technical Requirement Brief</label>
              <textarea 
                className="ops-input min-h-[120px] resize-none leading-relaxed"
                placeholder="Specify technical constraints, equipment needs, or site access details..."
                value={formData.requirement_details || ''}
                onChange={(e) => handleChange('requirement_details', e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
          >
            <Save size={18} /> Sync Operational Data
          </button>
        </div>

        <div className="h-px bg-slate-100 my-8"></div>

        {/* Activity History */}
        <div className="context-section">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History size={14} className="text-slate-400" />
              <div className="context-label mb-0">Audit Timeline</div>
            </div>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <RotateCcw size={14} />
            </button>
          </div>
          
          <div className="history-timeline">
            {logs && logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="history-item">
                  <div className="history-dot"></div>
                  <div className="history-content">
                    <span className="font-bold text-slate-800">{log.actor_name || "System"}</span> 
                    <span className="text-slate-500 ml-1">triggered</span> 
                    <span className="font-semibold text-blue-600 ml-1 underline decoration-blue-200 underline-offset-4">{log.action.toLowerCase().replace('_', ' ')}</span>
                  </div>
                  <div className="history-time flex items-center gap-1.5 mt-1.5">
                    <Clock size={10} />
                    {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <History className="mx-auto text-slate-200 mb-3" size={32} />
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Activity Records</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

