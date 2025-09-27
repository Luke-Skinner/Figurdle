import { type SessionStatus } from "../lib/api";

interface AlreadyPlayedMessageProps {
  sessionStatus: SessionStatus;
  className?: string;
}

export default function AlreadyPlayedMessage({ sessionStatus, className = "" }: AlreadyPlayedMessageProps) {
  const isVictory = sessionStatus.result === 'won';

  return (
    <div className={`rounded-2xl border-2 p-6 text-center space-y-4 transition-all duration-300
      ${isVictory
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
        : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
      } ${className}`}
    >
      {/* Icon */}
      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center
        ${isVictory ? 'bg-green-100' : 'bg-amber-100'}`}
      >
        <svg className={`w-8 h-8 ${isVictory ? 'text-green-600' : 'text-amber-600'}`}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isVictory ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>

      {/* Main Message */}
      <div className="space-y-2">
        <h2 className={`text-2xl font-bold ${isVictory ? 'text-green-800' : 'text-amber-800'}`}>
          You&apos;ve already played today!
        </h2>
        <p className={`text-lg ${isVictory ? 'text-green-700' : 'text-amber-700'}`}>
          Result: <span className="font-semibold">
            {isVictory ? 'Victory' : 'Lost'}
          </span>
        </p>
      </div>

      {/* Statistics */}
      <div className={`bg-white/70 backdrop-blur-sm rounded-xl p-4 space-y-2 border
        ${isVictory ? 'border-green-200' : 'border-amber-200'}`}
      >
        <div className={`text-sm font-medium ${isVictory ? 'text-green-800' : 'text-amber-800'}`}>
          Your Performance
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isVictory ? 'text-green-600' : 'text-amber-600'}`}>
              {sessionStatus.attempts}
            </div>
            <div className={`text-xs ${isVictory ? 'text-green-600' : 'text-amber-600'} uppercase tracking-wide`}>
              Attempts
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isVictory ? 'text-green-600' : 'text-amber-600'}`}>
              {sessionStatus.hints_revealed}
            </div>
            <div className={`text-xs ${isVictory ? 'text-green-600' : 'text-amber-600'} uppercase tracking-wide`}>
              Hints Used
            </div>
          </div>
        </div>
      </div>

      {/* Completion Time */}
      {sessionStatus.completed_at && (
        <div className={`text-sm ${isVictory ? 'text-green-600' : 'text-amber-600'}`}>
          Completed at {new Date(sessionStatus.completed_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </div>
      )}

      {/* Call to Action */}
      <div className={`pt-2 border-t ${isVictory ? 'border-green-200' : 'border-amber-200'}`}>
        <p className={`text-sm font-medium ${isVictory ? 'text-green-700' : 'text-amber-700'}`}>
          Come back tomorrow for a new challenge!
        </p>
        <div className="mt-2 text-xs text-gray-500">
          New puzzles available daily at 12:01 AM PST
        </div>
      </div>
    </div>
  );
}