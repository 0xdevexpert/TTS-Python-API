
import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

interface JobStatusUpdate {
  job_id: string;
  status: string;
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'https://tts.catacomb.fyi';

export const useWebSocket = (onJobStatusUpdate: (update: JobStatusUpdate) => void) => {
  const { toast } = useToast();
  
  const connect = useCallback(() => {
    const socket: Socket = io(SOCKET_URL, {
      path: '/ws/socket.io',
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "Lost connection to server. Reconnecting..."
      });
    });

    socket.on('job_status_update', (data: JobStatusUpdate) => {
      onJobStatusUpdate(data);
    });

    return socket;
  }, [onJobStatusUpdate, toast]);

  useEffect(() => {
    const socket = connect();
    return () => {
      socket.disconnect();
    };
  }, [connect]);
};
