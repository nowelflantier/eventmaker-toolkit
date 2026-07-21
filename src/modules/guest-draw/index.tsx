import { useState } from 'react'
import Stepper from '../../components/Stepper'
import { useGuestDrawData } from './hooks/useGuestDrawData'
import { useGuestDrawExecution } from './hooks/useGuestDrawExecution'
import { useGuestPopulation } from './hooks/useGuestPopulation'
import ConfigurationStep from './steps/ConfigurationStep'
import DrawStep from './steps/DrawStep'
import EventSelector from './steps/EventSelector'
import PreviewStep from './steps/PreviewStep'
import { DrawConfiguration, GuestDrawEventData } from './types'

const steps = ['Événement', 'Configuration', 'Aperçu', 'Tirage']
const accentColor = '#6D4CC9'

interface GuestDrawProps {
  onComplete: () => void
}

const initialConfiguration: DrawConfiguration = {
  mode: 'categories',
  categoryIds: [],
  segmentId: '',
  targetFieldKey: '',
  winnerCount: 1,
}

export default function GuestDraw({ onComplete }: GuestDrawProps) {
  const [step, setStep] = useState(0)
  const [eventId, setEventId] = useState<string | null>(null)
  const [configuration, setConfiguration] = useState<DrawConfiguration>(initialConfiguration)
  const eventData = useGuestDrawData()
  const population = useGuestPopulation()
  const execution = useGuestDrawExecution()

  async function handleEventSubmit(nextEventId: string) {
    const loadedData = await eventData.loadData(nextEventId)
    setEventId(nextEventId)
    setConfiguration(buildInitialConfiguration(loadedData))
    population.reset()
    execution.reset()
    setStep(1)
  }

  async function handlePopulationLoad() {
    if (!eventId) return
    const segment = eventData.data?.segments.find(
      (item) => item.id === configuration.segmentId,
    )

    await population.loadPopulation({
      eventId,
      configuration,
      expectedSegmentCount: segment?.guestCount,
    })
  }

  async function prepareDraw() {
    if (!eventId || !population.result) return
    await execution.prepare({
      eventId,
      eligibleGuests: population.result.guests,
      configuration,
    })
  }

  function handleDrawContinue() {
    setStep(3)
    void prepareDraw().catch(() => undefined)
  }

  async function handleExecute() {
    if (!eventId) return
    await execution.execute(eventId)
    onComplete()
  }

  async function handleRetryFailed() {
    if (!eventId) return
    await execution.retryFailed(eventId)
  }

  const data = eventData.data

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Stepper accentColor={accentColor} currentStep={step} steps={steps} />

      {data && eventId && (
        <div className="mt-4 border-l-2 border-[#6D4CC9] bg-white px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">Eventmaker event</p>
              <p className="mt-1 text-base font-medium text-[#1A1A1A]">{data.event.name}</p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] text-[#6B6B6B]">
              <span>id {eventId}</span>
              {data.event.guestCount !== null && <span>{data.event.guestCount} participants</span>}
              <span>{data.categories.length} catégories</span>
              <span>{data.segments.length} segments</span>
              <span>{data.fields.length} champs</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {step === 0 && (
          <EventSelector
            description="Saisissez l’identifiant Eventmaker de l’événement sur lequel préparer un tirage au sort."
            error={eventData.error}
            loading={eventData.loading}
            onSubmit={handleEventSubmit}
            title="Tirage au sort"
          />
        )}

        {step === 1 && data && (
          <ConfigurationStep
            categories={data.categories}
            configuration={configuration}
            fields={data.fields}
            onBack={() => setStep(0)}
            onChange={(nextConfiguration) => {
              setConfiguration(nextConfiguration)
              population.reset()
              execution.reset()
            }}
            onContinue={() => {
              population.reset()
              execution.reset()
              setStep(2)
            }}
            segments={data.segments}
          />
        )}

        {step === 2 && data && (
          <PreviewStep
            categories={data.categories}
            configuration={configuration}
            error={population.error}
            fields={data.fields}
            loading={population.loading}
            onBack={() => {
              population.cancel()
              execution.reset()
              setStep(1)
            }}
            onCancel={population.cancel}
            onContinue={handleDrawContinue}
            onLoad={handlePopulationLoad}
            progress={population.progress}
            result={population.result}
            segments={data.segments}
          />
        )}

        {step === 3 && eventId && (
          <DrawStep
            error={execution.error}
            executing={execution.executing}
            executionProgress={execution.executionProgress}
            onBack={() => {
              execution.cancelPreparation()
              setStep(2)
            }}
            onCancelPreparation={execution.cancelPreparation}
            onExecute={handleExecute}
            onReroll={prepareDraw}
            onRetryFailed={handleRetryFailed}
            plan={execution.plan}
            preparationProgress={execution.preparationProgress}
            preparing={execution.preparing}
            results={execution.results}
          />
        )}
      </div>
    </main>
  )
}

function buildInitialConfiguration(data: GuestDrawEventData): DrawConfiguration {
  const firstTextField = data.fields.find(
    (field) => field.storage === 'guest_metadata' && field.textLike,
  )

  return {
    ...initialConfiguration,
    targetFieldKey: firstTextField?.key ?? '',
  }
}
