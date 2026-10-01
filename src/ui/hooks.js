import { useState, useEffect } from 'preact/hooks';
export function useNow(ms = 1000, on = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!on) return; const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms, on]);
  return now;
}
