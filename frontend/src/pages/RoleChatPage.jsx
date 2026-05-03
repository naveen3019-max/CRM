import { useEffect, useMemo, useRef, useState } from "react";
import {
  classifyMessage,
  formatRoleLabel,
  parseLocationText,
  parseRequirementItems,
  parseScheduleText,
  summarizeMessage
} from "../components/chatMessageUtils.js";
import { RealtimeCRMChat } from "../components/RealtimeCRMChat.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useGroup } from "../context/GroupContext.jsx";
import { GroupChatPage } from "./GroupChatPage.jsx";
import { GroupList } from "../components/GroupList.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { connectChatSocket } from "../services/socketClient.js";

const chatConfigByRole = {
  sales: {
    title: "Sales Chat",
    subtitle: "Manage customer conversations and lead follow-ups",
    scopes: [
      { label: "Customers", value: "sales_customer" },
      { label: "Vendors", value: "sales_vendor" },
      { label: "Electricians", value: "sales_electrician" },
      { label: "Admin", value: "admin_sales" }
    ]
  },
  customer: {
    title: "Customer Chat",
    subtitle: "Talk to support and track your service requests",
    scopes: [
      { label: "Sales", value: "sales_customer" },
      { label: "Vendors", value: "vendor_customer" },
      { label: "Electricians", value: "customer_electrician" }
    ]
  },
  vendor: {
    title: "Vendor Chat",
    subtitle: "Coordinate dispatch updates with operations",
    scopes: [
      { label: "Electricians", value: "vendor_electrician" },
      { label: "Field Work", value: "vendor_field_work" },
      { label: "Admin", value: "admin_vendor" }
    ]
  },
  electrician: {
    title: "Field Coordination Chat",
    subtitle: "Share updates and completion proofs with operations",
    scopes: [
      { label: "Sales", value: "sales_electrician" },
      { label: "Customers", value: "customer_electrician" },
      { label: "Vendors", value: "vendor_electrician" },
      { label: "Admin", value: "admin_electrician" }
    ]
  },
  field_work: {
    title: "Field Work Chat",
    subtitle: "Send on-site updates to the operations desk",
    scopes: [
      { label: "Vendors", value: "vendor_field_work" },
      { label: "Admin", value: "admin_field_work" }
    ]
  }
};

