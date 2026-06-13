import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { ApiError, apiFetch } from '../../../lib/api'
import { ExecutionResult, MatrixRow } from '../types'
import {
  isMeetingAlreadyHandled,
  markMeetingCreated,
  markMeetingPending,
  unmarkMeetingPending,
} from '../lib/idempotency'
import { RowStatusBadge } from './ValidationStep'

interface ExecutionStepProps {
  eventId: string
  rows: MatrixRow[]
  autoStart: boolean
  onAutoStartConsumed: () => void
  onBack: () => void
}

const concurrency = 5

export default function ExecutionStep({
  eventId,
  rows,
  autoStart,
  onAutoStartConsumed,
  onBack,
}: ExecutionStepProps) {
  const readyRows = useMemo(() => rows.filter((row) => row.status === 'ready' && row.payload), [rows])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [results, setResults] = useState<ExecutionResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const autoStartLaunchedRef = useRef(false)

  async function execute() {
    if (running) return
    setRunning(true)
    setError(null)
    setDone(0)
    setResults([])

    const nextResults: ExecutionResult[] = []

    await runWithConcurrency(readyRows, concurrency, async (row) => {
      const result = await createMeeting(eventId, row)
      nextResults.push(result)
      setResults([...nextResults])
      setDone((value) => value + 1)
    })

    setRunning(false)
  }

  useEffect(() => {
    if (!autoStart) return
    if (autoStartLaunchedRef.current) return
    autoStartLaunchedRef.current = true
    onAutoStartConsumed()
    void execute()
  }, [autoStart, onAutoStartConsumed])

  const summary = results.reduce(
    (acc, result) => {
      acc[result.status] += 1
      return acc
    },
    { created: 0, failed: 0, skipped: 0 },
  )

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Exécution</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Seules les lignes prêtes sont envoyées à Eventmaker.
          </p>
        </div>
        <Button variant="ghost" disabled={running} onClick={onBack}>
          ← Retour
        </Button>
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}

      <div className="mt-6 rounded-lg border border-[#E8E4DE] p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-xs text-[#6B6B6B]">
            {done} / {readyRows.length} créés
          </span>
          <span className="text-xs text-[#6B6B6B]">
            {running ? 'Import en cours...' : results.length > 0 ? 'Import terminé' : 'En attente'}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F0EEE9]">
          <div
            className="h-full bg-[#0066FF] transition-all"
            style={{ width: `${readyRows.length ? (done / readyRows.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="font-mono text-xs text-[#6B6B6B]">
              {summary.created} créés · {summary.failed} échoués · {summary.skipped} ignorés
            </p>
            <Button variant="ghost" onClick={() => downloadReport(results)}>
              Télécharger le rapport
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
                  <th className="py-3 pr-3">Ligne</th>
                  <th className="py-3 pr-3">Validation</th>
                  <th className="py-3 pr-3">Exécution</th>
                  <th className="py-3 pr-3">Meeting ID</th>
                  <th className="py-3 pr-3">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.row.rowIndex} className="border-b border-[#F0EEE9]">
                    <td className="py-3 pr-3 font-mono text-[#B0ADA8]">{result.row.rowIndex}</td>
                    <td className="py-3 pr-3">
                      <RowStatusBadge status={result.row.status} />
                    </td>
                    <td className="py-3 pr-3">
                      <ExecutionBadge status={result.status} />
                    </td>
                    <td className="py-3 pr-3 font-mono text-[#6B6B6B]">{result.meetingId ?? '-'}</td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">{result.error ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

async function createMeeting(eventId: string, row: MatrixRow): Promise<ExecutionResult> {
  if (!row.payload || !row.idempotencyKey) {
    return { row, status: 'skipped', meetingId: null, error: 'Ligne non importable' }
  }

  if (isMeetingAlreadyHandled(row.idempotencyKey)) {
    return {
      row,
      status: 'skipped',
      meetingId: null,
      error: 'Déjà traité dans cette session',
    }
  }

  try {
    markMeetingPending(row.idempotencyKey)
    console.info('Creating Eventmaker meeting', {
      rowIndex: row.rowIndex,
      url: `/events/${encodeURIComponent(eventId)}/meetings/book_by_organizer.json?locale=fr`,
      payload: row.payload,
    })
    const response = await postWithRetry<{ id?: string }>(
      `/events/${encodeURIComponent(eventId)}/meetings/book_by_organizer.json?locale=fr`,
      row.payload,
    )
    markMeetingCreated(row.idempotencyKey)
    return {
      row,
      status: 'created',
      meetingId: response.id ?? null,
      error: null,
    }
  } catch (err) {
    unmarkMeetingPending(row.idempotencyKey)
    console.error('Eventmaker meeting creation failed', {
      rowIndex: row.rowIndex,
      payload: row.payload,
      error: err,
    })
    return {
      row,
      status: 'failed',
      meetingId: null,
      error: formatExecutionError(err),
    }
  }
}

function formatExecutionError(err: unknown): string {
  if (err instanceof ApiError) {
    const status = err.details?.status ? ` ${err.details.status}` : ''
    const body = err.details?.bodyPreview ? ` · ${err.details.bodyPreview}` : ''
    return `${err.message}${status}${body}`
  }

  return err instanceof Error ? err.message : 'Erreur inconnue'
}

async function postWithRetry<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const status = err instanceof ApiError ? err.details?.status : undefined
    const retryAfter = err instanceof ApiError ? err.details?.retryAfter : null
    const shouldRetry = status === 429 || (status !== undefined && status >= 500)

    if (!shouldRetry || attempt >= 2) throw err

    await wait(getRetryDelay(retryAfter, attempt))
    return postWithRetry<T>(path, body, attempt + 1)
  }
}

function getRetryDelay(retryAfter: string | null | undefined, attempt: number): number {
  const parsed = retryAfter ? Number(retryAfter) : NaN
  if (Number.isFinite(parsed)) return parsed * 1000
  return 750 * (attempt + 1)
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  })

  await Promise.all(workers)
}

function ExecutionBadge({ status }: { status: ExecutionResult['status'] }) {
  const classes = {
    created: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    skipped: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${classes[status]}`}>{status}</span>
}

function downloadReport(results: ExecutionResult[]) {
  const rows = results.map((result) => ({
    ligne: result.row.rowIndex,
    validation_status: result.row.status,
    execution_status: result.status,
    meeting_id: result.meetingId ?? '',
    error: result.error ?? '',
    payload: result.row.payload ? JSON.stringify(result.row.payload) : '',
    idempotency_key: result.row.idempotencyKey ?? '',
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Rapport')
  XLSX.writeFile(workbook, 'meetings-import-report.xlsx')
}
