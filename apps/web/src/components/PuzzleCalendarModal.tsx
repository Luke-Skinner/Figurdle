"use client";
import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { getAvailablePuzzles, type AvailablePuzzle } from "../lib/api";

interface PuzzleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  currentDate?: string;
}

export default function PuzzleCalendarModal({
  isOpen,
  onClose,
  onSelectDate,
  currentDate
}: PuzzleCalendarModalProps) {
  const { isDark } = useTheme();
  const [puzzles, setPuzzles] = useState<AvailablePuzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPuzzles();
    }
  }, [isOpen]);

  async function loadPuzzles() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailablePuzzles();
      setPuzzles(data.puzzles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load puzzles");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDate(date: string) {
    onSelectDate(date);
    onClose();
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function isToday(dateStr: string): boolean {
    const today = new Date();
    const date = new Date(dateStr + 'T00:00:00');
    return date.toDateString() === today.toDateString();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl border-2 overflow-hidden
          ${isDark
            ? 'bg-gray-800 border-amber-600/50'
            : 'bg-white border-amber-200'
          }`}>

          {/* Header */}
          <div className={`p-6 border-b
            ${isDark ? 'border-amber-600/50' : 'border-amber-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold
                ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Select a Puzzle
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors
                  ${isDark
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-4 border-t-transparent
                  ${isDark ? 'border-amber-400' : 'border-amber-600'}`}></div>
              </div>
            )}

            {error && (
              <div className={`rounded-lg p-4 text-center
                ${isDark ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'}`}>
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {puzzles.map((puzzle) => (
                  <button
                    key={puzzle.puzzle_date}
                    onClick={() => handleSelectDate(puzzle.puzzle_date)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200
                      hover:scale-105 focus:outline-none focus:ring-4
                      ${currentDate === puzzle.puzzle_date
                        ? isDark
                          ? 'bg-amber-900/50 border-amber-500 text-amber-200'
                          : 'bg-amber-100 border-amber-500 text-amber-900'
                        : isDark
                          ? 'bg-gray-700/50 border-gray-600 hover:border-amber-500/50 text-gray-200'
                          : 'bg-gray-50 border-gray-200 hover:border-amber-400 text-gray-900'
                      }
                      ${isDark ? 'focus:ring-amber-500/30' : 'focus:ring-amber-500/30'}
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="font-semibold">
                        {formatDate(puzzle.puzzle_date)}
                      </div>
                      {isToday(puzzle.puzzle_date) && (
                        <div className={`text-xs px-2 py-1 rounded-full
                          ${isDark ? 'bg-amber-700 text-amber-200' : 'bg-amber-200 text-amber-800'}`}>
                          Today
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && !error && puzzles.length === 0 && (
              <div className={`text-center py-12
                ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No puzzles available yet.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t
            ${isDark ? 'border-amber-600/50 bg-gray-900/50' : 'border-amber-200 bg-gray-50'}`}>
            <p className={`text-sm text-center
              ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Select any past puzzle to play or replay
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
