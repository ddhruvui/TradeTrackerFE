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

// A set of keys remembered in this browser, with a toggle for one key.
export function useStoredSet(key) {
  const [keys, setKeys] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...keys]));
    } catch {
      // Storage can be unavailable (private windows); the set just won't persist.
    }
  }, [key, keys]);
  const toggle = (item) =>
    setKeys((current) => {
      const next = new Set(current);
      if (!next.delete(item)) next.add(item);
      return next;
    });
  return [keys, toggle];
}
