import { useMemo, useState } from 'react'
import writeXlsxFile, { Row } from 'write-excel-file/browser'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { Dialog, DialogContent } from '../../../components/ui/Dialog'
import { ApiError, apiFetch } from '../../../lib/api'
import { buildCampaignPayload, buildSegmentPayload } from '../lib/buildCampaignPayload'
import { CampaignMatrixRow, ExecutionResult } from '../types'

interface ExecutionStepProps {
  eventId: string
  rows: CampaignMatrixRow[]
  onBack: () => void
  onComplete: () => void
}

const concurrency = 3

export default function ExecutionStep({ eventId, rows, onBack, onComplete }: ExecutionStepProps) {
  const executableRows = useMemo(
    () => rows.filter((row) => (row.status === 'ready' || row.status === 'segment_exists') && row.scheduledAt),
    [rows],
  )
  const [confirmOpen, setConfirmOpen] = useState(true)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [results, setResults] = useState<ExecutionResult[]>([])
  const [error, setError] = useState<string | null>(null)

  async function execute() {
    if (running) return
    setConfirmOpen(false)
    setRunning(true)
    setError(null)
    setDone(0)
    setResults([])

    const nextResults: ExecutionResult[] = []
    const segmentIdsByName = new Map(
      rows
        .filter((row) => row.segmentId)
        .map((row) => [row.segmentName, row.segmentId as string]),
    )

    await runWithConcurrency(executableRows, concurrency, async (row) => {
      const result = await createCampaignFlow(eventId, row, segmentIdsByName)
      if (result.segmentId) segmentIdsByName.set(row.segmentName, result.segmentId)
      nextResults.push(result)
      setResults([...nextResults])
      setDone((value) => value + 1)
    })

    if (nextResults.some((result) => result.status === 'created')) {
      onComplete()
    }
    setRunning(false)
  }

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
            Les campagnes sont créées puis livrées immédiatement.
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
            {done} / {executableRows.length} campagnes créées
          </span>
          <span className="text-xs text-[#6B6B6B]">
            {running ? 'Création en cours...' : results.length > 0 ? 'Création terminée' : 'En attente'}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F0EEE9]">
          <div
            className="h-full bg-[#B74A20] transition-all"
            style={{ width: `${executableRows.length ? (done / executableRows.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="font-mono text-xs text-[#6B6B6B]">
              {summary.created} créées · {summary.failed} échouées · {summary.skipped} ignorées
            </p>
            <Button variant="ghost" onClick={() => void downloadReport(results)}>
              Télécharger le rapport
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
                  <th className="py-3 pr-3">Session</th>
                  <th className="py-3 pr-3">Segment ID</th>
                  <th className="py-3 pr-3">Campagne ID</th>
                  <th className="py-3 pr-3">Heure planifiée</th>
                  <th className="py-3 pr-3">Statut</th>
                  <th className="py-3 pr-3">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.session._id} className="border-b border-[#F0EEE9]">
                    <td className="py-3 pr-3 text-[#1A1A1A]">{result.session.name}</td>
                    <td className="py-3 pr-3 font-mono text-[#6B6B6B]">{result.segmentId ?? '-'}</td>
                    <td className="py-3 pr-3 font-mono text-[#6B6B6B]">{result.campaignId ?? '-'}</td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">
                      {result.scheduledAt ? formatDate(result.scheduledAt) : '-'}
                    </td>
                    <td className="py-3 pr-3">
                      <ExecutionBadge status={result.status} />
                    </td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">{result.error ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onInteractOutside={() => setConfirmOpen(false)}>
          <div className="p-5">
            <h2 className="text-lg font-medium text-[#1A1A1A]">Confirmation requise</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
              Vous allez créer {executableRows.length} campagnes et les livrer immédiatement. Cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => void execute()}>Confirmer et lancer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

async function createCampaignFlow(
  eventId: string,
  row: CampaignMatrixRow,
  segmentIdsByName: Map<string, string>,
): Promise<ExecutionResult> {
  if (!row.scheduledAt || !row.resolvedMessage || !row.resolvedTitle) {
    return {
      session: row.session,
      segmentId: null,
      campaignId: null,
      status: 'skipped',
      error: 'Ligne non executable',
      scheduledAt: row.scheduledAt,
    }
  }

  try {
    const segmentId =
      segmentIdsByName.get(row.segmentName) ?? (await createSegment(eventId, row))
    if (!segmentId) {
      return {
        session: row.session,
        segmentId: null,
        campaignId: null,
        status: 'failed',
        error: 'Création du segment impossible',
        scheduledAt: row.scheduledAt,
      }
    }

    const campaignPayload = buildCampaignPayload({
      session: row.session,
      segmentId,
      scheduledAt: row.scheduledAt,
      messageContent: row.resolvedMessage,
      notificationTitle: row.resolvedTitle,
    })
    const campaign = await apiFetch<unknown>(
      `/events/${encodeURIComponent(eventId)}/guest_campaigns.json?locale=fr`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload),
      },
    )
    const campaignRecord = asRecord(campaign)
    const campaignId = stringValue(campaignRecord._id) || stringValue(campaignRecord.id)
    const status = stringValue(campaignRecord.status)

    if (!campaignId) {
      throw new Error('Campagne créée sans identifiant exploitable')
    }

    if (status === 'draft') {
      await apiFetch<unknown>(
        `/events/${encodeURIComponent(eventId)}/guest_campaigns/${encodeURIComponent(campaignId)}/deliver.json?locale=fr`,
      )
    }

    return {
      session: row.session,
      segmentId,
      campaignId,
      status: 'created',
      error: null,
      scheduledAt: row.scheduledAt,
    }
  } catch (err) {
    console.error('Campaign creation failed', {
      sessionId: row.session._id,
      sessionName: row.session.name,
      error: err,
    })
    return {
      session: row.session,
      segmentId: segmentIdsByName.get(row.segmentName) ?? row.segmentId,
      campaignId: null,
      status: 'failed',
      error: formatExecutionError(err),
      scheduledAt: row.scheduledAt,
    }
  }
}

async function createSegment(eventId: string, row: CampaignMatrixRow): Promise<string | null> {
  const response = await apiFetch<unknown>(
    `/fr/events/${encodeURIComponent(eventId)}/saved_searches.json?locale=fr`,
    {
      apiBase: 'app',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSegmentPayload(row.session, row.segmentName)),
    },
  )
  const record = asRecord(response)
  return stringValue(record._id) || stringValue(record.id) || null
}

function formatExecutionError(err: unknown): string {
  if (err instanceof ApiError) {
    const status = err.details?.status ? ` ${err.details.status}` : ''
    const body = err.details?.bodyPreview ? ` · ${err.details.bodyPreview}` : ''
    return `${err.message}${status}${body}`
  }

  return err instanceof Error ? err.message : 'Erreur inconnue'
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

async function downloadReport(results: ExecutionResult[]) {
  const rows = results.map((result) => ({
    session: result.session.name,
    session_id: result.session._id,
    segment_id: result.segmentId ?? '',
    campaign_id: result.campaignId ?? '',
    scheduled_at: result.scheduledAt ?? '',
    status: result.status,
    error: result.error ?? '',
  }))
  const headers = ['session', 'session_id', 'segment_id', 'campaign_id', 'scheduled_at', 'status', 'error'] as const
  const sheet: Row[] = [
    headers.map((header) => ({ value: header, fontWeight: 'bold' })),
    ...rows.map((row) => headers.map((header) => row[header])),
  ]

  await writeXlsxFile(sheet, { sheet: 'Rapport' }).toFile('campaign-creator-report.xlsx')
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
