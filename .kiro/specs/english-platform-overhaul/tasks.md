# Implementation Plan: English Platform Overhaul

## Overview

This plan builds the overhaul incrementally: pure logic cores first (authored as importable ES
modules), each immediately followed by its property-based test, then the Firebase wiring and UI that
consume those cores. The pure cores — `rankStudents`, `buildQuiz`, `scoreQuiz`, `mergeScore`,
credential/session helpers, the create-if-absent uniqueness decision, quiz-config round-trip,
visibility filtering, and the firefly/drift generators — are isolated from Firebase and the DOM so
the 13 correctness properties can be property-tested (fast-check, min 100 iterations) without a build
step or live backend.

Shipping stays no-build vanilla HTML/CSS/JS on Firebase Hosting (project `storysaadrnd`, compat SDK
v10.12.2). A dev-only `package.json` (vitest + fast-check) exists solely for tests and never ships.
All UI text is English; the only Arabic anywhere is the single quiz prompt word.

## Tasks

- [x] 1. Set up dev-only test harness
  - [x] 1.1 Add dev-only `package.json` and test scaffolding
    - Create `package.json` with `vitest` + `fast-check` as devDependencies only and a `test` script that runs vitest once (`vitest run`)
    - Create a `tests/` directory and a `vitest.config.js` configured for ES module test files
    - Add `node_modules` / dev tooling to `.gitignore`; confirm nothing here is referenced by any page served on Hosting
    - _Requirements: 8.5 (test infrastructure only)_

- [x] 2. Leaderboard ordering core and property tests
  - [x] 2.1 Implement `rankStudents` pure module
    - Create `leaderboard-core.js` as an ES module exporting `rankStudents(students)`
    - Sort by score descending, tie-break by display name ascending case-insensitive (`localeCompare`, `sensitivity:'base'`), final tie-break by normalized username ascending for determinism
    - Return entries annotated with sequential 1-based rank positions; treat score as a non-negative integer
    - _Requirements: 3.2, 3.3, 3.7_

  - [x]* 2.2 Write property test for `rankStudents`
    - **Property 1: Leaderboard is a well-formed total order**
    - Generate random student lists including duplicate scores and mixed-case names
    - Assert scores non-increasing, ties ordered by case-insensitive display name, ranks are exactly `1..n`
    - Tag: `// Feature: english-platform-overhaul, Property 1: Leaderboard is a well-formed total order`; `fc.assert(..., { numRuns: 100 })`
    - **Validates: Requirements 3.2, 3.3, 3.7**

  - [x] 2.3 Implement leaderboard entry display formatter
    - Add `formatLeaderboardEntry(entry)` to `leaderboard-core.js` that substitutes an English placeholder name (e.g. "Mystery Learner") when display name is empty/whitespace while preserving rank and score
    - _Requirements: 3.10_

  - [x]* 2.4 Write property test for display placeholder
    - **Property 2: Empty display names render as a placeholder without losing rank or score**
    - Generate ranked entries with empty/whitespace display names; assert placeholder used and rank + score unchanged
    - Tag: `// Feature: english-platform-overhaul, Property 2: Empty display names render as a placeholder without losing rank or score`; `{ numRuns: 100 }`
    - **Validates: Requirements 3.10**

