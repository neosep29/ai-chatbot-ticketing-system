import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Menu,
  X,
  Plus,
  Search,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import ChatMessage from "./ChatMessage";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const CHAT_MSG_LIMIT = 1000;

interface ChatInterfaceProps {
  chatId?: string;
  onEscalation?: (ticketId: string) => void;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsDeleting(false);
        onClose();
      }, 1500);
    } catch (error) {
      setIsDeleting(false);
      console.error("Error deleting chats:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={!isDeleting ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-green-100 p-4 rounded-full inline-block mb-4"
            >
              <svg
                className="h-12 w-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Successfully Deleted!
            </h3>
            <p className="text-gray-600">All chats have been removed</p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Delete All Chats
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all chats? This action cannot be
              undone and all your conversation history will be permanently
              removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Deleting...
                  </>
                ) : (
                  "Delete All"
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

interface ConcernItem {
  tag: string;
  concern: string;
  email: string;
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string;
  initialReason?: string;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, chatId, initialReason }) => {
  const { user } = useAuth();
  const { loadChat } = useChat();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [concerns, setConcerns] = useState<ConcernItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedConcern, setSelectedConcern] = useState<string>("");
  const [details, setDetails] = useState<string>(initialReason || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(user?.email || "");
    setName(user?.name || "");
    setDetails(initialReason || "");
    const loadConcerns = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/ticket-concerns`);
        if (res.data?.success) {
          setConcerns(res.data.data || []);
          const tags = Array.from(new Set((res.data.data || []).map((c: ConcernItem) => c.tag).filter(Boolean)));
          const firstTag = tags[0] || "";
          setSelectedTag(firstTag);
          const firstConcern = (res.data.data || []).find((c: ConcernItem) => c.tag === firstTag)?.concern || "";
          setSelectedConcern(firstConcern);
        }
      } catch (error) {
        console.error("Failed to load concerns:", error);
      }
    };
    loadConcerns();
  }, [isOpen, user?.email, user?.name]);

  useEffect(() => {
    const matched = concerns.find(c => c.tag === selectedTag);
    setSelectedConcern(matched?.concern || (selectedTag ? selectedTag : ""));
  }, [selectedTag, concerns]);

  useEffect(() => {
    if (isOpen) {
      setDetails(initialReason || "");
    }
  }, [initialReason, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!chatId) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat/${chatId}/create-ticket`, {
        email,
        name,
        concern: selectedConcern,
        tag: selectedTag,
        details
      });
      if (res.data?.success) {
        await loadChat(chatId);
        toast.success("Ticket submitted successfully");
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to submit ticket");
      }
    } catch (error: any) {
      console.error("Ticket submit error:", error);
      toast.error(error?.response?.data?.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={!submitting ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Confirm Ticket Details
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic/Tag</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from(new Set(concerns.map(c => c.tag).filter(Boolean))).map((tag, idx) => (
                <option key={`${tag}-${idx}`} value={tag}>
                  {tag}
                </option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue / Concern</label>
            <input
              type="text"
              value={selectedConcern}
              onChange={(e) => setSelectedConcern(e.target.value)}
              placeholder="Enter the specific issue or concern"
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Details / Reason</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the main concern. Prefilled with your last message."
              rows={4}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatId,
  onEscalation,
}) => {
  const [message, setMessage] = useState("");
  const {
    currentChat,
    sendMessage,
    loading,
    chats,
    loadChat,
    clearCurrentChat,
    deleteAllChats,
  } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNoDataModal, setShowNoDataModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const lastMessage = (currentChat?.messages || []).length
    ? (currentChat?.messages || [])[(currentChat?.messages || []).length - 1]
    : null;
  const lastAssistantMessage = (() => {
    const msgs = currentChat?.messages || [];
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i]?.role === 'assistant') return msgs[i];
    }
    return null;
  })();
  const lastUserMessage = (() => {
    const msgs = currentChat?.messages || [];
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i]?.role === 'user') return msgs[i];
    }
    return null;
  })();
  const isGreetingText = (text: string) => {
    const t = String(text || '').toLowerCase();
    return (
      /^\s*(hello|hi|hey)\b/.test(t) ||
      t.includes("i'm your ai support assistant") ||
      t.includes("how can i help") ||
      t.includes("what can i assist you") ||
      t.includes("ask me anything")
    );
  };
  const shouldShowSatisfaction =
    Boolean(
      lastAssistantMessage &&
      lastAssistantMessage.role === 'assistant' &&
      !currentChat?.escalatedToTicket &&
      !isGreetingText(lastAssistantMessage.content) &&
      lastUserMessage &&
      !isGreetingText(lastUserMessage.content)
    );

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    const currentMessage = message.trim();
    setMessage("");

    try {
      if (currentMessage.length > CHAT_MSG_LIMIT) {
        toast.error("Message is too long. Please limit to 2000 characters.");
        return;
      }

      const response = await sendMessage(currentMessage, currentChat?._id);

      if (response.ticketConfirmationRequired) {
        setShowTicketModal(true);
      } else {
        if (response.escalated && response.ticketId && onEscalation) {
          onEscalation(response.ticketId);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const chatHistory = chats.map((chat) => ({
    id: chat._id,
    title:
      chat.messages.find((m) => m.role === "user")?.content.substring(0, 50) ||
      "New Chat",
    lastMessage:
      chat.messages[chat.messages.length - 1]?.content.substring(0, 100) || "",
    timestamp: new Date(chat.updatedAt),
  }));

  const filteredChats = chatHistory.filter(
    (chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const displayMessages =
    currentChat?.messages?.filter((msg) => msg.role !== "system") || [];

  return (
        <div className="flex h-full bg-white overflow-hidden">
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 bg-gray-900 text-white flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => {
              setMessage("");
              clearCurrentChat();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Chat
          </button>
        </div>

        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-400 px-3 py-2">
              YOUR CHATS
            </div>

            {filteredChats.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No chats found</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg mb-1 hover:bg-gray-800 transition-colors ${
                    currentChat?._id === chat.id ? "bg-gray-800" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {chat.title}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-1">
                        {chat.lastMessage}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTime(chat.timestamp)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => {
              if (chatHistory.length === 0) {
                setShowNoDataModal(true);
              } else {
                setShowDeleteModal(true);
              }
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <X className="h-4 w-4" />
            Delete All Chats
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-blue-500 text-white p-4 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <div>
            <h2 className="text-xl font-semibold">AI Support Assistant</h2>
            <p className="text-sm opacity-80">
              Ask me anything, and I'll do my best to help you
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-blue-100 p-6 rounded-full mb-4">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <MessageSquareIcon className="h-12 w-12 text-blue-500" />
                  </motion.div>
                </div>
                <h3 className="text-xl font-medium mb-2">
                  How can I help you today?
                </h3>
                <p className="max-w-md">
                  Ask me any questions about our products or services. If I
                  can't answer, I'll create a support ticket for you!
                </p>
              </motion.div>
            </div>
          ) : (
            displayMessages.map((msg, index) => (
              <ChatMessage
                key={msg._id || `${msg.role}-${index}-${msg.timestamp}`}
                message={msg}
                isAI={msg.role === "assistant"}
              />
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center space-x-2 text-gray-500">
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <span className="ml-2 text-sm">AI is typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-0">
          {shouldShowSatisfaction && (
            <div className="bg-yellow-50 border-t border-gray-200 p-4">
              <p className="text-gray-700 font-medium mb-3">Are you satisfied with the support?</p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await sendMessage('yes', currentChat?._id);
                    } catch {}
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  disabled={loading}
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  disabled={loading}
                >
                  No, Create a ticket
                </button>
              </div>
            </div>
          )}
          <div className="p-4">
          <div className="flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-l-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              className={`bg-blue-500 text-white rounded-r-lg p-2 ${
                loading || !message.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-600"
              }`}
              disabled={loading || !message.trim()}
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await deleteAllChats();
          clearCurrentChat();
          setSearchQuery("");
        }}
      />

      <TicketModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        chatId={currentChat?._id}
        initialReason={(currentChat?.messages || []).slice().reverse().find(m => m?.role === 'user')?.content || ''}
      />

      {showNoDataModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowNoDataModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <MessageSquare className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                No Chat History
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              There are no chats to delete. Start a new conversation to begin
              chatting!
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowNoDataModal(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

const MessageSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

export default ChatInterface;
