import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { sendToAI, ChatMessage } from '@/services/ai';
import { generateReply } from '@/services/assistant';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

// Default to the local, on-device assistant (free, instant, no rate limits).
// Set EXPO_PUBLIC_USE_CLOUD_AI=true to use the Gemini Edge Function instead,
// which automatically falls back to the local engine on any error/rate limit.
const USE_CLOUD_AI = process.env.EXPO_PUBLIC_USE_CLOUD_AI === 'true';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: DisplayMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your Allen Eye Care assistant. I can help you find the perfect eyewear, explain lens options, read your prescription, share eye care tips, and more. How can I help you today?",
  timestamp: new Date(),
};

interface AIContextType {
  messages: DisplayMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const { products } = useProducts();
  const { items: cartItems, totalPrice } = useCart();
  const { user, session } = useAuth();

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: DisplayMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      // Build conversation history for the API (skip the static welcome message)
      const history: ChatMessage[] = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: trimmed });

      const ctx = {
        products,
        cartItems,
        cartTotal: totalPrice,
        userName: user?.phone ?? undefined,
      };

      try {
        let reply: string;
        if (USE_CLOUD_AI && session?.access_token) {
          try {
            reply = await sendToAI(history, ctx, session.access_token);
            if (!reply.trim()) reply = generateReply(trimmed, ctx, history);
          } catch {
            // Cloud unavailable or rate-limited → instant local fallback.
            reply = generateReply(trimmed, ctx, history);
          }
        } else {
          // Small delay so the typing indicator reads naturally.
          await new Promise(res => setTimeout(res, 300));
          reply = generateReply(trimmed, ctx, history);
        }

        setMessages(prev => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date() },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, products, cartItems, totalPrice, user, session]
  );

  const clearChat = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
  }, []);

  return (
    <AIContext.Provider value={{ messages, isLoading, sendMessage, clearChat }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
}
