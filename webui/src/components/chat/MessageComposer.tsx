import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ImagePlus,
  Loader2,
  Paperclip,
  X,
  Smile,
  Mic,
  Send,
} from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface MessageComposerProps {
  onSend: (payload: { content: string; files: File[] }) => Promise<void>;
  onTyping: (typing: boolean) => void;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  onTyping,
  disabled,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      if (isTyping.current) onTyping(false);
    };
  }, [onTyping]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed && files.length === 0) return;
    setIsSending(true);
    try {
      await onSend({ content: trimmed, files });
      setMessage("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsSending(false);
      handleTypingStop();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const handleTypingStart = () => {
    if (!isTyping.current) {
      onTyping(true);
      isTyping.current = true;
    }
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    typingTimeout.current = setTimeout(() => {
      handleTypingStop();
    }, 1500);
  };

  const handleTypingStop = () => {
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    if (isTyping.current) {
      onTyping(false);
      isTyping.current = false;
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-4">
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {Math.round(file.size / 1024)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove file</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isSending}
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Add image</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
          >
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Attach files</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isSending}
          >
            <Mic className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Voice message</span>
          </Button>
        </div>
        <div className="relative flex-1">
          <Textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              handleTypingStart();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Enter message..."
            className="min-h-[40px] resize-none pr-10"
            disabled={disabled || isSending}
            rows={1}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isSending}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Add emoji</span>
          </Button>
        </div>
        <Button
          type="submit"
          disabled={disabled || isSending}
          // size="sm"
          // className="px-6"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFilesChange}
      />
    </form>
  );
}