export default function RoleChatPage({ role }) {
  const { token, user } = useAuth();
  const { selectedGroupId } = useGroup();
  const config = chatConfigByRole[role] || chatConfigByRole.customer;
  const scopeOptions = config.scopes || [{ label: "Contacts", value: config.scope }];
  const [activeScope, setActiveScope] = useState(scopeOptions[0]?.value || config.scope);
  const [chatMode, setChatMode] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [chatUserId, setChatUserId] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState("");
  const [contactSignals, setContactSignals] = useState({});
  const [presenceByUser, setPresenceByUser] = useState({});
  const [showTyping, setShowTyping] = useState(false);
  const [pinnedRefreshKey, setPinnedRefreshKey] = useState(0);
  const typingTimerRef = useRef(null);
  const conversationIdByKeyRef = useRef(new Map());
  const conversationRequestRef = useRef(0);
  const socketMessageHandlerRef = useRef(null);
  const socketTypingHandlerRef = useRef(null);
  const socketPresenceSnapshotHandlerRef = useRef(null);
  const socketPresenceUpdateHandlerRef = useRef(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => String(contact.id) === String(chatUserId)) || null,
    [contacts, chatUserId]
  );

  const hasSelectedContact = useMemo(
    () => contacts.some((contact) => String(contact.id) === String(chatUserId)),
    [contacts, chatUserId]
  );

  useEffect(() => {
    setActiveScope(scopeOptions[0]?.value || config.scope);
  }, [role]);

  useEffect(() => {
    setContacts([]);
    setChatUserId("");
    setConversationId(null);
    setMessages([]);
    setChatLoading(false);
    setChatError("");

    let isDisposed = false;
    const abortController = new AbortController();

    async function loadContacts() {
      if (!token) {
        return;
      }

      try {
        const response = await apiClient.get("/chat/contacts", {
          ...withAuth(token),
          params: {
            scope: activeScope
          },
          signal: abortController.signal
        });
        if (!isDisposed) {
          setContacts(response.data.data || []);
        }
      } catch (error) {
        if (!isDisposed && error?.code !== "ERR_CANCELED") {
          setContacts([]);
          setChatError("Unable to load chat contacts right now.");
        }
      }
    }

    loadContacts();

    return () => {
      isDisposed = true;
      abortController.abort();
    };
  }, [activeScope, token]);

  useEffect(() => {
    if (!contacts.length) {
      setChatUserId("");
      setConversationId(null);
      setMessages([]);
      return;
    }

    const existing = contacts.some((contact) => String(contact.id) === String(chatUserId));
    if (!existing) {
      setChatUserId(String(contacts[0].id));
    }
  }, [contacts, chatUserId]);

  useEffect(() => {
    if (!chatUserId || !messages.length) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    setContactSignals((previous) => ({
      ...previous,
      [chatUserId]: {
        preview: summarizeMessage(latestMessage),
        timestamp: latestMessage.createdAt,
        unreadCount: 0
      }
    }));
  }, [messages, chatUserId]);

  useEffect(() => {
    if (!selectedContact) {
      setShowTyping(false);
      return;
    }

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [chatUserId, selectedContact]);

  useEffect(() => {
    let isDisposed = false;

    // Clear old state immediately when switching contacts
    if (chatUserId) {
      setConversationId(null);
      setMessages([]);
      setChatError("");
    }

    async function loadConversation() {
      if (!chatUserId || !activeScope || !hasSelectedContact || !token) {
        return;
      }

      const requestId = ++conversationRequestRef.current;
      const conversationKey = `${activeScope}:${chatUserId}`;

      setChatLoading(true);
      setChatError("");

      try {
        let nextConversationId = conversationIdByKeyRef.current.get(conversationKey);
        if (!nextConversationId) {
          const conversationResponse = await apiClient.post(
            "/chat/conversations",
            {
              scope: activeScope,
              otherUserId: Number(chatUserId)
            },
            withAuth(token)
          );

          nextConversationId = conversationResponse.data.data.id;
          conversationIdByKeyRef.current.set(conversationKey, nextConversationId);
        }

        if (isDisposed || requestId !== conversationRequestRef.current) {
          return;
        }

        setConversationId(nextConversationId);

        const messagesResponse = await apiClient.get(`/chat/conversations/${nextConversationId}/messages`, withAuth(token));

        if (isDisposed || requestId !== conversationRequestRef.current) {
          return;
        }

        const mapped = messagesResponse.data.data.map((message) => ({
          ...message,
          isMine: Number(message.senderId) === Number(user.id)
        }));

        setMessages(mapped);
      } catch (error) {
        if (isDisposed || requestId !== conversationRequestRef.current || error?.code === "ERR_CANCELED") {
          return;
        }

        if (error?.response?.status === 404 || error?.response?.status === 403) {
          conversationIdByKeyRef.current.delete(conversationKey);
        }

        setConversationId(null);
        setMessages([]);
        setChatError(
          error?.response?.status === 429
            ? "Too many chat requests right now. Please wait a few seconds and try again."
            : error?.response?.status === 403
            ? "You don't have permission to chat with this contact in this scope."
            : "Unable to load chat history right now."
        );
      } finally {
        if (!isDisposed && requestId === conversationRequestRef.current) {
          setChatLoading(false);
        }
      }
    }

    loadConversation();

    return () => {
      isDisposed = true;
    };
  }, [chatUserId, activeScope, hasSelectedContact, token, user.id]);

  useEffect(() => {
    if (!token || !conversationId) {
      return;
    }

    const socket = connectChatSocket(token);
    if (!socket) {
      return;
    }

    if (socketMessageHandlerRef.current) {
      socket.off("chat:message", socketMessageHandlerRef.current);
    }

    if (socketTypingHandlerRef.current) {
      socket.off("chat:typing", socketTypingHandlerRef.current);
    }

    if (socketPresenceSnapshotHandlerRef.current) {
      socket.off("chat:presence:snapshot", socketPresenceSnapshotHandlerRef.current);
    }

    if (socketPresenceUpdateHandlerRef.current) {
      socket.off("chat:presence:update", socketPresenceUpdateHandlerRef.current);
    }

    const handleIncomingMessage = (incomingMessage) => {
      const senderId = Number(incomingMessage.senderId);
      const receiverId = Number(incomingMessage.receiverId);
      const isMine = senderId === Number(user.id);
      const counterpartId = String(isMine ? receiverId : senderId);
      const isCurrentConversation = Number(incomingMessage.conversationId) === Number(conversationId);

      setContactSignals((previous) => {
        const existing = previous[counterpartId] || {};
        const unreadCount = !isMine && String(chatUserId) !== counterpartId ? Number(existing.unreadCount || 0) + 1 : Number(existing.unreadCount || 0);

        return {
          ...previous,
          [counterpartId]: {
            ...existing,
            preview: summarizeMessage(incomingMessage),
            timestamp: incomingMessage.createdAt,
            unreadCount
          }
        };
      });

      if (!isCurrentConversation) {
        return;
      }

      if (!isMine) {
        setShowTyping(false);
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      }

      setMessages((prev) => {
        const incomingId = String(incomingMessage.id);
        if (prev.some((entry) => String(entry.id) === incomingId)) {
          return prev;
        }

        return [
          ...prev,
          {
            ...incomingMessage,
            id: incomingId,
            isMine: Number(incomingMessage.senderId) === Number(user.id)
          }
        ];
      });
    };

    const handleTyping = ({ fromUserId, conversationId: typingConversationId, isTyping }) => {
      const isActiveUser = String(fromUserId) === String(chatUserId);
      const isActiveConversation = Number(typingConversationId) === Number(conversationId);
      if (!isActiveUser || !isActiveConversation) {
        return;
      }

      if (!isTyping) {
        setShowTyping(false);
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        return;
      }

      setShowTyping(true);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = setTimeout(() => {
        setShowTyping(false);
        typingTimerRef.current = null;
      }, 1800);
    };

    const handlePresenceSnapshot = ({ onlineUserIds }) => {
      const nextPresence = {};
      for (const id of onlineUserIds || []) {
        nextPresence[String(id)] = {
          isOnline: true,
          lastSeen: null
        };
      }
      setPresenceByUser(nextPresence);
    };

    const handlePresenceUpdate = ({ userId, isOnline, lastSeen }) => {
      const key = String(userId);
      setPresenceByUser((previous) => ({
        ...previous,
        [key]: {
          isOnline: Boolean(isOnline),
          lastSeen: isOnline ? null : lastSeen || new Date().toISOString()
        }
      }));
    };

    socketMessageHandlerRef.current = handleIncomingMessage;
    socketTypingHandlerRef.current = handleTyping;
    socketPresenceSnapshotHandlerRef.current = handlePresenceSnapshot;
    socketPresenceUpdateHandlerRef.current = handlePresenceUpdate;
    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:presence:snapshot", handlePresenceSnapshot);
    socket.on("chat:presence:update", handlePresenceUpdate);

    const handleMessagePinned = (payload) => {
      if (Number(payload.conversationId) === Number(conversationId)) {
        setPinnedRefreshKey((previous) => previous + 1);
        refreshConversationMessages();
      }
    };

    const handleMessageUnpinned = (payload) => {
      if (Number(payload.conversationId) === Number(conversationId)) {
        setPinnedRefreshKey((previous) => previous + 1);
        refreshConversationMessages();
      }
    };

    socket.on("messagePinned", handleMessagePinned);
    socket.on("messageUnpinned", handleMessageUnpinned);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:presence:snapshot", handlePresenceSnapshot);
      socket.off("chat:presence:update", handlePresenceUpdate);
      socket.off("messagePinned", handleMessagePinned);
      socket.off("messageUnpinned", handleMessageUnpinned);
      if (socketMessageHandlerRef.current === handleIncomingMessage) {
        socketMessageHandlerRef.current = null;
      }
      if (socketTypingHandlerRef.current === handleTyping) {
        socketTypingHandlerRef.current = null;
      }
      if (socketPresenceSnapshotHandlerRef.current === handlePresenceSnapshot) {
        socketPresenceSnapshotHandlerRef.current = null;
      }
      if (socketPresenceUpdateHandlerRef.current === handlePresenceUpdate) {
        socketPresenceUpdateHandlerRef.current = null;
      }
    };
  }, [chatUserId, conversationId, refreshConversationMessages, token, user.id]);

  const handleSend = (text, attachmentPreviewUrl, attachmentFile, attachmentKind) => {
    if (!chatUserId || sendingMessage) {
      return;
    }

    const normalizedText = text.trim();
    if (!normalizedText && !attachmentFile) {
      return;
    }

    setSendingMessage(true);
    setChatError("");

    const sendRequest = attachmentFile
      ? (() => {
          const formData = new FormData();
          formData.append("scope", activeScope);
          formData.append("receiverId", String(Number(chatUserId)));
          if (normalizedText) {
            formData.append("message", normalizedText);
          }
          formData.append("image", attachmentFile);
          return apiClient.post("/chat/messages", formData, withAuth(token));
        })()
      : apiClient.post(
          "/chat/messages",
          {
            scope: activeScope,
            receiverId: Number(chatUserId),
            message: normalizedText
          },
          withAuth(token)
        );

    sendRequest
      .then((response) => {
        const message = response.data.data;
        setMessages((prev) => {
          const messageId = String(message.id);
          if (prev.some((entry) => String(entry.id) === messageId)) {
            return prev;
          }

          const isAudioAttachment =
            attachmentKind === "audio" || Boolean(attachmentFile && String(attachmentFile.type || "").startsWith("audio/"));

          return [
            ...prev,
            {
              ...message,
              id: messageId,
              isMine: true,
              imageDataUrl: !isAudioAttachment ? attachmentPreviewUrl || undefined : undefined,
              audioDataUrl: isAudioAttachment ? attachmentPreviewUrl || undefined : undefined,
              imageUrl: message.imageUrl || undefined,
              audioUrl: isAudioAttachment ? message.imageUrl || undefined : undefined
            }
          ];
        });
      })
      .catch(() => {
        setChatError("Message could not be sent.");
      })
      .finally(() => {
        setSendingMessage(false);
      });
  };

  const handleTypingChange = (isTyping) => {
    if (!token || !conversationId || !chatUserId) {
      return;
    }

    const socket = connectChatSocket(token);
    if (!socket) {
      return;
    }

    socket.emit("chat:typing", {
      toUserId: Number(chatUserId),
      conversationId: Number(conversationId),
      isTyping: Boolean(isTyping)
    });
  };

  const refreshConversationMessages = useCallback(async () => {
    if (!token || !conversationId || !chatUserId) {
      return;
    }

    try {
      const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
        ...withAuth(token),
        params: { _ts: Date.now() }
      });
      const mappedMessages = response.data.data.map((message) => ({
        ...message,
        isMine: Number(message.senderId) === Number(user.id)
      }));
      setMessages(mappedMessages);
    } catch {
      // Keep the current thread visible if refresh fails.
    }
  }, [chatUserId, conversationId, token, user.id]);

  const handleMessagePinStateChanged = useCallback(
    async (messageId, pinned) => {
      setMessages((previous) =>
        previous.map((message) =>
          String(message.id) === String(messageId)
            ? {
                ...message,
                pinned: pinned ? 1 : 0,
                pinnedAt: pinned ? new Date().toISOString() : null
              }
            : message
        )
      );

      setPinnedRefreshKey((previous) => previous + 1);
      await refreshConversationMessages();
    },
    [refreshConversationMessages]
  );

  const roleTabs = scopeOptions.map((scopeOption) => ({
    label: scopeOption.label,
    value: scopeOption.value
  }));

  const contactsForUi = useMemo(
    () =>
      contacts.map((contact) => {
        const contactId = String(contact.id);
        const signal = contactSignals[contactId] || {};
        const isActive = contactId === String(chatUserId);
        const presence = presenceByUser[contactId];
        const now = Date.now();
        const signalTs = signal.timestamp ? new Date(signal.timestamp).valueOf() : 0;
        const isOnlineNow = Boolean(signalTs && now - signalTs <= 2 * 60 * 1000);

        return {
          ...contact,
          lastMessagePreview:
            signal.preview ||
            (isActive ? "Conversation ready" : `Message ${contact.name.split(" ")[0]} to continue coordination`),
          lastMessageAt: signal.timestamp || contact.createdAt,
          unreadCount: signal.unreadCount ?? contact.unreadCount ?? 0,
          statusText: presence?.isOnline ? "Active now" : isOnlineNow ? "Active now" : "Last seen recently"
        };
      }),
    [contacts, contactSignals, chatUserId, presenceByUser]
  );

  const infoStrip = useMemo(() => {
    const reversedMessages = [...messages].reverse();
    const locationMessage = reversedMessages.find((entry) => classifyMessage(entry) === "location");
    const scheduleMessage = reversedMessages.find((entry) => classifyMessage(entry) === "schedule");
    const requirementMessage = reversedMessages.find((entry) => classifyMessage(entry) === "requirement");

    return {
      location: locationMessage
        ? parseLocationText(locationMessage.messageBody)
        : selectedContact
          ? `Project location pending for ${selectedContact.name}`
          : "Location not shared",
      schedule: scheduleMessage
        ? parseScheduleText(scheduleMessage.messageBody)
        : "No visit scheduled",
      requirement: requirementMessage
        ? parseRequirementItems(requirementMessage.messageBody)[0]
        : selectedContact
          ? `Coordinate with ${formatRoleLabel(selectedContact.role)}`
          : "Requirement pending"
    };
  }, [messages, selectedContact]);

  const typingLabel = showTyping && selectedContact ? `${formatRoleLabel(selectedContact.role)} is typing...` : "";

  return (
    <section className="h-full min-h-0 bg-slate-50">
      {chatMode === "groups" ? (
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <GroupList
              scope={activeScope}
              onOpenChats={() => setChatMode("contacts")}
              onScopeChange={setActiveScope}
              scopeOptions={scopeOptions}
            />
          </div>

          <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selectedGroupId ? (
              <GroupChatPage groupId={selectedGroupId} />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-slate-500">
                <div className="max-w-sm">
                  <p className="text-base font-semibold text-slate-800">Pick a group</p>
                  <p className="mt-2 text-sm">
                    Choose a group from the left panel or create a new one to start the conversation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <RealtimeCRMChat
          contacts={contactsForUi}
          activeContactId={chatUserId}
          onSelectContact={setChatUserId}
          roleTabs={roleTabs.length > 1 ? roleTabs : []}
          activeRoleTab={activeScope}
          onRoleTabChange={setActiveScope}
          messages={messages}
          currentUserId={user.id}
          onSend={handleSend}
          disabledComposer={!selectedContact || chatLoading}
          isSending={sendingMessage}
          isLoading={chatLoading}
          error={chatError}
          infoStrip={infoStrip}
          typingLabel={typingLabel}
          conversationId={conversationId}
          pinnedRefreshKey={pinnedRefreshKey}
          onMessagePinStateChanged={handleMessagePinStateChanged}
          onTypingChange={handleTypingChange}
          onOpenGroups={() => setChatMode("groups")}
        />
      )}
    </section>
  );
}