- [x] 3. Quiz generation and scoring cores with property tests
  - [x] 3.1 Implement `buildQuiz` pure module
    - Create `quiz-core.js` as an ES module exporting `buildQuiz(glossary, rng)`
    - Throw a distinct `InsufficientVocabulary` signal when fewer than four distinct English words exist
    - Produce exactly 10 questions; each has an Arabic prompt, four distinct English options drawn from the glossary, exactly one correct (mapping equals prompt), reusing words when fewer than 10 distinct exist
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.14_

  - [x]* 3.2 Write property test for `buildQuiz` well-formedness
    - **Property 3: Generated quizzes are well-formed**
    - Generate glossaries with ≥4 distinct words, including 4–9 word cases, non-ASCII Arabic values, and duplicate English keys
    - Assert exactly 10 questions, four distinct in-glossary options each, exactly one correct
    - Tag: `// Feature: english-platform-overhaul, Property 3: Generated quizzes are well-formed`; `{ numRuns: 100 }`
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.14**

  - [x]* 3.3 Write property test for insufficient vocabulary
    - **Property 6: Insufficient vocabulary is rejected**
    - Generate glossaries with fewer than four distinct English words; assert `buildQuiz` signals insufficiency and produces no quiz
    - Tag: `// Feature: english-platform-overhaul, Property 6: Insufficient vocabulary is rejected`; `{ numRuns: 100 }`
    - **Validates: Requirements 4.13**

  - [x] 3.4 Implement `scoreQuiz` pure function
    - Add `scoreQuiz(questions, answers)` to `quiz-core.js` returning the count of answers whose selected index equals the question's correct index; timeouts/no-selection count as incorrect
    - Result is an integer in `[0, 10]`
    - _Requirements: 4.9, 4.10_

  - [x]* 3.5 Write property test for `scoreQuiz`
    - **Property 4: Scoring counts exactly the matching answers**
    - Generate random 10-question sets and answer arrays (selections and timeouts); assert result equals the number of matching indices and is within `[0, 10]`
    - Tag: `// Feature: english-platform-overhaul, Property 4: Scoring counts exactly the matching answers`; `{ numRuns: 100 }`
    - **Validates: Requirements 4.9, 4.10**

  - [x] 3.6 Implement `mergeScore` pure function
    - Add `mergeScore(stored, achieved)` to `quiz-core.js` returning `Math.max(stored ?? 0, achieved)`, clamped to an integer within `[0, 100]`
    - _Requirements: 5.1, 5.3, 5.4_

  - [x]* 3.7 Write property test for `mergeScore`
    - **Property 5: Best-score persistence is monotonic and range-bounded**
    - Generate random stored/achieved score pairs; assert result is the maximum, never decreases, and stays an integer within `[0, 100]`
    - Tag: `// Feature: english-platform-overhaul, Property 5: Best-score persistence is monotonic and range-bounded`; `{ numRuns: 100 }`
    - **Validates: Requirements 5.1, 5.3, 5.4**

- [x] 4. Credential validation and session cores with property tests
  - [x] 4.1 Implement credential validation core
    - Create `auth-core.js` as an ES module exporting `normalizeUsername(raw)` (trim + lowercase) and `validateCredentials(username, password)` returning `{ ok:false, message }` on empty/whitespace input (English message) or `{ ok:true }` otherwise
    - _Requirements: 2.6_

  - [x]* 4.2 Write property test for credential validation
    - **Property 9: Credential validation rejects empty input before any query**
    - Generate pairs where either value is empty/whitespace; assert rejection with an English message and that no query hook is invoked
    - Tag: `// Feature: english-platform-overhaul, Property 9: Credential validation rejects empty input before any query`; `{ numRuns: 100 }`
    - **Validates: Requirements 2.6**

  - [x] 4.3 Implement session helpers
    - Add `startSession(student)`, `getSession()`, and `requireSession()` to `auth-core.js`, storing/reading `{ username, displayName }` in `sessionStorage['session']`; `requireSession` redirects to `index.html` when absent
    - _Requirements: 2.8, 2.9_

  - [x]* 4.4 Write property test for session round-trip
    - **Property 10: Session round-trip**
    - Generate random student records; assert `startSession` then `getSession` returns matching username and display name (using an in-memory sessionStorage stub)
    - Tag: `// Feature: english-platform-overhaul, Property 10: Session round-trip`; `{ numRuns: 100 }`
    - **Validates: Requirements 2.8**

- [x] 5. Student-record and quiz-config decision cores with property tests
  - [x] 5.1 Implement create-if-absent and default-score core
    - Create `data-core.js` as an ES module exporting `decideCreate(existingIds, newStudent)` that rejects when the normalized username already exists and otherwise returns a record with `score` defaulted to 0 when unspecified
    - _Requirements: 6.6, 8.2, 8.4_

  - [x]* 5.2 Write property test for username uniqueness
    - **Property 7: Username uniqueness**
    - Generate random existing-ID sets and a new student whose normalized username collides; assert creation is rejected and the existing set is unchanged
    - Tag: `// Feature: english-platform-overhaul, Property 7: Username uniqueness`; `{ numRuns: 100 }`
    - **Validates: Requirements 6.6, 8.2**

  - [x]* 5.3 Write property test for default zero score
    - **Property 11: New students default to zero score**
    - Generate student records without an explicit score; assert the resulting record's score is `0`
    - Tag: `// Feature: english-platform-overhaul, Property 11: New students default to zero score`; `{ numRuns: 100 }`
    - **Validates: Requirements 8.4**

  - [x] 5.4 Implement quiz-config serialize/parse core
    - Add `makeQuizConfig({activeStoryId, activePartIndex})` and `parseQuizConfig(doc)` to `data-core.js` that round-trip the active selection with validation
    - _Requirements: 6.10, 6.11_

  - [x]* 5.5 Write property test for quiz-config round-trip
    - **Property 12: Quiz_Config write-then-read round-trip**
    - Generate valid `{activeStoryId, activePartIndex}` selections; assert parse(make(sel)) yields the same story id and part index
    - Tag: `// Feature: english-platform-overhaul, Property 12: Quiz_Config write-then-read round-trip`; `{ numRuns: 100 }`
    - **Validates: Requirements 6.10, 6.11**

