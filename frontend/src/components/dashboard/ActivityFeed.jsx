import React from 'react';
import { Clock, User, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function ActivityFeed({ activities, loading }) {
  if (loading) {
    return (
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-6"></div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                <div className="h-2 w-1/4 bg-slate-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Clock size={16} className="text-brand-500" />
          Live Activity
        </h3>
        <button className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-widest">View All</button>
      </div>

      <div className="space-y-6">
        {activities.length > 0 ? activities.map((activity, idx) => (
          <div key={activity.id} className="relative flex gap-4 group">
            {/* Timeline line */}
            {idx !== activities.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-100 group-hover:bg-brand-100 transition-colors"></div>
            )}
            
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white ${
              activity.action.includes('approve') ? 'bg-emerald-50 text-emerald-600' :
              activity.action.includes('reject') ? 'bg-rose-50 text-rose-600' :
              activity.action.includes('create') ? 'bg-blue-50 text-blue-600' :
              'bg-slate-50 text-slate-600'
            }`}>
              {activity.action.includes('approve') ? <CheckCircle size={18} /> : 
               activity.action.includes('reject') ? <AlertCircle size={18} /> : 
               <RefreshCw size={18} />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-tight">
                <span className="font-bold text-slate-900">{activity.actorName}</span>
                {' '}{activity.action.replace(/_/g, ' ')}{' '}
                <span className="font-medium text-slate-500">{activity.entity_type}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(activity.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        )) : (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm italic">No recent activity found</p>
          </div>
        )}
      </div>
    </section>
  );
}
