"use client";

interface GameOverMessageProps {
  isVictorious: boolean;
  isGameOver: boolean;
  revealedCount: number;
  attempts: number;
  className?: string;
}

/**
 * The closing summary. The portrait and the figure's name are handled by
 * PortraitPlate, so this carries only the record of how the puzzle went.
 *
 * Win and loss share one palette. The difference is carried by the plate being
 * lit or unlit, which is why there is no green here and no red.
 */
export default function GameOverMessage({
  isVictorious,
  isGameOver,
  revealedCount,
  attempts,
  className = ""
}: GameOverMessageProps) {
  if (!isVictorious && !isGameOver) return null;

  return (
    <section className={`animate-entry-in flex flex-col gap-4 ${className}`}>
      {/* The record. The outcome word itself sits on the placard header line. */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1
                      border-y border-rule py-2.5 font-data text-sm tabular text-ink-muted">
        <span>
          <span className="text-accent">{attempts}</span>{" "}
          {attempts === 1 ? "GUESS" : "GUESSES"}
        </span>
        <span>
          <span className="text-accent">{revealedCount}</span>{" "}
          {revealedCount === 1 ? "HINT" : "HINTS"}
        </span>
      </div>

      <p className="text-base text-ink-muted">
        A new figure goes up tomorrow at 12:01 AM PST.
      </p>
    </section>
  );
}
