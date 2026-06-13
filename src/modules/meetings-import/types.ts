export type MappingStatus = 'auto' | 'manual' | 'unresolved'

export interface MappingEntry<T> {
  sourceLabel: string
  target: T | null
  status: MappingStatus
}

export interface ColumnMapping {
  guest1Uid: string
  guest2Uid: string
  slot?: string
  slotDate?: string
  slotTime?: string
  location: string
}

export type RowStatus = 'ready' | 'error' | 'duplicate' | 'warning'

export interface MatrixRow {
  rowIndex: number
  raw: Record<string, string>
  guest1Uid: string
  guest2Uid: string
  slotSource: string
  locationSource: string
  guest1: ResolvedGuest | null
  guest2: ResolvedGuest | null
  slotId: string | null
  locationId: string | null
  status: RowStatus
  errors: string[]
  payload: MeetingPayload | null
  idempotencyKey: string | null
}

export interface MeetingPayload {
  guest_ids: [string, string]
  description: string | null
  slot_id: string
  type: 'physical' | 'virtual'
  location_id: string
  skip_notifications: boolean
  auto_confirm: boolean
}

export interface ResolvedGuest {
  id: string
  uid: string
  first_name: string
  last_name: string
}

export interface GuestResolution {
  uid: string
  guest: ResolvedGuest | null
  status: 'resolved' | 'not_found' | 'ambiguous' | 'error'
  error?: string
}

export interface EventmakerSlot {
  id: string
  label: string
  starts_at: string
  ends_at: string
}

export interface EventmakerLocation {
  id: string
  name: string
}

export interface EventmakerEvent {
  id: string
  name?: string
  title?: string
  meeting_locations?: EventmakerLocation[]
}

export interface ParsedExcel {
  headers: string[]
  rows: Record<string, string>[]
}

export interface ExecutionResult {
  row: MatrixRow
  status: 'created' | 'failed' | 'skipped'
  meetingId: string | null
  error: string | null
}
