"use client";
import { useEffect, useState } from "react";
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
  const [puzzles, setPuzzles] = useState<AvailablePuzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPuzzles();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  async function loadPuzzles() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailablePuzzles();
      setPuzzles(data.puzzles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The archive didn't load");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDate(date: string) {
    onSelectDate(date);
    onClose();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00')
      .toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      .toUpperCase();
  }

  function isToday(dateStr: string): boolean {
    const today = new Date();
    const date = new Date(dateStr + 'T00:00:00');
    return date.toDateString() === today.toDateString();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-[rgb(var(--shadow)/0.55)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col
                      border border-rule bg-placard shadow-plate">
        <div className="flex items-baseline justify-between gap-4 border-b border-rule px-6 py-4">
          <h2 id="archive-title" className="font-display text-xl font-medium">
            Archive
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-data text-xs uppercase tracking-label text-ink-muted
                       transition-colors duration-fast hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-2">
          {loading && (
            <ol className="m-0 list-none p-0">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i} className="h-12 animate-pulse border-b border-rule" />
              ))}
            </ol>
          )}

          {error && (
            <p className="py-6 text-base text-ink-muted">{error}</p>
          )}

          {!loading && !error && puzzles.length === 0 && (
            <p className="py-6 text-base text-ink-muted">
              No past puzzles yet. The first one lands tomorrow.
            </p>
          )}

          {!loading && !error && puzzles.length > 0 && (
            <ol className="m-0 list-none p-0">
              {puzzles.map((puzzle) => {
                const selected = currentDate === puzzle.puzzle_date;
                return (
                  <li key={puzzle.puzzle_date}>
                    <button
                      type="button"
                      onClick={() => handleSelectDate(puzzle.puzzle_date)}
                      aria-current={selected ? "true" : undefined}
                      className={`flex w-full items-baseline justify-between gap-4 border-b border-rule
                                  py-3 text-left font-data text-sm tabular
                                  transition-colors duration-fast
                                  ${selected
                                    ? "text-accent"
                                    : "text-ink-muted hover:text-ink"}`}
                    >
                      <span>{formatDate(puzzle.puzzle_date)}</span>
                      <span className="text-xs uppercase tracking-label">
                        {selected ? "Showing" : isToday(puzzle.puzzle_date) ? "Today" : "Play"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="border-t border-rule px-6 py-3 text-sm text-ink-muted">
          Any past puzzle can be played or replayed.
        </p>
      </div>
    </div>
  );
}
