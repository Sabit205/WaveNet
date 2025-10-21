'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, TextField, IconButton, AppBar, Toolbar, Avatar, CircularProgress, keyframes } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallIcon from '@mui/icons-material/Call';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { UserButton, useUser } from '@clerk/nextjs';
import { useSocket } from '@/context/SocketContext';
import { IConversation, IMessage } from '@/app/page';
import { format, isToday, isYesterday } from 'date-fns';

// Define a type for the component's props to satisfy TypeScript's strict rules
interface ChatAreaProps {
  selectedConversation: IConversation | null;
  currentUser: ReturnType<typeof useUser>['user'];
}

// A simple fade-in animation for messages
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ChatArea = ({ selectedConversation, currentUser }: ChatAreaProps) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { socket } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const otherParticipant = selectedConversation?.participants.find(p => p.clerkId !== currentUser?.id);

  // Helper for formatting timestamps
  const formatTimestamp = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'p'); // '4:30 PM'
    if (isYesterday(d)) return `Yesterday at ${format(d, 'p')}`;
    return format(d, 'MMM d, yyyy'); // 'Nov 21, 2023'
  };

  // Logic from Part 1 (bug fix) is included here
  useEffect(() => {
    const fetchAndReadMessages = async () => {
      if (selectedConversation && currentUser) {
        setLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/messages/${selectedConversation._id}`);
          const data = await res.json();
          setMessages(data);
          if (document.hasFocus()) {
            socket?.emit('markAsRead', { conversationId: selectedConversation._id, clerkId: currentUser.id });
          }
        } catch (error) { console.error("Failed to fetch messages", error); } finally { setLoading(false); }
      }
    };
    fetchAndReadMessages();
  }, [selectedConversation, currentUser, socket, API_URL]);

  useEffect(() => {
    if (!socket || !selectedConversation) return;
    socket.emit('joinConversation', selectedConversation._id);
    const handleGetMessage = (message: IMessage) => {
      setMessages((prev) => [...prev, message]);
      if (document.hasFocus()) {
        socket.emit('markAsRead', { conversationId: selectedConversation._id, clerkId: currentUser?.id });
      }
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedConversation || !otherParticipant) return;
    socket?.emit('sendMessage', { conversationId: selectedConversation._id, senderId: currentUser.id, receiverId: otherParticipant.clerkId, text: newMessage });
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
  
  const lastMessage = messages[messages.length - 1];
  const isLastMessageMine = lastMessage?.senderId.clerkId === currentUser?.id;
  const isLastMessageRead = lastMessage?.isRead;

  // -- NEW WELCOME SCREEN --
  if (!selectedConversation) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', textAlign: 'center', p: 3 }}>
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#333" /><path d="M16.5 11.5C16.5 12.33 15.83 13 15 13C14.17 13 13.5 12.33 13.5 11.5C13.5 10.67 14.17 10 15 10C15.83 10 16.5 10.67 16.5 11.5Z" fill="#333" /><path d="M10.5 11.5C10.5 12.33 9.83 13 9 13C8.17 13 7.5 12.33 7.5 11.5C7.5 10.67 8.17 10 9 10C9.83 10 10.5 10.67 10.5 11.5Z" fill="#333" /><path d="M12 17.5C14.33 17.5 16.31 16.04 17.11 14H6.89C7.69 16.04 9.67 17.5 12 17.5Z" fill="#333" /></svg>
        <Typography variant="h5" color="text.primary" sx={{ mt: 2, fontWeight: 500 }}>
          Welcome to WaveNet Messenger
        </Typography>
        <Typography color="text.secondary">
          Select a conversation or find someone to start chatting.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#222' }}>
      <AppBar position="static" color="default" sx={{ backgroundColor: '#1e1e1e', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.5)' }}>
        <Toolbar>
          <Avatar src={otherParticipant?.imageUrl} sx={{ mr: 2 }}>{otherParticipant?.username.charAt(0)}</Avatar>
          <Box><Typography variant="h6">{otherParticipant?.username}</Typography>{isTyping && <Typography variant="caption" sx={{ color: '#44b700' }}>typing...</Typography>}</Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit"><VideocamIcon /></IconButton>
          <IconButton color="inherit"><CallIcon /></IconButton>
          <UserButton afterSignOutUrl="/sign-in" />
        </Toolbar>
      </AppBar>

      {/* -- NEW MESSAGE LIST -- */}
      <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>
        : (
          <Box>
            {isLastMessageMine && isLastMessageRead && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mr: 1, height: '20px' }}>
                    <Typography variant="caption" color="text.secondary">Seen</Typography>
                    <DoneAllIcon fontSize="small" sx={{ color: '#0b93f6', ml: 0.5, mb: '2px' }} />
                </Box>
            )}
            {messages.slice().reverse().map((msg, index) => {
              const isMine = msg.senderId.clerkId === currentUser?.id;
              return (
                <Box key={msg._id || index} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', mb: 1.5, animation: `${fadeIn} 0.3s ease-out` }}>
                  <Box>
                    <Paper sx={{ p: '10px 14px', maxWidth: '500px', borderRadius: isMine ? '20px 20px 5px 20px' : '20px 20px 20px 5px', backgroundColor: isMine ? '#0b93f6' : '#3e3e3e' }}>
                      <Typography sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
                    </Paper>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: isMine ? 'right' : 'left', mt: 0.5, px: 1 }}>
                      {formatTimestamp(msg.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>

      {/* -- NEW INPUT BAR -- */}
      <Paper component="form" onSubmit={handleSendMessage} sx={{ m: 1.5, p: '4px 8px', display: 'flex', alignItems: 'center', borderRadius: '20px', backgroundColor: '#3e3e3e' }}>
        <TextField sx={{ ml: 1, flex: 1, color: '#fff' }} placeholder="Type a message" fullWidth variant="standard" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} InputProps={{ disableUnderline: true, sx: { color: 'white' } }} />
        <IconButton type="submit" color="primary" sx={{ p: '10px' }}><SendIcon /></IconButton>
      </Paper>
    </Box>
  );
};

export default ChatArea;