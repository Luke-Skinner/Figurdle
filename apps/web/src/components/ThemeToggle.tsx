"use client";
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full
                 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2
                 ${isDark
                   ? 'bg-gray-800 hover:bg-gray-700 focus:ring-yellow-400 text-yellow-400'
                   : 'bg-gray-100 hover:bg-gray-200 focus:ring-blue-500 text-gray-700'
                 } ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-6 h-6">
        {/* Sun Icon (Light Mode) */}
        <svg
          className={`absolute inset-0 w-6 h-6 transition-all duration-500 transform
                     ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Moon Icon (Dark Mode) */}
        <svg
          className={`absolute inset-0 w-6 h-6 transition-all duration-500 transform
                     ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>

      {/* Ripple Effect */}
      <div className={`absolute inset-0 rounded-full transition-all duration-300 scale-0
                      ${isDark ? 'bg-yellow-400' : 'bg-blue-500'}
                      group-active:scale-75 opacity-20`}
      />
    </button>
  );
}