"use client";
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Day / night rather than a sun-and-moon switch. The two states are named after
 * the palette they select, and the control sits in the rail's typographic voice
 * instead of importing an icon language the rest of the page does not use.
 */
export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`font-data text-xs uppercase tracking-label tabular
                  text-ink-muted transition-colors duration-fast
                  hover:text-ink focus-visible:text-ink ${className}`}
      aria-label={`Switch to ${isDark ? 'day' : 'night'} palette`}
    >
      <span className={isDark ? "text-ink" : ""}>Night</span>
      <span aria-hidden="true" className="px-1.5 opacity-50">/</span>
      <span className={isDark ? "" : "text-ink"}>Day</span>
    </button>
  );
}
