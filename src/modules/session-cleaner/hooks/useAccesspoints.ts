import { useCallback, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import { EventmakerAccesspointSession } from '../types'

export function useAccesspoints() {
  const [sessions, setSessions] = useState<EventmakerAccesspointSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<unknown>(
        `/events/${encodeURIComponent(eventId)}/accesspoints.json?exclude_exit_accesspoint=true`,
      )
      const normalizedSessions = normalizeSessions(data)
      setSessions(normalizedSessions)
      return normalizedSessions
    } catch (err) {
      console.error('Session cleaner accesspoints lookup failed', err)
      setError(err instanceof Error ? err.message : 'Impossible de charger les sessions.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    sessions,
    loading,
    error,
    loadData,
  }
}

function normalizeSessions(data: unknown): EventmakerAccesspointSession[] {
  const rawSessions =
    readArray(data, ['accesspoints', 'sessions', 'data', 'results']) ?? (Array.isArray(data) ? data : [])

  return rawSessions.map(normalizeSession).filter((session) => session._id && session.type === 'session')
}

function normalizeSession(data: unknown): EventmakerAccesspointSession {
  const record = asRecord(data)

  return {
    _id: stringValue(record._id) || stringValue(record.id),
    name: stringValue(record.name) || stringValue(record.display_name),
    display_name: stringValue(record.display_name) || stringValue(record.name),
    type: stringValue(record.type),
    start_date: stringValue(record.start_date),
    end_date: stringValue(record.end_date),
    location: stringValue(record.location),
    uid: stringValue(record.uid),
  }
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
