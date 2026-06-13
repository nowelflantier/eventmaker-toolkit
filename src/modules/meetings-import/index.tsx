import { useState } from 'react'
import { useEventData } from './hooks/useEventData'
import { useGuestResolver } from './hooks/useGuestResolver'
import { buildMatrix } from './lib/buildMatrix'
import EventSelector from './steps/EventSelector'
import ExecutionStep from './steps/ExecutionStep'
import MappingStep from './steps/MappingStep'
import UploadStep from './steps/UploadStep'
import ValidationStep from './steps/ValidationStep'
import {
  ColumnMapping,
  EventmakerLocation,
  EventmakerSlot,
  MappingEntry,
  MatrixRow,
  ParsedExcel,
} from './types'

const steps = ['Événement', 'Excel', 'Mapping', 'Validation', 'Exécution']

export default function MeetingsImport() {
  const [step, setStep] = useState(0)
  const [eventId, setEventId] = useState<string | null>(null)
  const [parsedExcel, setParsedExcel] = useState<ParsedExcel | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null)
  const [slotMappings, setSlotMappings] = useState<MappingEntry<EventmakerSlot>[]>([])
  const [locationMappings, setLocationMappings] = useState<MappingEntry<EventmakerLocation>[]>([])
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>([])
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [executionAutoStart, setExecutionAutoStart] = useState(false)
  const eventData = useEventData()
  const guestResolver = useGuestResolver(eventId)

  async function handleEventSubmit(nextEventId: string) {
    await eventData.loadEvent(nextEventId)
    setEventId(nextEventId)
    setStep(1)
  }

  function handleParsed(nextParsedExcel: ParsedExcel, nextColumnMapping: ColumnMapping) {
    setParsedExcel(nextParsedExcel)
    setColumnMapping(nextColumnMapping)
  }

  async function handleMappingContinue(params: {
    slotMappings: MappingEntry<EventmakerSlot>[]
    locationMappings: MappingEntry<EventmakerLocation>[]
  }) {
    if (!eventId || !parsedExcel || !columnMapping) return

    setSlotMappings(params.slotMappings)
    setLocationMappings(params.locationMappings)
    setStep(3)
    setValidationLoading(true)
    setValidationError(null)

    try {
      const uids = parsedExcel.rows.flatMap((row) => [
        row[columnMapping.guest1Uid] ?? '',
        row[columnMapping.guest2Uid] ?? '',
      ])
      const guestResolutions = await guestResolver.resolveGuests(uids)
      setMatrixRows(
        buildMatrix({
          eventId,
          rows: parsedExcel.rows,
          columnMapping,
          guestResolutions,
          slotMappings: params.slotMappings,
          locationMappings: params.locationMappings,
        }),
      )
    } catch (err) {
      console.error('Validation failed', err)
      setValidationError('Impossible de construire la matrice de validation.')
    } finally {
      setValidationLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Stepper currentStep={step} />
      {eventData.event && (
        <div className="mt-4 border-l-2 border-[#0066FF] bg-white px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">Eventmaker event</p>
              <p className="mt-1 text-base font-medium text-[#1A1A1A]">
              {eventData.event.name || eventData.event.title || `Event ${eventId}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] text-[#6B6B6B]">
              <span>id {eventId}</span>
              <span>{eventData.locations.length} lieux</span>
              <span>{eventData.slots.length} créneaux</span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6">
        {step === 0 && (
          <EventSelector
            loading={eventData.loading}
            error={eventData.error}
            onSubmit={handleEventSubmit}
          />
        )}
        {step === 1 && (
          <UploadStep
            parsedExcel={parsedExcel}
            columnMapping={columnMapping}
            onParsed={handleParsed}
            onBack={() => setStep(0)}
            onContinue={() => setStep(2)}
          />
        )}
        {step === 2 && eventId && parsedExcel && columnMapping && (
          <MappingStep
            eventId={eventId}
            parsedExcel={parsedExcel}
            columnMapping={columnMapping}
            slots={eventData.slots}
            locations={eventData.locations}
            loading={eventData.loading}
            error={eventData.error}
            slotMappings={slotMappings}
            locationMappings={locationMappings}
            onLoadSlots={eventData.loadSlots}
            onSlotMappingsChange={setSlotMappings}
            onLocationMappingsChange={setLocationMappings}
            onBack={() => setStep(1)}
            onContinue={(params) => void handleMappingContinue(params)}
          />
        )}
        {step === 3 && (
          <ValidationStep
            rows={matrixRows}
            slots={eventData.slots}
            locations={eventData.locations}
            loading={validationLoading || guestResolver.loading}
            error={validationError ?? guestResolver.error}
            onBack={() => setStep(2)}
            onExecute={() => {
              setExecutionAutoStart(true)
              setStep(4)
            }}
          />
        )}
        {step === 4 && eventId && (
          <ExecutionStep
            autoStart={executionAutoStart}
            eventId={eventId}
            rows={matrixRows}
            onAutoStartConsumed={() => setExecutionAutoStart(false)}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </main>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <nav className="rounded-xl border border-[#E8E4DE] bg-white px-4 py-3">
      <ol className="grid gap-2 md:grid-cols-5">
        {steps.map((label, index) => {
          const isCurrent = index === currentStep
          const isDone = index < currentStep
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${
                  isCurrent
                    ? 'bg-[#0066FF] text-white'
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
