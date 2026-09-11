import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pseudonymous subject derivation.
 *
 * Cloud sync (favorites/collections) attaches the library to a *one-way
 * derivation* of the signed-in email. The email itself is never stored in
 * the browser session or forwarded to OmniSource.
 */

const COOKIE_NAME = "omnistore_subject";
const SECRET =
  process.env.OMNISTORE_SESSION_SECRET ??
  process.env.OMNISOURCE_API_KEY ??
  "omnistore-dev-secret-do-not-use-in-production";

export function deriveSubject(email: string): string {
  return createHmac("sha256", SECRET).update(email.trim().toLowerCase()).digest("hex").slice(0, 48);
}

export function verifySubject(email: string, subject: string): boolean {
  const expected = deriveSubject(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(subject);
  return a.length === b.length && timingSafeEqual(a, b);
}

export { COOKIE_NAME as SUBJECT_COOKIE };
