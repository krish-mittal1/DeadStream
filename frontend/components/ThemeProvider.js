"use client";

import { useEffect } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function ThemeProvider({ children }) {
  const theme = useSimulationStore((s) => s.theme);
  const initTheme = useSimulationStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  }, [theme]);

  return children;
}
