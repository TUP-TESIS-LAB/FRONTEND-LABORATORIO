# Endpoint audit — atención wizard CORE

Date: 2026-05-21 · Branch: feat/atencion-wizard-deep-core · Plan: ../2026-05-21-atencion-wizard-deep-core.md

Method: static analysis only (Grep + Read against `Backend/src/main/java`). The backend was not started; no `curl` was executed.

## Static analysis results

| # | Endpoint | Exists? | Source file (controller + line) | Notes / impact |
|---|---|---|---|---|
| 1 | `GET /api/v1/analitica/patients/search?q=...` | yes | `modules/analitica/presentation/patient/PatientController.java:130` (class `@RequestMapping("/api/v1/analitica/patients")` at L43; `@GetMapping("/search")` at L130) | Accepts `q`, `state` (default `active`), `status`, `page`, `size`. Returns paginated. Frontend can call directly. |
| 2 | `GET /api/v1/analitica/patients/exists?dni=...` | yes | `PatientController.java:104` | Returns `{ exists: boolean }`. Matches plan. |
| 3 | `GET /api/v1/analitica/patients/{id}` | yes | `PatientController.java:88` | Standard CRUD by id. Also available: `GET /dni/{dni}` at L112 and `GET /by-ids` at L96. |
| 4 | `GET /api/v1/analitica/analysis?shortCode=N` | no | — (no `AnalysisController.java` under `modules/analitica/**`; grep for `shortCode` returns 0 matches in backend) | Action: frontend must stub/mocked catalog or block the analysis step until backend exposes the endpoint. Coordinate with backend team. |
| 5 | `GET /api/v1/analitica/analysis?nameLike=X` | no | — (same as #4; `nameLike` not found anywhere in backend) | Action: same as #4 — fallback to local mock catalog for now. |
| 6 | `GET /api/v1/analitica/analysis/{id}` | no | — (no AnalysisController) | Action: same — wizard cannot fetch analysis details by id from backend yet. |
| 7 | `GET /api/v1/analitica/nbu/current` | no | — (grep `nbu\|NBU\|Nbu` returns 0 files in backend) | Confirmed not implemented. Action: frontend uses hardcoded/config NBU value until module ships. |
| 8 | `PATCH /api/v1/attentions/{id}/assign/general-data` | yes | `modules/analitica/atencion/presentation/SecretaryAttentionController.java:105` (class `@RequestMapping("/api/v1/attentions")` at L23) | Already in use by existing wizard. No change. |
| 9 | `PATCH /api/v1/attentions/{id}/add/analysis` | yes | `SecretaryAttentionController.java:120` | Already in use. Body uses `AddAnalysisListRequest`. |
| 10 | `PATCH /api/v1/attentions/{id}/end-secretary-phase` | yes | `SecretaryAttentionController.java:163` | Already in use. |

## Summary

- **Exist (7 of 10):** #1, #2, #3, #8, #9, #10 — plus extras `GET /api/v1/attentions/{id}` (L83), `GET /by-protocol/{protocolId}` (L90), `GET /{id}/payment-info` (L98) which may be useful for the wizard.
- **Missing (3 of 10):** #4, #5, #6 — no `AnalysisController` exists under `modules/analitica/**`. The analitica module currently only exposes Patient and Attention controllers (plus `ExtractorAttentionController`).
- **Confirmed missing (1):** #7 NBU — no NBU module in backend.

## Frontend impact / actions

- **Analysis catalog (#4, #5, #6):** wizard must either (a) ship with a local mock catalog of `Analysis` objects, or (b) block the "add analysis" step behind a feature flag until backend exposes the controller. Recommend (a) so the wizard remains demoable end-to-end.
- **NBU (#7):** use a constant in frontend config; surface a TODO comment pointing to this audit.
- **Patient endpoints (#1–#3):** fully usable; `search` returns paginated payload (`PaginatedPatientResponse`) — frontend client must read `items`/`total` accordingly.
- **Attention PATCH endpoints (#8–#10):** unchanged from current wizard; no migration risk.
