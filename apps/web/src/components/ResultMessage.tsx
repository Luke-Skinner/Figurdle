"use client";
import { useEffect, useState } from "react";
import { type GuessOut } from "../lib/api";

interface ResultMessageProps {
  result: GuessOut | null;
  isVictorious: boolean;
  isGameOver: boolean;
  className?: string;
}

export default function ResultMessage({
  result,
  isVictorious,
  isGameOver,
  className = ""
}: ResultMessageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (result && !isVictorious && !isGameOver) {
      setIsVisible(true);
      // Auto-hide after 5 seconds for non-final results
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [result, isVictorious, isGameOver]);

  if (!result || !isVisible || isVictorious || isGameOver) return null;

  const isCorrect = result.correct;

  return (
    <div className={`transform transition-all duration-500 ease-out
      ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
      ${className}`}
    >
      <div className={`rounded-2xl border-2 p-6 shadow-lg
        ${isCorrect
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
          : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
        }`}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            ${isCorrect ? 'bg-green-100' : 'bg-orange-100'}`}
          >
            <svg className={`w-6 h-6 ${isCorrect ? 'text-green-600' : 'text-orange-600'}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isCorrect ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              )}
            </svg>
          </div>

          <div>
            <h3 className={`text-xl font-bold
              ${isCorrect ? 'text-green-800' : 'text-orange-800'}`}
            >
              {isCorrect ? "Correct!" : "Not quite right"}
            </h3>
            <p className={`text-sm
              ${isCorrect ? 'text-green-600' : 'text-orange-600'}`}
            >
              {isCorrect ? "Well done!" : "Keep trying!"}
            </p>
          </div>
        </div>

        {/* Answer Display (when correct or game over) */}
        {result.normalized_answer && (
          <div className={`mb-4 p-4 rounded-xl border
            ${isCorrect
              ? 'bg-green-100 border-green-200'
              : 'bg-gray-100 border-gray-200'
            }`}
          >
            <div className={`text-sm font-medium mb-1
              ${isCorrect ? 'text-green-800' : 'text-gray-700'}`}
            >
              Answer:
            </div>
            <div className={`text-lg font-bold
              ${isCorrect ? 'text-green-900' : 'text-gray-900'}`}
            >
              {result.normalized_answer}
            </div>
          </div>
        )}

        {/* New Hint Reveal */}
        {result.reveal_next_hint && result.next_hint && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-amber-800 mb-1">
                  New hint revealed:
                </div>
                <p className="text-amber-900">
                  {result.next_hint}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Encouragement */}
        {!isCorrect && !result.normalized_answer && (
          <div className="text-center mt-4">
            <p className="text-sm text-orange-600">
              Use the hints above to guide your next guess!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}