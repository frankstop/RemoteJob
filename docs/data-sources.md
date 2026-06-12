# Data sources

RemoteJob uses employer-direct public ATS APIs only.

Current source set:

- Greenhouse employer boards.
- Ashby employer boards.
- Lever employer boards when configured.

Rules:

- Show source name on every listing.
- Link back to original posting.
- Keep provider docs in `config/source_policy.json`.
- Remove any source if terms disallow indexing, storage, or public redistribution.
- Use employer ATS apply URLs as canonical.
- Do not use aggregator pages as canonical apply sources.
- Prefer no-key ATS sources for GitHub Actions compatibility.

Future candidates:

- More employer ATS feeds where explicit JSON endpoints are available.
- Provider adapters only after source terms and output shape are reviewed.
