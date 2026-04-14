import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "../components/ChatPanel.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { connectChatSocket } from "../services/socketClient.js";

export default function AdminChatPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [chatRole, setChatRole] = useState("vendor");
  const [chatUserId, setChatUserId] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState("");

  const chatCandidates = useMemo(() => users, [users]);

  const selectedChatUser = useMemo(
    () => chatCandidates.find((entry) => String(entry.id) === String(chatUserId)) || null,
    [chatCandidates, chatUserId]
  );

  const scopeByRole = {
    sales: "admin_sales",
    vendor: "admin_vendor",
    electrician: "admin_electrician",
    field_work: "admin_field_work"
  };
  const activeScope = scopeByRole[chatRole];

  useEffect(() => {
    async function loadUsers() {
      try {
        const usersResponse = await apiClient.get("/chat/contacts", {
          ...withAuth(token),
          params: {
            scope: activeScope
          }
        });
        setUsers(usersResponse.data.data);
      } catch {
        setUsers([]);
      }
    }

    loadUsers();
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
    async function loadMessages() {
      if (!chatUserId) {
        return;
      }

      setChatLoading(true);
      setChatError("");

      try {
        const conversationResponse = await apiClient.post(
          "/chat/conversations",
          {
            scope: activeScope,
            otherUserId: Number(chatUserId)
          },
          withAuth(token)
        );

        const nextConversationId = conversationResponse.data.data.id;
        setConversationId(nextConversationId);
        const messagesResponse = await apiClient.get(`/chat/conversations/${nextConversationId}/messages`, withAuth(token));

        const mapped = messagesResponse.data.data.map((message) => ({
          ...message,
          isMine: Number(message.senderId) === Number(user.id)
        }));

        setMessages(mapped);
      } catch {
        setConversationId(null);
        setMessages([]);
        setChatError("Unable to load chat history right now.");
      } finally {
        setChatLoading(false);
      }
    }

    loadMessages();
  }, [activeScope, chatUserId, token, user.id]);

  useEffect(() => {
    if (!token || !conversationId) {
      return;
    }

    const socket = connectChatSocket(token);
    if (!socket) {
      return;
    }

    const handleIncomingMessage = (incomingMessage) => {
      if (Number(incomingMessage.conversationId) !== Number(conversationId)) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((entry) => Number(entry.id) === Number(incomingMessage.id))) {
          return prev;
        }

        return [
          ...prev,
          {
            ...incomingMessage,
            isMine: Number(incomingMessage.senderId) === Number(user.id)
          }
        ];
      });
    };

    socket.on("chat:message", handleIncomingMessage);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
    };
  }, [conversationId, token, user.id]);

  const handleSendMessage = async (text, imageDataUrl, imageFile) => {
    if (!chatUserId || sendingMessage) {
      return;
    }

    const normalizedText = text.trim();
    if (!normalizedText && !imageDataUrl) {
      return;
    }

    setSendingMessage(true);
    setChatError("");

    try {
      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append("scope", activeScope);
        formData.append("receiverId", String(Number(chatUserId)));
        if (normalizedText) {
          formData.append("message", normalizedText);
        }
        formData.append("image", imageFile);
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
        if (prev.some((entry) => Number(entry.id) === Number(message.id))) {
          return prev;
        }

        return [
          ...prev,
          {
            ...message,
            isMine: true,
            imageDataUrl: imageDataUrl || undefined,
            imageUrl: message.imageUrl || undefined
          }
        ];
      });
    } catch {
      setChatError("Message could not be sent.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="glass-panel px-4 py-4 sm:px-5">
        <h2 className="font-heading text-xl font-semibold text-slate-800">Admin Chat</h2>
        <p className="text-sm text-slate-500">Direct communication with sales, vendors, electricians, and field work</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="glass-panel p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role Filter</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setChatRole("sales")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                chatRole === "sales"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => setChatRole("vendor")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                chatRole === "vendor"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Vendor
            </button>
            <button
              type="button"
              onClick={() => setChatRole("electrician")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                chatRole === "electrician"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Electrician
            </button>
            <button
              type="button"
              onClick={() => setChatRole("field_work")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                chatRole === "field_work"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Field Work
            </button>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
          <div className="mt-2 max-h-[38vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[58vh]">
            {chatCandidates.length ? (
              chatCandidates.map((candidate) => {
                const isActive = String(candidate.id) === String(chatUserId);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setChatUserId(String(candidate.id))}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isActive ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-slate-800">{candidate.name}</p>
                    <p className="truncate text-xs text-slate-500">{candidate.email}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{candidate.role}</p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">
                No users found for selected role.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-3">
          <div className="glass-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversation</p>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedChatUser ? selectedChatUser.name : "Select a contact"}
                </p>
                <p className="text-xs text-slate-500">{selectedChatUser ? selectedChatUser.email : "No active contact"}</p>
              </div>
              {selectedChatUser ? (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
              ) : null}
            </div>
          </div>

          {chatError ? <p className="text-sm text-red-500">{chatError}</p> : null}
          {chatLoading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}

          <ChatPanel
            title={selectedChatUser ? `Chat with ${selectedChatUser.name}` : "Admin Chat"}
            subtitle={
              selectedChatUser
                ? `Direct channel with ${selectedChatUser.role}`
                : "Select a contact from the left to start messaging"
            }
            emptyMessage="No messages in this conversation yet."
            messages={messages}
            onSend={handleSendMessage}
            disabled={!selectedChatUser || chatLoading}
            isSending={sendingMessage}
            containerClassName="h-[62vh] min-h-[320px] sm:h-[68vh] lg:min-h-[460px]"
          />
        </div>
      </div>
    </section>
  );
}
