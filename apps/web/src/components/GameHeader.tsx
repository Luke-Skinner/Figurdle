"use client";
import { useState } from "react";
import RulesModal from "./RulesModal";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";

interface GameHeaderProps {
  className?: string;
}

export default function GameHeader({ className = "" }: GameHeaderProps) {
  const [showRules, setShowRules] = useState(false);
  const { isDark } = useTheme();

  return (
    <>
      <header className={`text-center space-y-4 relative ${className}`}>
        {/* Theme Toggle - positioned absolutely in top right */}
        <div className="absolute top-0 right-0">
          <ThemeToggle />
        </div>

        <div className="space-y-2">
          <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent
            leading-tight pb-2
            ${isDark
              ? 'from-amber-400 via-amber-600 to-amber-800'
              : 'from-amber-900 via-amber-700 to-amber-500'
            }`}>
            Figurdle
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Daily Famous Figure Guessing Game
          </p>
        </div>

        <button
          onClick={() => setShowRules(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full
                     transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                     ${isDark
                       ? 'text-amber-400 bg-amber-900/30 hover:bg-amber-800/40 focus:ring-amber-400 focus:ring-offset-gray-900'
                       : 'text-amber-600 bg-amber-50 hover:bg-amber-100 focus:ring-amber-500 focus:ring-offset-white'
                     }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to Play
        </button>
      </header>

      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </>
  );
}