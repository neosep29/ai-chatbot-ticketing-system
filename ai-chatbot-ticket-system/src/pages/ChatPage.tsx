import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import ChatInterface from '../components/chat/ChatInterface';
import { useChat } from '../context/ChatContext';

const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadChat, currentChat, loading, error } = useChat();
  const [ticketEscalated, setTicketEscalated] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadChat(id);
    }
  }, [id]);
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  const handleEscalation = (ticketId: string) => {
    setTicketEscalated(true);
    // Keep minimal feedback via toast while the main UX is inside the chat bubble
    toast.info('A support ticket has been created for this conversation.');
  };
  
  return (
    <div className="w-full px-0 py-0">
      <div className="flex items-center mb-6">
        <button
          onClick={handleBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Continue Conversation' : 'New Conversation'}
        </h1>
      </div>
      
      {/* Escalation banner is removed; the View Ticket button now appears inside the chat bubble */}
      
      <div className="h-[calc(100vh-6rem)]">
        <ChatInterface chatId={id} onEscalation={handleEscalation} />
      </div>
    </div>
  );
};

export default ChatPage;
