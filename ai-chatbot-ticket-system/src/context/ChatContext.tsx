import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import API_BASE_URL from "../config/api";

// Types
interface Message {
  _id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

interface Chat {
  _id: string;
  userId: string;
  messages: Message[];
  escalatedToTicket: boolean;
  ticketId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  loading: boolean;
  error: string | null;
  sendMessage: (
    message: string,
    chatId?: string,
  ) => Promise<{
    chat: Chat;
    escalated: boolean;
    ticketId?: string;
    ticketConfirmationRequired?: boolean;
  }>;
  loadChat: (chatId: string) => Promise<void>;
  loadUserChats: () => Promise<void>;
  clearCurrentChat: () => void;
  deleteAllChats: () => Promise<void>;
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, token } = useAuth();

  // Load user chats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserChats();
    }
  }, [isAuthenticated]);

  const sendMessage = async (message: string, chatId?: string) => {
    setLoading(true);
    setError(null);

    const tempMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setCurrentChat((prevChat) => {
      if (!prevChat) {
        return {
          _id: "temp",
          userId: "",
          messages: [tempMessage],
          escalatedToTicket: false,
          ticketId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return {
        ...prevChat,
        messages: [...prevChat.messages, tempMessage],
      };
    });

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/chat/message`,
        {
          message,
          chatId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.data.success) {
        const updatedChat = res.data.data.chat;
        
        // Filter out low-quality AI responses
        const filteredMessages = updatedChat.messages.filter((msg: Message) => {
          if (msg.role === 'assistant') {
            const content = msg.content.toLowerCase();
            
            // Don't save if response indicates inability to help
            const isLowQuality = 
              content.includes('conversation requires escalation to human agent') ||
              content.includes("i can't fully assist with your request") ||
              content.includes('try asking a different question') ||
              content.includes('contacting support by filing a ticket') ||
              content.includes('escalation to human agent') ||
              content.includes('cannot assist with your request') ||
              content.includes('please contact support');
            
            return !isLowQuality;
          }
          return true; // Keep user messages and system messages
        });
        
        // Only update chat if there are messages after filtering
        if (filteredMessages.length > 0) {
          const chatWithFilteredMessages = {
            ...updatedChat,
            messages: filteredMessages
          };
          
          setCurrentChat(chatWithFilteredMessages);

          setChats((prevChats) => {
            const existingChatIndex = prevChats.findIndex(
              (chat) => chat._id === chatWithFilteredMessages._id,
            );

            if (existingChatIndex >= 0) {
              const newChats = [...prevChats];
              newChats[existingChatIndex] = chatWithFilteredMessages;
              return newChats;
            } else {
              return [chatWithFilteredMessages, ...prevChats];
            }
          });
        }

        return {
          chat: updatedChat,
          escalated: res.data.data.escalated,
          ticketId: res.data.data.ticketId,
          ticketConfirmationRequired: res.data.data.ticketConfirmationRequired,
        };
      }

      throw new Error("Failed to send message");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Error sending message";
      setError(errorMessage);

      setCurrentChat((prevChat) => {
        if (!prevChat) return null;
        return {
          ...prevChat,
          messages: prevChat.messages.filter((msg) => msg !== tempMessage),
        };
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load a specific chat
  const loadChat = async (chatId: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API_BASE_URL}/api/chat/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setCurrentChat(res.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Error loading chat";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load all user chats
  const loadUserChats = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API_BASE_URL}/api/chat`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setChats(res.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Error loading chats";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear current chat
  const clearCurrentChat = () => {
    setCurrentChat(null);
  };

  const deleteAllChats = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.delete(`${API_BASE_URL}/api/chat/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setChats([]);
        setCurrentChat(null);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Error deleting chats";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        loading,
        error,
        sendMessage,
        loadChat,
        loadUserChats,
        clearCurrentChat,
        deleteAllChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook for using chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
