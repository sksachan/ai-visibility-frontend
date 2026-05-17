# Frontend QA fix notes

Validated against `/mnt/data/outputs (39).json` from the latest Bodhi run.

## Fixed

- Added first-class parser support for `schema_version=query_workbench.v1` and `contract_version=page_level_cms_grouped_pr.v1` from the Preview Node tile `frontend_report_bundle`.
- Ensured the parser no longer routes the new canonical bundle through the legacy preview-bundle path.
- Parsed the full expected counts from the latest output: 50 queries, 31 owned URLs, 60 page-level CMS recommendations, 8 grouped PR opportunities, 38 actions, 50 query-workbench rows and 78 observed non-owned domains.
- Rebuilt Query Workbench with search, journey/status filters, sorting, and show-more pagination to reduce page scroll.
- Kept query diagnostics focused on AI visibility, competitor pressure, citation evidence and top citations; obsolete metrics are not shown on query cards.
- Ensured CMS / PR view prioritises page-level CMS recommendations and grouped PR opportunities rather than query-level rows.
- Ensured PR actions remain grouped-source opportunities, not owned-URL-specific recommendations.
- Added derived source-domain landscape from query-level citation evidence when the source landscape does not include explicit observed domains.
- Added Railway allowedHosts for Vite server and preview to prevent blocked host errors.
- Updated PDF export target to a full offscreen report container so export is not limited to the active tab.

## Validation

- `npm run build` passed.
- `npm run lint` passed.
- Parser smoke test against `outputs (39).json` passed with expected counts.
