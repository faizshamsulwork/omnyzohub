"use client";

import { useEffect, useState } from "react";

const getInitialIsDark = () => {
  if (typeof window === "undefined") return true;
  return (window.localStorage.getItem("theme") || "dark") === "dark";
};

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialIsDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    const nextThemeIsDark = !isDark;
    setIsDark(nextThemeIsDark);
    
    if (nextThemeIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 mt-2 w-full">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors">
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
      
      {/* Apple-style Toggle Switch */}
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
          isDark ? 'bg-[#D95D69]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
            isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
