'use client';
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import SidePanel from '@/components/SidePanel';
import ChatArea from '@/components/ChatArea';
import { useUser } from '@clerk/nextjs';

export interface IUser {
  _id: string;
  clerkId: string;
  username: string;
  imageUrl: string;
}

export interface IMessage {
  _id: string;
  senderId: IUser;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface IConversation {
  _id: string;
  participants: IUser[];
  messages: IMessage[];
}

export default function Home() {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<IConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoaded } = useUser();
  
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (isLoaded && user) {
      const fetchConversations = async () => {
        try {
          const res = await fetch(`${API_URL}/api/conversations/${user.id}`);
          const data = await res.json();
          setConversations(data);
        } catch (error) {
          console.error("Failed to fetch conversations", error);
        } finally {
          setLoading(false);
        }
      };
      fetchConversations();
    }
  }, [user, isLoaded, API_URL]);

  const handleCreateAndSelectConversation = async (otherUser: IUser) => {
    if (!user) return;

    try {
      const res = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderClerkId: user.id,
          receiverClerkId: otherUser.clerkId
        }),
      });
      const newOrExistingConversation = await res.json();
      
      if (!conversations.some(c => c._id === newOrExistingConversation._id)) {
        setConversations(prev => [newOrExistingConversation, ...prev]);
      }
      
      setSelectedConversation(newOrExistingConversation);
    } catch (error) {
      console.error("Failed to create or fetch conversation", error);
    }
  };

  // ** The 'updateConversationInList' function is no longer needed and can be removed **

  if (!isLoaded || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Chats...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <SidePanel
        conversations={conversations}
        onSelectConversation={setSelectedConversation}
        onCreateAndSelectConversation={handleCreateAndSelectConversation}
        selectedConversationId={selectedConversation?._id}
      />
      <ChatArea
        key={selectedConversation?._id}
        selectedConversation={selectedConversation}
        currentUser={user}
        // ** The 'onMessagesRead' prop has been removed from here **
      />
    </Box>
  );
}