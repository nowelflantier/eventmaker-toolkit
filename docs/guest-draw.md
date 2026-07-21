# Guest draw module

## Workflow

`Événement -> Configuration -> Aperçu -> Tirage`

The module supports a full draw with an explicit confirmation before Eventmaker writes.

## V1 functional decisions

- Eligible population is selected through:
  - one or more guest categories combined with OR;
  - or one saved segment.
- Categories and segment cannot be combined.
- Only one segment can be selected.
- The target is a custom text field without configured values.
- Winners receive the text value `true`.
- Previous winners who are not selected receive the text value `false`.
- Existing `true` values are searched across the whole event, including guests outside the eligible population.

## Eventmaker endpoints

All calls use `apiFetch`.

- `GET /events/:eventId.json`
  - event name and guest count.
- `GET /events/:eventId/guest_fields.json`
  - target field definitions.
- `GET /events/:eventId/guest_categories.json`
  - available guest categories.
- `GET /events/:eventId/saved_searches.json?locale=fr` with `apiBase: "app"`
  - available saved segments.
- `GET /events/:eventId/guests.json?page=:page&documents=false&guest_metadata=true`
  - paginated guest loading.
- `GET /events/:eventId/guests/:guestId.json?guest_metadata=true`
  - fallback when the paginated response does not include metadata.
- `PUT /events/:eventId/guests/:guestId.json`
  - update the complete `guest_metadata` array.

## Safety

- The random result is frozen before confirmation.
- Random selection uses `crypto.getRandomValues`.
- No write occurs before the confirmation checkbox is selected.
- The complete metadata array is preserved because Eventmaker replaces, rather than appends, `guest_metadata` on update.
- Only guests whose target value changes are updated.
- Writes use bounded concurrency.
- Failures remain visible and can be retried without replaying successful updates.
- Preparation can be cancelled.
- Pagination has a safety limit.

## Validation checklist

### Event and configuration

- Event title, categories, segments and target text fields load correctly.
- Value-list and multiple-value fields are not offered as targets.
- One or multiple categories can be selected.
- A single segment can be selected.

### Preview

- The eligible count matches Eventmaker.
- Multiple categories return the expected union without duplicates.
- Pagination works beyond 500 guests.
- A segment mismatch blocks the draw.

### Draw plan

- The requested number of winners is displayed.
- Re-running the draw changes the frozen result before execution.
- Previous winners are detected across the whole event.
- The plan shows how many guests move to `true` and to `false`.
- Other guest metadata values remain unchanged in every payload.

### Execution

- No request is sent before explicit confirmation.
- Successful updates return HTTP 204.
- Winners contain the text value `true`.
- Previous non-selected winners contain the text value `false`.
- Unchanged participants are not updated.
- Failed updates can be retried independently.
