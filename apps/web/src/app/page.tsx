"use client";
import { useEffect, useState } from "react";
import {
  getTodayPuzzle, getPuzzleByDate, submitGuess, getSessionStatus, completeSession, updateProgress,
  PuzzleNotReadyError,
  type PublicPuzzle, type GuessOut, type SessionStatus
} from "../lib/api";
import GameHeader from "../components/GameHeader";
import PuzzleInfo from "../components/PuzzleInfo";
import AlreadyPlayedMessage from "../components/AlreadyPlayedMessage";
import HintsList from "../components/HintsList";
import GuessForm from "../components/GuessForm";
import GameOverMessage from "../components/GameOverMessage";
import PortraitPlate, { type PlateState } from "../components/PortraitPlate";

export default function Home() {
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [result, setResult] = useState<GuessOut | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hints, setHints] = useState<string[]>([]); // local revealed hints
  const [revealedCount, setRevealedCount] = useState(0); // track locally revealed hints
  const [actuallyRevealedCount, setActuallyRevealedCount] = useState(0); // hints player revealed during gameplay
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function handleDateSelection(date: string) {
    // Reset all game state when selecting a new date
    setSelectedDate(date);
    setResult(null);
    setHints([]);
    setRevealedCount(0);
    setActuallyRevealedCount(0);
    setIsVictorious(false);
    setIsGameOver(false);
    setAttemptCount(0);
    setLastGuessResult(null);
    setError(null);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Load puzzle by selected date or today
        const p = selectedDate
          ? await getPuzzleByDate(selectedDate)
          : await getTodayPuzzle();
        setPuzzle(p);

        // Check session status for this puzzle
        const session = await getSessionStatus(p.puzzle_date);
        setSessionStatus(session);

        // If user has already completed today's puzzle, show completed state
        if (session.has_played && !session.can_play) {
          setIsVictorious(session.result === 'won');
          setIsGameOver(session.result === 'lost');
          setAttemptCount(session.attempts);
          setActuallyRevealedCount(session.hints_revealed); // Store the actual count from session
          setRevealedCount(session.hints_revealed);

          // Set revealed hints from puzzle response
          setHints(p.revealed_hints || []);

          // Create a result object with the answer for display
          if (p.answer) {
            setResult({
              correct: session.result === 'won',
              reveal_next_hint: false,
              next_hint: null,
              normalized_answer: p.answer
            });
          }
        } else if (session.can_play && session.has_played) {
          // User is mid-game - restore their progress
          setRevealedCount(session.hints_revealed || 0);
          setActuallyRevealedCount(session.hints_revealed || 0);
          setAttemptCount(session.attempts || 0);
          setIsVictorious(false);
          setIsGameOver(false);

          // Set revealed hints from puzzle response
          setHints(p.revealed_hints || []);
        } else {
          // Fresh game
          setHints([]);
          setRevealedCount(0);
          setActuallyRevealedCount(0);
          setAttemptCount(0);
          setIsVictorious(false);
          setIsGameOver(false);
        }

      } catch (e: unknown) {
        if (e instanceof PuzzleNotReadyError) {
          setNotReady(true);
        } else {
          setError(e instanceof Error ? e.message : "Failed to load puzzle");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate]);

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
        setActuallyRevealedCount(newRevealedCount); // Track what player actually revealed
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
            hints_revealed: newRevealedCount,
            puzzle_date: puzzle.puzzle_date
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
            hints_revealed: newRevealedCount,
            puzzle_date: puzzle.puzzle_date
          });
          // Update session status and refetch puzzle with answer, image, and all hints
          const updatedSession = await getSessionStatus(puzzle.puzzle_date);
          setSessionStatus(updatedSession);
          const updatedPuzzle = selectedDate
            ? await getPuzzleByDate(selectedDate)
            : await getTodayPuzzle();
          setPuzzle(updatedPuzzle);
          // Show all hints now that game is completed
          setHints(updatedPuzzle.revealed_hints || []);
          setRevealedCount(updatedPuzzle.revealed_hints?.length || 0);
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
            hints_revealed: newRevealedCount,
            puzzle_date: puzzle.puzzle_date
          });
          // Update session status and refetch puzzle with answer, image, and all hints
          const updatedSession = await getSessionStatus(puzzle.puzzle_date);
          setSessionStatus(updatedSession);
          const updatedPuzzle = selectedDate
            ? await getPuzzleByDate(selectedDate)
            : await getTodayPuzzle();
          setPuzzle(updatedPuzzle);
          // Show all hints now that game is completed
          setHints(updatedPuzzle.revealed_hints || []);
          setRevealedCount(updatedPuzzle.revealed_hints?.length || 0);
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

  async function handleSkip() {
    if (!puzzle || submitting || isVictorious || isGameOver || revealedCount >= puzzle.hints_count) {
      return;
    }

    setSubmitting(true);

    // Increment attempt count
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);

    try {
      // Submit a dummy guess to trigger hint reveal from backend
      const r = await submitGuess({
        guess: "__SKIP__", // Special marker that will fail but trigger hint
        revealed: revealedCount,
        signature: puzzle.signature,
        puzzle_date: puzzle.puzzle_date,
        hints_count: puzzle.hints_count,
      });

      let newRevealedCount = revealedCount;

      // The backend will return the next hint
      if (r.reveal_next_hint && r.next_hint) {
        setHints((prev) => [...prev, r.next_hint!]);
        newRevealedCount = revealedCount + 1;
        setRevealedCount(newRevealedCount);
        setActuallyRevealedCount(newRevealedCount); // Track what player actually revealed
        setLastGuessResult({
          isCorrect: false,
          hasNewHint: true
        });
      }

      // Update progress on server
      if (sessionStatus && sessionStatus.can_play) {
        try {
          await updateProgress({
            attempts: newAttemptCount,
            hints_revealed: newRevealedCount
          });
        } catch (progressError) {
          console.warn("Progress update failed (session issue), continuing game:", progressError);
        }
      }

      // Check if this was the last hint - trigger game over
      if (!r.reveal_next_hint && newRevealedCount >= puzzle.hints_count) {
        setIsGameOver(true);
        try {
          await completeSession({
            result: 'lost',
            attempts: newAttemptCount,
            hints_revealed: newRevealedCount
          });
          // Update session status and refetch puzzle with answer and image
          const updatedSession = await getSessionStatus();
          setSessionStatus(updatedSession);
          const updatedPuzzle = await getTodayPuzzle();
          setPuzzle(updatedPuzzle);
        } catch (sessionError) {
          console.warn("Session completion failed, continuing game:", sessionError);
        }
      }
    } catch (e: unknown) {
      console.error("Skip failed:", e);
    } finally {
      setSubmitting(false);
    }
  }

  const shell = "mx-auto flex w-full max-w-xl flex-col gap-10 px-5 py-10 sm:px-8";

  // A skeleton in the shape of the placard rather than a spinner, so the layout
  // does not shift once the puzzle lands.
  if (loading) {
    return (
      <div className="min-h-[100dvh]">
        <div className={shell}>
          <div className="h-4 animate-pulse border-b border-rule" />
          <div className="flex flex-col gap-6 border border-rule bg-placard p-5 shadow-plate sm:p-7">
            <div className="mx-auto aspect-[4/5] w-full max-w-[17rem] animate-pulse border border-rule bg-wall" />
            <div className="h-10 animate-pulse border-y border-rule" />
            <div className="flex flex-col">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse border-b border-rule" />
              ))}
            </div>
          </div>
          <p className="label text-center">Loading the day&apos;s figure</p>
        </div>
      </div>
    );
  }

  // Expected, recoverable: generation runs behind the request, so the puzzle
  // usually lands within a minute. Offer the Archive rather than a dead end.
  if (notReady) {
    return (
      <div className="min-h-[100dvh]">
        <div className={shell}>
          <GameHeader onSelectDate={handleDateSelection} currentDate={undefined} />
          <main className="flex flex-col gap-5 border border-rule bg-placard p-7 shadow-plate">
            <h1 className="font-display text-xl font-medium">
              Today&apos;s figure isn&apos;t ready yet
            </h1>
            <p className="text-base text-ink-muted">
              It&apos;s being prepared now. Check back in a minute, or play any
              previous puzzle from the Archive.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="border border-accent bg-accent px-5 py-3 font-sans text-sm
                           font-semibold uppercase tracking-label text-accent-contrast
                           transition-opacity duration-fast hover:opacity-85 active:translate-y-px"
              >
                Check again
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error && !puzzle) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-5">
        <div className="flex w-full max-w-sm flex-col gap-4 border border-rule bg-placard p-7 shadow-plate">
          <h1 className="font-display text-xl font-medium">
            The puzzle didn&apos;t load
          </h1>
          <p className="text-base text-ink-muted">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="self-start border border-accent bg-accent px-5 py-3
                       font-sans text-sm font-semibold uppercase tracking-label text-accent-contrast
                       transition-opacity duration-fast hover:opacity-85 active:translate-y-px"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const plateState: PlateState = isVictorious ? "lit" : isGameOver ? "unlit" : "covered";
  const answer = result?.normalized_answer || puzzle?.answer;
  const playing = Boolean(sessionStatus?.can_play) && !isVictorious && !isGameOver;

  return (
    <div className="min-h-[100dvh]">
      <div className={shell}>
        <GameHeader
          onSelectDate={handleDateSelection}
          currentDate={puzzle?.puzzle_date}
        />

        {/* One placard. Hierarchy comes from rules, space and type rather than
            a stack of separately bordered cards. */}
        <main className="flex flex-col gap-6 border border-rule bg-placard p-5 shadow-plate sm:p-7">
          <PortraitPlate
            state={plateState}
            imageUrl={puzzle?.image_url}
            answer={answer}
          />

          {puzzle && (
            <PuzzleInfo
              puzzleDate={puzzle.puzzle_date}
              attempts={attemptCount}
              maxAttempts={puzzle.hints_count + 1}
              sessionStatus={sessionStatus}
            />
          )}

          <HintsList
            hints={hints}
            totalHints={puzzle?.hints_count ?? 0}
            lastGuessResult={lastGuessResult}
          />

          {playing && (
            <GuessForm
              onSubmit={handleGuessSubmit}
              onSkip={handleSkip}
              disabled={!puzzle}
              loading={submitting}
              isVictorious={isVictorious}
              isGameOver={isGameOver}
              triggerShake={shouldShake}
            />
          )}

          <GameOverMessage
            isVictorious={isVictorious}
            isGameOver={isGameOver}
            revealedCount={actuallyRevealedCount}
            attempts={attemptCount}
          />
        </main>

        {sessionStatus && !sessionStatus.can_play && !isVictorious && !isGameOver && (
          <AlreadyPlayedMessage sessionStatus={sessionStatus} />
        )}

        {error && (
          <div
            role="status"
            className="flex flex-wrap items-baseline justify-between gap-3 border border-rule px-4 py-3"
          >
            <p className="text-sm text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="font-data text-xs uppercase tracking-label text-accent
                         transition-opacity duration-fast hover:opacity-70"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
