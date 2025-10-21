'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, TextField, IconButton, AppBar, Toolbar, Avatar, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallIcon from '@mui/icons-material/Call';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { UserButton, useUser } from '@clerk/nextjs';
import { useSocket } from '@/context/SocketContext';
import { IConversation, IMessage } from '@/app/page';
import { formatRelative } from 'date-fns';

interface ChatAreaProps {
  selectedConversation: IConversation | null;
  currentUser: ReturnType<typeof useUser>['user'];
  // The 'onMessagesRead' prop has been removed from here
}

const ChatArea = ({ selectedConversation, currentUser }: ChatAreaProps) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { socket } = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const otherParticipant = selectedConversation?.participants.find(p => p.clerkId !== currentUser?.id);

  useEffect(() => {
    const fetchAndReadMessages = async () => {
      if (selectedConversation && currentUser) {
        setLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/messages/${selectedConversation._id}`);
          const data = await res.json();
          setMessages(data);
          socket?.emit('markAsRead', { conversationId: selectedConversation._id, clerkId: currentUser.id });
        } catch (error) {
          console.error("Failed to fetch messages", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAndReadMessages();
  }, [selectedConversation, currentUser, socket, API_URL]);

  useEffect(() => {
    if (!socket || !selectedConversation) return;
    socket.emit('joinConversation', selectedConversation._id);
    const handleGetMessage = (message: IMessage) => {
      setMessages((prev) => [...prev, message]);
      socket.emit('markAsRead', { conversationId: selectedConversation._id, clerkId: currentUser?.id });
    };
    const handleUserTyping = ({ isTyping }: { isTyping: boolean }) => { setIsTyping(isTyping); };
    const handleMessagesRead = ({ conversationId }: { conversationId: string }) => {
      if (conversationId === selectedConversation._id) { setMessages(prev => prev.map(msg => ({ ...msg, isRead: true }))); }
    };
    socket.on('getMessage', handleGetMessage);
    socket.on('userTyping', handleUserTyping);
    socket.on('messagesRead', handleMessagesRead);
    return () => {
      socket.off('getMessage', handleGetMessage);
      socket.off('userTyping', handleUserTyping);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [socket, selectedConversation, currentUser]);
  
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedConversation || !otherParticipant) return;
    socket?.emit('sendMessage', { conversationId: selectedConversation._id, senderId: currentUser.id, receiverId: otherParticipant.clerkId, text: newMessage, });
    setNewMessage('');
    socket?.emit('typing', { conversationId: selectedConversation._id, isTyping: false });
    if(typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleTyping = () => {
    if (!socket || !selectedConversation) return;
    socket.emit('typing', { conversationId: selectedConversation._id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: selectedConversation._id, isTyping: false });
    }, 2000);
  };
  
  const getLastMessageByUser = () => {
    const userMessages = messages.filter(msg => msg.senderId.clerkId === currentUser?.id);
    return userMessages[userMessages.length - 1];
  }
  
  if (!selectedConversation) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
        <Typography variant="h5" color="text.secondary" sx={{ mt: 2 }}>WaveNet Messenger</Typography>
        <Typography color="text.secondary">Select a conversation or search for a user to start chatting.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#222' }}>
      <AppBar position="static" color="default" sx={{ backgroundColor: '#1e1e1e' }}>
        <Toolbar>
          <Avatar src={otherParticipant?.imageUrl} sx={{ mr: 2 }}>{otherParticipant?.username.charAt(0)}</Avatar>
          <Box><Typography variant="h6">{otherParticipant?.username}</Typography>{isTyping && <Typography variant="caption" sx={{ color: '#44b700' }}>typing...</Typography>}</Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit"><VideocamIcon /></IconButton>
          <IconButton color="inherit"><CallIcon /></IconButton>
          <UserButton afterSignOutUrl="/sign-in" />
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
        {loading ? <CircularProgress /> : messages.map((msg) => (
          <Box key={msg._id} sx={{ display: 'flex', justifyContent: msg.senderId.clerkId === currentUser?.id ? 'flex-end' : 'flex-start', mb: 2 }}>
            <Box>
              <Paper sx={{ p: 1.5, maxWidth: '500px', backgroundColor: msg.senderId.clerkId === currentUser?.id ? '#0b93f6' : '#3e3e3e' }}>
                <Typography>{msg.text}</Typography>
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: msg.senderId.clerkId === currentUser?.id ? 'right' : 'left', mt: 0.5 }}>
                {formatRelative(new Date(msg.createdAt), new Date())}
              </Typography>
            </Box>
          </Box>
        ))}
        {getLastMessageByUser()?.isRead && (<Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mr: 1}}><Typography variant="caption" color="text.secondary">Seen</Typography><DoneAllIcon fontSize="small" sx={{ color: '#0b93f6', ml: 0.5 }} /></Box>)}
        <div ref={scrollRef} />
      </Box>
      <Paper component="form" onSubmit={handleSendMessage} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', m: 1, backgroundColor: '#3e3e3e' }}>
        <TextField sx={{ ml: 1, flex: 1 }} placeholder="Type a message" fullWidth variant="standard" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} InputProps={{ disableUnderline: true }} />
        <IconButton type="submit" color="primary" sx={{ p: '10px' }}><SendIcon /></IconButton>
      </Paper>
    </Box>
  );
};

export default ChatArea;