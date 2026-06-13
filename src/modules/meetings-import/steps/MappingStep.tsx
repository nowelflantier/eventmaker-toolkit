import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { useMapping } from '../hooks/useMapping'
import { normalizeText, textMatchScore } from '../lib/normalizeText'
import { buildSlotSource, formatSlot, scoreSlotMatch } from '../lib/slots'
import {
  ColumnMapping,
  EventmakerLocation,
  EventmakerSlot,
  MappingEntry,
  ParsedExcel,
} from '../types'

interface MappingStepProps {
  eventId: string
  parsedExcel: ParsedExcel
  columnMapping: ColumnMapping
  slots: EventmakerSlot[]
  locations: EventmakerLocation[]
  loading: boolean
  error: string | null
  slotMappings: MappingEntry<EventmakerSlot>[]
  locationMappings: MappingEntry<EventmakerLocation>[]
  onLoadSlots: (eventId: string) => Promise<EventmakerSlot[]>
  onSlotMappingsChange: (mappings: MappingEntry<EventmakerSlot>[]) => void
  onLocationMappingsChange: (mappings: MappingEntry<EventmakerLocation>[]) => void
  onContinue: (params: {
    slotMappings: MappingEntry<EventmakerSlot>[]
    locationMappings: MappingEntry<EventmakerLocation>[]
  }) => void
  onBack: () => void
}

export default function MappingStep({
  eventId,
  parsedExcel,
  columnMapping,
  slots,
  locations,
  loading,
  error,
  slotMappings,
  locationMappings,
  onLoadSlots,
  onSlotMappingsChange,
  onLocationMappingsChange,
  onContinue,
  onBack,
}: MappingStepProps) {
  useEffect(() => {
    if (slots.length === 0) void onLoadSlots(eventId)
  }, [eventId, onLoadSlots, slots.length])

  const uniqueSlots = useMemo(
    () => uniqueSlotSources(parsedExcel.rows, columnMapping),
    [columnMapping, parsedExcel.rows],
  )
  const uniqueLocations = useMemo(
    () => uniqueValues(parsedExcel.rows, columnMapping.location),
    [columnMapping.location, parsedExcel.rows],
  )
  const matchSlot = useCallback(
    (source: string, target: EventmakerSlot) => scoreSlotMatch(source, target),
    [],
  )
  const matchLocation = useCallback(
    (source: string, target: EventmakerLocation) => textMatchScore(source, target.name),
    [],
  )
  const identity = useCallback((source: string) => source, [])
  const slotLabel = useCallback((target: EventmakerSlot) => formatSlot(target), [])
  const slotKey = useCallback((target: EventmakerSlot) => target.id, [])
  const locationLabel = useCallback((target: EventmakerLocation) => target.name, [])
  const locationKey = useCallback((target: EventmakerLocation) => target.id, [])

  const slotMapping = useMapping<string, EventmakerSlot>({
    sourceItems: uniqueSlots,
    targetItems: slots,
    matchFn: matchSlot,
    sourceLabelFn: identity,
    targetLabelFn: slotLabel,
    targetKeyFn: slotKey,
    initialMappings: slotMappings,
    onMappingsChange: onSlotMappingsChange,
  })

  const locationMapping = useMapping<string, EventmakerLocation>({
    sourceItems: uniqueLocations,
    targetItems: locations,
    matchFn: matchLocation,
    sourceLabelFn: identity,
    targetLabelFn: locationLabel,
    targetKeyFn: locationKey,
    initialMappings: locationMappings,
    onMappingsChange: onLocationMappingsChange,
  })

  const canContinue = slotMapping.isComplete && locationMapping.isComplete

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Mapping créneaux et lieux</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Associez les valeurs uniques du fichier aux objets Eventmaker.
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#B0ADA8]">
            {slots.length} créneaux Eventmaker · {locations.length} lieux
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}
      {loading && <div className="mt-6 h-24 animate-pulse rounded-lg bg-[#F0EEE9]" />}

      {!loading && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <MappingTable
            title="Créneaux"
            description="Les créneaux Eventmaker sont affichés sous forme date · heure début-fin. Le matching automatique compare l’heure de début."
            entries={slotMapping.mappings}
            targets={slots}
            targetLabel={slotLabel}
            targetKey={slotKey}
            groupLabel={(slot) => slotLabel(slot).split(' · ')[0]}
            filterPlaceholder="Filtrer les créneaux..."
            searchable
            onChange={slotMapping.setManualMapping}
          />
          <MappingTable
            title="Lieux"
            description="Les lieux viennent de la fiche événement."
            entries={locationMapping.mappings}
            targets={locations}
            targetLabel={locationLabel}
            targetKey={locationKey}
            filterPlaceholder="Filtrer les lieux..."
            onChange={locationMapping.setManualMapping}
          />
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          disabled={!canContinue}
          onClick={() =>
            onContinue({
              slotMappings: slotMapping.mappings,
              locationMappings: locationMapping.mappings,
            })
          }
        >
          Continuer
        </Button>
      </div>
    </section>
  )
}

