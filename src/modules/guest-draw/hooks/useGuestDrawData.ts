import { useCallback, useState } from 'react'
import { ApiError, apiFetch } from '../../../lib/api'
import {
  GuestCategory,
  GuestDrawEvent,
  GuestDrawEventData,
  GuestFieldDefinition,
  GuestFieldStorage,
  GuestSegment,
} from '../types'

const nativeGuestFields = new Set([
  '_id',
  'id',
  'uid',
  'email',
  'first_name',
  'last_name',
  'company_name',
  'position',
  'phone_number',
  'message',
  'guest_category_id',
  'registered',
  'rsvp_status',
  'badge_completed',
  'blacklisted',
])

const metadataContainerKeys = new Set([
  'guest_metadata',
  'guestmetadata',
  'guest_metadata_fields',
  'metadata_fields',
  'custom_fields',
])

export function useGuestDrawData() {
  const [data, setData] = useState<GuestDrawEventData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const encodedEventId = encodeURIComponent(eventId)
      const [eventResponse, categoriesResponse, segmentsResponse] = await Promise.all([
        apiFetch<unknown>(`/events/${encodedEventId}.json`),
        apiFetch<unknown>(`/events/${encodedEventId}/guest_categories.json`),
        apiFetch<unknown>(`/events/${encodedEventId}/saved_searches.json?locale=fr`, {
          apiBase: 'app',
        }),
      ])

      const normalized: GuestDrawEventData = {
        event: normalizeEvent(eventResponse, eventId),
        categories: normalizeCategories(categoriesResponse),
        segments: normalizeSegments(segmentsResponse),
        fields: normalizeGuestFields(eventResponse),
      }

      setData(normalized)
      return normalized
    } catch (err) {
      console.error('Guest draw event data lookup failed', { eventId, error: err })
      const message = formatApiError(err, 'Impossible de charger les données du tirage au sort.')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    loadData,
  }
}

function normalizeEvent(data: unknown, fallbackId: string): GuestDrawEvent {
  const root = asRecord(data)
  const event = readObject(root, ['event', 'data']) ?? root

  return {
    id: stringValue(event._id) || stringValue(event.id) || fallbackId,
    name: stringValue(event.name) || stringValue(event.title) || `Event ${fallbackId}`,
    guestCount: nullableNumber(event.guest_count ?? event.guests_count),
  }
}

function normalizeCategories(data: unknown): GuestCategory[] {
  const rawCategories =
    readArray(data, ['guest_categories', 'categories', 'data', 'results']) ??
    (Array.isArray(data) ? data : [])

  return dedupeById(
    rawCategories
      .map((item) => {
        const category = asRecord(item)
        const id = stringValue(category._id) || stringValue(category.id)
        const name = stringValue(category.name) || stringValue(category.label)
        return id && name ? { id, name } : null
      })
      .filter((item): item is GuestCategory => item !== null),
  ).sort((left, right) => left.name.localeCompare(right.name, 'fr'))
}

function normalizeSegments(data: unknown): GuestSegment[] {
  const rawSegments =
    readArray(data, ['saved_searches', 'segments', 'data', 'results']) ??
    (Array.isArray(data) ? data : [])

  return dedupeById(
    rawSegments
      .map((item) => {
        const segment = asRecord(item)
        const id = stringValue(segment._id) || stringValue(segment.id)
        const name = stringValue(segment.name) || stringValue(segment.label)
        if (!id || !name) return null

        return {
          id,
          name,
          searchQuery: stringValue(segment.search_query) || stringValue(segment.query),
          guestCount: nullableNumber(
            segment.guest_count ?? segment.guests_count ?? segment.results_count ?? segment.count,
          ),
        }
      })
      .filter((item): item is GuestSegment => item !== null),
  ).sort((left, right) => left.name.localeCompare(right.name, 'fr'))
}

function normalizeGuestFields(data: unknown): GuestFieldDefinition[] {
  const root = asRecord(data)
  const event = readObject(root, ['event', 'data']) ?? root
  const rawFields =
    event.guest_fields ??
    event.guestFields ??
    event.fields ??
    root.guest_fields ??
    root.guestFields ??
    root.fields

  const fields = extractGuestFields(rawFields)
  return dedupeByKey(fields).sort((left, right) => left.label.localeCompare(right.label, 'fr'))
}

