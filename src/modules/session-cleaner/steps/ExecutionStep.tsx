import { useMemo, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { Dialog, DialogContent } from '../../../components/ui/Dialog'
import { ApiError, apiFetch } from '../../../lib/api'
import { EventmakerAccesspointSession, ExecutionResult } from '../types'

interface ExecutionStepProps {
  eventId: string
  sessions: EventmakerAccesspointSession[]
  onBack: () => void
  onComplete: () => void
}

const concurrency = 3

export default function ExecutionStep({ eventId, sessions, onBack, onComplete }: ExecutionStepProps) {
  const executableSessions = useMemo(() => sessions.filter((session) => session._id), [sessions])
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

    try {
      await runWithConcurrency(executableSessions, concurrency, async (session) => {
        const result = await deleteSession(eventId, session)
        nextResults.push(result)
        setResults([...nextResults])
        setDone((value) => value + 1)
      })

      if (nextResults.some((result) => result.status === 'deleted')) {
        onComplete()
      }
    } catch (err) {
      console.error('Session cleaner execution failed', err)
      setError(err instanceof Error ? err.message : 'Suppression interrompue.')
    } finally {
      setRunning(false)
    }
  }

  const summary = results.reduce(
    (acc, result) => {
      acc[result.status] += 1
      return acc
    },
    { deleted: 0, failed: 0, skipped: 0 },
  )

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Suppression</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Les accesspoints session sont supprimés un par un depuis Eventmaker.
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
            {done} / {executableSessions.length} sessions supprimées
          </span>
          <span className="text-xs text-[#6B6B6B]">
            {running ? 'Suppression en cours...' : results.length > 0 ? 'Suppression terminée' : 'En attente'}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F0EEE9]">
          <div
            className="h-full bg-[#B91C1C] transition-all"
            style={{ width: `${executableSessions.length ? (done / executableSessions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {results.length > 0 && (
        <>
          <p className="mt-6 font-mono text-xs text-[#6B6B6B]">
            {summary.deleted} supprimées · {summary.failed} échouées · {summary.skipped} ignorées
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
                  <th className="py-3 pr-3">Session</th>
                  <th className="py-3 pr-3">Accesspoint ID</th>
                  <th className="py-3 pr-3">Statut</th>
                  <th className="py-3 pr-3">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.session._id} className="border-b border-[#F0EEE9]">
                    <td className="py-3 pr-3 text-[#1A1A1A]">{result.session.name || '-'}</td>
                    <td className="py-3 pr-3 font-mono text-[#6B6B6B]">{result.session._id}</td>
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
              Vous allez supprimer {executableSessions.length} sessions de l’événement {eventId}. Cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => void execute()}>Confirmer et supprimer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

async function deleteSession(
  eventId: string,
  session: EventmakerAccesspointSession,
): Promise<ExecutionResult> {
  if (!session._id) {
    return {
      session,
      status: 'skipped',
      error: 'Session sans identifiant exploitable',
    }
  }

  try {
    await apiFetch<unknown>(
      `/events/${encodeURIComponent(eventId)}/accesspoints/${encodeURIComponent(session._id)}.json`,
      {
        method: 'DELETE',
      },
    )

    return {
      session,
      status: 'deleted',
      error: null,
    }
  } catch (err) {
    console.error('Session deletion failed', {
      eventId,
      accesspointId: session._id,
      sessionName: session.name,
      error: err,
    })
    return {
      session,
      status: 'failed',
      error: formatExecutionError(err),
    }
  }
}

function formatExecutionError(err: unknown): string {
  if (err instanceof ApiError) {
    const status = err.details?.status ? ` ${err.details.status}` : ''
    const url = err.details?.url ? ` · ${err.details.url}` : ''
    const body = err.details?.bodyPreview ? ` · ${err.details.bodyPreview}` : ''
    return `${err.message}${status}${url}${body}`
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
    deleted: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    skipped: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${classes[status]}`}>{status}</span>
}
