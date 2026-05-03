import React from 'react';
import { 
  MapPin, Calendar, ClipboardList, CheckCircle, ExternalLink, 
  Download, Clock, Check, Checks, AlertCircle, User 
} from 'lucide-react';

export default function TimelinePanel({ messages, scrollRef, currentUserId }) {
  const groupMessagesByDay = (msgs) => {
    const groups = {};
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    msgs.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString();
      let dayLabel = new Date(m.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      
      if (date === today) dayLabel = 'Today';
      else if (date === yesterday) dayLabel = 'Yesterday';

      if (!groups[dayLabel]) groups[dayLabel] = [];
      groups[dayLabel].push(m);
    });
    return Object.entries(groups);
  };

  const messageGroups = groupMessagesByDay(messages);

  const renderMessage = (msg, isOwn) => {
    const metadata = typeof msg.metadata_json === 'string' ? JSON.parse(msg.metadata_json) : (msg.metadata_json || {});
    
    // 1. SYSTEM MESSAGES (Center)
    if (msg.type === 'system_event') {
      return (
        <div key={msg.id} className="system-msg my-4">
          {msg.messageBody}
        </div>
      );
    }

    // 2. STRUCTURED CARDS (Location, Schedule, etc.)
    if (['location', 'schedule', 'task', 'requirement'].includes(msg.type)) {
      return (
        <div key={msg.id} className={`bubble-row ${isOwn ? 'own' : 'other'} mb-6`}>
           <div className={`structured-card ${isOwn ? 'ml-auto' : ''}`}>
              <div className="card-header">
                 {msg.type === 'location' && <><MapPin size={14} /> Service Location</>}
                 {msg.type === 'schedule' && <><Calendar size={14} /> Visit Scheduled</>}
                 {msg.type === 'requirement' && <><ClipboardList size={14} /> Project Brief</>}
                 {msg.type === 'task' && <><CheckCircle size={14} /> Operation Task</>}
              </div>
              <div className="card-content">
                 {renderCardBody(msg, metadata)}
              </div>
           </div>
           <div className="msg-timestamp px-1">
             {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </div>
        </div>
      );
    }

    // 3. STANDARD BUBBLES (Text)
    return (
      <div key={msg.id} className={`bubble-row ${isOwn ? 'own' : 'other'} mb-4`}>
        <div className={`msg-bubble ${isOwn ? 'bubble-own' : 'bubble-other'}`}>
          <div className="msg-text">{msg.messageBody}</div>
        </div>
        <div className="msg-timestamp px-1">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOwn && <Check size={12} className="inline ml-1 opacity-60" />}
        </div>
      </div>
    );
  };

  const renderCardBody = (msg, metadata) => {
    switch(msg.type) {
      case 'location':
        return (
          <div className="space-y-3">
            <div className="aspect-[16/9] bg-slate-100 rounded-lg bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s+2563EB(-122.4194,37.7749)/-122.4194,37.7749,14,0/320x180?access_token=pk.mock')] bg-cover bg-center"></div>
            <div className="text-sm font-semibold text-slate-800">{metadata.address || msg.messageBody}</div>
            <button className="w-full py-2 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors">
              Open in Maps
            </button>
          </div>
        );
      case 'schedule':
        return (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-amber-600 uppercase">Appointment</div>
              <div className="text-sm font-bold text-slate-900">{metadata.time || msg.messageBody}</div>
            </div>
            <Clock className="text-amber-500" size={20} />
          </div>
        );
      case 'requirement':
        return (
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {msg.messageBody}
          </div>
        );
      default:
        return <div className="text-sm text-slate-700">{msg.messageBody}</div>;
    }
  };

  return (
    <div className="flex flex-col">
      {messageGroups.map(([day, msgs]) => (
        <React.Fragment key={day}>
          <div className="flex justify-center my-6">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{day}</span>
          </div>
          {msgs.map((msg) => renderMessage(msg, msg.sender_id === currentUserId))}
        </React.Fragment>
      ))}
    </div>
  );
}

