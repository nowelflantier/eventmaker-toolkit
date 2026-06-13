# Module Development Rules

Use these rules for every Eventmaker Toolkit module.

## Eventmaker API Access

- Browser code must never call `https://app.eventmaker.io` directly.
- All module API calls must go through `apiFetch` from `src/lib/api.ts`.
- Local development uses the Vite proxy path `/api/eventmaker-dev`.
- Production uses the Vercel Function path `/api/eventmaker?path=...`.
- Do not add ad hoc `fetch` calls in modules.
- The Vercel proxy must follow Eventmaker redirects server-side. Redirects must not be exposed to the browser.
- For POST requests, preserve method and body on `307` and `308` redirects.
- Keep API error feedback visible in the UI. At minimum expose status, endpoint, and a useful body preview.

## Response Normalization

- Do not assume Eventmaker responses are always arrays or always wrapped objects.
- Normalize API responses at hook boundaries before UI/business logic consumes them.
- Support common wrapper shapes such as direct arrays, `{ data: [...] }`, `{ results: [...] }`, `{ guests: [...] }`, and `{ guest: ... }` when relevant.
- Never invent persistent Eventmaker IDs. If an object has no usable id, treat it as unresolved and block execution.
- Log malformed but successful API responses with enough context to debug the exact endpoint and source value.

## Time And Slots

- Slot payload ids can be technical UTC ids, for example `2026-09-23T07:00:00+00:00_0`.
- Display times should come from Eventmaker display fields such as `start_date` / `end_date` when available.
- Keep the technical slot id only for payload submission.
- Mapping and dry-run displays must use human-readable slot labels.
- Matching should compare against the same human time shown in the UI.

## Mapping UX

- User mappings must persist when navigating backward and forward between steps.
- Large option sets, especially slots, must use a searchable combobox rather than a raw select.
- The combobox input should be directly typable on focus, with filtered results shown below.
- Keyboard navigation is required for comboboxes: `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`.
- Group slot results by day where possible.
- Do not add search UI to small/simple selects unless it helps the workflow.

## Dry-Run And Feedback

- Dry-run must explain why a row is blocked:
  - missing UID
  - guest not found
  - ambiguous guest
  - API error
  - unresolved slot
  - unresolved location
  - same guest on both sides
  - duplicate in file
  - already handled in the session
- When a guest resolves, show the guest name and UID/id in the validation table.
- When a slot or location does not resolve, show the original Excel source value.
- Do not let users execute rows that have unresolved Eventmaker ids.

## Execution Safety

- Confirmation belongs before execution starts. The validation step should confirm, then transition to execution and start automatically.
- Execution must have an idempotence guard before every POST.
- Mark rows as pending before POST and created after success.
- If a row is already pending or created in the session, skip it instead of posting again.
- Protect auto-start effects against React StrictMode double execution.
- Report created, failed, and skipped rows clearly.
- Export reports should include payload, idempotency key, status, and API error details.
