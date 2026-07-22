import { useMemo, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import {
  DrawConfiguration,
  GuestCategory,
  GuestFieldDefinition,
  GuestSegment,
} from '../types'

interface ConfigurationStepProps {
  categories: GuestCategory[]
  segments: GuestSegment[]
  fields: GuestFieldDefinition[]
  configuration: DrawConfiguration
  onChange: (configuration: DrawConfiguration) => void
  onBack: () => void
  onContinue: () => void
}

export default function ConfigurationStep({
  categories,
  segments,
  fields,
  configuration,
  onChange,
  onBack,
  onContinue,
}: ConfigurationStepProps) {
  const [populationSearch, setPopulationSearch] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')
  const textFields = useMemo(
    () => fields.filter((field) => field.storage === 'guest_metadata' && field.textLike),
    [fields],
  )
  const filteredCategories = filterByLabel(categories, populationSearch, (item) => item.name)
  const filteredSegments = filterByLabel(segments, populationSearch, (item) => item.name)
  const filteredFields = filterByLabel(
    textFields,
    fieldSearch,
    (field) => `${field.label} ${field.key}`,
  )
  const populationIsValid =
    configuration.mode === 'categories'
      ? configuration.categoryIds.length > 0
      : Boolean(configuration.segmentId)
  const targetFieldIsValid = textFields.some(
    (field) => field.key === configuration.targetFieldKey,
  )
  const winnerCountIsValid =
    Number.isInteger(configuration.winnerCount) && configuration.winnerCount > 0
  const canContinue = populationIsValid && targetFieldIsValid && winnerCountIsValid

  function setMode(mode: DrawConfiguration['mode']) {
    onChange({
      ...configuration,
      mode,
      categoryIds: mode === 'categories' ? configuration.categoryIds : [],
      segmentId: mode === 'segment' ? configuration.segmentId : '',
    })
    setPopulationSearch('')
  }

  function toggleCategory(categoryId: string) {
    const categoryIds = configuration.categoryIds.includes(categoryId)
      ? configuration.categoryIds.filter((id) => id !== categoryId)
      : [...configuration.categoryIds, categoryId]
    onChange({ ...configuration, categoryIds })
  }

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div>
        <h1 className="text-xl font-medium text-[#1A1A1A]">Configurer le tirage</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
          Choisissez plusieurs catégories en OU, ou un seul segment, puis le champ texte qui recevra le résultat.
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[#E8E4DE] p-4">
          <h2 className="text-sm font-medium text-[#1A1A1A]">Population éligible</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#F8F7F4] p-1">
            <button
              className={`rounded-md px-3 py-2 text-sm transition ${
                configuration.mode === 'categories'
                  ? 'bg-white font-medium text-[#1A1A1A] shadow-sm'
                  : 'text-[#6B6B6B]'
              }`}
              onClick={() => setMode('categories')}
              type="button"
            >
              Catégories
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm transition ${
                configuration.mode === 'segment'
                  ? 'bg-white font-medium text-[#1A1A1A] shadow-sm'
                  : 'text-[#6B6B6B]'
              }`}
              onClick={() => setMode('segment')}
              type="button"
            >
              Un segment
            </button>
          </div>

          <Input
            className="mt-4"
            placeholder={
              configuration.mode === 'categories'
                ? 'Rechercher une catégorie'
                : 'Rechercher un segment'
            }
            value={populationSearch}
            onChange={(event) => setPopulationSearch(event.target.value)}
          />

          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-[#E8E4DE]">
            {configuration.mode === 'categories' ? (
              <CategoryList
                categories={filteredCategories}
                selectedIds={configuration.categoryIds}
                onToggle={toggleCategory}
              />
            ) : (
              <SegmentList
                segments={filteredSegments}
                selectedId={configuration.segmentId}
                onSelect={(segmentId) => onChange({ ...configuration, segmentId })}
              />
            )}
          </div>

          <p className="mt-3 text-xs leading-5 text-[#6B6B6B]">
            {configuration.mode === 'categories'
              ? `${configuration.categoryIds.length} catégorie(s) sélectionnée(s), combinées avec OU.`
              : configuration.segmentId
                ? 'Un seul segment sera utilisé.'
                : 'Sélectionnez un segment.'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[#E8E4DE] p-4">
            <h2 className="text-sm font-medium text-[#1A1A1A]">Champ texte à alimenter</h2>
            <p className="mt-1 text-xs leading-5 text-[#6B6B6B]">
              Le module écrira la valeur texte « true » pour les gagnants et « false » pour les autres participants.
              Les listes de valeurs et les champs à choix multiples sont exclus de cette première version.
            </p>

            {textFields.length === 0 ? (
              <Alert className="mt-4">
                {fields.length === 0
                  ? 'Aucun guest_field n’a été trouvé pour cet événement.'
                  : 'Aucun champ texte personnalisé sans liste de valeurs n’a été trouvé.'}
              </Alert>
            ) : (
              <>
                <Input
                  className="mt-4"
                  placeholder="Rechercher un champ texte"
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                />
                <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-[#E8E4DE]">
                  {filteredFields.map((field) => (
                    <label
                      key={field.key}
                      className="flex cursor-pointer items-start gap-3 border-b border-[#F0EEE9] px-3 py-3 last:border-0 hover:bg-[#F8F7F4]"
                    >
                      <input
                        checked={configuration.targetFieldKey === field.key}
                        className="mt-0.5"
                        name="target-field"
                        onChange={() =>
                          onChange({ ...configuration, targetFieldKey: field.key })
                        }
                        type="radio"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-[#1A1A1A]">{field.label}</span>
                        <span className="mt-1 block truncate font-mono text-[10px] text-[#B0ADA8]">
                          {field.key}{field.type ? ` · ${field.type}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                  {filteredFields.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-[#6B6B6B]">
                      Aucun champ correspondant
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <label className="block rounded-lg border border-[#E8E4DE] p-4">
            <span className="block text-sm font-medium text-[#1A1A1A]">Nombre de gagnants</span>
            <Input
              className="mt-3 max-w-40"
              min={1}
              onChange={(event) =>
                onChange({
                  ...configuration,
                  winnerCount: Number.parseInt(event.target.value, 10) || 0,
                })
              }
              type="number"
              value={configuration.winnerCount}
            />
          </label>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onBack} variant="ghost">
          Retour
        </Button>
        <Button disabled={!canContinue} onClick={onContinue}>
          Prévisualiser la population
        </Button>
      </div>
    </section>
  )
}

function CategoryList({
  categories,
  selectedIds,
  onToggle,
}: {
  categories: GuestCategory[]
  selectedIds: string[]
  onToggle: (categoryId: string) => void
}) {
  if (categories.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-[#6B6B6B]">Aucune catégorie</p>
  }

  return (
    <>
      {categories.map((category) => (
        <label
          key={category.id}
          className="flex cursor-pointer items-center gap-3 border-b border-[#F0EEE9] px-3 py-3 last:border-0 hover:bg-[#F8F7F4]"
        >
          <input
            checked={selectedIds.includes(category.id)}
            onChange={() => onToggle(category.id)}
            type="checkbox"
          />
          <span className="min-w-0 flex-1 truncate text-sm text-[#1A1A1A]">{category.name}</span>
        </label>
      ))}
    </>
  )
}

function SegmentList({
  segments,
  selectedId,
  onSelect,
}: {
  segments: GuestSegment[]
  selectedId: string
  onSelect: (segmentId: string) => void
}) {
  if (segments.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-[#6B6B6B]">Aucun segment</p>
  }

  return (
    <>
      {segments.map((segment) => (
        <label
          key={segment.id}
          className="flex cursor-pointer items-center gap-3 border-b border-[#F0EEE9] px-3 py-3 last:border-0 hover:bg-[#F8F7F4]"
        >
          <input
            checked={selectedId === segment.id}
            name="guest-segment"
            onChange={() => onSelect(segment.id)}
            type="radio"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-[#1A1A1A]">{segment.name}</span>
            {segment.guestCount !== null && (
              <span className="mt-1 block font-mono text-[10px] text-[#B0ADA8]">
                {segment.guestCount} participant(s)
              </span>
            )}
          </span>
        </label>
      ))}
    </>
  )
}

function filterByLabel<T>(items: T[], search: string, getLabel: (item: T) => string): T[] {
  const normalizedSearch = normalizeText(search)
  if (!normalizedSearch) return items
  return items.filter((item) => normalizeText(getLabel(item)).includes(normalizedSearch))
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
