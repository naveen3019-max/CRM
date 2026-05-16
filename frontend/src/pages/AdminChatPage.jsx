import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  classifyMessage,
  formatRoleLabel,
  parseLocationText,
  parseRequirementItems,
  parseScheduleText,
  summarizeMessage,
  getMessageDisplayText,
  sortMessagesChronologically
} from "../components/chatMessageUtils.js";
import { RealtimeCRMChat } from "../components/RealtimeCRMChat.jsx";
import { GroupChatPage } from "./GroupChatPage.jsx";
import { GroupList } from "../components/GroupList.jsx";
import { useGroup } from "../context/GroupContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { connectChatSocket } from "../services/socketClient.js";
import { useTranslation } from "react-i18next";

const ADMIN_CHAT_ROLES = ["customer", "sales", "vendor", "electrician", "field_work", "service_professional"];

const ROLE_BY_SCOPE = {
  admin_customer: "customer",
  admin_sales: "sales",
  admin_vendor: "vendor",
  admin_electrician: "electrician",
  admin_field_work: "field_work",
  admin_service_professional: "service_professional"
};

export default function AdminChatPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { selectedGroupId } = useGroup();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");
  const stateScope = location.state?.scope;
  const stateRole = ROLE_BY_SCOPE[stateScope] || null;
  const initialRole = stateRole || (requestedRole && ADMIN_CHAT_ROLES.includes(requestedRole) ? requestedRole : "vendor");
  const initialUserId = searchParams.get("userId") || "";
  const initialConversationId = location.state?.targetConversationId || null;
  const [chatMode, setChatMode] = useState("contacts");

  const [users, setUsers] = useState([]);
  const [chatRole, setChatRole] = useState(initialRole);
  const [chatUserId, setChatUserId] = useState(initialUserId);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState("");
  const [contactSignals, setContactSignals] = useState({});
  const [presenceByUser, setPresenceByUser] = useState({});
  const [showTyping, setShowTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const conversationIdByKeyRef = useRef(new Map());
  const conversationRequestRef = useRef(0);
  const socketMessageHandlerRef = useRef(null);
  const socketTypingHandlerRef = useRef(null);
  const socketPresenceSnapshotHandlerRef = useRef(null);
  const socketPresenceUpdateHandlerRef = useRef(null);
  const initialConversationLoadedRef = useRef(false);

  const chatCandidates = useMemo(() => users, [users]);

  const selectedChatUser = useMemo(
    () => chatCandidates.find((entry) => String(entry.id) === String(chatUserId)) || null,
    [chatCandidates, chatUserId]
  );

  const hasSelectedCandidate = useMemo(
    () => chatCandidates.some((entry) => String(entry.id) === String(chatUserId)),
    [chatCandidates, chatUserId]
  );

  const scopeByRole = {
    customer: "admin_customer",
    sales: "admin_sales",
    vendor: "admin_vendor",
    electrician: "admin_electrician",
    field_work: "admin_field_work",
    service_professional: "admin_service_professional"
  };

  const roleTabs = [
    { label: t("chat.customerRole"), value: "customer" },
    { label: t("chat.salesRole"), value: "sales" },
    { label: t("chat.vendorRole"), value: "vendor" },
    { label: t("chat.electricianRole"), value: "electrician" },
    { label: t("chat.fieldWorkRole"), value: "field_work" },
    { label: t("chat.serviceProRole"), value: "service_professional" }
  ];

  const groupScopeOptions = [
    { label: t("chat.adminSalesGroup"), value: "admin_sales" },
    { label: t("chat.adminVendorsGroup"), value: "admin_vendor" },
    { label: t("chat.adminElectriciansGroup"), value: "admin_electrician" },
    { label: t("chat.adminFieldWorkGroup"), value: "admin_field_work" },
    { label: t("chat.adminServiceProsGroup"), value: "admin_service_professional" }
  ];

  const activeScope = scopeByRole[chatRole];

  useEffect(() => {
    const incomingScope = location.state?.scope;
    const mappedRole = ROLE_BY_SCOPE[incomingScope];
    if (mappedRole && mappedRole !== chatRole) {
      setChatRole(mappedRole);
    }
  }, [chatRole, location.state?.scope]);

  useEffect(() => {
    setUsers([]);
    setChatUserId("");
    setConversationId(null);
    setMessages([]);
    setChatLoading(false);
    setChatError("");

    let isDisposed = false;
    const abortController = new AbortController();

    async function loadUsers() {
      if (!token) {
        return;
      }

      try {
        const usersResponse = await apiClient.get("/chat/contacts", {
          ...withAuth(token),
          params: {
            scope: activeScope
          },
          signal: abortController.signal
        });
        if (!isDisposed) {
          setUsers(usersResponse.data.data || []);
        }
      } catch (error) {
        if (!isDisposed && error?.code !== "ERR_CANCELED") {
          setUsers([]);
        }
      }
    }

    loadUsers();

    return () => {
      isDisposed = true;
      abortController.abort();
    };
  }, [token, activeScope]);

  useEffect(() => {
    if (!chatCandidates.length) {
      setChatUserId("");
      setConversationId(null);
      setMessages([]);
      return;
    }

    const existing = chatCandidates.some((entry) => String(entry.id) === String(chatUserId));
    if (!existing) {
      setChatUserId(String(chatCandidates[0].id));
    }
  }, [chatCandidates, chatUserId]);

  useEffect(() => {
    let isDisposed = false;

    // Clear old state immediately when switching contacts
    if (chatUserId) {
      setConversationId(null);
      setMessages([]);
      setChatError("");
    }

    async function loadMessages() {
      if (!chatUserId || !activeScope || !hasSelectedCandidate || !token) {
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

        const mapped = sortMessagesChronologically(messagesResponse.data.data || [])
          .map((message) => ({
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

    loadMessages();

    return () => {
      isDisposed = true;
    };
  }, [activeScope, chatUserId, hasSelectedCandidate, token, user.id]);

  useEffect(() => {
    const nextParams = chatUserId
      ? {
          role: chatRole,
          userId: chatUserId
        }
      : {
          role: chatRole
        };

    setSearchParams(nextParams, { replace: true });
  }, [chatRole, chatUserId, setSearchParams]);

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
    if (!selectedChatUser) {
      setShowTyping(false);
      return;
    }

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [chatUserId, selectedChatUser]);

  // Handle direct conversation loading from search navigation
  useEffect(() => {
    if (!initialConversationId || initialConversationLoadedRef.current || !token) {
      return;
    }

    let isDisposed = false;
    initialConversationLoadedRef.current = true;

    async function loadDirectConversation() {
      const requestId = ++conversationRequestRef.current;
      setChatLoading(true);
      setChatError("");

      try {
        // Try to fetch messages directly (messages endpoint enforces access)
        const messagesResponse = await apiClient.get(`/chat/conversations/${initialConversationId}/messages`, withAuth(token));

        if (isDisposed || requestId !== conversationRequestRef.current) {
          return;
        }

        const mapped = sortMessagesChronologically(messagesResponse.data.data || [])
          .map((message) => ({
            ...message,
            isMine: Number(message.senderId) === Number(user.id)
          }));

        setConversationId(initialConversationId);
        setMessages(mapped);

        // Resolve counterpart user id: prefer conversation list lookup, fallback to messages
        try {
          const convListResp = await apiClient.get('/chat/conversations', withAuth(token));
          const convs = Array.isArray(convListResp.data.data) ? convListResp.data.data : [];
          const found = convs.find((c) => Number(c.id) === Number(initialConversationId));
          if (found) {
            const low = Number(found.participantLowId);
            const high = Number(found.participantHighId);
            const counterpartId = low === Number(user.id) ? high : low;
            setChatUserId(String(counterpartId));
          } else if (mapped.length) {
            const first = mapped[0];
            const counterpartId = Number(first.senderId) === Number(user.id) ? Number(first.receiverId) : Number(first.senderId);
            setChatUserId(String(counterpartId));
          }
        } catch (err) {
          // ignore; we already have messages
        }
      } catch (error) {
        if (isDisposed || requestId !== conversationRequestRef.current || error?.code === "ERR_CANCELED") {
          return;
        }

        setConversationId(null);
        setMessages([]);
        setChatError(
          error?.response?.status === 404
            ? "Conversation not found."
            : error?.response?.status === 403
            ? "You don't have permission to access this conversation."
            : "Unable to load conversation."
        );
      } finally {
        if (!isDisposed && requestId === conversationRequestRef.current) {
          setChatLoading(false);
        }
      }
    }

    loadDirectConversation();

    return () => {
      isDisposed = true;
    };
  }, [initialConversationId, token, user.id]);

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
        // replace existing message if present, otherwise append
        let found = false;
        const next = prev.map((m) => {
          if (String(m.id) === incomingId) {
            found = true;
            return {
              ...m,
              ...incomingMessage,
              id: incomingId,
              isMine: Number(incomingMessage.senderId) === Number(user.id)
            };
          }
          return m;
        });

        if (found) return next;

        return sortMessagesChronologically([
          ...prev,
          {
            ...incomingMessage,
            id: incomingId,
            isMine: Number(incomingMessage.senderId) === Number(user.id)
          }
        ]);
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

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:presence:snapshot", handlePresenceSnapshot);
      socket.off("chat:presence:update", handlePresenceUpdate);
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
  }, [chatUserId, conversationId, token, user.id]);

  const handleSendMessage = async (text, attachmentPreviewUrl, attachmentFile, attachmentKind) => {
    if (!chatUserId || sendingMessage) {
      return;
    }

    const normalizedText = text.trim();
    if (!normalizedText && !attachmentFile) {
      return;
    }

    setSendingMessage(true);
    setChatError("");

    try {
      let response;
      if (attachmentFile) {
        const formData = new FormData();
        formData.append("scope", activeScope);
        formData.append("receiverId", String(Number(chatUserId)));
        if (normalizedText) {
          formData.append("message", normalizedText);
        }
        formData.append("image", attachmentFile);
        response = await apiClient.post("/chat/messages", formData, withAuth(token));
      } else {
        response = await apiClient.post(
          "/chat/messages",
          {
            scope: activeScope,
            receiverId: Number(chatUserId),
            message: normalizedText
          },
          withAuth(token)
        );
      }

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
    } catch {
      setChatError("Message could not be sent.");
    } finally {
      setSendingMessage(false);
    }
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

  const contactsForUi = useMemo(
    () =>
      chatCandidates.map((candidate) => {
        const candidateId = String(candidate.id);
        const signal = contactSignals[candidateId] || {};
        const isActive = String(chatUserId) === candidateId;
        const presence = presenceByUser[candidateId];
        const now = Date.now();
        const signalTs = signal.timestamp ? new Date(signal.timestamp).valueOf() : 0;
        const isOnlineNow = Boolean(signalTs && now - signalTs <= 2 * 60 * 1000);

        return {
          ...candidate,
          lastMessagePreview:
            signal.preview ||
            (isActive
              ? t("chat.conversationReady")
              : t("chat.messageContactToCoordinate", { name: candidate.name.split(" ")[0] })),
          lastMessageAt: signal.timestamp || candidate.createdAt,
          unreadCount: signal.unreadCount ?? candidate.unreadCount ?? 0,
          statusText: presence?.isOnline ? t("chat.activeNow") : isOnlineNow ? t("chat.activeNow") : t("chat.lastSeenRecently")
        };
      }),
    [chatCandidates, chatUserId, contactSignals, presenceByUser]
  );

  const infoStrip = useMemo(() => {
    const reversedMessages = [...messages].reverse();
    const locationMessage = reversedMessages.find((entry) => classifyMessage(entry) === "location");
    const scheduleMessage = reversedMessages.find((entry) => classifyMessage(entry) === "schedule");
    const requirementMessage = reversedMessages.find((entry) => classifyMessage(entry) === "requirement");
    const preferredLang = user?.preferredLanguage || null;

    return {
      location: locationMessage
        ? parseLocationText(getMessageDisplayText(locationMessage, preferredLang))
        : selectedChatUser
          ? t("chat.projectLocationPending", { name: selectedChatUser.name })
          : t("chat.locationNotShared"),
      schedule: scheduleMessage
        ? parseScheduleText(getMessageDisplayText(scheduleMessage, preferredLang))
        : t("chat.noVisitScheduled"),
      requirement: requirementMessage
        ? parseRequirementItems(getMessageDisplayText(requirementMessage, preferredLang))[0]
        : selectedChatUser
          ? t("chat.coordinateWithRole", { role: formatRoleLabel(selectedChatUser.role) })
          : t("chat.requirementPending")
    };
  }, [messages, selectedChatUser]);

  const typingLabel =
    showTyping && selectedChatUser ? `${formatRoleLabel(selectedChatUser.role)} is typing...` : "";

  return (
    <section className="h-full min-h-0 bg-slate-50">
      {chatMode === "groups" ? (
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <GroupList
              scope={activeScope}
              onOpenChats={() => setChatMode("contacts")}
              onScopeChange={(nextScope) => {
                const nextRole = nextScope.replace("admin_", "");
                if (ADMIN_CHAT_ROLES.includes(nextRole)) {
                  setChatRole(nextRole);
                }
              }}
              scopeOptions={groupScopeOptions}
            />
          </div>

          <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selectedGroupId ? (
              <GroupChatPage groupId={selectedGroupId} />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-slate-500">
                <div className="max-w-sm">
                  <p className="text-base font-semibold text-slate-800">{t("chat.pickAGroup")}</p>
                  <p className="mt-2 text-sm">{t("chat.chooseGroupHint")}</p>
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
          roleTabs={roleTabs}
          activeRoleTab={chatRole}
          onRoleTabChange={setChatRole}
          messages={messages}
          currentUserId={user.id}
          onSend={handleSendMessage}
          disabledComposer={!selectedChatUser || chatLoading}
          isSending={sendingMessage}
          isLoading={chatLoading}
          error={chatError}
          infoStrip={infoStrip}
          typingLabel={typingLabel}
          onTypingChange={handleTypingChange}
          onOpenGroups={() => setChatMode("groups")}
        />
      )}
    </section>
  );
}
