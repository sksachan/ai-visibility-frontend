# Frontend v20 refresh-stage UI fix

Fixes Refresh Evidence progress visibility:

- Tracks the returned target run ID after refresh start.
- Polls `/api/evidence/status?runId=<target_run_id>` so status remains pinned to the active run when the service moves from portfolio generation to auditor execution.
- Maps granular backend stages to UI phases so pills highlight for `portfolio_ui_hitl_submitted`, `auditor_queued`, `auditor_ui_hitl_waiting`, `auditor_ui_hitl_submitted`, `evidence_ready`, and `report_bundle_ready`.
- Keeps target run ID visible while refresh is running.
- Keeps latest-successful report behaviour unchanged.
