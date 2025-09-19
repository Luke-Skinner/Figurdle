import { type SessionStatus } from "../lib/api";
import { useTheme } from "../contexts/ThemeContext";

interface PuzzleInfoProps {
  puzzleDate: string;
  attempts: number;
  sessionStatus: SessionStatus | null;
  className?: string;
}

export default function PuzzleInfo({
  puzzleDate,
  attempts,
  sessionStatus,
  className = ""
}: PuzzleInfoProps) {
  const { isDark } = useTheme();

  return (
    <div className={`rounded-2xl p-6 shadow-lg border ${className}
      ${isDark
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-100'
      }`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Puzzle Date */}
        <div className="text-center md:text-left">
          <div className={`text-sm font-medium uppercase tracking-wide
            ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Puzzle Date
          </div>
          <div className={`text-xl font-bold mt-1
            ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {new Date(puzzleDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Center Question Mark */}
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center
            ${isDark
              ? 'bg-blue-900/30 border-2 border-blue-700/50'
              : 'bg-blue-50 border-2 border-blue-200'
            }`}>
            <span className={`text-3xl font-bold
              ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              ?
            </span>
          </div>
        </div>

        {/* Attempts */}
        <div className="text-center md:text-right">
          <div className={`text-sm font-medium uppercase tracking-wide
            ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Attempts
          </div>
          <div className={`text-2xl font-bold mt-1
            ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            {attempts}
          </div>
        </div>
      </div>

      {/* Completion Status Badge */}
      {sessionStatus?.has_played && !sessionStatus.can_play && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${sessionStatus.result === 'won'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              <svg className={`w-4 h-4 mr-2 ${sessionStatus.result === 'won' ? 'text-green-500' : 'text-red-500'}`}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sessionStatus.result === 'won' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              Completed: {sessionStatus.result === 'won' ? 'Victory' : 'Lost'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}