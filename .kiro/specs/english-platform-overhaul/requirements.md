# Requirements Document

## Introduction

This feature is a full architectural and visual overhaul of an existing static English-learning
platform for children (static HTML/CSS/JS deployed on Firebase Hosting). The overhaul replaces the
current landing page with a cinematic "Magical Night Forest" experience, adds authenticated student
login, a competitive "Wall of Fame" leaderboard, a timed "Quick Quiz" engine driven by story
glossaries, and a futuristic master admin dashboard. It also introduces Cloud Firestore as the
backing data store for students, scores, and quiz configuration, alongside (or migrating from) the
existing Realtime Database used for part visibility.

The existing platform uses Firebase compat SDK v10.12.2 with Realtime Database, project
`storysaadrnd`, and reads story content from a static `stories.json` where each part carries a
`glossary` mapping English words to Arabic meanings. The Quick Quiz reverses this mapping: it prompts
with an Arabic word and offers English answer options.

All user-facing interface text is in English. The only permitted Arabic text anywhere in the UI is
the single target Arabic word displayed as the prompt inside a quiz question.

## Glossary

- **Platform**: The complete client-side application comprising the landing page, login, home page, quiz engine, and admin dashboard.
- **Landing_Page**: The cinematic entry screen served at `index.html`, replacing the current index.
- **Login_Section**: The authentication card revealed on the Landing_Page for student sign-in.
- **Home_Page**: The authenticated page served at `home.html` displaying the leaderboard and quiz entry point.
- **Auth_Service**: The client-side logic that validates student credentials against Firestore and manages the session.
- **Session**: The record that a student is currently authenticated within the browser.
- **Student**: An end user account created by the Admin, identified by a username and a display name, holding a score.
- **Admin**: The privileged operator who accesses the admin dashboard using the admin password.
- **Admin_Dashboard**: The password-protected control panel served at `admin.html`, driven by `admin.js`.
- **Leaderboard**: The frosted-glass "Wall of Fame" / "Honor Board" component on the Home_Page ranking Students by score.
- **Quiz_Engine**: The Quick Quiz component that presents timed questions and computes a final score.
- **Quiz_Config**: The Admin-selected active Story and Part that determines which glossary supplies quiz words.
- **Story**: A story entry in `stories.json` identified by `id`, containing an ordered list of parts.
- **Part**: A single segment of a Story containing text, media, and a `glossary`.
- **Glossary**: A Part's mapping of English words to Arabic meanings (`{english: arabic}`).
- **Question**: A single quiz item presenting one Arabic prompt word and four English answer options.
- **Score**: A Student's cumulative or latest quiz result persisted in Firestore.
- **Firestore**: Cloud Firestore, the document database used for Students, Scores, and Quiz_Config.
- **RTDB**: Firebase Realtime Database, currently used for story part visibility settings.
- **Particle_System**: The CSS/JS-driven animated visual layer (glowing fireflies, drifting elements) on the Landing_Page.

## Requirements

### Requirement 1: Cinematic Landing Page

**User Story:** As a young learner arriving at the platform, I want an immersive animated landing page, so that I feel excited and invited to start learning.

#### Acceptance Criteria

