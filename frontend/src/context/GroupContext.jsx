import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

const GroupContext = createContext();

export function GroupProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupMessages, setGroupMessages] = useState({});
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [error, setError] = useState(null);

  const updateGroupMessages = useCallback((groupId, messages) => {
    setGroupMessages((prev) => ({
      ...prev,
      [groupId]: messages,
    }));
  }, []);

  const addGroupMessage = useCallback((groupId, message) => {
    setGroupMessages((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), message],
    }));
  }, []);

  const updateGroupUnreadCount = useCallback((groupId, count) => {
    setGroupUnreadCounts((prev) => ({
      ...prev,
      [groupId]: count,
    }));
  }, []);

  const updateGroups = useCallback((newGroups) => {
    setGroups(newGroups);
  }, []);

  const addGroup = useCallback((group) => {
    setGroups((prev) => [group, ...prev]);
  }, []);

  const removeGroup = useCallback((groupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
  }, [selectedGroupId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      groups,
      selectedGroupId,
      setSelectedGroupId,
      groupMessages,
      updateGroupMessages,
      addGroupMessage,
      groupUnreadCounts,
      updateGroupUnreadCount,
      updateGroups,
      addGroup,
      removeGroup,
      isLoadingGroups,
      setIsLoadingGroups,
      error,
      setError,
      clearError,
    }),
    [
      groups,
      selectedGroupId,
      groupMessages,
      groupUnreadCounts,
      isLoadingGroups,
      error,
      updateGroupMessages,
      addGroupMessage,
      updateGroupUnreadCount,
      updateGroups,
      addGroup,
      removeGroup,
      clearError,
    ]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error("useGroup must be used within GroupProvider");
  }
  return context;
}
