import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';

interface Message {
  _id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ChatMessageProps {
  message: Message;
  isAI: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isAI }) => {
  const navigate = useNavigate();
  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const renderContent = (text: string) => {
    const lines = String(text || '').split('\n');
    const viewTicketLineIndex = lines.findIndex((l) => l.trim().toLowerCase().startsWith('view ticket:'));
    const hasViewTicket = viewTicketLineIndex !== -1;
    let ticketUrl = '';

    if (hasViewTicket) {
      const line = lines[viewTicketLineIndex];
      const match = line.match(urlRegex);
      ticketUrl = match && match[0] ? match[0] : '';
    }

    const contentWithoutLink = hasViewTicket
      ? [...lines.slice(0, viewTicketLineIndex), ...lines.slice(viewTicketLineIndex + 1)].join('\n')
      : text;

    const contentParts = contentWithoutLink.split(urlRegex).map((part, index) =>
      urlRegex.test(part) ? (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 break-all"
        >
          {part}
        </a>
      ) : (
        <span key={`text-${index}`}>{part}</span>
      )
    );

    const handleViewTicket = () => {
      if (!ticketUrl) return;
      try {
        const urlObj = new URL(ticketUrl);
        navigate(urlObj.pathname + urlObj.search + urlObj.hash);
      } catch {
        // Fallback: if it's a relative path or invalid URL string, try navigating directly
        navigate(ticketUrl);
      }
    };

    return (
      <>
        <p className="whitespace-pre-wrap break-words">{contentParts}</p>
        {hasViewTicket && ticketUrl && (
          <div className={`mt-3 ${isAI ? '' : 'text-right'}`}>
            <button
              onClick={handleViewTicket}
              className="inline-flex items-center rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              View Ticket
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <motion.div
        className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
        initial="hidden"
        animate="visible"
        variants={messageVariants}
        transition={{ duration: 0.3 }}
      >
        {isAI && (
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          </div>
        )}
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isAI
              ? 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-bl-sm'
              : 'bg-blue-500 text-white rounded-br-sm'
          }`}
        >
          {renderContent(message.content)}
          {message.timestamp && (
            <p className={`text-xs mt-1 ${isAI ? 'text-gray-500' : 'text-blue-100'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default ChatMessage;
