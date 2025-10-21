'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@clerk/nextjs';

const SocketContext = createContext<{ socket: Socket | null, onlineUsers: string[] }>({ socket: null, onlineUsers: [] });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      // Use the environment variable for the backend URL
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL!;
      const newSocket = io(backendUrl);
      
      setSocket(newSocket);

      newSocket.emit('addNewUser', user.id);

      newSocket.on('getOnlineUsers', (users: string[]) => {
        setOnlineUsers(users);
      });

      // Cleanup on component unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};