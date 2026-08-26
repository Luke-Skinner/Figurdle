import { type SessionStatus } from "../lib/api";

interface PuzzleInfoProps {
  puzzleDate: string;
  attempts: number;
  maxAttempts: number;
  sessionStatus: SessionStatus | null;
  className?: string;
}

/**
 * The placard's header line: date on the left, attempts on the right, ruled
 * above and below. Replaces the three-column card with the oversized question
 * mark, which gave catalogue metadata the same weight as the portrait.
 */
export default function PuzzleInfo({
  puzzleDate,
  attempts,
  maxAttempts,
  sessionStatus,
  className = ""
}: PuzzleInfoProps) {
  const formattedDate = new Date(puzzleDate + 'T12:00:00')
    .toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase();

  const finished = sessionStatus?.has_played && !sessionStatus.can_play;

  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1
                  border-y border-rule py-2.5
                  font-data text-sm tabular text-ink-muted ${className}`}
    >
      <time dateTime={puzzleDate}>{formattedDate}</time>

      {finished ? (
        // The record itself lives in the closing summary below the register, so
        // this line states only the outcome.
        <span className="text-ink">
          {sessionStatus?.result === 'won' ? 'SOLVED' : 'NOT SOLVED'}
        </span>
      ) : (
        <span>
          ATTEMPT <span className="text-ink">{attempts}</span> / {maxAttempts}
        </span>
      )}
    </div>
  );
}
