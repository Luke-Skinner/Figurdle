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
};

export const getTodayPuzzle = () => http<PublicPuzzle>("/puzzle/today");
export const submitGuess = (body: GuessIn) =>
  http<GuessOut>(`/guess?date=${encodeURIComponent(body.puzzle_date)}&hc=${body.hints_count}`, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include"  // Important: sends cookies
  });

// Session management endpoints
export const getSessionStatus = () =>
  http<SessionStatus>("/session/status", {
    credentials: "include"
  });

export const completeSession = (body: CompleteSessionRequest) =>
  http<{success: boolean; result?: string; message?: string}>(`/session/complete?result=${body.result}&attempts=${body.attempts}&hints_revealed=${body.hints_revealed}`, {
    method: "POST",
    credentials: "include"
  });

export const updateProgress = (body: UpdateProgressRequest) =>
  http<{success: boolean}>(`/session/update-progress?attempts=${body.attempts}&hints_revealed=${body.hints_revealed}`, {
    method: "POST",
    credentials: "include"
  });
