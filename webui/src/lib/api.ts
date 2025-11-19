import type {
  Attachment,
  Conversation,
  Message,
  Participant,
  User,
} from "../types/chat";
import { tokenStorage } from "./token";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  skipJson?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  const bodyIsFormData = options.body instanceof FormData;

  // Add JWT token to Authorization header
  const token = tokenStorage.get();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!bodyIsFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = undefined;
    }
    const message =
      errorData && typeof errorData === "object" && "message" in errorData
        ? String(errorData.message)
        : response.statusText;
    throw new ApiError(response.status, message, errorData);
  }

  if (options.skipJson || response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function transformUser(input: unknown): User {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid user payload");
  }

  const user = input as Record<string, unknown>;
  return {
    id: String(user.id || user._id || user.userId || ""),
    email: String(user.email || ""),
    displayName: String(user.displayName || user.name || ""),
    avatarUrl: user.avatarUrl
      ? String(user.avatarUrl)
      : user.picture
      ? String(user.picture)
      : undefined,
  };
}

function transformParticipant(input: unknown): Participant {
  const user = transformUser(input);
  const obj = input as Record<string, unknown>;
  return { ...user, _id: obj._id ? String(obj._id) : user.id };
}

function transformConversation(input: unknown): Conversation {
  const conv = input as Record<string, unknown>;
  return {
    id: String(conv.id || conv._id),
    title: conv.title ? String(conv.title) : undefined,
    isGroup: Boolean(conv.isGroup),
    participants: Array.isArray(conv.participants)
      ? conv.participants.map(transformParticipant)
      : [],
    lastMessageAt: conv.lastMessageAt ? String(conv.lastMessageAt) : undefined,
    createdAt: String(conv.createdAt || ""),
    updatedAt: String(conv.updatedAt || ""),
  };
}

function transformMessage(input: unknown): Message {
  const msg = input as Record<string, unknown>;
  const conversation = msg.conversation as Record<string, unknown> | undefined;
  const sender = msg.sender as Record<string, unknown> | undefined;

  return {
    id: String(msg.id || msg._id),
    conversationId: String(
      conversation?.id ||
        conversation?._id ||
        msg.conversation ||
        msg.conversationId
    ),
    senderId: String(sender?.id || sender?._id || msg.sender || msg.senderId),
    content: msg.content ? String(msg.content) : undefined,
    attachments: Array.isArray(msg.attachments)
      ? (msg.attachments as Attachment[])
      : [],
    createdAt: String(msg.createdAt || new Date().toISOString()),
  };
}

export const api = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const result = await request<{ user?: unknown }>("/api/auth/me");
      if (!result?.user) return null;
      return transformUser(result.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },
  logout: () => request("/api/auth/logout", { method: "Post", skipJson: true }),
  getUsers: async (): Promise<User[]> => {
    const result = await request<{ users: unknown[] }>("/api/users");
    return (result.users || []).map(transformUser);
  },
  getConversations: async (): Promise<Conversation[]> => {
    const result = await request<{ conversations: unknown[] }>(
      "/api/conversations"
    );
    return (result.conversations || []).map(transformConversation);
  },
  createConversation: async (payload: {
    participantIds: string[];
    title?: string;
    isGroup?: boolean;
  }): Promise<Conversation> => {
    const result = await request<{ conversation: unknown }>(
      "/api/conversations",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return transformConversation(result.conversation);
  },
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const result = await request<{ messages: unknown[] }>(
      `/api/conversations/${conversationId}/messages`
    );
    return (result.messages || []).map(transformMessage);
  },
  sendMessage: async (
    conversationId: string,
    payload: { content?: string; attachments?: Attachment[] }
  ): Promise<Message> => {
    const result = await request<{ message: unknown }>(
      `/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return transformMessage(result.message);
  },
  uploadFile: async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await request<{ file: Attachment }>("/api/uploads", {
      method: "POST",
      body: formData,
    });
    return result.file;
  },
};

export const AUTH_URL = `${API_BASE_URL}/api/auth/google`;
