import { useCallback, useRef, useState } from 'react'
import { ApiError, apiFetch } from '../../../lib/api'
import {
  DrawConfiguration,
  DrawGuest,
  GuestMetadataEntry,
  GuestPopulationResult,
  PopulationProgress,
} from '../types'

const maximumPages = 2_000

export function useGuestPopulation() {
  const [result, setResult] = useState<GuestPopulationResult | null>(null)
  const [progress, setProgress] = useState<PopulationProgress>({ page: 0, loaded: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setResult(null)
    setProgress({ page: 0, loaded: 0 })
    setLoading(false)
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const loadPopulation = useCallback(
    async (params: {
      eventId: string
      configuration: DrawConfiguration
      expectedSegmentCount?: number | null
    }) => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      setLoading(true)
      setError(null)
      setResult(null)
      setProgress({ page: 0, loaded: 0 })

      const guestsById = new Map<string, DrawGuest>()
      let page = 1

      try {
        while (page <= maximumPages) {
          const response = await apiFetch<unknown>(
            buildGuestListPath(params.eventId, page, params.configuration),
            { signal: controller.signal },
          )
          const pageGuests = normalizeGuests(response)

          if (pageGuests.length === 0) break

          pageGuests.forEach((guest) => guestsById.set(guest.id, guest))
          setProgress({ page, loaded: guestsById.size })
          page += 1
        }

        if (page > maximumPages) {
          throw new Error(`Pagination interrompue après ${maximumPages} pages de sécurité.`)
        }

        const guests = [...guestsById.values()]
        const guestsWithMetadata = guests.filter(
          (guest) => Object.keys(guest.guestMetadataMap).length > 0,
        ).length
        const warnings: string[] = []
        let segmentFilterVerified = params.configuration.mode !== 'segment'

        if (params.configuration.mode === 'segment') {
          const expectedCount = params.expectedSegmentCount
          if (expectedCount === null || expectedCount === undefined) {
            warnings.push(
              'Le segment ne fournit pas de compteur permettant de confirmer automatiquement le filtrage. Vérifiez l’échantillon avant de poursuivre.',
            )
          } else if (expectedCount !== guests.length) {
            warnings.push(
              `Le segment annonce ${expectedCount} participant(s), mais l’API en a retourné ${guests.length}. Le filtre segment doit être vérifié avant toute écriture.`,
            )
          } else {
            segmentFilterVerified = true
          }
        }

        if (guests.length > 0 && guestsWithMetadata === 0) {
          warnings.push(
            'Aucune guest_metadata n’est présente dans la liste paginée. Une lecture détaillée des participants sera nécessaire avant la phase de mise à jour.',
          )
        }

        const nextResult: GuestPopulationResult = {
          guests,
          pagesLoaded: Math.max(page - 1, 0),
          guestsWithMetadata,
          warnings,
          segmentFilterVerified,
        }

        setResult(nextResult)
        return nextResult
      } catch (err) {
        if (controller.signal.aborted) {
          setError('Chargement annulé.')
          throw err
        }

        console.error('Guest draw population loading failed', {
          eventId: params.eventId,
          configuration: params.configuration,
          page,
          error: err,
        })
        const message = formatApiError(err, 'Impossible de charger les participants.')
        setError(message)
        throw err
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
          setLoading(false)
        }
      }
    },
    [],
  )

  return {
    result,
    progress,
    loading,
    error,
    loadPopulation,
    cancel,
    reset,
  }
}

function buildGuestListPath(
  eventId: string,
  page: number,
  configuration: DrawConfiguration,
): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('documents', 'false')
  params.set('guest_metadata', 'true')

  if (configuration.mode === 'categories') {
    configuration.categoryIds.forEach((categoryId) => {
      params.append('category[]', categoryId)
    })
  } else if (configuration.segmentId) {
    // Cette convention n'est pas documentée publiquement par Eventmaker.
    // Elle reste volontairement isolée ici pour pouvoir être ajustée sans toucher au workflow.
    params.set('saved_search_id', configuration.segmentId)
  }

  return `/events/${encodeURIComponent(eventId)}/guests.json?${params.toString()}`
}

function normalizeGuests(data: unknown): DrawGuest[] {
  const rawGuests =
    readArray(data, ['guests', 'data', 'results']) ?? (Array.isArray(data) ? data : [])

  return rawGuests
    .map((item) => normalizeGuest(item))
    .filter((guest): guest is DrawGuest => guest !== null)
}

function normalizeGuest(data: unknown): DrawGuest | null {
  const guest = asRecord(data)
  const id = stringValue(guest._id) || stringValue(guest.id)

  if (!id) {
    console.warn('Guest draw participant has no usable id', { guest })
    return null
  }

  const guestMetadata = normalizeGuestMetadata(guest)

  return {
    id,
    uid: stringValue(guest.uid),
    firstName: stringValue(guest.first_name) || stringValue(guest.firstName),
    lastName: stringValue(guest.last_name) || stringValue(guest.lastName),
    email: stringValue(guest.email),
    guestCategoryId:
      stringValue(guest.guest_category_id) || stringValue(guest.guestCategoryId),
    guestMetadata,
    guestMetadataMap: Object.fromEntries(
      guestMetadata.map((entry) => [entry.name, entry.value]),
    ),
  }
}

function normalizeGuestMetadata(guest: Record<string, unknown>): GuestMetadataEntry[] {
  const entries = new Map<string, GuestMetadataEntry>()
  const rawMetadata = guest.guest_metadata ?? guest.guestMetadata

  if (Array.isArray(rawMetadata)) {
    rawMetadata.forEach((item) => {
      const metadata = asRecord(item)
      const name =
        stringValue(metadata.name) ||
        stringValue(metadata.key) ||
        stringValue(metadata.field)
      if (!name) return
      entries.set(name, { name, value: metadata.value })
    })
  } else {
    Object.entries(asRecord(rawMetadata)).forEach(([name, value]) => {
      entries.set(name, { name, value })
    })
  }

  const metadataHash = asRecord(guest.guest_metadata_hash ?? guest.guestMetadataHash)
  Object.entries(metadataHash).forEach(([name, value]) => {
    entries.set(name, { name, value })
  })

  return [...entries.values()]
}

function readArray(data: unknown, keys: string[]): unknown[] | null {
  const object = asRecord(data)
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as unknown[]
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

function formatApiError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : fallback

  const status = error.details?.status ? `HTTP ${error.details.status}` : 'Erreur API'
  const body = error.details?.bodyPreview ? ` — ${error.details.bodyPreview}` : ''
  return `${status}${body}`
}
