# Data sources

RemoteJob uses public APIs and structured feeds only.

Current source set:

- Remotive: public remote jobs API.
- Remote OK: public remote jobs API.
- Arbeitnow: public job board API filtered to remote listings.

Rules:

- Show source name on every listing.
- Link back to original posting.
- Keep provider docs in `config/source_policy.json`.
- Remove any source if terms disallow indexing, storage, or public redistribution.
- Prefer no-key sources for GitHub Actions compatibility.

Future candidates:

- Jobicy, if API terms allow static redistribution.
- The Muse, if API access and terms fit.
- Company ATS feeds where explicit JSON endpoints are available.

