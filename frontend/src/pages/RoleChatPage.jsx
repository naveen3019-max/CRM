import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "../components/ChatPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient, { withAuth } from "../services/apiClient";
import { connectChatSocket } from "../services/socketClient.js";

const chatConfigByRole = {
  sales: {
    title: "Sales Chat",
    subtitle: "Manage customer conversations and lead follow-ups",
    scopes: [
      { label: "Customers", value: "sales_customer" },
      { label: "Admin", value: "admin_sales" }
    ]
  },
  customer: {
    title: "Customer Chat",
    subtitle: "Talk to support and track your service requests",
    scope: "sales_customer"
  },
  vendor: {
    title: "Vendor Chat",
    subtitle: "Coordinate dispatch updates with operations",
    scope: "admin_vendor"
  },
  electrician: {
    title: "Field Coordination Chat",
    subtitle: "Share updates and completion proofs with operations",
    scope: "admin_electrician"
  },
  field_work: {
    title: "Field Work Chat",
    subtitle: "Send on-site updates to the operations desk",
    scope: "admin_field_work"
  }
};

export default function RoleChatPage({ role }) {
  const { token, user } = useAuth();
  const config = chatConfigByRole[role] || chatConfigByRole.customer;
  const scopeOptions = config.scopes || [{ label: "Contacts", value: config.scope }];
  const [activeScope, setActiveScope] = useState(scopeOptions[0]?.value || config.scope);
  const [contacts, setContacts] = useState([]);
  const [chatUserId, setChatUserId] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState("");

  const selectedContact = useMemo(
    () => contacts.find((contact) => String(contact.id) === String(chatUserId)) || null,
    [contacts, chatUserId]
  );

  useEffect(() => {
    setActiveScope(scopeOptions[0]?.value || config.scope);
  }, [role]);

  useEffect(() => {
    async function loadContacts() {
      setChatError("");
      try {
        const response = await apiClient.get("/chat/contacts", {
          ...withAuth(token),
          params: {
            scope: activeScope
          }
        });
        setContacts(response.data.data || []);
      } catch {
        setContacts([]);
        setChatError("Unable to load chat contacts right now.");
      }
    }

    loadContacts();
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
    async function loadConversation() {
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

    loadConversation();
  }, [chatUserId, activeScope, token, user.id]);

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

  const handleSend = (text, imageDataUrl, imageFile) => {
    if (!chatUserId || sendingMessage) {
      return;
    }

    const normalizedText = text.trim();
    if (!normalizedText && !imageDataUrl) {
      return;
    }

    setSendingMessage(true);
    setChatError("");

    const sendRequest = imageFile
      ? (() => {
          const formData = new FormData();
          formData.append("scope", activeScope);
          formData.append("receiverId", String(Number(chatUserId)));
          if (normalizedText) {
            formData.append("message", normalizedText);
          }
          formData.append("image", imageFile);
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
      })
      .catch(() => {
        setChatError("Message could not be sent.");
      })
      .finally(() => {
        setSendingMessage(false);
      });
  };

  return (
    <section className="space-y-4">
      <header className="glass-panel px-4 py-4 sm:px-5">
        <h2 className="font-heading text-xl font-semibold text-slate-800">{config.title}</h2>
        <p className="text-sm text-slate-500">{config.subtitle}</p>

        {scopeOptions.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {scopeOptions.map((scopeOption) => {
              const isActive = scopeOption.value === activeScope;
              return (
                <button
                  key={scopeOption.value}
                  type="button"
                  onClick={() => setActiveScope(scopeOption.value)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {scopeOption.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="glass-panel p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversations</p>
          <div className="mt-3 max-h-[38vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[58vh]">
            {contacts.map((contact) => {
              const isActive = String(contact.id) === String(chatUserId);
              const latestMessage = messages.at(-1);
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setChatUserId(String(contact.id))}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{contact.name}</p>
                    <span className="text-[11px] text-slate-400">{contact.role}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{contact.email}</p>
                  <p className="mt-2 truncate text-xs text-slate-500">
                    {latestMessage?.messageBody || "Photo attachment"}
                  </p>
                </button>
              );
            })}

            {!contacts.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">
                No contacts available for this chat scope.
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-3">
          {chatError ? <p className="text-sm text-red-500">{chatError}</p> : null}
          {chatLoading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}

          <ChatPanel
            title={selectedContact ? `Chat with ${selectedContact.name}` : config.title}
            subtitle={selectedContact ? selectedContact.email : config.subtitle}
            messages={messages}
            onSend={handleSend}
            disabled={!selectedContact || chatLoading}
            isSending={sendingMessage}
            emptyMessage="No messages in this conversation yet."
            containerClassName="h-[62vh] min-h-[320px] sm:h-[68vh] lg:min-h-[460px]"
          />
        </div>
      </div>
    </section>
  );
}
