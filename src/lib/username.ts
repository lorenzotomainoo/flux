/** Regole degli username: le stesse del database (vincolo + funzione change_username). */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const RESERVED_USERNAMES = [
  "home", "messages", "login", "signup", "api", "search",
  "settings", "auth", "admin", "flux", "null", "undefined",
];

/** Giorni da aspettare tra un cambio e l'altro. */
export const USERNAME_COOLDOWN_DAYS = 30;

/** "@Mario " -> "mario" */
export const normalizeUsername = (raw: string) => raw.trim().toLowerCase().replace(/^@/, "");