1. THE Landing_Page SHALL replace the entire previous content of `index.html`.
2. THE Landing_Page SHALL render a "Magical Night Forest" themed scene using CSS variables, flex/grid layout, and keyframe animations, with no inline style attributes on rendered elements.
3. THE Landing_Page SHALL render a Particle_System of between 20 and 60 glowing firefly elements animated with hardware-accelerated CSS transforms.
4. THE Landing_Page SHALL render between 5 and 15 floating glowing elements consisting of English words and Student display names that drift across the scene, with each element remaining fully within the visible viewport bounds throughout its animation.
5. THE Landing_Page SHALL apply layered glassmorphism styling using backdrop blur and neon glow effects to its primary UI surfaces.
6. THE Landing_Page SHALL display a central "Start Adventure" control that repeats a continuous scale-pulse animation with a cycle duration between 1 and 3 seconds.
7. WHEN the "Start Adventure" control is activated by pointer tap, mouse click, or keyboard activation, THE Landing_Page SHALL perform a scripted cinematic transition, lasting between 1 and 5 seconds, that ends with the Login_Section fully visible and interactive.
8. WHEN the cinematic transition begins, THE Landing_Page SHALL start playback of a welcoming audio track.
9. IF the browser blocks or fails audio playback, THEN THE Landing_Page SHALL continue the cinematic transition to completion without blocking and without displaying an unhandled error.
10. THE Landing_Page SHALL present all interface text in English.
11. WHILE animations are running, THE Landing_Page SHALL sustain an average rendering rate of at least 55 frames per second measured over any 5-second window on a mobile browser released within the current or previous calendar year.
12. IF the browser reports a reduced-motion preference, THEN THE Landing_Page SHALL disable the firefly particle animations and the floating word drift animations while keeping all controls visible and functional.

### Requirement 2: Student Authentication

**User Story:** As a student, I want to log in with my username and password, so that my quiz scores are saved under my name.

#### Acceptance Criteria

1. THE Login_Section SHALL present an animated card containing a Username field and a Password field.
2. WHEN a Student submits credentials, THE Auth_Service SHALL look up the matching Student record in Firestore.
3. IF the submitted username matches a Student record AND the submitted password matches that record, THEN THE Auth_Service SHALL establish a Session and navigate to `home.html`.
4. IF the submitted username has no matching Student record, THEN THE Auth_Service SHALL display an English error message stating the credentials are invalid.
5. IF the submitted password does not match the stored password for the username, THEN THE Auth_Service SHALL display an English error message stating the credentials are invalid.
6. IF a credential field is empty when submission is attempted, THEN THE Auth_Service SHALL display an English validation message and SHALL NOT query Firestore.
7. WHILE a credential lookup is in progress, THE Login_Section SHALL display a loading indicator.
8. WHEN a Session is established, THE Auth_Service SHALL persist the authenticated Student identifier in browser session storage.
9. WHILE no valid Session exists, THE Home_Page SHALL redirect the browser to `index.html`.

### Requirement 3: Wall of Fame Leaderboard

**User Story:** As a student, I want to see a leaderboard of top scorers, so that I am motivated to improve my ranking.

#### Acceptance Criteria

1. WHEN the Home_Page loads with a valid Session, THE Leaderboard SHALL retrieve all Student Scores from Firestore and complete the retrieval within 3 seconds.
2. THE Leaderboard SHALL display Students ordered by Score in strictly descending numeric order.
3. THE Leaderboard SHALL display each ranked entry with its rank position as a sequential integer starting at 1, the Student display name, and the Score as a non-negative integer.
4. THE Leaderboard SHALL apply frosted-glass styling to the leaderboard container and play a rank-entry micro-animation that begins when the entry renders and completes within 500 milliseconds.
5. WHERE a Student holds one of the top three ranks, THE Leaderboard SHALL display a medal indicator that is visually distinct for each of ranks 1, 2, and 3, accompanied by a shine animation that completes within 1000 milliseconds.
6. WHEN a Student's Score changes in Firestore, THE Leaderboard SHALL update the displayed rankings within 3 seconds without triggering a full page reload.
7. IF two or more Students have equal Scores, THEN THE Leaderboard SHALL order the tied Students by ascending Student display name using case-insensitive comparison.
8. IF no Student Scores exist, THEN THE Leaderboard SHALL display an English empty-state message and SHALL NOT display any ranked entries.
9. IF the retrieval of Student Scores from Firestore fails or does not complete within 3 seconds, THEN THE Leaderboard SHALL display an English error message indicating that the leaderboard could not be loaded and SHALL retain any previously displayed rankings.
10. IF a Student record has a missing or empty display name, THEN THE Leaderboard SHALL display a default English placeholder name for that entry while preserving its rank position and Score.

### Requirement 4: Quick Quiz Engine

