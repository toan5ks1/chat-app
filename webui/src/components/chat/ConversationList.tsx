import { useState } from "react";
import { Plus, Search, Check, CheckCheck } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn, formatTimestamp } from "../../lib/utils";
import type { Conversation } from "../../types/chat";
import { Skeleton } from "../ui/skeleton";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUserId: string;
  onSelect: (conversationId: string) => void;
  onCreateConversation: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  currentUserId,
  onSelect,
  onCreateConversation,
  isLoading,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true;
    const others = conversation.participants.filter(
      (p) => p.id !== currentUserId
    );
    const label =
      conversation.title || others.map((p) => p.displayName).join(", ");
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full w-full max-w-sm flex-col border-r bg-card">
      <div className="border-b px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="icon" variant="ghost" onClick={onCreateConversation}>
            <Plus className="h-5 w-5" />
            <span className="sr-only">New conversation</span>
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading && conversations.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {searchQuery
                ? "No conversations found"
                : "No conversations yet. Start one!"}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const others = conversation.participants.filter(
                (participant) => participant.id !== currentUserId
              );
              const otherParticipant = others[0];
              const label =
                conversation.title ||
                others.map((participant) => participant.displayName).join(", ");
              const lastMessagePreview =
                conversation.lastMessage?.content || "No messages yet";
              const isRead = conversation.lastMessage?.read !== false;
              const isSentByMe =
                conversation.lastMessage?.senderId === currentUserId;

              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    activeConversationId === conversation.id ? "bg-accent" : ""
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium">
                          {label || "Untitled"}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {conversation.lastMessage?.createdAt
                            ? formatTimestamp(
                                conversation.lastMessage.createdAt
                              )
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                          {isSentByMe &&
                            (isRead ? (
                              <CheckCheck className="h-3 w-3 shrink-0 text-green-500" />
                            ) : (
                              <Check className="h-3 w-3 shrink-0 text-muted-foreground" />
                            ))}
                          <p
                            className={cn(
                              "truncate text-sm",
                              conversation.unreadCount
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {lastMessagePreview}
                          </p>
                        </div>
                        {conversation.unreadCount &&
                        conversation.unreadCount > 0 ? (
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-green-500 px-1.5 text-xs font-medium text-white">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
