import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "kamdan-theme";

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", t === "light");
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);
  const update = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    try { window.localStorage.setItem(KEY, t); } catch { /* noop */ }
  };
  return { theme, setTheme: update, toggle: () => update(theme === "dark" ? "light" : "dark") };
}
