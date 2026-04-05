export const now = (): number => Date.now();

export const ageMs = (timestamp?: number | null): number | null => {
  if (!timestamp) {
    return null;
  }

  return Math.max(0, now() - timestamp);
};

export const formatClockTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
