import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  isHovering: boolean;
}

export function ThemeToggle({ isHovering }: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = actualTheme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full",
        isHovering ? "justify-start gap-2" : "justify-center"
      )}
      size="sm"
      onClick={handleToggle}
      aria-label={isDark ? t('theme.light') : t('theme.dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isHovering && (isDark ? t('theme.light') : t('theme.dark'))}
    </Button>
  );
}
