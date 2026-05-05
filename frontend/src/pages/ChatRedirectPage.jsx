import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatRedirectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams();

  useEffect(() => {
    if (!user?.role) {
      return;
    }

    navigate(`/${user.role}/chat`, {
      replace: true,
      state: {
        ...location.state,
        targetConversationId: Number(chatId)
      }
    });
  }, [chatId, location.state, navigate, user?.role]);

  if (!user?.role) {
    return <Navigate to="/" replace />;
  }

  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Opening chat...</div>;
}