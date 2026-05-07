"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("matched-theme") as
      | "dark"
      | "light"
      | null;

    const nextTheme = savedTheme || "dark";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("matched-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-xl border border-slate-300/30 px-3 py-2 text-sm font-bold hover:bg-slate-500/10"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}