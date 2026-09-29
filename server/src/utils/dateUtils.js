/** Returns the Monday of the week containing `date` (UTC midnight). */
export const getMonday = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d;
};

/** Returns a Date at midnight (local time) on Monday of the week containing `date`. */
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

/** ISO date string YYYY-MM-DD */
export const toDateStr = (date) => date.toISOString().slice(0, 10);

/** Add N weeks to a date, returns a new Date */
export const addWeeks = (date, weeks) =>
  new Date(date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
