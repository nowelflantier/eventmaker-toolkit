import { useMemo, useState } from 'react'
import Button from '../../../components/ui/Button'
import { CampaignMatrixRow } from '../types'

type Filter = 'all' | 'ready' | 'warning' | 'error'

interface PreviewStepProps {
  rows: CampaignMatrixRow[]
  onBack: () => void
  onExecute: () => void
}

export default function PreviewStep({ rows, onBack, onExecute }: PreviewStepProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const summary = summarizeRows(rows)
  const executableCount = summary.ready + summary.segment_exists
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (filter === 'all') return true
        if (filter === 'warning') return row.status === 'segment_exists'
        return row.status === filter
      }),
    [filter, rows],
  )

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Prévisualisation dry-run</h1>
          <p className="mt-2 font-mono text-xs text-[#6B6B6B]">
            {summary.ready} prêtes · {summary.segment_exists} avertissements · {summary.error} erreurs
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['all', 'ready', 'warning', 'error'] as Filter[]).map((item) => (
          <button
            key={item}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === item
                ? 'border-[#B74A20] bg-[#B74A20] text-white'
                : 'border-[#E0DDD8] bg-white text-[#6B6B6B]'
            }`}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item === 'all' ? 'Toutes' : item === 'ready' ? 'Prêtes' : item === 'warning' ? 'Avertissements' : 'Erreurs'}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
              <th className="py-3 pr-3">Session</th>
              <th className="py-3 pr-3">Date</th>
              <th className="py-3 pr-3">Heure notif calculée</th>
              <th className="py-3 pr-3">Segment</th>
              <th className="py-3 pr-3">Message résolu</th>
              <th className="py-3 pr-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.session._id} className="border-b border-[#F0EEE9]">
                <td className="py-3 pr-3 text-[#1A1A1A]">{row.session.name}</td>
                <td className="py-3 pr-3 text-[#6B6B6B]">
                  {row.session.start_date_to_timezone || formatDate(row.session.start_date)}
                </td>
                <td className="py-3 pr-3 font-mono text-[11px] text-[#6B6B6B]">
                  {row.scheduledAt ? formatDate(row.scheduledAt) : '-'}
                </td>
                <td className="py-3 pr-3 text-[#6B6B6B]">{row.segmentName}</td>
                <td className="max-w-[260px] truncate py-3 pr-3 text-[#6B6B6B]" title={row.resolvedMessage ?? ''}>
                  {truncate(row.resolvedMessage ?? '-')}
                </td>
                <td className="py-3 pr-3">
                  <CampaignStatusBadge row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <Button disabled={executableCount === 0} onClick={onExecute}>
          Créer {executableCount} campagnes
        </Button>
      </div>
    </section>
  )
}

export function summarizeRows(rows: CampaignMatrixRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { ready: 0, error: 0, skipped: 0, segment_exists: 0 },
  )
}

function CampaignStatusBadge({ row }: { row: CampaignMatrixRow }) {
  const classes = {
    ready: 'bg-green-50 text-green-700 border-green-200',
    segment_exists: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    skipped: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  const label =
    row.status === 'segment_exists'
      ? 'Segment existant, sera réutilisé'
      : row.status === 'ready'
        ? 'ready'
        : row.errors.join(', ') || row.status

  return <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${classes[row.status]}`}>{label}</span>
}

function truncate(value: string): string {
  return value.length > 80 ? `${value.slice(0, 80)}...` : value
}

function formatDate(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