- [x] 6. Story-part visibility filtering core with property test
  - [x] 6.1 Implement visibility filtering core
    - Create `visibility-core.js` as an ES module exporting `filterVisibleParts(parts, visibilityMap)` (parts absent from the map are visible; only explicit `false` hides) and `resolveRequestedPart(parts, visibilityMap, index)` that returns the next visible part or a story-listing fallback sentinel
    - _Requirements: 7.4, 7.5, 7.6_

  - [x]* 6.2 Write property test for visibility filtering
    - **Property 8: Reader honors part visibility**
    - Generate random parts and partial visibility maps; assert the visible sequence excludes exactly the explicitly-hidden parts and that resolving a hidden request yields the next visible part or the listing fallback
    - Tag: `// Feature: english-platform-overhaul, Property 8: Reader honors part visibility`; `{ numRuns: 100 }`
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [x] 7. Landing visual generators core with property test
  - [x] 7.1 Implement firefly and drift generators
    - Create `landing-core.js` as an ES module exporting `generateFireflies(seed)` (count in `[20,60]`) and `generateDriftWords(words, seed, viewport)` (count in `[5,15]`) that emit position/keyframe data via CSS-custom-property values, constraining drift positions to `0 ≤ x ≤ vw − elementWidth` and `0 ≤ y ≤ vh − elementHeight`
    - _Requirements: 1.3, 1.4_

  - [x]* 7.2 Write property test for visual generators
    - **Property 13: Visual generators respect count and viewport bounds**
    - Generate random seeds and viewport dimensions; assert firefly count in `[20,60]`, drift count in `[5,15]`, and every drift position stays fully within viewport bounds
    - Tag: `// Feature: english-platform-overhaul, Property 13: Visual generators respect count and viewport bounds`; `{ numRuns: 100 }`
    - **Validates: Requirements 1.3, 1.4**

- [x] 8. Checkpoint - pure cores complete
  - Ensure all property tests pass, ask the user if questions arise.

- [x] 9. Firestore rules, project config, and shared styling
  - [x] 9.1 Author Firestore security rules
    - Create `firestore.rules` with a public `students` collection exposing only `displayName` + `score` (deny `password` reads), a separate `students_auth/{normalizedUsername}` credential store used only for exact-ID credential checks, `config/quiz` readable/write-guarded, and score writes rejected for unauthenticated/cross-user writes
    - Record the plaintext-credential risk and mitigation path as a header comment referencing the design Security Model
    - _Requirements: 9.2, 9.4, 5.2, 8.2_

  - [x] 9.2 Wire rules into Firebase project config
    - Update `firebase.json` (and `.firebaserc` if needed) to register `firestore.rules` for deploy while leaving Hosting config for the static site intact
    - _Requirements: 8.5_

  - [x] 9.3 Add landing, glass, leaderboard, and quiz styles
    - Extend `styles.css` with CSS-variable-driven Magical Night Forest theme, firefly/drift keyframes using hardware-accelerated transforms, glassmorphism surfaces, the pulsing Start Adventure control (1–3s cycle), leaderboard frosted-glass + medal/shine animations, quiz progress-bar depletion, and admin panel styles
    - Add a `prefers-reduced-motion` media block that disables firefly/drift animations while keeping controls visible
    - _Requirements: 1.2, 1.5, 1.6, 3.4, 3.5, 4.7, 1.12_

