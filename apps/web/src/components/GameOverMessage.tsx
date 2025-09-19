"use client";
import { useEffect, useState } from "react";
import { type GuessOut } from "../lib/api";

interface GameOverMessageProps {
  isVictorious: boolean;
  isGameOver: boolean;
  result: GuessOut | null;
  hints: string[];
  revealedCount: number;
  attempts: number;
  className?: string;
}

export default function GameOverMessage({
  isVictorious,
  isGameOver,
  result,
  hints,
  revealedCount,
  attempts,
  className = ""
}: GameOverMessageProps) {
  const [isVisible, setIsVisible] = useState(false);

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
        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50
                      border-2 border-green-200 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          {/* Celebration Header */}
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500
                          rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-green-800">
                Congratulations!
              </h2>
              <p className="text-xl text-green-700 font-medium">
                You solved today&apos;s Figurdle!
              </p>
            </div>
          </div>

          {/* Answer Reveal */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-green-200">
            <div className="text-green-800 font-semibold text-lg">
              The answer was:
            </div>
            <div className="text-3xl font-bold text-green-900 bg-gradient-to-r from-green-600 to-emerald-600
                          bg-clip-text text-transparent">
              {result?.normalized_answer}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{attempts}</div>
              <div className="text-sm text-green-700 font-medium">Attempt{attempts !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{revealedCount}</div>
              <div className="text-sm text-green-700 font-medium">Hint{revealedCount !== 1 ? 's' : ''} Used</div>
            </div>
          </div>

          {/* Hints Summary */}
          {hints.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-left border border-green-200">
              <div className="font-semibold text-green-800 mb-3 text-center">
                Hints you revealed:
              </div>
              <ul className="space-y-2">
                {hints.map((hint, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full
                                   flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Call to Action */}
          <div className="pt-4 border-t border-green-200">
            <p className="text-green-700 font-medium">
              Come back tomorrow for a new famous figure!
            </p>
            <p className="text-sm text-green-600 mt-1">
              New puzzles available daily at 12:01 AM PST
            </p>
          </div>
        </div>
      ) : (
        /* Game Over Message */
        <div className="bg-gradient-to-br from-red-50 via-orange-50 to-red-50
                      border-2 border-red-200 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          {/* Game Over Header */}
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500
                          rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-red-800">
                Game Over
              </h2>
              <p className="text-xl text-red-700 font-medium">
                Better luck tomorrow!
              </p>
            </div>
          </div>

          {/* Answer Reveal */}
          {result?.normalized_answer && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-red-200">
              <div className="text-red-800 font-semibold text-lg">
                The answer was:
              </div>
              <div className="text-3xl font-bold text-red-900 bg-gradient-to-r from-red-600 to-orange-600
                            bg-clip-text text-transparent">
                {result.normalized_answer}
              </div>
            </div>
          )}

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-600">{attempts}</div>
              <div className="text-sm text-red-700 font-medium">Attempt{attempts !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-600">{revealedCount}</div>
              <div className="text-sm text-red-700 font-medium">Hint{revealedCount !== 1 ? 's' : ''} Used</div>
            </div>
          </div>

          {/* Encouragement */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-200">
            <p className="text-red-700 font-medium">
              Unlucky, all hints revealed and attempts exhausted...
            </p>
          </div>

          {/* Call to Action */}
          <div className="pt-4 border-t border-red-200">
            <p className="text-red-700 font-medium">
              Come back tomorrow for a new challenge!
            </p>
            <p className="text-sm text-red-600 mt-1">
              New puzzles available daily at 12:01 AM PST
            </p>
          </div>
        </div>
      )}
    </div>
  );
}