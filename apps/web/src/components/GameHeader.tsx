"use client";
import { useState } from "react";
import RulesModal from "./RulesModal";
import ThemeToggle from "./ThemeToggle";
import PuzzleCalendarModal from "./PuzzleCalendarModal";

interface GameHeaderProps {
  className?: string;
  onSelectDate?: (date: string) => void;
  currentDate?: string;
}

export default function GameHeader({ className = "", onSelectDate, currentDate }: GameHeaderProps) {
  const [showRules, setShowRules] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const railButton =
    "font-data text-xs uppercase tracking-label text-ink-muted transition-colors duration-fast " +
    "hover:text-ink focus-visible:text-ink";

  return (
    <>
      <header className={`flex flex-col gap-8 ${className}`}>
        {/* Utility rail. A thin line of controls, not a block that competes
            with the placard for attention. */}
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <button type="button" onClick={() => setShowCalendar(true)} className={railButton}>
            Archive
          </button>

          <div className="flex items-center gap-6">
            <button type="button" onClick={() => setShowRules(true)} className={railButton}>
              How to play
            </button>
            <ThemeToggle />
          </div>
        </div>

        <h1 className="text-center font-sans text-sm font-semibold uppercase tracking-wordmark">
          Figurdle
        </h1>
      </header>

      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      <PuzzleCalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelectDate={(date) => {
          if (onSelectDate) {
            onSelectDate(date);
          }
        }}
        currentDate={currentDate}
      />
    </>
  );
}
