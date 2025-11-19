export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Participant extends User {
  _id?: string;
  isOnline?: boolean;
}

export interface Attachment {
  url: string;
  type: 'image' | 'file' | 'audio' | 'video';
  name: string;
  size: number;
  provider?: 'local' | 's3';
}

export interface Conversation {
  id: string;
  title?: string;
  isGroup: boolean;
  participants: Participant[];
  lastMessageAt?: string;
  lastMessage?: {
    content?: string;
    senderId: string;
    createdAt: string;
    read?: boolean;
  };
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  attachments: Attachment[];
  createdAt: string;
  pending?: boolean;
  read?: boolean;
}

export type TypingState = Record<string, Record<string, boolean>>;
