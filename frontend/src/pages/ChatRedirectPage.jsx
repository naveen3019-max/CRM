import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient, { withAuth } from '../services/apiClient';

export default function ChatRedirectPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.role || !token || !chatId) {
      return;
    }

    let isDisposed = false;

    async function resolveConversation() {
      try {
        const response = await apiClient.get(`/chat/conversations/${chatId}`, withAuth(token));
        if (isDisposed) {
          return;
        }

        const conversation = response.data?.data;
        const participantLowId = Number(conversation?.participantLowId);
        const participantHighId = Number(conversation?.participantHighId);
        const currentUserId = Number(user.id);
        const targetUserId = participantLowId === currentUserId ? participantHighId : participantLowId;
        const nextState = {
          ...location.state,
          targetConversationId: Number(chatId),
          targetUserId,
          scope: conversation?.scope || location.state?.scope || ''
        };

        navigate(`/${user.role}/chat`, {
          replace: true,
          state: nextState
        });
      } catch (err) {
        if (!isDisposed) {
          setError(err?.response?.status === 404 ? 'Conversation not found.' : 'Unable to open chat.');
        }
      }
    }

    resolveConversation();

    return () => {
      isDisposed = true;
    };
  }, [chatId, location.state, navigate, token, user?.id, user?.role]);

  if (!user?.role) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-rose-600">{error}</div>;
  }

  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">{t("app.openingChat")}</div>;
}