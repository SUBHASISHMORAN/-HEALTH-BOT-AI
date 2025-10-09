import {
  useState,
  useRef,
  KeyboardEvent,
  ClipboardEvent,
  useEffect,
} from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Paperclip, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Message ChatGPT...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<
    { id: string; name: string; type: string; dataUrl: string }[]
  >([]);
  const [interimTranscript, setInterimTranscript] = useState("");

  // Speech hook: handle transcripts and listening state
  const {
    isListening: speechIsListening,
    startListening,
    stopListening,
    currentTranscript,
    error: speechError,
  } = useSpeech({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        // append final transcript to the message
        setMessage((prev) => (prev ? prev + "\n" + transcript : transcript));
        adjustTextareaHeight();
        setInterimTranscript("");
      } else {
        setInterimTranscript(transcript);
      }
    },
    onError: () => {
      // swallow here; UI can be extended to surface errors
    },
  });

  const handleSend = () => {
    if (!isLoading) {
      // stop listening if still active so final transcript is flushed
      try {
        if (speechIsListening) stopListening();
      } catch (e) {
        // ignore
      }
      // compose message with attachments (images as markdown)
      const parts: string[] = [];
      if (message.trim()) parts.push(message.trim());
      for (const a of attachments) {
        // only images are inlined as markdown preview
        if (a.type.startsWith("image/")) {
          parts.push(`![${a.name}](${a.dataUrl})`);
        } else {
          parts.push(a.name);
        }
      }

      const composed = parts.join("\n\n");
      if (composed.trim()) {
        onSendMessage(composed.trim());
        setMessage("");
        setAttachments([]);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDropFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Add files as attachments and show previews instead of inlining immediately
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(f);
        setAttachments((prev) => [
          ...prev,
          { id: `${Date.now()}-${i}`, name: f.name, type: f.type, dataUrl },
        ]);
      } catch (e) {
        setAttachments((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${i}`,
            name: f.name,
            type: f.type || "file",
            dataUrl: "",
          },
        ]);
      }
    }
    // keep focus and height adjustments
    adjustTextareaHeight();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer;
    // If text was dropped
    const text = dt.getData("text");
    if (text) {
      setMessage((prev) => (prev ? prev + "\n" + text : text));
      adjustTextareaHeight();
    }
    // If files were dropped
    if (dt.files && dt.files.length > 0) {
      handleDropFiles(dt.files);
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    // If clipboard contains files (images), intercept and create attachments
    let handled = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          handled = true;
          e.preventDefault();
          try {
            const dataUrl = await readFileAsDataUrl(file);
            setAttachments((prev) => [
              ...prev,
              {
                id: `${Date.now()}-p-${i}`,
                name: file.name || "pasted-image",
                type: file.type,
                dataUrl,
              },
            ]);
          } catch (err) {
            setAttachments((prev) => [
              ...prev,
              {
                id: `${Date.now()}-p-${i}`,
                name: file.name || "pasted-file",
                type: file.type || "file",
                dataUrl: "",
              },
            ]);
          }
        }
      }
    }

    // If not handled via file items, check for plain text data URL
    if (!handled) {
      const text = e.clipboardData?.getData("text/plain") || "";
      if (text.startsWith("data:") && text.includes("image")) {
        e.preventDefault();
        setAttachments((prev) => [
          ...prev,
          {
            id: `${Date.now()}-p-t`,
            name: "pasted-image",
            type: "image",
            dataUrl: text,
          },
        ]);
      }
    }
  };

  const promptSuggestions = [
    "Help me write a professional email",
    "Explain quantum computing simply",
    "Create a workout plan for beginners",
    "Debug this code snippet",
  ];

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm">
      {/* Prompt Suggestions */}
      {message === "" && (
        <div className="px-6 py-4">
          <div className="flex gap-2 flex-wrap">
            {promptSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs hover:bg-[hsl(var(--hover-overlay))] transition-smooth"
                onClick={() => setMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 pb-6">
        <div
          className="relative flex items-end gap-3 p-4 border border-border rounded-2xl bg-card/50 backdrop-blur-sm focus-within:ring-1 focus-within:ring-ring transition-smooth"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[hsl(var(--foreground)/0.06)] backdrop-blur-sm rounded-2xl">
              <div className="text-sm text-foreground/80">
                Drop files to attach
              </div>
            </div>
          )}
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 hover:bg-[hsl(var(--hover-overlay))]"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 min-h-[24px] max-h-[200px]">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustTextareaHeight();
              }}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "flex-1 min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground"
              )}
              disabled={isLoading}
            />

            {/* Interim speech transcript (live) */}
            {interimTranscript && (
              <div className="mt-2 text-sm italic text-muted-foreground">
                {interimTranscript}
              </div>
            )}

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="mt-3 flex gap-2 items-center overflow-x-auto">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="relative w-20 h-14 rounded-md overflow-hidden border border-border bg-card/30 flex-shrink-0"
                  >
                    {a.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.dataUrl}
                        alt={a.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs px-1 text-muted-foreground">
                        {a.name}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((p) => p.id !== a.id)
                        )
                      }
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-[hsl(var(--hover-overlay))]"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              variant={speechIsListening ? "default" : "ghost"}
              size="icon"
              onClick={() => {
                if (speechIsListening) stopListening();
                else startListening();
              }}
              className={`h-8 w-8 ${
                speechIsListening
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "hover:bg-[hsl(var(--hover-overlay))]"
              }`}
              title={
                speechIsListening ? "Stop voice input" : "Start voice input"
              }
            >
              <Mic className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              size="icon"
              className={cn(
                "h-8 w-8 transition-smooth",
                message.trim() && !isLoading
                  ? "bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 hover-glow"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-xs text-muted-foreground text-center mt-3">
          ChatGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
