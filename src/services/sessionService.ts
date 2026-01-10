import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'deckfix_session_id';

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}

export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_ID_KEY);
}
