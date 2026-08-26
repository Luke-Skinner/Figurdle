"use client";
import { useEffect } from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-[rgb(var(--shadow)/0.55)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto
                      border border-rule bg-placard shadow-plate">
        <div className="flex flex-col gap-7 p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
            <h2 id="rules-title" className="font-display text-xl font-medium">
              How to play
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

          <section className="flex flex-col gap-2">
            <p className="label">The puzzle</p>
            <p className="text-base text-ink-muted">
              Name the day&apos;s figure. They could come from history, science, sport,
              politics, art, film or anywhere else.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <p className="label">How it works</p>
            <ol className="m-0 flex list-none flex-col p-0">
              {[
                "Five hints sit on the placard, revealed one at a time.",
                "Each wrong guess reveals the next hint. Skip reveals one without spending a guess.",
                "Hints narrow as they go, from era to field to deed.",
                "You have six guesses. The portrait is uncovered either way.",
                "One puzzle per person per day.",
              ].map((line, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-4
                             border-b border-rule py-3"
                >
                  <span className="label tabular">{["I", "II", "III", "IV", "V"][i]}</span>
                  <span className="text-base text-ink">{line}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-2">
            <p className="label">Guessing</p>
            <p className="text-base text-ink-muted">
              Full names match best, and small typos are forgiven. Nicknames and
              alternate spellings are worth trying.
            </p>
          </section>

          <button
            type="button"
            onClick={onClose}
            className="self-start border border-accent bg-accent px-5 py-3
                       font-sans text-sm font-semibold uppercase tracking-label text-accent-contrast
                       transition-opacity duration-fast hover:opacity-85 active:translate-y-px"
          >
            Start playing
          </button>
        </div>
      </div>
    </div>
  );
}
