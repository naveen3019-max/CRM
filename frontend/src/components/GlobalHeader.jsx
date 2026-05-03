import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, Settings, LayoutGrid, CheckCircle, Briefcase, Users, Handshake, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

export default function GlobalHeader() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      fetchNotifications();
    }
  }, [user, token]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.data);
      setUnreadCount(res.data.data.filter(n => !n.read_status).length);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get(`/search/global?q=${val}`);
      setSearchResults(res.data.data);
    } catch (err) {
      console.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <header className="sticky top-0 z-40 glass-panel mb-4 flex flex-col gap-3 border-b border-white/50 px-3 py-3 backdrop-blur-md sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      {/* Search Bar */}
      <div className="relative w-full sm:max-w-md sm:flex-1" ref={searchRef}>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search everything... (Users, Leads, Vendors)"
            className="w-full bg-slate-100/50 border border-transparent focus:bg-white focus:border-brand-200 rounded-2xl pl-10 pr-4 py-2 text-sm outline-none transition-all shadow-sm group-focus-within:shadow-md"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />
          {searchQuery && (
            <button onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && (searchQuery.length >= 2 || searching) && (
          <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-slate-50 bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Results</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {searching ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-500" /></div>
              ) : searchResults.length > 0 ? (
                searchResults.map(result => (
                  <button 
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      navigate(`/${result.type === 'vendor' ? 'admin/verifications' : result.type === 'user' ? 'admin?tab=users' : 'sales'}`);
                      closeSearch();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className={`p-2 rounded-lg ${
                      result.type === 'user' ? 'bg-blue-50 text-blue-600' :
                      result.type === 'vendor' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {result.type === 'user' ? <User size={16} /> : result.type === 'vendor' ? <Handshake size={16} /> : <Briefcase size={16} />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800">{result.name}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{result.type}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm italic">No results found for "{searchQuery}"</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4">

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 relative transition-all active:scale-95"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 sm:w-80">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Notifications</h3>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{unreadCount} New</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className="p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors cursor-pointer">
                      <p className="text-sm text-slate-700 leading-tight mb-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">All caught up!</div>
                )}
              </div>
              <button className="w-full p-3 text-center text-xs font-bold text-brand-600 hover:bg-slate-50 transition-colors border-t border-slate-50">
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-100">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.name}</p>
            <p className="text-[10px] uppercase font-bold text-brand-600 tracking-wider leading-none">{user.role}</p>
          </div>
          <button onClick={() => navigate(`/${user.role}/profile`)} className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold shadow-inner">
            {user.name.charAt(0)}
          </button>
        </div>
      </div>
    </header>
  );
}
