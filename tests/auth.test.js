import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateCredentials,
  startSession,
  getSession,
  normalizeUsername,
  INVALID_INPUT_MESSAGE,
} from '../auth-core.js';

// In-memory sessionStorage stub for the round-trip property.
function makeStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const whitespaceArb = fc.constantFrom('', ' ', '   ', '\t', '\n', '  \t ');

describe('auth-core', () => {
  // Feature: english-platform-overhaul, Property 9: Credential validation rejects empty input before any query
  it('Property 9: empty/whitespace username or password is rejected with an English message', () => {
    fc.assert(
      fc.property(
        fc.oneof(whitespaceArb, fc.string({ maxLength: 8 })),
        fc.oneof(whitespaceArb, fc.string({ maxLength: 8 })),
        (username, password) => {
          const eitherEmpty = String(username).trim() === '' || String(password).trim() === '';
          const res = validateCredentials(username, password);
          if (eitherEmpty) {
            expect(res.ok).toBe(false);
            expect(res.message).toBe(INVALID_INPUT_MESSAGE);
          } else {
            expect(res.ok).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 10: Session round-trip
  it('Property 10: startSession then getSession returns matching normalized username + displayName', () => {
    fc.assert(
      fc.property(
        fc.record({
          username: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim() !== ''),
          displayName: fc.string({ maxLength: 12 }),
        }),
        (student) => {
          const store = makeStore();
          startSession(student, store);
          const session = getSession(store);
          expect(session).not.toBeNull();
          expect(session.username).toBe(normalizeUsername(student.username));
          expect(session.displayName).toBe(student.displayName);
        }
      ),
      { numRuns: 100 }
    );
  });
});
