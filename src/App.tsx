import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SidebarLayout from "./components/SidebarLayout";
import { ChatProvider, useChat } from "./contexts/ChatContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Auth from "./pages/Auth";
import OTPVerification from "./pages/Otp";

const queryClient = new QueryClient();

function AppContent() {
  const {
    conversations,
    activeConversationId,
    isCollapsed,
    setIsCollapsed,
    addConversation,
    setActiveConversationId,
    deleteConversation,
    updateConversation,
  } = useChat();

  const handleNewChat = () => {
    const newId = (conversations.length + 1).toString();
    const newConversation = {
      id: newId,
      title: "New Chat",
      timestamp: "Just now",
      messages: [],
    };
    addConversation(newConversation);
    setActiveConversationId(newId);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    updateConversation(id, { title: newTitle });
  };

  return (
    <SidebarLayout
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      onNewChat={handleNewChat}
      onOpenSettings={() => {}}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={setActiveConversationId}
      onDeleteConversation={deleteConversation}
      onRenameConversation={handleRenameConversation}
    >
      <Index />
    </SidebarLayout>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ChatProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<AppContent />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify" element={<OTPVerification />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ChatProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
