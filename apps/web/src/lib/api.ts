const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: 'include',
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
  revealed_hints?: string[];
  answer?: string;
  image_url?: string;
};

export type GuessIn = { 
  guess: string; 
  revealed: number; 
  signature: string; 
  puzzle_date: string; 
  hints_count: number; 
};
export type GuessOut = { correct: boolean; reveal_next_hint: boolean; next_hint: string | null; normalized_answer: string | null; };

export type SessionStatus = {
  session_id: string;
  can_play: boolean;
  has_played: boolean;
  result: string | null;
  attempts: number;
  hints_revealed: number;
  completed_at: string | null;
};

export type CompleteSessionRequest = {
  result: 'won' | 'lost';
  attempts: number;
  hints_revealed: number;
};

export type UpdateProgressRequest = {
  attempts: number;
  hints_revealed: number;
  puzzle_date?: string;
};

export type AvailablePuzzle = {
  puzzle_date: string;
  has_image: boolean;
};

export type AvailablePuzzlesResponse = {
  puzzles: AvailablePuzzle[];
};

export const getTodayPuzzle = () => http<PublicPuzzle>("/puzzle/today", {
  credentials: "include"
});

export const getPuzzleByDate = (date: string) => http<PublicPuzzle>(`/puzzle/by-date/${date}`, {
  credentials: "include"
});

export const getAvailablePuzzles = () => http<AvailablePuzzlesResponse>("/puzzle/available", {
  credentials: "include"
});

export const submitGuess = (body: GuessIn) =>
  http<GuessOut>(`/guess?date=${encodeURIComponent(body.puzzle_date)}&hc=${body.hints_count}`, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include"  // Important: sends cookies
  });

// Session management endpoints
export const getSessionStatus = (puzzleDate?: string) =>
  http<SessionStatus>(`/session/status${puzzleDate ? `?puzzle_date=${encodeURIComponent(puzzleDate)}` : ''}`, {
    credentials: "include"
  });

export const completeSession = (body: CompleteSessionRequest & { puzzle_date?: string }) =>
  http<{success: boolean; result?: string; message?: string}>(`/session/complete?result=${body.result}&attempts=${body.attempts}&hints_revealed=${body.hints_revealed}${body.puzzle_date ? `&puzzle_date=${encodeURIComponent(body.puzzle_date)}` : ''}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Length": "0" }
  });

export const updateProgress = (body: UpdateProgressRequest) =>
  http<{success: boolean}>(`/session/update-progress?attempts=${body.attempts}&hints_revealed=${body.hints_revealed}${body.puzzle_date ? `&puzzle_date=${encodeURIComponent(body.puzzle_date)}` : ''}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Length": "0" }
  });
