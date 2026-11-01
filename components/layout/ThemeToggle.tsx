"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("people-insights-theme");
    const nextDark = stored === "dark";
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
  }, []);
  const toggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    window.localStorage.setItem("people-insights-theme", nextDark ? "dark" : "light");
  };
  return <button type="button" className="button-secondary" onClick={toggle} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"} title={dark ? "Tema claro" : "Tema escuro"} style={{ minHeight: 36, padding: "0 9px" }}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button>;
}