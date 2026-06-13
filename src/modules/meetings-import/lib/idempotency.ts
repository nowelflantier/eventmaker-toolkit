const CREATED_MEETINGS_KEY = 'em_created_meetings'
const PENDING_MEETINGS_KEY = 'em_pending_meetings'

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
  return readKeySet(CREATED_MEETINGS_KEY)
}

export function getPendingMeetingKeys(): Set<string> {
  return readKeySet(PENDING_MEETINGS_KEY)
}

export function isMeetingAlreadyHandled(key: string): boolean {
  return getCreatedMeetingKeys().has(key) || getPendingMeetingKeys().has(key)
}

export function markMeetingPending(key: string): void {
  const keys = getPendingMeetingKeys()
  keys.add(key)
  sessionStorage.setItem(PENDING_MEETINGS_KEY, JSON.stringify([...keys]))
}

export function unmarkMeetingPending(key: string): void {
  const keys = getPendingMeetingKeys()
  keys.delete(key)
  sessionStorage.setItem(PENDING_MEETINGS_KEY, JSON.stringify([...keys]))
}

export function markMeetingCreated(key: string): void {
  const keys = getCreatedMeetingKeys()
  keys.add(key)
  sessionStorage.setItem(CREATED_MEETINGS_KEY, JSON.stringify([...keys]))
  unmarkMeetingPending(key)
}

function readKeySet(storageKey: string): Set<string> {
  const raw = sessionStorage.getItem(storageKey)
  if (!raw) return new Set()

  try {
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    sessionStorage.removeItem(storageKey)
    return new Set()
  }
}
