import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { sendToAnthropic, ChatMessage } from '@/services/ai';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

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
  const { user } = useAuth();

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

      try {
        const reply = await sendToAnthropic(
          history,
          {
            products,
            cartItems,
            cartTotal: totalPrice,
            userName: user?.phone ?? undefined,
          },
          API_KEY
        );

        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        const errorText =
          err instanceof Error && err.message.includes('API key')
            ? err.message
            : "I'm having trouble connecting right now. Please check your connection and try again.";

        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: errorText,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, products, cartItems, totalPrice, user]
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
