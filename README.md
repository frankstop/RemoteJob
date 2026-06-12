# RemoteJob

Static remote-job tracker for GitHub Pages.

RemoteJob fetches remote job listings from permitted public sources, normalizes them into JSON, and serves a browser app for daily job-search tracking. User notes and statuses stay in `localStorage`.

## Features

- Scheduled GitHub Actions refresh, four times daily.
- Public JSON dataset.
- Remotive, Remote OK, and Arbeitnow source adapters.
- Role-family classification across software, data, product, design, support, sales, marketing, operations, finance, recruiting, legal, writing, education, healthcare, project management, and other roles.
- Search, filters, status controls, company blocking, notes, apply cart.
- Import and export local tracking JSON.

## Local dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Refresh data

```bash
npm run fetch:jobs
```

The fetch script writes:

- `public/data/jobs.json`
- `public/data/sources.json`

## GitHub Pages

Push to `main`. `pages.yml` builds and deploys `dist`.

`update-jobs.yml` refreshes the dataset on a cron schedule and commits JSON changes.

## Source policy

See `config/source_policy.json` and `docs/data-sources.md`.

