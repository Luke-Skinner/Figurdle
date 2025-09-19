"use client";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface GuessFormProps {
  onSubmit: (guess: string) => void;
  disabled: boolean;
  loading: boolean;
  isVictorious: boolean;
  isGameOver: boolean;
  className?: string;
  triggerShake?: boolean;
}

export default function GuessForm({
  onSubmit,
  disabled,
  loading,
  isVictorious,
  isGameOver,
  className = "",
  triggerShake = false
}: GuessFormProps) {
  const [guess, setGuess] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useTheme();

  // Focus input on mount and when game resets
  useEffect(() => {
    if (!disabled && !isVictorious && !isGameOver) {
      inputRef.current?.focus();
    }
  }, [disabled, isVictorious, isGameOver]);

  // Shake animation effect
  useEffect(() => {
    if (triggerShake) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [triggerShake]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || disabled || loading || isVictorious || isGameOver) return;

    onSubmit(guess.trim());
    setGuess(""); // Clear input after submission
  };

  const getPlaceholderText = () => {
    if (isVictorious) return "Puzzle completed!";
    if (isGameOver) return "Game over!";
    if (loading) return "Checking your guess...";
    return "Enter your guess...";
  };

  const getButtonText = () => {
    if (loading) return "Checking...";
    if (isVictorious) return "Completed";
    if (isGameOver) return "Game Over";
    return "Submit Guess";
  };

  return (
    <div className={`rounded-2xl border shadow-lg p-6 backdrop-blur-sm transition-all duration-200 ${className}
      ${isDark
        ? 'bg-gray-800/80 border-gray-700'
        : 'bg-white/80 border-gray-200'
      }
      ${isShaking ? 'animate-pulse transform' : ''}
    `}
    style={isShaking ? {
      animation: 'shake 0.5s ease-in-out'
    } : {}}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={getPlaceholderText()}
            disabled={disabled || isVictorious || isGameOver}
            className={`w-full px-6 py-4 text-lg rounded-xl border-2 transition-all duration-200
              focus:outline-none focus:ring-4 backdrop-blur-sm
              ${disabled || isVictorious || isGameOver
                ? isDark
                  ? 'border-gray-600 bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 bg-gray-50/50 text-gray-400 cursor-not-allowed'
                : isDark
                  ? 'border-gray-600 focus:border-blue-400 bg-gray-700/50 text-gray-100 hover:border-gray-500 focus:ring-blue-400/20'
                  : 'border-gray-300 focus:border-blue-500 bg-white/50 text-gray-900 hover:border-gray-400 focus:ring-blue-500/20'
              }
              ${loading ? 'animate-pulse' : ''}
            `}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!guess.trim() || disabled || loading || isVictorious || isGameOver}
          className={`w-full py-4 px-6 rounded-xl font-medium text-lg transition-all duration-200
            transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4
            ${disabled || !guess.trim() || loading || isVictorious || isGameOver
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:scale-100'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500/30'
            }
          `}
        >
          <div className="flex items-center justify-center gap-2">
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            )}
            <span>{getButtonText()}</span>
            {!loading && !disabled && !isVictorious && !isGameOver && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </div>
        </button>

        {/* Hint Text */}
        {!disabled && !isVictorious && !isGameOver && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Try full names, nicknames, or different variations
            </p>
          </div>
        )}
      </form>
    </div>
  );
}