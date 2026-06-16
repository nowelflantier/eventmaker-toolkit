import { useCallback, useMemo, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import { EventmakerSegment, EventmakerSession, TraitFilter } from '../types'

export function useSessionData() {
  const [sessions, setSessions] = useState<EventmakerSession[]>([])
  const [segments, setSegments] = useState<EventmakerSegment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const [sessionsData, segmentsData] = await Promise.all([
        apiFetch<unknown>(
          `/events/${encodeURIComponent(eventId)}/accesspoints.json?exclude_exit_accesspoint=true`,
        ),
        apiFetch<unknown>(`/events/${encodeURIComponent(eventId)}/saved_searches.json?locale=fr`, {
          apiBase: 'app',
        }),
      ])
      const normalizedSessions = normalizeSessions(sessionsData)
      const normalizedSegments = normalizeSegments(segmentsData)
      setSessions(normalizedSessions)
      setSegments(normalizedSegments)
      return { sessions: normalizedSessions, segments: normalizedSegments }
    } catch (err) {
      console.error('Campaign creator data lookup failed', err)
      setError(err instanceof Error ? err.message : 'Impossible de charger les sessions et segments.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const traitKeys = useMemo(() => {
    const keys = new Set<string>()
    sessions.forEach((session) => {
      Object.keys(session.traits ?? {}).forEach((key) => keys.add(key))
    })
    return [...keys].sort((left, right) => left.localeCompare(right))
  }, [sessions])

  return {
    sessions,
    segments,
    traitKeys,
    loading,
    error,
    loadData,
  }
}

export function filterSessions(
  sessions: EventmakerSession[],
  traitFilter: TraitFilter | null,
): EventmakerSession[] {
  if (!traitFilter) return sessions
  const expectedValue = traitFilter.value.trim()
  if (!traitFilter.key || !expectedValue) return []

  return sessions.filter((session) => String(session.traits?.[traitFilter.key] ?? '') === expectedValue)
}

function normalizeSessions(data: unknown): EventmakerSession[] {
  const rawSessions = readArray(data, ['accesspoints', 'sessions', 'data', 'results']) ?? (Array.isArray(data) ? data : [])
  return rawSessions.map(normalizeSession).filter((session) => session._id && session.type === 'session')
}

function normalizeSession(data: unknown): EventmakerSession {
  const record = asRecord(data)
  const room = asRecord(record.session_room)

  return {
    _id: stringValue(record._id) || stringValue(record.id),
    name: stringValue(record.name) || stringValue(record.display_name),
    display_name: stringValue(record.display_name) || stringValue(record.name),
    location: stringValue(record.location),
    start_date: stringValue(record.start_date),
    end_date: stringValue(record.end_date),
    start_date_to_timezone: stringValue(record.start_date_to_timezone) || stringValue(record.start_date),
    end_date_to_timezone: stringValue(record.end_date_to_timezone) || stringValue(record.end_date),
    type: stringValue(record.type),
    session_type: stringValue(record.session_type),
    session_room: Object.keys(room).length > 0 ? { name: stringValue(room.name) } : null,
    traits: normalizeTraits(record.traits),
    uid: stringValue(record.uid),
  }
}

function normalizeSegments(data: unknown): EventmakerSegment[] {
  const rawSegments = readArray(data, ['saved_searches', 'segments', 'data', 'results']) ?? (Array.isArray(data) ? data : [])
  return rawSegments.map(normalizeSegment).filter((segment) => segment._id && segment.name)
}

function normalizeSegment(data: unknown): EventmakerSegment {
  const record = asRecord(data)
  return {
    _id: stringValue(record._id) || stringValue(record.id),
    name: stringValue(record.name),
  }
}

function normalizeTraits(value: unknown): Record<string, string> {
  const record = asRecord(value)
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, typeof item === 'string' || typeof item === 'number' ? String(item) : '']),
  )
}

function readArray(data: unknown, keys: string[]): unknown[] | null {
  const object = asRecord(data)
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as unknown[]
  }
  return null
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}
