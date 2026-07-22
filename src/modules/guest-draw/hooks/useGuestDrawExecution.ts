import { useCallback, useRef, useState } from 'react'
import { ApiError, apiFetch } from '../../../lib/api'
import {
  DrawConfiguration,
  DrawExecutionProgress,
  DrawExecutionResult,
  DrawGuest,
  DrawPreparationProgress,
  DrawTargetValue,
  DrawUpdatePlan,
  GuestDrawPlan,
  GuestMetadataEntry,
} from '../types'

const maximumPages = 2_000
const requestConcurrency = 4

const initialPreparationProgress: DrawPreparationProgress = {
  stage: 'idle',
  completed: 0,
  total: 0,
}

const initialExecutionProgress: DrawExecutionProgress = {
  completed: 0,
  total: 0,
}

export function useGuestDrawExecution() {
  const [plan, setPlan] = useState<GuestDrawPlan | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [preparationProgress, setPreparationProgress] = useState(initialPreparationProgress)
  const [executing, setExecuting] = useState(false)
  const [executionProgress, setExecutionProgress] = useState(initialExecutionProgress)
  const [results, setResults] = useState<DrawExecutionResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setPlan(null)
    setPreparing(false)
    setPreparationProgress(initialPreparationProgress)
    setExecuting(false)
    setExecutionProgress(initialExecutionProgress)
    setResults([])
    setError(null)
  }, [])

  const cancelPreparation = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const prepare = useCallback(
    async (params: {
      eventId: string
      eligibleGuests: DrawGuest[]
      configuration: DrawConfiguration
    }) => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      setPreparing(true)
      setPlan(null)
      setResults([])
      setError(null)
      setPreparationProgress({ stage: 'loading_guests', completed: 0, total: 0 })

      try {
        if (params.eligibleGuests.length < params.configuration.winnerCount) {
          throw new Error('La population éligible est trop petite pour ce tirage.')
        }

        const winnerIds = new Set(
          secureSample(params.eligibleGuests, params.configuration.winnerCount).map(
            (guest) => guest.id,
          ),
        )
        const allGuests = await loadAllGuests({
          eventId: params.eventId,
          targetFieldKey: params.configuration.targetFieldKey,
          signal: controller.signal,
          onProgress: (loaded) =>
            setPreparationProgress({ stage: 'loading_guests', completed: loaded, total: 0 }),
        })

        const guestsMissingMetadata = allGuests.filter((guest) => !guest.metadataIncluded)
        let detailedGuestsLoaded = 0

        if (guestsMissingMetadata.length > 0) {
          setPreparationProgress({
            stage: 'loading_details',
            completed: 0,
            total: guestsMissingMetadata.length,
          })

          const detailedGuests = await mapWithConcurrency(
            guestsMissingMetadata,
            requestConcurrency,
            async (guest) => {
              const response = await apiFetch<unknown>(
                `/events/${encodeURIComponent(params.eventId)}/guests/${encodeURIComponent(guest.id)}.json?guest_metadata=true`,
                { signal: controller.signal },
              )
              const detailedGuest = normalizeGuest(
                response,
                params.configuration.targetFieldKey,
              )
              if (!detailedGuest?.metadataIncluded) {
                throw new Error(
                  `Les métadonnées du participant ${guest.uid || guest.id} n’ont pas pu être confirmées.`,
                )
              }
              return detailedGuest
            },
            (completed) => {
              detailedGuestsLoaded = completed
              setPreparationProgress({
                stage: 'loading_details',
                completed,
                total: guestsMissingMetadata.length,
              })
            },
          )

          const detailedById = new Map(detailedGuests.map((guest) => [guest.id, guest]))
          allGuests.forEach((guest, index) => {
            const detailedGuest = detailedById.get(guest.id)
            if (detailedGuest) allGuests[index] = detailedGuest
          })
        }

        const guestsById = new Map(allGuests.map((guest) => [guest.id, guest]))
        const winners = [...winnerIds].map((id) => {
          const guest = guestsById.get(id)
          if (!guest) throw new Error(`Le participant gagnant ${id} est absent du contrôle global.`)
          return guest
        })
        const updates: DrawUpdatePlan[] = []
        const existingTrueCount = allGuests.filter((guest) => isTrueValue(guest.targetValue)).length

        allGuests.forEach((guest) => {
          const isWinner = winnerIds.has(guest.id)
          const currentlyTrue = isTrueValue(guest.targetValue)
          const targetValue: DrawTargetValue | null = isWinner
            ? 'true'
            : currentlyTrue
              ? 'false'
              : null

          if (!targetValue || valuesMatch(guest.targetValue, targetValue)) return

          updates.push({
            guest,
            currentValue: guest.targetValue,
            targetValue,
            guestMetadata: setMetadataValue(
              guest.guestMetadata,
              params.configuration.targetFieldKey,
              targetValue,
            ),
          })
        })

        const nextPlan: GuestDrawPlan = {
          winners,
          updates,
          existingTrueCount,
          totalGuestsScanned: allGuests.length,
          detailedGuestsLoaded,
        }
        setPlan(nextPlan)
        setPreparationProgress({ stage: 'ready', completed: allGuests.length, total: allGuests.length })
        return nextPlan
      } catch (err) {
        if (controller.signal.aborted) {
          setError('Préparation annulée.')
          throw err
        }
        console.error('Guest draw preparation failed', err)
        setError(formatApiError(err, 'Impossible de préparer le tirage.'))
        throw err
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
          setPreparing(false)
        }
      }
    },
    [],
  )

  const execute = useCallback(
    async (eventId: string, updates?: DrawUpdatePlan[]) => {
      const selectedUpdates = updates ?? plan?.updates ?? []
      setExecuting(true)
      setError(null)
      setExecutionProgress({ completed: 0, total: selectedUpdates.length })

      try {
        const nextResults = await mapWithConcurrency(
          selectedUpdates,
          requestConcurrency,
          async (update): Promise<DrawExecutionResult> => {
            try {
              await apiFetch<void>(
                `/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(update.guest.id)}.json`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ guest_metadata: update.guestMetadata }),
                },
              )
              return {
                guestId: update.guest.id,
                targetValue: update.targetValue,
                status: 'updated',
                error: null,
              }
            } catch (err) {
              return {
                guestId: update.guest.id,
                targetValue: update.targetValue,
                status: 'failed',
                error: formatApiError(err, 'Échec de la mise à jour.'),
              }
            }
          },
          (completed) =>
            setExecutionProgress({ completed, total: selectedUpdates.length }),
        )

        setResults((currentResults) => mergeResults(currentResults, nextResults))
        return nextResults
      } finally {
        setExecuting(false)
      }
    },
    [plan],
  )

  const retryFailed = useCallback(
    async (eventId: string) => {
      if (!plan) return []
      const failedIds = new Set(
        results.filter((result) => result.status === 'failed').map((result) => result.guestId),
      )
      return execute(
        eventId,
        plan.updates.filter((update) => failedIds.has(update.guest.id)),
      )
    },
    [execute, plan, results],
  )

  return {
    plan,
    preparing,
    preparationProgress,
    executing,
    executionProgress,
    results,
    error,
    prepare,
    execute,
    retryFailed,
    cancelPreparation,
    reset,
  }
}

