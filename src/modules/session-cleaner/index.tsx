import { useState } from 'react'
import Stepper from '../../components/Stepper'
import { useAccesspoints } from './hooks/useAccesspoints'
import EventSelector from './steps/EventSelector'
import ExecutionStep from './steps/ExecutionStep'
import ReviewStep from './steps/ReviewStep'

const steps = ['Événement', 'Vérification', 'Suppression']

interface SessionCleanerProps {
  onComplete: () => void
}

export default function SessionCleaner({ onComplete }: SessionCleanerProps) {
  const [step, setStep] = useState(0)
  const [eventId, setEventId] = useState<string | null>(null)
  const accesspoints = useAccesspoints()

  async function handleEventSubmit(nextEventId: string) {
    await accesspoints.loadData(nextEventId)
    setEventId(nextEventId)
    setStep(1)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Stepper steps={steps} currentStep={step} accentColor="#B91C1C" />
      {eventId && (
        <div className="mt-4 border-l-2 border-[#B91C1C] bg-white px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">Eventmaker event</p>
              <p className="mt-1 text-base font-medium text-[#1A1A1A]">Event {eventId}</p>
            </div>
            <div className="font-mono text-[11px] text-[#6B6B6B]">
              <span>{accesspoints.sessions.length} sessions</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {step === 0 && (
          <EventSelector
            loading={accesspoints.loading}
            error={accesspoints.error}
            title="Suppression des sessions"
            description="Saisissez l’identifiant Eventmaker de l’événement dont les accesspoints session doivent être supprimés."
            onSubmit={handleEventSubmit}
          />
        )}
        {step === 1 && (
          <ReviewStep
            sessions={accesspoints.sessions}
            onBack={() => setStep(0)}
            onExecute={() => setStep(2)}
          />
        )}
        {step === 2 && eventId && (
          <ExecutionStep
            eventId={eventId}
            sessions={accesspoints.sessions}
            onBack={() => setStep(1)}
            onComplete={onComplete}
          />
        )}
      </div>
    </main>
  )
}
