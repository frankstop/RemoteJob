# Privacy

RemoteJob has no app server and no accounts.

Job data is public feed data stored in `public/data/jobs.json`.

User state stays in browser `localStorage`:

- Job statuses.
- Notes.
- Resume version labels.
- Company notes.
- Blocked companies.
- Preferences.
- Apply cart.

Export creates a local JSON backup. Import reads that file in browser. RemoteJob does not upload user state.

