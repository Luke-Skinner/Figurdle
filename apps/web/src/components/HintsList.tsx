"use client";
import { useEffect, useState } from "react";

interface HintsListProps {
  hints: string[];
  totalHints: number;
  className?: string;
  lastGuessResult?: {
    isCorrect: boolean;
    hasNewHint: boolean;
    message?: string;
  } | null;
}

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const numeral = (index: number) => NUMERALS[index] ?? String(index + 1);

/**
 * The register: hints as ruled entries on the placard rather than bordered cards.
 * Unrevealed hints stay in the list as empty slots, so how much evidence remains
 * is visible instead of hidden. The numerals are real information - hints are
 * ordered by specificity, from era through field to deed.
 */
export default function HintsList({ hints, totalHints, className = "", lastGuessResult }: HintsListProps) {
  const [visibleHints, setVisibleHints] = useState<string[]>([]);

  useEffect(() => {
    hints.forEach((hint, index) => {
      setTimeout(() => {
        setVisibleHints(prev => (prev.includes(hint) ? prev : [...prev, hint]));
      }, index * 120);
    });
  }, [hints]);

  const slots = Math.max(totalHints, hints.length);
  if (slots === 0) return null;

  return (
    <section className={className} aria-label="Hints">
      <ol className="m-0 list-none p-0">
        {Array.from({ length: slots }, (_, i) => {
          const hint = hints[i];
          const revealed = hint !== undefined && visibleHints.includes(hint);

          return (
            <li
              key={i}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-4
                         border-b border-rule py-3"
            >
              <span className={`label tabular ${revealed ? "" : "opacity-55"}`}>
                {numeral(i)}
              </span>

              {revealed ? (
                <span className="animate-entry-in text-base text-ink">{hint}</span>
              ) : (
                <span
                  aria-label="Not yet revealed"
                  className="select-none text-base tracking-[0.3em] text-ink-muted opacity-50"
                >
                  &middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {lastGuessResult && !lastGuessResult.hasNewHint && lastGuessResult.isCorrect && (
        <p className="animate-entry-in pt-3 font-data text-xs uppercase tracking-label text-accent">
          {lastGuessResult.message || "Correct"}
        </p>
      )}
    </section>
  );
}
