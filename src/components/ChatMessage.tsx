import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: string;
  };
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, type: "up" | "down") => void;
  onSpeak?: (content: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragLeave?: (e: React.DragEvent, id: string) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
}

export function ChatMessage({
  message,
  onCopy,
  onRegenerate,
  onFeedback,
  onSpeak,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex gap-4 p-6 group transition-smooth",
        isUser ? "justify-end" : "justify-start"
      )}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, message.id)}
      onDragOver={(e) => onDragOver?.(e, message.id)}
      onDragLeave={(e) => onDragLeave?.(e, message.id)}
      onDrop={(e) => onDrop?.(e, message.id)}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground font-medium">
            AI
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex flex-col max-w-[70%] space-y-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 transition-smooth",
            isUser ? "chat-message-user ml-auto" : "chat-message-assistant"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </p>
        </div>

        <div
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span>{message.timestamp}</span>

          {/* Action buttons for assistant messages */}
          {!isUser && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--hover-overlay))]"
                onClick={() => onCopy?.(message.content)}
                title={t("chat.messageCopied")}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--hover-overlay))]"
                onClick={() => onSpeak?.(message.content)}
                title={t("chat.readAloud")}
              >
                <Volume2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--hover-overlay))]"
                onClick={() => onFeedback?.(message.id, "up")}
                title={t("chat.feedback")}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--hover-overlay))]"
                onClick={() => onFeedback?.(message.id, "down")}
                title={t("chat.feedback")}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--hover-overlay))]"
                onClick={() => onRegenerate?.(message.id)}
                title={t("chat.regeneratingResponse")}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
