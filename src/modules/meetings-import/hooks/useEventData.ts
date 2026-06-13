import { useCallback, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import { EventmakerEvent, EventmakerLocation, EventmakerSlot } from '../types'

export function useEventData() {
  const [event, setEvent] = useState<EventmakerEvent | null>(null)
  const [slots, setSlots] = useState<EventmakerSlot[]>([])
  const [locations, setLocations] = useState<EventmakerLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvent = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<EventmakerEvent>(`/events/${encodeURIComponent(eventId)}.json`)
      const normalizedEvent = normalizeEvent(data)
      setEvent(normalizedEvent)
      setLocations(normalizedEvent.meeting_locations ?? [])
      return normalizedEvent
    } catch (err) {
      console.error('Event lookup failed', err)
      setError('Événement introuvable')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSlots = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<unknown>(
        `/events/${encodeURIComponent(eventId)}/meetings/slots.json?locale=fr`,
      )
      const normalizedSlots = normalizeSlots(data)
      setSlots(normalizedSlots)
      return normalizedSlots
    } catch (err) {
      console.error('Slots lookup failed', err)
      setError('Impossible de charger les créneaux')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    event,
    slots,
    locations,
    loading,
    error,
    loadEvent,
    loadSlots,
  }
}

function normalizeEvent(data: unknown): EventmakerEvent {
  const event = readObject(data, ['event']) ?? asRecord(data)
  const rawLocations = readArray(event, ['meeting_locations', 'locations']) ?? []

  return {
    id: String(event.id ?? ''),
    name: stringValue(event.name) || stringValue(event.title),
    title: stringValue(event.title) || stringValue(event.name),
    meeting_locations: rawLocations.map((location, index) => normalizeLocation(location, index)),
  }
}

function normalizeSlots(data: unknown): EventmakerSlot[] {
  const rawSlots = readArray(data, ['slots', 'meeting_slots', 'data']) ?? (Array.isArray(data) ? data : [])
  return rawSlots.map((slot, index) => normalizeSlot(slot, index)).filter((slot) => slot.id)
}

function normalizeSlot(data: unknown, index: number): EventmakerSlot {
  const slot = asRecord(data)
  const startsAt =
    stringValue(slot.start_date) ||
    stringValue(slot.starts_at) ||
    stringValue(slot.start_at) ||
    stringValue(slot.start)
  const endsAt =
    stringValue(slot.end_date) ||
    stringValue(slot.ends_at) ||
    stringValue(slot.end_at) ||
    stringValue(slot.end)
  const id =
    stringValue(slot.id) ||
    stringValue(slot.slot_id) ||
    (startsAt ? `${startsAt}_${index}` : `slot-${index}`)
  const label =
    stringValue(slot.label) ||
    stringValue(slot.name) ||
    stringValue(slot.title) ||
    [startsAt, endsAt].filter(Boolean).join(' - ') ||
    id

  return {
    id,
    label,
    starts_at: startsAt,
    ends_at: endsAt,
  }
}

function normalizeLocation(data: unknown, index: number): EventmakerLocation {
  const location = asRecord(data)
  const id =
    stringValue(location.id) ||
    stringValue(location._id) ||
    stringValue(location.location_id) ||
    stringValue(location.meeting_location_id)
  const name =
    stringValue(location.name) ||
    stringValue(location.label) ||
    stringValue(location.title) ||
    `Lieu ${index + 1}`

  if (!id) {
    console.warn('Meeting location has no usable id', { location })
  }

  return { id, name }
}

function readArray(data: unknown, keys: string[]): unknown[] | null {
  const object = asRecord(data)
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as unknown[]
  }
  return null
}

function readObject(data: unknown, keys: string[]): Record<string, unknown> | null {
  const object = asRecord(data)
  for (const key of keys) {
    if (object[key] && typeof object[key] === 'object' && !Array.isArray(object[key])) {
      return object[key] as Record<string, unknown>
    }
  }
  return null
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}
