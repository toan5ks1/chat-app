import { create } from "zustand";
import { api } from "../lib/api";
import type { Conversation, Message, TypingState } from "../types/chat";

interface ChatState {
  conversations: Record<string, Conversation>;
  conversationOrder: string[];
  activeConversationId?: string;
  messages: Record<string, Message[]>;
  typing: TypingState;
  isLoadingConversations: boolean;
  loadingMessages: Record<string, boolean>;
}

interface ChatActions {
  fetchConversations: () => Promise<void>;
  upsertConversation: (conversation: Conversation) => void;
  setActiveConversation: (conversationId: string) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => void;
  setTyping: (conversationId: string, userId: string, typing: boolean) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  reset: () => void;
}

const initialState: ChatState = {
  conversations: {},
  conversationOrder: [],
  activeConversationId: undefined,
  messages: {},
  typing: {},
  isLoadingConversations: false,
  loadingMessages: {},
};

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  ...initialState,
  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const conversations = await api.getConversations();
      const record: Record<string, Conversation> = {};
      const order = conversations
        .slice()
        .sort((a, b) => {
          const aTime = a.updatedAt || a.lastMessageAt || a.createdAt || "";
          const bTime = b.updatedAt || b.lastMessageAt || b.createdAt || "";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        })
        .map((conversation) => {
          record[conversation.id] = conversation;
          return conversation.id;
        });

      set({
        conversations: record,
        conversationOrder: order,
        isLoadingConversations: false,
      });

      const { activeConversationId } = get();
      if (!activeConversationId && order.length > 0) {
        set({ activeConversationId: order[0] });
      }
    } catch (error) {
      set({ isLoadingConversations: false });
      throw error;
    }
  },
  upsertConversation: (conversation) => {
    const { conversations, conversationOrder } = get();
    const isKnown = Boolean(conversations[conversation.id]);
    const nextRecord = { ...conversations, [conversation.id]: conversation };
    let nextOrder = conversationOrder;

    if (!isKnown) {
      nextOrder = [conversation.id, ...conversationOrder];
    }

    set({ conversations: nextRecord, conversationOrder: nextOrder });
  },
  setActiveConversation: (conversationId) => {
    if (!conversationId) return;
    set({ activeConversationId: conversationId });
  },
  fetchMessages: async (conversationId: string) => {
    if (!conversationId) return;
    set((state) => ({
      loadingMessages: { ...state.loadingMessages, [conversationId]: true },
    }));
    try {
      const messages = await api.getMessages(conversationId);
      set((state) => ({
        messages: { ...state.messages, [conversationId]: messages },
        loadingMessages: { ...state.loadingMessages, [conversationId]: false },
      }));
    } catch (error) {
      set((state) => ({
        loadingMessages: { ...state.loadingMessages, [conversationId]: false },
      }));
      throw error;
    }
  },
  addMessage: (conversationId, message) => {
    set((state) => {
      const existingMessages = state.messages[conversationId] || [];
      const alreadyExists = existingMessages.some(
        (entry) => entry.id === message.id
      );
      const nextMessages = alreadyExists
        ? existingMessages
        : [...existingMessages, message];

      const conversation = state.conversations[conversationId];
      const updatedConversation = conversation
        ? {
            ...conversation,
            lastMessageAt: message.createdAt,
            updatedAt: message.createdAt,
          }
        : undefined;

      const conversations = updatedConversation
        ? { ...state.conversations, [conversationId]: updatedConversation }
        : state.conversations;

      return {
        messages: { ...state.messages, [conversationId]: nextMessages },
        conversations,
      };
    });
  },
  setTyping: (conversationId, userId, typing) => {
    set((state) => {
      const conversationTyping = state.typing[conversationId] || {};
      const nextConversationTyping = { ...conversationTyping };
      if (typing) {
        nextConversationTyping[userId] = true;
      } else {
        delete nextConversationTyping[userId];
      }

      return {
        typing: {
          ...state.typing,
          [conversationId]: nextConversationTyping,
        },
      };
    });
  },
  clearTyping: (conversationId, userId) => {
    set((state) => {
      const conversationTyping = state.typing[conversationId];
      if (!conversationTyping || !conversationTyping[userId]) {
        return { typing: state.typing };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [userId]: _removed, ...rest } = conversationTyping;
      return {
        typing: {
          ...state.typing,
          [conversationId]: rest,
        },
      };
    });
  },
  reset: () => set(initialState),
}));
