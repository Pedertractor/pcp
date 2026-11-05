type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();
let sessionExpiredNotified = false;

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetSessionExpiredGate(): void {
  sessionExpiredNotified = false;
}

export function notifySessionExpired(): void {
  if (sessionExpiredNotified) {
    return;
  }
  sessionExpiredNotified = true;
  for (const listener of listeners) {
    listener();
  }
}
