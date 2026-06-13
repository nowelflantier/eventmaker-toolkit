import { useRef, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import { GuestResolution, ResolvedGuest } from '../types'

const CONCURRENCY = 5

export function useGuestResolver(eventId: string | null) {
  const cacheRef = useRef(new Map<string, GuestResolution>())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resolveGuests(uids: string[]): Promise<Map<string, GuestResolution>> {
    if (!eventId) throw new Error('Missing event id')

    setLoading(true)
    setError(null)

    const uniqueUids = [...new Set(uids.map((uid) => uid.trim()).filter(Boolean))]
    const missing = uniqueUids.filter((uid) => !cacheRef.current.has(uid))

    try {
      await runWithConcurrency(missing, CONCURRENCY, async (uid) => {
        const resolution = await resolveGuest(eventId, uid)
        cacheRef.current.set(uid, resolution)
      })
    } catch (err) {
      console.error('Guest resolution failed', err)
      setError('Impossible de résoudre tous les guests')
    } finally {
      setLoading(false)
    }

    return new Map(cacheRef.current)
  }

  return {
    loading,
    error,
    resolveGuests,
  }
}

async function resolveGuest(eventId: string, uid: string): Promise<GuestResolution> {
  try {
    const data = await apiFetch<unknown>(
      `/events/${encodeURIComponent(eventId)}/guests.json?uid=${encodeURIComponent(
        uid,
      )}&documents=false&guest_metadata=false`,
    )
    const guests = normalizeGuests(data)

    if (guests.length === 0) {
      console.warn('Guest lookup returned no usable guest', { uid, data })
      return { uid, guest: null, status: 'not_found', error: 'Aucun guest exploitable dans la réponse API' }
    }
    if (guests.length > 1) return { uid, guest: null, status: 'ambiguous' }
    return { uid, guest: guests[0], status: 'resolved' }
  } catch (err) {
    console.error('Guest lookup failed', { uid, error: err })
    return {
      uid,
      guest: null,
      status: 'error',
      error:
        err instanceof Error
          ? `${err.message}${'details' in err && typeof err.details === 'object' && err.details && 'url' in err.details ? ` · ${String(err.details.url)}` : ''}`
          : 'Erreur inconnue',
    }
  }
}

function normalizeGuests(data: unknown): ResolvedGuest[] {
  const singleGuest = readObject(data, ['guest'])
  const rawGuests =
    readArray(data, ['guests', 'data', 'results', 'items']) ??
    (singleGuest ? [singleGuest] : Array.isArray(data) ? data : looksLikeGuest(data) ? [data] : [])

  return rawGuests.map(normalizeGuest).filter((guest) => guest.id)
}

function normalizeGuest(data: unknown): ResolvedGuest {
  const record = unwrapGuestRecord(data)
  return {
    id: stringValue(record.id) || stringValue(record._id),
    uid: stringValue(record.uid) || stringValue(record.external_uid),
    first_name: stringValue(record.first_name) || stringValue(record.firstName),
    last_name: stringValue(record.last_name) || stringValue(record.lastName),
  }
}

function unwrapGuestRecord(data: unknown): Record<string, unknown> {
  const record = asRecord(data)
  const nestedGuest = asRecord(record.guest)
  const attributes = asRecord(record.attributes)
  return Object.keys(nestedGuest).length > 0
    ? nestedGuest
    : Object.keys(attributes).length > 0
      ? { ...record, ...attributes }
      : record
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
    const value = object[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return null
}

function looksLikeGuest(data: unknown): boolean {
  const record = asRecord(data)
  return Boolean(record.id || record._id || record.uid || record.first_name || record.last_name)
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  })

  await Promise.all(workers)
}
