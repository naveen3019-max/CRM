import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const UnreadContext = createContext();

export function UnreadProvider({ children }) {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Persist to localStorage whenever count changes
  useEffect(() => {
    try {
      localStorage.setItem("verbena_unread_count", String(totalUnreadCount));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [totalUnreadCount]);

  const updateUnreadCount = useCallback((count) => {
    const newCount = Math.max(0, count);
    setTotalUnreadCount(newCount);
  }, []);

  const value = useMemo(
    () => ({
      totalUnreadCount,
      updateUnreadCount
    }),
    [totalUnreadCount, updateUnreadCount]
  );

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnreadCount() {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error("useUnreadCount must be used within UnreadProvider");
  }
  return context;
}
