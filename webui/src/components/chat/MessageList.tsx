import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  User,
  Download,
  Play,
  CheckCheck,
  Check,
} from "lucide-react";
import type { Message, Participant } from "../../types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { cn, formatTimestamp } from "../../lib/utils";

interface MessageListProps {
  messages: Message[];
  participants: Participant[];
  currentUserId: string;
  isLoading: boolean;
  typingUsers?: string[];
}

export function MessageList({
  messages,
  participants,
  currentUserId,
  isLoading,
  typingUsers = [],
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.length]);

  const getParticipant = (userId: string) =>
    participants.find(
      (participant) => participant.id === userId || participant._id === userId
    );

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
      {messages.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No messages yet. Be the first to say hi!
        </div>
      )}
      {messages.map((message) => {
        const isSelf = message.senderId === currentUserId;
        const participant = getParticipant(message.senderId);
        return (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-3",
              isSelf ? "flex-row-reverse text-right" : "flex-row text-left"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={participant?.avatarUrl}
                alt={participant?.displayName}
              />
              <AvatarFallback>
                {participant?.displayName?.[0]?.toUpperCase() || (
                  <User className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "max-w-md space-y-2",
                isSelf ? "text-right" : "text-left"
              )}
            >
              {!isSelf && (
                <p className="text-xs font-medium text-muted-foreground">
                  {participant?.displayName}
                </p>
              )}
              {message.content && (
                <div
                  className={cn(
                    "inline-block rounded-2xl border px-4 py-2 text-sm shadow-sm",
                    isSelf
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted"
                  )}
                >
                  <p className="whitespace-pre-line break-words">
                    {message.content}
                  </p>
                </div>
              )}
              {message.attachments?.length > 0 && (
                <div className="space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <AttachmentPreview
                      key={`${attachment.url}-${index}`}
                      url={attachment.url}
                      name={attachment.name}
                      type={attachment.type}
                      isSelf={isSelf}
                      allAttachments={message.attachments}
                      currentIndex={index}
                    />
                  ))}
                </div>
              )}
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isSelf
                    ? "justify-end text-muted-foreground"
                    : "justify-start text-muted-foreground"
                )}
              >
                <span>{formatTimestamp(message.createdAt)}</span>
                {isSelf &&
                  (message.read ? (
                    <CheckCheck className="h-3 w-3 text-green-500" />
                  ) : (
                    <Check className="h-3 w-3" />
                  ))}
              </div>
            </div>
          </div>
        );
      })}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {typingUsers.length === 1
            ? "Someone is typing…"
            : "Multiple people are typing…"}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

interface AttachmentPreviewProps {
  url: string;
  type: "image" | "file" | "audio" | "video";
  name: string;
  isSelf: boolean;
  allAttachments?: Array<{ url: string; type: string; name: string }>;
  currentIndex?: number;
}

function AttachmentPreview({
  url,
  type,
  name,
  isSelf,
  allAttachments,
  currentIndex = 0,
}: AttachmentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Group consecutive images for gallery view
  const imageAttachments =
    allAttachments?.filter((a) => a.type === "image") || [];
  const isFirstImage =
    type === "image" &&
    currentIndex === allAttachments?.findIndex((a) => a.type === "image");
  const shouldShowGallery =
    type === "image" && isFirstImage && imageAttachments.length > 1;

  if (type === "image") {
    if (shouldShowGallery) {
      const displayImages = imageAttachments.slice(0, 4);
      const remainingCount = imageAttachments.length - 4;

      return (
        <div
          className={cn(
            "grid gap-1",
            imageAttachments.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {displayImages.map((img, idx) => (
            <a
              key={`${img.url}-${idx}`}
              href={img.url}
              target="_blank"
              rel="noreferrer"
              className="relative overflow-hidden rounded-lg"
            >
              <img
                src={img.url}
                alt={img.name}
                className={cn(
                  "h-full w-full object-cover",
                  imageAttachments.length === 1 ? "max-h-80" : "h-32"
                )}
                loading="lazy"
              />
              {idx === 3 && remainingCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-bold text-white">
                  +{remainingCount}
                </div>
              )}
            </a>
          ))}
        </div>
      );
    } else if (!isFirstImage) {
      return null; // Skip rendering individual images after the gallery
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-lg"
      >
        <img
          src={url}
          alt={name}
          className="max-h-80 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (type === "video") {
    return (
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video src={url} className="max-h-80 w-full" controls poster={url} />
        <div className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          5:42
        </div>
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3",
          isSelf ? "bg-primary/10" : "bg-muted"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          <Play className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="relative h-1 overflow-hidden rounded-full bg-muted-foreground/20">
            <div className="h-full w-0 bg-primary" />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>0:00</span>
            <span>0:00</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // File type
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isSelf ? "bg-primary/10" : "bg-muted"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-md bg-background p-2">
          <Paperclip className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">(50KB)</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" asChild>
          <a href={url} download>
            Download
          </a>
        </Button>
        <Button size="sm" variant="outline" className="flex-1" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            Preview
          </a>
        </Button>
      </div>
    </div>
  );
}
