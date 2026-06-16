import { useMemo } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import SessionTable from '../components/SessionTable'
import TemplateEditor from '../components/TemplateEditor'
import { filterSessions } from '../hooks/useSessionData'
import { savePrefix, buildSegmentName } from '../lib/segmentName'
import { CampaignConfig, EventmakerSession, TraitFilter } from '../types'

interface FilterStepProps {
  sessions: EventmakerSession[]
  traitKeys: string[]
  loading: boolean
  error: string | null
  config: CampaignConfig
  onConfigChange: (config: CampaignConfig) => void
  onContinue: (sessions: EventmakerSession[]) => void
  onBack: () => void
}

export default function FilterStep({
  sessions,
  traitKeys,
  loading,
  error,
  config,
  onConfigChange,
  onContinue,
  onBack,
}: FilterStepProps) {
  const filteredSessions = useMemo(
    () => filterSessions(sessions, config.traitFilter),
    [config.traitFilter, sessions],
  )
  const previewSession = filteredSessions[0] ?? null
  const canContinue =
    filteredSessions.length > 0 &&
    config.notificationTitle.trim().length > 0 &&
    config.messageContent.trim().length > 0

  function updateConfig(patch: Partial<CampaignConfig>) {
    onConfigChange({ ...config, ...patch })
  }

  function updateTraitFilter(patch: Partial<TraitFilter>) {
    const current = config.traitFilter ?? { key: traitKeys[0] ?? '', value: '' }
    updateConfig({ traitFilter: { ...current, ...patch } })
  }

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Filtrage & configuration</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Choisissez les sessions à traiter puis configurez les templates de push.
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}
      {loading && <div className="mt-6 h-32 animate-pulse rounded-lg bg-[#F0EEE9]" />}

      {!loading && (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="space-y-4">
              <div className="rounded-lg border border-[#E8E4DE] p-4">
                <h2 className="text-sm font-medium text-[#1A1A1A]">Sessions à traiter</h2>
                <div className="mt-4 inline-flex rounded-lg border border-[#E0DDD8] bg-[#F8F7F4] p-1">
                  <button
                    className={`rounded-md px-3 py-1 text-xs transition ${
                      !config.traitFilter ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B]'
                    }`}
                    onClick={() => updateConfig({ traitFilter: null })}
                    type="button"
                  >
                    Toutes les sessions
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-xs transition ${
                      config.traitFilter ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B]'
                    }`}
                    onClick={() =>
                      updateConfig({ traitFilter: { key: traitKeys[0] ?? '', value: '' } })
                    }
                    type="button"
                  >
                    Filtrer par trait
                  </button>
                </div>

                {config.traitFilter && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">Clé</span>
                      <select
                        className="h-11 w-full rounded-lg border border-[#E0DDD8] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#B74A20] focus:ring-4 focus:ring-[#B74A20]/10"
                        value={config.traitFilter.key}
                        onChange={(event) => updateTraitFilter({ key: event.target.value })}
                      >
                        <option value="">Sélectionner...</option>
                        {traitKeys.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">Valeur</span>
                      <Input
                        value={config.traitFilter.value}
                        onChange={(event) => updateTraitFilter({ value: event.target.value })}
                        placeholder="true"
                      />
                    </label>
                  </div>
                )}
                <p className="mt-3 font-mono text-[11px] text-[#6B6B6B]">
                  {filteredSessions.length} / {sessions.length} sessions correspondent
                </p>
              </div>

              <SessionTable sessions={filteredSessions} />
            </div>

            <div className="space-y-4 rounded-lg border border-[#E8E4DE] p-4">
              <h2 className="text-sm font-medium text-[#1A1A1A]">Configuration des campagnes</h2>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                  Préfixe des segments
                </span>
                <Input
                  value={config.segmentPrefix}
                  onChange={(event) => {
                    savePrefix(event.target.value)
                    updateConfig({ segmentPrefix: event.target.value })
                  }}
                />
                <span className="mt-1 block text-xs text-[#6B6B6B]">
                  Commencer par 'z_' place les segments en fin de liste dans Eventmaker
                </span>
                <span className="mt-2 block truncate font-mono text-[11px] text-[#B74A20]">
                  → {previewSession ? buildSegmentName(previewSession.name, config.segmentPrefix) : config.segmentPrefix}
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                  Délai de notification
                </span>
                <div className="flex items-center gap-3">
                  <Input
                    className="max-w-28"
                    min={0}
                    type="number"
                    value={config.notificationOffsetMinutes}
                    onChange={(event) =>
                      updateConfig({ notificationOffsetMinutes: Math.max(Number(event.target.value) || 0, 0) })
                    }
                  />
                  <span className="text-sm text-[#6B6B6B]">minutes avant le début de la session</span>
                </div>
              </label>

              <TemplateEditor
                label="Titre de la notification"
                value={config.notificationTitle}
                onChange={(notificationTitle) => updateConfig({ notificationTitle })}
                previewSession={previewSession}
                rows={2}
                placeholder="{{session.name}} - Rappel"
              />
              <TemplateEditor
                label="Message"
                value={config.messageContent}
                onChange={(messageContent) => updateConfig({ messageContent })}
                previewSession={previewSession}
                placeholder="La conférence {{session.name}} va commencer..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button disabled={!canContinue} onClick={() => onContinue(filteredSessions)}>
              Continuer
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