function MappingTable<T>({
  title,
  description,
  entries,
  targets,
  targetLabel,
  targetKey,
  groupLabel,
  filterPlaceholder,
  searchable = false,
  onChange,
}: {
  title: string
  description: string
  entries: MappingEntry<T>[]
  targets: T[]
  targetLabel: (target: T) => string
  targetKey: (target: T) => string
  groupLabel?: (target: T) => string
  filterPlaceholder: string
  searchable?: boolean
  onChange: (sourceLabel: string, target: T) => void
}) {
  function getFilteredTargets(filter: string) {
    const normalizedFilter = normalizeText(filter)
    if (!normalizedFilter) return targets

    return targets.filter((target) =>
      normalizeText(`${targetLabel(target)} ${targetKey(target)}`).includes(normalizedFilter),
    )
  }

  function getGroupedTargets(filteredTargets: T[]) {
    if (!groupLabel) return [{ label: null, targets: filteredTargets }]

    const groups = new Map<string, T[]>()
    filteredTargets.forEach((target) => {
      const label = groupLabel(target)
      groups.set(label, [...(groups.get(label) ?? []), target])
    })

    return [...groups.entries()].map(([label, groupTargets]) => ({ label, targets: groupTargets }))
  }

  return (
    <div className="rounded-lg border border-[#E8E4DE]">
      <div className="border-b border-[#E8E4DE] px-4 py-3">
        <h2 className="text-sm font-medium text-[#1A1A1A]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#6B6B6B]">{description}</p>
      </div>
      <div>
        {entries.map((entry) => {
          return (
            <div key={entry.sourceLabel} className="border-b border-[#F0EEE9] px-4 py-3 last:border-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-[#1A1A1A]">{entry.sourceLabel}</span>
                <StatusBadge status={entry.status} />
              </div>
              {searchable ? (
                <SearchableSelect
                  filterPlaceholder={filterPlaceholder}
                  getFilteredTargets={getFilteredTargets}
                  getGroupedTargets={getGroupedTargets}
                  onSelect={(target) => onChange(entry.sourceLabel, target)}
                  selectedTarget={entry.target}
                  targetKey={targetKey}
                  targetLabel={targetLabel}
                />
              ) : (
                <select
                  className="h-10 w-full rounded-lg border border-[#E0DDD8] bg-white px-2 text-xs outline-none focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10"
                  value={entry.target ? targetKey(entry.target) : ''}
                  onChange={(event) => {
                    const target = targets.find((item) => targetKey(item) === event.target.value)
                    if (target) onChange(entry.sourceLabel, target)
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {targets.map((target, index) => (
                    <option key={`${targetKey(target)}-${index}`} value={targetKey(target)}>
                      {targetLabel(target)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SearchableSelect<T>({
  filterPlaceholder,
  getFilteredTargets,
  getGroupedTargets,
  onSelect,
  selectedTarget,
  targetKey,
  targetLabel,
}: {
  filterPlaceholder: string
  getFilteredTargets: (filter: string) => T[]
  getGroupedTargets: (targets: T[]) => { label: string | null; targets: T[] }[]
  onSelect: (target: T) => void
  selectedTarget: T | null
  targetKey: (target: T) => string
  targetLabel: (target: T) => string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const filteredTargets = getFilteredTargets(query)
  const groupedTargets = getGroupedTargets(filteredTargets)
  const displayValue = open ? query : selectedTarget ? targetLabel(selectedTarget) : ''

  function selectTarget(target: T) {
    onSelect(target)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        aria-expanded={open}
        className="h-10 w-full rounded-lg border border-[#E0DDD8] bg-white px-3 pr-8 text-xs text-[#1A1A1A] outline-none transition placeholder:text-[#B0ADA8] focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={(event) => {
          setQuery('')
          setOpen(true)
          event.currentTarget.select()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) => Math.min(index + 1, Math.max(filteredTargets.length - 1, 0)))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) => Math.max(index - 1, 0))
          }
          if (event.key === 'Enter' && filteredTargets[activeIndex]) {
            event.preventDefault()
            selectTarget(filteredTargets[activeIndex])
          }
        }}
        placeholder="Sélectionner..."
        value={displayValue}
      />
      <span className="pointer-events-none absolute right-3 top-3 font-mono text-[10px] text-[#B0ADA8]">
        ⌄
      </span>

      {open && (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-lg border border-[#E0DDD8] bg-white shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredTargets.length === 0 && (
              <p className="px-3 py-3 text-xs text-[#6B6B6B]">
                Aucun résultat pour “{query || filterPlaceholder}”
              </p>
            )}
            {groupedTargets.map((group) => (
              <div key={group.label ?? 'ungrouped'}>
                {group.label && (
                  <div className="sticky top-0 bg-[#F8F7F4] px-3 py-1 font-mono text-[10px] uppercase text-[#B0ADA8]">
                    {group.label}
                  </div>
                )}
                {group.targets.map((target) => {
                  const selected = selectedTarget && targetKey(selectedTarget) === targetKey(target)
                  const optionIndex = filteredTargets.findIndex(
                    (item) => targetKey(item) === targetKey(target),
                  )
                  const active = optionIndex === activeIndex
                  return (
                    <button
                      key={targetKey(target)}
                      className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-[#F8F7F4] ${
                        selected || active ? 'bg-[#EEF4FF] text-[#0066FF]' : 'text-[#1A1A1A]'
                      }`}
                      onMouseEnter={() => setActiveIndex(optionIndex)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectTarget(target)}
                      type="button"
                    >
                      {targetLabel(target)}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: MappingEntry<unknown>['status'] }) {
  const classes = {
    auto: 'bg-green-50 text-green-700 border-green-200',
    manual: 'bg-blue-50 text-blue-700 border-blue-200',
    unresolved: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${classes[status]}`}>
      {status === 'auto' ? 'Auto' : status === 'manual' ? 'Manuel' : 'À résoudre'}
    </span>
  )
}

function uniqueValues(rows: Record<string, string>[], column: string): string[] {
  return [...new Set(rows.map((row) => row[column]?.trim()).filter(Boolean))]
}

function uniqueSlotSources(rows: Record<string, string>[], columnMapping: ColumnMapping): string[] {
  return [...new Set(rows.map((row) => buildSlotSource(row, columnMapping)).filter(Boolean))]
}
