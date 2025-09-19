"use client";
import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface HintsListProps {
  hints: string[];
  className?: string;
  lastGuessResult?: {
    isCorrect: boolean;
    hasNewHint: boolean;
    message?: string;
  } | null;
}

export default function HintsList({ hints, className = "", lastGuessResult }: HintsListProps) {
  const [visibleHints, setVisibleHints] = useState<string[]>([]);
  const { isDark } = useTheme();

  useEffect(() => {
    // Animate hints appearing one by one
    hints.forEach((hint, index) => {
      setTimeout(() => {
        setVisibleHints(prev => {
          if (!prev.includes(hint)) {
            return [...prev, hint];
          }
          return prev;
        });
      }, index * 150); // Stagger animation by 150ms
    });
  }, [hints]);

  if (hints.length === 0) return null;

  return (
    <div className={`rounded-2xl border shadow-lg overflow-hidden backdrop-blur-sm ${className}
      ${isDark
        ? 'bg-gray-800/80 border-gray-700'
        : 'bg-white/80 border-gray-200'
      }`}>
      {/* Header */}
      <div className={`bg-gradient-to-r px-6 py-4 border-b
        ${isDark
          ? 'from-blue-900/50 to-indigo-900/50 border-gray-700'
          : 'from-blue-50 to-indigo-50 border-gray-200'
        }`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold flex items-center gap-2
            ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            <svg className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Revealed Hints
          </h3>
          <span className={`text-sm font-medium px-3 py-1 rounded-full
            ${isDark
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-blue-100 text-blue-800'
            }`}>
            {hints.length} hint{hints.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Hints List */}
      <div className="p-6 space-y-4">
        {hints.map((hint, index) => {
          const isVisible = visibleHints.includes(hint);
          return (
            <div
              key={index}
              className={`transform transition-all duration-500 ease-out
                ${isVisible
                  ? 'translate-y-0 opacity-100 scale-100'
                  : 'translate-y-4 opacity-0 scale-95'
                }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className={`flex items-start gap-4 p-4 bg-gradient-to-r rounded-xl border
                            hover:shadow-md transition-shadow duration-200
                            ${isDark
                              ? 'from-gray-700/50 to-blue-800/50 border-gray-600'
                              : 'from-gray-50 to-blue-50 border-gray-200'
                            }`}>
                {/* Hint Number */}
                <div className={`flex-shrink-0 w-8 h-8 text-white rounded-full
                              flex items-center justify-center text-sm font-bold
                              ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}>
                  {index + 1}
                </div>

                {/* Hint Text */}
                <div className="flex-1">
                  <p className={`leading-relaxed
                    ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {hint}
                  </p>
                </div>

                {/* Decorative Element */}
                <div className="flex-shrink-0">
                  <svg className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-400'}`}
                       fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback Message - Only for incorrect guesses without new hints, but not for game over */}
      {lastGuessResult && !lastGuessResult.hasNewHint && lastGuessResult.isCorrect && (
        <div className="px-6 pb-2">
          <div className={`p-4 rounded-xl border text-center transition-all duration-300
            ${lastGuessResult.isCorrect
              ? isDark
                ? 'bg-green-900/50 border-green-700 text-green-200'
                : 'bg-green-50 border-green-200 text-green-800'
              : isDark
                ? 'bg-orange-900/50 border-orange-700 text-orange-200'
                : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {lastGuessResult.isCorrect ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                )}
              </svg>
              <span className="font-medium">
                {lastGuessResult.isCorrect ? 'Correct!' : 'Not quite right'}
              </span>
            </div>
            {lastGuessResult.message && (
              <p className="text-sm opacity-90">
                {lastGuessResult.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="px-6 pb-4">
        <div className={`text-xs text-center
          ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {lastGuessResult ? 'Use the hints above to guide your next guess!' : 'Keep guessing to reveal more hints!'}
        </div>
      </div>
    </div>
  );
}