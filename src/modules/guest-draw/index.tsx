import { useState } from 'react'
import Stepper from '../../components/Stepper'
import { useGuestDrawData } from './hooks/useGuestDrawData'
import { useGuestPopulation } from './hooks/useGuestPopulation'
import ConfigurationStep from './steps/ConfigurationStep'
import EventSelector from './steps/EventSelector'
import PreviewStep from './steps/PreviewStep'
import { DrawConfiguration, GuestDrawEventData } from './types'

const steps = ['Événement', 'Configuration', 'Aperçu']
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

  async function handleEventSubmit(nextEventId: string) {
    const loadedData = await eventData.loadData(nextEventId)
    setEventId(nextEventId)
    setConfiguration(buildInitialConfiguration(loadedData))
    population.reset()
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
    onComplete()
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
            }}
            onContinue={() => {
              population.reset()
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
              setStep(1)
            }}
            onCancel={population.cancel}
            onLoad={handlePopulationLoad}
            progress={population.progress}
            result={population.result}
            segments={data.segments}
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
