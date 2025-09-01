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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await getTodayPuzzle();
        setPuzzle(p);
        setHints([]); // reset hints on load
        setRevealedCount(0); // reset revealed count
      } catch (e: any) {
        setError(e.message || "Failed to load puzzle");
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
      if (r.correct) setGuess("");
    }
    catch (e: any) {
      setError(e.message || "Guess failed");
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

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2"
          placeholder="Enter your guess…"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
        />
        <button
          className="rounded-xl px-4 py-2 border shadow disabled:opacity-50"
          disabled={submitting || !guess.trim() || !puzzle}
        >
          {submitting ? "Checking…" : "Submit"}
        </button>
      </form>

      {result && (
        <div className={`p-3 rounded-xl ${result.correct ? "bg-green-100" : "bg-yellow-100"}`}>
          {result.correct ? "Correct!" : "Try again."}
          {/* Show normalized answer when correct or when backend provides it */}
          {result.normalized_answer && (
            <div className="mt-1 text-sm text-gray-700">
              Normalized: {result.normalized_answer}
            </div>
          )}
          {/* If a hint was revealed this round, echo it prominently */}
          {result.reveal_next_hint && result.next_hint && (
            <div className="mt-1 text-sm italic">New hint: {result.next_hint}</div>
          )}
        </div>
      )}
    </main>
  );
}
