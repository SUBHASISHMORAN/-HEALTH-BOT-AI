import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "light" | "dark"; // The actual theme being applied (resolved from system)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read saved theme synchronously so initial React render uses the correct value
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved && ["light", "dark", "system"].includes(saved)) return saved;
    } catch (e) {
      /* ignore */
    }
    return "system";
  });
  const [actualTheme, setActualTheme] = useState<"light" | "dark">("dark");

  // Load theme from localStorage on mount
  // (removed mount loader — we read synchronously above)

  // Apply theme to document and resolve system theme
  // Apply theme before paint to avoid flicker. Also temporarily disable transitions
  // while toggling to prevent animated flashes.
  useLayoutEffect(() => {
    const root = document.documentElement;

    const applyDark = (isDark: boolean) => {
      // disable transitions briefly
      root.classList.add("disable-theme-transitions");
      root.classList.toggle("dark", isDark);
      // keep disabled for a short duration to cover CSS transition timings
      requestAnimationFrame(() => {
        setTimeout(
          () => root.classList.remove("disable-theme-transitions"),
          350
        );
      });
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      setActualTheme(systemTheme);
      applyDark(systemTheme === "dark");

      const handleChange = (e: MediaQueryListEvent) => {
        if (theme === "system") {
          const systemTheme = e.matches ? "dark" : "light";
          setActualTheme(systemTheme);
          applyDark(systemTheme === "dark");
        }
      };

      // Use addEventListener when available, fallback to addListener for older browsers
      if (mediaQuery.addEventListener)
        mediaQuery.addEventListener("change", handleChange);
      else mediaQuery.addListener(handleChange as any);

      return () => {
        if (mediaQuery.removeEventListener)
          mediaQuery.removeEventListener("change", handleChange);
        else mediaQuery.removeListener(handleChange as any);
      };
    } else {
      setActualTheme(theme);
      applyDark(theme === "dark");
    }
  }, [theme]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    actualTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
