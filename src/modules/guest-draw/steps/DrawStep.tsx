import { useEffect, useMemo, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import {
  DrawExecutionProgress,
  DrawExecutionResult,
  DrawPreparationProgress,
  GuestDrawPlan,
} from '../types'

interface DrawStepProps {
  plan: GuestDrawPlan | null
  preparing: boolean
  preparationProgress: DrawPreparationProgress
  executing: boolean
  executionProgress: DrawExecutionProgress
  results: DrawExecutionResult[]
  error: string | null
  onBack: () => void
  onCancelPreparation: () => void
  onReroll: () => Promise<void>
  onExecute: () => Promise<void>
  onRetryFailed: () => Promise<void>
}

export default function DrawStep({
  plan,
  preparing,
  preparationProgress,
  executing,
  executionProgress,
  results,
  error,
  onBack,
  onCancelPreparation,
  onReroll,
  onExecute,
  onRetryFailed,
}: DrawStepProps) {
  const [confirmed, setConfirmed] = useState(false)
  const planKey = plan?.winners.map((winner) => winner.id).join('|') ?? ''

  useEffect(() => {
    setConfirmed(false)
  }, [planKey])

  const resultByGuestId = useMemo(
    () => new Map(results.map((result) => [result.guestId, result])),
    [results],
  )
  const toTrueCount = plan?.updates.filter((update) => update.targetValue === 'true').length ?? 0
  const toFalseCount = plan?.updates.filter((update) => update.targetValue === 'false').length ?? 0
  const successCount = results.filter((result) => result.status === 'updated').length
  const failedCount = results.filter((result) => result.status === 'failed').length
  const executionFinished = Boolean(plan) && results.length === plan?.updates.length

  async function handleReroll() {
    try {
      await onReroll()
    } catch {
      // L'erreur est affichée par le hook.
    }
  }

  async function handleExecute() {
    try {
      await onExecute()
    } catch {
      // Les erreurs par participant sont affichées dans le rapport.
    }
  }

  async function handleRetry() {
    try {
      await onRetryFailed()
    } catch {
      // Les erreurs restantes sont affichées dans le rapport.
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Tirage et mise à jour</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Le résultat est figé avant confirmation. Aucune écriture n’est lancée automatiquement.
          </p>
        </div>
        <span className="rounded-full bg-[#F1EDFB] px-3 py-1 font-mono text-[10px] text-[#6D4CC9]">
          CONFIRMATION REQUISE
        </span>
      </div>

      {preparing && (
        <div className="mt-7 rounded-lg border border-[#E8E4DE] bg-[#FCFBF9] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Préparation du tirage</p>
              <p className="mt-1 font-mono text-[11px] text-[#6B6B6B]">
                {preparationLabel(preparationProgress)}
              </p>
            </div>
            <Button onClick={onCancelPreparation} variant="ghost">
              Annuler
            </Button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8E4DE]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#6D4CC9]" />
          </div>
        </div>
      )}

      {error && <Alert className="mt-6">{error}</Alert>}

      {plan && !preparing && (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Participants contrôlés" value={plan.totalGuestsScanned} />
            <Metric label="Anciens gagnants" value={plan.existingTrueCount} />
            <Metric label="À passer à true" value={toTrueCount} />
            <Metric label="À passer à false" value={toFalseCount} />
          </div>

          {plan.detailedGuestsLoaded > 0 && (
            <p className="mt-3 text-xs text-[#6B6B6B]">
              {plan.detailedGuestsLoaded} participant(s) ont nécessité une lecture détaillée pour préserver toutes leurs métadonnées.
            </p>
          )}

          <div className="mt-6 overflow-hidden rounded-lg border border-[#E8E4DE]">
            <div className="border-b border-[#E8E4DE] px-4 py-3">
              <h2 className="text-sm font-medium text-[#1A1A1A]">Gagnants tirés</h2>
              <p className="mt-1 text-xs text-[#6B6B6B]">
                Le résultat restera identique jusqu’à ce que vous demandiez un nouveau tirage.
              </p>
            </div>
            <div className="divide-y divide-[#F0EEE9]">
              {plan.winners.map((winner, index) => (
                <div className="flex items-center gap-3 px-4 py-3" key={winner.id}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F1EDFB] font-mono text-[11px] text-[#6D4CC9]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#1A1A1A]">{guestName(winner)}</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-[#B0ADA8]">
                      {winner.uid || winner.id}{winner.email ? ` · ${winner.email}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[#E8E4DE] bg-[#FCFBF9] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                checked={confirmed}
                className="mt-1"
                disabled={executing || executionFinished}
                onChange={(event) => setConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm leading-6 text-[#1A1A1A]">
                Je confirme ce tirage et la mise à jour de {plan.updates.length} participant(s). Les anciens gagnants non tirés seront remis à false.
              </span>
            </label>
          </div>

          {executing && (
            <div className="mt-5 rounded-lg border border-[#E8E4DE] p-4">
              <p className="text-sm font-medium text-[#1A1A1A]">Mise à jour en cours</p>
              <p className="mt-1 font-mono text-[11px] text-[#6B6B6B]">
                {executionProgress.completed} / {executionProgress.total}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-5 rounded-lg border border-[#E8E4DE] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Mises à jour réussies" value={successCount} />
                <Metric label="Échecs" value={failedCount} />
              </div>
              {failedCount > 0 && (
                <div className="mt-4 space-y-2">
                  {plan.updates
                    .filter((update) => resultByGuestId.get(update.guest.id)?.status === 'failed')
                    .map((update) => (
                      <Alert key={update.guest.id}>
                        {guestName(update.guest)} — {resultByGuestId.get(update.guest.id)?.error}
                      </Alert>
                    ))}
                </div>
              )}
            </div>
          )}

          {plan.updates.length === 0 && (
            <Alert className="mt-5">
              Le champ cible correspond déjà exactement à ce tirage. Aucune écriture n’est nécessaire.
            </Alert>
          )}
        </>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <Button disabled={preparing || executing} onClick={onBack} variant="ghost">
          Retour à l’aperçu
        </Button>
        <div className="flex flex-wrap gap-2">
          {plan && !executionFinished && (
            <Button disabled={preparing || executing} onClick={() => void handleReroll()} variant="ghost">
              Refaire le tirage
            </Button>
          )}
          {plan && failedCount > 0 && !executing && (
            <Button onClick={() => void handleRetry()}>Réessayer les échecs</Button>
          )}
          {plan && plan.updates.length > 0 && results.length === 0 && (
            <Button disabled={!confirmed || preparing || executing} onClick={() => void handleExecute()}>
              Confirmer et appliquer
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function preparationLabel(progress: DrawPreparationProgress): string {
  if (progress.stage === 'loading_details') {
    return `Lecture détaillée ${progress.completed} / ${progress.total}`
  }
  if (progress.stage === 'loading_guests') {
    return `${progress.completed} participant(s) contrôlé(s)`
  }
  return 'Préparation en cours'
}

function guestName(guest: GuestDrawPlan['winners'][number]): string {
  return [guest.firstName, guest.lastName].filter(Boolean).join(' ') || guest.email || guest.uid || guest.id
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[#F8F7F4] px-4 py-3">
      <p className="font-mono text-[10px] uppercase text-[#B0ADA8]">{label}</p>
      <p className="mt-2 text-lg font-medium text-[#1A1A1A]">{value}</p>
    </div>
  )
}