**User Story:** As a student, I want to take a fast timed vocabulary quiz, so that I can test my English word knowledge and earn a score.

#### Acceptance Criteria

1. THE Home_Page SHALL display a floating action control that opens the Quiz_Engine.
2. WHEN the Quiz_Engine starts, THE Quiz_Engine SHALL load the Glossary of the Story and Part specified by the current Quiz_Config.
3. THE Quiz_Engine SHALL present exactly 10 Questions per quiz session.
4. THE Quiz_Engine SHALL display, for each Question, one Arabic word as the prompt and four English answer options.
5. THE Quiz_Engine SHALL include, among the four options of each Question, the one English word whose Glossary mapping equals the Arabic prompt word.
6. THE Quiz_Engine SHALL select the three non-correct options as distinct English words drawn from the active Glossary.
7. THE Quiz_Engine SHALL display an animated progress bar that depletes over a 3-second window for each Question.
8. WHEN the 3-second window for a Question elapses without a selection, THE Quiz_Engine SHALL mark that Question as failed and advance to the next Question.
9. WHEN a Student selects an option, THE Quiz_Engine SHALL record the Question as correct only if the selected option equals the correct English word, and SHALL advance to the next Question.
10. WHEN all 10 Questions are resolved, THE Quiz_Engine SHALL compute a final Score equal to the count of correct Questions.
11. WHEN the final Score is computed, THE Quiz_Engine SHALL display a confetti and particle celebration animation.
12. WHEN the final Score is computed, THE Quiz_Engine SHALL write the Score for the authenticated Student to Firestore.
13. IF the active Glossary provides fewer than four distinct English words, THEN THE Quiz_Engine SHALL display an English message indicating the selected Part has insufficient vocabulary for a quiz.
14. IF the active Glossary provides at least four but fewer than 10 distinct English words, THEN THE Quiz_Engine SHALL generate Questions by reusing Glossary words so that a full 10-Question session is presented.
15. THE Quiz_Engine SHALL display the single Arabic prompt word as the only Arabic text within the interface.

### Requirement 5: Score Persistence and Leaderboard Sync

**User Story:** As a student, I want my quiz results to instantly update the leaderboard, so that my ranking reflects my latest achievement.

#### Acceptance Criteria

1. WHEN the Quiz_Engine writes a Score for an authenticated Student, THE Firestore SHALL store the Score, as an integer value between 0 and 100 inclusive, associated with the authenticated Student identifier.
2. IF the Quiz_Engine attempts to write a Score for a Student that is not authenticated, THEN THE Firestore SHALL reject the write and retain any existing stored Score unchanged.
3. WHEN a Student completes a quiz with a Score strictly greater than the Student's stored Score, THE Platform SHALL replace the stored Score with the new higher Score value.
4. WHILE a Student completes a quiz with a Score less than or equal to the stored Score, THE Platform SHALL retain the existing stored Score without modification.
5. WHEN a Score write to Firestore succeeds, THE Leaderboard SHALL reflect the updated ranking within 5 seconds of the successful write.
6. IF a Score write to Firestore fails, THEN THE Quiz_Engine SHALL retain the Student's previously stored Score unchanged AND display an English message indicating to the Student that the Score was not saved.

### Requirement 6: Master Admin Dashboard

**User Story:** As the platform administrator, I want a control panel to manage student accounts and select the active quiz content, so that I control who can log in and what vocabulary is tested.

#### Acceptance Criteria

