import { io, type Socket } from 'socket.io-client';
import type { Attachment } from '../types/chat';
import { tokenStorage } from './token';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export interface ServerToClientEvents {
  'conversation:new': (payload: { conversationId: string }) => void;
  'message:new': (payload: { conversationId: string; message: SocketMessage }) => void;
  'conversation:typing': (payload: { conversationId: string; userId: string; typing: boolean }) => void;
}

export interface ClientToServerEvents {
  'conversation:join': (conversationId: string) => void;
  'conversation:typing': (payload: { conversationId: string; typing: boolean }) => void;
  'message:send': (payload: { conversationId: string; content?: string }) => void;
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketMessage {
  id: string;
  conversation: string;
  sender: string;
  content?: string;
  attachments: Attachment[];
  createdAt: string;
}

export function createSocketConnection() {
  const token = tokenStorage.get();
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const socket: ChatSocket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  return socket;
}
