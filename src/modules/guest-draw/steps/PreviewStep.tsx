import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import {
  DrawConfiguration,
  GuestCategory,
  GuestFieldDefinition,
  GuestPopulationResult,
  GuestSegment,
  PopulationProgress,
} from '../types'

interface PreviewStepProps {
  configuration: DrawConfiguration
  categories: GuestCategory[]
  segments: GuestSegment[]
  fields: GuestFieldDefinition[]
  result: GuestPopulationResult | null
  progress: PopulationProgress
  loading: boolean
  error: string | null
  onLoad: () => Promise<void>
  onCancel: () => void
  onBack: () => void
}

export default function PreviewStep({
  configuration,
  categories,
  segments,
  fields,
  result,
  progress,
  loading,
  error,
  onLoad,
  onCancel,
  onBack,
}: PreviewStepProps) {
  const selectedCategories = categories.filter((category) =>
    configuration.categoryIds.includes(category.id),
  )
  const selectedSegment = segments.find((segment) => segment.id === configuration.segmentId)
  const selectedField = fields.find((field) => field.key === configuration.targetFieldKey)
  const visibleGuests = result?.guests.slice(0, 25) ?? []
  const insufficientPopulation =
    result !== null && result.guests.length < configuration.winnerCount

  async function handleLoad() {
    try {
      await onLoad()
    } catch {
      // L'erreur détaillée est déjà exposée par le hook dans l'Alert de cet écran.
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Aperçu de la population</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Cette étape est entièrement en lecture seule. Aucun participant Eventmaker n’est modifié.
          </p>
        </div>
        <span className="rounded-full bg-[#EEF8F6] px-3 py-1 font-mono text-[10px] text-[#167D73]">
          LECTURE SEULE
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Population"
          value={
            configuration.mode === 'categories'
              ? selectedCategories.map((category) => category.name).join(' OU ') || 'Catégories'
              : selectedSegment?.name || 'Segment'
          }
        />
        <SummaryCard
          label="Champ cible"
          value={selectedField ? `${selectedField.label} (${selectedField.key})` : configuration.targetFieldKey}
        />
        <SummaryCard label="Gagnants demandés" value={String(configuration.winnerCount)} />
      </div>

      {!result && !loading && (
        <div className="mt-7 rounded-lg border border-dashed border-[#D9D4CD] bg-[#FCFBF9] px-5 py-8 text-center">
          <p className="text-sm text-[#6B6B6B]">
            Lancez le chargement pour compter et contrôler les participants éligibles.
          </p>
          <Button className="mt-4" onClick={() => void handleLoad()}>
            Charger les participants
          </Button>
        </div>
      )}

      {loading && (
        <div className="mt-7 rounded-lg border border-[#E8E4DE] bg-[#FCFBF9] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Chargement en cours</p>
              <p className="mt-1 font-mono text-[11px] text-[#6B6B6B]">
                Page {progress.page || 1} · {progress.loaded} participant(s) chargé(s)
              </p>
            </div>
            <Button onClick={onCancel} variant="ghost">
              Annuler
            </Button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8E4DE]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#6D4CC9]" />
          </div>
        </div>
      )}

      {error && <Alert className="mt-6">{error}</Alert>}

      {result && (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Participants éligibles" value={result.guests.length} />
            <Metric label="Pages chargées" value={result.pagesLoaded} />
            <Metric label="Avec guest_metadata" value={result.guestsWithMetadata} />
            <Metric
              label="Filtre"
              value={
                configuration.mode === 'segment'
                  ? result.segmentFilterVerified
                    ? 'Vérifié'
                    : 'À vérifier'
                  : 'Catégories API'
              }
            />
          </div>

          {insufficientPopulation && (
            <Alert className="mt-5">
              Le nombre de gagnants demandé ({configuration.winnerCount}) dépasse la population éligible ({result.guests.length}).
            </Alert>
          )}

          {result.warnings.map((warning) => (
            <Alert className="mt-5" key={warning}>
              {warning}
            </Alert>
          ))}

          <div className="mt-6 overflow-hidden rounded-lg border border-[#E8E4DE]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E4DE] px-4 py-3">
              <div>
                <h2 className="text-sm font-medium text-[#1A1A1A]">Échantillon des participants</h2>
                <p className="mt-1 text-xs text-[#6B6B6B]">Les 25 premiers résultats sont affichés.</p>
              </div>
              <span className="font-mono text-[11px] text-[#6B6B6B]">
                {result.guests.length} au total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4DE] text-[#6B6B6B]">
                    <th className="py-3 pl-4 pr-3">Participant</th>
                    <th className="py-3 pr-3">UID</th>
                    <th className="py-3 pr-3">Catégorie</th>
                    <th className="py-3 pr-4">Valeur actuelle</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGuests.map((guest) => {
                    const category = categories.find(
                      (item) => item.id === guest.guestCategoryId,
                    )
                    const currentValue = selectedField
                      ? guest.guestMetadataMap[selectedField.key]
                      : undefined

                    return (
                      <tr key={guest.id} className="border-b border-[#F0EEE9] last:border-0">
                        <td className="py-3 pl-4 pr-3">
                          <span className="block text-[#1A1A1A]">
                            {[guest.firstName, guest.lastName].filter(Boolean).join(' ') || guest.email || guest.id}
                          </span>
                          {guest.email && (
                            <span className="mt-1 block text-[11px] text-[#6B6B6B]">{guest.email}</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 font-mono text-[11px] text-[#6B6B6B]">
                          {guest.uid || '-'}
                        </td>
                        <td className="py-3 pr-3 text-[#6B6B6B]">{category?.name || guest.guestCategoryId || '-'}</td>
                        <td className="py-3 pr-4 font-mono text-[11px] text-[#6B6B6B]">
                          {formatValue(currentValue)}
                        </td>
                      </tr>
                    )
                  })}
                  {visibleGuests.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-[#6B6B6B]" colSpan={4}>
                        Aucun participant éligible
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <Button disabled={loading} onClick={onBack} variant="ghost">
          Retour à la configuration
        </Button>
        {result && (
          <Button disabled={loading} onClick={() => void handleLoad()} variant="ghost">
            Recharger
          </Button>
        )}
      </div>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E8E4DE] px-4 py-3">
      <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm text-[#1A1A1A]">{value || '-'}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[#F8F7F4] px-4 py-3">
      <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">{label}</p>
      <p className="mt-2 text-lg font-medium text-[#1A1A1A]">{value}</p>
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