function extractGuestFields(
  value: unknown,
  forcedStorage?: GuestFieldStorage,
  depth = 0,
): GuestFieldDefinition[] {
  if (depth > 4 || value === null || value === undefined) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractGuestFieldItem(item, forcedStorage, depth))
  }

  if (typeof value === 'string') {
    const field = normalizeGuestField(value, forcedStorage)
    return field ? [field] : []
  }

  const record = asRecord(value)
  if (Object.keys(record).length === 0) return []

  if (hasFieldIdentity(record)) {
    return extractGuestFieldItem(record, forcedStorage, depth)
  }

  return Object.entries(record).flatMap(([entryKey, entryValue]) => {
    const normalizedEntryKey = normalizeKey(entryKey)
    if (metadataContainerKeys.has(normalizedEntryKey)) {
      return extractGuestFields(entryValue, 'guest_metadata', depth + 1)
    }

    if (Array.isArray(entryValue)) {
      return extractGuestFields(entryValue, forcedStorage, depth + 1)
    }

    if (entryValue && typeof entryValue === 'object') {
      const child = asRecord(entryValue)
      return extractGuestFieldItem(
        { ...child, key: fieldKey(child) || entryKey },
        forcedStorage ?? (nativeGuestFields.has(entryKey) ? 'native' : undefined),
        depth + 1,
      )
    }

    const field = normalizeGuestField(entryKey, forcedStorage)
    return field ? [field] : []
  })
}

function extractGuestFieldItem(
  value: unknown,
  forcedStorage: GuestFieldStorage | undefined,
  depth: number,
): GuestFieldDefinition[] {
  const record = asRecord(value)
  const key = fieldKey(record)
  const normalizedKey = normalizeKey(key)
  const nestedMetadata = [
    record.guest_metadata,
    record.guestMetadata,
    record.guest_metadata_fields,
    record.metadata_fields,
    record.custom_fields,
  ].flatMap((nested) => extractGuestFields(nested, 'guest_metadata', depth + 1))
  const nestedFields =
    normalizedKey === 'guest_metadata' || normalizedKey === 'guestmetadata'
      ? extractGuestFields(record.fields ?? record.items ?? record.children, 'guest_metadata', depth + 1)
      : []
  const isMetadataContainer = metadataContainerKeys.has(normalizedKey)
  const field = isMetadataContainer ? null : normalizeGuestField(value, forcedStorage)

  return [...(field ? [field] : []), ...nestedMetadata, ...nestedFields]
}

function normalizeGuestField(
  data: unknown,
  forcedStorage?: GuestFieldStorage,
): GuestFieldDefinition | null {
  if (typeof data === 'string') {
    const key = data.trim()
    if (!key) return null
    return {
      key,
      label: key,
      type: '',
      storage: forcedStorage ?? (nativeGuestFields.has(key) ? 'native' : 'guest_metadata'),
      booleanLike: false,
    }
  }

  const field = asRecord(data)
  const key = fieldKey(field)

  if (!key) {
    console.warn('Guest field has no usable key', { field })
    return null
  }

  const label =
    stringValue(field.label) ||
    stringValue(field.display_name) ||
    stringValue(field.title) ||
    stringValue(field.name) ||
    key
  const type =
    stringValue(field.type) ||
    stringValue(field.field_type) ||
    stringValue(field.input_type) ||
    stringValue(field.control_type) ||
    stringValue(field.widget) ||
    stringValue(field.liquid_tag) ||
    stringValue(field.kind)
  const scope = [field.storage, field.scope, field.owner, field.object, field.model]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')
  const explicitlyMetadata =
    field.is_metadata === true ||
    field.guest_metadata === true ||
    scope.includes('metadata')
  const storage =
    forcedStorage ??
    (nativeGuestFields.has(key) && !explicitlyMetadata ? 'native' : 'guest_metadata')

  return {
    key,
    label,
    type,
    storage,
    booleanLike: isBooleanLikeField(field, type),
  }
}

function fieldKey(field: Record<string, unknown>): string {
  return (
    stringValue(field.key) ||
    stringValue(field.property) ||
    stringValue(field.field) ||
    stringValue(field.slug) ||
    stringValue(field.metadata_name) ||
    stringValue(field.name)
  )
}

function hasFieldIdentity(field: Record<string, unknown>): boolean {
  return Boolean(fieldKey(field))
}

function isBooleanLikeField(field: Record<string, unknown>, type: string): boolean {
  const normalizedType = type.toLowerCase()
  if (/checkbox|boolean|bool|switch|toggle/.test(normalizedType)) return true

  const values = readArray(field, ['values', 'options', 'choices']) ?? []
  const normalizedValues = values
    .map((value) => {
      const item = asRecord(value)
      return String(item.value ?? item.id ?? item.name ?? value).trim().toLowerCase()
    })
    .filter(Boolean)
  const booleanValues = new Set(['0', '1', 'true', 'false', 'yes', 'no', 'oui', 'non'])

  return normalizedValues.length > 0 && normalizedValues.every((value) => booleanValues.has(value))
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

function dedupeByKey<T extends { key: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.key, item])).values()]
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

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function formatApiError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : fallback

  const status = error.details?.status ? `HTTP ${error.details.status}` : 'Erreur API'
  const body = error.details?.bodyPreview ? ` — ${error.details.bodyPreview}` : ''
  return `${status}${body}`
}
