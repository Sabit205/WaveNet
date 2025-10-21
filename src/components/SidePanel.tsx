'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Badge,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSocket } from '@/context/SocketContext';
import { useUser } from '@clerk/nextjs';
import { IConversation, IUser } from '@/app/page';

interface SidePanelProps {
  conversations: IConversation[];
  onSelectConversation: (conversation: IConversation) => void;
  onCreateAndSelectConversation: (user: IUser) => void;
  selectedConversationId?: string;
}

const SidePanel = ({
  conversations,
  onSelectConversation,
  onCreateAndSelectConversation,
  selectedConversationId,
}: SidePanelProps) => {
  const { onlineUsers } = useSocket();
  const { user: currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const handler = setTimeout(async () => {
      if (searchQuery.trim() !== '' && currentUser) {
        try {
          // Use the environment variable
          const res = await fetch(`${API_URL}/api/users/${currentUser.id}`);
          if (!res.ok) throw new Error('Failed to fetch users');
          
          const allUsers: IUser[] = await res.json();
          
          const filteredUsers = allUsers.filter((u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(filteredUsers);
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsSearching(false);
        }
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, currentUser, API_URL]);

  const getOtherParticipant = (conversation: IConversation) => {
    return conversation.participants.find(p => p.clerkId !== currentUser?.id);
  };

  const handleSelectSearchedUser = (user: IUser) => {
    onCreateAndSelectConversation(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  // The rest of the component's JSX remains the same...
  return (
    <Box sx={{ width: 320, borderRight: '1px solid #333', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Chats</Typography>
        <TextField fullWidth variant="outlined" placeholder="Search or start new chat" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}/>
      </Box>
      <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
        {isSearching ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
          : searchQuery ? (
            searchResults.map((user) => (
              <ListItemButton key={user._id} onClick={() => handleSelectSearchedUser(user)}>
                <ListItemAvatar><Avatar src={user.imageUrl}>{user.username.charAt(0)}</Avatar></ListItemAvatar>
                <ListItemText primary={user.username} secondary="Start new conversation" />
              </ListItemButton>
            ))
          ) : (
            conversations.map((convo) => {
              const otherUser = getOtherParticipant(convo);
              if (!otherUser) return null;
              const lastMessage = convo.messages[0];
              return (
                <ListItemButton key={convo._id} selected={selectedConversationId === convo._id} onClick={() => onSelectConversation(convo)}>
                  <ListItemAvatar>
                    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" sx={{ '& .MuiBadge-dot': { backgroundColor: onlineUsers.includes(otherUser.clerkId) ? '#44b700' : 'grey', boxShadow: `0 0 0 2px #1e1e1e` } }}>
                      <Avatar src={otherUser.imageUrl}>{otherUser.username.charAt(0)}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText primary={otherUser.username} secondary={lastMessage?.text || 'No messages yet'} secondaryTypographyProps={{ noWrap: true, sx: { fontStyle: lastMessage ? 'normal' : 'italic' } }} />
                </ListItemButton>
              );
            })
          )}
        {!isSearching && searchQuery && searchResults.length === 0 && <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>No users found.</Typography>}
        {!searchQuery && conversations.length === 0 && <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>Search for a user to start a conversation.</Typography>}
      </List>
    </Box>
  );
};

export default SidePanel;