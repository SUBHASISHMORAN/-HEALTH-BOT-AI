import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Settings, 
  MessageSquare, 
  Menu,
  X,
  Trash2,
  Edit3,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  messages: any[];
}

interface SidebarProps {
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
}

export default function Sidebar({ 
  children, 
  isCollapsed, 
  onToggleCollapse, 
  onNewChat, 
  onOpenSettings,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation
}: SidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            onNewChat();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewChat]);

  const sidebarWidth = isHovering ? "w-80" : "w-16";
  const sidebarTranslate = (isOpen || isHovering) ? "translate-x-0" : "-translate-x-full";

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-30 md:hidden bg-background/80 backdrop-blur-sm border shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] shadow-2xl border-r border-[hsl(var(--sidebar-border))] transform transition-all duration-300 ease-in-out z-20",
          sidebarWidth,
          sidebarTranslate,
          !isMobile && "translate-x-0",
          isMobile && (isOpen ? "translate-x-0" : "-translate-x-full"),
          "backdrop-blur-sm"
        )}
        role="navigation"
        aria-label="Chat navigation sidebar"
        onMouseEnter={() => {
          if (!isMobile) {
            setIsHovering(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            setIsHovering(false);
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] rounded-lg flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            {isHovering && (
              <div>
                <span className="font-semibold text-lg">{t('sidebar.title')}</span>
                <p className="text-xs text-muted-foreground">{t('sidebar.subtitle')}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={onNewChat}
            className={cn(
              "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
              isHovering ? "justify-start gap-2" : "justify-center"
            )}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {isHovering && t('sidebar.newChat')}
          </Button>
        </div>

        {/* Search */}
        {conversations.length > 0 && isHovering && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sidebar.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>
        )}

        {/* Conversations List */}
        {conversations.length > 0 && (
          <>
            {isHovering && <Separator className="mx-4" />}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group relative flex items-center rounded-lg cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--sidebar-accent))] hover:shadow-sm",
                        conversation.id === activeConversationId && "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm",
                        isHovering ? "gap-3 p-3" : "gap-2 p-2 justify-center"
                      )}
                      onClick={() => {
                        onSelectConversation?.(conversation.id);
                        if (isMobile) setIsOpen(false);
                      }}
                    >
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "rounded-lg flex items-center justify-center transition-colors",
                          conversation.id === activeConversationId 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10",
                          isHovering ? "w-8 h-8" : "w-6 h-6"
                        )}>
                          <MessageSquare className={cn("text-muted-foreground", isHovering ? "h-4 w-4" : "h-3 w-3")} />
                        </div>
                      </div>
                      {isHovering && (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate mb-1">
                              {conversation.title}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {conversation.timestamp}
                              </p>
                              {conversation.messages.length > 0 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                  {conversation.messages.length}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-background/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRenameConversation?.(conversation.id, conversation.title);
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteConversation?.(conversation.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    ))
                  ) : isHovering && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Search className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{t('sidebar.noConversationsFound')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('sidebar.tryDifferentSearch')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Settings */}
        <div className="p-4 border-t border-[hsl(var(--sidebar-border))] space-y-2">
          <Button
            variant="ghost"
            onClick={onOpenSettings}
            className={cn(
              "w-full",
              isHovering ? "justify-start gap-2" : "justify-center"
            )}
            size="sm"
          >
            <Settings className="h-4 w-4" />
            {isHovering && t('sidebar.settings')}
          </Button>
          
          {/* Theme Toggle */}
          <ThemeToggle isHovering={isHovering} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          !isMobile && !isHovering && "ml-16",
          isMobile && "ml-0"
        )}
        onMouseMove={(e) => {
          if (!isMobile && e.clientX < 40) {
            setIsHovering(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            setIsHovering(false);
          }
        }}
      >
        {/* Hover indicator on left edge */}
        {!isMobile && !isHovering && (
          <div className="fixed left-0 top-1/2 transform -translate-y-1/2 w-2 h-20 bg-primary/40 rounded-r-full z-30 transition-opacity duration-300 hover:bg-primary/60 cursor-pointer" />
        )}
        
        {/* Background blur overlay when hovering */}
        {isHovering && !isMobile && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 z-10 pointer-events-none" />
        )}
        {children}
      </div>
    </div>
  );
}