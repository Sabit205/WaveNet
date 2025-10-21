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
import { IConversation, IUser } from '@/app/page'; // Assuming types are exported from page.tsx

// Define the types for the component's props
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

  // This effect handles the user search functionality.
  // It waits for 500ms after the user stops typing before sending a request.
  useEffect(() => {
    // Clear results if the search bar is empty
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const searchDelay = setTimeout(async () => {
      if (searchQuery.trim() !== '' && currentUser) {
        try {
          // Fetch all users (excluding self) and filter on the client side
          const res = await fetch(`${API_URL}/api/users/${currentUser.id}`);
          if (!res.ok) throw new Error('Failed to fetch users');
          
          const allUsers: IUser[] = await res.json();
          
          const filteredUsers = allUsers.filter((u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(filteredUsers);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]); // Clear results on error
        } finally {
          setIsSearching(false);
        }
      }
    }, 500); // 500ms debounce delay

    // Cleanup function to cancel the timeout if the component unmounts or the query changes
    return () => clearTimeout(searchDelay);
  }, [searchQuery, currentUser, API_URL]);

  // Helper function to find the other participant in a 1-on-1 conversation
  const getOtherParticipant = (conversation: IConversation) => {
    return conversation.participants.find(p => p.clerkId !== currentUser?.id);
  };

  // When a user is selected from the search results, this function is called
  const handleSelectSearchedUser = (user: IUser) => {
    onCreateAndSelectConversation(user);
    // Clear the search bar and results after selection
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <Box
      sx={{
        width: 320,
        borderRight: '1px solid #333',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e1e1e', // Dark background for the panel
      }}
    >
      {/* Header and Search Bar */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Chats
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* List Area: Displays search results or existing conversations */}
      <List sx={{ overflowY: 'auto', flexGrow: 1, p: 1 }}>
        {isSearching ? (
          // Show a spinner while searching
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : searchQuery ? (
          // If there's a search query, show search results
          searchResults.map((user) => (
            <ListItemButton key={user._id} onClick={() => handleSelectSearchedUser(user)} sx={{ borderRadius: '8px' }}>
              <ListItemAvatar>
                <Avatar src={user.imageUrl}>{user.username.charAt(0)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.username}
                secondary="Start new conversation"
              />
            </ListItemButton>
          ))
        ) : (
          // Otherwise, show the list of existing conversations
          conversations.map((convo) => {
            const otherUser = getOtherParticipant(convo);
            if (!otherUser) return null; // Safety check

            const lastMessage = convo.messages[0]; // Backend sends last message first
            const isSelected = selectedConversationId === convo._id;

            return (
              <ListItemButton
                key={convo._id}
                selected={isSelected}
                onClick={() => onSelectConversation(convo)}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: '#0b93f6', // Blue background when selected
                    '&:hover': { backgroundColor: '#0a84e0' },
                  },
                  '&:hover': {
                    backgroundColor: '#333', // Darker background on hover
                  },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    sx={{
                      '& .MuiBadge-dot': {
                        backgroundColor: onlineUsers.includes(otherUser.clerkId)
                          ? '#44b700' // Green for online
                          : 'grey',     // Grey for offline
                        boxShadow: `0 0 0 2px #1e1e1e`, // Creates a border around the dot
                      },
                    }}
                  >
                    <Avatar src={otherUser.imageUrl}>
                      {otherUser.username.charAt(0)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={otherUser.username}
                  secondary={lastMessage?.text || 'No messages yet'}
                  primaryTypographyProps={{
                    color: isSelected ? '#fff' : 'text.primary', // White text when selected
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                    fontStyle: lastMessage ? 'normal' : 'italic',
                  }}
                />
              </ListItemButton>
            );
          })
        )}
        
        {/* Empty States */}
        {!isSearching && searchQuery && searchResults.length === 0 && (
          <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>
            No users found.
          </Typography>
        )}
        {!searchQuery && conversations.length === 0 && (
          <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>
            Search for a user to start a conversation.
          </Typography>
        )}
      </List>
    </Box>
  );
};

export default SidePanel;