- [x] 10. Cinematic landing page and login markup
  - [x] 10.1 Rewrite `index.html` as landing + login
    - Replace all current index content with the landing scene container and login card markup (Username + Password fields, loading indicator, error region), English-only text, no inline `style` attributes on rendered elements
    - Add the shared Firebase init block including the new `firebase-firestore-compat.js` script alongside app + database compat SDKs; expose `db` (RTDB) and `fs = firebase.firestore()`
    - _Requirements: 1.1, 1.2, 1.5, 1.10, 2.1, 8.5_

  - [x] 10.2 Implement `landing.js`
    - Wire `landing-core.js` generators to spawn firefly + drift nodes (drift names read best-effort from Firestore, falling back to a static English word list on failure); honor reduced-motion by skipping animations while keeping controls functional
    - Implement `startAdventure()` triggered by pointer/click/keyboard: start welcome audio via `audio.play().catch(()=>{})`, run the CSS transition (1–5s) with a max-5s fallback timer, then reveal and focus `#login-section`
    - _Requirements: 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 1.12_

  - [ ]* 10.3 Write unit tests for landing behaviors
    - Reduced-motion disables firefly/drift but keeps controls functional (1.12); Start Adventure via click and keyboard ends with login visible within 5s (1.7); audio-blocked path completes without unhandled error (1.9); no inline `style` attributes on rendered landing elements (1.2); all landing text English (1.10)
    - _Requirements: 1.2, 1.7, 1.9, 1.10, 1.12_

- [x] 11. Student authentication wiring
  - [x] 11.1 Implement `auth.js`
    - Implement `authenticate(username, password)` using `auth-core.js`: validate first (no query on empty), show loading indicator, read `students_auth/{normalizedUsername}`, compare password, and on success call `startSession` and navigate to `home.html`
    - Wire the login form submit handler; display a single English "invalid credentials" message for unknown username or wrong password, and an English "could not sign in" message on lookup failure
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.7_

  - [ ]* 11.2 Write unit tests for auth wiring
    - Matching credentials set session + navigate (2.3); unknown/wrong credentials show invalid message (2.4, 2.5); loading indicator shown during lookup (2.7); `requireSession` redirects when no session (2.9)
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 2.9_

- [x] 12. Home page, leaderboard, and story-grid relocation
  - [x] 12.1 Create `home.html`
    - Build the authenticated home page: session-guard hook (`requireSession`), frosted-glass leaderboard container, quiz floating action button, and a relocated story-grid section below the leaderboard
    - Include the shared Firebase init block (RTDB + Firestore) and load `auth.js`, `leaderboard.js`, `app.js`, and `quiz.js`
    - _Requirements: 2.9, 3.1, 4.1_

  - [x] 12.2 Implement `leaderboard.js`
    - Implement `renderLeaderboard(ranked)` using `rankStudents` + `formatLeaderboardEntry`: empty-state message when no entries, medal classes for ranks 1/2/3, entry micro-animation on render
    - Implement `subscribeLeaderboard()` via `fs.collection('students').onSnapshot` reading only `displayName` + `score`, with a 3s watchdog and error callback that shows an English error and retains prior rows
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.8, 3.9, 5.5_

  - [ ]* 12.3 Write unit tests for leaderboard render states
    - Empty-state renders zero rows (3.8); error state retains prior rows (3.9); top-3 distinct medal classes (3.5); entry animation ≤500ms and glass styling present (3.4)
    - _Requirements: 3.4, 3.5, 3.8, 3.9_

  - [x] 12.4 Relocate story grid and repoint navigation in `app.js`
    - Update `app.js` so the story-grid branch runs on `home.html`, and change the reader's fallback redirects and empty-parts redirect from `index.html` to `home.html`; use `filterVisibleParts` from `visibility-core.js` for the reader's RTDB visibility filtering
    - _Requirements: 7.4, 7.5, 7.7_

