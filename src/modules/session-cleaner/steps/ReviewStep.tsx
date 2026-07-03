import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { EventmakerAccesspointSession } from '../types'

interface ReviewStepProps {
  sessions: EventmakerAccesspointSession[]
  onBack: () => void
  onExecute: () => void
}

export default function ReviewStep({ sessions, onBack, onExecute }: ReviewStepProps) {
  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Vérification</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            {sessions.length} accesspoints de type session seront supprimés après confirmation.
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
      </div>

      {sessions.length === 0 && (
        <Alert className="mt-5 border-orange-200 bg-orange-50 text-orange-700">
          Aucune session supprimable n’a été trouvée pour cet événement.
        </Alert>
      )}

      {sessions.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
                  <th className="py-3 pr-3">Session</th>
                  <th className="py-3 pr-3">Accesspoint ID</th>
                  <th className="py-3 pr-3">UID</th>
                  <th className="py-3 pr-3">Début</th>
                  <th className="py-3 pr-3">Lieu</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id} className="border-b border-[#F0EEE9]">
                    <td className="py-3 pr-3 text-[#1A1A1A]">{session.name || '-'}</td>
                    <td className="py-3 pr-3 font-mono text-[#6B6B6B]">{session._id}</td>
                    <td className="py-3 pr-3 font-mono text-[#6B6B6B]">{session.uid || '-'}</td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">{formatDate(session.start_date)}</td>
                    <td className="py-3 pr-3 text-[#6B6B6B]">{session.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={onExecute}>Préparer la suppression</Button>
          </div>
        </>
      )}
    </section>
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
