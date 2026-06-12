# RemoteJob

[![Jobs polled](https://img.shields.io/badge/jobs%20polled-1579-168f8f)](https://github.com/frankstop/RemoteJob/blob/main/public/data/jobs.json)
[![Sources](https://img.shields.io/badge/sources-18-446b6b)](https://github.com/frankstop/RemoteJob/blob/main/config/source_policy.json)
[![GitHub Pages](https://img.shields.io/badge/site-live-168f8f)](https://frankstop.github.io/RemoteJob/)
[![Privacy](https://img.shields.io/badge/user%20state-localStorage-446b6b)](docs/privacy.md)

RemoteJob is a static remote-job tracker for people who apply in batches and need memory across sessions. It polls employer-direct public ATS APIs, normalizes listings into JSON, and gives users a browser-only workspace for filtering, saving, skipping, applying, notes, company blocking, and export.

Live app: [frankstop.github.io/RemoteJob](https://frankstop.github.io/RemoteJob/)

## Use Case

Most job boards are discovery feeds. RemoteJob is closer to an application workbench.

Use it when you want to:

- Check fresh remote listings daily.
- Filter by role family, source, salary, remote scope, age, and status.
- Track what you already saw, saved, skipped, or applied to.
- Keep job notes, resume-version notes, and company notes in one place.
- Block companies that waste time.
- Build an apply cart for batch application sessions.
- Back up or move browser state with JSON export/import.

No accounts. No app server. No user tracking upload.

## Features

- Static React + Vite app deployable to GitHub Pages.
- Scheduled GitHub Actions refresh, four times daily.
- Public dataset at `public/data/jobs.json`.
- Source policy at `config/source_policy.json`.
- Source adapters for Greenhouse, Ashby, and Lever employer ATS feeds.
- Role-family classification across software, data, product, design, support, sales, marketing, operations, finance, recruiting, legal, writing, education, healthcare, project management, and other roles.
- Full-text search plus structured filters.
- Explainable fit score with visible reasons.
- Per-job statuses: new, seen, saved, skipped, applied, interviewing, rejected, offer.
- Apply cart with batch status updates.
- Job notes, company notes, company blocking.
- Local-only persistence via `localStorage`.
- JSON export and import for user state.

## Data Sources

Current live dataset:

- Jobs polled: `1579`
- Sources: 18 employer ATS sources in `config/source_policy.json`

Source rules:

- Use employer-direct public ATS APIs only.
- Show source names.
- Link to original job postings.
- Remove any source if provider terms disallow indexing, storage, or public redistribution.
- Do not use aggregator pages as canonical apply sources.

More detail: [docs/data-sources.md](docs/data-sources.md)

## Architecture

```text
RemoteJob/
  .github/workflows/
    pages.yml          # build and deploy GitHub Pages
    update-jobs.yml    # scheduled dataset refresh
  config/
    source_policy.json # source rules and endpoints
  public/data/
    jobs.json          # normalized listings
    sources.json       # source metadata
  scripts/
    fetch-jobs.mjs     # API fetch, normalize, dedupe, publish
  src/
    App.tsx            # app shell and workflows
    lib/               # filtering, scoring, storage, types
```

## Local Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## Refresh Data

```bash
npm run fetch:jobs
```

Writes:

- `public/data/jobs.json`
- `public/data/sources.json`

## GitHub Pages

`pages.yml` builds and deploys `dist` from `main`.

`update-jobs.yml` refreshes job data on this schedule:

```yaml
12 5,11,17,23 * * *
```

## Privacy

RemoteJob stores user-specific state only in browser `localStorage`.

Stored locally:

- Job statuses.
- Notes.
- Resume-version labels.
- Company notes.
- Blocked companies.
- Preferences.
- Apply cart.

More detail: [docs/privacy.md](docs/privacy.md)