async function loadAllGuests(params: {
  eventId: string
  targetFieldKey: string
  signal: AbortSignal
  onProgress: (loaded: number) => void
}): Promise<DrawGuest[]> {
  const guestsById = new Map<string, DrawGuest>()
  let page = 1

  while (page <= maximumPages) {
    const response = await apiFetch<unknown>(
      `/events/${encodeURIComponent(params.eventId)}/guests.json?page=${page}&documents=false&guest_metadata=true`,
      { signal: params.signal },
    )
    const guests = normalizeGuests(response, params.targetFieldKey)
    if (guests.length === 0) break
    guests.forEach((guest) => guestsById.set(guest.id, guest))
    params.onProgress(guestsById.size)
    page += 1
  }

  if (page > maximumPages) {
    throw new Error(`Contrôle global interrompu après ${maximumPages} pages de sécurité.`)
  }

  return [...guestsById.values()]
}

function normalizeGuests(data: unknown, targetFieldKey: string): DrawGuest[] {
  const rawGuests =
    readArray(data, ['guests', 'data', 'results']) ?? (Array.isArray(data) ? data : [])
  return rawGuests
    .map((guest) => normalizeGuest(guest, targetFieldKey))
    .filter((guest): guest is DrawGuest => guest !== null)
}

function normalizeGuest(data: unknown, targetFieldKey: string): DrawGuest | null {
  const guest = asRecord(data)
  const id = stringValue(guest._id) || stringValue(guest.id)
  if (!id) return null

  const metadataIncluded =
    Object.prototype.hasOwnProperty.call(guest, 'guest_metadata') ||
    Object.prototype.hasOwnProperty.call(guest, 'guestMetadata') ||
    Object.prototype.hasOwnProperty.call(guest, 'guest_metadata_hash') ||
    Object.prototype.hasOwnProperty.call(guest, 'guestMetadataHash')
  const guestMetadata = normalizeGuestMetadata(guest)
  const guestMetadataMap = Object.fromEntries(
    guestMetadata.map((entry) => [entry.name, entry.value]),
  )

  return {
    id,
    uid: stringValue(guest.uid),
    firstName: stringValue(guest.first_name) || stringValue(guest.firstName),
    lastName: stringValue(guest.last_name) || stringValue(guest.lastName),
    email: stringValue(guest.email),
    guestCategoryId:
      stringValue(guest.guest_category_id) || stringValue(guest.guestCategoryId),
    guestMetadata,
    guestMetadataMap,
    metadataIncluded,
    targetValue: Object.prototype.hasOwnProperty.call(guestMetadataMap, targetFieldKey)
      ? guestMetadataMap[targetFieldKey]
      : guest[targetFieldKey],
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
      if (name) entries.set(name, { name, value: metadata.value })
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

function setMetadataValue(
  metadata: GuestMetadataEntry[],
  targetFieldKey: string,
  targetValue: DrawTargetValue,
): GuestMetadataEntry[] {
  let replaced = false
  const nextMetadata = metadata.map((entry) => {
    if (entry.name !== targetFieldKey) return entry
    replaced = true
    return { ...entry, value: targetValue }
  })

  if (!replaced) nextMetadata.push({ name: targetFieldKey, value: targetValue })
  return nextMetadata
}

function secureSample<T>(items: T[], size: number): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = secureRandomInteger(index + 1)
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled.slice(0, size)
}

function secureRandomInteger(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  const range = 0x1_0000_0000
  const limit = range - (range % maxExclusive)
  const values = new Uint32Array(1)
  let value = limit

  while (value >= limit) {
    globalThis.crypto.getRandomValues(values)
    value = values[0]
  }

  return value % maxExclusive
}

function isTrueValue(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value !== 'string') return false
  return ['true', '1', 'yes', 'oui'].includes(value.trim().toLowerCase())
}

function valuesMatch(currentValue: unknown, targetValue: DrawTargetValue): boolean {
  return targetValue === 'true' ? isTrueValue(currentValue) : !isTrueValue(currentValue)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onProgress: (completed: number) => void,
): Promise<R[]> {
  if (items.length === 0) return []
  const results = new Array<R>(items.length)
  let nextIndex = 0
  let completed = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index])
      completed += 1
      onProgress(completed)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  )
  return results
}

function mergeResults(
  currentResults: DrawExecutionResult[],
  nextResults: DrawExecutionResult[],
): DrawExecutionResult[] {
  const merged = new Map(currentResults.map((result) => [result.guestId, result]))
  nextResults.forEach((result) => merged.set(result.guestId, result))
  return [...merged.values()]
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
