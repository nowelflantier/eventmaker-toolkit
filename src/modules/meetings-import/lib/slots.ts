import { EventmakerSlot } from '../types'
import { normalizeText, textMatchScore } from './normalizeText'

export function buildSlotSource(row: Record<string, string>, mapping: {
  slot?: string
  slotDate?: string
  slotTime?: string
}): string {
  if (mapping.slot) return row[mapping.slot]?.trim() ?? ''

  const date = mapping.slotDate ? row[mapping.slotDate]?.trim() : ''
  const time = mapping.slotTime ? row[mapping.slotTime]?.trim() : ''
  return [date, time].filter(Boolean).join(' ')
}

export function formatSlot(slot: EventmakerSlot): string {
  const start = parseSlotParts(slot.starts_at) ?? parseSlotParts(slot.id) ?? parseSlotParts(slot.label)
  const end = parseSlotParts(slot.ends_at)

  if (!start) return slot.label || slot.id

  const date = formatFrenchDate(start)
  const startTime = `${start.hour}:${start.minute}`
  const endTime = end && isAfter(end, start) ? `${end.hour}:${end.minute}` : ''

  return `${date} · ${startTime}${endTime ? `-${endTime}` : ''}`
}

export function scoreSlotMatch(source: string, slot: EventmakerSlot): number {
  const parsedSource = parseSlotInput(source)
  const slotStartParts =
    parseSlotParts(slot.starts_at) ?? parseSlotParts(slot.id) ?? parseSlotParts(slot.label)
  const slotStart = slotStartParts ? partsToLocalDate(slotStartParts) : null

  if (parsedSource && slotStart && sameMinute(parsedSource, slotStart)) return 1

  return Math.max(
    textMatchScore(source, slot.label),
    textMatchScore(source, formatSlot(slot)),
    textMatchScore(source, slot.starts_at),
    textMatchScore(normalizeText(source), normalizeText(slot.id)),
  )
}

function parseSlotInput(value: string): Date | null {
  const normalized = value.trim()
  if (!normalized) return null

  const isoLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2})[:h](\d{2})/)
  if (isoLike) return makeLocalDate(isoLike[1], isoLike[2], isoLike[3], isoLike[4], isoLike[5])

  const frLike = normalized.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+|.*?)(\d{1,2})\s*[:h]\s*(\d{2})(?::\d{2})?/,
  )
  if (frLike) {
    const year = frLike[3].length === 2 ? `20${frLike[3]}` : frLike[3]
    return makeLocalDate(year, frLike[2], frLike[1], frLike[4], frLike[5])
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseSlotParts(value: string): SlotParts | null {
  const normalized = stripSlotSuffix(value)
  const localIsoParts = parseIsoWithTimezone(normalized)
  if (localIsoParts) return localIsoParts

  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?([+-])?(\d{2})?:?(\d{2})?/,
  )
  if (!match) return null

  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4],
    minute: match[5],
  }
}

function parseIsoWithTimezone(value: string): SlotParts | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})/.test(value)) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return {
    year: String(parsed.getFullYear()),
    month: pad(parsed.getMonth() + 1),
    day: pad(parsed.getDate()),
    hour: pad(parsed.getHours()),
    minute: pad(parsed.getMinutes()),
  }
}

function stripSlotSuffix(value: string): string {
  return value.replace(/_\d+$/, '')
}

function formatFrenchDate(parts: SlotParts): string {
  const date = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

interface SlotParts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function makeLocalDate(year: string, month: string, day: string, hour: string, minute: string): Date {
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  )
}

function sameMinute(left: Date, right: Date): boolean {
  return Math.abs(left.getTime() - right.getTime()) < 60_000
}

function isAfter(start: SlotParts, end: SlotParts): boolean {
  return toSortableNumber(end) > toSortableNumber(start)
}

function toSortableNumber(parts: SlotParts): number {
  return Number(`${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`)
}

function partsToLocalDate(parts: SlotParts): Date {
  return makeLocalDate(parts.year, parts.month, parts.day, parts.hour, parts.minute)
}