- [x] 13. Quick Quiz engine UI
  - [x] 13.1 Implement `quiz.js`
    - Implement `loadActiveGlossary()` (read `config/quiz` from Firestore, fetch `stories.json`, resolve the active part's glossary) and the timed controller that renders a 3s-per-question depleting progress bar, auto-fails on elapse and advances (4.7, 4.8), records selection and advances (4.9)
    - On completion compute score via `scoreQuiz`, show confetti/particle celebration, and persist via `saveScore` using a Firestore transaction with `mergeScore`; show English "score not saved" on failure and English insufficient-vocabulary message when `buildQuiz` signals it; render the Arabic prompt as the only Arabic text
    - _Requirements: 4.1, 4.2, 4.7, 4.8, 4.9, 4.11, 4.12, 4.13, 4.15, 5.2, 5.5, 5.6_

  - [ ]* 13.2 Write unit tests for quiz UI
    - 3s timer auto-fails and advances on elapse (4.7, 4.8); confetti shown at completion (4.11); Arabic appears only in the prompt element (4.15); insufficient-vocabulary message shown for <4-word glossary (4.13)
    - _Requirements: 4.7, 4.8, 4.11, 4.13, 4.15_

  - [ ]* 13.3 Write integration test for score persistence
    - Score write on completion applies best-score merge and updates the stored value (4.12); failed write leaves stored score unchanged with English message (5.6)
    - _Requirements: 4.12, 5.6_

- [x] 14. Master admin dashboard
  - [x] 14.1 Rewrite `admin.html`
    - Replace Arabic strings with English-only UI; add the password gate, hidden control panels (student management, quiz config, part visibility), and the shared Firebase init block (RTDB + Firestore)
    - _Requirements: 6.1, 6.12, 8.5_

  - [x] 14.2 Rewrite `admin.js`
    - Implement password gate reveal/deny with English error (6.2, 6.3); student create using `decideCreate` writing to both `students` and `students_auth` with duplicate/empty-field English messages (6.4, 6.5, 6.6); live student list via `onSnapshot` (6.7); delete student (6.8); quiz-config select + save via `makeQuizConfig` (6.9, 6.10); RTDB part-visibility toggles reusing the existing `settings/visibility` pattern with a save-confirm indicator within 2s and error-retain on failure (7.1, 7.2, 7.3)
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.1, 7.2, 7.3_

  - [ ]* 14.3 Write unit tests for admin behaviors
    - Password gate hides/reveals controls and denies wrong password (6.2, 6.3); create-form field validation blocks empty writes (6.4); visibility toggle confirmation and error indicators (7.2, 7.3); English-only UI (6.12)
    - _Requirements: 6.2, 6.3, 6.4, 6.12, 7.2, 7.3_

- [ ] 15. Reader continuity and Firebase integration verification
  - [x] 15.1 Repoint reader back link
    - Update `reader.html`'s "Back" link target from `index.html` to `home.html`; leave reader behavior and RTDB visibility filtering otherwise unchanged
    - _Requirements: 7.7_

  - [ ]* 15.2 Write security-rules tests (Firebase emulator)
    - Unauthenticated read cannot access the password store and leaderboard read of `students` returns only `displayName` + `score` (9.2); unauthenticated/cross-user score write is rejected and existing score unchanged (5.2)
    - _Requirements: 9.2, 5.2_

  - [ ]* 15.3 Write Firestore integration tests
    - Auth lookup by doc ID (2.2); live leaderboard `onSnapshot` re-render within limits (3.1, 3.6, 5.5); student create/list/delete (6.5, 6.7, 6.8); Quiz_Config write and quiz read-back (6.10, 6.11); glossary loads from configured story/part (4.2)
    - _Requirements: 2.2, 3.1, 3.6, 4.2, 5.5, 6.5, 6.7, 6.8, 6.10, 6.11_

- [x] 16. Final checkpoint - full suite (all 13 property tests pass; optional emulator/jsdom tests deferred)
  - Ensure all property, unit, and integration tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Pure cores (`leaderboard-core.js`, `quiz-core.js`, `auth-core.js`, `data-core.js`, `visibility-core.js`, `landing-core.js`) are authored as importable ES modules so the same files are consumed by both the page scripts and the property tests — no bundler required.
- Every property-based test uses fast-check with a minimum of 100 iterations and carries the `// Feature: english-platform-overhaul, Property {n}: {text}` tag.
- The `students`/`students_auth` split is what makes Requirement 9.2 enforceable: leaderboard reads never touch the credential store.
- RTDB `settings/visibility` is left intact; the reader keeps working through the relocated `app.js` and `visibility-core.js`.
- Checkpoints ensure incremental validation of the pure cores before UI wiring and again at the end.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "9.1", "9.3", "10.1", "12.1", "14.1", "15.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.2", "4.3", "5.2", "5.4", "6.2", "7.2", "9.2", "10.2", "12.4"] },
    { "id": 2, "tasks": ["2.4", "3.5", "3.6", "4.4", "5.3", "5.5", "10.3", "11.1", "12.2", "14.2"] },
    { "id": 3, "tasks": ["3.7", "11.2", "12.3", "13.1", "14.3", "15.2"] },
    { "id": 4, "tasks": ["13.2", "13.3", "15.3"] }
  ]
}
```
