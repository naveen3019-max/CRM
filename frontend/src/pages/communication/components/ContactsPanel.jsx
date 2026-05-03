import React, { useState } from 'react';
import { Search, User, Briefcase, Handshake, Shield, Clock } from 'lucide-react';

export default function ContactsPanel({ contacts, activeId, onSelect }) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'SALES', label: 'Sales' },
    { id: 'VENDOR', label: 'Vendors' },
    { id: 'CUSTOMER', label: 'Clients' }
  ];

  const filtered = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'ALL' || c.role?.toUpperCase() === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="contacts-panel">
      {/* Search & Filters */}
      <div className="contacts-header">
        <div className="search-container">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search contacts..." 
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="role-filters">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`role-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="contact-list">
        {filtered.length > 0 ? filtered.map(contact => (
          <div 
            key={contact.id}
            onClick={() => onSelect(contact)}
            className={`contact-item ${activeId === contact.id ? 'active' : ''}`}
          >
            <div className="contact-avatar">
              {contact.name.charAt(0)}
            </div>
            
            <div className="contact-info">
              <div className="contact-top">
                <span className="contact-name">{contact.name}</span>
                <span className="contact-time">
                  {contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:42 AM'}
                </span>
              </div>
              
              <div className="contact-preview">
                {contact.lastMessage || "No messages yet..."}
              </div>
              
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  contact.role === 'admin' ? 'bg-slate-200 text-slate-600' :
                  contact.role === 'vendor' ? 'bg-indigo-100 text-indigo-600' :
                  contact.role === 'sales' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {contact.role}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="p-12 text-center">
            <User className="mx-auto text-slate-200 mb-2" size={32} />
            <p className="text-[13px] text-slate-400 font-medium">No conversations</p>
          </div>
        )}
      </div>
    </div>
  );
}
