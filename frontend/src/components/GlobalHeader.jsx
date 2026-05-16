import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User, LogOut, Settings, LayoutGrid, CheckCircle, Briefcase, Users, Handshake, Loader2, X, ChevronDown, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient, { withAuth } from '../services/apiClient';
import { formatRoleLabel } from './chatMessageUtils.js';
import AssignmentModal from './AssignmentModal.jsx';

function toTitleCase(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const SERVICE_CATEGORIES = [
  "Electrician",
  "Plumber",
  "Internet Installation",
  "CCTV Technician",
  "AC Service",
  "Carpenter",
  "Painter",
  "Appliance Repair",
  "General Technician"
];

const EXPERIENCE_OPTIONS = [
  { label: "Fresher", value: "fresher" },
  { label: "1+ Years", value: "1+" },
  { label: "3+ Years", value: "3+" },
  { label: "5+ Years", value: "5+" }
];

export default function GlobalHeader() {
  const { user, token, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentWorker, setAssignmentWorker] = useState(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    serviceCategory: '',
    city: '',
    pincode: '',
    experience: ''
  });

  const searchRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      fetchNotifications();
    }
  }, [user, token]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications', withAuth(token));
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.readStatus).length);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!notificationId || !token) {
      return false;
    }

    try {
      await apiClient.patch(`/notifications/${notificationId}/read`, {}, withAuth(token));
      return true;
    } catch (error) {
      return false;
    }
  };

  const markAllNotificationsRead = async () => {
    const unreadNotifications = notifications.filter((notification) => !notification.readStatus);
    if (!unreadNotifications.length || notificationsBusy) {
      return;
    }

    setNotificationsBusy(true);
    try {
      await Promise.all(unreadNotifications.map((notification) => markNotificationRead(notification.id)));
      setNotifications((previous) => previous.map((notification) => ({ ...notification, readStatus: true })));
      setUnreadCount(0);
    } finally {
      setNotificationsBusy(false);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    setOpeningChat(false);
    setActiveIndex(-1);
  };

  const canAssignToResult = (result) => ['service_professional', 'field_work', 'electrician', 'vendor'].includes(String(result?.role || ''));

  const getSearchResultSummary = (result) => {
    const specialty = result?.serviceCategory || result?.workType || formatRoleLabel(result?.role);
    const parts = [specialty, result?.city, result?.state].filter(Boolean);
    return parts.join(' • ');
  };

  const openAssignmentModal = (result) => {
    if (!result) {
      return;
    }

    setAssignmentWorker(result);
    setAssignmentError('');
    setAssignmentMessage('');
    setAssignmentOpen(true);
    closeSearch();
  };

  const closeAssignmentModal = () => {
    if (assignmentSubmitting) {
      return;
    }

    setAssignmentOpen(false);
    setAssignmentWorker(null);
    setAssignmentError('');
  };

  const submitAssignment = async (payload) => {
    if (!token || !assignmentWorker) {
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentError('');

    try {
      const formData = new FormData();
      formData.append('workerId', String(payload.workerId || assignmentWorker.id));
      if (payload.customerName) formData.append('customerName', payload.customerName);
      formData.append('serviceTitle', payload.serviceTitle || getSearchResultSummary(assignmentWorker) || 'Work assignment');
      if (payload.serviceCategory) formData.append('serviceCategory', payload.serviceCategory);
      if (payload.description) formData.append('description', payload.description);
      if (payload.location) formData.append('location', payload.location);
      if (payload.budget) formData.append('budget', payload.budget);
      if (payload.priority) formData.append('priority', payload.priority);
      if (payload.preferredDate) formData.append('preferredDate', payload.preferredDate);
      if (payload.preferredTime) formData.append('preferredTime', payload.preferredTime);
      if (payload.additionalInstructions) formData.append('additionalInstructions', payload.additionalInstructions);

      (Array.isArray(payload.attachments) ? payload.attachments : []).forEach((file) => {
        formData.append('attachments', file);
      });

      await apiClient.post('/work-assignments', formData, withAuth(token));
      setAssignmentOpen(false);
      setAssignmentWorker(null);
      setAssignmentMessage(`${t('header.assignWork')} - ${assignmentWorker.name}`);
      window.setTimeout(() => setAssignmentMessage(''), 3000);
    } catch (error) {
      setAssignmentError(error?.response?.data?.message || 'Failed to create work assignment.');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        closeSearch();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setActiveIndex(-1);
      return;
    }

    const requestId = ++searchRequestRef.current;
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = { 
          query,
          ...(filters.serviceCategory && { service_category: filters.serviceCategory }),
          ...(filters.city && { city: filters.city }),
          ...(filters.pincode && { pincode: filters.pincode }),
          ...(filters.experience && { experience: filters.experience })
        };
        
        const res = await apiClient.get('/users/search', { params });
        if (requestId !== searchRequestRef.current) {
          return;
        }

        const results = Array.isArray(res.data?.data) ? res.data.data : [];
        setSearchResults(results);
        setActiveIndex(results.length ? 0 : -1);
        setSearchOpen(true);
      } catch (err) {
        if (requestId === searchRequestRef.current) {
          setSearchResults([]);
          setActiveIndex(-1);
        }
      } finally {
        if (requestId === searchRequestRef.current) {
          setSearching(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, filters]);

  const highlightText = (text, query) => {
    const source = String(text || '');
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) {
      return source;
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return source;
    }

    const regex = new RegExp(`(${parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
    const split = source.split(regex);

    return split.map((part, index) =>
      parts.some((term) => term && part.toLowerCase() === term) ? (
        <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-0.5 text-inherit">{part}</mark>
      ) : (
        <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      )
    );
  };

  const openChat = async (result) => {
    if (!result || openingChat) {
      return;
    }

    setOpeningChat(true);
    try {
      const res = await apiClient.post('/chat/get-or-create', { targetUserId: result.id }, withAuth(token));
      const data = res.data?.data || {};
      const chatId = data.chatId || data.id || data.conversationId;
      const scope = data.scope;

      if (!chatId) {
        throw new Error('Missing chat id');
      }

      if (user?.role === 'admin') {
        navigate('/admin/chat', {
          state: {
            targetConversationId: chatId,
            targetUserId: result.id,
            scope
          }
        });
      } else {
        navigate(`/${user.role}/chat`, {
          state: {
            targetConversationId: chatId,
            targetUserId: result.id,
            scope
          }
        });
      }
      closeSearch();
    } catch (error) {
      console.error('Failed to open chat', error);
    } finally {
      setOpeningChat(false);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      closeSearch();
      return;
    }

    if (!searchResults.length && event.key !== 'Enter') {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((previous) => (previous + 1) % searchResults.length);
      setSearchOpen(true);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((previous) => (previous - 1 + searchResults.length) % searchResults.length);
      setSearchOpen(true);
    }

    if (event.key === 'Enter' && activeIndex >= 0 && searchResults[activeIndex]) {
      event.preventDefault();
      openChat(searchResults[activeIndex]);
    }
  };

  const roleLabel = useMemo(() => (role) => formatRoleLabel(role), []);
  const userServiceLabel = useMemo(() => {
    const svc = user?.serviceCategory || user?.workType;
    if (user?.role === 'service_professional' && svc) return toTitleCase(svc);
    if (user?.role === 'field_work' && user?.workType) return toTitleCase(user.workType);
    return roleLabel(user?.role || '');
  }, [user?.role, user?.workType, user?.serviceCategory, roleLabel]);

  const handleNotificationsToggle = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen) {
      await markAllNotificationsRead();
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-panel mb-4 flex flex-col gap-3 border-b border-white/50 px-3 py-3 backdrop-blur-md sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      {/* Search Bar */}
      <div className="relative w-full sm:max-w-md sm:flex-1" ref={searchRef}>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder={t('header.searchPlaceholder')}
            className="w-full bg-slate-100/50 border border-transparent focus:bg-white focus:border-brand-200 rounded-2xl pl-10 pr-4 py-2 text-sm outline-none transition-all shadow-sm group-focus-within:shadow-md"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Button */}
        {searchQuery.length >= 2 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100/50 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Filter size={14} />
            {t('header.filters')}
            {Object.values(filters).some(f => f) && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {Object.values(filters).filter(f => f).length}
              </span>
            )}
          </button>
        )}

        {/* Filter UI */}
        {showFilters && searchQuery.length >= 2 && (
          <div className="mt-3 p-3 rounded-2xl border border-slate-100 bg-white shadow-lg space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {/* Service Category Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={filters.serviceCategory}
                  onChange={(e) => setFilters({ ...filters, serviceCategory: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                >
                  <option value="">{t('header.allCategories')}</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat.toLowerCase().replace(/\s+/g, '_')}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g., Bangalore"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Pincode Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pincode</label>
                <input
                  type="text"
                  placeholder="e.g., 560037"
                  value={filters.pincode}
                  onChange={(e) => setFilters({ ...filters, pincode: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Experience Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Experience</label>
                <select
                  value={filters.experience}
                  onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                >
                  <option value="">{t('header.anyExperience')}</option>
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <option key={exp.value} value={exp.value}>
                      {exp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
              <button
                onClick={() => setFilters({ serviceCategory: '', city: '', pincode: '', experience: '' })}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded transition-colors"
              >
                {t('header.clear')}
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-1 text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 rounded transition-colors"
              >
                {t('header.apply')}
              </button>
            </div>
          </div>
        )}

        {/* Search Results Dropdown */}
        {assignmentMessage ? (
          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
            {assignmentMessage}
          </div>
        ) : null}

        {assignmentError ? (
          <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
            {assignmentError}
          </div>
        ) : null}

        {searchOpen && (searchQuery.length >= 2 || searching) && (
          <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-slate-50 bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Smart Search</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {searching || openingChat ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-500" /></div>
              ) : searchResults.length > 0 ? (
                searchResults.slice(0, 10).map((result, index) => (
                  <article
                    key={`${result.role}-${result.id}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`border-b border-slate-50 px-4 py-3 transition-colors last:border-0 ${index === activeIndex ? 'bg-brand-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${
                        result.role === 'vendor' ? 'bg-amber-50 text-amber-600' :
                        result.role === 'electrician' ? 'bg-blue-50 text-blue-600' :
                        (result.role === 'field_work' || result.role === 'service_professional') ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {result.role === 'vendor' ? <Handshake size={16} /> : result.role === 'electrician' ? <Briefcase size={16} /> : <Users size={16} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 text-left">
                            <p className="break-words text-sm font-bold text-slate-800">{highlightText(result.name, searchQuery)}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase tracking-wide text-slate-600">{roleLabel(result.role)}</span>
                              <span className="inline-flex items-center gap-1">
                                <span className={`h-2 w-2 rounded-full ${result.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                {result.isOnline ? 'Online' : 'Offline'}
                              </span>
                              {getSearchResultSummary(result) ? <span className="truncate text-slate-400">{highlightText(getSearchResultSummary(result), searchQuery)}</span> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                              {(result.serviceCategory || result.workType) ? <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">{result.serviceCategory || result.workType}</span> : null}
                              {result.experience ? <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">{result.experience} yrs</span> : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => openChat(result)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              {t('header.openChat')}
                            </button>
                            {canAssignToResult(result) ? (
                              <button
                                type="button"
                                onClick={() => openAssignmentModal(result)}
                                className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                              >
                                {t('header.assignWork')}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  {t('header.searchNoResults', { query: searchQuery })}
                </div>
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
            onClick={handleNotificationsToggle}
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
            <div className="absolute left-0 right-0 mt-3 w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 sm:left-auto sm:right-0 sm:w-80">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Notifications</h3>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{unreadCount} {t('header.new')}</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={async () => {
                        const success = await markNotificationRead(n.id);
                        if (success) {
                          setNotifications((previous) => previous.map((notification) => (
                            notification.id === n.id ? { ...notification, readStatus: true } : notification
                          )));
                          setUnreadCount((previous) => Math.max(0, previous - 1));
                        }
                      }}
                      className="w-full cursor-pointer border-b border-slate-50 p-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.readStatus ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}`}>
                          <Bell size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`break-words text-sm leading-snug ${n.readStatus ? 'text-slate-500' : 'text-slate-700'}`}>
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-slate-400">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">{t('header.allCaughtUp')}</div>
                )}
              </div>
              <button className="w-full p-3 text-center text-xs font-bold text-brand-600 hover:bg-slate-50 transition-colors border-t border-slate-50">
                {t('header.viewAllNotifications')}
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-100">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.name}</p>
            <p className="text-[10px] uppercase font-bold text-brand-600 tracking-wider leading-none">{userServiceLabel}</p>
          </div>
          <button onClick={() => navigate(`/${user.role}/profile`)} className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold shadow-inner">
            {user.name.charAt(0)}
          </button>
        </div>
      </div>

      <AssignmentModal
        open={assignmentOpen}
        worker={assignmentWorker}
        onClose={closeAssignmentModal}
        onSubmit={submitAssignment}
        submitting={assignmentSubmitting}
      />
    </header>
  );
}
