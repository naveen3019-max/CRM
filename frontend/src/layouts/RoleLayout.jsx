import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useUnreadCount } from "../context/UnreadContext.jsx";
import { GroupProvider, useGroup } from "../context/GroupContext.jsx";
import { RoleSidebar } from "../components/RoleSidebar.jsx";
import GlobalHeader from "../components/GlobalHeader.jsx";
import apiClient, { withAuth } from "../services/apiClient.js";
import { connectSocket } from "../services/socketClient.js";

function RoleLayoutContent() {
  const { user, logout, token, isAuthenticated } = useAuth();
  const { updateUnreadCount } = useUnreadCount();
  const { selectedGroupId, updateGroupUnreadCount } = useGroup();
  const location = useLocation();
  const isChatRoute = /\/chat$/.test(location.pathname);
  const unreadFetchRequestRef = useRef(0);
  const bannerTimerRef = useRef(null);
  const [liveBanner, setLiveBanner] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    const requestId = ++unreadFetchRequestRef.current;

    if (!isAuthenticated || !token) {
      updateUnreadCount(0);
      return;
    }

    try {
      const response = await apiClient.get("/chat/unread/total");
      if (requestId !== unreadFetchRequestRef.current) {
        return;
      }

      const total = response.data?.data?.totalUnreadCount;
      if (total !== undefined) {
        updateUnreadCount(total);
      }
    } catch (error) {
      if (requestId !== unreadFetchRequestRef.current) {
        return;
      }
    }
  }, [isAuthenticated, token, updateUnreadCount]);

  const showLiveBanner = useCallback((title, message) => {
    setLiveBanner({ title, message });

    if (bannerTimerRef.current) {
      window.clearTimeout(bannerTimerRef.current);
    }

    bannerTimerRef.current = window.setTimeout(() => {
      setLiveBanner(null);
    }, 3200);
  }, []);

  // Reset immediately when auth session changes so stale values are not shown after login.
  useEffect(() => {
    updateUnreadCount(0);
    // Delay fetch slightly to avoid race with other effects
    const timeoutId = setTimeout(() => {
      fetchUnreadCount();
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [user?.id, isAuthenticated, token, fetchUnreadCount, updateUnreadCount]);

  // Refresh unread when auth/session or route changes.
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, location.pathname]);

  // Refresh unread when tab regains focus or becomes visible.
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const handleFocus = () => {
      fetchUnreadCount();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, token, fetchUnreadCount]);

  // Poll unread total as a fallback when sockets are unavailable.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const intervalId = window.setInterval(() => {
      fetchUnreadCount();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, token, fetchUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const handleNotification = () => {
      fetchUnreadCount();
      showLiveBanner("New notification", "You have a new notification.");
    };

    const handleChatMessage = (payload = {}) => {
      fetchUnreadCount();
      const sender = payload.senderName || "Someone";
      const summary = payload.originalMessage || payload.message || "New message";
      showLiveBanner(sender, summary);
    };

    const handleGroupMessage = (payload = {}) => {
      const groupId = String(payload.groupId || "");
      if (!groupId) {
        return;
      }

      if (String(selectedGroupId || "") !== groupId) {
        updateGroupUnreadCount(groupId, (previous) => previous + 1);
      }

      const sender = payload.senderName || "Group";
      const summary = payload.originalMessage || payload.message || "New group message";
      showLiveBanner(sender, summary);
    };

    const handleGroupCreated = (payload = {}) => {
      const groupId = payload.groupId != null ? String(payload.groupId) : "";
      if (groupId) {
        updateGroupUnreadCount(groupId, 0);
      }
      showLiveBanner("New group", payload.name ? `Created ${payload.name}` : "A new group is available.");
    };

    const handleGroupMemberAdded = (payload = {}) => {
      showLiveBanner("Group update", payload.userName ? `${payload.userName} joined the group.` : "A member was added.");
    };

    const handleGroupMemberRemoved = () => {
      showLiveBanner("Group update", "A member was removed from the group.");
    };

    socket.on("notification:new", handleNotification);
    socket.on("chat:message", handleChatMessage);
    socket.on("chat:message:read", fetchUnreadCount);
    socket.on("group:message", handleGroupMessage);
    socket.on("group:created", handleGroupCreated);
    socket.on("group:member:added", handleGroupMemberAdded);
    socket.on("group:member:removed", handleGroupMemberRemoved);

    return () => {
      socket.off("notification:new", handleNotification);
      socket.off("chat:message", handleChatMessage);
      socket.off("chat:message:read", fetchUnreadCount);
      socket.off("group:message", handleGroupMessage);
      socket.off("group:created", handleGroupCreated);
      socket.off("group:member:added", handleGroupMemberAdded);
      socket.off("group:member:removed", handleGroupMemberRemoved);

      if (bannerTimerRef.current) {
        window.clearTimeout(bannerTimerRef.current);
      }
    };
  }, [isAuthenticated, token, fetchUnreadCount, selectedGroupId, showLiveBanner, updateGroupUnreadCount]);

  const shell = isChatRoute ? (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <RoleSidebar role={user.role} user={user} onLogout={logout} chatMode />
      <main className="min-h-0 min-w-0 flex-1 overscroll-contain">
        <Outlet />
      </main>
    </div>
  ) : (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-3 p-2 sm:p-4 lg:grid-cols-[280px_1fr] lg:gap-5 lg:p-6">
      <RoleSidebar role={user.role} user={user} onLogout={logout} chatMode={false} />
      <main className="min-w-0 pb-4 sm:pb-0">
        <GlobalHeader />
        <div className="space-y-4 sm:space-y-5">
          <Outlet />
        </div>
      </main>
    </div>
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Signing out...
      </div>
    );
  }

  return (
    <>
      {liveBanner ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur sm:right-6 sm:top-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Live</p>
          <p className="mt-1 text-sm font-semibold leading-snug">{liveBanner.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-300">{liveBanner.message}</p>
        </div>
      ) : null}
      <GroupProvider>
        {shell}
      </GroupProvider>
    </>
  );
}

export function RoleLayout() {
  return (
    <GroupProvider>
      <RoleLayoutContent />
    </GroupProvider>
  );
}
