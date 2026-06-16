import {
  ColumnMapping,
  EventmakerLocation,
  EventmakerSlot,
  GuestResolution,
  MappingEntry,
  MatrixRow,
} from '../types'
import { buildIdempotencyKey, getCreatedMeetingKeys } from './idempotency'
import { buildMeetingPayload } from './buildPayload'
import { buildSlotSource } from './slots'

interface BuildMatrixParams {
  eventId: string
  rows: Record<string, string>[]
  columnMapping: ColumnMapping
  guestResolutions: Map<string, GuestResolution>
  slotMappings: MappingEntry<EventmakerSlot>[]
  locationMappings: MappingEntry<EventmakerLocation>[]
  skipNotifications: boolean
}

export function buildMatrix(params: BuildMatrixParams): MatrixRow[] {
  const slotBySource = new Map(
    params.slotMappings.map((entry) => [entry.sourceLabel, entry.target?.id ?? null]),
  )
  const locationBySource = new Map(
    params.locationMappings.map((entry) => [entry.sourceLabel, entry.target?.id ?? null]),
  )
  const seenInFile = new Set<string>()
  const createdKeys = getCreatedMeetingKeys()

  return params.rows.map((raw, index) => {
    const errors: string[] = []
    const guest1Uid = raw[params.columnMapping.guest1Uid]?.trim() ?? ''
    const guest2Uid = raw[params.columnMapping.guest2Uid]?.trim() ?? ''
    const slotSource = buildSlotSource(raw, params.columnMapping)
    const locationSource = raw[params.columnMapping.location]?.trim() ?? ''

    const guest1Resolution = resolveGuest(guest1Uid, params.guestResolutions, 'Guest 1', errors)
    const guest2Resolution = resolveGuest(guest2Uid, params.guestResolutions, 'Guest 2', errors)
    const slotId = slotBySource.get(slotSource) ?? null
    const locationId = locationBySource.get(locationSource) ?? null

    if (!slotSource || !slotId) errors.push('Créneau non résolu')
    if (!locationSource || !locationId) {
      errors.push('Lieu non résolu ou id Eventmaker manquant')
    }
    if (guest1Resolution?.id && guest1Resolution.id === guest2Resolution?.id) {
      errors.push('Les deux guests sont identiques')
    }

    let idempotencyKey: string | null = null
    if (guest1Resolution && guest2Resolution && slotId && locationId) {
      idempotencyKey = buildIdempotencyKey({
        eventId: params.eventId,
        guestIds: [guest1Resolution.id, guest2Resolution.id],
        slotId,
        locationId,
      })
    }

    let status: MatrixRow['status'] = errors.length > 0 ? 'error' : 'ready'
    if (idempotencyKey && seenInFile.has(idempotencyKey)) {
      status = 'duplicate'
      errors.push('Doublon dans le fichier')
    } else if (idempotencyKey && createdKeys.has(idempotencyKey)) {
      status = 'duplicate'
      errors.push('Déjà créé dans cette session')
    }

    if (idempotencyKey) seenInFile.add(idempotencyKey)

    return {
      rowIndex: index + 2,
      raw,
      guest1Uid,
      guest2Uid,
      slotSource,
      locationSource,
      guest1: guest1Resolution,
      guest2: guest2Resolution,
      slotId,
      locationId,
      status,
      errors,
      payload:
        status === 'ready' && guest1Resolution && guest2Resolution && slotId && locationId
          ? buildMeetingPayload({
              guestIds: [guest1Resolution.id, guest2Resolution.id],
              slotId,
              locationId,
              skipNotifications: params.skipNotifications,
            })
          : null,
      idempotencyKey,
    }
  })
}

function resolveGuest(
  uid: string,
  resolutions: Map<string, GuestResolution>,
  label: string,
  errors: string[],
) {
  if (!uid) {
    errors.push(`${label} UID manquant`)
    return null
  }

  const resolution = resolutions.get(uid)
  if (!resolution || resolution.status === 'not_found') {
    errors.push(`${label} introuvable${resolution?.error ? ` (${resolution.error})` : ''}`)
    return null
  }

  if (resolution.status === 'ambiguous') {
    errors.push(`${label} ambigu : plusieurs guests retournés pour l’UID ${uid}`)
    return null
  }

  if (resolution.status === 'error') {
    errors.push(`${label} erreur API${resolution.error ? ` (${resolution.error})` : ''}`)
    return null
  }

  return resolution.guest
}
