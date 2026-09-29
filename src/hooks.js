import { useEffect, useState } from 'react';

// The viewer's calendar date as YYYY-MM-DD. The backend uses it to decide
// which week, month and year a trade's exit falls in.
function localISODate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Today's local date. Re-checked every minute and on focus so the week and month roll over.
export function useToday() {
  const [today, setToday] = useState(() => localISODate());
  useEffect(() => {
    const refresh = () => setToday(localISODate());
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return today;
}

// A choice remembered in this browser, limited to known values. The first choice is the default.
export function useStoredChoice(key, choices) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return choices.includes(saved) ? saved : choices[0];
    } catch {
      return choices[0];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable (private windows); the choice just won't persist.
    }
  }, [key, value]);
  return [value, setValue];
}
