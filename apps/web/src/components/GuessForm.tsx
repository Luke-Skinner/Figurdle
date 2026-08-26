"use client";
import { useState, useRef, useEffect } from "react";

interface GuessFormProps {
  onSubmit: (guess: string) => void;
  onSkip?: () => void;
  disabled: boolean;
  loading: boolean;
  isVictorious: boolean;
  isGameOver: boolean;
  className?: string;
  triggerShake?: boolean;
}

export default function GuessForm({
  onSubmit,
  onSkip,
  disabled,
  loading,
  isVictorious,
  isGameOver,
  className = "",
  triggerShake = false
}: GuessFormProps) {
  const [guess, setGuess] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !isVictorious && !isGameOver) {
      inputRef.current?.focus();
    }
  }, [disabled, isVictorious, isGameOver]);

  useEffect(() => {
    if (triggerShake) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [triggerShake]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || disabled || loading || isVictorious || isGameOver) return;

    onSubmit(guess.trim());
    setGuess("");
  };

  const locked = disabled || isVictorious || isGameOver;
  const cannotSubmit = locked || loading || !guess.trim();

  // A disabled control still has to be readable. Fading the accent fill to 40%
  // left the resting state of the primary button at roughly 1.7:1, so disabled
  // drops to a neutral outline that clears AA instead.
  const button =
    "border px-5 py-3 font-sans text-sm font-semibold uppercase tracking-label " +
    "transition-[background-color,border-color,color,opacity,transform] duration-fast " +
    "enabled:active:translate-y-px " +
    "disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent disabled:text-ink-muted";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 ${isShaking ? "animate-shake" : ""} ${className}`}
    >
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="figure-guess">Name the figure</label>
        <input
          id="figure-guess"
          ref={inputRef}
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Name the figure"
          disabled={locked}
          className="min-w-0 flex-1 basis-48 border border-rule bg-wall px-4 py-3
                     font-sans text-base text-ink
                     placeholder:text-ink-muted
                     transition-colors duration-fast
                     hover:border-ink-muted
                     focus:border-accent focus:outline-none
                     disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />

        <button
          type="submit"
          disabled={cannotSubmit}
          className={`${button} border-accent bg-accent text-accent-contrast enabled:hover:opacity-85`}
        >
          {loading ? "Checking" : "Submit"}
        </button>

        {onSkip && !isVictorious && !isGameOver && (
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled || loading}
            title="Reveal the next hint without using a guess"
            className={`${button} border-rule bg-transparent text-ink-muted enabled:hover:border-accent enabled:hover:text-accent`}
          >
            Skip
          </button>
        )}
      </div>

      {!locked && (
        <p className="font-data text-xs uppercase tracking-label text-ink-muted">
          Full names match best
        </p>
      )}
    </form>
  );
}
