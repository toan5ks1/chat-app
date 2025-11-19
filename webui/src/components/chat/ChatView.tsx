import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Video, Phone, MoreVertical } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useChatStore } from "../../store/chat";
import {
  createSocketConnection,
  type ChatSocket,
  type SocketMessage,
} from "../../lib/socket";
import { api } from "../../lib/api";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { UserMenu } from "./UserMenu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { NewConversationDialog } from "./NewConversationDialog";
import { Separator } from "../ui/separator";

export function ChatView() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const conversations = useChatStore((state) => state.conversations);
  const conversationOrder = useChatStore((state) => state.conversationOrder);
  const activeConversationId = useChatStore(
    (state) => state.activeConversationId
  );
  const setActiveConversation = useChatStore(
    (state) => state.setActiveConversation
  );
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const messagesByConversation = useChatStore((state) => state.messages);
  const loadingMessages = useChatStore((state) => state.loadingMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const typingState = useChatStore((state) => state.typing);
  const setTypingState = useChatStore((state) => state.setTyping);
  const isLoadingConversations = useChatStore(
    (state) => state.isLoadingConversations
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);

  const orderedConversations = useMemo(
    () => conversationOrder.map((id) => conversations[id]).filter(Boolean),
    [conversationOrder, conversations]
  );

  const activeConversation = activeConversationId
    ? conversations[activeConversationId]
    : undefined;
  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId] || []
    : [];
  const typingUsers = activeConversationId
    ? Object.keys(typingState[activeConversationId] || {}).filter(
        (id) => id !== user?.id
      )
    : [];

  useEffect(() => {
    fetchConversations().catch((error) => {
      console.error(error);
      toast.error("Failed to load conversations");
    });
  }, [fetchConversations]);

  const isActiveConversationLoading = activeConversationId
    ? Boolean(loadingMessages[activeConversationId])
    : false;

  useEffect(() => {
    if (!activeConversationId) return;
    if (activeMessages.length > 0 || isActiveConversationLoading) return;

    fetchMessages(activeConversationId).catch((error) => {
      console.error(error);
      toast.error("Failed to load messages");
    });
  }, [
    activeConversationId,
    activeMessages.length,
    isActiveConversationLoading,
    fetchMessages,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = createSocketConnection();
    socketRef.current = socket;

    socket.on("conversation:new", () => {
      fetchConversations().catch((error) => {
        console.error(error);
      });
    });

    socket.on("message:new", ({ conversationId, message }) => {
      const normalized = normalizeSocketMessage(conversationId, message);
      addMessage(conversationId, normalized);
    });

    socket.on("conversation:typing", ({ conversationId, userId, typing }) => {
      if (userId === user.id) return;
      setTypingState(conversationId, userId, typing);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, fetchConversations, addMessage, setTypingState]);

  useEffect(() => {
    if (!activeConversationId || !socketRef.current) return;
    socketRef.current.emit("conversation:join", activeConversationId);
  }, [activeConversationId]);

  const handleSendMessage = async ({
    content,
    files,
  }: {
    content: string;
    files: File[];
  }) => {
    if (!activeConversationId) return;
    try {
      const attachments = files.length
        ? await Promise.all(files.map((file) => api.uploadFile(file)))
        : [];
      const message = await api.sendMessage(activeConversationId, {
        content,
        attachments,
      });
      addMessage(activeConversationId, message);
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    }
  };

  const handleTyping = (typing: boolean) => {
    if (!activeConversationId || !socketRef.current) return;
    socketRef.current.emit("conversation:typing", {
      conversationId: activeConversationId,
      typing,
    });
  };

  const handleCreateConversation = async (payload: {
    participantIds: string[];
    title?: string;
    isGroup?: boolean;
  }) => {
    try {
      const conversation = await api.createConversation(payload);
      await fetchConversations();
      setActiveConversation(conversation.id);
      toast.success("Conversation created");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create conversation");
      throw error;
    }
  };

  const handleRefreshConversations = () => {
    fetchConversations().catch((error) => {
      console.error(error);
      toast.error("Failed to refresh conversations");
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <ConversationList
        conversations={orderedConversations}
        activeConversationId={activeConversationId}
        currentUserId={user.id}
        onSelect={setActiveConversation}
        onCreateConversation={() => setIsDialogOpen(true)}
        onRefresh={handleRefreshConversations}
        isLoading={isLoadingConversations}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3">
                {(() => {
                  const others = activeConversation.participants.filter(
                    (p) => p.id !== user.id
                  );
                  const otherParticipant = others[0];
                  return (
                    <>
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={otherParticipant?.avatarUrl}
                            alt={otherParticipant?.displayName}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {otherParticipant?.displayName?.[0]?.toUpperCase() ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>
                        {otherParticipant?.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {getConversationLabel(activeConversation, user.id)}
                        </p>
                        <p className="text-xs text-green-500">
                          {otherParticipant?.isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                  <span className="sr-only">Video call</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                  <span className="sr-only">Audio call</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">More options</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold">Select a conversation</p>
                <p className="text-xs text-muted-foreground">
                  Choose a chat to start messaging
                </p>
              </div>
              <UserMenu user={user} onLogout={logout} />
            </>
          )}
        </header>
        {activeConversation ? (
          <>
            <MessageList
              messages={activeMessages}
              participants={activeConversation.participants}
              currentUserId={user.id}
              isLoading={isActiveConversationLoading}
              typingUsers={typingUsers}
            />
            <Separator />
            <MessageComposer
              onSend={handleSendMessage}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select or start a conversation to begin chatting.
          </div>
        )}
      </div>
      <NewConversationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreate={handleCreateConversation}
      />
    </div>
  );
}

function getConversationLabel(
  conversation: {
    title?: string;
    participants: { displayName: string; id: string }[];
  },
  currentUserId: string
) {
  if (conversation.title) return conversation.title;
  const others = conversation.participants.filter(
    (participant) => participant.id !== currentUserId
  );
  return (
    others.map((participant) => participant.displayName).join(", ") ||
    "Conversation"
  );
}

function normalizeSocketMessage(
  conversationId: string,
  message: SocketMessage
) {
  return {
    id: message.id,
    conversationId,
    senderId: message.sender,
    content: message.content,
    attachments: message.attachments || [],
    createdAt: message.createdAt,
  };
}
