import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus } from "lucide-react";
import apiClient from "../services/apiClient";
import { useGroup } from "../context/GroupContext";
import { CreateGroupModal } from "./CreateGroupModal.jsx";

export function GroupList({ scope, onOpenChats, onScopeChange, scopeOptions = [] }) {
  const {
    groups,
    selectedGroupId,
    setSelectedGroupId,
    groupUnreadCounts,
    updateGroups,
    addGroup,
    setIsLoadingGroups,
    error,
  } = useGroup();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setIsLoadingGroups(true);
        const response = await apiClient.get("/groups");
        updateGroups(response.data.data || []);
      } catch (err) {
        console.error("Failed to load groups:", err);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroups();
  }, [updateGroups, setIsLoadingGroups]);

  const scopeLabels = {
    custom: "Custom Group",
    sales_customer: "Sales + Customers",
    sales_vendor: "Sales + Vendors",
    sales_electrician: "Sales + Electricians",
    vendor_customer: "Vendors + Customers",
    vendor_electrician: "Vendors + Electricians",
    vendor_field_work: "Vendors + Field Work",
    customer_electrician: "Customers + Electricians",
    admin_sales: "Admin + Sales",
    admin_vendor: "Admin + Vendors",
    admin_electrician: "Admin + Electricians",
    admin_field_work: "Admin + Field Work"
  };

  const handleCreatedGroup = useCallback(
    (createdGroup) => {
      if (!createdGroup) return;
      addGroup(createdGroup);
      setSelectedGroupId(String(createdGroup.id));
    },
    [addGroup, setSelectedGroupId]
  );

  return (
    <div className="flex flex-col h-full">
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreatedGroup}
      />

      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Groups</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenChats}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
            >
              Chats
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              title="Create group"
            >
              <Plus size={18} className="text-blue-600" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">Your groups</p>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-50 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No groups yet</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(String(group.id))}
                className={`w-full text-left p-3 rounded-lg transition ${
                  String(selectedGroupId) === String(group.id)
                    ? "bg-blue-100 border-l-4 border-blue-600"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {group.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>{group.memberCount || 0} members</span>
                      <span>•</span>
                      <span>{scopeLabels[group.scope] || group.scope || "Custom"}</span>
                    </div>
                  </div>
                  {groupUnreadCounts[group.id] > 0 && (
                    <div className="ml-2 flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {groupUnreadCounts[group.id]}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
