import { useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useUnreadCount } from "../context/UnreadContext.jsx";
import { GroupProvider } from "../context/GroupContext.jsx";
import { RoleSidebar } from "../components/RoleSidebar.jsx";
import GlobalHeader from "../components/GlobalHeader.jsx";
import apiClient, { withAuth } from "../services/apiClient.js";
import { connectSocket } from "../services/socketClient.js";

export function RoleLayout() {
  const { user, logout, token, isAuthenticated } = useAuth();
  const { updateUnreadCount } = useUnreadCount();
  const location = useLocation();
  const isChatRoute = /\/chat$/.test(location.pathname);
  const unreadFetchRequestRef = useRef(0);

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

  // Connect socket at layout-level and sync unread on real-time events.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const handleIncomingMessage = () => {
      fetchUnreadCount();
    };

    const handleMessageRead = () => {
      fetchUnreadCount();
    };
    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:message:read", handleMessageRead);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:message:read", handleMessageRead);
    };
  }, [isAuthenticated, token, fetchUnreadCount]);

  if (isChatRoute) {
    return (
      <GroupProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
          <RoleSidebar role={user.role} user={user} onLogout={logout} chatMode />
          <main className="min-h-0 min-w-0 flex-1 overscroll-contain">
            <Outlet />
          </main>
        </div>
      </GroupProvider>
    );
  }

  return (
    <GroupProvider>
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-3 p-2 sm:p-4 lg:grid-cols-[280px_1fr] lg:gap-5 lg:p-6">
        <RoleSidebar role={user.role} user={user} onLogout={logout} chatMode={false} />
        <main className="min-w-0 pb-4 sm:pb-0">
          <GlobalHeader />
          <div className="space-y-4 sm:space-y-5">
            <Outlet />
          </div>
        </main>
      </div>
    </GroupProvider>
  );
}
