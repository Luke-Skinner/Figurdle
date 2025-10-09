"use client";
import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { type GuessOut, type PublicPuzzle } from "../lib/api";

interface GameOverMessageProps {
  isVictorious: boolean;
  isGameOver: boolean;
  result: GuessOut | null;
  hints: string[];
  revealedCount: number;
  attempts: number;
  puzzle: PublicPuzzle | null;
  className?: string;
}

export default function GameOverMessage({
  isVictorious,
  isGameOver,
  result,
  hints,
  revealedCount,
  attempts,
  puzzle,
  className = ""
}: GameOverMessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (isVictorious || isGameOver) {
      // Add a small delay for dramatic effect
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isVictorious, isGameOver]);

  if (!isVictorious && !isGameOver) return null;

  return (
    <div className={`transform transition-all duration-700 ease-out
      ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
      ${className}`}
    >
      {isVictorious ? (
        /* Victory Message */
        <div className={`rounded-3xl p-8 text-center space-y-6 shadow-2xl border-2 bg-gradient-to-br
          ${isDark
            ? 'from-amber-900/20 via-yellow-900/20 to-amber-900/20 border-amber-600/50'
            : 'from-amber-50 via-yellow-50 to-amber-50 border-amber-200'
          }`}>
          {/* Celebration Header */}
          <div className="space-y-4">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-lg animate-bounce bg-gradient-to-br
              ${isDark
                ? 'from-amber-500 to-yellow-600'
                : 'from-amber-400 to-yellow-500'
              }`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className={`text-3xl md:text-4xl font-bold
                ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Congratulations!
              </h2>
              <p className={`text-xl font-medium
                ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                You solved today&apos;s Figurdle!
              </p>
            </div>
          </div>

          {/* Answer Reveal */}
          <div className={`backdrop-blur-sm rounded-2xl p-6 space-y-4 border
            ${isDark
              ? 'bg-gray-800/80 border-amber-600/50'
              : 'bg-white/80 border-amber-200'
            }`}>
            <div className={`font-semibold text-lg
              ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              The answer was:
            </div>
            <div className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent
              ${isDark
                ? 'from-amber-400 to-yellow-500'
                : 'from-amber-600 to-yellow-600'
              }`}>
              {result?.normalized_answer || puzzle?.answer}
            </div>
            <div className="mt-4">
              <img
                src={puzzle?.image_url || 'https://via.placeholder.com/400x400.png?text=No+Image+Available'}
                alt={result?.normalized_answer || puzzle?.answer || 'Character'}
                className="mx-auto rounded-lg shadow-lg max-w-xs w-full object-cover"
                loading="eager"
                crossOrigin="anonymous"
                width="400"
                height="400"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const img = e.target as HTMLImageElement;
                  if (img.src !== 'https://via.placeholder.com/400x400.png?text=No+Image+Available') {
                    img.src = 'https://via.placeholder.com/400x400.png?text=No+Image+Available';
                  }
                }}
              />
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`backdrop-blur-sm rounded-xl p-4 border
              ${isDark
                ? 'bg-gray-800/70 border-amber-600/50'
                : 'bg-white/70 border-amber-200'
              }`}>
              <div className={`text-2xl font-bold
                ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{attempts}</div>
              <div className={`text-sm font-medium
                ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Attempt{attempts !== 1 ? 's' : ''}</div>
            </div>
            <div className={`backdrop-blur-sm rounded-xl p-4 border
              ${isDark
                ? 'bg-gray-800/70 border-amber-600/50'
                : 'bg-white/70 border-amber-200'
              }`}>
              <div className={`text-2xl font-bold
                ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{revealedCount}</div>
              <div className={`text-sm font-medium
                ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Hint{revealedCount !== 1 ? 's' : ''} Used</div>
            </div>
          </div>

          {/* Hints Summary */}
          {hints.length > 0 && (
            <div className={`backdrop-blur-sm rounded-xl p-4 text-left border
              ${isDark
                ? 'bg-gray-800/70 border-amber-600/50'
                : 'bg-white/70 border-amber-200'
              }`}>
              <div className={`font-semibold mb-3 text-center
                ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Hints you revealed:
              </div>
              <ul className="space-y-2">
                {hints.map((hint, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm
                    ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                      ${isDark
                        ? 'bg-amber-700 text-amber-200'
                        : 'bg-amber-100 text-amber-600'
                      }`}>
                      {i + 1}
                    </span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Call to Action */}
          <div className={`pt-4 border-t
            ${isDark ? 'border-amber-600/50' : 'border-amber-200'}`}>
            <p className={`font-medium
              ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              Come back tomorrow for a new famous figure!
            </p>
            <p className={`text-sm mt-1
              ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              New puzzles available daily at 12:01 AM PST
            </p>
          </div>
        </div>
      ) : (
        /* Game Over Message */
        <div className={`rounded-3xl p-8 text-center space-y-6 shadow-2xl border-2 bg-gradient-to-br
          ${isDark
            ? 'from-orange-900/20 via-red-900/20 to-orange-900/20 border-orange-600/50'
            : 'from-orange-50 via-red-50 to-orange-50 border-orange-200'
          }`}>
          {/* Game Over Header */}
          <div className="space-y-4">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br
              ${isDark
                ? 'from-orange-500 to-red-600'
                : 'from-orange-400 to-red-500'
              }`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className={`text-3xl md:text-4xl font-bold
                ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                Game Over
              </h2>
              <p className={`text-xl font-medium
                ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                Better luck tomorrow!
              </p>
            </div>
          </div>

          {/* Answer Reveal */}
          {(result?.normalized_answer || puzzle?.answer) && (
            <div className={`backdrop-blur-sm rounded-2xl p-6 space-y-4 border
              ${isDark
                ? 'bg-gray-800/80 border-orange-600/50'
                : 'bg-white/80 border-orange-200'
              }`}>
              <div className={`font-semibold text-lg
                ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                The answer was:
              </div>
              <div className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent
                ${isDark
                  ? 'from-orange-400 to-red-500'
                  : 'from-orange-600 to-red-600'
                }`}>
                {result?.normalized_answer || puzzle?.answer}
              </div>
              <div className="mt-4">
                <img
                  src={puzzle?.image_url || 'https://via.placeholder.com/400x400.png?text=No+Image+Available'}
                  alt={result?.normalized_answer || puzzle?.answer || 'Character'}
                  className="mx-auto rounded-lg shadow-lg max-w-xs w-full object-cover"
                  loading="eager"
                  crossOrigin="anonymous"
                  width="400"
                  height="400"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const img = e.target as HTMLImageElement;
                    if (img.src !== 'https://via.placeholder.com/400x400.png?text=No+Image+Available') {
                      img.src = 'https://via.placeholder.com/400x400.png?text=No+Image+Available';
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`backdrop-blur-sm rounded-xl p-4 border
              ${isDark
                ? 'bg-gray-800/70 border-orange-600/50'
                : 'bg-white/70 border-orange-200'
              }`}>
              <div className={`text-2xl font-bold
                ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{attempts}</div>
              <div className={`text-sm font-medium
                ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>Attempt{attempts !== 1 ? 's' : ''}</div>
            </div>
            <div className={`backdrop-blur-sm rounded-xl p-4 border
              ${isDark
                ? 'bg-gray-800/70 border-orange-600/50'
                : 'bg-white/70 border-orange-200'
              }`}>
              <div className={`text-2xl font-bold
                ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{revealedCount}</div>
              <div className={`text-sm font-medium
                ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>Hint{revealedCount !== 1 ? 's' : ''} Used</div>
            </div>
          </div>

          {/* Encouragement */}
          <div className={`backdrop-blur-sm rounded-xl p-4 border
            ${isDark
              ? 'bg-gray-800/70 border-orange-600/50'
              : 'bg-white/70 border-orange-200'
            }`}>
            <p className={`font-medium
              ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
              Unlucky, all hints revealed and attempts exhausted...
            </p>
          </div>

          {/* Call to Action */}
          <div className={`pt-4 border-t
            ${isDark ? 'border-orange-600/50' : 'border-orange-200'}`}>
            <p className={`font-medium
              ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
              Come back tomorrow for a new challenge!
            </p>
            <p className={`text-sm mt-1
              ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
              New puzzles available daily at 12:01 AM PST
            </p>
          </div>
        </div>
      )}
    </div>
  );
}