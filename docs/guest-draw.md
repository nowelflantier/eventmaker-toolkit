# Guest draw module

## Current status

The `guest-draw` module is currently read-only.

Workflow:

`Événement -> Configuration -> Aperçu`

No participant is updated and no draw is persisted at this stage.

## V1 functional decisions

- Population can be selected through:
  - one or more guest categories combined with OR;
  - or one saved segment.
- Categories and segment cannot be combined.
- Only one segment can be selected.
- The number of expected winners must be a positive integer.
- The target field is resolved from the event `guest_fields` configuration.
- Custom fields nested below a `guest_metadata` container are normalized as metadata fields.
- Boolean-like fields are preferred when the API exposes a usable type.

## Eventmaker endpoints

All calls use `apiFetch`.

- `GET /events/:eventId.json`
  - event name and guest count;
  - guest field definitions when exposed by the event response.
- `GET /events/:eventId/guest_categories.json`
  - available guest categories.
- `GET /events/:eventId/saved_searches.json?locale=fr` with `apiBase: "app"`
  - available saved segments.
- `GET /events/:eventId/guests.json?page=:page&documents=false&guest_metadata=true`
  - paginated guest loading;
  - categories use repeated `category[]` query parameters;
  - segment mode currently uses an isolated `saved_search_id` parameter that must be validated against a real Eventmaker event.

## Pagination

- Starts at page 1.
- Continues until Eventmaker returns an empty page.
- Guests are deduplicated by persistent guest id.
- Only the data required by the preview and the future update plan is retained.
- Loading can be cancelled with `AbortController`.
- A safety limit prevents an infinite pagination loop.

## Validation checklist

### Event loading

- Event title is displayed.
- Guest count is displayed when returned.
- Guest categories are listed.
- Saved segments are listed.
- Native and custom guest fields are listed.
- Fields nested in `guest_metadata` are visible.

### Category population

- One category returns the same count as Eventmaker.
- Multiple categories return the union of guests, without duplicates.
- A participant belonging to the selected categories appears once.
- Pagination works beyond 500 guests.

### Segment population

- The selected segment count matches Eventmaker.
- The displayed sample contains only expected guests.
- If no segment count is returned, the UI clearly marks the filter as unverified.
- A mismatch blocks the future write phase.

### Guest metadata

- The selected target field is visible.
- Existing values are shown in the sample when returned by the list endpoint.
- If metadata is absent from paginated results, the UI warns that detailed guest reads will be required before updates.

## Next implementation phase

After the read-only behavior is validated:

1. build the secure random draw from the loaded candidate pool;
2. freeze the result in the current session;
3. build a dry-run update plan;
4. set winners to true and previous winners to false;
5. update only guests whose target value changes;
6. execute with limited concurrency and a retryable failure report.
