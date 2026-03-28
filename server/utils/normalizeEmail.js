/** Normalize email for storage and lookup: trim and lowercase. */
export function normalizeEmail(email) {
  if (email == null || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}
