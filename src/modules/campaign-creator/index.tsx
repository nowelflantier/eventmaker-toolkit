import { useState } from 'react'
import { useCampaignDryRun } from './hooks/useCampaignDryRun'
import { useSessionData } from './hooks/useSessionData'
import { getSavedPrefix } from './lib/segmentName'
import EventSelector from './steps/EventSelector'
import ExecutionStep from './steps/ExecutionStep'
import FilterStep from './steps/FilterStep'
import PreviewStep from './steps/PreviewStep'
import { CampaignConfig, EventmakerSession } from './types'

const steps = ['Événement', 'Configuration', 'Dry-run', 'Exécution']

interface CampaignCreatorProps {
  onComplete: () => void
}

const defaultTitle = '{{session.name}} - Rappel'
const defaultMessage =
  'La conférence {{session.name}} va commencer dans 10 minutes ! Rendez-vous à {{session.location}} pour y assister !'

export default function CampaignCreator({ onComplete }: CampaignCreatorProps) {
  const [step, setStep] = useState(0)
  const [eventId, setEventId] = useState<string | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<EventmakerSession[]>([])
  const [config, setConfig] = useState<CampaignConfig>(() => ({
    notificationOffsetMinutes: 10,
    messageContent: defaultMessage,
    notificationTitle: defaultTitle,
    segmentPrefix: getSavedPrefix(),
    skipNotifications: false,
    autoConfirm: true,
    traitFilter: null,
  }))
  const sessionData = useSessionData()
  const matrixRows = useCampaignDryRun({
    sessions: selectedSessions,
    segments: sessionData.segments,
    config,
  })

  async function handleEventSubmit(nextEventId: string) {
    await sessionData.loadData(nextEventId)
    setEventId(nextEventId)
    setStep(1)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Stepper currentStep={step} />
      {eventId && (
        <div className="mt-4 border-l-2 border-[#B74A20] bg-white px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">Eventmaker event</p>
              <p className="mt-1 text-base font-medium text-[#1A1A1A]">Event {eventId}</p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] text-[#6B6B6B]">
              <span>{sessionData.sessions.length} sessions</span>
              <span>{sessionData.segments.length} segments</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {step === 0 && (
          <EventSelector
            loading={sessionData.loading}
            error={sessionData.error}
            title="Création de campagnes"
            description="Saisissez l’identifiant Eventmaker de l’événement dont les sessions doivent générer des campagnes push."
            onSubmit={handleEventSubmit}
          />
        )}
        {step === 1 && (
          <FilterStep
            sessions={sessionData.sessions}
            traitKeys={sessionData.traitKeys}
            loading={sessionData.loading}
            error={sessionData.error}
            config={config}
            onConfigChange={setConfig}
            onBack={() => setStep(0)}
            onContinue={(sessions) => {
              setSelectedSessions(sessions)
              setStep(2)
            }}
          />
        )}
        {step === 2 && (
          <PreviewStep
            rows={matrixRows}
            onBack={() => setStep(1)}
            onExecute={() => setStep(3)}
          />
        )}
        {step === 3 && eventId && (
          <ExecutionStep
            eventId={eventId}
            rows={matrixRows}
            onBack={() => setStep(2)}
            onComplete={onComplete}
          />
        )}
      </div>
    </main>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <nav className="rounded-xl border border-[#E8E4DE] bg-white px-4 py-3">
      <ol className="grid gap-2 md:grid-cols-4">
        {steps.map((label, index) => {
          const isCurrent = index === currentStep
          const isDone = index < currentStep
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${
                  isCurrent
                    ? 'bg-[#B74A20] text-white'
                    : isDone
                      ? 'bg-[#22C55E] text-white'
                      : 'bg-[#F0EEE9] text-[#B0ADA8]'
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`truncate text-xs ${
                  isCurrent ? 'font-medium text-[#1A1A1A]' : 'text-[#6B6B6B]'
                }`}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