1. WHEN the Admin opens `admin.html`, THE Admin_Dashboard SHALL require entry of the admin password before revealing controls.
2. IF the entered admin password does not match the configured admin password, THEN THE Admin_Dashboard SHALL deny access and display an English error message.
3. WHEN the correct admin password is entered, THE Admin_Dashboard SHALL reveal the student management and quiz configuration controls.
4. THE Admin_Dashboard SHALL provide a control to create a Student by specifying a username, password, and display name.
5. WHEN the Admin creates a Student, THE Admin_Dashboard SHALL write the new Student record to Firestore.
6. IF the Admin attempts to create a Student with a username that already exists in Firestore, THEN THE Admin_Dashboard SHALL reject the creation and display an English message.
7. THE Admin_Dashboard SHALL display the list of existing Students retrieved from Firestore.
8. THE Admin_Dashboard SHALL provide a control to delete an existing Student record from Firestore.
9. THE Admin_Dashboard SHALL provide a control to select the active Story and one of its Parts as the Quiz_Config.
10. WHEN the Admin selects an active Story and Part, THE Admin_Dashboard SHALL write the selection as the Quiz_Config to Firestore.
11. WHEN the Quiz_Engine subsequently starts, THE Quiz_Engine SHALL use the most recently written Quiz_Config.
12. THE Admin_Dashboard SHALL present all interface text in English.

### Requirement 7: Story Part Visibility Continuity

**User Story:** As the platform administrator, I want the existing part-visibility control to keep working, so that hidden story parts remain hidden after the overhaul.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a control for each Part of each Story that toggles that Part's visibility state between visible and hidden.
2. WHEN the Admin toggles a Part's visibility, THE Platform SHALL persist the resulting visibility state for that Part within 2 seconds and display an indication confirming the state was saved.
3. IF persisting a Part's visibility state fails, THEN THE Platform SHALL retain the Part's previously saved visibility state and display an error indication informing the Admin that the change was not saved.
4. WHILE a Part's visibility state is set to hidden, THE reader experience SHALL exclude that Part from the reader's part sequence.
5. IF a reader requests a Part whose visibility state is hidden, THEN THE reader experience SHALL exclude that Part's content and present the reader with the next visible Part in sequence, or the story listing if no visible Part remains.
6. IF a Part has no stored visibility state, THEN THE Platform SHALL treat that Part as visible.
7. WHERE existing visibility settings reside in RTDB at `settings/visibility`, THE Platform SHALL continue to honor those settings after the overhaul.

### Requirement 8: Firestore Data Model

**User Story:** As a developer maintaining the platform, I want a defined Firestore data model, so that students, scores, and quiz configuration are stored consistently.

#### Acceptance Criteria

1. THE Firestore SHALL store each Student as a document containing a username, a password, a display name, and a Score.
2. THE Firestore SHALL enforce uniqueness of Student usernames such that no two Student documents share the same username.
3. THE Firestore SHALL store the Quiz_Config as a single document containing the active Story identifier and the active Part identifier.
4. WHEN a Student document is created without an explicit Score, THE Platform SHALL initialize the Student's Score to zero.
5. THE Platform SHALL load Firestore using the Firebase compat SDK configured for project `storysaadrnd`.

### Requirement 9: Credential Storage Security Consideration

**User Story:** As a platform administrator, I want to understand the security implications of storing student credentials, so that I can make an informed decision about the risk.

#### Acceptance Criteria

1. WHERE Student passwords are stored in Firestore as plaintext, THE Platform SHALL treat these credentials as low-sensitivity classroom access codes rather than secure account passwords.
2. THE Platform SHALL restrict client-readable Student fields via Firestore security rules so that password fields are not exposed to unauthenticated leaderboard reads.
3. THE design documentation SHALL record the plaintext-password risk and SHALL describe the mitigation path toward hashed credentials or Firebase Authentication.
4. THE Platform SHALL exclude the admin password from committed client source where technically feasible, and SHALL document the residual exposure where the admin password remains client-side.

## Security Note

Student credentials in this design live in Firestore and, as requested, use a simple username/password
scheme. Storing passwords in plaintext in a client-readable database is a known risk: any client able to
read the Students collection could read passwords, and the admin password gating `admin.html` is a
client-side prompt that provides deterrence rather than real protection. Requirements 9.1–9.4 capture
this risk and the intended mitigations (Firestore security rules that hide password fields from
leaderboard reads, and a documented upgrade path to hashed credentials or Firebase Authentication).
This is flagged here so the tradeoff is an explicit, informed decision rather than an accident.
