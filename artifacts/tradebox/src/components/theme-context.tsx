import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("tb_theme") as Theme) || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("tb_theme", theme);
    } catch {}
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    const BASE = import.meta.env.BASE_URL ?? "/";
    const apiBase = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
    fetch(`${apiBase}/api/profile/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("tb_token") || ""}` },
      body: JSON.stringify({ darkMode: t === "dark" }),
    }).catch(() => {});
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
