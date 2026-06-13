import { useMemo, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { Dialog, DialogContent } from '../../../components/ui/Dialog'
import { EventmakerLocation, EventmakerSlot, MatrixRow } from '../types'
import { formatSlot } from '../lib/slots'

type Filter = 'all' | 'ready' | 'error' | 'duplicate'

interface ValidationStepProps {
  rows: MatrixRow[]
  slots: EventmakerSlot[]
  locations: EventmakerLocation[]
  loading: boolean
  error: string | null
  onBack: () => void
  onExecute: () => void
}

const pageSize = 50

export default function ValidationStep({
  rows,
  slots,
  locations,
  loading,
  error,
  onBack,
  onExecute,
}: ValidationStepProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const slotLabelById = useMemo(() => new Map(slots.map((slot) => [slot.id, formatSlot(slot)])), [slots])
  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  )

  const summary = summarizeRows(rows)
  const filteredRows = rows.filter((row) => filter === 'all' || row.status === filter)
  const visibleRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)
  const readyCount = summary.ready

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Validation dry-run</h1>
          <p className="mt-2 font-mono text-xs text-[#6B6B6B]">
            {summary.ready} prêts · {summary.error} erreurs · {summary.duplicate} doublons
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B6B6B]">
            Le dry-run vérifie les guests, le mapping créneau/lieu et les doublons du fichier ou de
            cette session. Il ne vérifie pas encore les rendez-vous déjà existants sur Eventmaker.
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}
      {loading && <div className="mt-6 h-32 animate-pulse rounded-lg bg-[#F0EEE9]" />}

      {!loading && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(['all', 'ready', 'error', 'duplicate'] as Filter[]).map((item) => (
              <button
                key={item}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filter === item
                    ? 'border-[#0066FF] bg-[#0066FF] text-white'
                    : 'border-[#E0DDD8] bg-white text-[#6B6B6B]'
                }`}
                onClick={() => {
                  setFilter(item)
                  setPage(0)
                }}
                type="button"
              >
                {item === 'all' ? 'Tous' : item}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
                  <th className="py-3 pr-3">Ligne</th>
                  <th className="py-3 pr-3">Guest 1</th>
                  <th className="py-3 pr-3">Guest 2</th>
                  <th className="py-3 pr-3">Créneau</th>
                  <th className="py-3 pr-3">Lieu</th>
                  <th className="py-3 pr-3">Statut</th>
                  <th className="py-3 pr-3">Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.rowIndex} className="border-b border-[#F0EEE9]">
                    <td className="py-3 pr-3 font-mono text-[#B0ADA8]">{row.rowIndex}</td>
                    <td className="py-3 pr-3">{formatGuest(row.guest1, row.guest1Uid)}</td>
                    <td className="py-3 pr-3">{formatGuest(row.guest2, row.guest2Uid)}</td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">
                      {row.slotId ? slotLabelById.get(row.slotId) : row.slotSource || '-'}
                    </td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">
                      {row.locationId ? locationNameById.get(row.locationId) : row.locationSource || '-'}
                    </td>
                    <td className="py-3 pr-3">
                      <RowStatusBadge status={row.status} />
                    </td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">{row.errors.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <span className="text-xs text-[#6B6B6B]">
              Page {page + 1} / {Math.max(Math.ceil(filteredRows.length / pageSize), 1)}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                Précédent
              </Button>
              <Button
                variant="ghost"
                disabled={(page + 1) * pageSize >= filteredRows.length}
                onClick={() => setPage((value) => value + 1)}
              >
                Suivant
              </Button>
              <Button disabled={readyCount === 0} onClick={() => setConfirmOpen(true)}>
                Importer {readyCount} rendez-vous
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onInteractOutside={() => setConfirmOpen(false)}>
          <div className="p-5">
            <h2 className="text-lg font-medium text-[#1A1A1A]">Confirmation requise</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
              Vous allez créer {readyCount} rendez-vous. Cette action est irréversible.
            </p>
            {(summary.error > 0 || summary.duplicate > 0) && (
              <p className="mt-3 rounded-lg border border-[#E8E4DE] bg-[#F8F7F4] px-3 py-2 text-xs leading-5 text-[#6B6B6B]">
                {summary.error} lignes en erreur et {summary.duplicate} doublons seront ignorés.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  setConfirmOpen(false)
                  onExecute()
                }}
              >
                Confirmer et importer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function summarizeRows(rows: MatrixRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { ready: 0, error: 0, duplicate: 0, warning: 0 },
  )
}

export function RowStatusBadge({ status }: { status: MatrixRow['status'] }) {
  const classes = {
    ready: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    duplicate: 'bg-orange-50 text-orange-700 border-orange-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  }

  return <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${classes[status]}`}>{status}</span>
}

function formatGuest(guest: MatrixRow['guest1'], uid: string) {
  if (!guest) return <span className="font-mono text-[11px] text-red-700">{uid || '-'}</span>
  return (
    <span>
      <span className="block text-[#1A1A1A]">
        {guest.first_name} {guest.last_name}
      </span>
      <span className="font-mono text-[10px] text-[#B0ADA8]">{guest.uid || guest.id}</span>
    </span>
  )
}
