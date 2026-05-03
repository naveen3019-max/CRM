import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import '../../styles/communication.css';

import ContactsPanel from './components/ContactsPanel';
import ContextPanel from './components/ContextPanel'; // This will be used for the ContextBar logic
import TimelinePanel from './components/TimelinePanel';
import ActionBar from './components/ActionBar';
import { 
  Phone, Video, Info, MoreVertical, 
  MapPin, Calendar, ClipboardList, CheckCircle, Shield
} from 'lucide-react';

export default function CommunicationPage() {
  const { leadId: initialLeadId } = useParams();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [data, setData] = useState({
    context: null,
    messages: [],
    logs: []
  });

  // Fetch initial contact list
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await apiClient.get('/leads'); // Using leads as contacts for now
        const formatted = res.data.data.map(l => ({
          id: l.id,
          name: l.title || l.customer_name,
          role: 'customer',
          lastMessage: 'Awaiting site inspection...',
          lastMessageAt: l.created_at,
          unreadCount: 0
        }));
        setContacts(formatted);
        
        // If initialLeadId, set as active
        if (initialLeadId) {
          const initial = formatted.find(c => c.id === Number(initialLeadId));
          if (initial) setActiveContact(initial);
        } else if (formatted.length > 0) {
          setActiveContact(formatted[0]);
        }
      } catch (err) {
        console.error("Failed to fetch contacts", err);
      }
    };
    fetchContacts();
  }, [initialLeadId]);

  // Fetch active contact data
  useEffect(() => {
    if (!activeContact) return;
    
    const fetchData = async () => {
      try {
        const [ctxRes, msgRes, logRes] = await Promise.all([
          apiClient.get(`/communication/${activeContact.id}/context`),
          apiClient.get(`/communication/${activeContact.id}/messages`),
          apiClient.get(`/communication/${activeContact.id}/operations`)
        ]);
        setData({
          context: ctxRes.data.data,
          messages: msgRes.data.data,
          logs: logRes.data.data
        });
      } catch (err) {
        console.error("Failed to fetch contact data", err);
      }
    };
    fetchData();
  }, [activeContact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data.messages]);

  const handleSendMessage = async (payload) => {
    if (!activeContact) return;
    try {
      await apiClient.post('/communication/message', {
        leadId: activeContact.id,
        ...payload
      });
      // In a real app, socket would handle this. 
      // Manually refetching for demo.
      const msgRes = await apiClient.get(`/communication/${activeContact.id}/messages`);
      setData(prev => ({ ...prev, messages: msgRes.data.data }));
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleUpdateOps = async (payload) => {
    if (!activeContact) return;
    try {
      await apiClient.put(`/communication/${activeContact.id}/operations`, payload);
      const ctxRes = await apiClient.get(`/communication/${activeContact.id}/context`);
      setData(prev => ({ ...prev, context: ctxRes.data.data }));
    } catch (err) {
      console.error("Failed to update ops", err);
    }
  };

  return (
    <div className="comm-page">
      {/* LEFT: CONTACTS HUB */}
      <ContactsPanel 
        contacts={contacts} 
        activeId={activeContact?.id} 
        onSelect={setActiveContact} 
      />

      {/* RIGHT: CHAT HUB (Full Height Rebuild) */}
      <div className="chat-panel">
        {activeContact ? (
          <>
            {/* 1. FIXED HEADER */}
            <header className="chat-header">
              <div className="flex items-center gap-4">
                <div className="contact-avatar">
                  {activeContact.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-tight">{activeContact.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <Video size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            {/* 2. PERSISTENT INFO STRIP */}
            <div className="info-strip">
              <div className="info-item">
                <MapPin size={14} />
                <span>{data.context?.address_details || "Location TBD"}</span>
              </div>
              <div className="info-item">
                <Calendar size={14} />
                <span>{data.context?.scheduled_at ? new Date(data.context.scheduled_at).toLocaleDateString() : "No Schedule"}</span>
              </div>
              <div className="info-item">
                <ClipboardList size={14} />
                <span className="truncate max-w-[300px]">{data.context?.requirement_details || "No project brief"}</span>
              </div>
            </div>

            {/* 3. SCROLLABLE CHAT BODY */}
            <div className="chat-body" ref={scrollRef}>
              <TimelinePanel 
                messages={data.messages} 
                currentUserId={user.id} 
              />
            </div>

            {/* 4. ACTION INPUT BAR */}
            <div className="input-bar">
              <ActionBar onSend={handleSendMessage} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center text-slate-200 mb-6">
              <Shield size={32} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Operational Sync Hub</h2>
            <p className="text-[13px] text-slate-400 mt-1">Select a conversation to start collaborating</p>
          </div>
        )}
      </div>
    </div>
  );
}
