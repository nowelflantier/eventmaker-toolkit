import { useCallback, useState } from 'react'
import { ApiError, apiFetch } from '../../../lib/api'
import {
  GuestCategory,
  GuestDrawEvent,
  GuestDrawEventData,
  GuestFieldDefinition,
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

export function useGuestDrawData() {
  const [data, setData] = useState<GuestDrawEventData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const encodedEventId = encodeURIComponent(eventId)
      const [eventResponse, fieldsResponse, categoriesResponse, segmentsResponse] = await Promise.all([
        apiFetch<unknown>(`/events/${encodedEventId}.json`),
        apiFetch<unknown>(`/events/${encodedEventId}/guest_fields.json`),
        apiFetch<unknown>(`/events/${encodedEventId}/guest_categories.json`),
        apiFetch<unknown>(`/events/${encodedEventId}/saved_searches.json?locale=fr`, {
          apiBase: 'app',
        }),
      ])

      const normalized: GuestDrawEventData = {
        event: normalizeEvent(eventResponse, eventId),
        categories: normalizeCategories(categoriesResponse),
        segments: normalizeSegments(segmentsResponse),
        fields: normalizeGuestFields(fieldsResponse),
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
  const rawFields =
    readArray(data, ['guest_fields', 'guestFields', 'fields', 'data', 'results']) ??
    (Array.isArray(data) ? data : [])

  const fields = rawFields
    .map(normalizeGuestField)
    .filter((item): item is GuestFieldDefinition => item !== null)

  return dedupeByKey(fields).sort((left, right) => left.label.localeCompare(right.label, 'fr'))
}

function normalizeGuestField(data: unknown): GuestFieldDefinition | null {
  if (typeof data === 'string') {
    const key = data.trim()
    if (!key) return null

    return {
      key,
      label: key,
      type: '',
      storage: nativeGuestFields.has(key) ? 'native' : 'guest_metadata',
      hasAvailableValues: false,
      allowMultipleValues: false,
      textLike: true,
    }
  }

  const field = asRecord(data)
  const key =
    stringValue(field.key) ||
    stringValue(field.property) ||
    stringValue(field.field) ||
    stringValue(field.slug) ||
    stringValue(field.metadata_name) ||
    stringValue(field.name)

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
    stringValue(field.kind)
  const availableValues =
    readArray(field, ['available_values', 'availableValues', 'values', 'options', 'choices']) ?? []
  const hasAvailableValues = availableValues.length > 0
  const allowMultipleValues = Boolean(
    field.allow_multiple_values ?? field.allowMultipleValues ?? field.multiple,
  )
  const hasCustomId = Boolean(stringValue(field._id) || stringValue(field.id))

  return {
    key,
    label,
    type,
    storage: nativeGuestFields.has(key) && !hasCustomId ? 'native' : 'guest_metadata',
    hasAvailableValues,
    allowMultipleValues,
    textLike: isTextLikeField(type, hasAvailableValues, allowMultipleValues),
  }
}

function isTextLikeField(
  type: string,
  hasAvailableValues: boolean,
  allowMultipleValues: boolean,
): boolean {
  if (hasAvailableValues || allowMultipleValues) return false

  const normalizedType = type.trim().toLowerCase()
  if (!normalizedType) return true
  if (/select|list|choice|radio|checkbox|boolean|calculated|number|date|file|image/.test(normalizedType)) {
    return false
  }

  return /text|string|textarea|short_text|long_text/.test(normalizedType)
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
