const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type PublicPuzzle = {
  puzzle_date: string;
  hints_count: number;
  signature: string;
};

export type GuessIn = { 
  guess: string; 
  revealed: number; 
  signature: string; 
  puzzle_date: string; 
  hints_count: number; 
};
export type GuessOut = { correct: boolean; reveal_next_hint: boolean; next_hint: string | null; normalized_answer: string | null; };

export const getTodayPuzzle = () => http<PublicPuzzle>("/puzzle/today");
export const submitGuess = (body: GuessIn) =>
  http<GuessOut>(`/guess?date=${encodeURIComponent(body.puzzle_date)}&hc=${body.hints_count}`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  });
