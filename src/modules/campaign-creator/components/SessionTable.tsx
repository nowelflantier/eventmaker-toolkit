import { useMemo, useState } from 'react'
import { EventmakerSession } from '../types'

interface SessionTableProps {
  sessions: EventmakerSession[]
}

const pageSize = 20

export default function SessionTable({ sessions }: SessionTableProps) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(Math.ceil(sessions.length / pageSize), 1)
  const currentPage = Math.min(page, pageCount - 1)
  const visibleSessions = useMemo(
    () => sessions.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [currentPage, sessions],
  )

  return (
    <div className="rounded-lg border border-[#E8E4DE]">
      <div className="flex items-center justify-between gap-3 border-b border-[#E8E4DE] px-4 py-3">
        <h2 className="text-sm font-medium text-[#1A1A1A]">Sessions à traiter</h2>
        <span className="font-mono text-[11px] text-[#6B6B6B]">{sessions.length} sessions</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
              <th className="py-3 pl-4 pr-3">Nom</th>
              <th className="py-3 pr-3">Date</th>
              <th className="py-3 pr-3">Lieu</th>
              <th className="py-3 pr-4">Type</th>
            </tr>
          </thead>
          <tbody>
            {visibleSessions.map((session) => (
              <tr key={session._id} className="border-b border-[#F0EEE9] last:border-0">
                <td className="py-3 pl-4 pr-3 text-[#1A1A1A]">{session.display_name || session.name}</td>
                <td className="py-3 pr-3 text-[#6B6B6B]">
                  {session.start_date_to_timezone || formatDate(session.start_date)}
                </td>
                <td className="py-3 pr-3 text-[#6B6B6B]">{session.location || session.session_room?.name || '-'}</td>
                <td className="py-3 pr-4 font-mono text-[11px] text-[#B0ADA8]">
                  {session.session_type || session.type || '-'}
                </td>
              </tr>
            ))}
            {visibleSessions.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-[#6B6B6B]" colSpan={4}>
                  Aucune session
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#E8E4DE] px-4 py-3">
        <span className="text-xs text-[#6B6B6B]">
          Page {currentPage + 1} / {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded-md px-3 py-1 text-xs text-[#6B6B6B] transition hover:bg-[#F0EEE9] disabled:pointer-events-none disabled:opacity-40"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(value - 1, 0))}
            type="button"
          >
            Précédent
          </button>
          <button
            className="rounded-md px-3 py-1 text-xs text-[#6B6B6B] transition hover:bg-[#F0EEE9] disabled:pointer-events-none disabled:opacity-40"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage((value) => Math.min(value + 1, pageCount - 1))}
            type="button"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
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
