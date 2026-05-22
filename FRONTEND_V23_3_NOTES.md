# Frontend v23.3 — Full audit scale controls

## Changes

- Adds explicit `Max owned URLs audited` control to the Refresh Evidence form.
- Adds explicit `Max external URLs crawled` control to the Refresh Evidence form.
- Sends `maxOwnedUrls` and `maxExternalUrls` to the frontend API proxy.
- API proxy maps the fields to Evidence Service contract fields:
  - `max_owned_urls`
  - `max_external_urls`
- Defaults are aligned to full-audit use:
  - `max_owned_urls = 100`
  - `max_external_urls = 150`
- Server-side fallback keeps full refresh at 100/150 if the UI field is absent.

## Recommended full audit configuration

- Run mode: Full refresh
- Query portfolio mode: Synthetic via Bodhi DeepResearch workflow
- Topic count: 5
- Queries per topic: 10
- Query limit: 50
- Owned URLs per query: 3–5
- External citations per query: 3
- Max owned URLs audited: 100
- Max external URLs crawled: 150
- Fresh AI citations / SerpAPI: ON
- Crawl owned URLs: ON
- Crawl external citations: ON
- Trigger Bodhi auditor: ON
