"use client";
import { useEffect, useState } from "react";
import {
  getTodayPuzzle, submitGuess, getSessionStatus, completeSession, updateProgress,
  type PublicPuzzle, type GuessOut, type SessionStatus
} from "../lib/api";
import GameHeader from "../components/GameHeader";
import PuzzleInfo from "../components/PuzzleInfo";
import AlreadyPlayedMessage from "../components/AlreadyPlayedMessage";
import HintsList from "../components/HintsList";
import GuessForm from "../components/GuessForm";
import GameOverMessage from "../components/GameOverMessage";
import { useTheme } from "../contexts/ThemeContext";

export default function Home() {
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuessOut | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hints, setHints] = useState<string[]>([]); // local revealed hints
  const [revealedCount, setRevealedCount] = useState(0); // track locally revealed hints
  const [isVictorious, setIsVictorious] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastGuessResult, setLastGuessResult] = useState<{
    isCorrect: boolean;
    hasNewHint: boolean;
    message?: string;
  } | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Check session status first
        const session = await getSessionStatus();
        setSessionStatus(session);

        const p = await getTodayPuzzle();
        setPuzzle(p);

        // If user has already completed today's puzzle, show completed state
        if (session.has_played && !session.can_play) {
          setIsVictorious(session.result === 'won');
          setIsGameOver(session.result === 'lost');
          setAttemptCount(session.attempts);
          setRevealedCount(session.hints_revealed);

          // Set revealed hints from puzzle response
          setHints(p.revealed_hints || []);
        } else if (session.can_play && session.has_played) {
          // User is mid-game - restore their progress
          setRevealedCount(session.hints_revealed || 0);
          setAttemptCount(session.attempts || 0);
          setIsVictorious(false);
          setIsGameOver(false);

          // Set revealed hints from puzzle response
          setHints(p.revealed_hints || []);
        } else {
          // Fresh game
          setHints([]);
          setRevealedCount(0);
          setAttemptCount(0);
          setIsVictorious(false);
          setIsGameOver(false);
        }

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load puzzle");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleGuessSubmit(guess: string) {
    if (!puzzle || !sessionStatus?.can_play) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    setLastGuessResult(null);

    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);

    try {
      const r = await submitGuess({
        guess,
        revealed: revealedCount,
        signature: puzzle.signature,
        puzzle_date: puzzle.puzzle_date,
        hints_count: puzzle.hints_count,
      });
      setResult(r);

      let newRevealedCount = revealedCount;

      // Set feedback based on result
      if (r.correct) {
        setLastGuessResult({
          isCorrect: true,
          hasNewHint: false,
          message: "Well done!"
        });
      } else if (r.reveal_next_hint && r.next_hint) {
        // If backend tells us to reveal a hint, append it and bump local count
        setHints((prev) => [...prev, r.next_hint!]);
        newRevealedCount = revealedCount + 1;
        setRevealedCount(newRevealedCount);
        setLastGuessResult({
          isCorrect: false,
          hasNewHint: true
        });
      } else if (!r.correct && !r.reveal_next_hint) {
        // This is for wrong answer with no more hints (game over)
        // Don't show "Try again!" feedback for game over
        setLastGuessResult(null);
      }

      // Add shake for any incorrect answer
      if (!r.correct) {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
      }

      // Update progress on server (only if session exists) - Optional, don't block gameplay
      if (sessionStatus && sessionStatus.can_play) {
        try {
          console.log("Attempting to update progress:", { attempts: newAttemptCount, hints_revealed: newRevealedCount });
          await updateProgress({
            attempts: newAttemptCount,
            hints_revealed: newRevealedCount
          });
        } catch (progressError) {
          console.warn("Progress update failed (session issue), continuing game:", progressError);
          // Don't block the game if progress tracking fails
          // This is likely a development environment cookie issue
        }
      }

      // Handle game ending conditions
      if (r.correct) {
        setIsVictorious(true);
        // Complete session as won
        try {
          await completeSession({
            result: 'won',
            attempts: newAttemptCount,
            hints_revealed: newRevealedCount
          });
          // Update session status
          const updatedSession = await getSessionStatus();
          setSessionStatus(updatedSession);
        } catch (sessionError) {
          console.warn("Session completion failed, continuing game:", sessionError);
          // Don't block victory state if session tracking fails
        }
      } else if (!r.correct && !r.reveal_next_hint) {
        // Game over: hints exhausted, wrong guess
        setIsGameOver(true);
        // Complete session as lost
        try {
          await completeSession({
            result: 'lost',
            attempts: newAttemptCount,
            hints_revealed: newRevealedCount
          });
          // Update session status
          const updatedSession = await getSessionStatus();
          setSessionStatus(updatedSession);
        } catch (sessionError) {
          console.warn("Session completion failed, continuing game:", sessionError);
          // Don't block game over state if session tracking fails
        }
      }
    }
    catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Guess failed");
    }
    finally {
      setSubmitting(false);
    }
  }

  // Loading and error states
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center
        ${isDark
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
        }`}>
        <div className="text-center space-y-4">
          <div className={`animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto
            ${isDark ? 'border-blue-400' : 'border-blue-600'}`}></div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading today&apos;s puzzle...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6
        ${isDark
          ? 'bg-gradient-to-br from-red-900 via-pink-900 to-red-900'
          : 'bg-gradient-to-br from-red-50 via-pink-50 to-red-50'
        }`}>
        <div className={`rounded-2xl shadow-2xl p-8 max-w-md w-full text-center
          ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
            ${isDark ? 'bg-red-900/50' : 'bg-red-100'}`}>
            <svg className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-600'}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Oops! Something went wrong
          </h2>
          <p className={`mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`px-6 py-2 rounded-lg transition-colors
              ${isDark
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Custom PNG Background */}
      <div className="absolute inset-0">
        {/* Dark Mode Background */}
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500
            ${isDark ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: 'url(/backgrounds/dark-background.png)',
            backgroundColor: '#1f2937' // Fallback color if image doesn't load
          }}
        />

        {/* Light Mode Background */}
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500
            ${isDark ? 'opacity-0' : 'opacity-100'}`}
          style={{
            backgroundImage: 'url(/backgrounds/light-background.png)',
            backgroundColor: '#f8fafc' // Fallback color if image doesn't load
          }}
        />

        {/* Overlay for better text readability */}
        <div className={`absolute inset-0 transition-all duration-500
          ${isDark
            ? 'bg-black/20'
            : 'bg-white/20'
          }`}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-8">
            {/* Game Header */}
            <GameHeader className="mb-12" />

            {/* Game Content */}
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Puzzle Info */}
              {puzzle && (
                <PuzzleInfo
                  puzzleDate={puzzle.puzzle_date}
                  attempts={attemptCount}
                  maxAttempts={puzzle.hints_count + 1}
                  sessionStatus={sessionStatus}
                />
              )}

              {/* Already Played Message */}
              {sessionStatus && !sessionStatus.can_play && !isVictorious && !isGameOver && (
                <AlreadyPlayedMessage sessionStatus={sessionStatus} />
              )}

              {/* Hints List */}
              <HintsList hints={hints} lastGuessResult={lastGuessResult} />

              {/* Guess Form */}
              {sessionStatus?.can_play && (
                <GuessForm
                  onSubmit={handleGuessSubmit}
                  disabled={!sessionStatus?.can_play || !puzzle}
                  loading={submitting}
                  isVictorious={isVictorious}
                  isGameOver={isGameOver}
                  triggerShake={shouldShake}
                />
              )}


              {/* Game Over Message */}
              <GameOverMessage
                isVictorious={isVictorious}
                isGameOver={isGameOver}
                result={result}
                hints={hints}
                revealedCount={revealedCount}
                attempts={attemptCount}
              />

              {/* Error Display */}
              {error && !loading && (
                <div className={`rounded-2xl border shadow-lg p-6 text-center backdrop-blur-sm
                  ${isDark
                    ? 'bg-red-900/80 border-red-700'
                    : 'bg-red-50/80 border-red-200'
                  }`}>
                  <p className={`font-medium ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                    Error: {error}
                  </p>
                  <button
                    onClick={() => setError(null)}
                    className={`mt-2 text-sm underline transition-colors
                      ${isDark ? 'text-red-300 hover:text-red-100' : 'text-red-600 hover:text-red-800'}`}
                  >
                    Dismiss
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
