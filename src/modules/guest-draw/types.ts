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
  hasAvailableValues: boolean
  allowMultipleValues: boolean
  textLike: boolean
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
  metadataIncluded: boolean
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

export type DrawTargetValue = 'true' | 'false'

export interface DrawUpdatePlan {
  guest: DrawGuest
  currentValue: unknown
  targetValue: DrawTargetValue
  guestMetadata: GuestMetadataEntry[]
}

export interface GuestDrawPlan {
  winners: DrawGuest[]
  updates: DrawUpdatePlan[]
  existingTrueCount: number
  totalGuestsScanned: number
  detailedGuestsLoaded: number
}

export interface DrawPreparationProgress {
  stage: 'idle' | 'loading_guests' | 'loading_details' | 'ready'
  completed: number
  total: number
}

export type DrawExecutionStatus = 'updated' | 'failed'

export interface DrawExecutionResult {
  guestId: string
  targetValue: DrawTargetValue
  status: DrawExecutionStatus
  error: string | null
}

export interface DrawExecutionProgress {
  completed: number
  total: number
}
