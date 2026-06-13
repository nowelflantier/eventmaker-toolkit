const createdMeetingKeys = new Set<string>()
const pendingMeetingKeys = new Set<string>()

export function buildIdempotencyKey(params: {
  eventId: string
  guestIds: [string, string]
  slotId: string
  locationId: string
}): string {
  const sortedGuests = [...params.guestIds].sort().join('|')
  return `${params.eventId}|${sortedGuests}|${params.slotId}|${params.locationId}`
}

export function getCreatedMeetingKeys(): Set<string> {
  return new Set(createdMeetingKeys)
}

export function getPendingMeetingKeys(): Set<string> {
  return new Set(pendingMeetingKeys)
}

export function isMeetingAlreadyHandled(key: string): boolean {
  return createdMeetingKeys.has(key) || pendingMeetingKeys.has(key)
}

export function markMeetingPending(key: string): void {
  pendingMeetingKeys.add(key)
}

export function unmarkMeetingPending(key: string): void {
  pendingMeetingKeys.delete(key)
}

export function markMeetingCreated(key: string): void {
  createdMeetingKeys.add(key)
  unmarkMeetingPending(key)
}
