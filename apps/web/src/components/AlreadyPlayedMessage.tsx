import { type SessionStatus } from "../lib/api";

interface AlreadyPlayedMessageProps {
  sessionStatus: SessionStatus;
  className?: string;
}

/**
 * Shown when the session records a completed play but no win or loss state was
 * restored. Reads as a note pinned beside the placard, not a second placard.
 */
export default function AlreadyPlayedMessage({ sessionStatus, className = "" }: AlreadyPlayedMessageProps) {
  const completedAt = sessionStatus.completed_at
    ? new Date(sessionStatus.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : null;

  return (
    <aside className={`flex flex-col gap-3 border-l-2 border-accent pl-4 ${className}`}>
      <p className="label">Already played</p>

      <p className="text-base text-ink-muted">
        You finished this one{completedAt ? ` at ${completedAt}` : ""}
        {sessionStatus.result === 'won' ? ", solved" : ""}.
      </p>

      <p className="font-data text-sm tabular text-ink-muted">
        <span className="text-ink">{sessionStatus.attempts}</span>{" "}
        {sessionStatus.attempts === 1 ? "GUESS" : "GUESSES"}
        <span className="px-3 opacity-50">/</span>
        <span className="text-ink">{sessionStatus.hints_revealed}</span>{" "}
        {sessionStatus.hints_revealed === 1 ? "HINT" : "HINTS"}
      </p>

      <p className="text-sm text-ink-muted">
        A new figure goes up daily at 12:01 AM PST.
      </p>
    </aside>
  );
}
