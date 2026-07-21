export type PopulationMode = 'categories' | 'segment'

export interface GuestDrawEvent {
  id: string
  name: string
  guestCount: number | null
}

export interface GuestCategory {
  id: string
  name: string
}

export interface GuestSegment {
  id: string
  name: string
  searchQuery: string
  guestCount: number | null
}

export type GuestFieldStorage = 'native' | 'guest_metadata'

export interface GuestFieldDefinition {
  key: string
  label: string
  type: string
  storage: GuestFieldStorage
  booleanLike: boolean
}

export interface GuestDrawEventData {
  event: GuestDrawEvent
  categories: GuestCategory[]
  segments: GuestSegment[]
  fields: GuestFieldDefinition[]
}

export interface GuestMetadataEntry {
  name: string
  value: unknown
}

export interface DrawGuest {
  id: string
  uid: string
  firstName: string
  lastName: string
  email: string
  guestCategoryId: string
  guestMetadata: GuestMetadataEntry[]
  guestMetadataMap: Record<string, unknown>
  targetValue: unknown
}

export interface DrawConfiguration {
  mode: PopulationMode
  categoryIds: string[]
  segmentId: string
  targetFieldKey: string
  winnerCount: number
}

export interface PopulationProgress {
  page: number
  loaded: number
}

export interface GuestPopulationResult {
  guests: DrawGuest[]
  pagesLoaded: number
  guestsWithMetadata: number
  warnings: string[]
  segmentFilterVerified: boolean
}
