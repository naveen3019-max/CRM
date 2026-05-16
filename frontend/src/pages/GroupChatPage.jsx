import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader, AlertCircle, Users, Settings, Pin } from "lucide-react";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";
import { connectChatSocket } from "../services/socketClient";
import { MessagePinMenu } from "../components/MessagePinMenu.jsx";
import { PinnedMessagesPanel } from "../components/PinnedMessagesPanel.jsx";
import {
  classifyMessage,
  parseLocationText,
  parseRequirementItems,
  parseScheduleText,
  parseServiceRequestMessage,
  summarizeMessage,
  getMessageDisplayText,
  sanitizeMessageText,
  sortMessagesChronologically
} from "../components/chatMessageUtils.js";

export function GroupChatPage({ groupId }) {
  const { user, token } = useAuth();
  const { groupMessages, updateGroupMessages, addGroupMessage } = useGroup();
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(groupId));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [typingLabel, setTypingLabel] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [pinnedStateByMessageId, setPinnedStateByMessageId] = useState({});
  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const typingTimerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const refreshPinnedMessages = useCallback(async () => {
    if (!groupId || !token) return;

    try {
      const response = await apiClient.get(`/groups/${groupId}/pinned`, {
        params: { _ts: Date.now() }
      });
      setPinnedMessages(response.data.data || []);
    } catch {
      setPinnedMessages([]);
    }
  }, [groupId, token]);

  // Load group info and members
  useEffect(() => {
    if (!groupId || !token) return;

    setIsLoading(true);
    setPinnedStateByMessageId({});

    const loadGroupInfo = async () => {
      try {
        setIsLoading(true);
        const [infoRes, membersRes, messagesRes] = await Promise.all([
          apiClient.get(`/groups/${groupId}`),
          apiClient.get(`/groups/${groupId}/members`),
          apiClient.get(`/groups/${groupId}/messages?limit=50&offset=0`, {
            params: { _ts: Date.now() }
          }),
        ]);

        const orderedMessages = sortMessagesChronologically(messagesRes.data.data || []);
        setGroupInfo(infoRes.data.data);
        setMembers(membersRes.data.data || []);
        setMessages(orderedMessages);
        updateGroupMessages(groupId, orderedMessages);
        await refreshPinnedMessages();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load group");
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupInfo();
  }, [groupId, token, updateGroupMessages, refreshPinnedMessages]);

  useEffect(() => {
    if (!highlightedMessageId) return;

    const target = document.getElementById(`group-message-${highlightedMessageId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timer = window.setTimeout(() => setHighlightedMessageId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [highlightedMessageId, messages]);

  // Connect socket
  useEffect(() => {
    if (!groupId || !token) return;

    socket.current = connectChatSocket(token);

    socket.current.emit("join:group", { groupId: Number(groupId) });

    const handleGroupMessage = (payload) => {
      if (String(payload.groupId) === String(groupId)) {
        const resolvedText = getMessageDisplayText(payload);
        const nextMessage = {
          id: payload.id || Date.now(),
          groupId: payload.groupId,
          senderId: payload.senderId,
          senderName: payload.senderName,
          messageBody: payload.originalMessage || payload.message || resolvedText,
          originalMessage: payload.originalMessage || payload.message || resolvedText,
          imageUrl: payload.imageUrl,
          createdAt: payload.timestamp || new Date().toISOString(),
        };

        setMessages((previous) => sortMessagesChronologically([...previous, nextMessage]));
        addGroupMessage(groupId, nextMessage);
      }
    };

    const handleTyping = (payload) => {
      if (String(payload.groupId) !== String(groupId)) {
        return;
      }

      if (String(payload.userId) === String(user?.id)) {
        return;
      }

      const typingMember = members.find((member) => String(member.id) === String(payload.userId));
      setTypingLabel(typingMember ? `${typingMember.name} is typing...` : "Someone is typing...");

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = window.setTimeout(() => {
        setTypingLabel("");
      }, 1600);
    };

    socket.current.on("group:message", handleGroupMessage);
    socket.current.on("group:user:typing", handleTyping);
    socket.current.on("messagePinned", (payload) => {
      if (String(payload.groupId) === String(groupId)) {
        refreshPinnedMessages();
      }
    });
    socket.current.on("messageUnpinned", (payload) => {
      if (String(payload.groupId) === String(groupId)) {
        refreshPinnedMessages();
      }
    });

    return () => {
      if (socket.current) {
        socket.current.emit("leave:group", { groupId: Number(groupId) });
        socket.current.off("group:message", handleGroupMessage);
        socket.current.off("group:user:typing", handleTyping);
        socket.current.off("messagePinned");
        socket.current.off("messageUnpinned");
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [groupId, token, addGroupMessage, members, user?.id, refreshPinnedMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();

      if (!messageInput.trim()) return;

      setIsSending(true);
      try {
        const response = await apiClient.post(`/groups/${groupId}/messages`, {
          message: messageInput.trim(),
          imageUrl: null,
        });

        const apiMessage = response.data.data || {};
        const newMessage = {
          ...apiMessage,
          id: apiMessage.id,
          groupId,
          senderId: apiMessage.senderId || user?.id,
          senderName: apiMessage.senderName || user?.name,
          messageBody: apiMessage.originalMessage || apiMessage.message || messageInput.trim(),
          originalMessage: apiMessage.originalMessage || apiMessage.message || messageInput.trim(),
          imageUrl: apiMessage.imageUrl || null,
          createdAt: apiMessage.createdAt || new Date().toISOString(),
        };

        setMessages((previous) => sortMessagesChronologically([...previous, newMessage]));
        addGroupMessage(groupId, newMessage);
        setMessageInput("");
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to send message");
      } finally {
        setIsSending(false);
      }
    },
    [groupId, messageInput, user?.id, user?.name, addGroupMessage]
  );

  const handleMessageChange = useCallback(
    (event) => {
      setMessageInput(event.target.value);

      if (!token || !groupId) {
        return;
      }

      const socketInstance = connectChatSocket(token);
      if (!socketInstance) {
        return;
      }

      socketInstance.emit("group:typing", {
        groupId: Number(groupId),
        isTyping: Boolean(event.target.value.trim())
      });
    },
    [groupId, token]
  );

  const handlePinMessage = useCallback(
    async (message) => {
      try {
        await apiClient.post("/chat/pin-message", { messageId: Number(message.id) });
        const pinnedAt = new Date().toISOString();
        const pinnedMessage = {
          ...message,
          pinned: 1,
          pinnedAt
        };
        setPinnedStateByMessageId((previous) => ({ ...previous, [String(message.id)]: true }));
        setMessages((previous) =>
          previous.map((entry) =>
            String(entry.id) === String(message.id)
              ? { ...entry, pinned: 1, pinnedAt }
              : entry
          )
        );
        setPinnedMessages((previous) =>
          previous.some((entry) => String(entry.id) === String(message.id))
            ? previous.map((entry) => (String(entry.id) === String(message.id) ? pinnedMessage : entry))
            : [pinnedMessage, ...previous]
        );
        await refreshPinnedMessages();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to pin message");
      }
    },
    [refreshPinnedMessages]
  );

  const handleUnpinMessage = useCallback(
    async (message) => {
      try {
        await apiClient.post("/chat/unpin-message", { messageId: Number(message.id) });
        setPinnedStateByMessageId((previous) => ({ ...previous, [String(message.id)]: false }));
        setMessages((previous) =>
          previous.map((entry) =>
            String(entry.id) === String(message.id)
              ? { ...entry, pinned: 0, pinnedAt: null }
              : entry
          )
        );
        setPinnedMessages((previous) => previous.filter((entry) => String(entry.id) !== String(message.id)));
        await refreshPinnedMessages();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to unpin message");
      }
    },
    [refreshPinnedMessages]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <AlertCircle size={32} className="mr-2" />
        <span>Group not found</span>
      </div>
    );
  }

  const displayMessages = messages.length > 0 ? messages : (groupMessages[groupId] || []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{groupInfo.name}</h2>
          <p className="text-sm text-gray-500">{members.length} members</p>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <Users size={20} className="text-gray-600" />
        </button>
      </div>

      {pinnedMessages.length ? (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPinnedPanelOpen((previous) => !previous)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">📌 Pinned Messages</p>
              <p className="truncate text-sm text-slate-700">{summarizeMessage(pinnedMessages[0])}</p>
            </button>
            <button
              type="button"
              onClick={() => setPinnedPanelOpen(true)}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white"
            >
              View All
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="mx-4 mt-2 p-2 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {displayMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  id={`group-message-${msg.id}`}
                  className={`group flex ${
                    msg.senderId === user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`relative max-w-xs px-4 py-2 rounded-lg ${
                      String(highlightedMessageId) === String(msg.id) ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-white" : ""
                    } ${
                      msg.senderId === user?.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {(() => {
                      const isPinnedMessage =
                        pinnedStateByMessageId[String(msg.id)] !== undefined
                          ? Boolean(pinnedStateByMessageId[String(msg.id)])
                          : Number(msg.pinned) === 1;

                      return isPinnedMessage ? (
                        <div
                          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
                            msg.senderId === user?.id ? "border-white/30 bg-white/20 text-white" : "border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          <Pin className="h-3 w-3" aria-hidden="true" />
                          Pinned
                        </div>
                      ) : null;
                    })()}

                    <div className="absolute right-1 top-1 z-10 opacity-100 transition">
                      <MessagePinMenu
                        isPinned={Boolean(msg.pinned)}
                        onPin={() => handlePinMessage(msg)}
                        onUnpin={() => handleUnpinMessage(msg)}
                      />
                    </div>

                    {msg.senderId !== user?.id && (
                      <p className="mb-1 text-xs font-semibold opacity-75">{msg.senderName}</p>
                    )}
                    {(() => {
                      const preferredLang = user?.preferredLanguage || null;
                      const displayText = getMessageDisplayText(msg, preferredLang);
                      const messageType = classifyMessage(msg);
                      const parsedServiceRequest = messageType === "service_request" ? parseServiceRequestMessage(displayText) : null;

                      if (messageType === "audio") {
                        return (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold opacity-80">Voice message</p>
                            {displayText ? <p className="break-words whitespace-pre-wrap text-sm leading-6">{displayText}</p> : null}
                          </div>
                        );
                      }

                      if (messageType === "service_request" && parsedServiceRequest) {
                        return (
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">New Service Request</p>
                              <p className="mt-0.5 text-sm font-semibold text-slate-900">{parsedServiceRequest.service || "Request details"}</p>
                            </div>
                            <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                              {parsedServiceRequest.requestId ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request ID</p><p className="text-sm text-slate-800">{parsedServiceRequest.requestId}</p></div> : null}
                              {parsedServiceRequest.customer ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Customer</p><p className="text-sm text-slate-800">{parsedServiceRequest.customer}</p></div> : null}
                              {parsedServiceRequest.location ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Location</p><p className="text-sm text-slate-800">{parsedServiceRequest.location}</p></div> : null}
                              {parsedServiceRequest.priority ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Priority</p><p className="text-sm text-slate-800">{parsedServiceRequest.priority}</p></div> : null}
                            </div>
                            <div className="space-y-2 border-t border-slate-200 px-3 py-3 text-sm text-slate-700">
                              {parsedServiceRequest.problem ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Problem</p><p className="mt-1 whitespace-pre-wrap leading-6">{parsedServiceRequest.problem}</p></div> : null}
                              {parsedServiceRequest.expectedSolution ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Expected Solution</p><p className="mt-1 whitespace-pre-wrap leading-6">{parsedServiceRequest.expectedSolution}</p></div> : null}
                              {parsedServiceRequest.requirementDetails ? <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirement Details</p><p className="mt-1 whitespace-pre-wrap leading-6">{parsedServiceRequest.requirementDetails}</p></div> : null}
                            </div>
                            <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {parsedServiceRequest.schedule ? <span><strong>Schedule:</strong> {parsedServiceRequest.schedule}</span> : null}
                                {parsedServiceRequest.budget ? <span><strong>Budget:</strong> {parsedServiceRequest.budget}</span> : null}
                                {parsedServiceRequest.attachments ? <span><strong>Attachments:</strong> {parsedServiceRequest.attachments}</span> : null}
                              </div>
                              {parsedServiceRequest.action ? <div className="mt-1 font-medium text-slate-600">{parsedServiceRequest.action}</div> : null}
                            </div>
                          </div>
                        );
                      }

                      return displayText ? (
                        <p className="break-words whitespace-pre-wrap text-sm leading-6">{displayText}</p>
                      ) : null;
                    })()}
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="message"
                        className="mt-2 max-w-48 rounded"
                      />
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        msg.senderId === user?.id
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            {typingLabel ? <p className="mb-2 text-xs font-medium text-blue-600">{typingLabel}</p> : null}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={handleMessageChange}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSending || !messageInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {isSending ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-48 border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Members</h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="p-2 hover:bg-gray-100 rounded">
                    <p className="text-sm font-medium text-gray-900">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.role} {member.memberRole === "admin" && "(Admin)"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <PinnedMessagesPanel
              isOpen={pinnedPanelOpen}
              onClose={() => setPinnedPanelOpen(false)}
              pinnedMessages={pinnedMessages}
              onGoToMessage={(messageId) => {
                setPinnedPanelOpen(false);
                setHighlightedMessageId(String(messageId));
              }}
              title={groupInfo?.name ? `${groupInfo.name} Pinned Messages` : "Pinned Messages"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
