import React, { useState } from 'react';
import { 
  Send, Plus, Paperclip, MapPin, Calendar, 
  ClipboardList, X 
} from 'lucide-react';

export default function ActionBar({ onSend }) {
  const [text, setText] = useState('');
  const [activeType, setActiveType] = useState('text');
  const [metadata, setMetadata] = useState({});

  const handleSend = () => {
    if (!text && Object.keys(metadata).length === 0) return;
    
    onSend({
      body: text,
      type: activeType,
      metadata: metadata
    });
    
    setText('');
    setActiveType('text');
    setMetadata({});
  };

  const setStructuredMode = (type) => {
    setActiveType(type);
    if (type === 'schedule') {
       setText('Site Visit Scheduled');
       setMetadata({ time: 'Tomorrow at 10:00 AM' });
    } else if (type === 'location') {
       setText('Service Location: 123 Tech Square');
       setMetadata({ address: '123 Tech Square, Innovation District' });
    } else if (type === 'requirement') {
       setText('');
       setMetadata({ category: 'Technical' });
    } else if (type === 'task') {
       setText('');
       setMetadata({ assignee: 'Field Team', priority: 'High' });
    }
  };

  return (
    <div className="input-container">
      {/* 1. Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn" title="More"><Plus size={20} /></button>
        <button className="action-btn" title="Upload"><Paperclip size={20} /></button>
        <button onClick={() => setStructuredMode('location')} className="action-btn" title="Location"><MapPin size={20} /></button>
        <button onClick={() => setStructuredMode('schedule')} className="action-btn" title="Schedule"><Calendar size={20} /></button>
        <button onClick={() => setStructuredMode('requirement')} className="action-btn" title="Brief"><ClipboardList size={20} /></button>
      </div>

      {/* 2. Message Input */}
      <div className="message-input-wrapper">
        <textarea 
          className="real-input"
          placeholder={activeType === 'text' ? "Type a message..." : "Describe this action..."}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
      </div>

      {/* 3. Send Button */}
      <button 
        onClick={handleSend}
        disabled={!text && activeType === 'text'}
        className="send-btn"
      >
        <Send size={18} />
      </button>
    </div>
  );
}

