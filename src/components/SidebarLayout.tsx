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
  Search,
  BarChart2,
  Activity,
  Newspaper,
  Bell,
} from "lucide-react";
import { NavLink } from "react-router-dom";
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
  onRenameConversation,
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
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  // #181B20
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault();
            onNewChat();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat]);

  const sidebarWidth = isHovering ? "w-80" : "w-16";
  const sidebarTranslate =
    isOpen || isHovering ? "translate-x-0" : "-translate-x-full";

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen  bg-background">
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
          "fixed top-0 left-0 h-full bg-background text-[hsl(var(--sidebar-foreground))]  border-[hsl(var(--sidebar-border))] transform transition-colors duration-300 ease-in-out z-20 bg-[#181B20]",
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
        <div className="flex items-center justify-between p-4  border-[hsl(var(--sidebar-border))]">
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
            {isHovering && t("sidebar.newChat")}
          </Button>
        </div>

        {/* Settings */}
        <div className="p-4  border-[hsl(var(--sidebar-border))] space-y-2">
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
            {isHovering && t("sidebar.settings")}
          </Button>

          <div className="space-y-2">
            <NavLink
              to="/health"
              className={({ isActive }) =>
                cn(
                  "w-full block rounded",
                  isHovering ? "" : "text-center",
                  isActive
                    ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
                    : ""
                )
              }
            >
              <Button
                variant="ghost"
                className={cn(
                  "w-full",
                  isHovering ? "justify-start gap-2" : "justify-center"
                )}
                size="sm"
                aria-label={isHovering ? "Health Dashboard" : "Health"}
              >
                <MessageSquare className="h-4 w-4" />
                {isHovering && <span>Health Dashboard</span>}
              </Button>
            </NavLink>

            <div className="mt-2">
              <NavLink
                to="/dashboard/overview"
                className={({ isActive }) => (isActive ? "block" : "block")}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full",
                    isHovering ? "justify-start gap-2" : "justify-center"
                  )}
                  size="sm"
                  aria-label={isHovering ? "Overview" : "Overview"}
                >
                  <BarChart2 className="h-4 w-4" />
                  {isHovering && <span>Overview</span>}
                </Button>
              </NavLink>

              <NavLink to="/dashboard/analytics">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full mt-1",
                    isHovering ? "justify-start gap-2" : "justify-center"
                  )}
                  size="sm"
                  aria-label={isHovering ? "Analytics" : "Analytics"}
                >
                  <Activity className="h-4 w-4" />
                  {isHovering && <span>Analytics</span>}
                </Button>
              </NavLink>

              <NavLink to="/dashboard/news">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full mt-1",
                    isHovering ? "justify-start gap-2" : "justify-center"
                  )}
                  size="sm"
                  aria-label={isHovering ? "News" : "News"}
                >
                  <Newspaper className="h-4 w-4" />
                  {isHovering && <span>News</span>}
                </Button>
              </NavLink>

              <NavLink to="/dashboard/alerts">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full mt-1",
                    isHovering ? "justify-start gap-2" : "justify-center"
                  )}
                  size="sm"
                  aria-label={isHovering ? "Alerts" : "Alerts"}
                >
                  <Bell className="h-4 w-4" />
                  {isHovering && <span>Alerts</span>}
                </Button>
              </NavLink>
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle isHovering={isHovering} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-10"
          style={{ background: "hsl(var(--foreground) / 0.5)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col transition-transform transition-colors duration-300 ease-in-out",
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
          <div
            className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 z-10 pointer-events-none"
            style={{ background: "hsl(var(--foreground) / 0.2)" }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
