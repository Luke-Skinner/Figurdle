"use client";
import { useEffect, useState } from "react";
import {
  getTodayPuzzle, submitGuess,
  type PublicPuzzle, type GuessOut
} from "../lib/api";

export default function Home() {
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<GuessOut | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hints, setHints] = useState<string[]>([]); // local revealed hints
  const [revealedCount, setRevealedCount] = useState(0); // track locally revealed hints
  const [isVictorious, setIsVictorious] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await getTodayPuzzle();
        setPuzzle(p);
        setHints([]); // reset hints on load
        setRevealedCount(0); // reset revealed count
        setIsVictorious(false); // reset victory state
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load puzzle");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puzzle) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const r = await submitGuess({
        guess,
        revealed: revealedCount,
        signature: puzzle.signature,
        puzzle_date: puzzle.puzzle_date,
        hints_count: puzzle.hints_count,
      });
      setResult(r);

      // If backend tells us to reveal a hint, append it and bump local count
      if (r.reveal_next_hint && r.next_hint) {
        setHints((prev) => [...prev, r.next_hint!]);
        setRevealedCount(prev => prev + 1);
      }

      // Optionally clear input on correct
      if (r.correct) {
        setGuess("");
        setIsVictorious(true);
      }
    }
    catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Guess failed");
    }
    finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="p-6">Loading…</main>;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;

  return (
    <main className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Figurdle</h1>

      {puzzle && (
        <div className="rounded-2xl p-4 shadow border space-y-1">
          <div className="text-sm text-gray-500">Date: {puzzle.puzzle_date}</div>
          <div className="text-sm">Hints revealed: {revealedCount}</div>
        </div>
      )}

      {/* Hints list */}
      {hints.length > 0 && (
        <div className="rounded-xl border p-3 space-y-1">
          <div className="font-medium">Hints</div>
          <ul className="list-disc pl-5">
            {hints.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={isVictorious ? (e) => e.preventDefault() : onSubmit} className="flex gap-3">
        <input
          className={`flex-1 rounded-xl border-2 px-4 py-3 text-lg text-black focus:outline-none transition-colors ${
            isVictorious 
              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed" 
              : "border-gray-300 focus:border-blue-500"
          }`}
          placeholder={isVictorious ? "Puzzle completed!" : "Enter your guess…"}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={isVictorious}
        />
        <button
          className="rounded-xl px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          disabled={submitting || !guess.trim() || !puzzle || isVictorious}
        >
          {submitting ? "Checking…" : isVictorious ? "Completed" : "Submit"}
        </button>
      </form>

      {result && !isVictorious && (
        <div className={`p-4 rounded-xl border-2 ${
          result.correct 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-orange-50 border-orange-200 text-orange-800"
        }`}>
          <div className="font-semibold text-lg">
            {result.correct ? "Correct!" : "Try again"}
          </div>
          {/* Show normalized answer when correct or when backend provides it */}
          {result.normalized_answer && (
            <div className="mt-2 text-sm font-medium">
              Answer: <span className="font-bold">{result.normalized_answer}</span>
            </div>
          )}
          {/* If a hint was revealed this round, echo it prominently */}
          {result.reveal_next_hint && result.next_hint && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
              <strong>New hint:</strong> {result.next_hint}
            </div>
          )}
        </div>
      )}

      {isVictorious && result && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center space-y-4">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-800">Congratulations!</div>
            <div className="text-green-700">You solved today&apos;s Figurdle!</div>
          </div>
          
          <div className="bg-white/60 rounded-xl p-4 space-y-2">
            <div className="font-semibold text-green-800">
              Answer: <span className="text-lg">{result.normalized_answer}</span>
            </div>
            <div className="text-sm text-green-600">
              Solved with {revealedCount} hint{revealedCount !== 1 ? 's' : ''} revealed
            </div>
          </div>

          {hints.length > 0 && (
            <div className="bg-white/60 rounded-xl p-4 text-left">
              <div className="font-medium text-green-800 mb-2">Hints you revealed:</div>
              <ul className="list-disc pl-5 text-sm text-green-700 space-y-1">
                {hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}

          <div className="text-sm text-green-600 pt-2">
            Come back tomorrow for a new historical character!
          </div>
        </div>
      )}
    </main>
  );
}
