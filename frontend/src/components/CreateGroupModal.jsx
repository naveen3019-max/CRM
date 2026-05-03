import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { getAvailableUsers } from "../services/availableUsersCache.js";

export function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isDisposed = false;

    async function loadUsers() {
      setIsFetchingUsers(true);
      setError("");

      try {
        const users = await getAvailableUsers(token);
        if (!isDisposed) {
          setAvailableUsers(users);
        }
      } catch (loadError) {
        if (!isDisposed) {
          setError(loadError?.response?.data?.message || "Failed to load available users");
        }
      } finally {
        if (!isDisposed) {
          setIsFetchingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      isDisposed = true;
    };
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setSearch("");
      setMemberIds([]);
      setError("");
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return availableUsers;
    }

    return availableUsers.filter((candidate) => {
      const haystack = `${candidate.name} ${candidate.role} ${candidate.email || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [availableUsers, search]);

  const generatedName = useMemo(() => {
    const roleNames = filteredUsers.map((entry) => entry.role).slice(0, 3);
    const suffix = roleNames.length ? ` (${roleNames.join(", ")})` : "";
    return `Group${suffix}`;
  }, [filteredUsers]);

  const handleToggleMember = (candidateId) => {
    setMemberIds((previous) =>
      previous.includes(candidateId)
        ? previous.filter((id) => id !== candidateId)
        : [...previous, candidateId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const selectedUsers = availableUsers.filter((candidate) => memberIds.includes(candidate.id));
    const resolvedName = name.trim() || generatedName;

    if (!resolvedName) {
      setError("Please enter a group name or select at least one user.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/groups/create", {
        name: resolvedName,
        description: description.trim() || null,
        scope: "custom",
        memberIds: selectedUsers.map((candidate) => candidate.id)
      });

      onCreated?.(response.data?.data);
      onClose();
    } catch (createError) {
      setError(createError?.response?.data?.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">New Group</p>
            <h2 className="text-xl font-semibold text-slate-900">Create a user-first group</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-0 lg:grid-cols-[1.2fr_1fr] h-full">
          <div className="space-y-4 border-b border-slate-200 px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={generatedName}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional group description"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">Members</label>
                <span className="text-xs text-slate-500">{memberIds.length} selected</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                <Search size={16} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people by name or role"
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col px-6 py-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Available users</p>
              {isFetchingUsers ? (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Loading
                </span>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 max-h-[56vh]">
              {filteredUsers.length === 0 ? (
                <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-slate-500">
                  {isFetchingUsers ? "Loading available users..." : "No matching users found"}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((candidate) => {
                    const isSelected = memberIds.includes(candidate.id);

                    return (
                      <label
                        key={candidate.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleMember(candidate.id)}
                          disabled={isLoading}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-900">{candidate.name}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              {candidate.role}
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-500">{candidate.email}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isFetchingUsers}
              >
                {isLoading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
